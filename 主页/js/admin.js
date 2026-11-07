// ========== admin.js ==========
// 管理员功能（需要登录且 role === 'admin'）

(function() {
    // ---------- 获取用户数据 ----------
    function getUsers() {
        const raw = localStorage.getItem('ws_users');
        if (raw) {
            try { return JSON.parse(raw); } catch(e) {}
        }
        return {};
    }

    function saveUsers(users) {
        localStorage.setItem('ws_users', JSON.stringify(users));
    }

    // ---------- 创建管理面板（只创建一次） ----------
    let panel = null;
    function createAdminPanel() {
        if (panel) return panel;
        const div = document.createElement('div');
        div.id = 'adminPanel';
        div.className = 'admin-panel';
        div.style.display = 'none';
        div.innerHTML = `
            <div class="admin-panel-content">
                <div class="admin-header">
                    <h3>⚙️ Admin Console</h3>
                    <button id="closeAdminPanel" class="reset-pwd-btn">Close</button>
                </div>
                <div class="user-list" id="userList"></div>
                <div class="admin-actions">
                    <button id="exportUsersBtn">📤 Export Account Data</button>
                    <button id="importUsersBtn">📥 Import Account Data</button>
                </div>
                <input type="file" id="adminFileInput" accept=".json" style="display:none;">
            </div>
        `;
        document.body.appendChild(div);
        panel = div;

        // 绑定事件
        document.getElementById('closeAdminPanel').addEventListener('click', function() {
            panel.style.display = 'none';
        });

        document.getElementById('exportUsersBtn').addEventListener('click', function() {
            exportUsers();
        });

        document.getElementById('importUsersBtn').addEventListener('click', function() {
            document.getElementById('adminFileInput').click();
        });

        document.getElementById('adminFileInput').addEventListener('change', function(e) {
            if (e.target.files[0]) {
                importUsers(e.target.files[0]);
                e.target.value = '';
            }
        });

        return panel;
    }

    // ---------- 渲染用户列表 ----------
    function renderUserList() {
        const users = getUsers();
        const list = document.getElementById('userList');
        if (!list) return;
        list.innerHTML = '';
        for (const [username, data] of Object.entries(users)) {
            const item = document.createElement('div');
            item.className = 'user-item';
            const roleText = data.role === 'admin' ? 'Admin' : 'User';
            const canSave = data.canSave !== false;
            item.innerHTML = `
                <div class="user-info">
                    <span><strong>${username}</strong></span>
                    <span style="color:${data.role === 'admin' ? '#ffd700' : '#aaa'};">
                        ${roleText}
                    </span>
                    <label>
                        <input type="checkbox" class="can-save-check" data-username="${username}" ${canSave ? 'checked' : ''}>
                        Allow saving
                    </label>
                </div>
                <button class="reset-pwd-btn" data-username="${username}">Reset Password</button>
            `;
            list.appendChild(item);
        }

        // 绑定事件：切换存档权限
        list.querySelectorAll('.can-save-check').forEach(cb => {
            cb.addEventListener('change', function() {
                const username = this.dataset.username;
                const users = getUsers();
                if (users[username]) {
                    users[username].canSave = this.checked;
                    saveUsers(users);
                    // 如果当前登录用户是此用户，更新会话中的 canSave
                    const current = window.getCurrentUser();
                    if (current && current.username === username) {
                        const tokenData = { ...current, canSave: this.checked };
                        const token = btoa(JSON.stringify(tokenData));
                        sessionStorage.setItem('ws_token', token);
                        // 刷新界面提示
                        const warn = document.getElementById('permissionWarning');
                        if (this.checked) {
                            warn.style.display = 'none';
                        } else {
                            warn.style.display = 'block';
                        }
                    }
                }
            });
        });

        // 绑定事件：重置密码（弹出 prompt）
        list.querySelectorAll('.reset-pwd-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const username = this.dataset.username;
                const newPwd = prompt(`Set a new password for ${username} (at least 6 characters)`);
                if (newPwd && newPwd.length >= 6) {
                    resetPassword(username, newPwd);
                } else if (newPwd !== null) {
                    alert('Password must be at least 6 characters');
                }
            });
        });
    }

    // ---------- 重置密码 ----------
    async function resetPassword(username, newPassword) {
        const users = getUsers();
        if (!users[username]) {
            alert('User does not exist');
            return;
        }
        const salt = Math.random().toString(36).substring(2, 10);
        const hashed = await window.hashPassword(newPassword, salt);
        users[username].hash = hashed;
        users[username].salt = salt;
        saveUsers(users);
        alert(`Password reset for ${username}`);
        renderUserList(); // 刷新列表
    }

    // ---------- 导出账户数据 ----------
    function exportUsers() {
        const users = getUsers();
        const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ws_accounts_backup.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    // ---------- 导入账户数据 ----------
    function importUsers(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (typeof imported !== 'object' || Array.isArray(imported)) {
                    throw new Error('Invalid format');
                }
                const current = getUsers();
                // 合并：导入的数据会覆盖同名用户
                const merged = { ...current, ...imported };
                saveUsers(merged);
                alert('Account data imported!');
                renderUserList();
            } catch(err) {
                alert('Import failed: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    // ---------- 显示管理按钮（在导航栏或合适位置） ----------
    window.showAdminButton = function() {
        // 在游戏按钮容器中插入一个管理按钮（如果存在）
        const container = document.getElementById('gameButtonsContainer');
        if (!container) return;
        // 检查是否已存在
        if (document.getElementById('adminBtn')) return;
        const btn = document.createElement('button');
        btn.id = 'adminBtn';
        btn.className = 'btn';
        btn.textContent = '👑 Admin Panel';
        btn.style.background = '#8e44ad';
        btn.style.borderColor = '#c39bd3';
        btn.style.color = 'white';
        btn.onclick = function() {
            const panel = createAdminPanel();
            panel.style.display = 'block';
            renderUserList();
        };
        // 追加到游戏按钮容器末尾
        container.appendChild(btn);
    };

    // ---------- 在页面加载后检查权限并显示按钮 ----------
    document.addEventListener('DOMContentLoaded', function() {
        const user = window.getCurrentUser();
        if (user && user.role === 'admin') {
            // 如果已经登录且是管理员，显示管理按钮
            setTimeout(() => {
                if (typeof window.showAdminButton === 'function') {
                    window.showAdminButton();
                }
            }, 100);
        }
    });
})();