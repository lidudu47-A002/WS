// 交互.js - 键盘鼠标事件监听

// 更新预览砖块位置
function updatePreviewBrick() {
    const playerCenterX = player.worldX;
    const playerCenterY = player.worldY + player.height/2;
    const targetWorldX = mouseScreenX + cameraX;
    const targetWorldY = mouseScreenY;
    const dx = targetWorldX - playerCenterX;
    const dy = targetWorldY - playerCenterY;
    const len = Math.hypot(dx, dy);
    if (len > 0.001) {
        const normX = dx / len;
        const normY = dy / len;
        previewBrick.worldX = playerCenterX - normX * BRICK_BACK_OFFSET;
        previewBrick.worldY = playerCenterY - normY * BRICK_BACK_OFFSET;
        previewBrick.angle = Math.atan2(dy, dx);
        previewBrick.active = true;
    } else {
        previewBrick.active = false;
    }
}

// 键盘按下
function handleKeyDown(e) {
    if (victory || gameOver) return;

    const code = e.code;

    if (code === 'KeyF') {
        e.preventDefault();
        if (!panelVisible) {
            panelVisible = true;
            statusPanel.style.display = 'block';
            updatePanel();
        }
        return;
    }

    if (code === 'KeyA' || code === 'ArrowLeft') {
        leftPressed = true;
        e.preventDefault();
    }
    else if (code === 'KeyD' || code === 'ArrowRight') {
        rightPressed = true;
        e.preventDefault();
    }
    else if (code === 'Space' || code === 'ArrowUp') {
        if (!jumpUsed) {
            const onGround = player.worldY >= getGroundY() - 0.001;
            if (onGround || player.jumpsLeft > 0) {
                player.vy = JUMP_STRENGTH;
                jumpUsed = true;
                if (!onGround) {
                    player.jumpsLeft--;
                } else {
                    player.jumpsLeft = 1;
                }
            }
        }
        e.preventDefault();
    }
    else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'ArrowDown') {
        if (code === 'ShiftLeft' || code === 'ShiftRight') {
            shiftPressed = true;
        } else if (code === 'ArrowDown') {
            downPressed = true;
        }
        e.preventDefault();
    }
    // C键
    else if (code === 'KeyC') {
        e.preventDefault();
        const now = performance.now();
        if (now - lastPierceTime < PIERCE_CD) return;
        if (!pierceCharging && !pierceProjectile) {
            pierceCharging = true;
            pierceStartTime = now;
        }
    }
}

// 键盘弹起
function handleKeyUp(e) {
    if (victory || gameOver) return;

    const code = e.code;

    if (code === 'KeyF') {
        e.preventDefault();
        if (panelVisible) {
            panelVisible = false;
            statusPanel.style.display = 'none';
        }
        return;
    }

    if (code === 'KeyA' || code === 'ArrowLeft') {
        leftPressed = false;
        e.preventDefault();
    }
    else if (code === 'KeyD' || code === 'ArrowRight') {
        rightPressed = false;
        e.preventDefault();
    }
    else if (code === 'Space' || code === 'ArrowUp') {
        jumpUsed = false;
        e.preventDefault();
    }
    else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'ArrowDown') {
        if (code === 'ShiftLeft' || code === 'ShiftRight') {
            shiftPressed = false;
        } else if (code === 'ArrowDown') {
            downPressed = false;
        }
        e.preventDefault();
    }
    // C键松开
    else if (code === 'KeyC') {
        e.preventDefault();
        if (pierceCharging) {
            const now = performance.now();
            const chargeTime = (now - pierceStartTime) / 1000; // 秒
            let penetrations = PIERCE_BASE_COUNT + Math.floor(chargeTime * PIERCE_CHARGE_RATE);
            penetrations = Math.min(penetrations, PIERCE_MAX_COUNT);

            // 生成方向：玩家中心 → 鼠标世界坐标
            const playerCenterX = player.worldX + player.width/2;
            const playerCenterY = player.worldY + player.height/2;
            const targetWorldX = mouseScreenX + cameraX;
            const targetWorldY = mouseScreenY;
            const dx = targetWorldX - playerCenterX;
            const dy = targetWorldY - playerCenterY;
            const len = Math.hypot(dx, dy);
            if (len > 0.001) {
                const normX = dx / len;
                const normY = dy / len;
                pierceProjectile = {
                    x: playerCenterX - PIERCE_WIDTH/2,
                    y: playerCenterY - PIERCE_HEIGHT/2,
                    vx: normX * PIERCE_SPEED,
                    vy: normY * PIERCE_SPEED,
                    width: PIERCE_WIDTH,
                    height: PIERCE_HEIGHT,
                    penetrationsLeft: penetrations,
                    hitEnemies: new Set(),
                    lastEnemy: null,
                };
            }
            lastPierceTime = now;   // 开始冷却
            pierceCharging = false;
        }
    }
}

// 鼠标按下
canvas.addEventListener('mousedown', (e) => {
    if (victory || gameOver) return;

    if (e.button === 0) {
        e.preventDefault();
        if (!player.isAttacking) {
            player.isAttacking = true;
            player.attackStartTime = performance.now();
            player.attackHitEnemies.clear();
        }
    } else if (e.button === 2) {
        e.preventDefault();
        charging = true;
        updatePreviewBrick();
    }
});

// 鼠标弹起
canvas.addEventListener('mouseup', (e) => {
    if (victory || gameOver) return;

    if (e.button === 2 && charging) {
        e.preventDefault();
        // 冷却检查
        const now = performance.now();
        if (now - lastBrickTime < BRICK_CD) {
            charging = false; // 仍在冷却，取消蓄力
            return;
        }
        lastBrickTime = now;
        // 原生成逻辑
        const playerCenterX = player.worldX;
        const playerCenterY = player.worldY + player.height/2;
        const targetWorldX = mouseScreenX + cameraX;
        const targetWorldY = mouseScreenY;
        const dx = targetWorldX - playerCenterX;
        const dy = targetWorldY - playerCenterY;
        const len = Math.hypot(dx, dy);
        if (len > 0.001) {
            const normX = dx / len;
            const normY = dy / len;
            projectiles.push({
                worldX: previewBrick.worldX,
                worldY: previewBrick.worldY,
                vx: normX * BRICK_SPEED,
                vy: normY * BRICK_SPEED,
                angle: previewBrick.angle,
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                damage: BRICK_DAMAGE
            });
        }
        charging = false;
    }
});

// 鼠标移动
canvas.addEventListener('mousemove', (e) => {
    if (victory || gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseScreenX = (e.clientX - rect.left) * scaleX;
    mouseScreenY = (e.clientY - rect.top) * scaleY;
    mouseScreenX = Math.max(0, Math.min(mouseScreenX, VIEW_WIDTH));
    mouseScreenY = Math.max(0, Math.min(mouseScreenY, VIEW_HEIGHT));
    if (charging) {
        updatePreviewBrick();
    }
});

// 禁止右键菜单
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// 鼠标离开画布
canvas.addEventListener('mouseleave', () => {
    charging = false;
});

// 窗口失去焦点
function handleBlur() {
    leftPressed = false;
    rightPressed = false;
    shiftPressed = false;
    downPressed = false;
    jumpUsed = false;
    charging = false;
    if (panelVisible) {
        panelVisible = false;
        statusPanel.style.display = 'none';
    }
}

window.addEventListener('blur', handleBlur);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        leftPressed = false;
        rightPressed = false;
        shiftPressed = false;
        downPressed = false;
        jumpUsed = false;
        charging = false;
        if (panelVisible) {
            panelVisible = false;
            statusPanel.style.display = 'none';
        }
    }
});

// 注册键盘事件
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);