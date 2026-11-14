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
const BOSS_MAX_HP = 1500;
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
const BOSS_TURN_DURATION = 900;
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

// ========== 从 localStorage 读取装备状态 ==========
let playerLevel = 1;
let currentWeaponId = null;
let hasCross = false;
let hasClownMask = false;

try {
    const saved = localStorage.getItem('black_room_prison_save');
    if (saved) {
        const data = JSON.parse(saved);
        playerLevel = data.level || 1;
        currentWeaponId = data.currentWeapon || null;
        hasCross = data.hasCross || false;
        hasClownMask = data.hasClownMask || false;
        console.log('[BOSS战] 读取装备状态:', { currentWeaponId, hasCross, hasClownMask, playerLevel });
    }
} catch(e) {
    console.warn('[BOSS战] 读取装备状态失败', e);
}

// 从 URL 获取等级（优先）
const urlParams = new URLSearchParams(window.location.search);
const lvFromUrl = parseInt(urlParams.get('lv'));
if (lvFromUrl > 0) playerLevel = Math.max(1, Math.min(20, lvFromUrl));

// ========== BOSS战装备效果状态 ==========
// 火焰法杖持续伤害
let fireWandDamageTimer = 0;
const FIRE_WAND_DAMAGE_INTERVAL = 1000;
const FIRE_WAND_DAMAGE_PER_TICK = 2;

// 冰霜之刃减速效果
let frostBladeSlowActive = false;
const FROST_BLADE_SLOW_PERCENT = 0.2;

// 暗影匕首虚弱效果
let shadowDaggerWeakActive = false;
const SHADOW_DAGGER_WEAK_ATTACK_SPEED = 0.1;
const SHADOW_DAGGER_WEAK_DAMAGE_REDUCTION = 0.2;

// 雷霆锤暴击
let thunderHammerCritActive = false;
const THUNDER_HAMMER_CRIT_CHANCE = 0.5;
const THUNDER_HAMMER_CRIT_MULTIPLIER = 2;

// 十字架BOSS战状态
let crossProtectionUsed = false;
let crossHealTimer = 0;
const CROSS_HEAL_INTERVAL = 1000;
const CROSS_HEAL_AMOUNT = 2;

// 小丑面具BOSS战状态
let clownMaskDamageTimer = 0;
const CLOWN_MASK_DRAIN_INTERVAL = 1000;
const CLOWN_MASK_DRAIN_AMOUNT = 1;
const CLOWN_MASK_BOSS_MULTIPLIER = 2; // 200% = ×2

// 导出给 game.js 使用
window.bossConfig = {
    playerLevel,
    currentWeaponId,
    hasCross,
    hasClownMask,
    fireWandDamageTimer,
    FIRE_WAND_DAMAGE_INTERVAL,
    FIRE_WAND_DAMAGE_PER_TICK,
    frostBladeSlowActive,
    FROST_BLADE_SLOW_PERCENT,
    shadowDaggerWeakActive,
    SHADOW_DAGGER_WEAK_ATTACK_SPEED,
    SHADOW_DAGGER_WEAK_DAMAGE_REDUCTION,
    thunderHammerCritActive,
    THUNDER_HAMMER_CRIT_CHANCE,
    THUNDER_HAMMER_CRIT_MULTIPLIER,
    crossProtectionUsed,
    crossHealTimer,
    CROSS_HEAL_INTERVAL,
    CROSS_HEAL_AMOUNT,
    clownMaskDamageTimer,
    CLOWN_MASK_DRAIN_INTERVAL,
    CLOWN_MASK_DRAIN_AMOUNT,
    CLOWN_MASK_BOSS_MULTIPLIER
};