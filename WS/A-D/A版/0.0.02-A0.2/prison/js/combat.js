// ---------- 战斗系统：投射物、激光、碰撞 ----------
// 注意：ARROW_GRAV 已在 constants.js 中定义

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let b = projectiles[i];
        
        // 弓箭
        if (b.isArrow) {
            b.vy += ARROW_GRAV;
            b.x += b.vx;
            b.y += b.vy;
            b.life--;
            if (b.life <= 0 || b.x < -100 || b.x > WORLD_W + 100 || b.y < -100 || b.y > WORLD_H + 100) {
                projectiles.splice(i, 1);
                continue;
            }
            if (b.hasHit) continue;
            let hit = false;
            for (let e of enemies) {
                if (rectCollide({x: b.x, y: b.y, w: b.w, h: b.h}, e)) {
                    if (e.canBeDamaged !== false) {
                        e.hp -= b.damage;
                        e.stun = STUN_DUR;
                        e.hitFlash = 5;
                    }
                    hit = true;
                    b.hasHit = true;
                    break;
                }
            }
            if (!hit && boss && rectCollide({x: b.x, y: b.y, w: b.w, h: b.h}, boss)) {
                boss.hp -= b.damage;
                hit = true;
                b.hasHit = true;
            }
            if (hit) projectiles.splice(i, 1);
            continue;
        }
        
        // 火焰法杖火球
        if (b.isFireball) {
            b.x += b.vx;
            b.y += b.vy;
            b.life--;
            if (b.life <= 0 || b.x < -100 || b.x > WORLD_W + 100 || b.y < -100 || b.y > WORLD_H + 100) {
                projectiles.splice(i, 1);
                continue;
            }
            if (b.hasHit) continue;
            let hit = false;
            for (let e of enemies) {
                if (rectCollide({x: b.x, y: b.y, w: b.w, h: b.h}, e)) {
                    if (e.canBeDamaged !== false) {
                        e.fireLevel = Math.min(4, (e.fireLevel || 0) + 1);
                        e.fireLastDamage = performance.now();
                        e.fireLastDecay = performance.now();
                        e.hp -= b.damage;
                        e.stun = STUN_DUR;
                        e.hitFlash = 5;
                    }
                    hit = true;
                    b.hasHit = true;
                    break;
                }
            }
            if (!hit && boss && rectCollide({x: b.x, y: b.y, w: b.w, h: b.h}, boss)) {
                boss.hp -= b.damage;
                hit = true;
                b.hasHit = true;
            }
            if (hit) projectiles.splice(i, 1);
            continue;
        }
        
        // 原有砖头投射物（非敌人子弹）
        if (b.isEnemy) continue;
        b.vy += BRICK_GRAV;
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -50 || b.x > WORLD_W+50 || b.y < -50 || b.y > WORLD_H+50) {
            projectiles.splice(i,1);
            continue;
        }
        let hit = false, brickDamage = getBrickDamage();
        for (let e of enemies) {
            if (brickHitEnemy(b, e)) {
                if (e.canBeDamaged !== false) {
                    e.hp -= brickDamage;
                    e.stun = STUN_DUR;
                    e.hitFlash = 5;
                }
                hit = true;
                break;
            }
        }
        if (!hit && boss && brickHitEnemy(b, boss)) {
            boss.hp -= brickDamage;
            hit = true;
        }
        if (hit) projectiles.splice(i,1);
    }
}

function updatePierce(now) {
    if (pierceCharge && !pierceProjectile && now - lastPierce >= PIERCE_CD) {
        let chargeTime = (now - pierceStart) / 1000;
        let cnt = PIERCE_BASE + Math.floor(chargeTime * PIERCE_CHARGE_RATE);
        cnt = Math.min(cnt, PIERCE_MAX);
        let px = player.x + player.w/2, py = player.y + player.h/2;
        let tx = mouseScreenX + cameraX, ty = mouseScreenY;
        let dx = tx - px, dy = ty - py, len = Math.hypot(dx,dy);
        if (len > 0.001) {
            let nx = dx/len, ny = dy/len;
            pierceProjectile = {
                x: px - PIERCE_W/2, y: py - PIERCE_H/2,
                vx: nx*PIERCE_SPD, vy: ny*PIERCE_SPD,
                w: PIERCE_W, h: PIERCE_H, left: cnt,
                hitSet: new Set(), lastEnemy: null,
                passDamage: getPiercePassDamage(), finalAdd: getPierceFinalAdd()
            };
        }
        lastPierce = now;
        pierceCharge = false;
    }
    if (pierceProjectile) {
        let p = pierceProjectile;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -50 || p.x > WORLD_W+50 || p.y < -50 || p.y > WORLD_H+50) {
            pierceProjectile = null;
        } else {
            for (let e of enemies) {
                if (p.hitSet.has(e)) continue;
                if (rectCollide({x:p.x,y:p.y,w:p.w,h:p.h}, e)) {
                    if (e.canBeDamaged !== false) {
                        e.hp -= p.passDamage;
                        e.stun = STUN_DUR;
                        e.hitFlash = 5;
                    }
                    p.hitSet.add(e);
                    p.left--;
                    p.lastEnemy = e;
                    if (p.left <= 0) {
                        if (p.lastEnemy) p.lastEnemy.hp -= p.finalAdd;
                        pierceProjectile = null;
                        break;
                    }
                }
            }
        }
    }
}

function getSlantLaserEndpoints(centerX, angle) {
    const crossY = WORLD_H / 2;
    const k = Math.tan(angle);
    if (Math.abs(k) < 1e-6) return { startX: centerX, endX: centerX };
    const startX = centerX - crossY / k;
    const endX = centerX + (WORLD_H - crossY) / k;
    return { startX, endX };
}

function updateLaser(now) {
    if (!boss) return;
    const bossCenter = boss.x + boss.w/2, playerCenter = player.x + player.w/2;
    const distance = Math.abs(bossCenter - playerCenter);
    const isActive = (distance < CHUNK_SIZE);
    if (isActive && lasers.length === 0 && now - lastLaser >= LASER_CD) {
        const targetX = player.x + player.w/2;
        lasers = [
            { state: 'warn', startTime: now, x: targetX, angle: 0, factor: 0, lastDamage: 0, blink: 0 },
            { state: 'warn', startTime: now, x: targetX, angle: -Math.PI/6, factor: 0, lastDamage: 0, blink: 0 },
            { state: 'warn', startTime: now, x: targetX, angle: Math.PI/6, factor: 0, lastDamage: 0, blink: 0 }
        ];
        lastLaser = now;
    }
    for (let i = 0; i < lasers.length; i++) {
        const l = lasers[i];
        if (l.state === 'warn') {
            l.blink = (l.blink + 0.1) % 1;
            if (now - l.startTime >= LASER_WARN) {
                l.state = 'act';
                l.startTime = now;
                l.factor = 0;
            }
        } else if (l.state === 'act') {
            const elapsed = now - l.startTime;
            if (elapsed >= LASER_ACT) {
                lasers.splice(i,1);
                i--;
                continue;
            }
            l.factor = Math.min(1, elapsed / LASER_ACT);
            if (now - l.lastDamage >= LASER_INTERVAL) {
                let startX, endX;
                if (l.angle === 0) { startX = l.x; endX = l.x; }
                else { const eps = getSlantLaserEndpoints(l.x, l.angle); startX = eps.startX; endX = eps.endX; }
                const startY = 0, endY = WORLD_H;
                const px = player.x + player.w/2, py = player.y + player.h/2;
                const ax = px - startX, ay = py - startY, bx = endX - startX, by = endY - startY;
                const dot = ax * bx + ay * by, len2 = bx * bx + by * by;
                let t = (len2 > 0) ? dot / len2 : 0;
                t = Math.max(0, Math.min(1, t));
                const projX = startX + t * bx, projY = startY + t * by;
                if (Math.hypot(px - projX, py - projY) < 15) {
                    playerHP = Math.max(0, playerHP - LASER_DMG);
                    lasers.splice(i,1);
                    i--;
                } else l.lastDamage = now;
            }
        }
    }
}