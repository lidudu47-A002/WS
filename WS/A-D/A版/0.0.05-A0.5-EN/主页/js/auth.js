// ========== auth.js ==========
// 用户认证与账户管理（纯前端，使用 localStorage 持久化）

(function() {
    // 存储键名统一来源（优化清单第 2 条），禁止手写字符串
    var STORAGE_KEYS = window.WS_KEYS || { USERS: 'ws_users', TOKEN: 'ws_token', PENDING_SAVE: 'ws_pending_save', SAVE: 'black_room_prison_save' };
    // ---------- 安全的 Base64 编解码（支持 UTF-8） ----------
    function utf8ToB64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }
    function b64ToUtf8(str) {
        return decodeURIComponent(escape(atob(str)));
    }

    // ---------- 密码哈希工具（优化清单第 4 条：单轮 SHA-256 + 弱盐 → PBKDF2-SHA256 100k 迭代 + CSPRNG 盐） ----------
    var PBKDF2_ITER = 100000;
    function toHex(buf) {
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    function randomSalt() {
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        return toHex(buf);
    }
    async function hashPassword(password, salt, iter) {
        const iterations = iter || PBKDF2_ITER;
        const enc = new TextEncoder();
        try {
            const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
            const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: iterations, hash: 'SHA-256' }, key, 256);
            return toHex(bits);
        } catch (e) {
            // 极老浏览器无 PBKDF2 时退化为单轮 SHA-256，仅保证可用性
            const buf = await crypto.subtle.digest('SHA-256', enc.encode(password + salt));
            return toHex(buf);
        }
    }
    // 仅用于校验旧账户（历史单轮 SHA-256），校验通过后立即升级为 PBKDF2
    async function legacyHash(password, salt) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + salt));
        return toHex(buf);
    }

    // ---------- 用户数据库操作 ----------
    function getUsers() {
        const raw = localStorage.getItem(STORAGE_KEYS.USERS);
        if (raw) {
            try { return JSON.parse(raw); } catch(e) {}
        }
        return {};
    }

    function saveUsers(users) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    // ---------- 获取当前登录用户 ----------
    function getCurrentUser() {
        const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!token) return null;
        try {
            const json = b64ToUtf8(token);
            const data = JSON.parse(json);
            if (data.exp < Date.now()) {
                sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
                return null;
            }
            return data;
        } catch(e) {
            // token 损坏或格式错误，清除
            sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
            return null;
        }
    }

    // ---------- 注册 ----------
    window.registerUser = async function(username, password, confirm) {
        if (!username || !password || !confirm) {
            document.getElementById('accountMessage').textContent = 'Please fill in all fields';
            return false;
        }
        if (password !== confirm) {
            document.getElementById('accountMessage').textContent = 'The two passwords do not match';
            return false;
        }
        if (password.length < 6) {
            document.getElementById('accountMessage').textContent = 'Password must be at least 6 characters';
            return false;
        }
        // 优化清单第 22 条：用户名白名单，避免 < > & 等字符进入 DOM 拼接路径
        if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
            document.getElementById('accountMessage').textContent = 'Username must be 3-16 letters, digits or underscores';
            return false;
        }
        const users = getUsers();
        if (users[username]) {
            document.getElementById('accountMessage').textContent = 'Username already exists';
            return false;
        }
        const salt = randomSalt();
        const hashed = await hashPassword(password, salt, PBKDF2_ITER);
        users[username] = {
            hash: hashed,
            salt: salt,
            algo: 'PBKDF2-SHA256',
            iter: PBKDF2_ITER,
            role: (Object.keys(users).length === 0) ? 'admin' : 'user',
            canSave: true
        };
        saveUsers(users);
        document.getElementById('accountMessage').textContent = 'Registered! Please log in';
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
            document.getElementById('accountMessage').textContent = 'Please enter username and password';
            return false;
        }
        const users = getUsers();
        const user = users[username];
        if (!user) {
            document.getElementById('accountMessage').textContent = 'Username does not exist';
            return false;
        }
        let hashed;
        if (user.algo === 'PBKDF2-SHA256') {
            hashed = await hashPassword(password, user.salt, user.iter || PBKDF2_ITER);
        } else {
            hashed = await legacyHash(password, user.salt);
        }
        if (hashed === user.hash) {
            // 旧格式账户：验证通过即就地升级为 PBKDF2，用户无感知
            if (user.algo !== 'PBKDF2-SHA256') {
                user.salt = randomSalt();
                user.hash = await hashPassword(password, user.salt, PBKDF2_ITER);
                user.algo = 'PBKDF2-SHA256';
                user.iter = PBKDF2_ITER;
                users[username] = user;
                saveUsers(users);
            }
            // 生成临时令牌（24小时有效）
            const tokenData = {
                username: username,
                role: user.role,
                canSave: user.canSave !== false,
                exp: Date.now() + 24 * 3600000
            };
            // 使用安全的 Base64 编码
            const token = utf8ToB64(JSON.stringify(tokenData));
            sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
            document.getElementById('accountMessage').textContent = 'Logged in!';
            updateUIAfterLogin(tokenData);
            return true;
        } else {
            document.getElementById('accountMessage').textContent = 'Wrong password';
            return false;
        }
    };

    // ---------- 更新界面状态 ----------
    function updateUIAfterLogin(userData) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        const panel = document.getElementById('loggedInPanel');
        panel.style.display = 'block';
        document.getElementById('welcomeMsg').textContent = `👋 Welcome back, ${userData.username} (${userData.role === 'admin' ? 'Admin' : 'Standard user'})`;

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
            tutorialModalTip.textContent = done ? 'You have already finished the newbie tutorial, but you can watch it again.' : '';
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
            if (!user) { showMessage('Please log in first'); return; }
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
            if (!user) { showMessage('Please log in first'); return; }
            if (user.canSave === false) { showMessage('Admin has disabled saving for you'); return; }
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
                    showMessage('Failed to parse the save file: not valid JSON');
                    return;
                }
                try {
                    localStorage.setItem(STORAGE_KEYS.PENDING_SAVE, JSON.stringify(data));
                } catch (err) {
                    showMessage('Failed to write the local save');
                    return;
                }
                showMessage('Save ready, entering the Black room...');
                window.location.href = BLACK_ROOM + '?load=pending';
            };
            reader.onerror = function() { showMessage('Failed to read the save file'); };
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
                    showMessage('Failed to parse the account file: not valid JSON');
                    return;
                }
                if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
                    showMessage('The account file format is incorrect');
                    return;
                }
                let users = {};
                try { users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '{}') || {}; } catch (err) { users = {}; }
                let added = 0;
                for (const name in incoming) {
                    if (!Object.prototype.hasOwnProperty.call(users, name)) {
                        users[name] = incoming[name];
                        added++;
                    }
                }
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
                showMessage('Account import finished: added ' + added + ' accounts');
                if (window.checkAuth) window.checkAuth();
            };
            reader.onerror = function() { showMessage('Failed to read the account file'); };
            reader.readAsText(file, 'utf-8');
            e.target.value = '';
        });
    }

});