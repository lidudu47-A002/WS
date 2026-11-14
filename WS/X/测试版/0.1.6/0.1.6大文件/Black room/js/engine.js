// ---------- 常量 ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
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

const CHUNK_SIZE = 400;
const VIEW_W = 800, VIEW_H = 400;
const WORLD_H = 400;
const MAP_CHUNKS = 20;
let WORLD_W = MAP_CHUNKS * CHUNK_SIZE;

const DEAD_ZONE_LEFT = VIEW_W / 3;
const DEAD_ZONE_RIGHT = VIEW_W * 2 / 3;

const GRAVITY = 0.4;
const JUMP_POWER = -8;
const GROUND_Y_OFFSET = 10;
const STAND_H = 30, DUCK_H = 15;
const ATK_DUR = 200;
const ATK_RANGE = 20;
const STUN_DUR = 12;

const MAX_ENEMY = 15;
const ENEMY_W = 30, ENEMY_H = 30;
const ENEMY_SPD = 1.2;
const ENEMY_HP = 50;

const BASE_ATTACK_DAMAGE = 10;
const BASE_BRICK_DAMAGE = 50;
const BASE_PIERCE_PASS = 20;
const BASE_PIERCE_FINAL_ADD = 180;

const BRICK_W = 20, BRICK_H = 12;
const BRICK_SPD = 6;
const BRICK_BACK = 30;
const BRICK_GRAV = 0.05;

const PIERCE_CD = 15000;
const PIERCE_BASE = 3;
const PIERCE_MAX = 8;
const PIERCE_CHARGE_RATE = 1;
const PIERCE_W = 5, PIERCE_H = 8;
const PIERCE_SPD = 10;

const BOSS_SIZE = 200;
const BOSS_HP = 1000;
const BOSS_SPEED = 1.5;
let BOSS_X = WORLD_W - BOSS_SIZE;
let BOSS_Y = WORLD_H - BOSS_SIZE - GROUND_Y_OFFSET;

const PLAYER_MAX_HP = 100;
let playerHP = PLAYER_MAX_HP;
let gold = 0, exp = 0, level = 1, killCount = 0;
const EXP_PER_LV = 100;
let normalAttackMult = 1.0;
let skillDamageMult = 1.0;

let victory = false, gameOver = false, panelVisible = false;
let cameraX = 0;

let enemies = [];
let projectiles = [];
let boss = null;
let pierceProjectile = null;

let charging = false;
let previewBrick = { worldX: 0, worldY: 0, angle: 0, active: false };
let mouseScreenX = 0, mouseScreenY = 0;

let left = false, right = false, jumpUsed = false, shiftDown = false, arrowDown = false;

// 壁灯装饰
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

let saveStarImage = null;
const ANIMATION_SCALE = 2;
const ANIMATION_SIZE = 32 * ANIMATION_SCALE;
function loadSaveStarImage() {
    const img = new Image();
    img.src = '素材/存档点.gif';
    img.onload = () => { saveStarImage = img; };
    img.onerror = () => { console.warn('未找到存档点图片'); };
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

function spawnEnemyInChunk(chunkIdx) {
    let pts = chunkSpawnPoints[chunkIdx];
    if (!pts.length) return false;
    let sx = pts[Math.floor(Math.random()*pts.length)];
    let sy = WORLD_H - ENEMY_H - GROUND_Y_OFFSET;
    enemies.push({
        x: sx, y: sy, w: ENEMY_W, h: ENEMY_H,
        hp: ENEMY_HP, stun: 0, color: '#ff0000',
        hitFlash: 0
    });
    return true;
}

let player = {
    x: 0, y: 0, w: 30, h: STAND_H,
    vx: 0, vy: 0, facing: 1,
    attacking: false, attackStart: 0,
    visualOffX: 0, jumpsLeft: 2
};
function getGroundY() { return WORLD_H - player.h - GROUND_Y_OFFSET; }
player.y = getGroundY();

function updatePanelUI() {
    let curChunk = Math.floor((player.x + player.w/2) / CHUNK_SIZE);
    panelLevel.innerText = level;
    panelExp.innerText = `${exp}/${EXP_PER_LV}`;
    panelGold.innerText = gold;
    panelKills.innerText = killCount;
    panelChunk.innerText = curChunk;
    panelAtk.innerText = getAttackDamage();
    panelMult.innerText = `x${getSkillMultiplier().toFixed(2)}`;
}
function addKillReward() {
    gold += Math.floor(Math.random() * 5) + 1;
    exp += Math.floor(Math.random() * 5) + 1;
    while (exp >= EXP_PER_LV) { exp -= EXP_PER_LV; level++; }
    if (panelVisible) updatePanelUI();
}
function getAttackDamage() {
    let base = BASE_ATTACK_DAMAGE + (level - 1) * 5;
    return Math.floor(base * normalAttackMult);
}
function getSkillMultiplier() {
    return (1 + (level - 1) * 0.2) * skillDamageMult;
}
function getBrickDamage() { return Math.floor(BASE_BRICK_DAMAGE * getSkillMultiplier()); }
function getPiercePassDamage() { return Math.floor(BASE_PIERCE_PASS * getSkillMultiplier()); }
function getPierceFinalAdd() { return Math.floor(BASE_PIERCE_FINAL_ADD * getSkillMultiplier()); }

function doSave(now) {
    if (now - lastSaveTime < SAVE_COOLDOWN) return false;
    lastSaveTime = now;
    savedData = { hp: playerHP, worldX: player.x, gold, exp, level, kills: killCount, normalAttackMult, skillDamageMult };
    hasSave = true;
    playerHP = PLAYER_MAX_HP;
    saveMsgDiv.style.display = 'block';
    setTimeout(() => saveMsgDiv.style.display = 'none', 1500);
    return true;
}
function respawn() {
    if (!hasSave) return false;
    playerHP = savedData.hp;
    player.x = savedData.worldX;
    player.y = getGroundY();
    player.vy = 0;
    player.jumpsLeft = 2;
    gold = savedData.gold;
    exp = savedData.exp;
    level = savedData.level;
    killCount = savedData.kills;
    normalAttackMult = savedData.normalAttackMult;
    skillDamageMult = savedData.skillDamageMult;
    projectiles = [];
    pierceProjectile = null;
    cameraX = Math.max(0, Math.min(player.x - VIEW_W/2, WORLD_W - VIEW_W));
    respawnMsgDiv.style.display = 'block';
    setTimeout(() => respawnMsgDiv.style.display = 'none', 2000);
    if (panelVisible) updatePanelUI();
    return true;
}

function rectCollide(a, b) { return !(b.x >= a.x + a.w || b.x + b.w <= a.x || b.y >= a.y + a.h || b.y + b.h <= a.y); }
function brickHitEnemy(b, e) {
    let cx = b.x + b.w/2, cy = b.y + b.h/2;
    let r = Math.hypot(b.w, b.h)/2;
    let ex = Math.max(e.x, Math.min(cx, e.x+e.w));
    let ey = Math.max(e.y, Math.min(cy, e.y+e.h));
    let dx = cx - ex, dy = cy - ey;
    return dx*dx + dy*dy < r*r;
}
function updateCam() {
    let target = cameraX;
    let psx = player.x - cameraX;
    if (psx < DEAD_ZONE_LEFT) target = player.x - DEAD_ZONE_LEFT;
    else if (psx > DEAD_ZONE_RIGHT) target = player.x - DEAD_ZONE_RIGHT;
    target = Math.min(Math.max(0, target), WORLD_W - VIEW_W);
    cameraX += (target - cameraX)*0.1;
    cameraX = Math.min(Math.max(0, cameraX), WORLD_W - VIEW_W);
}

function createBoss() {
    boss = {
        x: WORLD_W - BOSS_SIZE, y: WORLD_H - BOSS_SIZE - GROUND_Y_OFFSET,
        w: BOSS_SIZE, h: BOSS_SIZE, hp: BOSS_HP, maxHp: BOSS_HP,
        colors: Array(16).fill('#ff0000'), colorIdx: 0, nextTime: 0, interval: 100, speed: 0
    };
}
createBoss();

// 激光系统
let lasers = []; let lastLaser = 0;
const LASER_DMG = 10, LASER_WARN = 1000, LASER_ACT = 500, LASER_CD = 5000, LASER_INTERVAL = 100;
function getSlantLaserEndpoints(centerX, angle) {
    const crossY = WORLD_H / 2;
    const k = Math.tan(angle);
    if (Math.abs(k) < 1e-6) return { startX: centerX, endX: centerX };
    const startX = centerX - crossY / k;
    const endX = centerX + (WORLD_H - crossY) / k;
    return { startX, endX };
}
function updateLaser(now) {
    if (!boss) return;
    const bossCenter = boss.x + boss.w/2, playerCenter = player.x + player.w/2;
    const distance = Math.abs(bossCenter - playerCenter);
    const isActive = (distance < CHUNK_SIZE);
    if (isActive && lasers.length === 0 && now - lastLaser >= LASER_CD) {
        const targetX = player.x + player.w/2;
        lasers = [
            { state: 'warn', startTime: now, x: targetX, angle: 0, factor: 0, lastDamage: 0, blink: 0 },
            { state: 'warn', startTime: now, x: targetX, angle: -Math.PI/6, factor: 0, lastDamage: 0, blink: 0 },
            { state: 'warn', startTime: now, x: targetX, angle: Math.PI/6, factor: 0, lastDamage: 0, blink: 0 }
        ];
        lastLaser = now;
    }
    for (let i = 0; i < lasers.length; i++) {
        const l = lasers[i];
        if (l.state === 'warn') {
            l.blink = (l.blink + 0.1) % 1;
            if (now - l.startTime >= LASER_WARN) { l.state = 'act'; l.startTime = now; l.factor = 0; }
        } else if (l.state === 'act') {
            const elapsed = now - l.startTime;
            if (elapsed >= LASER_ACT) { lasers.splice(i,1); i--; continue; }
            l.factor = Math.min(1, elapsed / LASER_ACT);
            if (now - l.lastDamage >= LASER_INTERVAL) {
                let startX, endX;
                if (l.angle === 0) { startX = l.x; endX = l.x; }
                else { const eps = getSlantLaserEndpoints(l.x, l.angle); startX = eps.startX; endX = eps.endX; }
                const startY = 0, endY = WORLD_H;
                const px = player.x + player.w/2, py = player.y + player.h/2;
                const ax = px - startX, ay = py - startY, bx = endX - startX, by = endY - startY;
                const dot = ax * bx + ay * by, len2 = bx * bx + by * by;
                let t = (len2 > 0) ? dot / len2 : 0; t = Math.max(0, Math.min(1, t));
                const projX = startX + t * bx, projY = startY + t * by;
                if (Math.hypot(px - projX, py - projY) < 15) {
                    playerHP = Math.max(0, playerHP - LASER_DMG);
                    lasers.splice(i,1); i--;
                } else l.lastDamage = now;
            }
        }
    }
}

let lastPierce = 0, pierceCharge = false, pierceStart = 0;
let lastBrick = 0; const BRICK_CD = 5000;
function performAttack() {
    let attackDamage = getAttackDamage();
    let rect = { x: player.facing===1 ? player.x+player.w : player.x-ATK_RANGE, y: player.y, w: ATK_RANGE, h: player.h };
    for (let e of enemies) {
        if (rectCollide(rect, e)) { e.hp -= attackDamage; e.stun = STUN_DUR; e.hitFlash = 5; }
    }
    if (boss && rectCollide(rect, boss)) boss.hp -= attackDamage;
}

// ---------- 权限检查 ----------
function canUserSave() {
    const currentUser = sessionStorage.getItem('ws_current_user');
    if (!currentUser) return true;
    try {
        const accounts = JSON.parse(localStorage.getItem('ws_accounts') || '{}');
        const userData = accounts[currentUser];
        if (userData && userData.canSave === false) {
            return false;
        }
    } catch (e) {}
    return true;
}

// 存档导入导出
function importSaveFromObject(saveObj) {
    playerHP = saveObj.hp;
    gold = saveObj.gold;
    level = saveObj.level;
    exp = saveObj.exp;
    killCount = saveObj.kills;
    player.x = saveObj.x;
    player.y = saveObj.y;
    normalAttackMult = saveObj.normalAttackMult || 1.0;
    skillDamageMult = saveObj.skillDamageMult || 1.0;
    hasSave = saveObj.hasSavePoint || false;
    if (hasSave && saveObj.savedData) savedData = saveObj.savedData;
    enemies = [];
    if (saveObj.enemies) {
        saveObj.enemies.forEach(eData => {
            enemies.push({
                x: eData.x, y: eData.y, w: ENEMY_W, h: ENEMY_H,
                hp: eData.hp, stun: eData.stun, color: '#ff0000', hitFlash: 0
            });
        });
    }
    if (saveObj.boss) {
        boss = {
            x: saveObj.boss.x, y: saveObj.boss.y, w: BOSS_SIZE, h: BOSS_SIZE,
            hp: saveObj.boss.hp, maxHp: saveObj.boss.maxHp,
            colors: saveObj.boss.colors || Array(16).fill('#ff0000'),
            colorIdx: saveObj.boss.colorIdx || 0,
            nextTime: saveObj.boss.nextTime || 0,
            interval: saveObj.boss.interval || 100,
            speed: saveObj.boss.speed || 0
        };
    } else boss = null;
    player.vy = 0; player.jumpsLeft = 2; projectiles = []; pierceProjectile = null; lasers = []; lastLaser = 0;
    cameraX = Math.max(0, Math.min(player.x - VIEW_W/2, WORLD_W - VIEW_W));
    updatePanelUI();
}

function exportSave() {
    if (!canUserSave()) {
        alert('管理员已禁止你使用存档功能');
        return;
    }
    const enemiesData = enemies.map(e => ({ x: e.x, y: e.y, hp: e.hp, stun: e.stun }));
    let bossData = null;
    if (boss) {
        bossData = {
            x: boss.x, y: boss.y, hp: boss.hp, maxHp: boss.maxHp,
            colors: boss.colors, colorIdx: boss.colorIdx, nextTime: boss.nextTime,
            interval: boss.interval, speed: boss.speed
        };
    }
    const saveObj = {
        map: 'black',
        hp: playerHP, gold, level, exp, kills: killCount,
        x: player.x, y: player.y,
        normalAttackMult, skillDamageMult,
        hasSavePoint: hasSave,
        savedData: hasSave ? savedData : null,
        enemies: enemiesData,
        boss: bossData
    };
    const jsonStr = JSON.stringify(saveObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'black room_save.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    saveMsgDiv.style.display = 'block';
    setTimeout(() => saveMsgDiv.style.display = 'none', 1500);
}

function importSave(file) {
    if (!canUserSave()) {
        alert('管理员已禁止你使用存档功能');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const saveObj = JSON.parse(e.target.result);
            importSaveFromObject(saveObj);
            loadMsgDiv.style.display = 'block';
            setTimeout(() => loadMsgDiv.style.display = 'none', 2000);
        } catch (err) { alert('存档损坏'); }
    };
    reader.readAsText(file);
}

function triggerLoad() {
    if (!canUserSave()) {
        alert('管理员已禁止你使用存档功能');
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => { if (e.target.files[0]) importSave(e.target.files[0]); };
    input.click();
}

function initFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    const loadParam = urlParams.get('load');
    if (dataParam) {
        try {
            const decoded = JSON.parse(atob(dataParam));
            playerHP = decoded.hp; gold = decoded.gold; level = decoded.level; exp = decoded.exp; killCount = decoded.kills;
            normalAttackMult = decoded.normalAttackMult || 1.0; skillDamageMult = decoded.skillDamageMult || 1.0;
        } catch(e) {}
    }
    if (loadParam) {
        try {
            const jsonStr = decodeURIComponent(escape(window.atob(loadParam)));
            const saveObj = JSON.parse(jsonStr);
            importSaveFromObject(saveObj);
            loadMsgDiv.style.display = 'block';
            setTimeout(() => loadMsgDiv.style.display = 'none', 2000);
        } catch(e) {}
    }
    updatePanelUI();
}

function update(now) {
    if (victory || gameOver) return;
    for (let sp of savePoints) if (player.x + player.w > sp.x && player.x < sp.x + sp.width) { doSave(now); break; }
    if (left && !right) player.facing = -1; else if (right && !left) player.facing = 1;
    let dx = 0; if (left) dx -= 2.8; if (right) dx += 2.8;
    player.x = Math.min(Math.max(0, player.x + dx), WORLD_W - player.w);
    player.vy += GRAVITY; player.y += player.vy;
    let grounded = false;
    if (player.y > getGroundY()) { player.y = getGroundY(); player.vy = 0; grounded = true; }
    if (player.y < 0) { player.y = 0; player.vy = 0; }
    if (grounded || player.y >= getGroundY()-0.001) { jumpUsed = false; player.jumpsLeft = 2; }
    let duck = shiftDown || arrowDown;
    let targetH = (grounded && duck) ? DUCK_H : STAND_H;
    if (targetH !== player.h) { let oldBottom = player.y + player.h; player.h = targetH; if (grounded) player.y = getGroundY(); else player.y = oldBottom - player.h; }
    if (player.attacking) {
        let elapsed = now - player.attackStart, prog = Math.min(elapsed / ATK_DUR, 1);
        let off = player.w * 0.5 * Math.sin(prog * Math.PI);
        player.visualOffX = player.facing * off;
        if (prog >= 1) { player.attacking = false; player.visualOffX = 0; }
    } else player.visualOffX = 0;

    let curChunk = Math.floor((player.x + player.w/2) / CHUNK_SIZE);
    for (let ch = 0; ch < MAP_CHUNKS; ch++) {
        let dist = Math.abs(ch - curChunk), interval = 0;
        if (dist === 0) interval = 4000; else if (dist === 1) interval = 8000; else if (dist === 2) interval = 10000;
        if (!interval) continue;
        if (enemies.length < MAX_ENEMY && now - chunkLastSpawn[ch] >= interval) {
            if (spawnEnemyInChunk(ch)) chunkLastSpawn[ch] = now;
        }
    }

    if (boss) {
        const bossCenter = boss.x + boss.w/2, playerCenter = player.x + player.w/2;
        const distance = Math.abs(bossCenter - playerCenter);
        if (distance < CHUNK_SIZE) {
            if (playerCenter > bossCenter) boss.speed = BOSS_SPEED;
            else if (playerCenter < bossCenter) boss.speed = -BOSS_SPEED;
            else boss.speed = 0;
        } else boss.speed = 0;
        boss.x += boss.speed; boss.x = Math.min(Math.max(0, boss.x), WORLD_W - boss.w);
    }

    for (let i=projectiles.length-1; i>=0; i--) {
        let b = projectiles[i]; if (b.isEnemy) continue;
        b.vy += BRICK_GRAV; b.x += b.vx; b.y += b.vy;
        if (b.x < -50 || b.x > WORLD_W+50 || b.y < -50 || b.y > WORLD_H+50) { projectiles.splice(i,1); continue; }
        let hit = false, brickDamage = getBrickDamage();
        for (let e of enemies) if (brickHitEnemy(b, e)) { e.hp -= brickDamage; e.stun = STUN_DUR; e.hitFlash = 5; hit = true; break; }
        if (!hit && boss && brickHitEnemy(b, boss)) { boss.hp -= brickDamage; hit = true; }
        if (hit) projectiles.splice(i,1);
    }

    for (let e of enemies) {
        if (e.stun > 0) e.stun--; if (e.hitFlash > 0) e.hitFlash--;
        let pc = player.x + player.w/2, ec = e.x + e.w/2;
        if (pc > ec) e.x += ENEMY_SPD; else if (pc < ec) e.x -= ENEMY_SPD;
        e.x = Math.min(Math.max(0, e.x), WORLD_W - e.w);
    }

    if (pierceCharge && !pierceProjectile && now - lastPierce >= PIERCE_CD) {
        let chargeTime = (now - pierceStart) / 1000, cnt = PIERCE_BASE + Math.floor(chargeTime * PIERCE_CHARGE_RATE);
        cnt = Math.min(cnt, PIERCE_MAX);
        let px = player.x + player.w/2, py = player.y + player.h/2;
        let tx = mouseScreenX + cameraX, ty = mouseScreenY, dx = tx - px, dy = ty - py, len = Math.hypot(dx,dy);
        if (len > 0.001) {
            let nx = dx/len, ny = dy/len;
            pierceProjectile = {
                x: px - PIERCE_W/2, y: py - PIERCE_H/2, vx: nx*PIERCE_SPD, vy: ny*PIERCE_SPD,
                w: PIERCE_W, h: PIERCE_H, left: cnt, hitSet: new Set(), lastEnemy: null,
                passDamage: getPiercePassDamage(), finalAdd: getPierceFinalAdd()
            };
        }
        lastPierce = now; pierceCharge = false;
    }
    if (pierceProjectile) {
        let p = pierceProjectile; p.x += p.vx; p.y += p.vy;
        if (p.x < -50 || p.x > WORLD_W+50 || p.y < -50 || p.y > WORLD_H+50) { pierceProjectile = null; }
        else {
            for (let e of enemies) {
                if (p.hitSet.has(e)) continue;
                if (rectCollide({x:p.x,y:p.y,w:p.w,h:p.h}, e)) {
                    e.hp -= p.passDamage; e.stun = STUN_DUR; e.hitFlash = 5;
                    p.hitSet.add(e); p.left--; p.lastEnemy = e;
                    if (p.left <= 0) { if (p.lastEnemy) p.lastEnemy.hp -= p.finalAdd; pierceProjectile = null; break; }
                }
            }
        }
    }

    updateLaser(now);
    if (boss && now >= (boss.nextTime || 0)) {
        boss.nextTime = now + boss.interval;
        let cols = ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#4b0082','#8f00ff','#ffffff'];
        boss.colors[boss.colorIdx] = cols[Math.floor(Math.random()*cols.length)];
        boss.colorIdx = (boss.colorIdx+1) % 16;
    }

    let oldLen = enemies.length; enemies = enemies.filter(e => e.hp > 0);
    let killed = oldLen - enemies.length; if (killed > 0) { killCount += killed; for (let i=0;i<killed;i++) addKillReward(); }

    let allEntities = [player, ...enemies]; if (boss) allEntities.push(boss);
    const ITER = 12;
    for (let iter = 0; iter < ITER; iter++) {
        for (let i = 0; i < allEntities.length; i++) {
            for (let j = i+1; j < allEntities.length; j++) {
                let a = allEntities[i], b = allEntities[j];
                let overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
                let overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
                if (overlapX > 0 && overlapY > 0) {
                    let dx = overlapX / 2;
                    if (a.x < b.x) { a.x -= dx; b.x += dx; } else { a.x += dx; b.x -= dx; }
                }
            }
        }
        for (let e of allEntities) e.x = Math.min(Math.max(0, e.x), WORLD_W - e.w);
    }

    if (playerHP <= 0) { if (!respawn()) gameOver = true; }
    if (boss && boss.hp <= 0 && !victory) {
        victory = true;
        victoryMsgDiv.style.display = 'block';
        nextMapBtn.style.display = 'block';
        boss = null;
    }
    updateCam();
    if (panelVisible) updatePanelUI();
}

function loop(t) { update(t); draw(); requestAnimationFrame(loop); }