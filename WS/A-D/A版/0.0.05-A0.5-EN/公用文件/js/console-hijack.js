// ---------- 控制台与游戏系统的集成 ----------
(function() {
    // 优化清单第 20 条：作弊控制台加显式开关，避免任何访客都能用 R·WS·C 改数值。
    // 默认开启（不改变现有体验）；?console=0 或 localStorage['ws_console_enabled']='0' 可关闭。
    var CONSOLE_FLAG_KEY = 'ws_console_enabled';
    function isConsoleEnabled() {
        var m = /[?&]console=(0|1)/i.exec(window.location.search);
        if (m) return m[1] === '1';
        try {
            if (localStorage.getItem(CONSOLE_FLAG_KEY) === '0') return false;
        } catch (e) {}
        return true;
    }
    if (!isConsoleEnabled()) {
        console.info('[console-hijack] Cheat console disabled; use ?console=1 to enable it temporarily');
        return;
    }

    // 拦截键盘事件（捕获阶段）：控制台打开时阻止所有非编辑器专用按键
    document.addEventListener('keydown', function(e) {
        if (window.codeEditorOpen) {
            const targetTag = e.target.tagName;
            const targetId = e.target.id;
            // 如果焦点在编辑器textarea内，则不拦截（让编辑器处理自己的快捷键）
            if (targetTag === 'TEXTAREA' && targetId === 'codeEditorTextarea') {
                return;
            }
            // 其他所有按键都阻止，包括游戏快捷键和浏览器默认行为
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // 鼠标事件拦截
    canvas.addEventListener('mousedown', function(e) {
        if (window.codeEditorOpen) { e.preventDefault(); e.stopPropagation(); return false; }
    }, true);
    canvas.addEventListener('mouseup', function(e) {
        if (window.codeEditorOpen) { e.preventDefault(); e.stopPropagation(); return false; }
    }, true);
    canvas.addEventListener('mousemove', function(e) {
        if (window.codeEditorOpen) { e.preventDefault(); e.stopPropagation(); return false; }
    }, true);
    window.addEventListener('contextmenu', function(e) {
        if (window.codeEditorOpen) e.preventDefault();
    });

    // 修改 executeCommand 使 "R·WS·C" 打开编辑器
    window.addEventListener('load', function() {
        if (typeof window.executeCommand === 'function') {
            const originalExecute = window.executeCommand;
            window.executeCommand = function(cmd) {
                if (cmd === 'R·WS·C') {
                    if (window.openCodeEditor) window.openCodeEditor();
                    return;
                }
                originalExecute(cmd);
            };
        }
    });
})();
