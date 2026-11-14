// 视觉.js - 绘制函数

// 辅助：圆角矩形
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        return this;
    };
}

// 绘制函数
function draw() {
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // 黄色壁灯
    DECORATIONS.forEach(dec => {
        const screenX = dec.x - cameraX;
        const screenY = dec.y;
        if (screenX + dec.width < 0 || screenX > VIEW_WIDTH) return;
        ctx.fillStyle = dec.color;
        ctx.fillRect(screenX, screenY, dec.width, dec.height);
    });

    // 敌人
    enemies.forEach(enemy => {
        const screenX = enemy.worldX - cameraX;
        const screenY = enemy.worldY;
        if (screenX + enemy.width < 0 || screenX > VIEW_WIDTH) return;
        ctx.fillStyle = enemy.color;
        ctx.fillRect(screenX, screenY, enemy.width, enemy.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(enemy.hp, screenX + 6, screenY - 8);
    });

    // 砖头投射物
    ctx.shadowColor = '#fa0';
    ctx.shadowBlur = 8;
    projectiles.forEach(b => {
        const screenX = b.worldX - cameraX;
        const screenY = b.worldY;
        ctx.save();
        ctx.translate(screenX + b.width/2, screenY + b.height/2);
        ctx.rotate(b.angle);
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(-b.width/2, -b.height/2, b.width, b.height);
        ctx.restore();
    });

    // 绘制穿刺攻击物
    if (pierceProjectile) {
        ctx.save();
        const screenX = pierceProjectile.x - cameraX;
        const screenY = pierceProjectile.y;
        const angle = Math.atan2(pierceProjectile.vy, pierceProjectile.vx);
        ctx.translate(screenX + pierceProjectile.width/2, screenY + pierceProjectile.height/2);
        ctx.rotate(angle);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-pierceProjectile.width/2, -pierceProjectile.height/2, pierceProjectile.width, pierceProjectile.height);
        ctx.restore();
    }

    // 预览砖块与轨迹
    if (charging && previewBrick.active) {
        const previewScreenX = previewBrick.worldX - cameraX;
        const previewScreenY = previewBrick.worldY;
        ctx.save();
        ctx.translate(previewScreenX + BRICK_WIDTH/2, previewScreenY + BRICK_HEIGHT/2);
        ctx.rotate(previewBrick.angle);
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#cd853f';
        ctx.fillRect(-BRICK_WIDTH/2, -BRICK_HEIGHT/2, BRICK_WIDTH, BRICK_HEIGHT);
        ctx.restore();

        // 预测轨迹
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
            const startX = previewBrick.worldX + BRICK_WIDTH/2;
            const startY = previewBrick.worldY + BRICK_HEIGHT/2;
            const vx = normX * BRICK_SPEED;
            const vy = normY * BRICK_SPEED;

            ctx.beginPath();
            ctx.strokeStyle = '#aaa';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.5;
            let x = startX, y = startY;
            let vxSim = vx, vySim = vy;
            ctx.moveTo(x - cameraX, y);
            for (let t = 0.1; t <= 2.0; t += 0.1) {
                vySim += BRICK_GRAVITY * 0.1;
                x += vxSim * 0.1;
                y += vySim * 0.1;
                ctx.lineTo(x - cameraX, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x - cameraX, y, 3, 0, 2*Math.PI);
            ctx.fill();
        }
    }

    // 玩家
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    const playerScreenX = player.worldX - cameraX + player.visualOffsetX;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(playerScreenX, player.worldY, player.width, player.height);

    // 玩家头顶方向键
    const arrowCenterX = playerScreenX + player.width / 2;
    const arrowBaseY = player.worldY - 20;
    ctx.fillStyle = '#333333';
    ctx.shadowColor = '#aaa';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.roundRect(arrowCenterX - 14, arrowBaseY - 12, 28, 20, 6);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Segoe UI", "Arial Unicode MS", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.facing === 1 ? '→' : '←', arrowCenterX, arrowBaseY);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ff0';
    ctx.fillText('⤴' + player.jumpsLeft, arrowCenterX, arrowBaseY - 15);
}

// 启动游戏循环
function gameLoop(now) {
    update(now);
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop();