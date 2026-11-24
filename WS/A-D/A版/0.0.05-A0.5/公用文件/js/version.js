// ========== version.js ==========
// 项目版本号的唯一来源（对照优化清单第 20 条：页脚与目录名版本漂移）。
// 任何页面需要显示版本时引入本文件，并把页脚元素标记为 data-ws-version，由本脚本统一注入。

(function (global) {
    'use strict';

    var VERSION = '0.0.05-A0.5';
    var BUILD = '2026-11-23';

    global.WS_VERSION = VERSION;
    global.WS_BUILD = BUILD;

    function inject() {
        var nodes = document.querySelectorAll('[data-ws-version]');
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var prefix = node.getAttribute('data-ws-version-prefix');
            node.textContent = (prefix === null ? 'v' : prefix) + VERSION;
            node.setAttribute('title', '构建日期：' + BUILD);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})(window);
