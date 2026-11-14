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

    // ---------- 登出 ----------
    window.logoutUser = function() {
        sessionStorage.removeItem('ws_token');
        location.reload();
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