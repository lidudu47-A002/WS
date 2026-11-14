// ---------- 账户存储与认证模块 ----------
const STORAGE_KEY = 'ws_accounts';
const ADMIN_USERNAME = '李嘟嘟';
const ADMIN_PASSWORD = 'lidudu47hao';

// 内置账号列表（永远可以存档，管理员不可修改其权限）
const BUILTIN_ACCOUNTS = [
    { username: '猴子', password: '54188', nickname: 'my friend' },
    { username: '不想冒泡的张某', password: '114514', nickname: '测试员' },
    { username: '1', password: '789113', nickname: 'my friend' },
    { username: '7', password: '123456789', nickname: '梦官' },
    { username: '是岚宁呀', password: '54188yish', nickname: '画师' },
    { username: '蓝神TvT', password: '20141710111113', nickname: 'my friend' }
];

// 挂载到 window 以便 admin.js 访问
window.ADMIN_USERNAME = ADMIN_USERNAME;
window.ADMIN_PASSWORD = ADMIN_PASSWORD;
window.BUILTIN_ACCOUNTS = BUILTIN_ACCOUNTS;

// 全局当前用户
let currentUser = null;
window.currentUser = currentUser;

// 统一权限检查函数
function checkIsAdmin() {
    return currentUser === ADMIN_USERNAME;
}
window.checkIsAdmin = checkIsAdmin;

// 存储操作
function getAccounts() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}
window.getAccounts = getAccounts;

function saveAccounts(accounts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}
window.saveAccounts = saveAccounts;

function encodePassword(pwd) {
    return btoa(pwd + 'salt_ws');
}
window.encodePassword = encodePassword;

function verifyPassword(inputPwd, storedEncoded) {
    return encodePassword(inputPwd) === storedEncoded;
}
window.verifyPassword = verifyPassword;

// 初始化管理员和内置账号
function initAccounts() {
    let accounts = getAccounts();
    let changed = false;
    
    if (!accounts[ADMIN_USERNAME]) {
        accounts[ADMIN_USERNAME] = {
            password: encodePassword(ADMIN_PASSWORD),
            canSave: true,
            nickname: '管理员'
        };
        changed = true;
    } else if (typeof accounts[ADMIN_USERNAME] === 'string') {
        accounts[ADMIN_USERNAME] = {
            password: accounts[ADMIN_USERNAME],
            canSave: true,
            nickname: '管理员'
        };
        changed = true;
    }
    
    BUILTIN_ACCOUNTS.forEach(acc => {
        if (!accounts[acc.username]) {
            accounts[acc.username] = {
                password: encodePassword(acc.password),
                canSave: true,
                nickname: acc.nickname
            };
            changed = true;
        } else {
            if (!accounts[acc.username].nickname) {
                accounts[acc.username].nickname = acc.nickname;
                changed = true;
            }
            if (accounts[acc.username].canSave !== true) {
                accounts[acc.username].canSave = true;
                changed = true;
            }
        }
    });
    
    if (changed) {
        saveAccounts(accounts);
    }
}
initAccounts();

// DOM 元素
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loggedInPanel = document.getElementById('loggedInPanel');
const welcomeMsg = document.getElementById('welcomeMsg');
const accountMessage = document.getElementById('accountMessage');
const gameButtonsContainer = document.getElementById('gameButtonsContainer');
const permissionWarning = document.getElementById('permissionWarning');

const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const regUsername = document.getElementById('regUsername');
const regPassword = document.getElementById('regPassword');
const regPasswordConfirm = document.getElementById('regPasswordConfirm');

const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const switchToRegisterBtn = document.getElementById('switchToRegisterBtn');
const switchToLoginBtn = document.getElementById('switchToLoginBtn');

const newGameBtn = document.getElementById('newGameBtn');
const loadGameBtn = document.getElementById('loadGameBtn');
const fileInput = document.getElementById('fileInput');
const msgDiv = document.getElementById('message');

// 切换UI
function showLoginForm() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loggedInPanel.style.display = 'none';
    gameButtonsContainer.style.display = 'none';
    accountMessage.innerText = '';
}

function showRegisterForm() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loggedInPanel.style.display = 'none';
    gameButtonsContainer.style.display = 'none';
    accountMessage.innerText = '';
}

// 根据权限显示/隐藏管理员相关元素（此函数由 admin.js 覆盖实现）
window.toggleAdminElements = function(isAdmin) {
    // 占位，实际实现由 admin.js 提供
};

function updateUIForCurrentUser() {
    if (!currentUser) return;
    const accounts = getAccounts();
    const userData = accounts[currentUser];
    const canSave = userData ? userData.canSave : true;
    const nickname = (userData && userData.nickname) ? userData.nickname : currentUser;
    
    const isAdmin = checkIsAdmin();
    welcomeMsg.innerText = `欢迎回来, ${nickname}${isAdmin ? ' (管理员)' : ''}`;
    
    if (!canSave) {
        loadGameBtn.disabled = true;
        permissionWarning.style.display = 'block';
    } else {
        loadGameBtn.disabled = false;
        permissionWarning.style.display = 'none';
    }
    
    // 调用 admin.js 中的函数来显示/隐藏管理面板相关的 UI
    if (window.toggleAdminElements) {
        window.toggleAdminElements(isAdmin);
    }
}
window.updateUIForCurrentUser = updateUIForCurrentUser;

function showLoggedInPanel(username) {
    currentUser = username;
    window.currentUser = username;
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    loggedInPanel.style.display = 'block';
    gameButtonsContainer.style.display = 'block';
    updateUIForCurrentUser();
    sessionStorage.setItem('ws_current_user', username);
    accountMessage.innerText = '';
}
window.showLoggedInPanel = showLoggedInPanel;

// 登录
loginBtn.addEventListener('click', () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value;
    if (!username || !password) {
        accountMessage.innerText = '❌ 用户名和密码不能为空';
        return;
    }
    const accounts = getAccounts();
    const userData = accounts[username];
    if (!userData) {
        accountMessage.innerText = '❌ 用户名不存在';
        return;
    }
    const storedPwd = typeof userData === 'string' ? userData : userData.password;
    if (!verifyPassword(password, storedPwd)) {
        accountMessage.innerText = '❌ 密码错误';
        return;
    }
    showLoggedInPanel(username);
});

// 注册
registerBtn.addEventListener('click', () => {
    const username = regUsername.value.trim();
    const password = regPassword.value;
    const confirm = regPasswordConfirm.value;
    if (!username || !password) {
        accountMessage.innerText = '❌ 用户名和密码不能为空';
        return;
    }
    if (password !== confirm) {
        accountMessage.innerText = '❌ 两次密码不一致';
        return;
    }
    const accounts = getAccounts();
    if (accounts[username]) {
        accountMessage.innerText = '❌ 用户名已存在';
        return;
    }
    accounts[username] = {
        password: encodePassword(password),
        canSave: true,
        nickname: username
    };
    saveAccounts(accounts);
    accountMessage.innerText = '✅ 注册成功，请登录';
    showLoginForm();
    loginUsername.value = username;
    loginPassword.value = '';
    regUsername.value = '';
    regPassword.value = '';
    regPasswordConfirm.value = '';
});

switchToRegisterBtn.addEventListener('click', () => {
    showRegisterForm();
    regUsername.value = '';
    regPassword.value = '';
    regPasswordConfirm.value = '';
});
switchToLoginBtn.addEventListener('click', showLoginForm);

// 检查已登录会话
const savedUser = sessionStorage.getItem('ws_current_user');
if (savedUser) {
    const accounts = getAccounts();
    if (accounts[savedUser]) {
        showLoggedInPanel(savedUser);
    } else {
        sessionStorage.removeItem('ws_current_user');
    }
}

// 游戏启动逻辑
newGameBtn.addEventListener('click', () => {
    if (!currentUser) return;
    window.location.href = '../black room/black room.html';
});

loadGameBtn.addEventListener('click', () => {
    if (!currentUser) return;
    const accounts = getAccounts();
    const userData = accounts[currentUser];
    if (!userData || !userData.canSave) {
        msgDiv.innerText = '❌ 管理员已禁止你使用存档功能';
        return;
    }
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const saveObj = JSON.parse(e.target.result);
            let targetMap = saveObj.map;
            if (!targetMap) {
                const hasType = saveObj.enemies && saveObj.enemies.some(en => en.type === 'red' || en.type === 'black');
                targetMap = hasType ? 'prison' : 'black';
            }
            const jsonStr = JSON.stringify(saveObj);
            const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
            const url = targetMap === 'prison' ? '../prison/prison.html' : '../black room/black room.html';
            const finalUrl = `${url}?load=${encoded}`;
            msgDiv.innerText = `正在加载存档，跳转到 ${targetMap === 'prison' ? '监狱' : '黑屋'}...`;
            setTimeout(() => { window.location.href = finalUrl; }, 300);
        } catch (err) {
            msgDiv.innerText = '❌ 存档文件损坏或格式错误！';
        }
    };
    reader.readAsText(file);
    fileInput.value = '';
});

// 回车快捷登录
loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginBtn.click(); });
loginUsername.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginBtn.click(); });