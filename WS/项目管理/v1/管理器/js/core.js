(function() {
    // 登录校验：跳转到上一级目录的 BS·WS-M.html
    if (sessionStorage.getItem('ws_manager_logged_in') !== 'true') {
        window.location.href = '../BS·WS-M.html';
        return;
    }

    // ---------- 数据 ----------
    const EXPORT_HEADER = 'BIS has granted this file the BS·WS manager permission';
    let files = [];
    let trash = [];
    let selectedFileItem = null;
    let selectedFileIds = [];
    let nextId = 1;
    let currentFolderId = 0;
    const desktop = document.getElementById('desktop');

    // 排序与搜索
    let searchKeyword = '';
    let sortBy = 'name';
    let sortOrder = 1;

    // 框选变量
    let isSelecting = false;
    let selectStartX = 0, selectStartY = 0;
    let selectionBox = null;

    // 编辑器自动保存定时器
    let autoSaveTimer = null;
    let currentEditingFileId = null;

    // ---------- UI元素 ----------
    const fileEditor = document.getElementById('fileEditor');
    const editorTitle = document.getElementById('editorTitle');
    const editorContent = document.getElementById('editorContent');
    const btnSave = document.getElementById('btnSave');
    const btnCancel = document.getElementById('btnCancel');

    const propertiesModal = document.getElementById('propertiesModal');
    const propName = document.getElementById('propName');
    const propType = document.getElementById('propType');
    const propSize = document.getElementById('propSize');
    const propPath = document.getElementById('propPath');

    const recycleModal = document.getElementById('recycleModal');
    const recycleList = document.getElementById('recycleList');

    const settingsModal = document.getElementById('settingsModal');
    const darkModeCheckbox = document.getElementById('darkModeCheckbox');
    const iconSizeSelect = document.getElementById('iconSizeSelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const gridGapSelect = document.getElementById('gridGapSelect');
    const showExtensionCheckbox = document.getElementById('showExtensionCheckbox');
    const confirmDeleteCheckbox = document.getElementById('confirmDeleteCheckbox');
    const confirmMoveCheckbox = document.getElementById('confirmMoveCheckbox');
    const disableAllConfirmCheckbox = document.getElementById('disableAllConfirmCheckbox');
    const autoSaveEnableCheckbox = document.getElementById('autoSaveEnableCheckbox');
    const autoSaveIntervalSelect = document.getElementById('autoSaveIntervalSelect');
    const customIntervalDiv = document.getElementById('customIntervalDiv');
    const customIntervalInput = document.getElementById('customIntervalInput');
    const retentionSelect = document.getElementById('retentionSelect');
    const customRetentionDiv = document.getElementById('customRetentionDiv');
    const customRetentionInput = document.getElementById('customRetentionInput');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');

    const importFileInput = document.getElementById('importFileInput');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const orderBtn = document.getElementById('orderBtn');
    const recycleMenu = document.getElementById('recycleMenu');

    // ---------- 全局状态 ----------
    let settings = {
        darkMode: false,
        iconSize: 'standard',
        fontSize: 'standard',
        gridGap: 'standard',
        showExtension: true,
        confirmDelete: true,
        confirmMove: true,
        disableAllConfirm: false,
        autoSaveEnable: false,
        autoSaveInterval: 30,
        retentionDays: 30
    };

    // ---------- 辅助函数 ----------
    function getByteLen(str) {
        if (!str) return 0;
        let len = 0;
        for (let i = 0; i < str.length; i++) len += str.charCodeAt(i) > 127 ? 2 : 1;
        return len;
    }

    function calculateFolderSize(folderId) {
        let total = 20;
        files.filter(f => f.parentId === folderId).forEach(child => {
            if (child.type === 'text') total += 10 + getByteLen(child.content || '');
            else if (child.type === 'folder') total += calculateFolderSize(child.id);
        });
        return total;
    }

    function saveAll() {
        localStorage.setItem('ws_manager_files', JSON.stringify(files));
        localStorage.setItem('ws_manager_trash', JSON.stringify(trash));
    }

    function initDefaultFiles() {
        files = [
            { id:1, name:'欢迎.txt', type:'text', content:'欢迎使用 WS 管理器！双击我进行编辑。', parentId:0, size:10, modified: Date.now() },
            { id:2, name:'项目资料', type:'folder', parentId:0, size:20, modified: Date.now() }
        ];
        const w = files.find(f=>f.id===1); if(w) w.size = 10 + getByteLen(w.content);
        nextId = 3; saveAll();
    }

    function loadAllFiles() {
        const storedFiles = localStorage.getItem('ws_manager_files');
        const storedTrash = localStorage.getItem('ws_manager_trash');
        if (storedFiles) {
            try { files = JSON.parse(storedFiles); nextId = Math.max(...files.map(f=>f.id), 0) + 1; }
            catch { initDefaultFiles(); }
        } else initDefaultFiles();
        if (storedTrash) {
            try { trash = JSON.parse(storedTrash); } catch { trash = []; }
        } else trash = [];
        let needSave = false;
        trash.forEach(item => {
            if (!item.deletedAt) {
                item.deletedAt = Date.now();
                needSave = true;
            }
        });
        if (needSave) saveAll();
        cleanTrashByRetention();
        renderDesktop();
        updateBreadcrumbs();
    }

    // ---------- 设置管理 ----------
    function validateAndFixInterval(value) {
        let num = parseInt(value);
        if (isNaN(num)) return 30;
        if (num > 120) { alert("自动保存间隔不能大于120秒"); return 120; }
        if (num <= 0) { alert("自动保存间隔不能小于或等于0秒"); return 1; }
        return num;
    }

    function validateAndFixRetention(value) {
        let num = parseInt(value);
        if (isNaN(num)) return 30;
        if (num > 180) { alert("回收站保留天数不能大于180天"); return 180; }
        if (num <= 0) { alert("回收站保留天数不能小于或等于0天"); return 1; }
        return num;
    }

    function loadSettings() {
        const stored = localStorage.getItem('ws_manager_settings');
        if (stored) {
            try {
                const s = JSON.parse(stored);
                if (s.autoSaveInterval !== undefined) s.autoSaveInterval = validateAndFixInterval(s.autoSaveInterval);
                if (s.retentionDays !== undefined && s.retentionDays !== -1) s.retentionDays = validateAndFixRetention(s.retentionDays);
                Object.assign(settings, s);
            } catch(e) {}
        }
        applySettingsToUI();
        applySettingsToDOM();
    }

    function saveSettings() {
        localStorage.setItem('ws_manager_settings', JSON.stringify(settings));
    }

    function applySettingsToUI() {
        darkModeCheckbox.checked = settings.darkMode;
        iconSizeSelect.value = settings.iconSize;
        fontSizeSelect.value = settings.fontSize;
        gridGapSelect.value = settings.gridGap;
        showExtensionCheckbox.checked = settings.showExtension;
        confirmDeleteCheckbox.checked = settings.confirmDelete;
        confirmMoveCheckbox.checked = settings.confirmMove;
        disableAllConfirmCheckbox.checked = settings.disableAllConfirm;
        autoSaveEnableCheckbox.checked = settings.autoSaveEnable;
        if (settings.autoSaveInterval === 10 || settings.autoSaveInterval === 20 || settings.autoSaveInterval === 30) {
            autoSaveIntervalSelect.value = settings.autoSaveInterval.toString();
        } else {
            autoSaveIntervalSelect.value = 'custom';
            customIntervalInput.value = settings.autoSaveInterval;
        }
        autoSaveIntervalSelect.disabled = !settings.autoSaveEnable;
        customIntervalDiv.style.display = (autoSaveIntervalSelect.value === 'custom' && settings.autoSaveEnable) ? 'flex' : 'none';
        
        if (settings.retentionDays === -1) {
            retentionSelect.value = 'never';
        } else if (settings.retentionDays === 7 || settings.retentionDays === 30) {
            retentionSelect.value = settings.retentionDays.toString();
        } else {
            retentionSelect.value = 'custom';
            customRetentionInput.value = settings.retentionDays;
        }
        customRetentionDiv.style.display = (retentionSelect.value === 'custom') ? 'flex' : 'none';
    }

    function applySettingsToDOM() {
        if (settings.darkMode) document.body.classList.add('dark');
        else document.body.classList.remove('dark');
        const items = document.querySelectorAll('.file-item');
        items.forEach(item => {
            item.classList.remove('icon-small', 'icon-standard', 'icon-large');
            item.classList.add(`icon-${settings.iconSize}`);
        });
        const names = document.querySelectorAll('.file-name');
        names.forEach(name => {
            name.classList.remove('font-small', 'font-standard', 'font-large');
            name.classList.add(`font-${settings.fontSize}`);
        });
        desktop.classList.remove('grid-compact', 'grid-standard', 'grid-loose');
        desktop.classList.add(`grid-${settings.gridGap}`);
    }

    function resetSettings() {
        settings = {
            darkMode: false,
            iconSize: 'standard',
            fontSize: 'standard',
            gridGap: 'standard',
            showExtension: true,
            confirmDelete: true,
            confirmMove: true,
            disableAllConfirm: false,
            autoSaveEnable: false,
            autoSaveInterval: 30,
            retentionDays: 30
        };
        saveSettings();
        applySettingsToUI();
        applySettingsToDOM();
        renderDesktop();
        initAutoSaveTimer();
        cleanTrashByRetention();
    }

    function bindSettingsEvents() {
        darkModeCheckbox.addEventListener('change', () => {
            settings.darkMode = darkModeCheckbox.checked;
            saveSettings();
            applySettingsToDOM();
        });
        iconSizeSelect.addEventListener('change', () => {
            settings.iconSize = iconSizeSelect.value;
            saveSettings();
            applySettingsToDOM();
        });
        fontSizeSelect.addEventListener('change', () => {
            settings.fontSize = fontSizeSelect.value;
            saveSettings();
            applySettingsToDOM();
        });
        gridGapSelect.addEventListener('change', () => {
            settings.gridGap = gridGapSelect.value;
            saveSettings();
            applySettingsToDOM();
        });
        showExtensionCheckbox.addEventListener('change', () => {
            settings.showExtension = showExtensionCheckbox.checked;
            saveSettings();
            renderDesktop();
        });
        confirmDeleteCheckbox.addEventListener('change', () => {
            settings.confirmDelete = confirmDeleteCheckbox.checked;
            saveSettings();
        });
        confirmMoveCheckbox.addEventListener('change', () => {
            settings.confirmMove = confirmMoveCheckbox.checked;
            saveSettings();
        });
        disableAllConfirmCheckbox.addEventListener('change', () => {
            settings.disableAllConfirm = disableAllConfirmCheckbox.checked;
            saveSettings();
        });
        autoSaveEnableCheckbox.addEventListener('change', () => {
            settings.autoSaveEnable = autoSaveEnableCheckbox.checked;
            saveSettings();
            autoSaveIntervalSelect.disabled = !settings.autoSaveEnable;
            initAutoSaveTimer();
        });
        autoSaveIntervalSelect.addEventListener('change', () => {
            let val = autoSaveIntervalSelect.value;
            if (val === 'custom') {
                customIntervalDiv.style.display = 'flex';
                let custom = parseInt(customIntervalInput.value);
                if (isNaN(custom)) custom = 30;
                custom = validateAndFixInterval(custom);
                customIntervalInput.value = custom;
                settings.autoSaveInterval = custom;
            } else {
                customIntervalDiv.style.display = 'none';
                settings.autoSaveInterval = parseInt(val);
            }
            saveSettings();
            initAutoSaveTimer();
        });
        customIntervalInput.addEventListener('change', () => {
            let custom = parseInt(customIntervalInput.value);
            custom = validateAndFixInterval(custom);
            customIntervalInput.value = custom;
            settings.autoSaveInterval = custom;
            saveSettings();
            initAutoSaveTimer();
        });
        retentionSelect.addEventListener('change', () => {
            let val = retentionSelect.value;
            if (val === 'never') {
                settings.retentionDays = -1;
                customRetentionDiv.style.display = 'none';
            } else if (val === 'custom') {
                customRetentionDiv.style.display = 'flex';
                let custom = parseInt(customRetentionInput.value);
                if (isNaN(custom)) custom = 30;
                custom = validateAndFixRetention(custom);
                customRetentionInput.value = custom;
                settings.retentionDays = custom;
            } else {
                customRetentionDiv.style.display = 'none';
                settings.retentionDays = parseInt(val);
            }
            saveSettings();
            cleanTrashByRetention();
        });
        customRetentionInput.addEventListener('change', () => {
            let custom = parseInt(customRetentionInput.value);
            custom = validateAndFixRetention(custom);
            customRetentionInput.value = custom;
            settings.retentionDays = custom;
            saveSettings();
            cleanTrashByRetention();
        });
        resetSettingsBtn.addEventListener('click', () => {
            if (confirm('重置所有设置到默认值？')) resetSettings();
        });
    }

    // 回收站清理
    function cleanTrashByRetention() {
        if (settings.retentionDays === -1) return;
        const now = Date.now();
        const limit = settings.retentionDays * 24 * 60 * 60 * 1000;
        const newTrash = trash.filter(item => {
            if (!item.deletedAt) return true;
            return (now - item.deletedAt) < limit;
        });
        if (newTrash.length !== trash.length) {
            trash = newTrash;
            saveAll();
            if (!recycleModal.classList.contains('hidden')) renderRecycleBin();
            renderDesktop();
        }
    }

    // ---------- 图标绘制 ----------
    function drawTextIcon() {
        const c = document.createElement('canvas'); c.width = 48; c.height = 48;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(8,4,32,40);
        ctx.fillStyle = '#e0e0e0'; ctx.beginPath();
        ctx.moveTo(32,4); ctx.lineTo(40,4); ctx.lineTo(40,12); ctx.lineTo(32,12); ctx.fill();
        ctx.strokeStyle = '#6b7a8a'; ctx.lineWidth = 1.5; ctx.strokeRect(8,4,32,40);
        ctx.strokeStyle = '#4a5a6a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14,16); ctx.lineTo(34,16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14,22); ctx.lineTo(34,22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14,28); ctx.lineTo(28,28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14,34); ctx.lineTo(34,34); ctx.stroke();
        return c.toDataURL();
    }
    function drawFolderIcon() {
        const c = document.createElement('canvas'); c.width = 48; c.height = 48;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#FFD580'; ctx.fillRect(4,12,40,32);
        ctx.fillStyle = '#CCAA66'; ctx.beginPath();
        ctx.moveTo(4,12); ctx.lineTo(16,4); ctx.lineTo(44,4); ctx.lineTo(44,12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#886600'; ctx.lineWidth = 1.5; ctx.strokeRect(4,12,40,32);
        ctx.beginPath(); ctx.moveTo(4,12); ctx.lineTo(16,4); ctx.lineTo(44,4); ctx.lineTo(44,12); ctx.stroke();
        return c.toDataURL();
    }

    const textIcon = drawTextIcon(), folderIcon = drawFolderIcon();

    // ---------- 文件操作 ----------
    function createNewTextFile(parentId) {
        let base = '新建文本文档', name = base, cnt = 1;
        while(files.some(f=>f.parentId===parentId && f.name===name+'.txt')) name = `${base} (${cnt++})`;
        files.push({ id: nextId++, name: name+'.txt', type:'text', content:'', parentId, size:10, modified: Date.now() });
        saveAll(); renderDesktop();
    }

    function createNewFolder(parentId) {
        let base = '新建文件夹', name = base, cnt = 1;
        while(files.some(f=>f.parentId===parentId && f.name===name)) name = `${base} (${cnt++})`;
        files.push({ id: nextId++, name, type:'folder', parentId, size:20, modified: Date.now() });
        saveAll(); renderDesktop();
    }

    // ---------- UI 渲染 ----------
    function getDisplayName(file) {
        if (file.type === 'text' && !settings.showExtension && file.name.endsWith('.txt')) {
            return file.name.slice(0, -4);
        }
        return file.name;
    }

    function createFileItemElement(file) {
        const item = document.createElement('div'); item.className = 'file-item';
        item.dataset.id = file.id; item.dataset.type = file.type; item.draggable = true;
        const icon = document.createElement('img'); icon.className = 'file-icon';
        icon.src = file.type==='folder' ? folderIcon : textIcon; icon.draggable = false;
        const name = document.createElement('div'); name.className = 'file-name'; name.textContent = getDisplayName(file);
        item.appendChild(icon); item.appendChild(name);
        item.addEventListener('click', (e) => {
            e.stopPropagation(); clearSelection();
            item.classList.add('selected'); selectedFileItem = item; selectedFileIds = [file.id];
        });
        item.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if(file.type==='folder') goToFolder(file.id); else openFileEditor(file);
        });
        return item;
    }

    function createRecycleBinElement() {
        const item = document.createElement('div'); item.className = 'file-item recycle-bin';
        item.dataset.id = 'recycle'; item.dataset.type = 'recycle';
        item.draggable = false;
        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-icon';
        iconDiv.style.display = 'flex';
        iconDiv.style.alignItems = 'center';
        iconDiv.style.justifyContent = 'center';
        iconDiv.style.fontSize = '40px';
        iconDiv.style.lineHeight = '48px';
        iconDiv.textContent = '🗑️';
        const name = document.createElement('div'); name.className = 'file-name'; name.textContent = '回收站';
        item.appendChild(iconDiv); item.appendChild(name);
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            renderRecycleBin();
            recycleModal.classList.remove('hidden');
            let ov = document.getElementById('editorOverlay');
            if(!ov){ ov = document.createElement('div'); ov.id = 'editorOverlay'; ov.className = 'editor-overlay'; document.body.appendChild(ov); }
            ov.classList.remove('hidden');
        });
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault(); e.stopPropagation();
            showMenu(recycleMenu, e.clientX, e.clientY);
        });
        return item;
    }

    function createSettingsElement() {
        const item = document.createElement('div'); item.className = 'file-item settings-bin';
        item.dataset.id = 'settings'; item.dataset.type = 'settings';
        item.draggable = false;
        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-icon';
        iconDiv.style.display = 'flex';
        iconDiv.style.alignItems = 'center';
        iconDiv.style.justifyContent = 'center';
        iconDiv.style.fontSize = '40px';
        iconDiv.style.lineHeight = '48px';
        iconDiv.textContent = '⚙️';
        const name = document.createElement('div'); name.className = 'file-name'; name.textContent = '设置';
        item.appendChild(iconDiv); item.appendChild(name);
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            applySettingsToUI();
            settingsModal.classList.remove('hidden');
            let ov = document.getElementById('editorOverlay');
            if(!ov){ ov = document.createElement('div'); ov.id = 'editorOverlay'; ov.className = 'editor-overlay'; document.body.appendChild(ov); }
            ov.classList.remove('hidden');
        });
        item.addEventListener('contextmenu', (e) => { e.preventDefault(); });
        return item;
    }

    function createStoreElement() {
        const item = document.createElement('div'); item.className = 'file-item store-bin';
        item.dataset.id = 'store'; item.dataset.type = 'store';
        item.draggable = false;
        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-icon';
        iconDiv.style.display = 'flex';
        iconDiv.style.alignItems = 'center';
        iconDiv.style.justifyContent = 'center';
        iconDiv.style.fontSize = '40px';
        iconDiv.style.lineHeight = '48px';
        iconDiv.textContent = '🛒';
        const name = document.createElement('div'); name.className = 'file-name'; name.textContent = '应用商店';
        item.appendChild(iconDiv); item.appendChild(name);
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.WSStore && typeof window.WSStore.openStore === 'function') {
                window.WSStore.openStore();
            } else {
                alert('应用商店模块未加载');
            }
        });
        item.addEventListener('contextmenu', (e) => { e.preventDefault(); });
        return item;
    }

    function createCmdElement() {
        const item = document.createElement('div'); item.className = 'file-item cmd-bin';
        item.dataset.id = 'cmd'; item.dataset.type = 'cmd';
        item.draggable = false;
        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-icon';
        iconDiv.style.display = 'flex';
        iconDiv.style.alignItems = 'center';
        iconDiv.style.justifyContent = 'center';
        iconDiv.style.fontSize = '40px';
        iconDiv.style.lineHeight = '48px';
        iconDiv.textContent = '📟';
        const name = document.createElement('div'); name.className = 'file-name'; name.textContent = '命令提示符';
        item.appendChild(iconDiv); item.appendChild(name);
        item.addEventListener('click', () => {
            if (window.WSStore && typeof window.WSStore.openCmdModal === 'function') {
                window.WSStore.openCmdModal();
            } else {
                alert('命令提示符模块未加载');
            }
        });
        item.addEventListener('contextmenu', (e) => e.preventDefault());
        return item;
    }

    function createComputerElement() {
        const item = document.createElement('div'); item.className = 'file-item computer-bin';
        item.dataset.id = 'computer'; item.dataset.type = 'computer';
        item.draggable = false;
        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-icon';
        iconDiv.style.display = 'flex';
        iconDiv.style.alignItems = 'center';
        iconDiv.style.justifyContent = 'center';
        iconDiv.style.fontSize = '40px';
        iconDiv.style.lineHeight = '48px';
        iconDiv.textContent = '💻';
        const name = document.createElement('div'); name.className = 'file-name'; name.textContent = '我的电脑';
        item.appendChild(iconDiv); item.appendChild(name);
        item.addEventListener('click', () => {
            if (window.WSStore && typeof window.WSStore.openComputerModal === 'function') {
                window.WSStore.openComputerModal();
            } else {
                alert('我的电脑模块未加载');
            }
        });
        item.addEventListener('contextmenu', (e) => e.preventDefault());
        return item;
    }

    function renderDesktop() {
        const nav = desktop.querySelector('.breadcrumbs');
        desktop.innerHTML = '';
        if(nav) desktop.appendChild(nav);
        const list = getFilteredAndSortedFiles();
        if (currentFolderId === 0) {
            const recycleItem = createRecycleBinElement();
            desktop.appendChild(recycleItem);
            const settingsItem = createSettingsElement();
            desktop.appendChild(settingsItem);
            const storeItem = createStoreElement();
            desktop.appendChild(storeItem);
            const cmdItem = createCmdElement();
            desktop.appendChild(cmdItem);
            const computerItem = createComputerElement();
            desktop.appendChild(computerItem);
            // 应用商店快捷方式由 store.js 负责
            if (window.WSStore && window.WSStore.refreshAppShortcuts) {
                window.WSStore.refreshAppShortcuts(desktop);
            }
        }
        list.forEach(file => {
            const item = createFileItemElement(file);
            desktop.appendChild(item);
        });
        applySettingsToDOM();
    }

    function getFilteredAndSortedFiles() {
        let list = files.filter(f => f.parentId === currentFolderId);
        if (searchKeyword.trim()) {
            const kw = searchKeyword.trim().toLowerCase();
            list = list.filter(f => f.name.toLowerCase().includes(kw));
        }
        list.sort((a, b) => {
            let valA, valB;
            if (sortBy === 'name') {
                valA = a.name.toLowerCase(); valB = b.name.toLowerCase();
                return sortOrder * valA.localeCompare(valB);
            } else if (sortBy === 'type') {
                valA = a.type; valB = b.type;
                return sortOrder * valA.localeCompare(valB);
            } else if (sortBy === 'size') {
                valA = a.type==='folder' ? calculateFolderSize(a.id) : (10 + getByteLen(a.content||''));
                valB = b.type==='folder' ? calculateFolderSize(b.id) : (10 + getByteLen(b.content||''));
                return sortOrder * (valA - valB);
            } else {
                valA = a.modified || 0; valB = b.modified || 0;
                return sortOrder * (valA - valB);
            }
        });
        return list;
    }

    function updateBreadcrumbs() {
        const old = desktop.querySelector('.breadcrumbs'); if(old) old.remove();
        const nav = document.createElement('div'); nav.className = 'breadcrumbs';
        const home = document.createElement('div'); home.className = 'crumb-item'; home.textContent = '🖥️ 桌面';
        home.onclick = ()=>goToFolder(0); nav.appendChild(home);
        if(currentFolderId !== 0) {
            const sep = document.createElement('span'); sep.className = 'crumb-separator'; sep.textContent = '›'; nav.appendChild(sep);
            const folder = files.find(f=>f.id===currentFolderId);
            if(folder) {
                const fld = document.createElement('div'); fld.className = 'crumb-item'; fld.textContent = folder.name;
                fld.onclick = ()=>goToFolder(folder.id); nav.appendChild(fld);
            }
        }
        desktop.insertBefore(nav, desktop.firstChild);
    }

    function goToFolder(id) { currentFolderId = id; renderDesktop(); updateBreadcrumbs(); clearSelection(); }

    function renderRecycleBin() {
        recycleList.innerHTML = '';
        if (trash.length === 0) {
            recycleList.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">回收站为空</div>';
            return;
        }
        trash.forEach((item, index) => {
            const div = document.createElement('div'); div.className = 'recycle-item';
            div.innerHTML = `<span>📄 ${item.name} (${item.type})</span>
                <div class="recycle-actions">
                    <button class="restore-btn" data-index="${index}">恢复</button>
                    <button class="delete-btn" data-index="${index}">彻底删除</button>
                </div>`;
            recycleList.appendChild(div);
        });
        document.querySelectorAll('.restore-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const idx = e.target.dataset.index; const restored = trash.splice(idx, 1)[0];
            delete restored.deletedAt;
            restored.parentId = currentFolderId;
            restored.id = nextId++;
            files.push(restored); saveAll(); renderDesktop(); renderRecycleBin();
        }));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const idx = e.target.dataset.index; trash.splice(idx, 1); saveAll(); renderRecycleBin();
        }));
    }

    // ---------- 编辑器 ----------
    function initAutoSaveTimer() {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        if (settings.autoSaveEnable && currentEditingFileId !== null) {
            let interval = settings.autoSaveInterval * 1000;
            if (interval > 0) {
                autoSaveTimer = setInterval(() => {
                    if (currentEditingFileId && fileEditor && !fileEditor.classList.contains('hidden')) {
                        saveCurrentFileSilently();
                    }
                }, interval);
            }
        }
    }

    function saveCurrentFileSilently() {
        if (!currentEditingFileId) return;
        const file = files.find(f => f.id === currentEditingFileId);
        if (file) {
            file.content = editorContent.value;
            file.size = 10 + getByteLen(file.content);
            file.modified = Date.now();
            saveAll();
        }
    }

    function openFileEditor(file) {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        currentEditingFileId = file.id; editorTitle.textContent = file.name;
        editorContent.value = file.content || ''; fileEditor.classList.remove('hidden');
        let ov = document.getElementById('editorOverlay');
        if(!ov) { ov = document.createElement('div'); ov.id = 'editorOverlay'; ov.className = 'editor-overlay'; document.body.appendChild(ov); }
        ov.classList.remove('hidden'); setTimeout(()=>editorContent.focus(), 100);
        initAutoSaveTimer();
    }

    function closeFileEditor() {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        fileEditor.classList.add('hidden');
        document.getElementById('editorOverlay')?.classList.add('hidden');
        currentEditingFileId = null;
    }

    function saveCurrentFile() {
        if(!currentEditingFileId) return; const file = files.find(f=>f.id===currentEditingFileId);
        if(file) { file.content = editorContent.value; file.size = 10 + getByteLen(file.content); file.modified = Date.now(); saveAll(); closeFileEditor(); alert('保存成功！'); }
    }

    btnSave.addEventListener('click', saveCurrentFile);
    btnCancel.addEventListener('click', closeFileEditor);

    // ---------- 右键菜单 ----------
    const desktopMenu = document.getElementById('desktopMenu'), fileMenu = document.getElementById('fileMenu'), multiMenu = document.getElementById('multiFileMenu');
    function hideMenus() { [desktopMenu, fileMenu, multiMenu, recycleMenu].forEach(m => { m.classList.add('hidden'); m.style.display = 'none'; }); }
    function showMenu(menu, x, y) {
        hideMenus(); menu.style.left = x + 'px'; menu.style.top = y + 'px'; menu.style.display = 'block'; menu.classList.remove('hidden');
        const r = menu.getBoundingClientRect();
        if(r.right > innerWidth) menu.style.left = (innerWidth - r.width - 5) + 'px';
        if(r.bottom > innerHeight) menu.style.top = (innerHeight - r.height - 5) + 'px';
    }

    function clearSelection() {
        selectedFileIds = [];
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected', 'multi-selected'));
        selectedFileItem = null;
    }

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const item = e.target.closest('.file-item');
        if (!item) { clearSelection(); showMenu(desktopMenu, e.clientX, e.clientY); return; }
        if (item.classList.contains('recycle-bin')) {
            showMenu(recycleMenu, e.clientX, e.clientY); return;
        }
        if (item.classList.contains('settings-bin') || item.classList.contains('store-bin') || item.classList.contains('app-shortcut') || item.classList.contains('cmd-bin') || item.classList.contains('computer-bin')) { return; }
        if(selectedFileIds.length > 1 && item) {
            if(selectedFileIds.includes(parseInt(item.dataset.id))) {
                document.getElementById('multiCount').textContent = selectedFileIds.length;
                showMenu(multiMenu, e.clientX, e.clientY); return;
            }
        }
        if(!item.classList.contains('selected')) { clearSelection(); item.classList.add('selected'); selectedFileItem = item; selectedFileIds = [parseInt(item.dataset.id)]; }
        showMenu(fileMenu, e.clientX, e.clientY);
    });

    document.addEventListener('click', (e) => { if(!e.target.closest('.ctx-menu')) hideMenus(); });
    desktop.addEventListener('dblclick', (e) => { if(e.target === desktop && currentFolderId!==0) { const f = files.find(f=>f.id===currentFolderId); if(f) goToFolder(f.parentId); } });

    // ---------- 菜单事件 ----------
    document.getElementById('menuNew').addEventListener('click', (e) => { e.stopPropagation(); createNewTextFile(currentFolderId); hideMenus(); });
    document.getElementById('menuNewFolder').addEventListener('click', (e) => { e.stopPropagation(); createNewFolder(currentFolderId); hideMenus(); });
    document.getElementById('menuDelete').addEventListener('click', (e) => {
        e.stopPropagation(); if(!selectedFileItem) return; const id = parseInt(selectedFileItem.dataset.id);
        const file = files.find(f=>f.id===id); if(!file) return;
        let doDelete = true;
        if (!settings.disableAllConfirm && settings.confirmDelete) {
            doDelete = confirm(`确定将 "${file.name}" 移入回收站吗？`);
        }
        if (doDelete) {
            file.deletedAt = Date.now();
            trash.push(file);
            files = files.filter(f=>f.id!==id);
            saveAll(); renderDesktop(); clearSelection();
        }
        hideMenus();
    });
    document.getElementById('menuRename').addEventListener('click', (e) => {
        e.stopPropagation(); if(!selectedFileItem) return;
        const span = selectedFileItem.querySelector('.file-name'); const id = parseInt(selectedFileItem.dataset.id); const file = files.find(f=>f.id===id);
        if(!file) return;
        span.contentEditable = true; span.focus(); document.execCommand('selectAll');
        const finish = () => {
            span.contentEditable = false; let n = span.textContent.trim();
            if(n===''||n===getDisplayName(file)) { span.textContent = getDisplayName(file); return; }
            if (file.type==='text' && !settings.showExtension && !n.endsWith('.txt')) n += '.txt';
            else if (file.type==='text' && settings.showExtension && !n.endsWith('.txt')) n += '.txt';
            if(files.some(f=>f.id!==id&&f.parentId===file.parentId&&f.name===n)) { alert('已存在同名文件'); span.textContent = getDisplayName(file); return; }
            file.name = n; file.modified = Date.now(); saveAll(); renderDesktop(); updateBreadcrumbs();
        };
        span.addEventListener('blur', finish, {once:true});
        span.addEventListener('keydown', ev => { if(ev.key==='Enter'){ ev.preventDefault(); span.blur(); } if(ev.key==='Escape'){ span.textContent = getDisplayName(file); span.blur(); } });
        hideMenus();
    });
    document.getElementById('menuProperties').addEventListener('click', (e) => {
        e.stopPropagation(); if(!selectedFileItem) return; const id = parseInt(selectedFileItem.dataset.id); const file = files.find(f=>f.id===id);
        if(!file) return; propName.textContent = file.name; propType.textContent = file.type==='folder'?'文件夹':'文本文档';
        let sz = file.type==='folder'? calculateFolderSize(file.id) : 10 + getByteLen(file.content||'');
        propSize.textContent = `${sz} 字节 (${sz} B)`; propPath.textContent = file.parentId===0?'桌面':'子文件夹内';
        propertiesModal.classList.remove('hidden'); let ov = document.getElementById('editorOverlay');
        if(!ov){ ov = document.createElement('div'); ov.id = 'editorOverlay'; ov.className = 'editor-overlay'; document.body.appendChild(ov); }
        ov.classList.remove('hidden'); hideMenus();
    });
    function doExport(data) {
        const header = EXPORT_HEADER + '\n';
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([header + json], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = `WS备份_${Date.now()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    document.getElementById('menuExport').addEventListener('click', (e) => {
        e.stopPropagation(); const data = files.filter(f => selectedFileIds.includes(f.id));
        if(!data.length) { alert("没有选中文件！"); return; } doExport(data); hideMenus();
    });
    document.getElementById('multiDelete').addEventListener('click', () => {
        if(!selectedFileIds.length) return;
        let doDelete = true;
        if (!settings.disableAllConfirm && settings.confirmDelete) {
            doDelete = confirm(`确定将选中的 ${selectedFileIds.length} 个项目移入回收站吗？`);
        }
        if (doDelete) {
            const toTrash = files.filter(f => selectedFileIds.includes(f.id));
            toTrash.forEach(f => { f.deletedAt = Date.now(); });
            trash.push(...toTrash);
            files = files.filter(f => !selectedFileIds.includes(f.id));
            saveAll(); renderDesktop(); clearSelection();
        }
        hideMenus();
    });
    document.getElementById('multiProperties').addEventListener('click', () => {
        let total = 0, cnt = selectedFileIds.length;
        selectedFileIds.forEach(id => { const f = files.find(x=>x.id===id); if(f) total += f.type==='folder'? calculateFolderSize(f.id) : 10 + getByteLen(f.content||''); });
        propName.textContent = '选中项'; propType.textContent = `${cnt} 个项目`; propSize.textContent = `${total} 字节 (${total} B)`; propPath.textContent = '多个位置';
        propertiesModal.classList.remove('hidden'); let ov = document.getElementById('editorOverlay');
        if(!ov){ ov = document.createElement('div'); ov.id = 'editorOverlay'; ov.className = 'editor-overlay'; document.body.appendChild(ov); }
        ov.classList.remove('hidden'); hideMenus();
    });
    document.getElementById('multiExport').addEventListener('click', () => {
        const data = files.filter(f => selectedFileIds.includes(f.id));
        if(!data.length) { alert("没有选中任何文件！"); return; } doExport(data); hideMenus();
    });
    document.getElementById('menuImport').addEventListener('click', (e) => { e.stopPropagation(); importFileInput.click(); hideMenus(); });
    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target.result;
            if (!content.startsWith(EXPORT_HEADER)) { alert('请检查此文件是否被赋予BS·WS管理器权限'); importFileInput.value = ''; return; }
            const lines = content.split('\n'); lines.shift();
            try {
                const imported = JSON.parse(lines.join('\n'));
                if (!Array.isArray(imported)) throw new Error();
                imported.forEach(f => { f.id = nextId++; f.parentId = currentFolderId; f.modified = Date.now(); });
                files.push(...imported); saveAll(); renderDesktop(); alert(`成功导入 ${imported.length} 个项目`);
            } catch { alert('文件格式错误'); }
            importFileInput.value = '';
        };
        reader.readAsText(file);
    });

    // ---------- 关闭模态框 ----------
    function closeSettings() { settingsModal.classList.add('hidden'); document.getElementById('editorOverlay')?.classList.add('hidden'); }
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('closeSettingsOkBtn').addEventListener('click', closeSettings);
    document.getElementById('closeRecycleBtn').addEventListener('click', () => { recycleModal.classList.add('hidden'); document.getElementById('editorOverlay')?.classList.add('hidden'); });
    document.getElementById('clearRecycleBtn').addEventListener('click', () => { if(trash.length && confirm('清空回收站将彻底删除所有文件，确定吗？')) { trash = []; saveAll(); renderRecycleBin(); renderDesktop(); } });
    document.getElementById('menuOpenRecycle').addEventListener('click', (e) => {
        e.stopPropagation(); renderRecycleBin(); recycleModal.classList.remove('hidden');
        let ov = document.getElementById('editorOverlay'); if(!ov){ ov = document.createElement('div'); ov.id = 'editorOverlay'; ov.className = 'editor-overlay'; document.body.appendChild(ov); }
        ov.classList.remove('hidden'); hideMenus();
    });
    function closeProp() { propertiesModal.classList.add('hidden'); document.getElementById('editorOverlay')?.classList.add('hidden'); }
    document.getElementById('closePropBtn').addEventListener('click', closeProp);
    document.getElementById('okPropBtn').addEventListener('click', closeProp);
    document.addEventListener('click', (e) => { if(e.target.id==='editorOverlay') { closeFileEditor(); closeProp(); recycleModal.classList.add('hidden'); closeSettings(); } });

    // ---------- 搜索排序 ----------
    searchInput.addEventListener('input', (e) => { searchKeyword = e.target.value; renderDesktop(); });
    sortSelect.addEventListener('change', (e) => { sortBy = e.target.value; renderDesktop(); });
    orderBtn.addEventListener('click', () => { sortOrder *= -1; orderBtn.textContent = sortOrder === 1 ? '⬆️' : '⬇️'; renderDesktop(); });

    // ---------- 拖拽 ----------
    let dragId = null;
    desktop.addEventListener('dragstart', (e) => {
        const it = e.target.closest('.file-item');
        if(it && !it.classList.contains('recycle-bin') && !it.classList.contains('settings-bin') && !it.classList.contains('store-bin') && !it.classList.contains('app-shortcut') && !it.classList.contains('cmd-bin') && !it.classList.contains('computer-bin')){
            dragId = parseInt(it.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(()=>it.style.opacity='0.4',0);
        }
    });
    desktop.addEventListener('dragend', () => { document.querySelectorAll('.file-item').forEach(el=>{ el.style.opacity='1'; el.style.background=''; }); });
    desktop.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const f = e.target.closest('.file-item'); if(f && f.dataset.type==='folder') f.style.background = 'rgba(255,255,0,0.2)'; });
    desktop.addEventListener('dragleave', (e) => { const f = e.target.closest('.file-item'); if(f) f.style.background = ''; });
    desktop.addEventListener('drop', (e) => {
        e.preventDefault(); const t = e.target.closest('.file-item');
        if(!t||!dragId||t.classList.contains('recycle-bin')||t.classList.contains('settings-bin')||t.classList.contains('store-bin')||t.classList.contains('app-shortcut')||t.classList.contains('cmd-bin')||t.classList.contains('computer-bin')) return;
        const tid = parseInt(t.dataset.id), tdata = files.find(f=>f.id===tid);
        if(tdata?.type==='folder') {
            const d = files.find(f=>f.id===dragId);
            if(d && d.id!==tid && !(d.type==='folder' && (d.id===tid || isDescendant(d.id,tid)))) {
                let allowMove = true;
                if (!settings.disableAllConfirm && settings.confirmMove) {
                    allowMove = confirm(`将 "${d.name}" 移动到 "${tdata.name}" 中？`);
                }
                if (allowMove) {
                    d.parentId = tid; saveAll(); renderDesktop(); alert(`移动成功！${d.name} 已放入 ${tdata.name}`);
                }
            } else alert('不能将文件夹移动到自身或其子文件夹中');
        }
        document.querySelectorAll('.file-item').forEach(el=>el.style.background = '');
    });
    function isDescendant(fid, tid) { let cur = fid; while(cur!==0) { if(cur===tid) return true; const p = files.find(f=>f.id===cur); if(!p) break; cur = p.parentId; } return false; }

    // ---------- 框选 ----------
    desktop.addEventListener('mousedown', (e) => {
        if(e.button !== 0 || e.target !== desktop) return;
        const rect = desktop.getBoundingClientRect();
        selectStartX = e.clientX - rect.left; selectStartY = e.clientY - rect.top;
        isSelecting = true;
        selectionBox = document.createElement('div'); selectionBox.className = 'selection-box';
        selectionBox.style.left = selectStartX + 'px'; selectionBox.style.top = selectStartY + 'px';
        desktop.appendChild(selectionBox);
        clearSelection();
    });
    document.addEventListener('mousemove', (e) => {
        if(!isSelecting || !selectionBox) return;
        const rect = desktop.getBoundingClientRect();
        const curX = e.clientX - rect.left, curY = e.clientY - rect.top;
        const left = Math.min(selectStartX, curX), top = Math.min(selectStartY, curY);
        selectionBox.style.left = left + 'px'; selectionBox.style.top = top + 'px';
        selectionBox.style.width = Math.abs(curX - selectStartX) + 'px';
        selectionBox.style.height = Math.abs(curY - selectStartY) + 'px';
        checkSelectionCollision();
    });
    document.addEventListener('mouseup', () => {
        if(!isSelecting) return; isSelecting = false;
        if(selectionBox) { selectionBox.remove(); selectionBox = null; }
        checkSelectionCollision();
    });
    function checkSelectionCollision() {
        if(!selectionBox) return;
        const desktopStyle = window.getComputedStyle(desktop);
        const padTop = parseInt(desktopStyle.paddingTop) || 0;
        const padLeft = parseInt(desktopStyle.paddingLeft) || 0;
        const boxRect = selectionBox.getBoundingClientRect();
        const desktopRect = desktop.getBoundingClientRect();
        const relBox = {
            left: boxRect.left - desktopRect.left - padLeft,
            top: boxRect.top - desktopRect.top - padTop,
            right: boxRect.right - desktopRect.left - padLeft,
            bottom: boxRect.bottom - desktopRect.top - padTop
        };
        document.querySelectorAll('.file-item:not(.recycle-bin):not(.settings-bin):not(.store-bin):not(.app-shortcut):not(.cmd-bin):not(.computer-bin)').forEach(item => {
            const rect = item.getBoundingClientRect();
            const relItem = {
                centerX: rect.left + rect.width/2 - desktopRect.left - padLeft,
                centerY: rect.top + rect.height/2 - desktopRect.top - padTop
            };
            const id = parseInt(item.dataset.id);
            if(relItem.centerX >= relBox.left && relItem.centerX <= relBox.right &&
               relItem.centerY >= relBox.top && relItem.centerY <= relBox.bottom) {
                item.classList.add('multi-selected');
                if(!selectedFileIds.includes(id)) selectedFileIds.push(id);
            } else {
                item.classList.remove('multi-selected');
                selectedFileIds = selectedFileIds.filter(sid => sid !== id);
            }
        });
    }

    // 启动
    loadSettings();
    bindSettingsEvents();
    loadAllFiles();
})();