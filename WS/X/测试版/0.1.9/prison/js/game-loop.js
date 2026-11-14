// ---------- 主游戏循环及事件 ----------

// 指令输入状态
let commandInputActive = false;
let commandOverlay = null;
let commandInput = null;

// 创建指令输入界面
function createCommandUI() {
    if (commandOverlay) return;

    // 半透明遮罩
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

    // 输入框容器
    const inputWrapper = document.createElement('div');
    inputWrapper.style.width = '80%';
    inputWrapper.style.maxWidth = '600px';
    inputWrapper.style.background = '#000';
    inputWrapper.style.border = '2px solid #fff';
    inputWrapper.style.borderRadius = '8px';
    inputWrapper.style.padding = '16px';
    inputWrapper.style.display = 'flex';
    inputWrapper.style.alignItems = 'center';

    // 斜杠前缀
    const prefix = document.createElement('span');
    prefix.textContent = '/';
    prefix.style.color = '#fff';
    prefix.style.fontSize = '20px';
    prefix.style.marginRight = '8px';
    prefix.style.fontFamily = 'monospace';

    // 真正的输入框
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
    commandInput.placeholder = 'bm 14  或  tune LV = 3';

    inputWrapper.appendChild(prefix);
    inputWrapper.appendChild(commandInput);
    commandOverlay.appendChild(inputWrapper);
    document.body.appendChild(commandOverlay);

    // 点击遮罩关闭
    commandOverlay.addEventListener('click', (e) => {
        if (e.target === commandOverlay) {
            closeCommandUI();
        }
    });

    // 回车提交
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
    // ---- 处理 /bm 指令 ----
    const bmMatch = cmd.match(/^bm\s+(\d+)$/i);
    if (bmMatch) {
        const block = parseInt(bmMatch[1], 10);
        if (block < 0) {
            alert('区块不可小于0');
            return;
        }
        if (block > 20) {
            alert('区块不可大于20');
            return;
        }
        if (block >= MAP_CHUNKS) {
            alert('区块不可大于最大区块数(' + (MAP_CHUNKS - 1) + ')');
            return;
        }
        const targetX = block * CHUNK_SIZE + CHUNK_SIZE / 2 - player.w / 2;
        player.x = Math.min(Math.max(0, targetX), WORLD_W - player.w);
        player.y = getGroundY();
        player.vy = 0;
        player.jumpsLeft = 2;
        cameraX = Math.max(0, Math.min(player.x - VIEW_W/2, WORLD_W - VIEW_W));
        return;
    }

    // ---- 处理 /tune 指令 ----
    const tuneMatch = cmd.match(/^tune\s+LV\s*=\s*(\d+)$/i);
    if (tuneMatch) {
        const newLevel = parseInt(tuneMatch[1], 10);
        if (isNaN(newLevel) || newLevel < 1) {
            alert('等级不能小于1');
            return;
        }
        if (newLevel > 20) {
            alert('等级不能大于20');
            return;
        }
        level = newLevel;
        exp = 0;
        if (panelVisible) updatePanelUI();
        alert(`已设置等级为 ${level}，经验值已重置。`);
        return;
    }

    alert('指令格式错误！\n可用指令：/bm 区块号  /tune LV = 等级');
}

// ---------- 原有代码（略做调整：加入指令触发）----------
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
    if (e.button===0) { e.preventDefault(); if (!player.attacking) { player.attacking=true; player.attackStart=performance.now(); performAttack(); } }
    else if (e.button===2) { e.preventDefault(); charging=true; updatePreview(); }
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

    if (victory||gameOver) {
        if (e.code === 'KeyT') {
            e.preventDefault();
            commandInputActive = true;
            createCommandUI();
            if (commandInput) commandInput.focus();
        }
        return;
    }

    let c = e.code;

    // T键打开指令输入
    if (c === 'KeyT') {
        e.preventDefault();
        commandInputActive = true;
        createCommandUI();
        if (commandInput) commandInput.focus();
        return;
    }

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

    let c = e.code;
    if (c==='KeyF') { e.preventDefault(); if (panelVisible) { panelVisible=false; statusPanel.style.display='none'; } return; }
    if (c==='KeyA'||c==='ArrowLeft') { left=false; e.preventDefault(); }
    else if (c==='KeyD'||c==='ArrowRight') { right=false; e.preventDefault(); }
    else if (c==='Space'||c==='ArrowUp') { jumpUsed=false; e.preventDefault(); }
    else if (c==='ShiftLeft'||c==='ShiftRight') { shiftDown=false; e.preventDefault(); }
    else if (c==='ArrowDown') { arrowDown=false; e.preventDefault(); }
    else if (c==='KeyC') { if (pierceCharge) pierceCharge=false; e.preventDefault(); }
});

function onBlur() { left=right=shiftDown=arrowDown=jumpUsed=charging=false; if (panelVisible) { panelVisible=false; statusPanel.style.display='none'; } shopPanel.style.display='none'; confirmModal.style.display='none'; }
window.addEventListener('blur', onBlur);
document.addEventListener('visibilitychange', () => { if (document.hidden) onBlur(); });

// 黑色敌人子弹更新
function updateBlackEnemyBullets() {
    for (let enemy of enemies) {
        if (enemy.type !== 'black') continue;
        if (enemy.stun > 0) continue;
        let now = performance.now();
        if (now - enemy.lastAttack >= BLACK_ENEMY_ATTACK_COOLDOWN) {
            let ecx = enemy.x + enemy.w/2, ecy = enemy.y + enemy.h/2;
            let pcx = player.x + player.w/2, pcy = player.y + player.h/2;
            let dx = pcx - ecx, dy = pcy - ecy, len = Math.hypot(dx,dy);
            if (len > 0.001) {
                let nx = dx/len, ny = dy/len;
                projectiles.push({
                    x: ecx-2, y: ecy-2, vx: nx*BLACK_ENEMY_BULLET_SPEED, vy: ny*BLACK_ENEMY_BULLET_SPEED,
                    w:4, h:4, damage:BLACK_ENEMY_BULLET_DAMAGE, isEnemy:true, startX:ecx, startY:ecy
                });
            }
            enemy.lastAttack = now;
        }
    }
    for (let i=projectiles.length-1; i>=0; i--) {
        let b = projectiles[i];
        if (!b.isEnemy) continue;
        b.x += b.vx; b.y += b.vy;
        let dx = b.x - b.startX, dy = b.y - b.startY;
        if (dx*dx+dy*dy > BLACK_ENEMY_BULLET_MAX_DISTANCE*BLACK_ENEMY_BULLET_MAX_DISTANCE ||
            b.x<-50||b.x>WORLD_W+50||b.y<-50||b.y>WORLD_H+50) {
            projectiles.splice(i,1);
            continue;
        }
        if (rectCollide({x:b.x,y:b.y,w:b.w,h:b.h}, player)) {
            playerHP = Math.max(0, playerHP - b.damage);
            projectiles.splice(i,1);
        }
    }
}

// 物理碰撞更新
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
    if (victory || gameOver) return;

    // ========== BOSS 跳转检测 ==========
    if (boss) {
        const dist = Math.abs((player.x + player.w/2) - (boss.x + boss.w/2));
        if (dist <= 120) {
            window.location.href = 'boss-battle/index.html';
            return;
        }
    }
    // ==================================

    for (let sp of savePoints) if (player.x + player.w > sp.x && player.x < sp.x + sp.width) { doSave(now); break; }
    updatePlayerMovement();
    updateAttackAnimation(now);
    updateEnemies(now);
    updateProjectiles();
    updateBlackEnemyBullets();
    updatePierce(now);

    // 启用 BOSS 移动和变装，激光移除
    updateBoss(now);
    // updateLaser(now);

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