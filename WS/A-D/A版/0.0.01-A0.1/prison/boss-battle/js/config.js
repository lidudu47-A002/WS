// ---------- 全局常量与状态 ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const victoryMsg = document.getElementById('victoryMsg');
const gameOverMsg = document.getElementById('gameOverMsg');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getViewW() { return canvas.width; }
function getViewH() { return canvas.height; }

// 战斗框（由 game.js 更新）
let boxX, boxY, boxW, boxH;

// BOSS
const BOSS_SIZE = 200;
const BOSS_MAX_HP = 1000;
let bossHP = BOSS_MAX_HP;
let bossColors = Array(16).fill('#ff0000');
let bossColorIdx = 0;

// 灵魂
const SOUL_SIZE = 20;
const SOUL_SPEED = 4;
let soulX, soulY;
let soulMinX, soulMaxX, soulMinY, soulMaxY;

// 实体池
let gasterBlasters = [];
let enemyBullets = [];

// 回合与玩家数据
const PLAYER_MAX_HP = 100;
let playerHP = PLAYER_MAX_HP;
let hpPotions = 2;
let turn = 'player';
let selectedOption = 0;
const options = ['战斗', '行动', '物品', '仁慈'];
let bossTurnTimer = 0;
const BOSS_TURN_DURATION = 900;     // 15秒
let bossTurnPhase = 0;

let bossColorFrame = 0;
let playerAttacked = false;

let fightKeys = { left: false, right: false, up: false, down: false, confirm: false };
let mouseX = 0, mouseY = 0;

function updateLayout() {
    const W = getViewW(), H = getViewH();
    bossX = (W - BOSS_SIZE) / 2;
    bossY = 30;
    const margin = 20;
    soulMinX = margin;
    soulMaxX = W - SOUL_SIZE - margin;
    soulMinY = margin;
    soulMaxY = H - SOUL_SIZE - margin;
    soulX = (W - SOUL_SIZE) / 2;
    soulY = H - 150;
}
let bossX, bossY;
updateLayout();
window.addEventListener('resize', updateLayout);

function rectCollide(r1, r2) {
    return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x ||
             r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
}

function cycleBossColors() {
    const cols = ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#4b0082','#8f00ff','#ffffff'];
    bossColors[bossColorIdx] = cols[Math.floor(Math.random() * cols.length)];
    bossColorIdx = (bossColorIdx + 1) % 16;
}