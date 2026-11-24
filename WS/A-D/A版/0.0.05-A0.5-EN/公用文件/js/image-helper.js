// ========== 图片加载失败自动回退到占位符 ==========
(function() {
    const PLACEHOLDER = '../公用文件/图片/其他/占位符.png';
    // 优化清单第 24 条：回退到占位符时必须留痕，否则资源缺失会被静默吞掉；?debug=1 时升级为 error 便于排查。
    const WS_DEBUG = /[?&](debug|dev)=1/i.test(window.location.search);
    function reportMissing(src) {
        console.warn('[image-helper] Image failed to load, falling back to placeholder:', src);
        if (WS_DEBUG) console.error('[image-helper][dev] Missing asset:', src);
    }
    const _Image = window.Image;
    const srcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');

    function PatchedImage(w, h) {
        const img = new _Image(w, h);
        let _src = '';
        let _tried = false;

        Object.defineProperty(img, 'src', {
            get: function() { return _src; },
            set: function(val) {
                _src = val;
                _tried = false;
                srcDesc.set.call(img, val);
            },
            configurable: true
        });

        img.addEventListener('error', function() {
            if (_tried) return;
            _tried = true;
            reportMissing(_src);
            _src = PLACEHOLDER;
            srcDesc.set.call(img, PLACEHOLDER);
        });

        return img;
    }
    // 图片缓存：同一 src 只创建一个 Image，避免渲染循环里每帧新建
    const _imageCache = new Map();
    window.getCachedImage = function(src) {
        let img = _imageCache.get(src);
        if (!img) {
            img = new _Image();
            img.src = src;
            _imageCache.set(src, img);
        }
        return img;
    };

    PatchedImage.prototype = _Image.prototype;
    window.Image = PatchedImage;

    // DOM 中已有的 <img> 标签（商店、宠物面板等）
    document.addEventListener('error', function(e) {
        const t = e.target;
        if (t && t.tagName === 'IMG' && !t._placeholderTried) {
            t._placeholderTried = true;
            reportMissing(t.getAttribute('src'));
            t.src = PLACEHOLDER;
        }
    }, true);
})();