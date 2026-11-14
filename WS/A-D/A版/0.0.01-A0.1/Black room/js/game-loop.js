// ---------- 主游戏循环及事件 ----------
let commandInputActive = false;
let commandOverlay = null;
let commandInput = null;

let mouseLeftClicked = false;
let mouseRightClicked = false;

// 创建指令输入界面
function createCommandUI() {
    if (commandOverlay) return;
    commandOverlay = document.createElement('div');
    commandOverlay.style.position = 'fixed';
    commandOverlay.style.top = '0';
    commandOverlay.style.left = '0';
    commandOverlay.style.width = '100%';
    commandOverlay.style.height = '100%';
    commandOverlay.style.background = 'rgba(0,0,0,0.7)';
    commandOverlay.style.zIndex = '1000';
    commandOverlay.style.display = 'flex';
    commandOverlay.style.justifyContent = 'center';
    commandOverlay.style.alignItems = 'center';

    const inputWrapper = document.createElement('div');
    inputWrapper.style.width = '80%';
    inputWrapper.style.maxWidth = '600px';
    inputWrapper.style.background = '#000';
    inputWrapper.style.border = '2px solid #fff';
    inputWrapper.style.borderRadius = '8px';
    inputWrapper.style.padding = '16px';
    inputWrapper.style.display = 'flex';
    inputWrapper.style.alignItems = 'center';

    const prefix = document.createElement('span');
    prefix.textContent = '/';
    prefix.style.color = '#fff';
    prefix.style.fontSize = '20px';
    prefix.style.marginRight = '8px';
    prefix.style.fontFamily = 'monospace';

    commandInput = document.createElement('input');
    commandInput.type = 'text';
    commandInput.style.flex = '1';
    commandInput.style.background = '#000';
    commandInput.style.border = 'none';
    commandInput.style.outline = 'none';
    commandInput.style.color = '#fff';
    commandInput.style.fontSize = '20px';
    commandInput.style.fontFamily = 'monospace';
    commandInput.style.padding = '4px';
    commandInput.placeholder = 'bm 14  或  tune LV = 3  或  summon 5 block  或  kill';

    inputWrapper.appendChild(prefix);
    inputWrapper.appendChild(commandInput);
    commandOverlay.appendChild(inputWrapper);
    document.body.appendChild(commandOverlay);

    commandOverlay.addEventListener('click', (e) => {
        if (e.target === commandOverlay) closeCommandUI();
    });
    commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = commandInput.value.trim();
            executeCommand(cmd);
            closeCommandUI();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeCommandUI();
        }
    });
}

function closeCommandUI() {
    if (commandOverlay) {
        document.body.removeChild(commandOverlay);
        commandOverlay = null;
        commandInput = null;
        commandInputActive = false;
        canvas.focus();
    }
}

function executeCommand(cmd) {
    // 处理 kill 指令（杀死所有红色和黑色敌人，并掉落奖励）
    if (cmd.toLowerCase() === 'kill') {
        let killed = 0;
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.type === 'red' || e.type === 'black') {
                if (typeof addKillReward === 'function') addKillReward();
                killCount++;
                enemies.splice(i, 1);
                killed++;
            }
        }
        if (panelVisible) updatePanelUI();
        alert(`已杀死 ${killed} 个敌人`);
        return;
    }

    // 处理 summon 指令
    const summonMatch = cmd.match(/^summon\s+(\d+)\s+(\w+)(?:\s+(\d+))?$/i);
    if (summonMatch) {
        const count = parseInt(summonMatch[1], 10);
        const type = summonMatch[2].toLowerCase();
        const chunkArg = summonMatch[3];
        let targetChunk = null;
        if (chunkArg !== undefined) targetChunk = parseInt(chunkArg, 10);
        summonEnemies(count, type, targetChunk);
        return;
    }

    // bm 指令（跳转区块）
    const bmMatch = cmd.match(/^bm\s+(\d+)$/i);
    if (bmMatch) {
        const block = parseInt(bmMatch[1], 10);
        if (block < 0) { alert('区块不可小于0'); return; }
        if (block >= MAP_CHUNKS) { alert('区块不可大于最大区块数(' + (MAP_CHUNKS - 1) + ')'); return; }
        const targetX = block * CHUNK_SIZE + CHUNK_SIZE / 2 - player.w / 2;
        player.x = Math.min(Math.max(0, targetX), WORLD_W - player.w);
        player.y = getGroundY();
        player.vy = 0;
        player.jumpsLeft = talentTripleJump ? 3 : 2;
        cameraX = Math.max(0, Math.min(player.x - VIEW_W/2, WORLD_W - VIEW_W));
        return;
    }

    // tune 指令（调整等级）
    const tuneMatch = cmd.match(/^tune\s+LV\s*=\s*(\d+)$/i);
    if (tuneMatch) {
        const newLevel = parseInt(tuneMatch[1], 10);
        if (isNaN(newLevel) || newLevel < 1) { alert('等级不能小于1'); return; }
        if (newLevel > 20) { alert('等级不能大于20'); return; }
        level = newLevel;
        exp = 0;
        if (panelVisible) updatePanelUI();
        alert(`已设置等级为 ${level}，经验值已重置。`);
        return;
    }

    alert('指令格式错误！\n可用指令：\n/bm 区块号\n/tune LV = 等级\n/summon 数量 生物名 [区块号] (数量最大100)\n/kill');
}

// 召唤敌人函数（上限提升到100）
function summonEnemies(count, type, targetChunk) {
    if (count <= 0 || count > 100) {
        alert('数量应为 1 到 100 之间');
        return;
    }
    if (type !== 'block' && type !== 'black') {
        alert('生物名只能是 block（红色敌人）或 black（黑色敌人）');
        return;
    }
    const enemyType = type === 'block' ? 'red' : 'black';
    let minX, maxX;
    if (targetChunk !== undefined) {
        if (targetChunk < 0 || targetChunk >= MAP_CHUNKS) {
            alert('区块号超出范围 (0-' + (MAP_CHUNKS-1) + ')');
            return;
        }
        minX = targetChunk * CHUNK_SIZE;
        maxX = (targetChunk + 1) * CHUNK_SIZE - ENEMY_W;
    } else {
        minX = player.x - 200;
        maxX = player.x + player.w + 200;
        if (minX < 0) minX = 0;
        if (maxX > WORLD_W - ENEMY_W) maxX = WORLD_W - ENEMY_W;
        if (maxX <= minX) maxX = minX + 100;
    }
    const groundY = WORLD_H - ENEMY_H - GROUND_Y_OFFSET;
    let spawned = 0;
    for (let i = 0; i < count; i++) {
        let x = minX + Math.random() * (maxX - minX);
        x = Math.min(maxX, Math.max(minX, x));
        let overlap = true;
        let attempts = 0;
        while (overlap && attempts < 10) {
            overlap = false;
            if (Math.abs(x - player.x) < 40) {
                overlap = true;
                x = minX + Math.random() * (maxX - minX);
                attempts++;
            }
        }
        const enemy = {
            x: x, y: groundY, w: ENEMY_W, h: ENEMY_H,
            hp: ENEMY_HP, stun: 0, type: enemyType,
            lastAttack: 0, hitFlash: 0,
            summoned: true
        };
        enemy.color = enemyType === 'red' ? '#ff0000' : BLACK_ENEMY_COLOR;
        enemies.push(enemy);
        spawned++;
    }
    alert(`成功召唤 ${spawned} 个 ${type === 'block' ? '红色敌人' : '黑色敌人'}${targetChunk !== undefined ? ' 在区块 ' + targetChunk : ' 在玩家附近'}`);
    if (typeof checkAchievements === 'function') checkAchievements();
}

function updatePreview() {
    let pcx = player.x, pcy = player.y+player.h/2, tw = mouseScreenX+cameraX, th = mouseScreenY, dx = tw-pcx, dy = th-pcy, len = Math.hypot(dx,dy);
    if (len>0.001) { let nx=dx/len, ny=dy/len; previewBrick.worldX = pcx - nx*BRICK_BACK; previewBrick.worldY = pcy - ny*BRICK_BACK; previewBrick.angle = Math.atan2(dy,dx); previewBrick.active = true; }
    else previewBrick.active = false;
}

canvas.addEventListener('mousemove', e => {
    let r = canvas.getBoundingClientRect(), sx = canvas.width/r.width, sy = canvas.height/r.height;
    mouseScreenX = Math.min(Math.max(0, (e.clientX-r.left)*sx), VIEW_W);
    mouseScreenY = Math.min(Math.max(0, (e.clientY-r.top)*sy), VIEW_H);
    if (charging) updatePreview();
});

canvas.addEventListener('mousedown', e => {
    if (victory||gameOver) return;
    if (e.button===0) {
        mouseLeftClicked = true;
        if (!player.attacking) { player.attacking=true; player.attackStart=performance.now(); performAttack(); }
    }
    else if (e.button===2) { 
        e.preventDefault(); 
        mouseRightClicked = true;
        charging=true; 
        updatePreview(); 
    }
});

canvas.addEventListener('mouseup', e => {
    if (victory||gameOver) return;
    if (e.button===2 && charging) {
        e.preventDefault(); let now=performance.now(); if (now-lastBrick<BRICK_CD) { charging=false; return; } lastBrick=now;
        let pcx=player.x, pcy=player.y+player.h/2, tw=mouseScreenX+cameraX, th=mouseScreenY, dx=tw-pcx, dy=th-pcy, len=Math.hypot(dx,dy);
        if (len>0.001) { let nx=dx/len, ny=dy/len; projectiles.push({ x:previewBrick.worldX, y:previewBrick.worldY, vx:nx*BRICK_SPD, vy:ny*BRICK_SPD, angle:previewBrick.angle, w:BRICK_W, h:BRICK_H, damage:getBrickDamage(), isEnemy:false }); }
        charging=false;
    }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mouseleave', () => charging=false);

window.addEventListener('keydown', e => {
    if (commandInputActive) return;
    if (window.codeEditorOpen) return;   // 控制台打开时忽略所有游戏按键
    if (victory||gameOver) return;
    let c = e.code;

    // 数字键 1-9 使用快捷栏物品
    if (c >= 'Digit1' && c <= 'Digit9') {
        e.preventDefault();
        const slotIndex = parseInt(c.slice(-1)) - 1;
        if (slotIndex >= 0 && slotIndex < INVENTORY_SIZE) {
            useItemFromSlot(slotIndex);
        }
        return;
    }

    // 指令输入开关（T键）
    if (c === 'KeyT') {
        e.preventDefault();
        commandInputActive = true;
        createCommandUI();
        if (commandInput) commandInput.focus();
        return;
    }
    // 天赋树开关（Z键）
    if (c === 'KeyZ') {
        e.preventDefault();
        if (!achievementOpen) {
            talentOpen = !talentOpen;
            if (talentOpen) achievementOpen = false;
        }
        return;
    }
    // 成就系统开关（X键）
    if (c === 'KeyX') {
        e.preventDefault();
        if (!talentOpen) {
            achievementOpen = !achievementOpen;
            if (achievementOpen) talentOpen = false;
        }
        return;
    }

    // 如果天赋或成就打开，忽略其他游戏操作
    if (talentOpen || achievementOpen) return;

    if (c==='KeyF') { e.preventDefault(); if (!panelVisible) { panelVisible=true; statusPanel.style.display='block'; updatePanelUI(); } return; }
    if (c==='KeyH') { e.preventDefault(); shopPanel.style.display = shopPanel.style.display==='flex' ? 'none' : 'flex'; return; }
    if (c==='KeyS') { e.preventDefault(); exportSave(); return; }
    if (c==='KeyL') { e.preventDefault(); triggerLoad(); return; }
    if (c==='KeyA'||c==='ArrowLeft') { left=true; e.preventDefault(); }
    else if (c==='KeyD'||c==='ArrowRight') { right=true; e.preventDefault(); }
    else if (c==='Space'||c==='ArrowUp') { if (!jumpUsed) { let g = player.y >= getGroundY()-0.001; if (g||player.jumpsLeft>0) { player.vy=JUMP_POWER; jumpUsed=true; player.jumpsLeft = g ? 1 : player.jumpsLeft-1; } } e.preventDefault(); }
    else if (c==='ShiftLeft'||c==='ShiftRight') { shiftDown=true; e.preventDefault(); }
    else if (c==='ArrowDown') { arrowDown=true; e.preventDefault(); }
    else if (c==='KeyC') { e.preventDefault(); let now=performance.now(); if (now-lastPierce>=PIERCE_CD && !pierceCharge && !pierceProjectile) { pierceCharge=true; pierceStart=now; } }
});

window.addEventListener('keyup', e => {
    if (commandInputActive) return;
    if (window.codeEditorOpen) return;   // 控制台打开时忽略所有游戏按键
    if (talentOpen || achievementOpen) return;
    let c = e.code;
    if (c==='KeyF') { e.preventDefault(); if (panelVisible) { panelVisible=false; statusPanel.style.display='none'; } return; }
    if (c==='KeyA'||c==='ArrowLeft') { left=false; e.preventDefault(); }
    else if (c==='KeyD'||c==='ArrowRight') { right=false; e.preventDefault(); }
    else if (c==='Space'||c==='ArrowUp') { jumpUsed=false; e.preventDefault(); }
    else if (c==='ShiftLeft'||c==='ShiftRight') { shiftDown=false; e.preventDefault(); }
    else if (c==='ArrowDown') { arrowDown=false; e.preventDefault(); }
    else if (c==='KeyC') { if (pierceCharge) pierceCharge=false; e.preventDefault(); }
});

function onBlur() {
    left=right=shiftDown=arrowDown=jumpUsed=charging=false;
    if (panelVisible) { panelVisible=false; statusPanel.style.display='none'; }
    shopPanel.style.display='none';
    confirmModal.style.display='none';
    talentOpen = false;
    achievementOpen = false;
    mouseLeftClicked = false;
    mouseRightClicked = false;
    if (commandOverlay) closeCommandUI();
}
window.addEventListener('blur', onBlur);
document.addEventListener('visibilitychange', () => { if (document.hidden) onBlur(); });

function updateCollision() {
    let allEntities = [player, ...enemies];
    if (boss) allEntities.push(boss);
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
}

function update(now) {
    if (window.codeEditorOpen) return;   // 控制台打开时暂停游戏逻辑
    if (victory || gameOver) return;
    if (talentOpen || achievementOpen) {
        if (typeof updateInventory === 'function') updateInventory();
        return;
    }
    if (boss) {
        const dist = Math.abs((player.x + player.w/2) - (boss.x + boss.w/2));
        if (dist <= 120) {
            window.location.href = 'boss-battle/index.html?lv=' + level;
            return;
        }
    }
    for (let sp of savePoints) if (player.x + player.w > sp.x && player.x < sp.x + sp.width) { doSave(now); break; }
    updatePlayerMovement();
    updateAttackAnimation(now);
    updateEnemies(now);
    updateProjectiles();
    if (typeof updateBlackEnemyBullets === 'function') updateBlackEnemyBullets();
    updatePierce(now);
    updateBoss(now);
    updateCollision();
    if (playerHP <= 0) { if (!respawn()) gameOver = true; }
    updateCam();
    if (panelVisible) updatePanelUI();
}

function loop(t) {
    update(t);
    draw();
    requestAnimationFrame(loop);
}