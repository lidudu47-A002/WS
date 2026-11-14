// ---------- 渲染系统 ----------
const statusImages = { slow: null, frozen: null, fire: null, permSlow: null, blackhole: null };
function loadStatusIcons() {
    if (!statusImages.slow) {
        const slowImg = new Image();
        slowImg.src = '素材/元素和状态/减速.png';
        statusImages.slow = slowImg;
    }
    if (!statusImages.frozen) {
        const frozenImg = new Image();
        frozenImg.src = '素材/元素和状态/冰冻.png';
        statusImages.frozen = frozenImg;
    }
    if (!statusImages.fire) {
        const fireImg = new Image();
        fireImg.src = '素材/元素和状态/火焰.png';
        statusImages.fire = fireImg;
    }
    if (!statusImages.permSlow) {
        const permSlowImg = new Image();
        permSlowImg.src = '素材/元素和状态/减速-无限.png';
        statusImages.permSlow = permSlowImg;
    }
    if (!statusImages.blackhole) {
        const blackholeImg = new Image();
        blackholeImg.src = '素材/元素和状态/黑洞.png';
        statusImages.blackhole = blackholeImg;
    }
}
loadStatusIcons();

const weaponIconCache = {};

function updateCam() {
    let target = cameraX;
    let psx = player.x - cameraX;
    if (psx < DEAD_ZONE_LEFT) target = player.x - DEAD_ZONE_LEFT;
    else if (psx > DEAD_ZONE_RIGHT) target = player.x - DEAD_ZONE_RIGHT;
    target = Math.min(Math.max(0, target), WORLD_W - VIEW_W);
    cameraX += (target - cameraX) * 0.1;
    cameraX = Math.min(Math.max(0, cameraX), WORLD_W - VIEW_W);
}

function draw() {
    if (talentOpen) {
        if (typeof drawTalentTree === 'function') drawTalentTree();
        return;
    }
    if (achievementOpen) {
        if (typeof drawAchievements === 'function') drawAchievements();
        return;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (typeof prisonCells !== 'undefined' && prisonCells.length > 0) {
        prisonCells.forEach(c => {
            let sx = c.x - cameraX; if (sx + c.width < 0 || sx > VIEW_W) return;
            ctx.fillStyle = 'rgba(60,60,60,0.3)'; ctx.fillRect(sx, c.y, c.width, c.height);
            ctx.fillStyle = '#aaa'; for (let i = 0; i < Math.floor(c.width/20); i++) ctx.fillRect(sx + i*20 + 2, c.y, 4, c.height);
            ctx.fillStyle = '#888'; ctx.fillRect(sx, c.y, c.width, 4); ctx.fillRect(sx, c.y + c.height - 4, c.width, 4);
            ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2; ctx.strokeRect(sx, c.y, c.width, c.height);
        });
    } else {
        DECOS.forEach(d => {
            let sx = d.x - cameraX; if (sx + d.w < 0 || sx > VIEW_W) return;
            ctx.fillStyle = d.color; ctx.fillRect(sx, d.y, d.w, d.h);
        });
    }

    savePoints.forEach(sp => {
        let sx = sp.starX - cameraX; if (sx + 25 < 0 || sx - 25 > VIEW_W) return;
        let sy = WORLD_H - 70, sz = ANIMATION_SIZE / 2;
        if (saveStarImage && saveStarImage.complete) {
            ctx.drawImage(saveStarImage, sx - sz, sy - sz, ANIMATION_SIZE, ANIMATION_SIZE);
            ctx.save(); ctx.shadowColor = 'rgba(255,215,0,0.6)'; ctx.shadowBlur = 10;
            ctx.drawImage(saveStarImage, sx - sz, sy - sz, ANIMATION_SIZE, ANIMATION_SIZE);
            ctx.restore();
        } else {
            ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, 2*Math.PI); ctx.fill();
            ctx.fillStyle = '#ffaa33';
            for (let i = 0; i < 6; i++) { let a = i * Math.PI * 2 / 6; ctx.beginPath(); ctx.arc(sx + Math.cos(a)*24, sy + Math.sin(a)*24, 6, 0, 2*Math.PI); ctx.fill(); }
        }
    });

    enemies.forEach(e => {
        let sx = e.x - cameraX;
        if (sx + e.w < 0 || sx > VIEW_W) return;
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
        ctx.fillRect(sx, e.y, e.w, e.h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(e.hp, sx + 6, e.y - 5);

        const iconSize = 24;
        let baseY = e.y - iconSize - 2;
        let offsetY = 0;

        if (e.frozenUntil && e.frozenUntil > performance.now()) {
            const iconX = sx + e.w/2 - iconSize/2;
            const iconY = baseY - offsetY;
            if (statusImages.frozen && statusImages.frozen.complete && statusImages.frozen.naturalWidth > 0) {
                ctx.drawImage(statusImages.frozen, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#88ccff'; ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.fillText('❄', iconX + iconSize/2 - 5, iconY + iconSize/2 + 4);
            }
            offsetY += 26;
        }

        if (e.fireLevel > 0) {
            const iconX = sx + e.w/2 - iconSize/2;
            const iconY = baseY - offsetY;
            if (statusImages.fire && statusImages.fire.complete && statusImages.fire.naturalWidth > 0) {
                ctx.drawImage(statusImages.fire, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#ff6600'; ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.fillText('🔥', iconX + iconSize/2 - 5, iconY + iconSize/2 + 4);
            }
            ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 12px monospace'; ctx.fillText(`x${e.fireLevel}`, iconX + iconSize - 8, iconY + iconSize - 4);
            offsetY += 26;
        }

        if (e.hasPermanentSlow) {
            const iconX = sx + e.w/2 - iconSize/2;
            const iconY = baseY - offsetY;
            if (statusImages.permSlow && statusImages.permSlow.complete && statusImages.permSlow.naturalWidth > 0) {
                ctx.drawImage(statusImages.permSlow, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#b3b3b3'; ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.fillText('∞', iconX + iconSize/2 - 5, iconY + iconSize/2 + 4);
            }
            offsetY += 26;
        }

        if (e.blackholeLevel > 0) {
            const iconX = sx + e.w/2 - iconSize/2;
            const iconY = baseY - offsetY;
            if (statusImages.blackhole && statusImages.blackhole.complete && statusImages.blackhole.naturalWidth > 0) {
                ctx.drawImage(statusImages.blackhole, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#4400aa'; ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.fillText('🕳️', iconX + iconSize/2 - 5, iconY + iconSize/2 + 4);
            }
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px monospace'; ctx.fillText(`x${e.blackholeLevel}`, iconX + iconSize - 8, iconY + iconSize - 4);
            offsetY += 26;
        }

        if (e.slowLevel > 0) {
            const iconX = sx + e.w/2 - iconSize/2;
            const iconY = baseY - offsetY;
            if (statusImages.slow && statusImages.slow.complete && statusImages.slow.naturalWidth > 0) {
                ctx.drawImage(statusImages.slow, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#cccc99'; ctx.fillRect(iconX, iconY, iconSize, iconSize);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.fillText('🐢', iconX + iconSize/2 - 5, iconY + iconSize/2 + 4);
            }
            ctx.fillStyle = '#ffff00'; ctx.font = 'bold 12px monospace'; ctx.fillText(`x${e.slowLevel}`, iconX + iconSize - 8, iconY + iconSize - 4);
            offsetY += 26;
        }

        if (e.weakLevel > 0) {
            const iconX = sx + e.w/2 - iconSize/2;
            const iconY = baseY - offsetY;
            ctx.fillStyle = '#8866aa';
            ctx.fillRect(iconX, iconY, iconSize, iconSize);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('💀', iconX + iconSize/2, iconY + iconSize/2 + 4);
            ctx.fillStyle = '#cc99ff';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`x${e.weakLevel}`, iconX + iconSize - 8, iconY + iconSize - 4);
            ctx.textAlign = 'start';
            offsetY += 26;
        }

        if (e.lightningLevel > 0) {
            const lightningSize = 28;
            let lx = sx + e.w/2 - lightningSize/2;
            let ly = e.y - lightningSize - 2 - offsetY;
            const pulse = Math.sin(performance.now() / 200 + e.x) * 0.3 + 0.7;
            const lightningImg = new Image();
            lightningImg.src = '素材/元素和状态/电离子.png';
            if (lightningImg.complete && lightningImg.naturalWidth > 0) {
                ctx.save();
                ctx.shadowColor = '#aa66ff';
                ctx.shadowBlur = 15 * pulse;
                ctx.drawImage(lightningImg, lx, ly, lightningSize, lightningSize);
                ctx.restore();
            } else {
                ctx.save();
                ctx.shadowColor = '#aa66ff';
                ctx.shadowBlur = 20 * pulse;
                ctx.fillStyle = `rgba(170, 102, 255, ${0.3 * pulse})`;
                ctx.fillRect(lx - 4, ly - 4, lightningSize + 8, lightningSize + 8);
                ctx.fillStyle = '#aa88ff';
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('⚡', sx + e.w/2, ly + lightningSize - 2);
                ctx.restore();
            }
            ctx.fillStyle = '#cc99ff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`x${e.lightningLevel}`, sx + e.w/2, ly + lightningSize + 12);
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
                ctx.fillText(weapon.name[0], wx + wSize/2, wy + wSize/2 + 4);
                ctx.textAlign = 'start';
            }
        }

        if (e.controlledByPet) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = '#aa88ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx + e.w/2, e.y + e.h/2, e.w/2 + 5, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.restore();
        }
    });

    projectiles.forEach(b => {
        let sx = b.x - cameraX;
        if (sx + b.w < 0 || sx > VIEW_W) return;
        if (b.isEnemy) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(sx, b.y, b.w, b.h);
        } else if (b.isTechSpear) {
            const cx = sx + b.w/2;
            const cy = b.y + b.h/2;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(b.facing, 1);
            ctx.rotate(-Math.PI / 2);
            let spearImg = new Image();
            spearImg.src = '素材/装备/武器/科技长矛.png';
            if (spearImg.complete && spearImg.naturalWidth > 0) {
                // 绘制尺寸使用 b.w 和 b.h（现在为40x40）
                ctx.drawImage(spearImg, -b.w/2, -b.h/2, b.w, b.h);
            } else {
                // 备用图形（同样放大）
                ctx.fillStyle = '#00ccff';
                ctx.shadowColor = '#00ccff';
                ctx.shadowBlur = 25;
                const len = 30;
                ctx.fillRect(-3, -len/2, 6, len);
                ctx.beginPath();
                ctx.moveTo(0, -len/2 - 12);
                ctx.lineTo(-9, -len/2 + 2);
                ctx.lineTo(9, -len/2 + 2);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        } else if (b.isBlackhole) {
            const cx = sx + b.w/2, cy = b.y + b.h/2;
            const radius = b.w/2;
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
            ctx.strokeStyle = 'rgba(255, 100, 50, 0.6)';
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
            ctx.arc(sx + b.w/2, b.y + b.h/2, b.w/2, 0, 2*Math.PI);
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'orange';
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            ctx.save();
            ctx.translate(sx + b.w/2, b.y + b.h/2);
            ctx.rotate(b.angle);
            ctx.fillStyle = '#b8860b';
            ctx.fillRect(-b.w/2, -b.h/2, b.w, b.h);
            ctx.restore();
        }
    });
    if (pierceProjectile) {
        let sx = pierceProjectile.x - cameraX;
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx, pierceProjectile.y, PIERCE_W, PIERCE_H);
    }

    if (boss) {
        lasers.forEach(l => {
            let sy = 0, ey = WORLD_H, sx, ex;
            if (l.angle === 0) { sx = l.x; ex = l.x; }
            else { let e = getSlantLaserEndpoints(l.x, l.angle); sx = e.startX; ex = e.endX; }
            let ssx = sx - cameraX, sex = ex - cameraX;
            ctx.beginPath(); ctx.moveTo(ssx, sy);
            if (l.state === 'warn') {
                ctx.lineTo(sex, ey);
                ctx.strokeStyle = `rgba(255,0,0,${0.3 + Math.sin(l.blink * 2 * Math.PI) * 0.2})`;
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

    if (charging && previewBrick.active) {
        let sx = previewBrick.worldX - cameraX, sy = previewBrick.worldY;
        ctx.save(); ctx.translate(sx + BRICK_W/2, sy + BRICK_H/2); ctx.rotate(previewBrick.angle); ctx.globalAlpha = 0.6; ctx.fillStyle = '#cd853f'; ctx.fillRect(-BRICK_W/2, -BRICK_H/2, BRICK_W, BRICK_H); ctx.restore();
        let pcx = player.x, pcy = player.y + player.h/2, tx = mouseScreenX + cameraX, ty = mouseScreenY, dx = tx - pcx, dy = ty - pcy, len = Math.hypot(dx, dy);
        if (len > 0.001) {
            let nx = dx/len, ny = dy/len, sx2 = previewBrick.worldX + BRICK_W/2, sy2 = previewBrick.worldY + BRICK_H/2, vx = nx * BRICK_SPD, vy = ny * BRICK_SPD;
            ctx.beginPath(); ctx.strokeStyle = '#aaa'; ctx.setLineDash([4,4]); ctx.lineWidth = 1.5;
            let x = sx2, y = sy2, vxs = vx, vys = vy; ctx.moveTo(x - cameraX, y);
            for (let t = 0.1; t <= 2.0; t += 0.1) { vys += BRICK_GRAV * 0.1; x += vxs * 0.1; y += vys * 0.1; ctx.lineTo(x - cameraX, y); }
            ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - cameraX, y, 3, 0, 2*Math.PI); ctx.fill();
        }
    }

    if (boss) {
        let sx = boss.x - cameraX;
        if (sx + boss.w > 0 && sx < VIEW_W) {
            let cw = boss.w / 4, ch = boss.h / 4;
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    ctx.fillStyle = boss.colors[i * 4 + j];
                    ctx.fillRect(sx + j * cw, boss.y + i * ch, cw, ch);
                }
            }
            ctx.fillStyle = '#f00'; ctx.fillRect(sx, boss.y - 12, boss.w, 6);
            ctx.fillStyle = '#0f0'; ctx.fillRect(sx, boss.y - 12, boss.w * (boss.hp / boss.maxHp), 6);
        }
    }

    let px = player.x - cameraX + player.visualOffX;
    ctx.fillStyle = '#fff'; ctx.fillRect(px, player.y, player.w, player.h);
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.roundRect(px + player.w/2 - 14, player.y - 20, 28, 20, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.fillText(player.facing === 1 ? '→' : '←', px + player.w/2, player.y - 10);
    ctx.fillStyle = '#ff0'; ctx.font = 'bold 12px monospace'; ctx.fillText('⤴' + player.jumpsLeft, px + player.w/2, player.y - 23);

    if (typeof drawHotbar === 'function') drawHotbar();

    const iconSize = 40;
    const weaponSize = 45;
    const spacing = 8;
    const rightMargin = 15;

    let weaponX = VIEW_W - weaponSize - rightMargin;
    let crossX = weaponX - iconSize - spacing;
    let maskX = crossX - iconSize - spacing;

    if (maskX < 0) {
        let offset = -maskX;
        maskX += offset;
        crossX += offset;
        weaponX += offset;
    }

    if (window.hasClownMask) {
        const maskY = 10;
        ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
        ctx.beginPath();
        ctx.arc(maskX + iconSize/2, maskY + iconSize/2, iconSize/2 + 6, 0, Math.PI * 2);
        ctx.fill();
        const maskImg = new Image();
        maskImg.src = '素材/装备/其他/小丑面具.png';
        if (maskImg.complete && maskImg.naturalWidth > 0) {
            ctx.drawImage(maskImg, maskX, maskY, iconSize, iconSize);
        } else {
            ctx.fillStyle = '#ff4444';
            ctx.font = '28px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🤡', maskX + iconSize/2, maskY + iconSize - 4);
            ctx.textAlign = 'start';
        }
        ctx.fillStyle = '#ff6666';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('-1HP/s', maskX + iconSize/2, maskY + iconSize + 14);
        ctx.textAlign = 'start';
    }

    if (window.hasCross) {
        const crossY = 10;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.beginPath();
        ctx.arc(crossX + iconSize/2, crossY + iconSize/2, iconSize/2 + 6, 0, Math.PI * 2);
        ctx.fill();
        const crossImg = new Image();
        crossImg.src = '素材/装备/增益/十字架.png';
        if (crossImg.complete && crossImg.naturalWidth > 0) {
            ctx.drawImage(crossImg, crossX, crossY, iconSize, iconSize);
        } else {
            ctx.fillStyle = '#ffdd44';
            ctx.font = '28px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('✝', crossX + iconSize/2, crossY + iconSize - 4);
            ctx.textAlign = 'start';
        }
        ctx.fillStyle = '#44ff88';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+2HP/s', crossX + iconSize/2, crossY + iconSize + 14);
        ctx.textAlign = 'start';
    }

    if (typeof currentWeapon !== 'undefined' && currentWeapon && currentWeapon.icon) {
        let weaponImg = new Image();
        weaponImg.src = currentWeapon.icon;
        if (weaponImg.complete && weaponImg.naturalWidth > 0) {
            ctx.drawImage(weaponImg, weaponX, 10, weaponSize, weaponSize);
        } else {
            ctx.fillStyle = '#ffd966';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(currentWeapon.name, weaponX + weaponSize/2, 35);
            ctx.textAlign = 'start';
        }
    }

    let hpw = 200, hph = 20, hpp = Math.min(1, Math.max(0, playerHP / currentMaxHp));
    ctx.fillStyle = '#333'; ctx.fillRect(10, 10, hpw, hph);
    ctx.fillStyle = '#f00'; ctx.fillRect(10, 10, hpw * hpp, hph);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, hpw, hph);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.fillText(`HP: ${Math.floor(playerHP)}/${currentMaxHp}`, 15, 25);

    if (typeof drawAllPets === 'function') drawAllPets();

    if (window.inventoryMessage) {
        ctx.fillStyle = 'yellow';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(window.inventoryMessage, VIEW_W / 2, VIEW_H - 50);
        ctx.textAlign = 'start';
    }

    if (gameOver) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px monospace';
        ctx.fillText('游戏结束', VIEW_W / 2, VIEW_H / 2);
    }
}