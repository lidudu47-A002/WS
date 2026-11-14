(function() {
    // ---------- 虚拟磁盘数据 ----------
    let virtualDrives = {
        C: { type: 'drive', name: '本地磁盘 (C:)', children: [] },
        D: { type: 'drive', name: '本地磁盘 (D:)', children: [] }
    };
    let currentDrive = null;
    let selectedItems = new Set();      // 存储选中的文件/文件夹索引
    let contextMenu = null;             // 右键菜单元素
    let currentRightClickIndex = null;  // 当前右键点击的文件索引

    // 加载虚拟文件系统
    function loadVirtualFS() {
        const stored = localStorage.getItem('ws_virtual_fs');
        if (stored) {
            try { virtualDrives = JSON.parse(stored); } catch(e) {}
        }
        if (!virtualDrives.C) virtualDrives.C = { type: 'drive', name: '本地磁盘 (C:)', children: [] };
        if (!virtualDrives.D) virtualDrives.D = { type: 'drive', name: '本地磁盘 (D:)', children: [] };
        if (!virtualDrives.C.children) virtualDrives.C.children = [];
        if (!virtualDrives.D.children) virtualDrives.D.children = [];
    }
    function saveVirtualFS() {
        localStorage.setItem('ws_virtual_fs', JSON.stringify(virtualDrives));
    }

    function addItemToDrive(driveLetter, type, count) {
        const drive = virtualDrives[driveLetter.toUpperCase()];
        if (!drive) return { success: false, msg: `盘符 ${driveLetter} 不存在` };
        let added = 0;
        for (let i = 0; i < count; i++) {
            let baseName = (type === 'F') ? '新建文件夹' : '新建文本文档';
            let ext = (type === 'F') ? '' : '.txt';
            let name = baseName + ext;
            let idx = 1;
            while (drive.children.some(item => item.name === name)) {
                name = baseName + ` (${idx})` + ext;
                idx++;
            }
            drive.children.push({
                name: name,
                type: (type === 'F') ? 'folder' : 'file',
                content: (type === 'F') ? null : ''
            });
            added++;
        }
        saveVirtualFS();
        return { success: true, msg: `成功在 ${driveLetter}: 盘添加 ${added} 个${type === 'F' ? '文件夹' : '文本文档'}` };
    }

    // ---------- 命令提示符 ----------
    function openCmdModal() {
        const modal = document.getElementById('cmdModal');
        const output = document.getElementById('cmdOutput');
        const input = document.getElementById('cmdInput');
        if (!modal) return;
        modal.classList.remove('hidden');
        let ov = document.getElementById('editorOverlay');
        if (!ov) { ov = document.createElement('div'); ov.id = 'editorOverlay'; ov.className = 'editor-overlay'; document.body.appendChild(ov); }
        ov.classList.remove('hidden');
        input.value = '';
        input.focus();
        if (!window.cmdBound) {
            window.cmdBound = true;
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const cmd = input.value.trim();
                    input.value = '';
                    executeCommand(cmd, output);
                }
            });
        }
    }

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function executeCommand(cmd, output) {
        output.innerHTML += `<div><span style="color:#0f0;">C:\\&gt;</span> ${escapeHtml(cmd)}</div>`;
        const parts = cmd.toLowerCase().split(/\s+/);
        if (parts[0] === 'add' && parts.length >= 5 && parts[3] === 'to' && parts[4] === 'the') {
            const count = parseInt(parts[1]);
            if (isNaN(count) || count <= 0) {
                output.innerHTML += `<div style="color:#f00;">错误: 个数必须为正整数</div>`;
                scrollOutputBottom(output);
                return;
            }
            let type = parts[2].toUpperCase();
            if (type !== 'F' && type !== 'EXE') {
                output.innerHTML += `<div style="color:#f00;">错误: 类型只能为 F (文件夹) 或 EXE (文本文档)</div>`;
                scrollOutputBottom(output);
                return;
            }
            const driveLetter = parts[5].toUpperCase();
            if (driveLetter !== 'C' && driveLetter !== 'D') {
                output.innerHTML += `<div style="color:#f00;">错误: 只能指定 C 或 D 盘</div>`;
                scrollOutputBottom(output);
                return;
            }
            const result = addItemToDrive(driveLetter, (type === 'F' ? 'F' : 'exe'), count);
            if (result.success) {
                output.innerHTML += `<div style="color:#0f0;">${escapeHtml(result.msg)}</div>`;
            } else {
                output.innerHTML += `<div style="color:#f00;">${escapeHtml(result.msg)}</div>`;
            }
            if (document.getElementById('computerModal') && !document.getElementById('computerModal').classList.contains('hidden')) {
                renderComputerContent();
            }
        } else {
            output.innerHTML += `<div style="color:#f00;">${escapeHtml(cmd)} 为未知命令</div>`;
        }
        scrollOutputBottom(output);
    }

    function scrollOutputBottom(output) {
        output.scrollTop = output.scrollHeight;
    }

    // ---------- 我的电脑（鼠标拖拽框选 + 右键删除/重命名）----------
    function openComputerModal() {
        const modal = document.getElementById('computerModal');
        if (!modal) return;
        modal.classList.remove('hidden');
        let ov = document.getElementById('editorOverlay');
        if (!ov) { ov = document.createElement('div'); ov.id = 'editorOverlay'; ov.className = 'editor-overlay'; document.body.appendChild(ov); }
        ov.classList.remove('hidden');
        currentDrive = null;
        selectedItems.clear();
        renderComputerContent();
    }

    function deleteComputerItem(index) {
        const drive = virtualDrives[currentDrive];
        if (!drive) return;
        const item = drive.children[index];
        if (!item) return;
        if (confirm(`确定要删除“${item.name}”吗？此操作不可撤销。`)) {
            drive.children.splice(index, 1);
            saveVirtualFS();
            renderComputerContent();
        }
    }

    function renameComputerItem(index) {
        const drive = virtualDrives[currentDrive];
        if (!drive) return;
        const item = drive.children[index];
        if (!item) return;
        let newName = prompt('请输入新名称', item.name);
        if (newName && newName.trim() !== '') {
            const exists = drive.children.some((other, idx) => idx !== index && other.name === newName.trim());
            if (exists) {
                alert('已存在同名文件/文件夹');
                return;
            }
            item.name = newName.trim();
            saveVirtualFS();
            renderComputerContent();
        }
    }

    function showContextMenu(x, y, index) {
        if (contextMenu) contextMenu.remove();
        contextMenu = document.createElement('div');
        contextMenu.className = 'ctx-menu';
        contextMenu.style.display = 'block';
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.zIndex = 10000;
        const renameItem = document.createElement('div');
        renameItem.className = 'ctx-menu-item';
        renameItem.textContent = '✏️ 重命名';
        renameItem.onclick = () => {
            renameComputerItem(index);
            closeContextMenu();
        };
        const deleteItem = document.createElement('div');
        deleteItem.className = 'ctx-menu-item';
        deleteItem.textContent = '🗑️ 删除';
        deleteItem.onclick = () => {
            deleteComputerItem(index);
            closeContextMenu();
        };
        contextMenu.appendChild(renameItem);
        contextMenu.appendChild(deleteItem);
        document.body.appendChild(contextMenu);
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) contextMenu.style.left = (window.innerWidth - rect.width - 5) + 'px';
        if (rect.bottom > window.innerHeight) contextMenu.style.top = (window.innerHeight - rect.height - 5) + 'px';
    }

    function closeContextMenu() {
        if (contextMenu) contextMenu.remove();
        contextMenu = null;
        currentRightClickIndex = null;
    }

    function updateCardStyles(container, selectedSet) {
        const cards = container.querySelectorAll('.computer-file-card');
        cards.forEach((card, idx) => {
            if (selectedSet.has(idx)) {
                card.style.backgroundColor = 'rgba(0,120,215,0.3)';
                card.style.border = '1px solid #0078d7';
            } else {
                card.style.backgroundColor = '';
                card.style.border = 'none';
            }
        });
    }

    function renderComputerContent() {
        const container = document.getElementById('computerContent');
        const backBtn = document.getElementById('computerBackBtn');
        if (!container) return;
        // 移除旧的拖拽事件监听
        if (window._computerDragHandlers) {
            container.removeEventListener('mousedown', window._computerDragHandlers.down);
            window.removeEventListener('mousemove', window._computerDragHandlers.move);
            window.removeEventListener('mouseup', window._computerDragHandlers.up);
        }
        // 移除全局右键关闭
        if (window._computerClickOutside) {
            document.removeEventListener('click', window._computerClickOutside);
        }
        container.innerHTML = '';
        if (currentDrive === null) {
            for (const [letter, drive] of Object.entries(virtualDrives)) {
                const driveDiv = document.createElement('div');
                driveDiv.className = 'drive-item';
                driveDiv.innerHTML = `<div class="drive-icon">💿</div><div class="drive-name">${drive.name}</div>`;
                driveDiv.onclick = () => {
                    currentDrive = letter;
                    selectedItems.clear();
                    renderComputerContent();
                };
                container.appendChild(driveDiv);
            }
            backBtn.style.display = 'none';
        } else {
            const drive = virtualDrives[currentDrive];
            if (!drive) {
                container.innerHTML = '<div>无法访问该盘符</div>';
                return;
            }
            const items = drive.children || [];
            if (items.length === 0) {
                container.innerHTML = '<div>此文件夹为空</div>';
            } else {
                items.forEach((item, idx) => {
                    const card = document.createElement('div');
                    card.className = 'computer-file-card';
                    card.setAttribute('data-index', idx);
                    card.style.display = 'inline-block';
                    card.style.width = '80px';
                    card.style.textAlign = 'center';
                    card.style.margin = '10px';
                    card.style.cursor = 'pointer';
                    card.style.padding = '5px';
                    card.style.borderRadius = '4px';
                    card.style.transition = 'background 0.1s';
                    if (selectedItems.has(idx)) {
                        card.style.backgroundColor = 'rgba(0,120,215,0.3)';
                        card.style.border = '1px solid #0078d7';
                    } else {
                        card.style.backgroundColor = '';
                        card.style.border = 'none';
                    }
                    const icon = document.createElement('div');
                    icon.className = 'file-icon-in-computer';
                    icon.style.fontSize = '40px';
                    icon.textContent = item.type === 'folder' ? '📁' : '📄';
                    const nameSpan = document.createElement('div');
                    nameSpan.className = 'file-name-in-computer';
                    nameSpan.textContent = item.name;
                    card.appendChild(icon);
                    card.appendChild(nameSpan);
                    // 单击卡片：清除其他选中，仅选中当前卡片
                    card.addEventListener('click', (e) => {
                        e.stopPropagation();
                        selectedItems.clear();
                        selectedItems.add(idx);
                        updateCardStyles(container, selectedItems);
                    });
                    // 右键菜单
                    card.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        currentRightClickIndex = idx;
                        showContextMenu(e.clientX, e.clientY, idx);
                    });
                    // 双击打开
                    card.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        if (item.type === 'folder') {
                            alert('当前版本暂不支持进入子文件夹，仅作展示。');
                        } else {
                            alert(`文件内容: ${item.content || '暂无内容'}`);
                        }
                    });
                    container.appendChild(card);
                });
            }
            backBtn.style.display = 'block';
            backBtn.onclick = () => {
                currentDrive = null;
                selectedItems.clear();
                renderComputerContent();
            };
        }
        // 绑定额外的全局右键关闭
        window._computerClickOutside = (e) => {
            if (contextMenu && !contextMenu.contains(e.target)) {
                closeContextMenu();
            }
        };
        document.addEventListener('click', window._computerClickOutside);
        // 初始化拖拽框选（重新绑定，保证最新的 container）
        initDragSelection(container);
    }

    function initDragSelection(container) {
        if (!container) return;
        let isDragging = false;
        let startX, startY;
        let selectionDiv = null;
        let hasMoved = false;

        const onMouseDown = (e) => {
            // 只有点击空白区域（不是卡片）时启动拖拽框选
            const isCard = e.target.closest('.computer-file-card');
            if (isCard) return;  // 点击在卡片上，不启动框选
            isDragging = true;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            selectionDiv = document.createElement('div');
            selectionDiv.style.position = 'absolute';
            selectionDiv.style.border = '1px solid #0078d7';
            selectionDiv.style.backgroundColor = 'rgba(0,120,215,0.2)';
            selectionDiv.style.pointerEvents = 'none';
            selectionDiv.style.zIndex = '1000';
            container.style.position = 'relative';
            container.appendChild(selectionDiv);
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging || !selectionDiv) return;
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            if (dx > 3 || dy > 3) hasMoved = true;
            const left = Math.min(startX, e.clientX);
            const top = Math.min(startY, e.clientY);
            const width = Math.abs(e.clientX - startX);
            const height = Math.abs(e.clientY - startY);
            selectionDiv.style.left = (left - container.getBoundingClientRect().left) + 'px';
            selectionDiv.style.top = (top - container.getBoundingClientRect().top) + 'px';
            selectionDiv.style.width = width + 'px';
            selectionDiv.style.height = height + 'px';
        };

        const onMouseUp = (e) => {
            if (!isDragging) return;
            if (selectionDiv) selectionDiv.remove();
            if (!hasMoved) {
                // 纯单击空白区域 -> 取消所有选中
                selectedItems.clear();
                updateCardStyles(container, selectedItems);
            } else {
                // 拖拽框选：替换选中为框内的卡片
                const rect = selectionDiv ? selectionDiv.getBoundingClientRect() : null;
                if (rect) {
                    const cards = container.querySelectorAll('.computer-file-card');
                    const newSelection = new Set();
                    cards.forEach((card, idx) => {
                        const cardRect = card.getBoundingClientRect();
                        if (rect.left < cardRect.right && rect.right > cardRect.left &&
                            rect.top < cardRect.bottom && rect.bottom > cardRect.top) {
                            newSelection.add(idx);
                        }
                    });
                    // 注意：我们使用替换模式（不保留原有选中）
                    selectedItems.clear();
                    newSelection.forEach(i => selectedItems.add(i));
                    updateCardStyles(container, selectedItems);
                }
            }
            isDragging = false;
            hasMoved = false;
            selectionDiv = null;
        };

        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        window._computerDragHandlers = { down: onMouseDown, move: onMouseMove, up: onMouseUp };
    }

    // ---------- 应用商店 ----------
    let installedApps = [];
    const availableApps = [
        {
            id: 'rhythm_fantasy',
            name: 'Rhythm Fantasy',
            icon: '🎹',
            description: '传统下落式音游 · 钢琴节奏 · 长按音符',
            version: '1.0',
            path: '../软件/Rhythm Fantasy/Rhythm Fantasy.html'
        }
    ];

    function loadInstalledApps() {
        const stored = localStorage.getItem('ws_manager_installed_apps');
        if (stored) {
            try { installedApps = JSON.parse(stored); } catch(e) { installedApps = []; }
        } else { installedApps = []; }
    }

    function saveInstalledApps() {
        localStorage.setItem('ws_manager_installed_apps', JSON.stringify(installedApps));
    }

    function isAppInstalled(appId) {
        return installedApps.includes(appId);
    }

    function createAppShortcutElement(app) {
        const item = document.createElement('div');
        item.className = 'file-item app-shortcut';
        item.dataset.appId = app.id;
        item.dataset.type = 'app';
        item.draggable = false;
        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-icon';
        iconDiv.style.display = 'flex';
        iconDiv.style.alignItems = 'center';
        iconDiv.style.justifyContent = 'center';
        iconDiv.style.fontSize = '40px';
        iconDiv.style.lineHeight = '48px';
        iconDiv.textContent = app.icon;
        const name = document.createElement('div');
        name.className = 'file-name';
        name.textContent = app.name;
        item.appendChild(iconDiv);
        item.appendChild(name);
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected', 'multi-selected'));
            item.classList.add('selected');
        });
        item.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            window.open(app.path, '_blank');
        });
        return item;
    }

    function addAppShortcutToDesktop(app) {
        const desktop = document.getElementById('desktop');
        if (!desktop) return;
        const existing = document.querySelector(`.app-shortcut[data-app-id="${app.id}"]`);
        if (existing) return;
        const shortcut = createAppShortcutElement(app);
        const storeIcon = document.querySelector('.store-bin');
        if (storeIcon && storeIcon.parentNode === desktop) {
            storeIcon.insertAdjacentElement('afterend', shortcut);
        } else {
            desktop.appendChild(shortcut);
        }
        if (typeof window.applySettingsToDOM === 'function') {
            window.applySettingsToDOM();
        } else if (typeof window.WS?.applySettingsToDOM === 'function') {
            window.WS.applySettingsToDOM();
        }
    }

    function removeAppShortcut(appId) {
        const shortcut = document.querySelector(`.app-shortcut[data-app-id="${appId}"]`);
        if (shortcut) shortcut.remove();
    }

    function refreshAppShortcuts() {
        const existing = document.querySelectorAll('.app-shortcut');
        existing.forEach(el => el.remove());
        installedApps.forEach(appId => {
            const app = availableApps.find(a => a.id === appId);
            if (app) addAppShortcutToDesktop(app);
        });
    }

    function installApp(app) {
        if (isAppInstalled(app.id)) {
            alert('应用已安装！');
            return;
        }
        installedApps.push(app.id);
        saveInstalledApps();
        addAppShortcutToDesktop(app);
        renderStore();
        alert(`“${app.name}” 安装成功！\n请确保已将应用文件放到: ${app.path}`);
    }

    function uninstallApp(app) {
        if (!isAppInstalled(app.id)) return;
        installedApps = installedApps.filter(id => id !== app.id);
        saveInstalledApps();
        removeAppShortcut(app.id);
        renderStore();
        alert(`“${app.name}” 已卸载`);
    }

    function getRhythmFantasyHTML() {
        return `<!DOCTYPE html>...`; // 请替换为真实的音游HTML
    }

    function downloadAppPackage(app) {
        let htmlContent = '';
        if (app.id === 'rhythm_fantasy') {
            htmlContent = getRhythmFantasyHTML();
        } else {
            alert('暂无安装包');
            return;
        }
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${app.name}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(`已下载 ${app.name}.html，请将其保存到: ${app.path}`);
    }

    function renderStore() {
        const storeListDiv = document.getElementById('storeList');
        if (!storeListDiv) return;
        storeListDiv.innerHTML = '';
        availableApps.forEach(app => {
            const installed = isAppInstalled(app.id);
            const appDiv = document.createElement('div');
            appDiv.className = 'app-item';
            appDiv.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:2.5rem;">${app.icon}</div>
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${app.name}</div>
                        <div style="font-size:0.75rem; opacity:0.7;">${app.description}</div>
                        <div style="font-size:0.7rem;">版本 ${app.version}</div>
                    </div>
                    <div>
                        ${!installed ? `<button class="install-btn" data-id="${app.id}">📥 安装</button>` : `<button class="uninstall-btn" data-id="${app.id}">🗑️ 卸载</button>`}
                        <button class="download-app-btn" data-id="${app.id}">📎 下载安装包</button>
                    </div>
                </div>
            `;
            storeListDiv.appendChild(appDiv);
        });
        document.querySelectorAll('.install-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                const app = availableApps.find(a => a.id === id);
                if (app) installApp(app);
            });
        });
        document.querySelectorAll('.uninstall-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                const app = availableApps.find(a => a.id === id);
                if (app) uninstallApp(app);
            });
        });
        document.querySelectorAll('.download-app-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                const app = availableApps.find(a => a.id === id);
                if (app) downloadAppPackage(app);
            });
        });
    }

    function openStore() {
        renderStore();
        const storeModal = document.getElementById('storeModal');
        if (storeModal) {
            storeModal.classList.remove('hidden');
            let ov = document.getElementById('editorOverlay');
            if (!ov) {
                ov = document.createElement('div');
                ov.id = 'editorOverlay';
                ov.className = 'editor-overlay';
                document.body.appendChild(ov);
            }
            ov.classList.remove('hidden');
        }
    }

    // ---------- 关闭按钮绑定 ----------
    function bindCloseButtons() {
        const closeStoreBtn = document.getElementById('closeStoreBtn');
        const closeStoreOkBtn = document.getElementById('closeStoreOkBtn');
        if (closeStoreBtn) {
            closeStoreBtn.addEventListener('click', () => {
                document.getElementById('storeModal')?.classList.add('hidden');
                document.getElementById('editorOverlay')?.classList.add('hidden');
            });
        }
        if (closeStoreOkBtn) {
            closeStoreOkBtn.addEventListener('click', () => {
                document.getElementById('storeModal')?.classList.add('hidden');
                document.getElementById('editorOverlay')?.classList.add('hidden');
            });
        }
        const closeCmdBtn = document.getElementById('closeCmdBtn');
        if (closeCmdBtn) {
            closeCmdBtn.addEventListener('click', () => {
                document.getElementById('cmdModal')?.classList.add('hidden');
                document.getElementById('editorOverlay')?.classList.add('hidden');
            });
        }
        const closeComputerBtn = document.getElementById('closeComputerBtn');
        const closeComputerOkBtn = document.getElementById('closeComputerOkBtn');
        if (closeComputerBtn) {
            closeComputerBtn.addEventListener('click', () => {
                document.getElementById('computerModal')?.classList.add('hidden');
                document.getElementById('editorOverlay')?.classList.add('hidden');
            });
        }
        if (closeComputerOkBtn) {
            closeComputerOkBtn.addEventListener('click', () => {
                document.getElementById('computerModal')?.classList.add('hidden');
                document.getElementById('editorOverlay')?.classList.add('hidden');
            });
        }
    }

    function init() {
        loadVirtualFS();
        bindCloseButtons();
    }

    window.WSStore = {
        loadInstalledApps,
        refreshAppShortcuts,
        openStore,
        installApp,
        uninstallApp,
        addAppShortcutToDesktop,
        openCmdModal,
        openComputerModal
    };

    init();
})();