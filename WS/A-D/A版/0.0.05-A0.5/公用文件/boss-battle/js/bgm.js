// 战斗音乐播放器（外部 MP3）—— 替代原 Web Audio 合成引擎 music.js
// 曲目由 config.js 中 SCENES[*].musicFile 指定：
//   blackroom -> ../音乐/black room/Nameless in the Deep.mp3
//   prison    -> ../音乐/prison/Chains in Step.mp3
// 对外 API 与原引擎保持一致：Music.play() / Music.stop(fadeOut 秒) / Music.setEnabled(bool) / Music.isPlaying
const Music = (function () {
    const BASE_VOLUME = 0.55;   // 正常播放音量
    const FADE_IN_MS = 900;     // 开场淡入

    let audio = null;
    let enabled = true;         // 全局设置「BOSS战音乐」开关
    let wanted = false;         // 战斗是否要求播放（不含开关判定）
    let fadeId = null;

    function sceneKey() {
        try {
            if (typeof SCENE_KEY !== 'undefined' && SCENE_KEY) return String(SCENE_KEY).toLowerCase();
        } catch (e) { }
        try {
            return (new URLSearchParams(window.location.search).get('scene') || 'blackroom').toLowerCase();
        } catch (e) {
            return 'blackroom';
        }
    }

    function trackSrc() {
        try {
            if (typeof SCENE !== 'undefined' && SCENE && SCENE.musicFile) return SCENE.musicFile;
        } catch (e) { }
        return sceneKey() === 'prison'
            ? '../音乐/prison/Chains in Step.mp3'
            : '../音乐/black room/Nameless in the Deep.mp3';
    }

    function ensureAudio() {
        if (audio) return audio;
        audio = new Audio();
        audio.src = encodeURI(trackSrc());
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0;
        audio.addEventListener('error', function () {
            console.warn('[Music] 曲目加载失败：' + audio.src);
            reportFailure();
        });
        return audio;
    }

    // ---------------- 页面内失败提示 ----------------
    let bannerEl = null;
    let bannerTimer = null;
    let reported = false;

    function accentColor() {
        try {
            if (typeof SCENE !== 'undefined' && SCENE && SCENE.accent) return SCENE.accent;
        } catch (e) { }
        return '#ff3b30';
    }

    function errorText() {
        if (!audio || !audio.error) return '未知原因';
        switch (audio.error.code) {
            case 1: return '加载被中止';
            case 2: return '读取网络/磁盘错误';
            case 3: return '音频解码失败';
            case 4: return '文件缺失或格式不支持';
            default: return '未知原因';
        }
    }

    function hideBanner() {
        if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
        if (!bannerEl) return;
        bannerEl.style.opacity = '0';
        setTimeout(function () {
            if (bannerEl && bannerEl.style.opacity === '0') bannerEl.style.display = 'none';
        }, 380);
    }

    function showBanner(title, line1, line2) {
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', function () {
                showBanner(title, line1, line2);
            }, { once: true });
            return;
        }
        if (!bannerEl) {
            bannerEl = document.createElement('div');
            bannerEl.id = 'musicErrorBanner';
            bannerEl.style.cssText = [
                'position:fixed', 'left:50%', 'bottom:16px', 'transform:translateX(-50%)',
                'z-index:9999', 'box-sizing:border-box',
                'max-width:min(88vw,560px)', 'padding:10px 14px 10px 16px',
                'border-radius:10px', 'border:1px solid rgba(255,255,255,0.14)',
                'border-left:4px solid ' + accentColor(),
                'background:rgba(10,6,14,0.94)',
                'box-shadow:0 8px 26px rgba(0,0,0,0.6)',
                'color:#e8e2ea', 'text-align:left', 'cursor:pointer',
                'font:13px/1.55 system-ui,-apple-system,"Microsoft YaHei",sans-serif',
                'transition:opacity .35s ease', 'opacity:0', 'white-space:normal',
                'word-break:break-all'
            ].join(';');
            bannerEl.addEventListener('click', hideBanner);
            document.body.appendChild(bannerEl);
        }
        bannerEl.innerHTML = '';

        const t = document.createElement('div');
        t.textContent = title;
        t.style.cssText = 'font-weight:600;color:' + accentColor() + ';margin-bottom:3px';
        bannerEl.appendChild(t);

        const d1 = document.createElement('div');
        d1.textContent = line1;
        d1.style.cssText = 'opacity:.92;margin-bottom:2px';
        bannerEl.appendChild(d1);

        const d2 = document.createElement('div');
        d2.textContent = line2;
        d2.style.cssText = 'opacity:.55;font-size:12px';
        bannerEl.appendChild(d2);

        bannerEl.style.display = 'block';
        void bannerEl.offsetWidth;   // 触发回流，保证淡入生效
        bannerEl.style.opacity = '1';

        if (bannerTimer) clearTimeout(bannerTimer);
        bannerTimer = setTimeout(hideBanner, 10000);
    }

    function reportFailure() {
        if (reported || !enabled) return;
        reported = true;
        const path = trackSrc().replace('../', '');
        showBanner(
            '♪ 音乐加载失败',
            '无法播放　' + path + '（' + errorText() + '）',
            '请确认「公用文件\\音乐」目录下该文件存在，点击本提示可关闭'
        );
    }

    function fadeTo(target, ms, onDone) {
        const a = ensureAudio();
        if (fadeId !== null) {
            cancelAnimationFrame(fadeId);
            fadeId = null;
        }
        const from = a.volume;
        if (!(ms > 0)) {
            a.volume = target;
            if (onDone) onDone();
            return;
        }
        const t0 = performance.now();
        function step(now) {
            const k = Math.min(1, (now - t0) / ms);
            a.volume = Math.max(0, Math.min(1, from + (target - from) * k));
            if (k < 1) {
                fadeId = requestAnimationFrame(step);
            } else {
                fadeId = null;
                a.volume = target;
                if (onDone) onDone();
            }
        }
        fadeId = requestAnimationFrame(step);
    }

    function startPlayback() {
        const a = ensureAudio();
        const p = a.play();
        if (p && typeof p.then === 'function') {
            p.then(function () {
                fadeTo(BASE_VOLUME, FADE_IN_MS);
            }).catch(function () {
                // 真正的加载/解码失败 → 页面内明确提示
                if (a.error) { reportFailure(); return; }
                // 浏览器自动播放策略拦截：等下一次用户交互再启动
                const unlock = function () {
                    window.removeEventListener('keydown', unlock);
                    window.removeEventListener('pointerdown', unlock);
                    if (enabled && wanted) {
                        a.play().then(function () {
                            fadeTo(BASE_VOLUME, FADE_IN_MS);
                        }).catch(function () { });
                    }
                };
                window.addEventListener('keydown', unlock);
                window.addEventListener('pointerdown', unlock);
            });
        } else {
            fadeTo(BASE_VOLUME, FADE_IN_MS);
        }
    }

    function play() {
        wanted = true;
        if (!enabled) return;
        const a = ensureAudio();
        if (!a.paused) {
            fadeTo(BASE_VOLUME, 300);
            return;
        }
        startPlayback();
    }

    function stop(fadeOut) {
        wanted = false;
        if (!audio) return;
        const a = audio;
        const ms = Math.max(120, (fadeOut === undefined ? 0.6 : fadeOut) * 1000);
        fadeTo(0, ms, function () {
            a.pause();
            try { a.currentTime = 0; } catch (e) { }
        });
        // 页面切到后台时 rAF 暂停，这里兜底收尾
        setTimeout(function () {
            if (!wanted && !a.paused) {
                a.pause();
                try { a.currentTime = 0; } catch (e) { }
            }
        }, ms + 150);
    }

    function setEnabled(v) {
        enabled = !!v;
        if (!enabled) {
            hideBanner();
            if (audio && !audio.paused) {
                fadeTo(0, 200, function () { audio.pause(); });
            }
        } else if (wanted && audio && audio.paused) {
            const a = audio;
            a.play().then(function () {
                fadeTo(BASE_VOLUME, 400);
            }).catch(function () { });
        }
    }

    // 页面打开即预加载探测：文件缺失时立刻给出提示，不必等到进入战斗
    function probe() {
        if (!enabled) return;
        try { ensureAudio().load(); } catch (e) { }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', probe, { once: true });
    } else {
        probe();
    }

    return {
        play: play,
        stop: stop,
        setEnabled: setEnabled,
        get isPlaying() { return !!(audio && !audio.paused); },
        get enabled() { return enabled; },
        get track() { return decodeURI(ensureAudio().src); }
    };
})();
