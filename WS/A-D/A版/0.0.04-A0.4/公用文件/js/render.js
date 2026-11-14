// ========== UI 渲染（独立于场景） ==========
function drawUI() {
    // 天赋 / 成就界面优先
    if (talentOpen) {
        if (typeof drawTalentTree === 'function') { drawTalentTree(); return; }
    }
    if (achievementOpen) {
        if (typeof drawAchievements === 'function') { drawAchievements(); return; }
    }

    // ---------- 左上角 HP 条 ----------
    let hpw = 180, hph = 14, hpp = Math.min(1, Math.max(0, playerHP / currentMaxHp));
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(10, 10, hpw, hph + 10, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px "Segoe UI", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('HP', 16, 20);
    ctx.textAlign = 'start';

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(40, 13, hpw - 44, hph, 6);
    ctx.fill();

    const gradient = ctx.createLinearGradient(40, 0, 40 + (hpw - 44) * hpp, 0);
    if (hpp > 0.5) {
        gradient.addColorStop(0, '#2ecc71');
        gradient.addColorStop(1, '#27ae60');
    } else if (hpp > 0.25) {
        gradient.addColorStop(0, '#f39c12');
        gradient.addColorStop(1, '#e67e22');
    } else {
        gradient.addColorStop(0, '#e74c3c');
        gradient.addColorStop(1, '#c0392b');
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(40, 13, (hpw - 44) * hpp, hph, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px "Segoe UI", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(playerHP)} / ${currentMaxHp}`, 40 + (hpw - 44) / 2, 23);
    ctx.textAlign = 'start';

    // ---------- 科技盾牌充能条 ----------
    if (window.hasTechShield) {
        const shx = 10, shy = 34, shw = hpw, shh = 10;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(shx, shy, shw, shh + 8, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.roundRect(shx + 26, shy + 3, shw - 34, shh, 5);
        ctx.fill();
        const charge = Math.min(1, Math.max(0, (window.shieldCharge || 0) / 100));
        if (charge > 0) {
            const g2 = ctx.createLinearGradient(shx + 26, 0, shx + 26 + (shw - 34) * charge, 0);
            g2.addColorStop(0, '#33ccff');
            g2.addColorStop(1, '#66ffff');
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.roundRect(shx + 26, shy + 3, (shw - 34) * charge, shh, 5);
            ctx.fill();
        }
        ctx.fillStyle = window.shieldActive ? 'rgba(120,255,255,0.95)' : 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 10px "Segoe UI", monospace';
        ctx.textAlign = 'center';
        const label = window.shieldActive ? '🛡 护盾激活' : ('🛡 充能 ' + Math.floor(window.shieldCharge || 0) + '%');
        ctx.fillText(label, shx + 26 + (shw - 34) / 2, shy + shh + 4);
        ctx.textAlign = 'start';
    }

    // ---------- 右上角装备图标 ----------
    const iconSize = 36, weaponSize = 40, spacing = 6, rightMargin = 12, topY = 10;
    let weaponX = VIEW_W - weaponSize - rightMargin;
    let crossX = weaponX - iconSize - spacing;
    let maskX = crossX - iconSize - spacing;
    if (maskX < 0) { let offset = -maskX; maskX += offset; crossX += offset; weaponX += offset; }

    if (window.hasClownMask) {
        const y = topY;
        ctx.fillStyle = 'rgba(255,50,50,0.08)';
        ctx.beginPath();
        ctx.roundRect(maskX - 2, y - 2, iconSize + 4, iconSize + 4, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,50,50,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(maskX - 2, y - 2, iconSize + 4, iconSize + 4, 8);
        ctx.stroke();
        const maskImg = new Image();
        maskImg.src = '../公用文件/图片/装备/其他/小丑面具.png';
        if (maskImg.complete && maskImg.naturalWidth > 0) {
            ctx.drawImage(maskImg, maskX, y, iconSize, iconSize);
        } else {
            ctx.fillStyle = '#ff4444';
            ctx.font = '24px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🤡', maskX + iconSize / 2, y + iconSize - 4);
            ctx.textAlign = 'start';
        }
        ctx.fillStyle = 'rgba(255,100,100,0.6)';
        ctx.font = '8px "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('面具', maskX + iconSize / 2, y + iconSize + 14);
        ctx.textAlign = 'start';
    }

    if (window.hasCross) {
        const y = topY;
        ctx.fillStyle = 'rgba(255,215,0,0.08)';
        ctx.beginPath();
        ctx.roundRect(crossX - 2, y - 2, iconSize + 4, iconSize + 4, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,0,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(crossX - 2, y - 2, iconSize + 4, iconSize + 4, 8);
        ctx.stroke();
        const crossImg = new Image();
        crossImg.src = '../公用文件/图片/装备/增益/十字架.png';
        if (crossImg.complete && crossImg.naturalWidth > 0) {
            ctx.drawImage(crossImg, crossX, y, iconSize, iconSize);
        } else {
            ctx.fillStyle = '#ffdd44';
            ctx.font = '24px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('✝', crossX + iconSize / 2, y + iconSize - 4);
            ctx.textAlign = 'start';
        }
        ctx.fillStyle = 'rgba(68,255,136,0.6)';
        ctx.font = '8px "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('十字', crossX + iconSize / 2, y + iconSize + 14);
        ctx.textAlign = 'start';
    }

    if (typeof currentWeapon !== 'undefined' && currentWeapon && currentWeapon.icon) {
        const y = topY;
        ctx.fillStyle = 'rgba(255,215,0,0.06)';
        ctx.beginPath();
        ctx.roundRect(weaponX - 2, y - 2, weaponSize + 4, weaponSize + 4, 8);
        ctx.fill();
        let weaponImg = new Image();
        weaponImg.src = currentWeapon.icon;
        if (weaponImg.complete && weaponImg.naturalWidth > 0) {
            ctx.drawImage(weaponImg, weaponX, y, weaponSize, weaponSize);
        } else {
            ctx.fillStyle = 'rgba(255,215,0,0.3)';
            ctx.font = '10px "Segoe UI", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(currentWeapon.name || '武器', weaponX + weaponSize / 2, y + weaponSize / 2 + 4);
            ctx.textAlign = 'start';
        }
        ctx.fillStyle = 'rgba(255,215,0,0.5)';
        ctx.font = '8px "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('武器', weaponX + weaponSize / 2, y + weaponSize + 14);
        ctx.textAlign = 'start';
    }

    drawHotbar();
    if (typeof drawDragLayer === 'function') drawDragLayer();
    // ===== 近战粒子绘制 =====
    if (typeof updateParticles === 'function') updateParticles();
    for (const p of HIT_PARTICLES) {
        const alpha = Math.max(0, p.life);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---------- 消息提示 ----------
    if (window.inventoryMessage) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.roundRect(VIEW_W / 2 - 140, VIEW_H - 80, 280, 32, 16);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '13px "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(window.inventoryMessage, VIEW_W / 2, VIEW_H - 60);
        ctx.textAlign = 'start';
    }

    // ---------- 游戏结束遮罩 ----------
    if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', VIEW_W / 2, VIEW_H / 2);
        ctx.textAlign = 'start';
    }
}

// 兼容旧调用
function draw() {
    drawScene();
    drawUI();
}