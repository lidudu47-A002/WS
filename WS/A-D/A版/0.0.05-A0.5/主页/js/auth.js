// ========== auth.js ==========
// 用户认证与账户管理（纯前端，使用 localStorage 持久化）

(function() {
    // ---------- 安全的 Base64 编解码（支持 UTF-8） ----------
    function utf8ToB64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }
    function b64ToUtf8(str) {
        return decodeURIComponent(escape(atob(str)));
    }

    // ---------- 密码哈希工具（使用 Web Crypto API） ----------
    async function hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ---------- 用户数据库操作 ----------
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

    // ---------- 获取当前登录用户 ----------
    function getCurrentUser() {
        const token = sessionStorage.getItem('ws_token');
        if (!token) return null;
        try {
            const json = b64ToUtf8(token);
            const data = JSON.parse(json);
            if (data.exp < Date.now()) {
                sessionStorage.removeItem('ws_token');
                return null;
            }
            return data;
        } catch(e) {
            // token 损坏或格式错误，清除
            sessionStorage.removeItem('ws_token');
            return null;
        }
    }

    // ---------- 注册 ----------
    window.registerUser = async function(username, password, confirm) {
        if (!username || !password || !confirm) {
            document.getElementById('accountMessage').textContent = '请填写完整信息';
            return false;
        }
        if (password !== confirm) {
            document.getElementById('accountMessage').textContent = '两次密码输入不一致';
            return false;
        }
        if (password.length < 6) {
            document.getElementById('accountMessage').textContent = '密码长度至少6位';
            return false;
        }
        const users = getUsers();
        if (users[username]) {
            document.getElementById('accountMessage').textContent = '用户名已存在';
            return false;
        }
        const salt = Math.random().toString(36).substring(2, 10);
        const hashed = await hashPassword(password, salt);
        users[username] = {
            hash: hashed,
            salt: salt,
            role: (Object.keys(users).length === 0) ? 'admin' : 'user',
            canSave: true
        };
        saveUsers(users);
        document.getElementById('accountMessage').textContent = '注册成功！请登录';
        // 切换到登录表单
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('loginUsername').value = username;
        document.getElementById('loginPassword').value = '';
        return true;
    };

    // ---------- 登录 ----------
    window.loginUser = async function(username, password) {
        if (!username || !password) {
            document.getElementById('accountMessage').textContent = '请输入用户名和密码';
            return false;
        }
        const users = getUsers();
        const user = users[username];
        if (!user) {
            document.getElementById('accountMessage').textContent = '用户名不存在';
            return false;
        }
        const hashed = await hashPassword(password, user.salt);
        if (hashed === user.hash) {
            // 生成临时令牌（24小时有效）
            const tokenData = {
                username: username,
                role: user.role,
                canSave: user.canSave !== false,
                exp: Date.now() + 24 * 3600000
            };
            // 使用安全的 Base64 编码
            const token = utf8ToB64(JSON.stringify(tokenData));
            sessionStorage.setItem('ws_token', token);
            document.getElementById('accountMessage').textContent = '登录成功！';
            updateUIAfterLogin(tokenData);
            return true;
        } else {
            document.getElementById('accountMessage').textContent = '密码错误';
            return false;
        }
    };

    // ---------- 更新界面状态 ----------
    function updateUIAfterLogin(userData) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        const panel = document.getElementById('loggedInPanel');
        panel.style.display = 'block';
        document.getElementById('welcomeMsg').textContent = `👋 欢迎回来，${userData.username} (${userData.role === 'admin' ? '管理员' : '普通用户'})`;

        document.getElementById('gameButtonsContainer').style.display = 'block';

        const warn = document.getElementById('permissionWarning');
        if (userData.canSave === false) {
            warn.style.display = 'block';
        } else {
            warn.style.display = 'none';
        }

        if (userData.role === 'admin') {
            if (typeof window.showAdminButton === 'function') {
                window.showAdminButton();
            }
        }
    }

    // ---------- 检查登录状态（页面加载时调用） ----------
    window.checkAuth = function() {
        const user = getCurrentUser();
        if (user) {
            updateUIAfterLogin(user);
        } else {
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('loggedInPanel').style.display = 'none';
            document.getElementById('gameButtonsContainer').style.display = 'none';
        }
    };

    // ---------- 暴露给全局 ----------
    window.getCurrentUser = getCurrentUser;
    window.hashPassword = hashPassword;
})();

// ---------- 绑定 DOM 事件（页面加载后执行） ----------
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('switchToRegisterBtn').addEventListener('click', function() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('accountMessage').textContent = '';
    });
    document.getElementById('switchToLoginBtn').addEventListener('click', function() {
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('accountMessage').textContent = '';
    });

    document.getElementById('loginBtn').addEventListener('click', async function() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        await window.loginUser(username, password);
    });

    document.getElementById('registerBtn').addEventListener('click', async function() {
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regPasswordConfirm').value;
        await window.registerUser(username, password, confirm);
    });

    document.getElementById('loginPassword').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('loginBtn').click();
    });
    document.getElementById('regPasswordConfirm').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('registerBtn').click();
    });

    window.checkAuth();
});

// ---------- 游戏入口按钮 ----------
document.addEventListener('DOMContentLoaded', function() {
    const $ = (id) => document.getElementById(id);
    function showMessage(text) {
        const el = $('message');
        if (el) el.textContent = text;
    }

    const BLACK_ROOM = '../Black room/Black room.html';
    const TUTORIAL_PAGE = '../tutorial/index.html?from=newgame';

    // ---------- 新手教程询问弹窗 ----------
    const tutorialModal = $('tutorialModal');
    const tutorialModalTip = $('tutorialModalTip');

    function openTutorialModal() {
        if (!tutorialModal) return false;
        if (tutorialModalTip) {
            let done = false;
            try { done = !!localStorage.getItem('ws_tutorial_done'); } catch (err) { done = false; }
            tutorialModalTip.textContent = done ? '你已完成过新手教程，也可以再看一遍。' : '';
        }
        tutorialModal.classList.add('show');
        return true;
    }

    function closeTutorialModal() {
        if (tutorialModal) tutorialModal.classList.remove('show');
    }

    // 新游戏：先询问是否进入新手教程，再进入黑屋场景（无存档参数 = 全新开局）
    const newGameBtn = $('newGameBtn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', function() {
            const user = window.getCurrentUser ? window.getCurrentUser() : null;
            if (!user) { showMessage('请先登录'); return; }
            showMessage('');
            if (!openTutorialModal()) {
                window.location.href = BLACK_ROOM;
            }
        });
    }

    const tutorialYesBtn = $('tutorialYesBtn');
    if (tutorialYesBtn) {
        tutorialYesBtn.addEventListener('click', function() {
            window.location.href = TUTORIAL_PAGE;
        });
    }

    const tutorialNoBtn = $('tutorialNoBtn');
    if (tutorialNoBtn) {
        tutorialNoBtn.addEventListener('click', function() {
            window.location.href = BLACK_ROOM;
        });
    }

    if (tutorialModal) {
        tutorialModal.addEventListener('click', function(e) {
            if (e.target === tutorialModal) closeTutorialModal();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && tutorialModal && tutorialModal.classList.contains('show')) {
            closeTutorialModal();
        }
    });

    // 加载旧存档：选 JSON → 写入 ws_pending_save → 以 load=pending 进入场景
    const loadGameBtn = $('loadGameBtn');
    const fileInput = $('fileInput');
    if (loadGameBtn) {
        loadGameBtn.addEventListener('click', function() {
            const user = window.getCurrentUser ? window.getCurrentUser() : null;
            if (!user) { showMessage('请先登录'); return; }
            if (user.canSave === false) { showMessage('管理员已禁止你使用存档功能'); return; }
            if (fileInput) fileInput.click();
        });
    }
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function() {
                let data = null;
                try {
                    data = JSON.parse(String(reader.result || ''));
                } catch (err) {
                    showMessage('存档文件解析失败：不是有效的 JSON');
                    return;
                }
                try {
                    localStorage.setItem('ws_pending_save', JSON.stringify(data));
                } catch (err) {
                    showMessage('写入本地存档失败');
                    return;
                }
                showMessage('存档已就绪，正在进入黑屋…');
                window.location.href = BLACK_ROOM + '?load=pending';
            };
            reader.onerror = function() { showMessage('读取存档文件失败'); };
            reader.readAsText(file, 'utf-8');
            e.target.value = '';
        });
    }

    // 账户数据文件：合并导入（不覆盖已存在的同名用户）
    const accountFileInput = $('accountFileInput');
    if (accountFileInput) {
        accountFileInput.addEventListener('change', function(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function() {
                let incoming = null;
                try {
                    incoming = JSON.parse(String(reader.result || ''));
                } catch (err) {
                    showMessage('账户文件解析失败：不是有效的 JSON');
                    return;
                }
                if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
                    showMessage('账户文件格式不正确');
                    return;
                }
                let users = {};
                try { users = JSON.parse(localStorage.getItem('ws_users') || '{}') || {}; } catch (err) { users = {}; }
                let added = 0;
                for (const name in incoming) {
                    if (!Object.prototype.hasOwnProperty.call(users, name)) {
                        users[name] = incoming[name];
                        added++;
                    }
                }
                localStorage.setItem('ws_users', JSON.stringify(users));
                showMessage('账户数据导入完成：新增 ' + added + ' 个账户');
                if (window.checkAuth) window.checkAuth();
            };
            reader.onerror = function() { showMessage('读取账户文件失败'); };
            reader.readAsText(file, 'utf-8');
            e.target.value = '';
        });
    }

});