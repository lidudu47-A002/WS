// ---------- 控制台与游戏系统的集成 ----------
(function() {
    // 保存原始 update / draw
    const originalUpdate = window.update;
    const originalDraw = window.draw;

    // 覆盖 update：编辑器打开时暂停游戏逻辑
    window.update = function(now) {
        if (window.codeEditorOpen) return;
        if (originalUpdate) originalUpdate(now);
    };
    // 保留 draw 不变（编辑器UI会覆盖）

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
    if (typeof window.executeCommand === 'function') {
        const originalExecute = window.executeCommand;
        window.executeCommand = function(cmd) {
            if (cmd === 'R·WS·C') {
                if (typeof window.openCodeEditor === 'function') window.openCodeEditor();
                return;
            }
            originalExecute(cmd);
        };
    } else {
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
    }

    // 暴露辅助函数供编辑器调用
    window.summonEnemies = window.summonEnemies;
    window.addItem = window.addItem;
    window.addGoldEarned = window.addGoldEarned;
    window.checkAchievements = window.checkAchievements;
    window.updatePanelUI = window.updatePanelUI;
    window.applyTalentEffects = window.applyTalentEffects;
    window.updatePlayerMaxHp = window.updatePlayerMaxHp;
})();