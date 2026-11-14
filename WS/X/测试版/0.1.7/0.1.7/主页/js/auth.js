// ---------- 账户存储与认证模块 ----------
const STORAGE_KEY = 'ws_accounts';

function getAccounts() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}

function saveAccounts(accounts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function encodePassword(pwd) {
    return btoa(pwd + 'salt_ws');
}

function verifyPassword(inputPwd, storedEncoded) {
    return encodePassword(inputPwd) === storedEncoded;
}

// 全局当前用户（供 admin.js 使用）
let currentUser = null;
window.currentUser = currentUser;

// DOM 元素
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loggedInPanel = document.getElementById('loggedInPanel');
const welcomeMsg = document.getElementById('welcomeMsg');
const accountMessage = document.getElementById('accountMessage');
const gameButtonsContainer = document.getElementById('gameButtonsContainer');

const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const regUsername = document.getElementById('regUsername');
const regPassword = document.getElementById('regPassword');
const regPasswordConfirm = document.getElementById('regPasswordConfirm');

const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const switchToRegisterBtn = document.getElementById('switchToRegisterBtn');
const switchToLoginBtn = document.getElementById('switchToLoginBtn');

// UI 切换
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

function showLoggedInPanel(username) {
    currentUser = username;
    window.currentUser = username;
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    loggedInPanel.style.display = 'block';
    gameButtonsContainer.style.display = 'block';
    welcomeMsg.innerText = `欢迎回来, ${username}`;
    sessionStorage.setItem('ws_current_user', username);
    accountMessage.innerText = '';
}

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
    accounts[username] = encodePassword(password);
    saveAccounts(accounts);
    accountMessage.innerText = '✅ 注册成功，请登录';
    showLoginForm();
    loginUsername.value = username;
    loginPassword.value = '';
    regUsername.value = '';
    regPassword.value = '';
    regPasswordConfirm.value = '';
});

switchToRegisterBtn.addEventListener('click', showRegisterForm);
switchToLoginBtn.addEventListener('click', showLoginForm);

// 检查是否已登录
const savedUser = sessionStorage.getItem('ws_current_user');
if (savedUser) {
    const accounts = getAccounts();
    if (accounts[savedUser]) {
        showLoggedInPanel(savedUser);
    } else {
        sessionStorage.removeItem('ws_current_user');
    }
}

// 回车快捷登录
loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginBtn.click(); });
loginUsername.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginBtn.click(); });