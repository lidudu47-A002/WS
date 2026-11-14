// ---------- 从 config 获取装备状态 ----------
const config = window.bossConfig || {};

console.log(`[BOSS战] 装备状态: 武器=${config.currentWeaponId || '无'}, 十字架=${config.hasCross}, 面具=${config.hasClownMask}, 等级=${config.playerLevel}`);

// ---------- 消息系统 ----------
let tempMsg = '';
let msgTimer = 0;
function showMsg(msg) {
    tempMsg = msg;
    msgTimer = 60;
}

// ---------- 决心图片 ----------
const soulYellowImg = new Image();
soulYellowImg.src = '../素材/A心（黄）.png';
let soulImgLoaded = false;
let soulImg = soulYellowImg;
soulYellowImg.onload = () => { soulImgLoaded = true; };
soulYellowImg.onerror = () => { console.warn('未找到 A心.png，使用默认绘制'); };

const returnBtn = document.getElementById('returnBtn');
const nextBtn = document.getElementById('nextBtn');

// ---------- 伤害数字 ----------
let damageNumbers = [];

// ---------- Sans 大风车 ----------
let windmillLasers = [];          // 存储所有激光叶片
let windmillTriggered = false;    // 是否已触发（防止重复生成）
let windmillScheduled = false;    // 本回合是否安排风车
const WINDMILL_COUNT = 8;         // 8 条激光
const WINDMILL_BASE_SPEED = 0.02; // rad/帧
const WINDMILL_DAMAGE = 5;
const WINDMILL_DAMAGE_INTERVAL = 500; // ms

// 覆盖 clearAllAttacks 以清空风车
const originalClearAllAttacks = window.clearAllAttacks;
window.clearAllAttacks = function() {
    if (originalClearAllAttacks) originalClearAllAttacks();
    windmillLasers = [];
};

// 战斗框
const BOX_MARGIN_X = 40;
function updateBoxRect() {
    const W = getViewW(), H = getViewH();
    boxW = W - BOX_MARGIN_X * 2;
    boxX = BOX_MARGIN_X;
    const bossBottom = bossY + BOSS_SIZE;
    boxY = bossBottom + 30;
    const optionsTop = H - 70;
    boxH = optionsTop - 20 - boxY;
    if (boxH < 100) boxH = 100;
}
updateBoxRect();
window.addEventListener('resize', () => {
    updateLayout();
    updateBoxRect();
});

// ---------- 攻击槽 ----------
const SLOT_H = 24;
let slotW, slotX, slotY;
const ATTACK_RED = 20;
const ATTACK_YELLOW = 50;
const ATTACK_GREEN = 60;

let attackCursorX = 0;
let attackCursorDir = 1;
const ATTACK_CURSOR_SPEED = 6;
let attackTimer = 0;
const ATTACK_TIME = 240;
let attackDone = false;

function getSlot() {
    return { x: slotX, y: slotY, w: slotW, h: SLOT_H };
}

function updateSlotSize() {
    slotW = Math.max(300, boxW * 0.7);
    slotX = boxX + (boxW - slotW) / 2;
    slotY = boxY + (boxH - SLOT_H) / 2;
}
updateSlotSize();
window.addEventListener('resize', () => {
    updateBoxRect();
    updateSlotSize();
});

function startAttack() {
    const s = getSlot();
    attackCursorX = s.x + 20 + Math.random() * (s.w - 40);
    attackCursorDir = Math.random() < 0.5 ? 1 : -1;
    attackTimer = 0;
    attackDone = false;
}

// ========== 获取BOSS战攻击伤害 ==========
function getBossAttackDamage() {
    let baseDamage = 40;
    let weaponBonus = 0;
    const weaponId = config.currentWeaponId;

    switch(weaponId) {
        case 'sword': weaponBonus = 20; break;
        case 'frostBlade': weaponBonus = 5; break;
        case 'shadowDagger': weaponBonus = 5; break;
        default: weaponBonus = 0; break;
    }

    const levelBonus = (config.playerLevel - 1) * 10;
    let damage = baseDamage + levelBonus + weaponBonus;
    damage = Math.floor(damage);

    if (config.hasClownMask) {
        damage = Math.floor(damage * config.CLOWN_MASK_BOSS_MULTIPLIER);
    }

    return damage;
}

// ========== 处理武器特殊效果 ==========
function applyWeaponBossEffects() {
    switch(config.currentWeaponId) {
        case 'firewand':
            showMsg('🔥 火焰法杖：BOSS将持续受到伤害');
            break;
        case 'frostBlade':
            config.frostBladeSlowActive = true;
            showMsg('❄️ 冰霜之刃：BOSS攻击速度-20%，风车减速');
            break;
        case 'shadowDagger':
            config.shadowDaggerWeakActive = true;
            showMsg('🗡️ 暗影匕首：BOSS攻速-10%，受伤-20%');
            break;
        default:
            break;
    }
}

// ========== 十字架效果 ==========
function applyCrossEffect() {
    if (config.hasCross) {
        const now = performance.now();
        if (now - config.crossHealTimer >= config.CROSS_HEAL_INTERVAL) {
            config.crossHealTimer = now;
            if (playerHP < PLAYER_MAX_HP) {
                playerHP = Math.min(PLAYER_MAX_HP, playerHP + config.CROSS_HEAL_AMOUNT);
                damageNumbers.push({
                    x: 50,
                    y: 50,
                    damage: '+2 HP',
                    timer: 30,
                    color: '#44ff88'
                });
            }
        }
    }
}

// ========== 小丑面具效果 ==========
function applyClownMaskEffect() {
    if (config.hasClownMask) {
        const now = performance.now();
        if (now - config.clownMaskDamageTimer >= config.CLOWN_MASK_DRAIN_INTERVAL) {
            config.clownMaskDamageTimer = now;
            if (playerHP > 1) {
                playerHP -= config.CLOWN_MASK_DRAIN_AMOUNT;
                damageNumbers.push({
                    x: 50,
                    y: 70,
                    damage: '-1 HP',
                    timer: 30,
                    color: '#ff6666'
                });
            }
        }
    }
}

// ========== 火焰法杖持续伤害 ==========
function applyFireWandDoT() {
    if (config.currentWeaponId === 'firewand' && bossHP > 0) {
        const now = performance.now();
        if (now - config.fireWandDamageTimer >= config.FIRE_WAND_DAMAGE_INTERVAL) {
            config.fireWandDamageTimer = now;
            bossHP = Math.max(0, bossHP - config.FIRE_WAND_DAMAGE_PER_TICK);
            damageNumbers.push({
                x: bossX + BOSS_SIZE / 2,
                y: bossY - 30,
                damage: `-${config.FIRE_WAND_DAMAGE_PER_TICK} HP(火)`,
                timer: 30,
                color: '#ff6600'
            });
            cycleBossColors();
            if (bossHP <= 0) {
                bossHP = 0;
                victory = true;
                turn = 'gameover';
                victoryMsg.style.display = 'block';
                if (returnBtn) returnBtn.style.display = 'none';
                if (nextBtn) {
                    nextBtn.style.display = 'block';
                    nextBtn.onclick = () => {
                        window.location.href = '../../prison/prison.html?load=black';
                    };
                }
                if (typeof Music !== 'undefined') Music.stop();
                return;
            }
        }
    }
}

// ---------- 输入 ----------
window.addEventListener('keydown', e => {
    if (turn === 'gameover') return;
    const code = e.code;

    if (code === 'ArrowUp' || code === 'KeyW') { fightKeys.up = true; e.preventDefault(); }
    if (code === 'ArrowDown' || code === 'KeyS') { fightKeys.down = true; e.preventDefault(); }
    if (code === 'ArrowLeft' || code === 'KeyA') { fightKeys.left = true; e.preventDefault(); }
    if (code === 'ArrowRight' || code === 'KeyD') { fightKeys.right = true; e.preventDefault(); }
    if (code === 'KeyZ') { fightKeys.confirm = true; e.preventDefault(); }
    if (code === 'Space') { fightKeys.confirm = true; e.preventDefault(); }
});

window.addEventListener('keyup', e => {
    const code = e.code;

    if (code === 'ArrowUp' || code === 'KeyW') { fightKeys.up = false; e.preventDefault(); }
    if (code === 'ArrowDown' || code === 'KeyS') { fightKeys.down = false; e.preventDefault(); }
    if (code === 'ArrowLeft' || code === 'KeyA') { fightKeys.left = false; e.preventDefault(); }
    if (code === 'ArrowRight' || code === 'KeyD') { fightKeys.right = false; e.preventDefault(); }
    if (code === 'KeyZ') { fightKeys.confirm = false; e.preventDefault(); }
    if (code === 'Space') { fightKeys.confirm = false; e.preventDefault(); }
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', e => {
    if (turn === 'player') {
        const W = getViewW(), H = getViewH();
        const btnW = 120, btnH = 40, startX = W/2 - 260, startY = H - 70;
        for (let i = 0; i < 4; i++) {
            const x = startX + i * 140;
            if (mouseX > x && mouseX < x + btnW && mouseY > startY && mouseY < startY + btnH) {
                selectedOption = i;
                executeOption();
                break;
            }
        }
    }
});

function executeOption() {
    if (turn !== 'player') return;
    switch (selectedOption) {
        case 0:
            turn = 'attack';
            startAttack();
            applyWeaponBossEffects();
            break;
        case 1:
            startBossTurn();
            break;
        case 2:
            if (hpPotions > 0) {
                hpPotions--;
                playerHP = Math.min(PLAYER_MAX_HP, playerHP + 20);
            }
            startBossTurn();
            break;
        case 3:
            startBossTurn();
            break;
    }
}

let bossTurnCount = 0;  // 回合计数器

function startBossTurn() {
    turn = 'boss';
    bossTurnCount++;

    clearAllAttacks();
    windmillTriggered = false;
    windmillScheduled = (bossTurnCount % 2 === 0);  // 偶数回合触发

    config.fireWandDamageTimer = performance.now();
    config.crossProtectionUsed = false;
    config.frostBladeSlowActive = false;
    config.shadowDaggerWeakActive = false;

    bossTurnTimer = BOSS_TURN_DURATION;
    bossTurnPhase = 0;

    // 默认矩形边界（风车会覆盖）
    soulX = boxX + boxW/2 - SOUL_SIZE/2;
    soulY = boxY + boxH - 80;
    soulMinX = boxX;
    soulMaxX = boxX + boxW - SOUL_SIZE;
    soulMinY = boxY;
    soulMaxY = boxY + boxH - SOUL_SIZE;
}

function performAttackJudge() {
    if (attackDone) return;
    attackDone = true;

    const s = getSlot();
    const relX = attackCursorX - s.x;
    const scale = s.w / 200;
    const redW = ATTACK_RED * scale;
    const yellowW = ATTACK_YELLOW * scale;
    const greenW = s.w - 2 * (redW + yellowW);

    let slotBase = 40;
    if (relX >= redW + yellowW && relX <= s.w - redW - yellowW) {
        slotBase = 80;
    } else if (relX >= redW && relX < redW + yellowW || relX > s.w - redW - yellowW && relX <= s.w - redW) {
        slotBase = 60;
    }

    let damage = 0;
    let maskApplied = false;
    const weaponId = config.currentWeaponId;

    if (weaponId === 'thunderHammer') {
        damage = slotBase + (config.playerLevel - 1) * 10 + 10;
        if (Math.random() < config.THUNDER_HAMMER_CRIT_CHANCE) {
            damage *= config.THUNDER_HAMMER_CRIT_MULTIPLIER;
            showMsg(`⚡ 暴击！伤害×${config.THUNDER_HAMMER_CRIT_MULTIPLIER}`);
        }
    } else if (!weaponId) {
        damage = slotBase + (config.playerLevel - 1) * 10;
    } else {
        damage = getBossAttackDamage();
        maskApplied = true;
    }

    if (config.hasClownMask && !maskApplied) {
        damage = Math.floor(damage * config.CLOWN_MASK_BOSS_MULTIPLIER);
    }

    damage = Math.floor(damage);
    bossHP -= damage;
    damageNumbers.push({
        x: bossX + BOSS_SIZE / 2,
        y: bossY - 15,
        damage: damage,
        timer: 60,
        color: '#ff6666'
    });

    cycleBossColors();
    if (bossHP <= 0) {
        bossHP = 0;
        victory = true;
        turn = 'gameover';
        victoryMsg.style.display = 'block';
        if (returnBtn) returnBtn.style.display = 'none';
        if (nextBtn) {
            nextBtn.style.display = 'block';
            nextBtn.onclick = () => {
                window.location.href = '../../prison/prison.html?load=black';
            };
        }
        if (typeof Music !== 'undefined') Music.stop();
        return;
    }
    startBossTurn();
}

let prevLeft = false, prevRight = false, prevConfirm = false;
let victory = false;

// ---------- 点到线段距离辅助 ----------
function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx*dx + dy*dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1)*dx + (py - y1)*dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const nearX = x1 + t*dx, nearY = y1 + t*dy;
    return Math.hypot(px - nearX, py - nearY);
}

// ---------- 生成风车激光（Sans 风格） ----------
function spawnWindmill() {
    // 计算正方形战斗框
    const sqSize = Math.min(boxW, boxH);
    const sqX = boxX + (boxW - sqSize) / 2;
    const sqY = boxY + (boxH - sqSize) / 2;
    const centerX = sqX + sqSize / 2;
    const centerY = sqY + sqSize / 2;

    // 更新灵魂边界为正方形
    soulMinX = sqX;
    soulMaxX = sqX + sqSize - SOUL_SIZE;
    soulMinY = sqY;
    soulMaxY = sqY + sqSize - SOUL_SIZE;
    // 将灵魂限制在新边界内
    soulX = Math.min(soulMaxX, Math.max(soulMinX, soulX));
    soulY = Math.min(soulMaxY, Math.max(soulMinY, soulY));

    // 激光长度 = 边长的一半（半径）
    const length = sqSize / 2;

    // 基础角度随机
    const baseAngle = Math.random() * 2 * Math.PI;
    // 速度：冰霜之刃减半
    let speed = WINDMILL_BASE_SPEED;
    if (config.currentWeaponId === 'frostBlade') {
        speed = WINDMILL_BASE_SPEED / 2;
    }

    for (let i = 0; i < WINDMILL_COUNT; i++) {
        const angle = baseAngle + (i / WINDMILL_COUNT) * 2 * Math.PI;
        windmillLasers.push({
            angle: angle,
            length: length,
            width: 6,
            centerX: centerX,
            centerY: centerY,
            speed: speed,
            lastDamageTime: 0,
            damage: WINDMILL_DAMAGE,
            damageInterval: WINDMILL_DAMAGE_INTERVAL
        });
    }
    windmillTriggered = true;
    showMsg('🌀 Sans 大风车！');
}

function update() {
    bossColorFrame++;
    if (bossColorFrame % 6 === 0) cycleBossColors();

    // 消息计时
    if (msgTimer > 0) {
        msgTimer--;
        if (msgTimer === 0) tempMsg = '';
    }

    // 伤害数字更新
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        damageNumbers[i].timer--;
        if (damageNumbers[i].timer <= 0) damageNumbers.splice(i, 1);
    }

    applyCrossEffect();
    applyClownMaskEffect();
    if (turn === 'player' || turn === 'attack' || turn === 'boss') {
        applyFireWandDoT();
    }

    // ========== BOSS 回合逻辑 ==========
    if (turn === 'boss') {
        const now = performance.now();

        // 1. 风车触发：最后 1/3 回合（剩余 300 帧）
        if (windmillScheduled && !windmillTriggered && bossTurnTimer <= 300) {
            spawnWindmill();
        }

        // 2. 更新风车激光（旋转）
        for (let laser of windmillLasers) {
            laser.angle += laser.speed;

            const x1 = laser.centerX;
            const y1 = laser.centerY;
            const endX = x1 + laser.length * Math.cos(laser.angle);
            const endY = y1 + laser.length * Math.sin(laser.angle);

            // 碰撞检测（灵魂中心到线段）
            const soulCX = soulX + SOUL_SIZE/2;
            const soulCY = soulY + SOUL_SIZE/2;
            const dist = distToSegment(soulCX, soulCY, x1, y1, endX, endY);
            const threshold = laser.width/2 + SOUL_SIZE/2;
            if (dist < threshold) {
                if (now - laser.lastDamageTime >= laser.damageInterval) {
                    laser.lastDamageTime = now;
                    // 真实伤害
                    playerHP = Math.max(0, playerHP - laser.damage);
                    damageNumbers.push({
                        x: soulX + SOUL_SIZE/2,
                        y: soulY - 10,
                        damage: `-${laser.damage}`,
                        timer: 30,
                        color: '#ff4444'
                    });
                }
            }
        }

        // 3. 原有弹幕和龙骨炮
        updateGasterBlasters();
        updateBullets();

        // 十字架保护
        if (config.hasCross && !config.crossProtectionUsed && playerHP <= 0) {
            playerHP = Math.max(1, Math.floor(PLAYER_MAX_HP * 0.1));
            config.crossProtectionUsed = true;
            showMsg('✝️ 十字架抵消了致命伤害！');
            damageNumbers.push({
                x: 50,
                y: 30,
                damage: '✝️ 保护！',
                timer: 60,
                color: '#ffd700'
            });
        }

        if (playerHP <= 0) {
            playerHP = 0;
            turn = 'gameover';
            gameOverMsg.style.display = 'block';
            if (typeof Music !== 'undefined') Music.stop();
        }

        // 回合结束
        bossTurnTimer--;
        if (bossTurnTimer <= 0) {
            clearAllAttacks();
            turn = 'player';
            selectedOption = 0;
            // 恢复矩形边界
            soulX = (getViewW() - SOUL_SIZE) / 2;
            soulY = getViewH() - 150;
            soulMinX = 20;
            soulMaxX = getViewW() - SOUL_SIZE - 20;
            soulMinY = 20;
            soulMaxY = getViewH() - SOUL_SIZE - 20;
            config.fireWandDamageTimer = performance.now();
            config.frostBladeSlowActive = false;
            config.shadowDaggerWeakActive = false;
            windmillLasers = [];
            windmillTriggered = false;
        }

        // 灵魂移动（受面具影响速度）
        let soulSpeed = SOUL_SPEED;
        if (config.hasClownMask) soulSpeed *= config.CLOWN_MASK_BOSS_MULTIPLIER;
        let dx = 0, dy = 0;
        if (fightKeys.left) dx -= soulSpeed;
        if (fightKeys.right) dx += soulSpeed;
        if (fightKeys.up) dy -= soulSpeed;
        if (fightKeys.down) dy += soulSpeed;
        soulX = Math.min(soulMaxX, Math.max(soulMinX, soulX + dx));
        soulY = Math.min(soulMaxY, Math.max(soulMinY, soulY + dy));

        prevLeft = prevRight = prevConfirm = false;
    }

    // ---------- 玩家回合 ----------
    else if (turn === 'player') {
        if (fightKeys.left && !prevLeft) selectedOption = (selectedOption + 3) % 4;
        if (fightKeys.right && !prevRight) selectedOption = (selectedOption + 1) % 4;
        if (fightKeys.confirm && !prevConfirm) executeOption();
        prevLeft = fightKeys.left;
        prevRight = fightKeys.right;
        prevConfirm = fightKeys.confirm;
    }

    // ---------- 攻击槽回合 ----------
    else if (turn === 'attack') {
        attackTimer++;
        const s = getSlot();
        attackCursorX += attackCursorDir * ATTACK_CURSOR_SPEED;
        if (attackCursorX <= s.x) {
            attackCursorX = s.x;
            attackCursorDir = 1;
        } else if (attackCursorX >= s.x + s.w) {
            attackCursorX = s.x + s.w;
            attackCursorDir = -1;
        }
        if (attackTimer >= ATTACK_TIME) startBossTurn();
        if (fightKeys.confirm && !prevConfirm) performAttackJudge();
        prevConfirm = fightKeys.confirm;
        prevLeft = prevRight = false;
    }
}

// ---------- 覆盖 enemy-attacks.js 的函数（暗影匕首减伤） ----------
function updateBullets() {
    const W = getViewW(), H = getViewH();
    let damageReduction = 1;
    if (config.shadowDaggerWeakActive) {
        damageReduction = 1 - config.SHADOW_DAGGER_WEAK_DAMAGE_REDUCTION;
    }
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.angle += BULLET_TURN_RATE;
        b.vx = Math.cos(b.angle) * b.speed;
        b.vy = Math.sin(b.angle) * b.speed;
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
            enemyBullets.splice(i, 1);
            continue;
        }
        const bulletRect = { x: b.x - b.r, y: b.y - b.r, w: b.r*2, h: b.r*2 };
        const soulRect = { x: soulX, y: soulY, w: SOUL_SIZE, h: SOUL_SIZE };
        if (rectCollide(soulRect, bulletRect)) {
            let damage = BULLET_DAMAGE;
            if (config.shadowDaggerWeakActive) {
                damage = Math.floor(damage * damageReduction);
                if (damage < 1) damage = 1;
            }
            playerHP = Math.max(0, playerHP - damage);
            enemyBullets.splice(i, 1);
        }
    }
}

function updateGasterBlasters() {
    let damageReduction = 1;
    if (config.shadowDaggerWeakActive) {
        damageReduction = 1 - config.SHADOW_DAGGER_WEAK_DAMAGE_REDUCTION;
    }
    for (let i = gasterBlasters.length - 1; i >= 0; i--) {
        const g = gasterBlasters[i];
        g.timer++;
        if (g.state === 'warn' && g.timer >= GASTER_WARN) {
            g.state = 'fire';
            g.timer = 0;
        } else if (g.state === 'fire') {
            if (g.timer >= GASTER_FIRE) {
                gasterBlasters.splice(i, 1);
                continue;
            }
            const progress = Math.min(1, g.timer / GASTER_FIRE);
            const laserRect = getLaserRect(g, progress);
            const soulRect = { x: soulX, y: soulY, w: SOUL_SIZE, h: SOUL_SIZE };
            if (rectCollide(soulRect, laserRect)) {
                let damage = LASER_DAMAGE;
                if (config.shadowDaggerWeakActive) {
                    damage = Math.floor(damage * damageReduction);
                    if (damage < 1) damage = 1;
                }
                playerHP = Math.max(0, playerHP - damage);
                gasterBlasters.splice(i, 1);
            }
        }
    }
}

// ---------- 绘制函数 ----------
function drawHeart(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    const s = size / 20;
    ctx.moveTo(cx, cy + 5 * s);
    ctx.bezierCurveTo(cx - 10 * s, cy - 10 * s, cx - 10 * s, cy + 5 * s, cx, cy + 10 * s);
    ctx.bezierCurveTo(cx + 10 * s, cy + 5 * s, cx + 10 * s, cy - 10 * s, cx, cy + 5 * s);
    ctx.fill();
    ctx.restore();
}

function draw() {
    const W = getViewW(), H = getViewH();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // 战斗框
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // BOSS
    const cellSize = BOSS_SIZE / 4;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            ctx.fillStyle = bossColors[i*4 + j];
            ctx.fillRect(bossX + j*cellSize, bossY + i*cellSize, cellSize, cellSize);
        }
    }
    ctx.fillStyle = '#f00';
    ctx.fillRect(bossX, bossY - 12, BOSS_SIZE, 6);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(bossX, bossY - 12, BOSS_SIZE * (bossHP / BOSS_MAX_HP), 6);

    // 伤害数字
    for (const dn of damageNumbers) {
        ctx.save();
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        const alpha = Math.min(1, dn.timer / 30);
        ctx.fillStyle = dn.color || `rgba(255, 100, 100, ${alpha})`;
        ctx.fillText(String(dn.damage), dn.x, dn.y - (60 - dn.timer) * 0.3);
        ctx.restore();
    }

    // ========== 绘制风车激光 ==========
    for (const laser of windmillLasers) {
        const x1 = laser.centerX;
        const y1 = laser.centerY;
        const endX = x1 + laser.length * Math.cos(laser.angle);
        const endY = y1 + laser.length * Math.sin(laser.angle);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
        ctx.lineWidth = laser.width;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
    }

    // 攻击槽
    if (turn === 'attack') {
        const s = getSlot();
        const scale = s.w / 200;
        const redW = ATTACK_RED * scale;
        const yellowW = ATTACK_YELLOW * scale;
        const greenW = s.w - 2 * (redW + yellowW);

        ctx.fillStyle = '#222';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(s.x, s.y, redW, s.h);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(s.x + redW, s.y, yellowW, s.h);
        ctx.fillStyle = '#44ff44';
        ctx.fillRect(s.x + redW + yellowW, s.y, greenW, s.h);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(s.x + redW + yellowW + greenW, s.y, yellowW, s.h);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(s.x + redW + yellowW + greenW + yellowW, s.y, redW, s.h);

        ctx.fillStyle = '#fff';
        ctx.fillRect(attackCursorX - 2, s.y - 2, 4, s.h + 4);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        let weaponInfo = config.currentWeaponId ? `[${config.currentWeaponId}]` : '[徒手]';
        ctx.fillText(`按 Z 攻击 ${weaponInfo}`, s.x + s.w/2, s.y - 10);
        ctx.textAlign = 'start';
        const timeLeft = Math.max(0, (ATTACK_TIME - attackTimer) / 60).toFixed(1);
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        ctx.fillText(`剩余: ${timeLeft}s`, s.x + s.w + 10, s.y + s.h/2 + 4);
    }

    // 龙骨炮
    for (const g of gasterBlasters) {
        if (g.state === 'warn') {
            const fullRect = getLaserRect(g, 1);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(fullRect.x, fullRect.y, fullRect.w, fullRect.h);
        } else {
            const progress = Math.min(1, g.timer / GASTER_FIRE);
            const laserRect = getLaserRect(g, progress);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(laserRect.x, laserRect.y, laserRect.w, laserRect.h);
        }
    }
    ctx.lineWidth = 1;

    // 普通子弹
    for (const b of enemyBullets) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 2*Math.PI);
        ctx.fill();
    }

    // 灵魂
    if (soulImgLoaded && soulImg.complete) {
        ctx.drawImage(soulImg, soulX, soulY, SOUL_SIZE, SOUL_SIZE);
    } else {
        drawHeart(ctx, soulX + SOUL_SIZE/2, soulY + SOUL_SIZE/2, SOUL_SIZE, '#ffaa33');
    }

    // HP条
    let effectiveMaxHp = PLAYER_MAX_HP;
    if (config.hasCross) effectiveMaxHp = Math.floor(PLAYER_MAX_HP * 1.1);
    const hpw = 200, hph = 15, hpp = Math.min(1, playerHP / effectiveMaxHp);
    ctx.fillStyle = '#333';
    ctx.fillRect(20, H - 30, hpw, hph);
    ctx.fillStyle = '#f00';
    ctx.fillRect(20, H - 30, hpw * hpp, hph);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, H - 30, hpw, hph);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`HP: ${Math.ceil(playerHP)}/${effectiveMaxHp}`, 25, H - 18);
    ctx.fillText(`💊 x${hpPotions}`, 230, H - 18);

    // 装备信息
    let equipInfo = '';
    if (config.currentWeaponId) {
        const weaponNames = {
            sword: '铁剑',
            firewand: '火焰法杖',
            frostBlade: '冰霜之刃',
            shadowDagger: '暗影匕首',
            thunderHammer: '雷霆锤'
        };
        equipInfo += weaponNames[config.currentWeaponId] || config.currentWeaponId;
    }
    if (config.hasCross) equipInfo += ' ✝️';
    if (config.hasClownMask) equipInfo += ' 🤡';
    if (equipInfo) {
        ctx.fillStyle = '#ffd966';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(equipInfo, getViewW() - 20, H - 18);
        ctx.textAlign = 'start';
    }

    // 选项菜单
    if (turn === 'player') {
        const btnW = 120, btnH = 40, startX = W/2 - 260, startY = H - 70;
        for (let i = 0; i < 4; i++) {
            const x = startX + i * 140;
            ctx.fillStyle = (i === selectedOption) ? '#ffaa00' : '#444';
            ctx.fillRect(x, startY, btnW, btnH);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(x, startY, btnW, btnH);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(options[i], x + btnW/2, startY + btnH/2 + 6);
        }
        ctx.textAlign = 'start';
    }

    // 状态文字
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    if (turn === 'attack') ctx.fillText('瞄准...', 20, 30);
    else if (turn === 'boss') {
        let bossInfo = 'BOSS 攻击中！移动躲避！';
        if (config.frostBladeSlowActive) bossInfo += ' ❄️减速';
        if (config.shadowDaggerWeakActive) bossInfo += ' 🗡️虚弱';
        ctx.fillText(bossInfo, 20, 30);
    }
    if (turn === 'gameover') {
        ctx.fillStyle = victory ? 'gold' : '#ff4444';
        ctx.font = 'bold 20px monospace';
        if (victory) ctx.fillText('点击下方按钮前往监狱', W/2 - 140, H/2 + 60);
        else ctx.fillText('你死了...', W/2 - 40, H/2 + 40);
    }

    if (tempMsg) {
        ctx.fillStyle = 'yellow';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tempMsg, W/2, 70);
        ctx.textAlign = 'start';
    }
}

// ---------- 游戏循环 ----------
let lastFrameTime = 0;
function loop() {
    const fpsLimit = window.WSSettings ? window.WSSettings.getFPSLimit() : 0;
    if (fpsLimit > 0) {
        const now = performance.now();
        const interval = 1000 / fpsLimit;
        if (now - lastFrameTime < interval) {
            requestAnimationFrame(loop);
            return;
        }
        lastFrameTime = now;
    }
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();