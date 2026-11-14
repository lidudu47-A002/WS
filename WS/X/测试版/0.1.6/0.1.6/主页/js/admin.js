// 管理员面板模块（依赖 auth.js 中的 currentUser, getAccounts, saveAccounts, encodePassword, ADMIN_USERNAME）
const adminPanel = document.getElementById('adminPanel');
const userListContainer = document.getElementById('userListContainer');
const accountFileInput = document.getElementById('accountFileInput');

// 验证账户数据格式
function isValidAccountData(data) {
    if (typeof data !== 'object' || data === null) return false;
    for (let username in data) {
        const user = data[username];
        if (!user || typeof user !== 'object' || typeof user.password !== 'string') {
            return false;
        }
    }
    return true;
}

// 重置用户密码
function resetUserPassword(username) {
    if (username === ADMIN_USERNAME) {
        alert('不能重置管理员密码');
        return;
    }
    const newPassword = prompt(`请输入用户 "${username}" 的新密码：`);
    if (newPassword === null) return;
    if (newPassword.trim() === '') {
        alert('密码不能为空');
        return;
    }
    const confirmPassword = prompt('请再次输入新密码以确认：');
    if (confirmPassword === null) return;
    if (newPassword !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
    }
    
    const accounts = getAccounts();
    if (accounts[username]) {
        accounts[username].password = encodePassword(newPassword);
        saveAccounts(accounts);
        alert(`用户 "${username}" 的密码已重置`);
    } else {
        alert('用户不存在');
    }
}

// 渲染管理员面板用户列表
function renderAdminPanel() {
    const accounts = getAccounts();
    const users = Object.keys(accounts).filter(u => u !== ADMIN_USERNAME);
    if (users.length === 0) {
        userListContainer.innerHTML = '<p style="text-align:center; color:#888;">暂无其他注册用户</p>';
        return;
    }
    let html = '';
    users.forEach(user => {
        const userData = accounts[user];
        const canSave = userData.canSave;
        html += `
            <div class="user-item">
                <div class="user-info">
                    <label>👤 ${user}</label>
                    <input type="checkbox" data-username="${user}" ${canSave ? 'checked' : ''}> 允许存档
                </div>
                <button class="reset-pwd-btn" data-username="${user}">🔑 重置密码</button>
            </div>
        `;
    });
    userListContainer.innerHTML = html;
    
    // 绑定存档权限复选框
    document.querySelectorAll('.user-item input').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const username = cb.dataset.username;
            const accounts = getAccounts();
            if (accounts[username]) {
                accounts[username].canSave = cb.checked;
                saveAccounts(accounts);
                if (currentUser === username) {
                    updateUIForCurrentUser();  // 来自 auth.js
                }
            }
        });
    });
    
    // 绑定重置密码按钮
    document.querySelectorAll('.reset-pwd-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const username = btn.dataset.username;
            resetUserPassword(username);
        });
    });
}

function openAdminPanel() {
    if (currentUser !== ADMIN_USERNAME) return;
    renderAdminPanel();
    adminPanel.style.display = 'block';
}

// 快捷键 ` (反引号)
document.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') {
        e.preventDefault();
        if (currentUser === ADMIN_USERNAME) {
            if (adminPanel.style.display === 'block') {
                adminPanel.style.display = 'none';
            } else {
                openAdminPanel();
            }
        }
    }
}, true);

// 导出账户数据库
function exportAccounts() {
    const accounts = getAccounts();
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
    msgDiv.innerText = '✅ 账户数据库已导出';
    setTimeout(() => msgDiv.innerText = '', 2000);
}

// 导入账户数据库
function importAccounts(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!isValidAccountData(importedData)) {
                alert('导入失败：文件不是有效的账户数据库。\n请确保导入的是通过"导出账户库"功能生成的文件。');
                return;
            }
            const currentAccounts = getAccounts();
            if (!importedData[ADMIN_USERNAME]) {
                importedData[ADMIN_USERNAME] = {
                    password: encodePassword(ADMIN_PASSWORD),
                    canSave: true
                };
            } else {
                importedData[ADMIN_USERNAME] = currentAccounts[ADMIN_USERNAME] || {
                    password: encodePassword(ADMIN_PASSWORD),
                    canSave: true
                };
            }
            saveAccounts(importedData);
            if (adminPanel.style.display === 'block') {
                renderAdminPanel();
            }
            if (currentUser) {
                updateUIForCurrentUser();
            }
            msgDiv.innerText = '✅ 账户数据库已导入';
            setTimeout(() => msgDiv.innerText = '', 2000);
        } catch (err) {
            alert('导入失败：文件格式错误');
        }
    };
    reader.readAsText(file);
}

// 绑定导出/导入按钮
document.getElementById('exportAccountsBtn').addEventListener('click', exportAccounts);
document.getElementById('importAccountsBtn').addEventListener('click', () => {
    accountFileInput.click();
});
accountFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        importAccounts(file);
        accountFileInput.value = '';
    }
});

// 关闭面板
document.getElementById('closeAdminPanel').addEventListener('click', () => {
    adminPanel.style.display = 'none';
});

adminPanel.addEventListener('click', (e) => e.stopPropagation());
document.addEventListener('click', () => {
    if (adminPanel.style.display === 'block') adminPanel.style.display = 'none';
});