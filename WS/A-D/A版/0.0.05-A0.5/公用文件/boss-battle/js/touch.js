// ============================================================
//  touch.js — 移动端（手机 / iPad）触屏操作层
//  自动检测设备 → 命中时渲染虚拟摇杆 + 射击/近战/冲刺/药水按钮
//  桌面浏览器（无触摸的 PC）不创建任何 UI，行为完全不变
// ============================================================

const IS_TOUCH_DEVICE = (function () {
    try {
        const ua = navigator.userAgent || '';
        const mobileUA = /Android|iPhone|iPod|iPad|Windows Phone|HarmonyOS|Mobile/i.test(ua);
        // iPadOS 13+ 的 UA 伪装成 Macintosh，用触点数区分
        const iPadOS = /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;
        const hasTouch = (navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
        const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        return (mobileUA || iPadOS) && (hasTouch || coarse);
    } catch (e) {
        return false;
    }
})();

const Touch = (function () {
    let root = null;
    let base = null, knob = null;
    let stickId = null;
    const axis = { x: 0, y: 0 };      // 屏幕方向：x 右为正，y 下为正（归一化 -1..1）
    const STICK_R = 52;               // 摇杆最大位移(px)

    function inFight() {
        return typeof gameState !== 'undefined' && gameState === 'fight';
    }

    function stop(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
    }

    // ---------- 摇杆 ----------
    function buildStick() {
        base = document.createElement('div');
        base.style.cssText = [
            'position:absolute', 'left:14px', 'bottom:104px',
            'width:136px', 'height:136px', 'border-radius:50%',
            'background:rgba(10,14,22,0.34)',
            'border:2px solid rgba(150,190,255,0.34)',
            'box-shadow:inset 0 0 22px rgba(0,0,0,0.5)',
            'pointer-events:auto', 'touch-action:none'
        ].join(';');

        knob = document.createElement('div');
        knob.style.cssText = [
            'position:absolute', 'left:50%', 'top:50%',
            'width:62px', 'height:62px', 'margin:-31px 0 0 -31px', 'border-radius:50%',
            'background:radial-gradient(circle at 34% 30%, rgba(210,232,255,0.92), rgba(96,140,200,0.72) 62%, rgba(40,60,92,0.7))',
            'border:2px solid rgba(220,240,255,0.5)',
            'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
            'pointer-events:none', 'transition:transform 0.04s linear'
        ].join(';');

        base.appendChild(knob);
        root.appendChild(base);

        function move(ev) {
            const r = base.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            let dx = ev.clientX - cx;
            let dy = ev.clientY - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            const k = d > STICK_R ? STICK_R / d : 1;
            dx *= k; dy *= k;
            knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
            axis.x = dx / STICK_R;
            axis.y = dy / STICK_R;
        }

        base.addEventListener('pointerdown', function (ev) {
            stop(ev);
            stickId = ev.pointerId;
            try { base.setPointerCapture(ev.pointerId); } catch (e) {}
            move(ev);
        });
        base.addEventListener('pointermove', function (ev) {
            if (stickId !== ev.pointerId) return;
            stop(ev);
            move(ev);
        });
        function end(ev) {
            if (stickId !== ev.pointerId) return;
            stickId = null;
            axis.x = 0; axis.y = 0;
            knob.style.transform = 'translate(0,0)';
        }
        base.addEventListener('pointerup', end);
        base.addEventListener('pointercancel', end);
        base.addEventListener('pointerleave', end);
    }

    // ---------- 按钮 ----------
    function buildBtn(label, size, css, onDown, onUp) {
        const b = document.createElement('div');
        b.textContent = label;
        b.style.cssText = [
            'position:absolute',
            'width:' + size + 'px', 'height:' + size + 'px', 'border-radius:50%',
            'display:flex', 'align-items:center', 'justify-content:center',
            'font:700 ' + Math.round(size * 0.29) + 'px/1 system-ui,-apple-system,"Microsoft YaHei",sans-serif',
            'color:#eaf4ff', 'text-align:center',
            'background:radial-gradient(circle at 36% 30%, rgba(70,100,150,0.62), rgba(10,16,26,0.62))',
            'border:2px solid rgba(160,200,255,0.5)',
            'box-shadow:0 4px 14px rgba(0,0,0,0.45)',
            'pointer-events:auto', 'touch-action:none',
            'user-select:none', '-webkit-user-select:none',
            css
        ].join(';');
        root.appendChild(b);

        b.addEventListener('pointerdown', function (ev) {
            stop(ev);
            b.style.background = 'radial-gradient(circle at 36% 30%, rgba(150,200,255,0.85), rgba(40,70,120,0.8))';
            if (onDown) onDown();
        });
        function up(ev) {
            stop(ev);
            b.style.background = 'radial-gradient(circle at 36% 30%, rgba(70,100,150,0.62), rgba(10,16,26,0.62))';
            if (onUp) onUp();
        }
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('pointerleave', up);
        return b;
    }

    function setMouseDown(v) {
        if (typeof mouse !== 'undefined') mouse.down = v;
    }

    function buildButtons() {
        // 射击（按住连发）
        buildBtn('射击', 88, 'right:16px;bottom:104px;', function () {
            if (!inFight()) return;
            setMouseDown(true);
        }, function () { setMouseDown(false); });

        // 近战
        buildBtn('近战', 64, 'right:116px;bottom:112px;', function () {
            if (!inFight()) return;
            Combat.melee();
        });

        // 冲刺
        buildBtn('冲刺', 64, 'right:34px;bottom:200px;', function () {
            if (!inFight()) return;
            Combat.dash();
        });

        // 药水
        buildBtn('药水', 58, 'right:118px;bottom:188px;', function () {
            if (!inFight()) return;
            Combat.potion();
        });

        // 设置（调用桌面端同一面板）
        buildBtn('设置', 46, 'left:14px;bottom:250px;font-size:13px !important;', function () {
            if (typeof WSSettings !== 'undefined' && WSSettings.openSettingsPanel) {
                WSSettings.openSettingsPanel();
            }
        });
    }

    function createUI() {
        if (!IS_TOUCH_DEVICE || root) return;
        root = document.createElement('div');
        root.id = 'touchUI';
        root.style.cssText = [
            'position:fixed', 'left:0', 'top:0', 'right:0', 'bottom:0',
            'z-index:8000', 'pointer-events:none',
            'touch-action:none', 'user-select:none', '-webkit-user-select:none',
            '-webkit-tap-highlight-color:transparent'
        ].join(';');
        document.body.appendChild(root);
        buildStick();
        buildButtons();
        document.body.classList.add('touch-device');
    }

    return {
        isTouch: function () { return IS_TOUCH_DEVICE; },
        axis: axis,
        // 触屏设备上默认自动瞄准（无鼠标指针）
        autoAim: function () { return IS_TOUCH_DEVICE; },
        hasMove: function () {
            return Math.abs(axis.x) > 0.16 || Math.abs(axis.y) > 0.16;
        },
        init: createUI
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Touch.init);
} else {
    Touch.init();
}
