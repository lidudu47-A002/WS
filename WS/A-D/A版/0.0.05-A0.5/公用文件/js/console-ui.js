// ---------- 游戏控制台界面 (UI & 编辑器) ----------
(function() {
    // 动态注入控制台样式
    const style = document.createElement('style');
    style.textContent = `
        .python-editor-panel {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(10, 10, 20, 0.88);
            backdrop-filter: blur(16px);
            z-index: 10000;
            display: none;
            justify-content: center;
            align-items: center;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        }
        .editor-container {
            width: 85%;
            max-width: 1100px;
            height: 85%;
            background: linear-gradient(160deg, rgba(30,30,48,0.96), rgba(18,18,32,0.96));
            backdrop-filter: blur(22px);
            border-radius: 20px;
            border: 2px solid rgba(255,217,102,0.6);
            box-shadow: 0 0 30px rgba(0,0,0,0.8), 0 0 40px rgba(255,215,0,0.06);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .editor-header {
            background: #2a2a3a;
            padding: 12px 20px;
            border-bottom: 1px solid #ffd966;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .editor-header h3 {
            color: #ffd966;
            margin: 0;
            font-size: 1.4rem;
            letter-spacing: 1px;
        }
        .editor-header h3::before {
            content: "🎮 ";
        }
        .editor-controls button {
            background: #3a3a4e;
            border: none;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-family: monospace;
            font-weight: bold;
            transition: 0.2s;
        }
        .editor-controls button.close-editor-btn {
            background: #7a2e2e;
        }
        .editor-controls button:hover {
            filter: brightness(1.1);
            transform: scale(1.02);
        }
        .main-editor-area {
            display: flex;
            flex: 1;
            min-height: 0;
            padding: 16px;
            gap: 16px;
        }
        .code-input-area {
            flex: 2;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .code-input-area label {
            color: #ccc;
            font-size: 0.9rem;
            font-weight: bold;
        }
        textarea.code-editor {
            flex: 1;
            background: #0a0a12;
            color: #f8f8f2;
            border: 1px solid #5a5a7a;
            border-radius: 12px;
            padding: 16px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            line-height: 1.5;
            resize: none;
            outline: none;
            tab-size: 4;
        }
        .output-area {
            flex: 1.2;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .output-area label {
            color: #ccc;
            font-size: 0.9rem;
            font-weight: bold;
        }
        .output-console {
            background: #0a0a12;
            border: 1px solid #5a5a7a;
            border-radius: 12px;
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            font-family: monospace;
            font-size: 13px;
            color: #e0e0e0;
            display: flex;
            flex-direction: column;
        }
        .output-content {
            flex: 1;
        }
        .output-console p {
            margin: 4px 0;
            white-space: pre-wrap;
            word-break: break-word;
            border-left: 2px solid #ffd966;
            padding-left: 8px;
        }
        .output-console .error-msg {
            color: #ff8575;
            border-left-color: #ff4444;
        }
        .output-console .success-msg {
            color: #a5d6ff;
        }
        .hint-line {
            color: #ffd966;
            border-left: none;
            text-align: center;
            font-size: 12px;
            margin-top: 8px;
            padding: 4px;
            background: rgba(255,217,102,0.1);
            border-radius: 6px;
        }
        .editor-footer {
            padding: 12px 20px;
            background: #2a2a3a;
            border-top: 1px solid #444;
            font-size: 12px;
            color: #aaa;
            text-align: center;
        }
        .editor-footer kbd {
            background: #000;
            padding: 2px 6px;
            border-radius: 6px;
            font-family: monospace;
            color: #ffd966;
        }
        .python-editor-panel.active {
            display: flex;
        }
    `;
    document.head.appendChild(style);

    // 创建控制台面板DOM
    const editorPanel = document.createElement('div');
    editorPanel.id = 'pythonCodeEditor';
    editorPanel.className = 'python-editor-panel';
    editorPanel.innerHTML = `
        <div class="editor-container">
            <div class="editor-header">
                <h3>游戏控制台</h3>
                <div class="editor-controls">
                    <button id="closeEditorBtn" class="close-editor-btn">✖ 关闭</button>
                </div>
            </div>
            <div class="main-editor-area">
                <div class="code-input-area">
                    <label>📝 代码编辑区 (JavaScript)</label>
                    <textarea id="codeEditorTextarea" class="code-editor" spellcheck="false" placeholder='# 直接修改变量或调用函数&#10;gold += 500&#10;print("金币 +500")&#10;&#10;# 恢复生命&#10;playerHP = currentMaxHp&#10;print("生命已回满")&#10;&#10;# 召唤敌人&#10;# summonEnemies(3, "block")'></textarea>
                </div>
                <div class="output-area">
                    <label>📟 输出控制台</label>
                    <div id="outputConsole" class="output-console">
                        <div class="output-content" id="outputContent">
                            <p style="color:#aaa;">✨ 就绪，按 Ctrl+Enter 运行代码</p>
                            <p style="color:#ffd966;">💡 可用变量: player, gold, level, enemies, boss, playerHP, currentMaxHp ...</p>
                            <p style="color:#ffd966;">💡 可用函数: print(msg), addItem(type, amount), summonEnemies(count, "block/black")</p>
                        </div>
                        <div class="hint-line">💡 按 Ctrl+F 清空输出区</div>
                    </div>
                </div>
            </div>
            <div class="editor-footer">
                <kbd>Ctrl+Enter</kbd> 运行代码 &nbsp;&nbsp;|&nbsp;&nbsp; <kbd>Ctrl+F</kbd> 清空输出 &nbsp;&nbsp;|&nbsp;&nbsp; <kbd>Esc</kbd> 关闭面板
            </div>
        </div>
    `;
    document.body.appendChild(editorPanel);

    const codeTextarea = document.getElementById('codeEditorTextarea');
    const outputContent = document.getElementById('outputContent');
    const closeBtn = document.getElementById('closeEditorBtn');

    window.codeEditorOpen = false;

    // 重定向 print
    window.print = function(...args) {
        const message = args.map(arg => {
            if (arg === null) return 'null';
            if (typeof arg === 'object') {
                try { return JSON.stringify(arg); } catch(e) { return String(arg); }
            }
            return String(arg);
        }).join(' ');
        addOutputMessage(message, 'normal');
    };

    function addOutputMessage(text, type = 'normal') {
        const p = document.createElement('p');
        p.textContent = text;
        if (type === 'error') p.classList.add('error-msg');
        else if (type === 'success') p.classList.add('success-msg');
        outputContent.appendChild(p);
        p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        while (outputContent.children.length > 150) {
            outputContent.removeChild(outputContent.firstChild);
        }
    }

    function clearOutput() {
        while (outputContent.firstChild) {
            outputContent.removeChild(outputContent.firstChild);
        }
        addOutputMessage('✨ 输出已清空', 'success');
    }

    function runUserCode() {
        let code = codeTextarea.value;
        if (!code.trim()) {
            addOutputMessage('⚠️ 没有输入代码', 'error');
            return;
        }
        const originalConsoleLog = console.log;
        console.log = function(...args) {
            originalConsoleLog.apply(console, args);
            print(...args);
        };
        addOutputMessage(`>>> 执行代码 (${new Date().toLocaleTimeString()})`, 'success');
        try {
            const executeCode = new Function('player', 'enemies', 'boss', 'gold', 'level', 'exp', 'killCount', 'playerHP', 'currentMaxHp', 'normalAttackMult', 'skillDamageMult', 'talentPoints', 'inventorySlots', 'projectiles', 'cameraX', 'gameOver', 'victory', 
                `try {
                    const print = window.print;
                    const addItem = window.addItem;
                    const summonEnemies = window.summonEnemies;
                    const addGoldEarned = window.addGoldEarned;
                    const checkAchievements = window.checkAchievements;
                    const updatePanelUI = window.updatePanelUI;
                    const applyTalentEffects = window.applyTalentEffects;
                    const updatePlayerMaxHp = window.updatePlayerMaxHp;
                    let __gold = gold;
                    let __level = level;
                    let __exp = exp;
                    let __killCount = killCount;
                    let __playerHP = playerHP;
                    ${code}
                    if (typeof __gold !== 'undefined') window.gold = __gold;
                    if (typeof __level !== 'undefined') window.level = __level;
                    if (typeof __exp !== 'undefined') window.exp = __exp;
                    if (typeof __killCount !== 'undefined') window.killCount = __killCount;
                    if (typeof __playerHP !== 'undefined') window.playerHP = Math.min(window.currentMaxHp, Math.max(0, __playerHP));
                    if (window.panelVisible && typeof updatePanelUI === 'function') updatePanelUI();
                    if (typeof checkAchievements === 'function') checkAchievements();
                    if (typeof updatePlayerMaxHp === 'function') updatePlayerMaxHp();
                    if (typeof applyTalentEffects === 'function') applyTalentEffects();
                    return { success: true };
                } catch(err) {
                    throw err;
                }`);
            executeCode(player, enemies, boss, gold, level, exp, killCount, playerHP, currentMaxHp, normalAttackMult, skillDamageMult, talentPoints, inventorySlots, projectiles, cameraX, gameOver, victory);
            addOutputMessage('✅ 代码执行完毕', 'success');
            if (window.panelVisible && typeof updatePanelUI === 'function') updatePanelUI();
            if (typeof checkAchievements === 'function') checkAchievements();
        } catch (err) {
            addOutputMessage(`❌ 运行错误: ${err.message}`, 'error');
        } finally {
            console.log = originalConsoleLog;
        }
    }

    function openCodeEditor() {
        if (window.codeEditorOpen) return;
        window.codeEditorOpen = true;
        editorPanel.classList.add('active');
        editorPanel.style.display = 'flex';
        codeTextarea.value = '# 游戏控制台\n# 修改变量或调用函数\n# gold += 1000\n# playerHP = currentMaxHp\n# print("hello")';
        clearOutput();
        addOutputMessage('🎮 控制台已激活 (JavaScript 运行时)', 'success');
        codeTextarea.focus();
    }

    function closeCodeEditor() {
        if (!window.codeEditorOpen) return;
        window.codeEditorOpen = false;
        editorPanel.classList.remove('active');
        editorPanel.style.display = 'none';
        canvas.focus();
    }

    closeBtn.onclick = closeCodeEditor;
    editorPanel.addEventListener('click', (e) => { if (e.target === editorPanel) closeCodeEditor(); });

    codeTextarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runUserCode();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            clearOutput();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeCodeEditor();
        }
    });

    window.openCodeEditor = openCodeEditor;
    window.closeCodeEditor = closeCodeEditor;
    window.pythonEditorActive = () => window.codeEditorOpen;
    editorPanel.style.display = 'none';
})();