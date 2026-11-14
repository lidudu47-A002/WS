// ---------- 决心图片 ----------
const soulImg = new Image();
soulImg.src = '素材/A心.png';
let soulImgLoaded = false;
soulImg.onload = () => { soulImgLoaded = true; };
soulImg.onerror = () => { console.warn('未找到 A心.png，使用默认红心'); };

const returnBtn = document.getElementById('returnBtn');

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

// ---------- 攻击槽（居中、放大）----------
const SLOT_H = 24;                    // 高度放大（原16）
let slotW, slotX, slotY;              // 动态计算
const ATTACK_RED = 20;
const ATTACK_YELLOW = 50;
const ATTACK_GREEN = 60;              // 基准200px下的区域，实际按比例缩放

// 攻击小游戏状态
let attackCursorX = 0;
let attackCursorDir = 1;
const ATTACK_CURSOR_SPEED = 6;
let attackTimer = 0;
const ATTACK_TIME = 240;
let attackDone = false;

// 计算并返回攻击槽矩形
function getSlot() {
    return { x: slotX, y: slotY, w: slotW, h: SLOT_H };
}

// 根据战斗框大小更新攻击槽尺寸和位置
function updateSlotSize() {
    slotW = Math.max(300, boxW * 0.7); // 至少300px，或战斗框宽度的70%
    slotX = boxX + (boxW - slotW) / 2;  // 水平居中
    slotY = boxY + (boxH - SLOT_H) / 2; // 垂直居中
}
updateSlotSize();
window.addEventListener('resize', () => {
    updateBoxRect();
    updateSlotSize();
});

// 启动攻击小游戏
function startAttack() {
    const s = getSlot();
    attackCursorX = s.x + 20 + Math.random() * (s.w - 40);
    attackCursorDir = Math.random() < 0.5 ? 1 : -1;
    attackTimer = 0;
    attackDone = false;
}

// ---------- 输入 ----------
window.addEventListener('keydown', e => {
    if (turn === 'gameover') return;
    switch (e.code) {
        case 'ArrowUp': case 'KeyW': fightKeys.up = true; e.preventDefault(); break;
        case 'ArrowDown': case 'KeyS': fightKeys.down = true; e.preventDefault(); break;
        case 'ArrowLeft': case 'KeyA': fightKeys.left = true; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': fightKeys.right = true; e.preventDefault(); break;
        case 'KeyZ': case 'Space': fightKeys.confirm = true; e.preventDefault(); break;
    }
});

window.addEventListener('keyup', e => {
    switch (e.code) {
        case 'ArrowUp': case 'KeyW': fightKeys.up = false; e.preventDefault(); break;
        case 'ArrowDown': case 'KeyS': fightKeys.down = false; e.preventDefault(); break;
        case 'ArrowLeft': case 'KeyA': fightKeys.left = false; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': fightKeys.right = false; e.preventDefault(); break;
        case 'KeyZ': case 'Space': fightKeys.confirm = false; e.preventDefault(); break;
    }
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

returnBtn.addEventListener('click', () => {
    window.location.href = '../Black room.html';
});

// ---------- 执行玩家选项 ----------
function executeOption() {
    if (turn !== 'player') return;
    switch (selectedOption) {
        case 0: turn = 'attack'; startAttack(); break;
        case 1: startBossTurn(); break;
        case 2:
            if (hpPotions > 0) {
                hpPotions--;
                playerHP = Math.min(PLAYER_MAX_HP, playerHP + 20);
            }
            startBossTurn();
            break;
        case 3: startBossTurn(); break;
    }
}

function startBossTurn() {
    turn = 'boss';
    bossTurnTimer = BOSS_TURN_DURATION;
    bossTurnPhase = 0;
    clearAllAttacks();
    soulX = boxX + boxW/2 - SOUL_SIZE/2;
    soulY = boxY + boxH - 80;
    soulMinX = boxX;
    soulMaxX = boxX + boxW - SOUL_SIZE;
    soulMinY = boxY;
    soulMaxY = boxY + boxH - SOUL_SIZE;
}

// ---------- 攻击判定 ----------
function performAttackJudge() {
    if (attackDone) return;
    attackDone = true;

    const s = getSlot();
    const relX = attackCursorX - s.x;
    // 按比例计算颜色区域（基于200px的基准比例）
    const scale = s.w / 200;
    const redW = ATTACK_RED * scale;
    const yellowW = ATTACK_YELLOW * scale;
    const greenW = s.w - 2 * (redW + yellowW); // 剩余部分为绿色

    if (relX < redW || relX > s.w - redW) {
        bossHP -= 40;
    } else if (relX < redW + yellowW || relX > s.w - redW - yellowW) {
        bossHP -= 60;
    } else {
        bossHP -= 80;
    }

    cycleBossColors();
    if (bossHP <= 0) {
        bossHP = 0;
        victory = true;
        turn = 'gameover';
        victoryMsg.style.display = 'block';
        returnBtn.style.display = 'block';
    } else {
        startBossTurn();
    }
}

// ---------- 主更新循环 ----------
let prevLeft = false, prevRight = false, prevConfirm = false;
function update() {
    bossColorFrame++;
    if (bossColorFrame % 6 === 0) cycleBossColors();

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

        if (attackTimer >= ATTACK_TIME) {
            startBossTurn();
        }
        if (fightKeys.confirm && !prevConfirm) {
            performAttackJudge();
        }
        prevConfirm = fightKeys.confirm;
        prevLeft = prevRight = false;
    }
    else if (turn === 'boss') {
        let dx = 0, dy = 0;
        if (fightKeys.left) dx -= SOUL_SPEED;
        if (fightKeys.right) dx += SOUL_SPEED;
        if (fightKeys.up) dy -= SOUL_SPEED;
        if (fightKeys.down) dy += SOUL_SPEED;
        soulX = Math.min(soulMaxX, Math.max(soulMinX, soulX + dx));
        soulY = Math.min(soulMaxY, Math.max(soulMinY, soulY + dy));

        bossTurnTimer--;
        if (bossTurnTimer > 0) {
            if (bossTurnTimer % 120 === 0) spawnBullets();
            if (bossTurnTimer % 180 === 0) spawnGasterBlaster();
        }
        updateGasterBlasters();
        updateBullets();

        if (playerHP <= 0) {
            playerHP = 0;
            turn = 'gameover';
            gameOverMsg.style.display = 'block';
        }

        if (bossTurnTimer <= 0) {
            clearAllAttacks();
            turn = 'player';
            selectedOption = 0;
            soulX = boxX + boxW/2 - SOUL_SIZE/2;
            soulY = boxY + boxH - 80;
            soulMinX = 20;
            soulMaxX = getViewW() - SOUL_SIZE - 20;
            soulMinY = 20;
            soulMaxY = getViewH() - SOUL_SIZE - 20;
        }
        prevLeft = prevRight = prevConfirm = false;
    }
}

// ---------- 绘制 ----------
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
    // BOSS血条（上方）
    ctx.fillStyle = '#f00';
    ctx.fillRect(bossX, bossY - 12, BOSS_SIZE, 6);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(bossX, bossY - 12, BOSS_SIZE * (bossHP / BOSS_MAX_HP), 6);

    // ---------- 攻击槽（居中放大）----------
    if (turn === 'attack') {
        const s = getSlot();
        const scale = s.w / 200;
        const redW = ATTACK_RED * scale;
        const yellowW = ATTACK_YELLOW * scale;
        const greenW = s.w - 2 * (redW + yellowW);

        // 槽背景
        ctx.fillStyle = '#222';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        // 颜色条
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

        // 光标
        ctx.fillStyle = '#fff';
        ctx.fillRect(attackCursorX - 2, s.y - 2, 4, s.h + 4);

        // 提示文字
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('按 Z 攻击', s.x + s.w/2, s.y - 10);
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

    // 弹幕
    for (const b of enemyBullets) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 2*Math.PI);
        ctx.fill();
    }

    // 灵魂
    if (soulImgLoaded) {
        ctx.drawImage(soulImg, soulX, soulY, SOUL_SIZE, SOUL_SIZE);
    } else {
        const cx = soulX + SOUL_SIZE/2, cy = soulY + SOUL_SIZE/2;
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.moveTo(cx, cy + 5);
        ctx.bezierCurveTo(cx - 10, cy - 10, cx - 10, cy + 5, cx, cy + 10);
        ctx.bezierCurveTo(cx + 10, cy + 5, cx + 10, cy - 10, cx, cy + 5);
        ctx.fill();
    }

    // 玩家HP
    const hpw = 200, hph = 15, hpp = Math.min(1, playerHP / PLAYER_MAX_HP);
    ctx.fillStyle = '#333';
    ctx.fillRect(20, H - 30, hpw, hph);
    ctx.fillStyle = '#f00';
    ctx.fillRect(20, H - 30, hpw * hpp, hph);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, H - 30, hpw, hph);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`HP: ${Math.ceil(playerHP)}/${PLAYER_MAX_HP}`, 25, H - 18);
    ctx.fillText(`💊 x${hpPotions}`, 230, H - 18);

    // 回合按钮
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

    // 状态提示
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    if (turn === 'attack') ctx.fillText('瞄准...', 20, 30);
    else if (turn === 'boss') ctx.fillText('BOSS 攻击中！移动躲避！', 20, 30);
    if (turn === 'gameover') {
        ctx.fillStyle = victory ? 'gold' : '#ff4444';
        ctx.font = 'bold 20px monospace';
        if (victory) ctx.fillText('点击下方按钮返回黑屋', W/2 - 120, H/2 + 60);
        else ctx.fillText('你死了...', W/2 - 40, H/2 + 40);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();