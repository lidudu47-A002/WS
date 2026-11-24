/* 优化清单第 16 条：统一非阻塞提示组件 showToast(msg, type)，替代阻塞主循环的 alert()。
   用法：showToast('文本') / showToast('文本', 'error') / showToast('文本', 'warn')
   特性：DOM 浮层、右下堆叠、自动淡出、不阻塞主线程、不打断键盘输入。 */
(function () {
    if (typeof window.showToast === 'function') return;

    var COLORS = {
        error: 'rgba(178,44,44,0.94)',
        warn: 'rgba(170,120,20,0.94)',
        info: 'rgba(32,32,40,0.94)',
        ok: 'rgba(28,110,60,0.94)'
    };

    function ensureHost() {
        var host = document.getElementById('wsToastHost');
        if (host) return host;
        host = document.createElement('div');
        host.id = 'wsToastHost';
        host.style.cssText = 'position:fixed;left:50%;bottom:14%;transform:translateX(-50%);' +
            'z-index:99999;display:flex;flex-direction:column;align-items:center;gap:6px;' +
            'pointer-events:none;font:14px/1.6 "Microsoft YaHei",Arial,sans-serif;';
        (document.body || document.documentElement).appendChild(host);
        return host;
    }

    function showToast(msg, type) {
        var text = (msg === null || msg === undefined) ? '' : String(msg);
        try {
            var host = ensureHost();
            var el = document.createElement('div');
            el.style.cssText = 'max-width:72vw;padding:8px 14px;border-radius:8px;color:#fff;' +
                'background:' + (COLORS[type] || COLORS.info) +
                ';box-shadow:0 4px 14px rgba(0,0,0,0.35);white-space:pre-wrap;' +
                'text-align:center;opacity:0;transition:opacity .18s ease;';
            el.textContent = text;
            host.appendChild(el);
            requestAnimationFrame(function () { el.style.opacity = '1'; });
            var life = Math.min(6000, 1600 + text.length * 40);
            setTimeout(function () {
                el.style.opacity = '0';
                setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 240);
            }, life);
        } catch (err) {
            // 极端情况下（headless / 无 body）退回控制台，绝不阻塞主循环
            console.log('[toast] ' + text);
        }
    }

    window.showToast = showToast;
})();
