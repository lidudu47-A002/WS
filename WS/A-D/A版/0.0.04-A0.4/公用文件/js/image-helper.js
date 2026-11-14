// ========== 图片加载失败自动回退到占位符 ==========
(function() {
    const PLACEHOLDER = '../公用文件/图片/其他/占位符.png';
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
            _src = PLACEHOLDER;
            srcDesc.set.call(img, PLACEHOLDER);
        });

        return img;
    }
    PatchedImage.prototype = _Image.prototype;
    window.Image = PatchedImage;

    // DOM 中已有的 <img> 标签（商店、宠物面板等）
    document.addEventListener('error', function(e) {
        const t = e.target;
        if (t && t.tagName === 'IMG' && !t._placeholderTried) {
            t._placeholderTried = true;
            t.src = PLACEHOLDER;
        }
    }, true);
})();