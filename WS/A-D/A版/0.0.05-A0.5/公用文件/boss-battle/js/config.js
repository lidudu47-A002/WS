// ============================================================
//  config.js — BOSS 战全局配置与状态（24×24 正方形方场 · 实时版）
//  公用文件/boss-battle 统一入口，场景由 ?scene=blackroom|prison 决定
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const victoryMsg = document.getElementById('victoryMsg');
const gameOverMsg = document.getElementById('gameOverMsg');
const victorySub = document.getElementById('victorySub');
const gameOverSub = document.getElementById('gameOverSub');
const returnBtn = document.getElementById('returnBtn');
const nextBtn = document.getElementById('nextBtn');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getViewW() { return canvas.width; }
function getViewH() { return canvas.height; }

// ---------------- URL 参数 ----------------
const urlParams = new URLSearchParams(window.location.search);
const SCENE_KEY = String(window.__SCENE__ || urlParams.get('scene') || 'blackroom').toLowerCase();
const lvFromUrl = parseInt(urlParams.get('lv'), 10);

// ---------------- 场景表 ----------------
const SCENES = {
    blackroom: {
        key: 'blackroom',
        bossName: '？ ？ ？',
        bossTitle: '它从黑屋深处站了起来',
        bossHp: 1500,
        bossImg: 'assets/boss.png',
        soulImg: '../assets/soul_yellow.png',
        orbImg: '../assets/orb.png',
        orbImg2: '../assets/orb.png',
        accent: '#ff3b30',
        accentSoft: '#ff8c42',
        musicName: '深室无名',
        musicNameEn: 'Nameless in the Deep',
        musicFile: '../../音乐/black room/Nameless in the Deep.mp3',
        fogTop: '#0a0710',
        fogBottom: '#1a0f22',
        wallTint: 'rgba(30, 16, 34, 0.55)',
        inventory: 'fixed',
        nextUrl: '../../../prison/prison.html?load=black',
        backUrl: '../../../Black room/Black room.html'
    },
    prison: {
        key: 'prison',
        bossName: '狱 卒 长',
        bossTitle: '铁链在等距的尽头拖响',
        bossHp: 1000,
        bossImg: 'assets/boss.png',
        soulImg: '../assets/soul_blue.png',
        orbImg: '../assets/orb_blue.png',
        orbImg2: '../assets/orb_blue.png',
        accent: '#3ea8ff',
        accentSoft: '#9fd8ff',
        musicName: '等距铁链',
        musicNameEn: 'Chains in Step',
        musicFile: '../../音乐/prison/Chains in Step.mp3',
        fogTop: '#050a12',
        fogBottom: '#0c1a2a',
        wallTint: 'rgba(14, 26, 40, 0.55)',
        inventory: 'prison',
        nextUrl: '../../../prison/prison.html',
        backUrl: '../../../prison/prison.html'
    }
};

const SCENE = SCENES[SCENE_KEY] || SCENES.blackroom;

// ---------------- 世界与角色常量 ----------------
const PLAYER_MAX_HP = 100;
const PLAYER_R = 0.42;             // 玩家碰撞半径（格）
const PLAYER_SPEED = 6.4;          // 格 / 秒
const DASH_SPEED = 15.5;           // 冲刺速度
const DASH_TIME = 0.17;            // 冲刺持续
const DASH_CD = 1.15;              // 冲刺冷却
const MELEE_RANGE = 2.15;          // 近战半径
const MELEE_ARC = Math.PI * 0.62;  // 近战扇角
const MELEE_CD = 0.42;
const SHOOT_CD = 0.30;
const BULLET_SPEED = 17;
const BOSS_R = 1.7;
const BOSS_SPEED = 1.15;
const POTION_HEAL = 20;

// ---------------- 受击延迟结算（DoT） ----------------
// 受到伤害 = TD，不立即扣血，改为在 1 秒内扣完
//   每秒扣血 DoT = TD，等价于“每 (1/TD) 秒扣 1 HP”
const DOT_TOTAL_SEC = 1;

// 单次 TD 对应的每秒扣血量
function dotRatePerSec(td) {
    return Math.max(1, td) / DOT_TOTAL_SEC;
}

// 该次 TD 完全扣完所需秒数
function dotDurationSec(td) {
    return DOT_TOTAL_SEC;
}

// ---------------- 运行状态 ----------------
let gameState = 'intro';        // intro / fight / win / lose
let introT = 0;
let fightTime = 0;

const CAM = { x: MAP.spawn.x, z: MAP.spawn.z, shakeX: 0, shakeY: 0 };

const player = {
    x: MAP.spawn.x, z: MAP.spawn.z, h: 0.6,
    vx: 0, vz: 0,
    dirX: 0, dirZ: -1,
    hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP,
    iframe: 0, dashT: 0, dashCd: 0,
    atkCd: 0, shootCd: 0, potionCd: 0,
    moving: false, walkPhase: 0,
    meleeFx: 0
};

const boss = {
    x: MAP.bossHome.x, z: MAP.bossHome.z, h: 1.0,
    hp: SCENE.bossHp, maxHp: SCENE.bossHp,
    r: BOSS_R,
    phase: 1, status: 'idle', statusT: 0, skillCd: 1.4,
    flash: 0, hurtT: 0, dead: false,
    dots: [], dotPending: 0,      // 待结算的 DoT 实例 / 待扣总血量
    targetX: MAP.bossHome.x, targetZ: MAP.bossHome.z,
    chargeDirX: 0, chargeDirZ: 0, floatT: 0
};

const bullets = [];          // 玩家能量弹
const eBullets = [];         // BOSS 弹幕
const blasters = [];         // 龙骨炮
const windmills = [];        // 风车激光
const particles = [];        // 粒子
const damageNumbers = [];

let hpPotions = 2;
let shake = 0;
let hitFlash = 0;
let msgText = '';
let msgTimer = 0;
let bossBarFlash = 0;

function showMsg(text, dur) {
    msgText = text;
    msgTimer = dur || 2.4;
}

// ---------------- 玩家装备（沿用存档） ----------------
let playerLevel = 1;
let currentWeaponId = null;
let hasCross = false;
let hasClownMask = false;

// 主游戏存档为短键压缩格式（level→lv、currentWeapon→cw、inventorySlots→is…），
// 这里做长短键兼容读取
function readSaveCompat() {
    let d = null;
    try {
        const raw = localStorage.getItem('black_room_prison_save');
        if (raw) d = JSON.parse(raw);
    } catch (e) {
        console.warn('[BOSS战] 存档解析失败', e);
        d = null;
    }
    if (!d || typeof d !== 'object') return null;
    const pick = function (longKey, shortKey) {
        if (d[longKey] !== undefined) return d[longKey];
        if (d[shortKey] !== undefined) return d[shortKey];
        return undefined;
    };
    const slots = pick('inventorySlots', 'is');
    let potions = 0;
    if (Array.isArray(slots)) {
        slots.forEach(function (it) {
            if (!it || typeof it !== 'object') return;
            const t = String(it.type !== undefined ? it.type : (it.t || ''));
            const c = it.count !== undefined ? it.count : (it.c !== undefined ? it.c : 1);
            if (t === 'hp' || /hp药水|hp_potion/i.test(t)) potions += (parseInt(c, 10) || 1);
        });
    }
    return {
        level: pick('level', 'lv') || 1,
        weapon: pick('currentWeapon', 'cw') || null,
        hasCross: !!pick('hasCross', 'hc'),
        hasClownMask: !!pick('hasClownMask', 'hcm'),
        potions: potions
    };
}

// 胜利后记录击败状态：
// - ws_boss_cleared：按场景记录，供主游戏阻止同一 BOSS 重复触发（不动主存档，避免污染）
// - bd（bossDefeated）：仅 prison 场景写入，供 prison.html 判定终局跳转 forest
function markBossDefeated() {
    // 1) 场景级击败记录
    try {
        let rec = {};
        const rawRec = localStorage.getItem('ws_boss_cleared');
        if (rawRec) {
            const p = JSON.parse(rawRec);
            if (p && typeof p === 'object') rec = p;
        }
        rec[SCENE.key] = true;
        localStorage.setItem('ws_boss_cleared', JSON.stringify(rec));
    } catch (e) {
        console.warn('[BOSS战] 写入场景击败记录失败', e);
    }
    // 2) 终局标记：黑屋胜利不写，否则 prison.html 会立刻跳到 forest，打断黑屋→监狱流程
    if (SCENE.key !== 'prison') return;
    try {
        const raw = localStorage.getItem('black_room_prison_save');
        if (!raw) return;
        const d = JSON.parse(raw);
        if (!d || typeof d !== 'object') return;
        d.bd = true;
        if (d.bossDefeated !== undefined) d.bossDefeated = true;
        localStorage.setItem('black_room_prison_save', JSON.stringify(d));
    } catch (e) {
        console.warn('[BOSS战] 写入击败标记失败', e);
    }
}

const SAVE = readSaveCompat();
if (SAVE) {
    playerLevel = SAVE.level || 1;
    currentWeaponId = SAVE.weapon || null;
    hasCross = SAVE.hasCross;
    hasClownMask = SAVE.hasClownMask;
}

if (lvFromUrl > 0) playerLevel = Math.max(1, Math.min(20, lvFromUrl));

// 背包药水（从存档 inventorySlots 统计 HP 药水）
if (SCENE.inventory === 'prison') {
    hpPotions = SAVE ? SAVE.potions : 0;
    if (!hpPotions) hpPotions = 2;
}

// ---------------- 装备数值 ----------------
const config = {
    playerLevel,
    currentWeaponId,
    hasCross,
    hasClownMask,
    FIRE_WAND_DAMAGE_INTERVAL: 1.0,
    FIRE_WAND_DAMAGE_PER_TICK: 2,
    CLOWN_MASK_DRAIN_INTERVAL: 1.0,
    CLOWN_MASK_DRAIN_AMOUNT: 1,
    CLOWN_MASK_BOSS_MULTIPLIER: 2,
    CROSS_HEAL_INTERVAL: 1.0,
    CROSS_HEAL_AMOUNT: 2,
    THUNDER_HAMMER_CRIT_CHANCE: 0.5,
    THUNDER_HAMMER_CRIT_MULTIPLIER: 2,
    FROST_BLADE_SLOW_PERCENT: 0.2,
    SHADOW_DAGGER_WEAK_DAMAGE_REDUCTION: 0.2,
    fireWandTimer: 0,
    clownMaskTimer: 0,
    crossHealTimer: 0,
    frostSlow: false,
    shadowWeak: false
};

// ---------------- 小工具 ----------------
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function dist2(ax, az, bx, bz) {
    const dx = ax - bx, dz = az - bz;
    return dx * dx + dz * dz;
}
function dist(ax, az, bx, bz) { return Math.sqrt(dist2(ax, az, bx, bz)); }
function norm(dx, dz) {
    const l = Math.sqrt(dx * dx + dz * dz) || 1;
    return { x: dx / l, z: dz / l };
}
