// 基础.js - 常量、全局变量、DOM元素获取

// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const victoryMessage = document.getElementById('victoryMessage');

// 状态面板元素
const statusPanel = document.getElementById('statusPanel');
const panelLevel = document.getElementById('panelLevel');
const panelExp = document.getElementById('panelExp');
const panelGold = document.getElementById('panelGold');
const panelKills = document.getElementById('panelKills');
const panelChunk = document.getElementById('panelChunk');

// 世界常量
const WORLD_WIDTH = 8000;
const WORLD_HEIGHT = 400;
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 400;

const CHUNK_SIZE = 400;
const CHUNK_COUNT = WORLD_WIDTH / CHUNK_SIZE; // 20

const DEAD_ZONE_LEFT = VIEW_WIDTH / 3;
const DEAD_ZONE_RIGHT = VIEW_WIDTH * 2 / 3;

// 物理常量
const GRAVITY = 0.4;
const JUMP_STRENGTH = -8;
const GROUND_OFFSET = 10;
const STANDING_HEIGHT = 30;
const DUCKING_HEIGHT = 15;

// 敌人常量
const MAX_ENEMIES_TOTAL = 15;
const ENEMY_SIZE = 30;
const ENEMY_SPEED = 1.2;
const ENEMY_MAX_HP = 50;

// 攻击常量
const ATTACK_DAMAGE = 10;
const ATTACK_DURATION = 200;
const ATTACK_RANGE = 20;
const STUN_DURATION = 12;

// 砖头常量
const BRICK_WIDTH = 20;
const BRICK_HEIGHT = 12;
const BRICK_SPEED = 6;
const BRICK_DAMAGE = 50;
const BRICK_BACK_OFFSET = 30;
const BRICK_GRAVITY = 0.05;

// 金币经验
let gold = 0;
let exp = 0;
let level = 1;
const EXP_PER_LEVEL = 100;

// 胜利标志
let victory = false;

// 游戏结束标志
let gameOver = false;

// 面板可见标志
let panelVisible = false;

// 摄像机
let cameraX = 0;

// 玩家对象（先声明，稍后在玩家属性.js中初始化）
let player = {};

// 敌人数组
let enemies = [];

// 投射物数组
let projectiles = [];

// 砖头预览相关
let charging = false;
let previewBrick = {
    worldX: 0,
    worldY: 0,
    angle: 0,
    active: false
};
let mouseScreenX = 0, mouseScreenY = 0;

// 杀敌数
let killCount = 0;

// 按键状态
let leftPressed = false, rightPressed = false, jumpUsed = false, shiftPressed = false, downPressed = false;

// 装饰物（稍后初始化）
const DECORATIONS = [];

// 刷新点相关（稍后初始化）
const SPAWN_POINTS = [];
let chunkSpawnPoints;
let chunkLastSpawn;

// 右键抛砖CD
const BRICK_CD = 5000; // 5秒
let lastBrickTime = 0; // 右键砖头最后使用时间

// 穿刺技能常量
const PIERCE_CD = 15000;          // 15秒
const PIERCE_BASE_COUNT = 3;      // 基础穿透数
const PIERCE_MAX_COUNT = 8;       // 最大穿透数
const PIERCE_CHARGE_RATE = 1;     // 每秒增加穿透数
const PIERCE_FINAL_DAMAGE = 200;  // 最后一名敌人伤害
const PIERCE_PASS_DAMAGE = 20;    // 沿途敌人伤害
const PIERCE_WIDTH = 5;           // 攻击物宽度
const PIERCE_HEIGHT = 8;          // 攻击物高度（比蹲下矮）
const PIERCE_SPEED = 10;          // 移动速度

let lastPierceTime = 0;           // 穿刺最后使用时间
let pierceCharging = false;       // 是否正在蓄力
let pierceStartTime = 0;          // 开始蓄力时间
let pierceProjectile = null;      // 当前存在的穿刺攻击物

// ---------- BOSS相关常量 ----------
const BOSS_SIZE = 200;                // BOSS边长
const BOSS_HP = 1000;                 // BOSS总血量（改为1000）
const BOSS_X = WORLD_WIDTH - BOSS_SIZE; // 最右侧
const BOSS_Y = WORLD_HEIGHT - BOSS_SIZE - GROUND_OFFSET; // 站在地面

// 玩家血量
const PLAYER_MAX_HP = 100;
let playerHP = PLAYER_MAX_HP;

// 激光技能常量
const LASER_DAMAGE = 10;
const LASER_WARNING_TIME = 1000;      // 预警时间（1秒）
const LASER_ACTIVE_TIME = 500;        // 伤害持续时间（0.5秒）
const LASER_COOLDOWN = 5000;          // 两次激光间隔（毫秒）
const LASER_DAMAGE_INTERVAL = 100;     // 激光伤害间隔（0.1秒）

// BOSS对象
let boss = null;                      // 初始为null，在动态.js中创建

// 激光对象
let laser = {
    state: 'idle',                    // 'idle', 'warning', 'active'
    x: 0,                             // 激光水平位置（世界坐标）
    startTime: 0,                     // 状态开始时间
    heightFactor: 0,                  // 动画进度（0-1）
    lastDamageTime: 0                 // 上次造成伤害的时间
};

// 游戏结束信息（用于绘制）
let gameOverMessage = '';

// 激光上次发射时间
let lastLaserTime = 0;

// ---------- BOSS对话框相关 ----------
let showBossDialog = false;           // 是否显示BOSS对话框
let bossDialogContent = '';           // 对话框内容
let bossDialogEndTime = 0;            // 对话框消失时间
const BOSS_DIALOG_DURATION = 3000;    // 对话框显示3秒