// ---------- 从 URL 获取玩家等级 ----------
const urlParams = new URLSearchParams(window.location.search);
let playerLevel = parseInt(urlParams.get('lv')) || 1;
playerLevel = Math.max(1, Math.min(20, playerLevel));
console.log(`BOSS战读取到玩家等级：${playerLevel}，额外伤害：${(playerLevel-1)*10}`);

// ---------- 从 sessionStorage 读取监狱背包 ----------
let hpPotionCount = 0; // 只使用 HP 药水
try {
    const savedInv = sessionStorage.getItem('prison_inventory');
    if (savedInv) {
        const slots = JSON.parse(savedInv);
        for (const slot of slots) {
            if (slot && slot.type === 'hp') {
                hpPotionCount += slot.count;
            }
        }
        console.log('读取到监狱HP药水数量：', hpPotionCount);
    }
} catch(e) { console.warn('读取背包失败', e); }

// 将 HP 药水拆分为独立格子（每个药水占一格）
let hpPotionsList = []; // 每项代表一瓶药水
function updateHpPotionsList() {
    hpPotionsList = new Array(hpPotionCount).fill({ type: 'hp', name: '❤️ HP药水' });
}
updateHpPotionsList();

// 物品菜单分页
let currentPage = 0;
const itemsPerPage = 6; // 2列 x 3行
let selectedItemIndex = 0;
let itemMenuOpen = false;

function useHpPotion(index) {
    if (index >= hpPotionsList.length) return false;
    if (playerHP >= PLAYER_MAX_HP) {
        showMsg('生命已满！');
        return false;
    }
    playerHP = Math.min(PLAYER_MAX_HP, playerHP + 20);
    hpPotionCount--;
    updateHpPotionsList();
    showMsg('使用了 HP药水！');
    // 调整当前页和选中索引
    if (hpPotionsList.length === 0) {
        closeItemMenu();
    } else {
        const pageStart = currentPage * itemsPerPage;
        if (selectedItemIndex >= hpPotionsList.length - pageStart) {
            selectedItemIndex = Math.max(0, hpPotionsList.length - pageStart - 1);
        }
        // 如果当前页没有物品了，回退一页
        if (pageStart >= hpPotionsList.length && currentPage > 0) {
            currentPage--;
            selectedItemIndex = 0;
        }
    }
    return true;
}

function openItemMenu() {
    if (hpPotionsList.length === 0) {
        showMsg('没有HP药水');
        return;
    }
    currentPage = 0;
    selectedItemIndex = 0;
    itemMenuOpen = true;
}

function closeItemMenu() {
    itemMenuOpen = false;
}

let tempMsg = '';
let msgTimer = 0;
function showMsg(msg) {
    tempMsg = msg;
    msgTimer = 60;
}

// ---------- 决心图片（蓝色） ----------
const soulImg = new Image();
soulImg.src = '素材/A心（蓝）.png';
let soulImgLoaded = false;
soulImg.onload = () => { soulImgLoaded = true; };
soulImg.onerror = () => { console.warn('未找到 A心（蓝）.png，使用蓝色心形'); };

// BOSS 图片
const bossImg = new Image();
bossImg.src = '素材/BOSS.png';
let bossImgLoaded = false;
bossImg.onload = () => { bossImgLoaded = true; };
bossImg.onerror = () => { console.warn('未找到 BOSS.png，使用色块绘制'); };

const returnBtn = document.getElementById('returnBtn');

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

// ---------- 输入 ----------
window.addEventListener('keydown', e => {
    if (turn === 'gameover') return;
    const code = e.code;
    // 物品菜单优先处理
    if (itemMenuOpen) {
        if (code === 'ArrowUp') {
            e.preventDefault();
            let newIdx = selectedItemIndex - 2;
            if (newIdx >= 0) selectedItemIndex = newIdx;
        } else if (code === 'ArrowDown') {
            e.preventDefault();
            let newIdx = selectedItemIndex + 2;
            const pageStart = currentPage * itemsPerPage;
            const pageItems = hpPotionsList.slice(pageStart, pageStart + itemsPerPage);
            if (newIdx < pageItems.length) selectedItemIndex = newIdx;
        } else if (code === 'ArrowLeft') {
            e.preventDefault();
            if (selectedItemIndex % 2 !== 0) {
                selectedItemIndex--;
            } else {
                if (currentPage > 0) {
                    currentPage--;
                    selectedItemIndex = 0;
                }
            }
        } else if (code === 'ArrowRight') {
            e.preventDefault();
            const pageStart = currentPage * itemsPerPage;
            const pageItems = hpPotionsList.slice(pageStart, pageStart + itemsPerPage);
            if (selectedItemIndex % 2 !== 1 && selectedItemIndex + 1 < pageItems.length) {
                selectedItemIndex++;
            } else {
                const maxPage = Math.ceil(hpPotionsList.length / itemsPerPage) - 1;
                if (currentPage < maxPage) {
                    currentPage++;
                    selectedItemIndex = 0;
                }
            }
        } else if (code === 'KeyZ' || code === 'Space') {
            e.preventDefault();
            const pageStart = currentPage * itemsPerPage;
            const globalIndex = pageStart + selectedItemIndex;
            if (globalIndex < hpPotionsList.length) {
                useHpPotion(globalIndex);
            }
        } else if (code === 'KeyX' || code === 'Escape') {
            e.preventDefault();
            closeItemMenu();
        }
        return;
    }

    // 主菜单
    switch (code) {
        case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight':
            if (turn === 'player') {
                if (code === 'ArrowLeft') selectedOption = (selectedOption + 3) % 4;
                if (code === 'ArrowRight') selectedOption = (selectedOption + 1) % 4;
                e.preventDefault();
            }
            break;
        case 'KeyZ': case 'Space':
            if (turn === 'player') {
                executeOption();
                e.preventDefault();
            } else if (turn === 'attack') {
                fightKeys.confirm = true;
                e.preventDefault();
            }
            break;
        default:
            if (code === 'ArrowUp' || code === 'KeyW') { fightKeys.up = true; e.preventDefault(); }
            if (code === 'ArrowDown' || code === 'KeyS') { fightKeys.down = true; e.preventDefault(); }
            if (code === 'ArrowLeft' || code === 'KeyA') { fightKeys.left = true; e.preventDefault(); }
            if (code === 'ArrowRight' || code === 'KeyD') { fightKeys.right = true; e.preventDefault(); }
            if (code === 'KeyZ' || code === 'Space') { fightKeys.confirm = true; e.preventDefault(); }
    }
});

window.addEventListener('keyup', e => {
    const code = e.code;
    if (itemMenuOpen) return;
    if (code === 'ArrowUp' || code === 'KeyW') { fightKeys.up = false; e.preventDefault(); }
    if (code === 'ArrowDown' || code === 'KeyS') { fightKeys.down = false; e.preventDefault(); }
    if (code === 'ArrowLeft' || code === 'KeyA') { fightKeys.left = false; e.preventDefault(); }
    if (code === 'ArrowRight' || code === 'KeyD') { fightKeys.right = false; e.preventDefault(); }
    if (code === 'KeyZ' || code === 'Space') { fightKeys.confirm = false; e.preventDefault(); }
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', e => {
    if (turn === 'player' && !itemMenuOpen) {
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

function executeOption() {
    if (turn !== 'player') return;
    switch (selectedOption) {
        case 0: turn = 'attack'; startAttack(); break;
        case 1: startBossTurn(); break;
        case 2: openItemMenu(); break;
        case 3: startBossTurn(); break;
    }
}

function startBossTurn() {
    turn = 'boss';
    bossTurnTimer = BOSS_TURN_DURATION;
    bossTurnPhase = 0;
    clearAllAttacks();
    const fixedY = boxY + boxH - SOUL_SIZE - 2;
    soulX = boxX + boxW/2 - SOUL_SIZE/2;
    soulY = fixedY;
    soulMinX = boxX;
    soulMaxX = boxX + boxW - SOUL_SIZE;
    soulMinY = fixedY;
    soulMaxY = fixedY;
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

    let baseDamage = 0;
    if (relX < redW || relX > s.w - redW) baseDamage = 40;
    else if (relX < redW + yellowW || relX > s.w - redW - yellowW) baseDamage = 60;
    else baseDamage = 80;

    const levelBonus = (playerLevel - 1) * 10;
    const damage = baseDamage + levelBonus;
    bossHP -= damage;

    damageNumbers.push({
        x: bossX + BOSS_SIZE / 2,
        y: bossY - 15,
        damage: damage,
        timer: 60
    });

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

let prevLeft = false, prevRight = false, prevConfirm = false;

function update() {
    bossColorFrame++;
    if (bossColorFrame % 6 === 0) cycleBossColors();

    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        damageNumbers[i].timer--;
        if (damageNumbers[i].timer <= 0) damageNumbers.splice(i, 1);
    }
    if (msgTimer > 0) {
        msgTimer--;
        if (msgTimer === 0) tempMsg = '';
    }

    if (turn === 'player') {
        if (!itemMenuOpen) {
            if (fightKeys.left && !prevLeft) selectedOption = (selectedOption + 3) % 4;
            if (fightKeys.right && !prevRight) selectedOption = (selectedOption + 1) % 4;
            if (fightKeys.confirm && !prevConfirm) executeOption();
            prevLeft = fightKeys.left;
            prevRight = fightKeys.right;
            prevConfirm = fightKeys.confirm;
        }
    }
    else if (turn === 'attack') {
        attackTimer++;
        const s = getSlot();
        attackCursorX += attackCursorDir * ATTACK_CURSOR_SPEED;
        if (attackCursorX <= s.x) { attackCursorX = s.x; attackCursorDir = 1; }
        else if (attackCursorX >= s.x + s.w) { attackCursorX = s.x + s.w; attackCursorDir = -1; }
        if (attackTimer >= ATTACK_TIME) startBossTurn();
        if (fightKeys.confirm && !prevConfirm) performAttackJudge();
        prevConfirm = fightKeys.confirm;
        prevLeft = prevRight = false;
    }
    else if (turn === 'boss') {
        let dx = 0;
        if (fightKeys.left) dx -= SOUL_SPEED;
        if (fightKeys.right) dx += SOUL_SPEED;
        soulX = Math.min(soulMaxX, Math.max(soulMinX, soulX + dx));
        soulY = soulMinY;

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

function draw() {
    const W = getViewW(), H = getViewH();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    if (bossImgLoaded && bossImg.complete && bossImg.naturalWidth > 0) {
        ctx.drawImage(bossImg, bossX, bossY, BOSS_SIZE, BOSS_SIZE);
    } else {
        const cellSize = BOSS_SIZE / 4;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                ctx.fillStyle = bossColors[i*4 + j];
                ctx.fillRect(bossX + j*cellSize, bossY + i*cellSize, cellSize, cellSize);
            }
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
        ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
        ctx.fillText(`-${dn.damage}`, dn.x, dn.y - (60 - dn.timer) * 0.3);
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
        ctx.fillText('按 Z 攻击', s.x + s.w/2, s.y - 10);
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

    if (soulImgLoaded && soulImg.complete && soulImg.naturalWidth > 0) {
        ctx.drawImage(soulImg, soulX, soulY, SOUL_SIZE, SOUL_SIZE);
    } else {
        const cx = soulX + SOUL_SIZE/2, cy = soulY + SOUL_SIZE/2;
        ctx.fillStyle = '#44aaff';
        ctx.beginPath();
        ctx.moveTo(cx, cy + 5);
        ctx.bezierCurveTo(cx - 10, cy - 10, cx - 10, cy + 5, cx, cy + 10);
        ctx.bezierCurveTo(cx + 10, cy + 5, cx + 10, cy - 10, cx, cy + 5);
        ctx.fill();
    }

    // 物品菜单（只显示HP药水，每个药水占一格，文字居中放大）
    if (itemMenuOpen) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('物品', boxX + boxW/2, boxY + 40);
        
        const cols = 2;
        const rows = 3;
        const cellW = (boxW - 40) / cols;
        const cellH = (boxH - 80) / rows;
        const startX = boxX + 20;
        const startY = boxY + 60;
        
        const pageStart = currentPage * itemsPerPage;
        const pageItems = hpPotionsList.slice(pageStart, pageStart + itemsPerPage);
        
        for (let i = 0; i < rows * cols; i++) {
            const item = pageItems[i];
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = startX + col * cellW;
            const y = startY + row * cellH;
            if (item) {
                ctx.fillStyle = (i === selectedItemIndex) ? '#ffaa00' : '#444';
                ctx.fillRect(x, y, cellW - 5, cellH - 5);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 20px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.name, x + (cellW - 5) / 2, y + (cellH - 5) / 2);
            } else {
                ctx.fillStyle = '#222';
                ctx.fillRect(x, y, cellW - 5, cellH - 5);
            }
        }
        const totalPages = Math.ceil(hpPotionsList.length / itemsPerPage);
        if (totalPages > 1) {
            ctx.fillStyle = '#aaa';
            ctx.font = '14px monospace';
            ctx.fillText(`第 ${currentPage+1} / ${totalPages} 页`, boxX + boxW/2, boxY + boxH - 15);
        }
        ctx.font = '12px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText('← → 翻页  方向键选择   Z 使用   X 返回', boxX + boxW/2, boxY + boxH - 5);
        if (tempMsg) {
            ctx.fillStyle = 'yellow';
            ctx.font = '14px monospace';
            ctx.fillText(tempMsg, boxX + boxW/2, boxY + boxH - 35);
        }
        return;
    }

    const hpw = 200, hph = 15, hpp = Math.min(1, playerHP / PLAYER_MAX_HP);
    ctx.fillStyle = '#333';
    ctx.fillRect(20, H - 30, hpw, hph);
    ctx.fillStyle = '#f00';
    ctx.fillRect(20, H - 30, hpw * hpp, hph);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(20, H - 30, hpw, hph);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`HP: ${Math.ceil(playerHP)}/${PLAYER_MAX_HP}`, 25, H - 18);
    ctx.fillText(`💊 x${hpPotionCount}`, 230, H - 18);

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
    else if (turn === 'boss') ctx.fillText('BOSS 攻击中！← → 移动躲避！', 20, 30);
    if (turn === 'gameover') {
        ctx.fillStyle = victory ? 'gold' : '#ff4444';
        ctx.font = 'bold 20px monospace';
        if (victory) ctx.fillText('点击下方按钮返回黑屋', W/2 - 120, H/2 + 60);
        else ctx.fillText('你死了...', W/2 - 40, H/2 + 40);
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