// ========== 管理员模块（动态面板，仅管理员可用）==========

let adminPanelElement = null;
let isAdminPanelVisible = false;

// 辅助：转义HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// 创建管理面板 DOM
function createAdminPanel() {
    if (adminPanelElement) return adminPanelElement;
    const panel = document.createElement('div');
    panel.id = 'adminPanel';
    panel.className = 'admin-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
        <div class="admin-panel-content">
            <div class="admin-header">
                <h3>🛠️ 管理员面板</h3>
                <button id="closeAdminPanel">关闭</button>
            </div>
            <div id="userListContainer"></div>
            <div class="admin-actions">
                <button id="exportAccountsBtn">📤 导出账户库</button>
                <button id="importAccountsBtn">📥 导入账户库</button>
            </div>
        </div>
    `;
    document.body.appendChild(panel);
    adminPanelElement = panel;

    // 绑定关闭按钮
    const closeBtn = panel.querySelector('#closeAdminPanel');
    if (closeBtn) closeBtn.addEventListener('click', closeAdminPanel);

    // 导出按钮
    const exportBtn = panel.querySelector('#exportAccountsBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportAccounts);

    // 导入按钮（触发文件选择）
    const importBtn = panel.querySelector('#importAccountsBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('accountFileInput');
            if (fileInput) fileInput.click();
            else console.warn('找不到 accountFileInput 元素');
        });
    }

    // 账户文件导入事件（全局只绑定一次）
    const accountFileInput = document.getElementById('accountFileInput');
    if (accountFileInput && !accountFileInput._adminHandler) {
        accountFileInput._adminHandler = true;
        accountFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) importAccounts(file);
            accountFileInput.value = '';
        });
    }
    return panel;
}

// 渲染用户列表
function renderAdminPanel() {
    const container = document.getElementById('userListContainer');
    if (!container) return;
    const accounts = window.getAccounts();
    const ADMIN_USERNAME = window.ADMIN_USERNAME;
    const users = Object.keys(accounts).filter(u => u !== ADMIN_USERNAME);
    if (users.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">暂无其他注册用户</p>';
        return;
    }
    let html = '';
    users.forEach(user => {
        const userData = accounts[user];
        const canSave = userData.canSave;
        html += `
            <div class="user-item">
                <div class="user-info">
                    <label>👤 ${escapeHtml(user)}</label>
                    <input type="checkbox" data-username="${escapeHtml(user)}" ${canSave ? 'checked' : ''}> 允许存档
                </div>
                <button class="reset-pwd-btn" data-username="${escapeHtml(user)}">🔑 重置密码</button>
            </div>
        `;
    });
    container.innerHTML = html;

    // 绑定权限复选框
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const username = cb.dataset.username;
        cb.addEventListener('change', () => {
            const accounts = window.getAccounts();
            if (accounts[username]) {
                accounts[username].canSave = cb.checked;
                window.saveAccounts(accounts);
                if (window.currentUser === username) window.updateUIForCurrentUser();
            }
        });
    });
    // 绑定重置密码按钮
    container.querySelectorAll('.reset-pwd-btn').forEach(btn => {
        const username = btn.dataset.username;
        btn.addEventListener('click', () => resetUserPassword(username));
    });
}

// 重置密码
function resetUserPassword(username) {
    if (username === window.ADMIN_USERNAME) {
        alert('不能重置管理员密码');
        return;
    }
    const newPassword = prompt(`请输入用户 "${username}" 的新密码：`);
    if (!newPassword || newPassword.trim() === '') {
        alert('密码不能为空');
        return;
    }
    const confirmPassword = prompt('请再次输入新密码以确认：');
    if (newPassword !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
    }
    const accounts = window.getAccounts();
    if (accounts[username]) {
        accounts[username].password = window.encodePassword(newPassword);
        window.saveAccounts(accounts);
        alert(`用户 "${username}" 的密码已重置`);
    }
}

// 导出账户
function exportAccounts() {
    const accounts = window.getAccounts();
    const jsonStr = JSON.stringify(accounts, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ws_accounts_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const msgDiv = document.getElementById('message');
    if (msgDiv) {
        msgDiv.innerText = '✅ 账户数据库已导出';
        setTimeout(() => msgDiv.innerText = '', 2000);
    }
}

// 导入账户
function importAccounts(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!isValidAccountData(importedData)) {
                alert('导入失败：文件不是有效的账户数据库。');
                return;
            }
            const currentAccounts = window.getAccounts();
            const ADMIN_USERNAME = window.ADMIN_USERNAME;
            const ADMIN_PASSWORD = window.ADMIN_PASSWORD;
            if (!importedData[ADMIN_USERNAME]) {
                importedData[ADMIN_USERNAME] = {
                    password: window.encodePassword(ADMIN_PASSWORD),
                    canSave: true,
                    nickname: '管理员'
                };
            } else {
                importedData[ADMIN_USERNAME] = currentAccounts[ADMIN_USERNAME] || {
                    password: window.encodePassword(ADMIN_PASSWORD),
                    canSave: true,
                    nickname: '管理员'
                };
            }
            window.saveAccounts(importedData);
            if (adminPanelElement && adminPanelElement.style.display === 'block') {
                renderAdminPanel();
            }
            if (window.currentUser) window.updateUIForCurrentUser();
            const msgDiv = document.getElementById('message');
            if (msgDiv) {
                msgDiv.innerText = '✅ 账户数据库已导入';
                setTimeout(() => msgDiv.innerText = '', 2000);
            }
        } catch (err) {
            alert('导入失败：文件格式错误');
        }
    };
    reader.readAsText(file);
}

function isValidAccountData(data) {
    if (typeof data !== 'object' || data === null) return false;
    for (let username in data) {
        const user = data[username];
        if (!user || typeof user !== 'object' || typeof user.password !== 'string') return false;
    }
    return true;
}

// 打开面板（仅管理员）
function openAdminPanel() {
    if (!window.checkIsAdmin || !window.checkIsAdmin()) {
        console.log('非管理员，无法打开面板');
        return;
    }
    const panel = createAdminPanel();
    renderAdminPanel();
    panel.style.display = 'block';
    isAdminPanelVisible = true;
    console.log('管理员面板已打开');
}

function closeAdminPanel() {
    if (adminPanelElement) {
        adminPanelElement.style.display = 'none';
        isAdminPanelVisible = false;
        console.log('管理员面板已关闭');
    }
}

// 切换用户时清理面板（非管理员彻底移除）
window.toggleAdminElements = function(isAdmin) {
    if (!isAdmin) {
        if (adminPanelElement) {
            adminPanelElement.remove();
            adminPanelElement = null;
            isAdminPanelVisible = false;
            console.log('非管理员，已移除管理面板');
        }
    }
};

// 监听反引号键（`）
document.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') {
        e.preventDefault(); // 阻止默认输入（可选）
        console.log('反引号键被按下');
        if (!window.checkIsAdmin || !window.checkIsAdmin()) {
            console.log('当前用户不是管理员，忽略');
            return;
        }
        if (adminPanelElement && adminPanelElement.style.display === 'block') {
            closeAdminPanel();
        } else {
            openAdminPanel();
        }
    }
}, true);

// 点击面板外部关闭
document.addEventListener('click', (e) => {
    if (adminPanelElement && adminPanelElement.style.display === 'block' && !adminPanelElement.contains(e.target)) {
        closeAdminPanel();
    }
});

// 确保所有依赖函数已就绪
console.log('[Admin] admin.js 加载完成');