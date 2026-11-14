// ---------- 监狱/黑屋 共享常量定义 ----------
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

// ---------- 地图差异：黑屋20，监狱15 ----------
// 由各地图的 HTML 中重新定义 MAP_CHUNKS 和 WORLD_W
let MAP_CHUNKS = 20;
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
const RED_ENEMY_MAX = 3;
const BLACK_ENEMY_MAX = 2;
const ENEMY_W = 30, ENEMY_H = 30;
const ENEMY_SPD = 1.2;
const ENEMY_HP = 300;
const SMALL_BLOCK_HP = 100;
const SMALL_BLOCK_W = 15, SMALL_BLOCK_H = 15;
const SMALL_BLOCK_SPD = 0.6;
const SMALL_MERGE_TEAM = 3;
const SMALL_MERGE_WINDUP_MS = 1500;
const SMALL_MERGE_APPROACH_SPEED = 2.2;
const BLACK_ENEMY_COLOR = '#000000';
const BLACK_ENEMY_BULLET_DAMAGE = 5;
const BLACK_ENEMY_BULLET_SPEED = 3;
const BLACK_ENEMY_ATTACK_COOLDOWN = 5000;
const BLACK_ENEMY_BULLET_MAX_DISTANCE = 2000;

// 基础伤害
const BASE_ATTACK_DAMAGE = 10;
const BASE_BRICK_DAMAGE = 50;

// 砖头技能
const BRICK_W = 20, BRICK_H = 12;
const BRICK_SPD = 6;
const BRICK_BACK = 30;
const BRICK_GRAV = 0.05;
const BRICK_CD = 5000;

// 弓箭重力
const ARROW_GRAV = BRICK_GRAV * 0.5;

// BOSS
const BOSS_SIZE = 200;
const BOSS_HP = 1000;
const BOSS_SPEED = 1.5;
let BOSS_X = WORLD_W - BOSS_SIZE;
let BOSS_Y = WORLD_H - BOSS_SIZE - GROUND_Y_OFFSET;

// 玩家属性
const PLAYER_MAX_HP_BASE = 100;
let playerHP = PLAYER_MAX_HP_BASE;
let currentMaxHp = PLAYER_MAX_HP_BASE;
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
let damageNumbers = [];

// 鼠标/键盘状态
let charging = false;
let previewBrick = { worldX: 0, worldY: 0, angle: 0, active: false };
let mouseScreenX = 0, mouseScreenY = 0;
let left = false, right = false, jumpUsed = false, shiftDown = false, arrowDown = false;
let lastBrick = 0;

// 激光
let lasers = [];
let lastLaser = 0;
const LASER_DMG = 10, LASER_WARN = 1000, LASER_ACT = 500, LASER_CD = 5000, LASER_INTERVAL = 100;

// 存档点
const SAVE_ZONE_W = 200;
const SAVE_OFFSET = 100;
let savePoints = [];
let lastSaveTime = 0;
const SAVE_COOLDOWN = 5000;
let savedData = { hp: PLAYER_MAX_HP_BASE, worldX: 0, gold: 0, exp: 0, level: 1, kills: 0, normalAttackMult:1.0, skillDamageMult:1.0 };
let hasSave = false;
const SAVE_INTERVAL = 10 * CHUNK_SIZE;
for (let i = 1; i * SAVE_INTERVAL < WORLD_W; i++) {
    let zoneX = i * SAVE_INTERVAL + SAVE_OFFSET;
    savePoints.push({ x: zoneX, width: SAVE_ZONE_W, starX: zoneX + SAVE_ZONE_W/2 });
}

// 刷新点
let SPAWN_POINTS = [], chunkSpawnPoints = [];
let redChunkLastSpawn = Array(MAP_CHUNKS).fill(0);
let blackChunkLastSpawn = Array(MAP_CHUNKS).fill(0);
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
}
genSpawnPoints();

// 玩家对象
let player = {
    x: 0, y: 0, w: 30, h: STAND_H,
    vx: 0, vy: 0, facing: 1,
    attacking: false, attackStart: 0,
    visualOffX: 0, jumpsLeft: 2,
    lockMovement: false
};
function getGroundY() { return WORLD_H - player.h - GROUND_Y_OFFSET; }
player.y = getGroundY();

// 存档图片
let saveStarImage = null;

// 辅助函数
function rectCollide(a, b) { return !(b.x >= a.x + a.w || b.x + b.w <= a.x || b.y >= a.y + a.h || b.y + b.h <= a.y); }
function brickHitEnemy(b, e) {
    let cx = b.x + b.w/2, cy = b.y + b.h/2;
    let r = Math.hypot(b.w, b.h)/2;
    let ex = Math.max(e.x, Math.min(cx, e.x+e.w));
    let ey = Math.max(e.y, Math.min(cy, e.y+e.h));
    let dx = cx - ex, dy = cy - ey;
    return dx*dx + dy*dy < r*r;
}

// 渲染与镜头辅助常量
const DEAD_ZONE_LEFT = VIEW_W / 3;
const DEAD_ZONE_RIGHT = VIEW_W * 2 / 3;
const ANIMATION_SIZE = 32 * 2;

// ========== 天赋 & 成就 ==========
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

// ========== 十字架 ==========
let hasCross = false;
let crossHealTimer = 0;
let crossCooldownTimer = 0;
const CROSS_HEAL_INTERVAL = 1000;
const CROSS_HEAL_AMOUNT = 2;
const CROSS_HP_BONUS_RATIO = 0.1;
const CROSS_SAVE_COOLDOWN = 10000;
let crossProtectionAvailable = true;

// ========== 小丑面具 ==========
let hasClownMask = false;
let clownMaskDamageTimer = 0;
const CLOWN_MASK_HP_DRAIN_INTERVAL = 1000;
const CLOWN_MASK_HP_DRAIN_AMOUNT = 1;
const CLOWN_MASK_MULTIPLIER = 4;

// ========== 神父服（苏褡） ==========
let hasPriestRobes = false;

// ========== 状态常量 ==========
// 火焰
const FIRE_DAMAGE_BASE = 4;
const FIRE_DAMAGE_PER_LEVEL = 2;
const FIRE_DECAY_INTERVAL = 3000;

// 减速/冰冻
const SLOW_DECAY_INTERVAL = 3000;
const FREEZE_DURATION = 2;
const SLOW_BASE = 0.15;
const SLOW_PER_LEVEL = 0.05;
const FREEZE_DAMAGE_BONUS = 0.2;

// 电离子
const LIGHTNING_DAMAGE_BASE = 5;
const LIGHTNING_DAMAGE_PER_LEVEL = 5;
const LIGHTNING_INTERVAL_BASE = 2000;
const LIGHTNING_INTERVAL_PER_LEVEL = 500;
const LIGHTNING_DECAY_INTERVAL = 8000;
const LIGHTNING_BONUS_MULTIPLIER = 2;

// 黑洞
const BLACKHOLE_DAMAGE_INTERVAL = 1000;
const BLACKHOLE_ATTRACT_STRENGTH = 0.4;

// 虚弱
const WEAK_DECAY_INTERVAL = 3000;
const WEAK_MAX_LEVEL = 3;
const WEAK_SPEED_REDUCTION_PER_LEVEL = 0.1;
const WEAK_DAMAGE_REDUCTION_PER_LEVEL = 0.2;

// ========== 神父服被动效果常量 ==========
const PRIEST_PRAY_CHANCE = 0.07;          // 祈祷免疫概率 7%
const PRIEST_PRAY_BOSS_BONUS = 0.05;     // Boss战额外 5%
const PRIEST_PREACH_CHANCE = 0.04;       // 说教概率 4%
const PRIEST_PREACH_MASKED = 0.02;       // 戴面具说教概率 2%
const PRIEST_MASS_CHANCE = 0.15;         // 弥撒概率 15%
const PRIEST_MASS_MASKED = 0.10;         // 戴面具弥撒概率 10%
const PRIEST_PREACH_DURATION = 4000;     // 僵直 4 秒
const PRIEST_MASS_DURATION = 10000;      // 魅惑 10 秒
const PRIEST_BOSS_SKIP_CHANCE = 0.02;    // Boss跳过回合概率 2%
const PRIEST_CHARM_SPEED_MIN = 0.7;      // 魅惑攻速下限 70%
const PRIEST_CHARM_SPEED_MAX = 0.9;      // 魅惑攻速上限 90%

// 状态标志位（使用位掩码）
const STATE_FLAGS = {
    NONE: 0,
    CHARMED: 1 << 0,      // 1
    BURNING: 1 << 1,      // 2
    FROZEN: 1 << 2,       // 4
    SLOWED: 1 << 3,       // 8
    LIGHTNING: 1 << 4,    // 16
    BLACKHOLE: 1 << 5,    // 32
    WEAKENED: 1 << 6,     // 64
    STUNNED: 1 << 7,      // 128 (僵直)
};

// 阵营枚举
const CAMP = {
    ENEMY: 0,
    ALLY: 1,
};

// 状态名称映射
const STATE_NAMES = {
    1: 'Charm',
    2: 'Flame',
    4: 'Freeze',
    8: 'Slow',
    16: 'Ion',
    32: 'Black Hole',
    64: 'Weaken',
    128: 'Stun'
};

// ========== 角色系统（黑屋+监狱） ==========
let currentCharacter = 'ava';
let characterUnlocked = false;
const CHARACTERS = {
    ava: {
        name: 'Ava', color: '#ffffff', id: 'ava',
        level: 1, exp: 0,
        potionAtkMult: 1.0, potionSkillMult: 1.0,
        savedWeapon: null, savedEquipSlots: null
    },
    bl: {
        name: 'Bl', color: '#44aaff', id: 'bl',
        level: 1, exp: 0,
        potionAtkMult: 1.0, potionSkillMult: 1.0,
        savedWeapon: null, savedEquipSlots: null
    }
};
// 经验物品（独立资源，不占背包/快捷栏格子）
const BASIC_EXP_VALUE = 50;   // 基础经验 = 50 EXP
const MID_EXP_VALUE = 100;    // 中等经验 = 100 EXP
const EXP_CAP_LEVEL = 50;     // 等级上限 50
const HP_POTION_HEAL = 30;
let basicExp = 0, midExp = 0;
// 升级所需经验：数字公式（递增），50 级封顶
function expToNext(level) { return Math.floor(50 * Math.pow(Math.max(1, level), 1.5)); }
function getCurrentChar() { return CHARACTERS[currentCharacter] || CHARACTERS.ava; }
function addExpToChar(charId, amount) {
    const ch = CHARACTERS[charId] || CHARACTERS.ava;
    ch.exp += amount;
    while (ch.level < EXP_CAP_LEVEL && ch.exp >= expToNext(ch.level)) {
        ch.exp -= expToNext(ch.level);
        ch.level++;
        if (typeof checkAchievements === 'function') checkAchievements();
    }
    if (ch.level >= EXP_CAP_LEVEL) ch.exp = Math.min(ch.exp, expToNext(ch.level) - 1);
}
// 挂载到 window
window.hasCross = hasCross;
window.crossHealTimer = crossHealTimer;
window.crossCooldownTimer = crossCooldownTimer;
window.crossProtectionAvailable = crossProtectionAvailable;
window.hasClownMask = hasClownMask;
window.clownMaskDamageTimer = clownMaskDamageTimer;
window.damageNumbers = damageNumbers;
window.currentCharacter = currentCharacter;
window.characterUnlocked = characterUnlocked;
window.basicExp = basicExp;
window.midExp = midExp;
window.getCurrentChar = getCurrentChar;
window.expToNext = expToNext;
window.addExpToChar = addExpToChar;
window.BASIC_EXP_VALUE = BASIC_EXP_VALUE;
window.MID_EXP_VALUE = MID_EXP_VALUE;
window.hasPriestRobes = hasPriestRobes;
window.STATE_FLAGS = STATE_FLAGS;
window.CAMP = CAMP;

let _lastUpdateTime = 0;
window._lastUpdateTime = _lastUpdateTime;

// ---------- 更新玩家最大生命值 ----------
function updatePlayerMaxHp() {
    let bonus = (talentMaxHpBonus || 0);
    if (window.hasCross) {
        bonus += Math.floor(PLAYER_MAX_HP_BASE * CROSS_HP_BONUS_RATIO);
    }
    let baseMax = PLAYER_MAX_HP_BASE + bonus;
    if (window.hasClownMask) {
        baseMax *= CLOWN_MASK_MULTIPLIER;
    }
    currentMaxHp = baseMax;
    if (playerHP > currentMaxHp) playerHP = currentMaxHp;
}

window.updatePlayerMaxHp = updatePlayerMaxHp;