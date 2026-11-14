// ---------- 常量定义 ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI元素
const victoryMsgDiv = document.getElementById('victoryMessage');
const nextMapBtn = document.getElementById('nextMapBtn');
const saveMsgDiv = document.getElementById('saveMessage');
const respawnMsgDiv = document.getElementById('respawnMessage');
const loadMsgDiv = document.getElementById('loadMessage');
const statusPanel = document.getElementById('statusPanel');
const shopPanel = document.getElementById('shopPanel');
const confirmModal = document.getElementById('confirmModal');
const panelLevel = document.getElementById('panelLevel');
const panelExp = document.getElementById('panelExp');
const panelGold = document.getElementById('panelGold');
const panelKills = document.getElementById('panelKills');
const panelChunk = document.getElementById('panelChunk');
const panelAtk = document.getElementById('panelAtk');
const panelMult = document.getElementById('panelMult');

// 世界参数
const CHUNK_SIZE = 400;
const VIEW_W = 800, VIEW_H = 400;
const WORLD_H = 400;
const MAP_CHUNKS = 20;
let WORLD_W = MAP_CHUNKS * CHUNK_SIZE;

// 物理
const GRAVITY = 0.4;
const JUMP_POWER = -8;
const GROUND_Y_OFFSET = 10;
const STAND_H = 30, DUCK_H = 15;

// 攻击与战斗
const ATK_DUR = 200;
const ATK_RANGE = 20;
const STUN_DUR = 12;

// 敌人
const MAX_ENEMY = 15;
const ENEMY_W = 30, ENEMY_H = 30;
const ENEMY_SPD = 1.2;
const ENEMY_HP = 50;

// 基础伤害
const BASE_ATTACK_DAMAGE = 10;
const BASE_BRICK_DAMAGE = 50;
const BASE_PIERCE_PASS = 20;
const BASE_PIERCE_FINAL_ADD = 180;

// 砖头技能
const BRICK_W = 20, BRICK_H = 12;
const BRICK_SPD = 6;
const BRICK_BACK = 30;
const BRICK_GRAV = 0.05;
const BRICK_CD = 5000;

// 穿透技能
const PIERCE_CD = 15000;
const PIERCE_BASE = 3;
const PIERCE_MAX = 8;
const PIERCE_CHARGE_RATE = 1;
const PIERCE_W = 5, PIERCE_H = 8;
const PIERCE_SPD = 10;

// BOSS
const BOSS_SIZE = 200;
const BOSS_HP = 1000;
const BOSS_SPEED = 1.5;
let BOSS_X = WORLD_W - BOSS_SIZE;
let BOSS_Y = WORLD_H - BOSS_SIZE - GROUND_Y_OFFSET;

// 玩家属性（基础值）
const PLAYER_MAX_HP = 100;      // 固定最大值，用于物品恢复上限，但实际最大生命值可能受天赋影响
let playerHP = PLAYER_MAX_HP;
let currentMaxHp = PLAYER_MAX_HP; // 实际最大生命值（受天赋影响）
let gold = 0, exp = 0, level = 1, killCount = 0;
const EXP_PER_LV = 100;
let normalAttackMult = 1.0;
let skillDamageMult = 1.0;

// 状态标志
let victory = false, gameOver = false, panelVisible = false;
let cameraX = 0;

// 动态对象
let enemies = [];
let projectiles = [];
let boss = null;
let pierceProjectile = null;

// 鼠标/键盘状态
let charging = false;
let previewBrick = { worldX: 0, worldY: 0, angle: 0, active: false };
let mouseScreenX = 0, mouseScreenY = 0;
let left = false, right = false, jumpUsed = false, shiftDown = false, arrowDown = false;
let lastPierce = 0, pierceCharge = false, pierceStart = 0;
let lastBrick = 0;

// 激光
let lasers = [];
let lastLaser = 0;
const LASER_DMG = 10, LASER_WARN = 1000, LASER_ACT = 500, LASER_CD = 5000, LASER_INTERVAL = 100;

// 装饰
const DECOS = [];
for (let i = 0; i < 10; i++) {
    let x = 100 + (i / 9) * (WORLD_W - 200);
    DECOS.push({ x, y: WORLD_H/2 - 15, w: 12, h: 30, color: '#ffaa00' });
}

// 存档点
const SAVE_ZONE_W = 200;
const SAVE_OFFSET = 100;
let savePoints = [];
let lastSaveTime = 0;
const SAVE_COOLDOWN = 5000;
let savedData = { hp: PLAYER_MAX_HP, worldX: 0, gold: 0, exp: 0, level: 1, kills: 0, normalAttackMult:1.0, skillDamageMult:1.0 };
let hasSave = false;
const SAVE_INTERVAL = 10 * CHUNK_SIZE;
for (let i = 1; i * SAVE_INTERVAL < WORLD_W; i++) {
    let zoneX = i * SAVE_INTERVAL + SAVE_OFFSET;
    savePoints.push({ x: zoneX, width: SAVE_ZONE_W, starX: zoneX + SAVE_ZONE_W/2 });
}

// 刷新点
let SPAWN_POINTS = [], chunkSpawnPoints = [], chunkLastSpawn = [];
function genSpawnPoints() {
    SPAWN_POINTS = [];
    let pad = 100;
    for (let i = 0; i < MAP_CHUNKS; i++) {
        let x = pad + (i / (MAP_CHUNKS-1)) * (WORLD_W - 2*pad);
        SPAWN_POINTS.push(Math.floor(x));
    }
    chunkSpawnPoints = Array.from({ length: MAP_CHUNKS }, () => []);
    SPAWN_POINTS.forEach((x, idx) => {
        let c = Math.floor(x / CHUNK_SIZE);
        chunkSpawnPoints[c].push(x);
    });
    chunkLastSpawn = Array(MAP_CHUNKS).fill(0).map(() => performance.now() - Math.random()*10000);
}
genSpawnPoints();

// 玩家对象
let player = {
    x: 0, y: 0, w: 30, h: STAND_H,
    vx: 0, vy: 0, facing: 1,
    attacking: false, attackStart: 0,
    visualOffX: 0, jumpsLeft: 2
};
function getGroundY() { return WORLD_H - player.h - GROUND_Y_OFFSET; }
player.y = getGroundY();

// 存档图片
let saveStarImage = null;

// 辅助函数（全局共享）
function rectCollide(a, b) { return !(b.x >= a.x + a.w || b.x + b.w <= a.x || b.y >= a.y + a.h || b.y + b.h <= a.y); }
function brickHitEnemy(b, e) {
    let cx = b.x + b.w/2, cy = b.y + b.h/2;
    let r = Math.hypot(b.w, b.h)/2;
    let ex = Math.max(e.x, Math.min(cx, e.x+e.w));
    let ey = Math.max(e.y, Math.min(cy, e.y+e.h));
    let dx = cx - ex, dy = cy - ey;
    return dx*dx + dy*dy < r*r;
}

// ---------- 渲染与镜头辅助常量 ----------
const DEAD_ZONE_LEFT = VIEW_W / 3;
const DEAD_ZONE_RIGHT = VIEW_W * 2 / 3;
const ANIMATION_SIZE = 32 * 2;   // 64

// ========== 天赋 & 成就 全局变量 ==========
// 注意：这些变量只在这里定义一次，不要在 talent.js 或 achievement.js 中重复定义
let talentPoints = 0;
let learnedTalents = [];
let talentAttackMult = 1;
let talentSpeedMult = 1;
let talentMaxHpBonus = 0;
let talentTripleJump = false;

let achievementsUnlocked = [];
let totalGoldEarned = 0;
let bossDefeated = false;

// UI 开关
let talentOpen = false;
let achievementOpen = false;

// 更新玩家最大生命值（天赋加成）
function updatePlayerMaxHp() {
    currentMaxHp = PLAYER_MAX_HP + (talentMaxHpBonus || 0);
    if (playerHP > currentMaxHp) playerHP = currentMaxHp;
}