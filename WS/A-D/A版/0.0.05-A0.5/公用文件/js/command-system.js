// ---------- 指令系统 ----------
(function() {
    'use strict';

    let commandInputActive = false;
    let commandOverlay = null;
    let commandInput = null;
    let tabCycleIndex = 0;
    let lastTabInput = '';

    const COMMANDS = ['st summon', 'bm', 'tune LV =', 'summon', 'kill', 'give', 'image', 'help'];
    const CREATURE_TYPES = ['block', 'black'];
    const ITEM_NAMES = [
        'hp', 'normalAtk', 'skill',
        'sword', 'fb', 'fs', 'sd', 'th', 'cb', 'bh', 'ts',
        'frostBlade', 'firewand', 'compoundBow', 'blackholeStaff', 'techSpear',
        'priestRobes', 'pr', 'cross', 'cm', 'clownMask',
        'iceWings', 'ic', 'iw', 'techShield', 'tshield', 'shield',
        'geometry', 'banana', 'eyeball',
        'monkey', '0.618', 'horror', 'en'
    ];
    const WEAPON_NAMES = [
        'sword', 'fb', 'fs', 'sd', 'th', 'cb', 'bh', 'ts',
        'frostBlade', 'firewand', 'compoundBow', 'blackholeStaff', 'techSpear'
    ];

    function getSuggestions(input) {
        const trimmed = input.trim();
        if (!trimmed) return [];

        if (/^image\s+/i.test(trimmed)) {
            const after = trimmed.replace(/^image\s+/i, '');
const names = Object.keys(ITEMS);
            const eqIdx = after.indexOf('=');
            if (eqIdx >= 0) {
                const head = 'image ' + after.slice(0, eqIdx + 1).replace(/\s+$/, '') + ' ';
                const tail = after.slice(eqIdx + 1).trim();
                return names.filter(n => n.startsWith(tail)).map(n => head + n);
            }
            const cur = after.trim();
            const out = names.filter(n => n.startsWith(cur)).map(n => 'image ' + n);
            if ('reset'.startsWith(cur)) out.unshift('image reset');
            return out;
        }

        if (/^give\s+/i.test(trimmed)) {
            const after = trimmed.replace(/^give\s+/i, '');
            return ITEM_NAMES.filter(n => n.startsWith(after)).map(n => 'give ' + n);
        }

        if (/^summon\s+/i.test(trimmed)) {
            const after = trimmed.replace(/^summon\s+/i, '');
            if (after.includes('~~~')) {
                const idx = after.indexOf('~~~');
                const head = after.slice(0, idx + 3);
                const lastPart = after.slice(idx + 3).trim();
                return WEAPON_NAMES.filter(n => n.startsWith(lastPart)).map(n => head + ' ' + n);
            }
            const parts = after.split(/\s+/);
            const numPrefix = (/^\d+$/.test(parts[0])) ? ('summon ' + parts[0] + ' ') : 'summon ';
            if (/^\d+$/.test(parts[0]) && parts.length >= 2) {
                return CREATURE_TYPES.filter(t => t.startsWith(parts[1] || '')).map(t => numPrefix + t);
            }
            if (/^\d+$/.test(parts[0]) && parts.length === 1) return CREATURE_TYPES.map(t => numPrefix + t);
            if (/^\d/.test(parts[0])) return [];
            return CREATURE_TYPES.map(t => numPrefix + t);
        }

        return COMMANDS.filter(c => c.startsWith(trimmed));
    }

    // 液体滚动：滚轮/触摸惯性 + 弹性回弹（适用于建议列表）
    function attachLiquidScroll(el) {
        if (!el || el._liquidScrollAttached) return;
        el._liquidScrollAttached = true;
        let velocity = 0;
        let rafId = null;
        const maxScroll = () => Math.max(0, el.scrollHeight - el.clientHeight);

        function step() {
            if (Math.abs(velocity) < 0.05) { velocity = 0; rafId = null; return; }
            const max = maxScroll();
            if (el.scrollTop < 0) {
                el.scrollTop = 0;
                velocity *= -0.35;
            } else if (el.scrollTop > max) {
                el.scrollTop = max;
                velocity *= -0.35;
            } else {
                velocity *= 0.9;
            }
            el.scrollTop += velocity;
            rafId = requestAnimationFrame(step);
        }
        function kick(v) {
            velocity = Math.max(-140, Math.min(140, velocity + v));
            if (!rafId) rafId = requestAnimationFrame(step);
        }

        el.addEventListener('wheel', (e) => {
            e.preventDefault();
            kick(e.deltaY * 0.6);
        }, { passive: false });

        let touchLastY = 0;
        let touchV = 0;
        el.addEventListener('touchstart', (e) => {
            velocity = 0;
            touchLastY = e.touches[0].clientY;
            touchV = 0;
        }, { passive: true });
        el.addEventListener('touchmove', (e) => {
            const y = e.touches[0].clientY;
            const dy = y - touchLastY;
            touchLastY = y;
            touchV = -dy;
            el.scrollTop -= dy;
        }, { passive: true });
        el.addEventListener('touchend', () => {
            if (Math.abs(touchV) > 1.5) kick(touchV * 5);
        }, { passive: true });
    }

    function createCommandUI() {
        if (commandOverlay) return;
        tabCycleIndex = 0;
        lastTabInput = '';

        commandOverlay = document.createElement('div');
        commandOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse at center, rgba(14,14,22,0.82) 0%, rgba(6,6,10,0.92) 100%);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);z-index:1000;display:flex;flex-direction:column;justify-content:center;align-items:center;animation:cmdFadeIn 0.18s ease-out;';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'width:80%;max-width:620px;background:linear-gradient(160deg, rgba(24,24,36,0.94) 0%, rgba(16,16,26,0.92) 100%);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);border:1px solid rgba(255,215,0,0.35);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(255,215,0,0.08);padding:22px 26px 18px 26px;position:relative;';

        // 标题
        const title = document.createElement('div');
        title.textContent = '指令台';
        title.style.cssText = 'color:#ffd966;font:bold 18px monospace;letter-spacing:4px;text-align:center;margin-bottom:14px;text-shadow:0 0 18px rgba(255,215,0,0.35);';

        const inputRow = document.createElement('div');
        inputRow.style.cssText = 'display:flex;align-items:center;background:rgba(0,0,0,0.45);border:1px solid rgba(255,215,0,0.28);border-radius:12px;padding:2px 6px;transition:border-color 0.2s, box-shadow 0.2s;';

        const prefix = document.createElement('span');
        prefix.textContent = '/';
        prefix.style.cssText = 'color:#ffd966;font-size:20px;font-family:monospace;padding:0 6px;';

        commandInput = document.createElement('input');
        commandInput.type = 'text';
        commandInput.style.cssText = 'flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:19px;font-family:monospace;padding:10px 8px;caret-color:#ffd966;';
        commandInput.placeholder = '输入指令，Tab 补全 · Enter 执行 · Esc 关闭';
        commandInput.autofocus = true;
        commandInput.spellcheck = false;

        inputRow.appendChild(prefix);
        inputRow.appendChild(commandInput);
        wrapper.appendChild(title);
        wrapper.appendChild(inputRow);

        const suggestBox = document.createElement('div');
        suggestBox.id = 'suggestBox';
        suggestBox.style.cssText = 'position:absolute;top:calc(100% + 10px);left:26px;right:26px;max-height:220px;overflow-y:auto;overscroll-behavior:none;background:linear-gradient(170deg, rgba(28,28,40,0.96) 0%, rgba(18,18,30,0.96) 100%);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,215,0,0.22);border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,0.6);display:none;z-index:1001;padding:4px;';

        wrapper.appendChild(suggestBox);
        commandOverlay.appendChild(wrapper);

        const errorToast = document.createElement('div');
        errorToast.id = 'cmdError';
        errorToast.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);background:linear-gradient(160deg, rgba(140,40,40,0.94), rgba(90,24,24,0.94));backdrop-filter:blur(10px);color:#ffd9d9;padding:12px 24px;border-radius:14px;font-size:15px;font-weight:bold;z-index:2000;display:none;border:1px solid rgba(255,100,100,0.3);box-shadow:0 10px 40px rgba(0,0,0,0.5);';
        document.body.appendChild(errorToast);

        attachLiquidScroll(suggestBox);

        function updateSuggestions() {
            const matches = getSuggestions(commandInput.value);
            if (matches.length === 0) { suggestBox.style.display = 'none'; suggestBox.innerHTML = ''; return; }
            suggestBox.innerHTML = '';
            matches.forEach(m => {
                const el = document.createElement('div');
                el.textContent = m;
                el.style.cssText = 'padding:9px 16px;color:#e8e8f0;cursor:pointer;font-family:monospace;font-size:15px;border-radius:8px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s, color 0.15s;';
                el.onmouseenter = () => { el.style.background = 'rgba(255,215,0,0.16)'; el.style.color = '#ffd966'; };
                el.onmouseleave = () => { el.style.background = 'transparent'; el.style.color = '#e8e8f0'; };
                el.onclick = () => {
                    commandInput.value = m;
                    suggestBox.style.display = 'none';
                    commandInput.focus();
                    commandInput.setSelectionRange(m.length, m.length);
                };
                suggestBox.appendChild(el);
            });
            suggestBox.style.display = 'block';
            attachLiquidScroll(suggestBox);
        }

        commandInput.addEventListener('input', () => { tabCycleIndex = 0; lastTabInput = ''; updateSuggestions(); });
        commandInput.addEventListener('blur', () => setTimeout(() => suggestBox.style.display = 'none', 200));
        commandInput.addEventListener('focus', updateSuggestions);

        commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const cmd = commandInput.value.trim();
                if (cmd) {
                    if (typeof window.executeCommand === 'function') {
                        try {
                            const result = window.executeCommand(cmd);
                            if (result === false) showCommandError('指令错误');
                        } catch (err) {
                            showCommandError('错误: ' + (err.message || '未知'));
                        }
                    } else {
                        showCommandError('命令系统未初始化');
                    }
                    closeCommandUI();
                } else {
                    closeCommandUI();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeCommandUI();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const matches = getSuggestions(commandInput.value);
                if (matches.length === 0) return;
                const current = commandInput.value.trim();
                if (current !== lastTabInput) {
                    tabCycleIndex = 0;
                    lastTabInput = current;
                }
                const pick = matches[tabCycleIndex % matches.length];
                tabCycleIndex++;
                commandInput.value = pick;
                commandInput.setSelectionRange(pick.length, pick.length);
                updateSuggestions();
                // 高亮当前补全项
                const items = suggestBox.querySelectorAll('div');
                const hl = (tabCycleIndex - 1) % matches.length;
                items.forEach((el, i) => {
                    if (i === hl) { el.style.background = 'rgba(255,215,0,0.28)'; el.style.color = '#ffd966'; }
                    else { el.style.background = 'transparent'; el.style.color = '#e8e8f0'; }
                });
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const matches = getSuggestions(commandInput.value);
                if (matches.length > 0 && suggestBox.style.display === 'block') {
                    e.preventDefault();
                    if (e.key === 'ArrowDown') { tabCycleIndex++; } else { tabCycleIndex--; }
                    if (tabCycleIndex < 0) tabCycleIndex = matches.length - 1;
                    const pick = matches[tabCycleIndex % matches.length];
                    commandInput.value = pick;
                    commandInput.setSelectionRange(pick.length, pick.length);
                    const items = suggestBox.querySelectorAll('div');
                    items.forEach((el, i) => {
                        if (i === tabCycleIndex % matches.length) { el.style.background = 'rgba(255,215,0,0.28)'; el.style.color = '#ffd966'; }
                        else { el.style.background = 'transparent'; el.style.color = '#e8e8f0'; }
                    });
                }
            }
        });

        document.body.appendChild(commandOverlay);
        commandOverlay.addEventListener('click', (e) => {
            if (e.target === commandOverlay) closeCommandUI();
        });

        window.showCommandError = function(msg) {
            errorToast.textContent = msg;
            errorToast.style.display = 'block';
            clearTimeout(errorToast._hideTimer);
            errorToast._hideTimer = setTimeout(() => errorToast.style.display = 'none', 6000);
        };

        // 注入全局样式（动画 + 滚动条）
        if (!document.getElementById('cmdGlassStyle')) {
            const st = document.createElement('style');
            st.id = 'cmdGlassStyle';
            st.textContent = '@keyframes cmdFadeIn{0%{opacity:0}100%{opacity:1}} #suggestBox::-webkit-scrollbar{width:8px} #suggestBox::-webkit-scrollbar-thumb{background:rgba(255,215,0,0.3);border-radius:8px} #suggestBox::-webkit-scrollbar-track{background:transparent}';
            document.head.appendChild(st);
        }

        setTimeout(() => commandInput.focus(), 100);
    }

    function closeCommandUI() {
        if (commandOverlay) {
            document.body.removeChild(commandOverlay);
            commandOverlay = null;
            commandInput = null;
            commandInputActive = false;
            window.commandInputActive = false;
            if (typeof canvas !== 'undefined' && canvas) canvas.focus();
        }
    }

    function openCommandUI() {
        if (commandInputActive) return;
        commandInputActive = true;
        window.commandInputActive = true;
        createCommandUI();
    }

    function isCommandActive() { return commandInputActive; }

    window.openCommandUI = openCommandUI;
    window.closeCommandUI = closeCommandUI;
    window.isCommandActive = isCommandActive;
    window.commandInputActive = false;

    console.log('[指令系统] 已加载，按 T 打开，Tab 循环补全，毛玻璃 + 液体滚动');
})();
