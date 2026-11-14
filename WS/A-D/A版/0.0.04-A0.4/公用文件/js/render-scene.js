// ========== 场景渲染（不含 UI） ==========
const statusImages = { slow: null, frozen: null, fire: null, permSlow: null, blackhole: null, lightning: null };
const weaponIconCache = {};

function loadStatusIcons() {
    const icons = {
        slow: '../公用文件/图片/元素和状态/减速.png',
        frozen: '../公用文件/图片/元素和状态/冰冻.png',
        fire: '../公用文件/图片/元素和状态/火焰.png',
        permSlow: '../公用文件/图片/元素和状态/减速-无限.png',
        blackhole: '../公用文件/图片/元素和状态/黑洞.png',
        lightning: '../公用文件/图片/元素和状态/电离子.png'
    };
    for (const [key, src] of Object.entries(icons)) {
        const img = new Image();
        img.src = src;
        statusImages[key] = img;
    }
}
loadStatusIcons();

function updateCam() {
    let target = cameraX;
    let psx = player.x - cameraX;
    if (psx < DEAD_ZONE_LEFT) target = player.x - DEAD_ZONE_LEFT;
    else if (psx > DEAD_ZONE_RIGHT) target = player.x - DEAD_ZONE_RIGHT;
    target = Math.min(Math.max(0, target), WORLD_W - VIEW_W);
    cameraX += (target - cameraX) * 0.1;
    cameraX = Math.min(Math.max(0, cameraX), WORLD_W - VIEW_W);
}

function drawScene() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // 牢房背景（监狱专用）
    if (typeof prisonCells !== 'undefined' && prisonCells.length > 0) {
        prisonCells.forEach(c => {
            let sx = c.x - cameraX;
            if (sx + c.width < 0 || sx > VIEW_W) return;
            ctx.fillStyle = 'rgba(40,45,55,0.25)';
            ctx.fillRect(sx, c.y, c.width, c.height);
            ctx.fillStyle = 'rgba(180,190,200,0.15)';
            const barCount = Math.floor(c.width / 22);
            for (let i = 0; i < barCount; i++) {
                ctx.fillRect(sx + i * 22 + 4, c.y, 3, c.height);
            }
            ctx.fillStyle = 'rgba(180,190,200,0.2)';
            ctx.fillRect(sx, c.y, c.width, 3);
            ctx.fillRect(sx, c.y + c.height - 3, c.width, 3);
            ctx.strokeStyle = 'rgba(180,190,200,0.12)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sx, c.y, c.width, c.height);
        });
    }

    // 黑屋装饰
    if (typeof DECOS !== 'undefined' && DECOS.length > 0) {
        DECOS.forEach(d => {
            let sx = d.x - cameraX;
            if (sx + d.w < 0 || sx > VIEW_W) return;
            ctx.fillStyle = d.color;
            ctx.fillRect(sx, d.y, d.w, d.h);
        });
    }

    // 存档点
    savePoints.forEach(sp => {
        let sx = sp.starX - cameraX;
        if (sx + 25 < 0 || sx - 25 > VIEW_W) return;
        let sy = WORLD_H - 70, sz = ANIMATION_SIZE / 2;
        if (saveStarImage && saveStarImage.complete) {
            ctx.drawImage(saveStarImage, sx - sz, sy - sz, ANIMATION_SIZE, ANIMATION_SIZE);
            ctx.save();
            ctx.shadowColor = 'rgba(255,215,0,0.6)';
            ctx.shadowBlur = 10;
            ctx.drawImage(saveStarImage, sx - sz, sy - sz, ANIMATION_SIZE, ANIMATION_SIZE);
            ctx.restore();
        } else {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(sx, sy, 16, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#ffaa33';
            for (let i = 0; i < 6; i++) {
                let a = i * Math.PI * 2 / 6;
                ctx.beginPath();
                ctx.arc(sx + Math.cos(a) * 24, sy + Math.sin(a) * 24, 6, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    });

    // 敌人
    enemies.forEach(e => {
        let sx = e.x - cameraX;
        if (sx + e.w < 0 || sx > VIEW_W) return;
        // 受击形变（Squash & Stretch）：命中瞬间挤压后回弹
        let dw = e.w, dh = e.h, dx = sx, dy = e.y;
        if (e.squash > 0) {
            const sq = e.squash;
            const sqx = 1 + sq * 0.55 * Math.sin(e.squashPhase);
            const sqy = 1 - sq * 0.4 * Math.sin(e.squashPhase);
            dw *= sqx; dh *= sqy;
            dx = sx + (e.w - dw) / 2;
            dy = e.y + (e.h - dh);
        }
        // 惯性抖动（Wobble）：受击后短时左右晃动
        if (e.wobble > 0) {
            dx += Math.sin(e.wobblePhase) * e.wobble;
        }
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
        ctx.fillRect(dx, dy, dw, dh);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(e.hp, sx + 6, e.y - 5);

        const iconSize = 24;
        let baseY = e.y - iconSize - 2;
        let offsetY = 0;

        if (e.frozenUntil && e.frozenUntil > performance.now()) {
            const iconX = sx + e.w / 2 - iconSize / 2;
            const iconY = baseY - offsetY;
            if (statusImages.frozen && statusImages.frozen.complete && statusImages.frozen.naturalWidth > 0) {
                ctx.drawImage(statusImages.frozen, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#88ccff';
                ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px monospace';
                ctx.fillText('❄', iconX + iconSize / 2 - 5, iconY + iconSize / 2 + 4);
            }
            offsetY += 26;
        }

        if (e.fireLevel > 0) {
            const iconX = sx + e.w / 2 - iconSize / 2;
            const iconY = baseY - offsetY;
            if (statusImages.fire && statusImages.fire.complete && statusImages.fire.naturalWidth > 0) {
                ctx.drawImage(statusImages.fire, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#ff6600';
                ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px monospace';
                ctx.fillText('🔥', iconX + iconSize / 2 - 5, iconY + iconSize / 2 + 4);
            }
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('x' + e.fireLevel, iconX + iconSize - 8, iconY + iconSize - 4);
            offsetY += 26;
        }

        if (e.hasPermanentSlow) {
            const iconX = sx + e.w / 2 - iconSize / 2;
            const iconY = baseY - offsetY;
            if (statusImages.permSlow && statusImages.permSlow.complete && statusImages.permSlow.naturalWidth > 0) {
                ctx.drawImage(statusImages.permSlow, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#b3b3b3';
                ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px monospace';
                ctx.fillText('∞', iconX + iconSize / 2 - 5, iconY + iconSize / 2 + 4);
            }
            offsetY += 26;
        }

        if (e.blackholeLevel > 0) {
            const iconX = sx + e.w / 2 - iconSize / 2;
            const iconY = baseY - offsetY;
            if (statusImages.blackhole && statusImages.blackhole.complete && statusImages.blackhole.naturalWidth > 0) {
                ctx.drawImage(statusImages.blackhole, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#4400aa';
                ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px monospace';
                ctx.fillText('🕳️', iconX + iconSize / 2 - 5, iconY + iconSize / 2 + 4);
            }
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('x' + e.blackholeLevel, iconX + iconSize - 8, iconY + iconSize - 4);
            offsetY += 26;
        }

        if (e.slowLevel > 0) {
            const iconX = sx + e.w / 2 - iconSize / 2;
            const iconY = baseY - offsetY;
            if (statusImages.slow && statusImages.slow.complete && statusImages.slow.naturalWidth > 0) {
                ctx.drawImage(statusImages.slow, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#cccc99';
                ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px monospace';
                ctx.fillText('🐢', iconX + iconSize / 2 - 5, iconY + iconSize / 2 + 4);
            }
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('x' + e.slowLevel, iconX + iconSize - 8, iconY + iconSize - 4);
            offsetY += 26;
        }

        if (e.weakLevel > 0) {
            const iconX = sx + e.w / 2 - iconSize / 2;
            const iconY = baseY - offsetY;
            ctx.fillStyle = '#8866aa';
            ctx.fillRect(iconX, iconY, iconSize, iconSize);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('💀', iconX + iconSize / 2, iconY + iconSize / 2 + 4);
            ctx.fillStyle = '#cc99ff';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('x' + e.weakLevel, iconX + iconSize - 8, iconY + iconSize - 4);
            ctx.textAlign = 'start';
            offsetY += 26;
        }

        if (e.lightningLevel > 0) {
            const lightningSize = 28;
            let lx = sx + e.w / 2 - lightningSize / 2;
            let ly = e.y - lightningSize - 2 - offsetY;
            const pulse = Math.sin(performance.now() / 200 + e.x) * 0.3 + 0.7;
            if (statusImages.lightning && statusImages.lightning.complete && statusImages.lightning.naturalWidth > 0) {
                ctx.save();
                ctx.shadowColor = '#aa66ff';
                ctx.shadowBlur = 15 * pulse;
                ctx.drawImage(statusImages.lightning, lx, ly, lightningSize, lightningSize);
                ctx.restore();
            } else {
                ctx.save();
                ctx.shadowColor = '#aa66ff';
                ctx.shadowBlur = 20 * pulse;
                ctx.fillStyle = 'rgba(170,102,255,' + (0.3 * pulse) + ')';
                ctx.fillRect(lx - 4, ly - 4, lightningSize + 8, lightningSize + 8);
                ctx.fillStyle = '#aa88ff';
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('⚡', sx + e.w / 2, ly + lightningSize - 2);
                ctx.restore();
            }
            ctx.fillStyle = '#cc99ff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('x' + e.lightningLevel, sx + e.w / 2, ly + lightningSize + 12);
            ctx.textAlign = 'start';
        }

        if (e.weaponId && typeof WEAPONS !== 'undefined' && WEAPONS[e.weaponId]) {
            const weapon = WEAPONS[e.weaponId];
            const wSize = 20;
            const wx = sx + e.w - wSize - 2;
            const wy = e.y - wSize - 2;
            let img = weaponIconCache[weapon.icon];
            if (!img) {
                img = new Image();
                img.src = weapon.icon;
                weaponIconCache[weapon.icon] = img;
            }
            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, wx, wy, wSize, wSize);
            } else {
                ctx.fillStyle = '#333';
                ctx.fillRect(wx, wy, wSize, wSize);
                ctx.fillStyle = '#fff';
                ctx.font = '12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(weapon.name[0], wx + wSize / 2, wy + wSize / 2 + 4);
                ctx.textAlign = 'start';
            }
        }

        if (e.controlledByPet) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = '#aa88ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx + e.w / 2, e.y + e.h / 2, e.w / 2 + 5, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.restore();
        }
    });

    // 合成标记：当前合成组红色连线 + 头顶预警红点
    if (typeof smallMergeGroup !== 'undefined' && smallMergeGroup.length === 3) {
        let pts = smallMergeGroup.map(e => ({ x: e.x + e.w / 2 - cameraX, y: e.y - 6 }));
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[(i + 1) % pts.length].x, pts[(i + 1) % pts.length].y);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        for (let e of smallMergeGroup) {
            let sx2 = e.x - cameraX;
            let pulse = Math.sin(performance.now() / 100) * 0.5 + 0.5;
            ctx.fillStyle = 'rgba(255,0,0,' + (0.4 + 0.6 * pulse).toFixed(2) + ')';
            ctx.beginPath();
            ctx.arc(sx2 + e.w / 2, e.y - 8, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // 投射物
    projectiles.forEach(b => {
        let sx = b.x - cameraX;
        if (sx + b.w < 0 || sx > VIEW_W) return;
        if (b.isEnemy) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(sx, b.y, b.w, b.h);
        } else if (b.isTechSpear) {
            const cx = sx + b.w / 2;
            const cy = b.y + b.h / 2;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(b.facing, 1);
            ctx.rotate(-Math.PI / 2);
            let spearImg = new Image();
            spearImg.src = '../公用文件/图片/装备/武器/科技长矛.png';
            if (spearImg.complete && spearImg.naturalWidth > 0) {
                ctx.drawImage(spearImg, -b.w / 2, -b.h / 2, b.w, b.h);
            } else {
                ctx.fillStyle = '#00ccff';
                ctx.shadowColor = '#00ccff';
                ctx.shadowBlur = 25;
                const len = 30;
                ctx.fillRect(-3, -len / 2, 6, len);
                ctx.beginPath();
                ctx.moveTo(0, -len / 2 - 12);
                ctx.lineTo(-9, -len / 2 + 2);
                ctx.lineTo(9, -len / 2 + 2);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        } else if (b.isBlackhole) {
            const cx = sx + b.w / 2, cy = b.y + b.h / 2;
            const radius = b.w / 2;
            b.angle = (b.angle || 0) + 0.08;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(b.angle);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.5, '#4400aa');
            gradient.addColorStop(1, '#ff6600');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,100,50,0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (b.isArrow) {
            if (b.img && b.img.complete && b.img.naturalWidth > 0) {
                ctx.drawImage(b.img, sx, b.y, b.w, b.h);
            } else {
                ctx.fillStyle = '#ffaa44';
                ctx.fillRect(sx, b.y, b.w, b.h);
                ctx.strokeStyle = '#ffffff';
                ctx.strokeRect(sx, b.y, b.w, b.h);
            }
        } else if (b.isFireball) {
            ctx.fillStyle = b.color || '#ff6600';
            ctx.beginPath();
            ctx.arc(sx + b.w / 2, b.y + b.h / 2, b.w / 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'orange';
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            ctx.save();
            ctx.translate(sx + b.w / 2, b.y + b.h / 2);
            ctx.rotate(b.angle);
            ctx.fillStyle = '#b8860b';
            ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
            ctx.restore();
        }
    });

    // 黑洞权杖：黑洞区域渲染
    if (window.blackholeZones && window.blackholeZones.length > 0) {
        for (let z of window.blackholeZones) {
            let sx = z.x - cameraX;
            if (sx + z.r < 0 || sx - z.r > VIEW_W) continue;
            let alpha = Math.max(0.25, Math.min(1, z.ttl / 3000));
            ctx.save();
            const gradient = ctx.createRadialGradient(sx, z.y, 0, sx, z.y, z.r);
            gradient.addColorStop(0, 'rgba(30,0,60,' + (0.55 * alpha) + ')');
            gradient.addColorStop(0.7, 'rgba(80,0,160,' + (0.35 * alpha) + ')');
            gradient.addColorStop(1, 'rgba(255,120,40,' + (0.25 * alpha) + ')');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, z.y, z.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,100,50,' + (0.5 * alpha) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, z.y, z.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    if (boss) {
        lasers.forEach(l => {
            let sy = 0, ey = WORLD_H, sx, ex;
            if (l.angle === 0) { sx = l.x; ex = l.x; }
            else { let e = getSlantLaserEndpoints(l.x, l.angle); sx = e.startX; ex = e.endX; }
            let ssx = sx - cameraX, sex = ex - cameraX;
            ctx.beginPath();
            ctx.moveTo(ssx, sy);
            if (l.state === 'warn') {
                ctx.lineTo(sex, ey);
                ctx.strokeStyle = 'rgba(255,0,0,' + (0.3 + Math.sin(l.blink * 2 * Math.PI) * 0.2) + ')';
                ctx.lineWidth = 20;
                ctx.stroke();
            } else if (l.state === 'act') {
                let cy = sy + (ey - sy) * l.factor, cx = sx + (ex - sx) * l.factor;
                ctx.lineTo(cx - cameraX, cy);
                ctx.strokeStyle = 'rgba(255,50,50,0.9)';
                ctx.lineWidth = 22;
                ctx.stroke();
            }
        });
    }

    // 砖头预览
    if (charging && previewBrick.active) {
        let sx = previewBrick.worldX - cameraX, sy = previewBrick.worldY;
        ctx.save();
        ctx.translate(sx + BRICK_W / 2, sy + BRICK_H / 2);
        ctx.rotate(previewBrick.angle);
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#cd853f';
        ctx.fillRect(-BRICK_W / 2, -BRICK_H / 2, BRICK_W, BRICK_H);
        ctx.restore();
        let pcx = player.x, pcy = player.y + player.h / 2,
            tx = mouseScreenX + cameraX, ty = mouseScreenY,
            dx = tx - pcx, dy = ty - pcy, len = Math.hypot(dx, dy);
        if (len > 0.001) {
            let nx = dx / len, ny = dy / len,
                sx2 = previewBrick.worldX + BRICK_W / 2, sy2 = previewBrick.worldY + BRICK_H / 2,
                vx = nx * BRICK_SPD, vy = ny * BRICK_SPD;
            ctx.beginPath();
            ctx.strokeStyle = '#aaa';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.5;
            let x = sx2, y = sy2, vxs = vx, vys = vy;
            ctx.moveTo(x - cameraX, y);
            for (let t = 0.1; t <= 2.0; t += 0.1) {
                vys += BRICK_GRAV * 0.1;
                x += vxs * 0.1;
                y += vys * 0.1;
                ctx.lineTo(x - cameraX, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x - cameraX, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // BOSS
    if (boss) {
        let sx = boss.x - cameraX;
        if (sx + boss.w > 0 && sx < VIEW_W) {
            // 受击形变/抖动
            let dw = boss.w, dh = boss.h, dx0 = sx, dy0 = boss.y;
            if (boss.squash > 0) {
                const sq = boss.squash;
                const sqx = 1 + sq * 0.55 * Math.sin(boss.squashPhase);
                const sqy = 1 - sq * 0.4 * Math.sin(boss.squashPhase);
                dw *= sqx; dh *= sqy;
                dx0 = sx + (boss.w - dw) / 2;
                dy0 = boss.y + (boss.h - dh);
            }
            if (boss.wobble > 0) dx0 += Math.sin(boss.wobblePhase) * boss.wobble;
            let cw = dw / 4, ch = dh / 4;
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    ctx.fillStyle = boss.colors[i * 4 + j];
                    ctx.fillRect(dx0 + j * cw, dy0 + i * ch, cw, ch);
                }
            }
            ctx.fillStyle = '#f00';
            ctx.fillRect(dx0, boss.y - 12, dw, 6);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(dx0, boss.y - 12, dw * (boss.hp / boss.maxHp), 6);
        }
    }

    // 玩家
    let px = player.x - cameraX + player.visualOffX;
    // 冰霜之翼滑翔拖尾（推进+绘制）
    if (window.iceTrail) {
        for (let i = window.iceTrail.length - 1; i >= 0; i--) {
            const p = window.iceTrail[i];
            p.life -= 0.045;
            p.y += (p.vy || 0.4);
            if (p.life <= 0) window.iceTrail.splice(i, 1);
        }
        for (const p of window.iceTrail) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life) * 0.6;
            ctx.fillStyle = '#aaf4ff';
            ctx.beginPath();
            ctx.arc(p.x - cameraX, p.y - cameraY, 1.5 + p.life * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    // 科技护盾（激活时角色前方半透明能量六边形）
    if (window.shieldActive) {
        const scx = px + player.w / 2, scy = player.y + player.h / 2;
        ctx.save();
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(performance.now() / 90);
        ctx.strokeStyle = '#33eeff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#33eeff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
            const a = Math.PI / 6 + k * Math.PI / 3;
            const rx = scx + 26 * Math.cos(a), ry = scy + 26 * Math.sin(a);
            if (k === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha *= 0.2;
        ctx.fillStyle = '#33eeff';
        ctx.fill();
        ctx.restore();
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(px, player.y, player.w, player.h);
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(px + player.w / 2 - 14, player.y - 20, 28, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.facing === 1 ? '→' : '←', px + player.w / 2, player.y - 10);
    ctx.fillStyle = '#ff0';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('⤴' + player.jumpsLeft, px + player.w / 2, player.y - 23);

    // 宠物
    if (typeof drawAllPets === 'function') drawAllPets();

    // 角色面板
    if (characterPanelOpen) {
        const W = VIEW_W, H = VIEW_H;
        const panelW = 400, panelH = 260;
        const px2 = (W - panelW) / 2, py2 = (H - panelH) / 2;
        ctx.fillStyle = 'rgba(20,20,30,0.92)';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.roundRect(px2, py2, panelW, panelH, 16);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'gold';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px2, py2, panelW, panelH, 16);
        ctx.stroke();
        ctx.fillStyle = '#ffd966';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('角色信息', W / 2, py2 + 32);
        // 当前角色详情（原神风格：头像/名称/等级/经验条/金币/经验物品/装备）
        const ch = CHARACTERS[window.currentCharacter] || CHARACTERS.ava;
        const detX = px2 + 18, detY = py2 + 46;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.roundRect(detX, detY, 52, 52, 10);
        ctx.fill();
        ctx.strokeStyle = '#c8b58c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(detX, detY, 52, 52, 10);
        ctx.stroke();
        ctx.fillStyle = (window.currentCharacter === 'ava') ? '#7ec8ff' : '#ff9d5c';
        ctx.font = 'bold 26px monospace';
        ctx.textAlign = 'center';
        ctx.fillText((window.currentCharacter === 'ava') ? 'A' : 'B', detX + 26, detY + 36);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(ch.name || (window.currentCharacter === 'ava' ? 'Ava' : 'Bl'), detX + 64, detY + 18);
        ctx.fillStyle = '#ffd966';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('Lv.' + ch.level, detX + 64, detY + 38);
        // 经验条（金色渐变）
        const need = expToNext(ch.level);
        const ratio = Math.min(1, ch.exp / need);
        const barX = detX + 64, barY = detY + 46, barW = panelW - 160, barH = 10;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 5);
        ctx.fill();
        if (ratio > 0) {
            const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            grad.addColorStop(0, '#8a6a2f');
            grad.addColorStop(0.5, '#f5c84c');
            grad.addColorStop(1, '#ffe9a0');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * ratio, barH, 5);
            ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 5);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(Math.floor(ch.exp) + ' / ' + need + (ch.level >= 50 ? ' MAX' : ''), barX + barW, barY - 3);
        ctx.textAlign = 'left';
        // 金币 + 经验物品持有量（独立资源不占背包格）
        ctx.fillStyle = '#ffd966';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('金币 ' + gold, detX, detY + 72);
        ctx.fillStyle = '#a5d6a5';
        ctx.fillText('基础经验 ' + basicExp, detX + 110, detY + 72);
        ctx.fillStyle = '#c9a6ff';
        ctx.fillText('中等经验 ' + midExp, detX + 225, detY + 72);
        ctx.fillStyle = '#999';
        ctx.font = '11px monospace';
        ctx.fillText('Q/R 用经验（给当前角色） · 1/2 切换 · P 关闭', detX, detY + 90);
        // 武器 / 装备槽（挂饰2 / 面具1 / 外衣1）
        const wname = (id) => (window.WEAPONS && WEAPONS[id]) ? WEAPONS[id].name : (ITEMS[id] ? ITEMS[id].name : (id || '无'));
        const ename = (i) => (ch.savedEquipSlots && ch.savedEquipSlots[i] && ch.savedEquipSlots[i].type) ? (ITEMS[ch.savedEquipSlots[i].type] ? ITEMS[ch.savedEquipSlots[i].type].name : ch.savedEquipSlots[i].type) : '空';
        ctx.fillStyle = '#ddd';
        ctx.font = '12px monospace';
        ctx.fillText('武器: ' + wname(ch.savedWeapon), detX, detY + 112);
        ctx.fillText('挂饰: ' + ename(0) + ' / ' + ename(1), detX, detY + 130);
        ctx.fillText('面具: ' + ename(2) + ' / 外衣: ' + ename(3), detX, detY + 148);
        // 角色切换列表
        const items = ['Ava', 'Bl'];
        for (let i = 0; i < items.length; i++) {
            const y = py2 + 200 + i * 38;
            const isSelected = (i === characterSelectOption);
            const isActive = (window.currentCharacter === (i === 0 ? 'ava' : 'bl'));
            ctx.fillStyle = isSelected ? '#ffaa00' : (isActive ? '#44ff44' : '#666');
            ctx.fillRect(px2 + 20, y - 14, panelW - 40, 30);
            ctx.strokeStyle = isSelected ? 'gold' : '#888';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(px2 + 20, y - 14, panelW - 40, 30);
            ctx.fillStyle = '#fff';
            ctx.font = '18px monospace';
            ctx.textAlign = 'left';
            ctx.fillText((i === 0 ? '🟦 ' : '🟦 ') + items[i], px2 + 35, y + 6);
            if (isActive && !isSelected) {
                ctx.fillStyle = '#44ff44';
                ctx.font = '12px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('(当前)', px2 + panelW - 25, y + 6);
            }
            if (i === 1 && !window.characterUnlocked) {
                ctx.fillStyle = '#ff4444';
                ctx.font = '12px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('(未解锁)', px2 + panelW - 25, y + 6);
            }
        }
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('按 1/2 切换  按 P 关闭', W / 2, py2 + panelH - 15);
        ctx.textAlign = 'start';
    }

    // 复合弓瞄准
    if (compoundBowCharging && currentWeapon && currentWeapon.isCompound) {
        let sx = compoundBowPreviewX - cameraX;
        let sy = compoundBowPreviewY;
        if (sx > -20 && sx < VIEW_W + 20 && sy > -20 && sy < VIEW_H + 20) {
            ctx.save();
            if (compoundBowHitEnemy) {
                ctx.strokeStyle = '#ff4444';
                ctx.fillStyle = 'rgba(255,68,68,0.5)';
            } else {
                ctx.strokeStyle = '#ffaa44';
                ctx.fillStyle = 'rgba(255,170,68,0.3)';
            }
            ctx.setLineDash([]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx - 12, sy);
            ctx.lineTo(sx + 12, sy);
            ctx.moveTo(sx, sy - 12);
            ctx.lineTo(sx, sy + 12);
            ctx.stroke();
            ctx.restore();
        }
    }
}