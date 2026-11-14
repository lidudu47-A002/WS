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

// ========== 获取BOSS战攻击伤害（其他武器固定伤害） ==========
function getBossAttackDamage() {
    let baseDamage = 40; // 基础伤害（徒手）
    let weaponBonus = 0;
    let critMultiplier = 1;
    let isCrit = false;
    const weaponId = config.currentWeaponId;

    switch(weaponId) {
        case 'sword':
            weaponBonus = 20; // 铁剑BOSS战 +20
            break;
        case 'bow':
            weaponBonus = 10; // 弓BOSS战 +10
            break;
        case 'frostBlade':
            weaponBonus = 5;  // 冰霜之刃BOSS战 +5
            break;
        case 'shadowDagger':
            weaponBonus = 5;  // 暗影匕首BOSS战 +5
            break;
        // 雷霆锤不在这个函数里处理，由 performAttackJudge 单独计算
        case 'firewand':
            weaponBonus = 0;  // 火焰法杖BOSS战攻击不变
            break;
        default:
            weaponBonus = 0;
            break;
    }

    // 等级加成
    const levelBonus = (config.playerLevel - 1) * 10;
    let damage = baseDamage + levelBonus + weaponBonus;
    damage = Math.floor(damage);

    // 小丑面具BOSS战：伤害提升200%（仅对其他武器，雷霆锤单独处理）
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
            showMsg('❄️ 冰霜之刃：BOSS攻击速度-20%');
            break;
        case 'shadowDagger':
            config.shadowDaggerWeakActive = true;
            showMsg('🗡️ 暗影匕首：BOSS攻速-10%，受伤-20%');
            break;
        case 'thunderHammer':
            // 暴击已在攻击时处理
            break;
        default:
            break;
    }
}

// ========== 十字架BOSS战效果 ==========
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

// ========== 小丑面具BOSS战效果 ==========
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

// ========== 处理火焰法杖持续伤害 ==========
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
        case 0: // 战斗
            turn = 'attack';
            startAttack();
            applyWeaponBossEffects();
            break;
        case 1: // 行动 -> BOSS回合
            startBossTurn();
            break;
        case 2: // 物品
            if (hpPotions > 0) {
                hpPotions--;
                playerHP = Math.min(PLAYER_MAX_HP, playerHP + 20);
            }
            startBossTurn();
            break;
        case 3: // 仁慈 -> BOSS回合
            startBossTurn();
            break;
    }
}

function startBossTurn() {
    turn = 'boss';
    bossTurnTimer = BOSS_TURN_DURATION;
    bossTurnPhase = 0;
    // 重置火焰法杖计时器
    config.fireWandDamageTimer = performance.now();
    // 重置十字架保护状态（新回合重置）
    config.crossProtectionUsed = false;
    // 重置冰霜之刃和暗影匕首效果（新回合重置）
    config.frostBladeSlowActive = false;
    config.shadowDaggerWeakActive = false;
    clearAllAttacks();
    
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

    // ========== 确定攻击槽区域基础伤害 ==========
    let slotBase = 40; // 默认红区
    if (relX >= redW + yellowW && relX <= s.w - redW - yellowW) {
        slotBase = 80; // 绿区
    } else if (relX >= redW && relX < redW + yellowW || relX > s.w - redW - yellowW && relX <= s.w - redW) {
        slotBase = 60; // 黄区
    }

    let damage = 0;
    let maskApplied = false;
    const weaponId = config.currentWeaponId;

    // ========== 根据武器计算伤害 ==========
    if (weaponId === 'thunderHammer') {
        // 雷霆锤：槽位伤害 + 等级加成 + 武器加成10
        damage = slotBase + (config.playerLevel - 1) * 10 + 10;
        // 暴击判定
        if (Math.random() < config.THUNDER_HAMMER_CRIT_CHANCE) {
            damage *= config.THUNDER_HAMMER_CRIT_MULTIPLIER;
            showMsg(`⚡ 暴击！伤害×${config.THUNDER_HAMMER_CRIT_MULTIPLIER}`);
        }
        // 面具在最后统一处理
    } else if (!weaponId) {
        // 徒手：槽位伤害 + 等级加成
        damage = slotBase + (config.playerLevel - 1) * 10;
        // 面具在最后统一处理
    } else {
        // 其他武器（铁剑、弓、冰霜之刃、暗影匕首、火焰法杖）：使用固定伤害
        damage = getBossAttackDamage();
        maskApplied = true; // getBossAttackDamage 已经包含了面具加成
    }

    // ========== 应用小丑面具（如果尚未应用） ==========
    if (config.hasClownMask && !maskApplied) {
        damage = Math.floor(damage * config.CLOWN_MASK_BOSS_MULTIPLIER);
    }

    // 确保伤害为整数
    damage = Math.floor(damage);

    // ========== 应用伤害 ==========
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

function update() {
    bossColorFrame++;
    if (bossColorFrame % 6 === 0) cycleBossColors();

    // 更新消息计时器
    if (msgTimer > 0) {
        msgTimer--;
        if (msgTimer === 0) tempMsg = '';
    }

    // 更新伤害数字
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        damageNumbers[i].timer--;
        if (damageNumbers[i].timer <= 0) damageNumbers.splice(i, 1);
    }

    // ========== 十字架每秒回血 ==========
    applyCrossEffect();

    // ========== 小丑面具扣血 ==========
    applyClownMaskEffect();

    // ========== 火焰法杖持续伤害 ==========
    if (turn === 'player' || turn === 'attack' || turn === 'boss') {
        applyFireWandDoT();
    }

    if (turn === 'player') {
        if (fightKeys.left && !prevLeft) selectedOption = (selectedOption + 3) % 4;
        if (fightKeys.right && !prevRight) selectedOption = (selectedOption + 1) % 4;
        if (fightKeys.confirm && !prevConfirm) executeOption();
        prevLeft = fightKeys.left;
        prevRight = fightKeys.right;
        prevConfirm = fightKeys.confirm;
    }
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
    else if (turn === 'boss') {
        // 灵魂移动（受小丑面具影响移速）
        let soulSpeed = SOUL_SPEED;
        if (config.hasClownMask) {
            soulSpeed = SOUL_SPEED * config.CLOWN_MASK_BOSS_MULTIPLIER;
        }
        let dx = 0, dy = 0;
        if (fightKeys.left) dx -= soulSpeed;
        if (fightKeys.right) dx += soulSpeed;
        if (fightKeys.up) dy -= soulSpeed;
        if (fightKeys.down) dy += soulSpeed;
        soulX = Math.min(soulMaxX, Math.max(soulMinX, soulX + dx));
        soulY = Math.min(soulMaxY, Math.max(soulMinY, soulY + dy));

        bossTurnTimer--;
        if (bossTurnTimer > 0) {
            // BOSS攻击速度修正（冰霜之刃 -20%，暗影匕首 -10%）
            let spawnBulletInterval = 120;
            let spawnBlasterInterval = 180;
            if (config.frostBladeSlowActive) {
                spawnBulletInterval = Math.floor(spawnBulletInterval / (1 - config.FROST_BLADE_SLOW_PERCENT));
                spawnBlasterInterval = Math.floor(spawnBlasterInterval / (1 - config.FROST_BLADE_SLOW_PERCENT));
            }
            if (config.shadowDaggerWeakActive) {
                spawnBulletInterval = Math.floor(spawnBulletInterval / (1 - config.SHADOW_DAGGER_WEAK_ATTACK_SPEED));
                spawnBlasterInterval = Math.floor(spawnBlasterInterval / (1 - config.SHADOW_DAGGER_WEAK_ATTACK_SPEED));
            }
            const effectiveBulletInterval = Math.floor(spawnBulletInterval);
            const effectiveBlasterInterval = Math.floor(spawnBlasterInterval);
            if (bossTurnTimer % effectiveBulletInterval === 0) spawnBullets();
            if (bossTurnTimer % effectiveBlasterInterval === 0) spawnGasterBlaster();
        }
        // 调用覆盖版的 updateGasterBlasters 和 updateBullets（已定义在下方）
        updateGasterBlasters();
        updateBullets();

        // 十字架致命伤害保护（BOSS回合）
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

        if (bossTurnTimer <= 0) {
            clearAllAttacks();
            turn = 'player';
            selectedOption = 0;
            soulX = (getViewW() - SOUL_SIZE) / 2;
            soulY = getViewH() - 150;
            soulMinX = 20;
            soulMaxX = getViewW() - SOUL_SIZE - 20;
            soulMinY = 20;
            soulMaxY = getViewH() - SOUL_SIZE - 20;
            // 重置火焰法杖计时器
            config.fireWandDamageTimer = performance.now();
            // 重置冰霜之刃和暗影匕首效果
            config.frostBladeSlowActive = false;
            config.shadowDaggerWeakActive = false;
        }
        prevLeft = prevRight = prevConfirm = false;
    }
}

// ========== 覆盖 enemy-attacks.js 中的函数以支持暗影匕首减伤 ==========
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

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

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

    for (const dn of damageNumbers) {
        ctx.save();
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        const alpha = Math.min(1, dn.timer / 30);
        ctx.fillStyle = dn.color || `rgba(255, 100, 100, ${alpha})`;
        ctx.fillText(String(dn.damage), dn.x, dn.y - (60 - dn.timer) * 0.3);
        ctx.restore();
    }

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

    for (const b of enemyBullets) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 2*Math.PI);
        ctx.fill();
    }

    if (soulImgLoaded && soulImg.complete) {
        ctx.drawImage(soulImg, soulX, soulY, SOUL_SIZE, SOUL_SIZE);
    } else {
        drawHeart(ctx, soulX + SOUL_SIZE/2, soulY + SOUL_SIZE/2, SOUL_SIZE, '#ffaa33');
    }

    // HP条（十字架影响显示）
    let effectiveMaxHp = PLAYER_MAX_HP;
    if (config.hasCross) {
        effectiveMaxHp = Math.floor(PLAYER_MAX_HP * 1.1);
    }
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

    // 显示装备信息
    let equipInfo = '';
    if (config.currentWeaponId) {
        const weaponNames = {
            sword: '铁剑',
            bow: '弓',
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

    // 显示临时消息
    if (tempMsg) {
        ctx.fillStyle = 'yellow';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tempMsg, W/2, 70);
        ctx.textAlign = 'start';
    }
}

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