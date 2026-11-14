// ---------- 战斗系统：投射物、激光、碰撞 ----------
// ---------- 新装备：冰霜之翼 + 科技盾牌 ----------
window.shieldCharge = 0;
window.shieldActive = false;
window.shieldActiveUntil = 0;
window.hasTechShield = false;
window.hasIceWings = false;
window.iceTrail = [];
window.gliding = false;

function addShieldCharge(amount) {
    if (!window.hasTechShield) return;
    window.shieldCharge = Math.min(100, (window.shieldCharge || 0) + amount);
}

function triggerIceWingsFreeze(e) {
    if (!window.hasIceWings || !e || e.hp <= 0) return;
    if (Math.random() < 0.25) {
        e.frozenUntil = performance.now() + 1500;
    }
}

function blockDamage(damage, attackerX, attackerY) {
    if (!window.shieldActive) return false;
    // 格挡成功：反弹 50% 伤害给攻击者并击退
    const reflectDmg = Math.max(1, Math.floor((damage || 0) * 0.5));
    if (attackerX !== undefined && attackerX !== null && attackerY !== undefined && attackerY !== null) {
        let best = null, bestD = Infinity;
        for (let e of enemies) {
            if (e.hp <= 0) continue;
            const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
            const d = (ex - attackerX) * (ex - attackerX) + (ey - attackerY) * (ey - attackerY);
            if (d < bestD) { bestD = d; best = e; }
        }
        if (best) {
            if (best.canBeDamaged !== false) {
                Dot.deal(best, reflectDmg);
                best.hitFlash = 5;
                const kx = Math.sign(best.x - player.x) || player.facing || 1;
                best.x += kx * 8;
                if (typeof spawnHitParticles === 'function') spawnHitParticles(best, reflectDmg);
            }
        }
    }
    return true;
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let b = projectiles[i];
        
        // ===== 处理敌人子弹 =====
        if (b.isEnemy) {
            b.x += b.vx;
            b.y += b.vy;
            if (b.x < -50 || b.x > WORLD_W + 50 || b.y < -50 || b.y > WORLD_H + 50) {
                projectiles.splice(i, 1);
                continue;
            }
            if (rectCollide({x: b.x, y: b.y, w: b.w, h: b.h}, player)) {
                let damage = b.damage || 5;
                if (b.sourceEnemy && b.sourceEnemy.weakLevel > 0) {
                    damage *= (1 - b.sourceEnemy.weakLevel * WEAK_DAMAGE_REDUCTION_PER_LEVEL);
                    damage = Math.max(1, Math.floor(damage));
                }
                // 神父服祈祷
                damage = applyPrayerProtection(damage);
                if (blockDamage(damage, b.startX, b.startY)) {
                    projectiles.splice(i, 1);
                    continue;
                }
                addShieldCharge(20);
                playerHP = Math.max(0, playerHP - damage);
                projectiles.splice(i, 1);
                continue;
            }
            continue;
        }
        
        // ===== 科技长矛 =====
        if (b.isTechSpear) {
            let elapsed = performance.now() - b.startTime;
            let t = Math.min(elapsed / b.duration, 1.0);
            let offset = 100 - 200 * Math.abs(t - 0.5);
            let worldX = b.startX + b.facing * offset;
            let worldY = b.startY;
            b.x = worldX - 20;
            b.y = worldY - 20;
            b.w = 40;
            b.h = 40;
            b.angle = t * Math.PI / 2;
            let canDamage = (t >= 0.3 && t <= 0.7);
            if (canDamage) {
                let startX = b.startX;
                let endX = b.startX + b.facing * offset;
                let minX = Math.min(startX, endX);
                let maxX = Math.max(startX, endX);
                let rect = {
                    x: minX - 20,
                    y: b.startY - 20,
                    w: (maxX - minX) + 40,
                    h: 40
                };
                for (let e of enemies) {
                    if (e.hp <= 0) continue;
                    if (b.hitEnemies.has(e)) continue;
                    if (rectCollide(rect, e)) {
                        if (e.canBeDamaged !== false) {
                            Dot.deal(e, b.damage);
                            e.stun = STUN_DUR;
                            e.hitFlash = 5;
                            b.hitEnemies.add(e);
                            triggerPriestEffects(e, b.damage);
                            triggerIceWingsFreeze(e);
                        }
                    }
                }
                if (boss && !b.hitEnemies.has(boss) && rectCollide(rect, boss)) {
                    Dot.deal(boss, b.damage);
                    b.hitEnemies.add(boss);
                    triggerPriestEffects(boss, b.damage);
                    triggerIceWingsFreeze(boss);
                }
            }
            if (t >= 1) {
                projectiles.splice(i, 1);
                player.lockMovement = false;
                continue;
            }
            continue;
        }
        
        // ===== 黑洞投射物 =====
        if (b.isBlackhole) {
            b.x += b.vx;
            b.y += b.vy;
            let dist = Math.hypot(b.x - b.startX, b.y - b.startY);
            if (dist > b.maxDist || b.x < -100 || b.x > WORLD_W + 100 || b.y < -100 || b.y > WORLD_H + 100) {
                projectiles.splice(i, 1);
                continue;
            }
            // 命中后生成持续 3 秒的黑洞区域（黑洞权杖实装：持续伤害 + 吸附）
            let hitPoint = null;
            for (let e of enemies) {
                if (e.hp <= 0) continue;
                if (b.hitEnemies.has(e)) continue;
                if (rectCollide({x: b.x, y: b.y, w: b.w, h: b.h}, e)) {
                    if (e.canBeDamaged !== false) {
                        Dot.deal(e, b.damage);
                        e.stun = STUN_DUR;
                        e.hitFlash = 5;
                        b.hitEnemies.add(e);
                        triggerPriestEffects(e, b.damage);
                        triggerIceWingsFreeze(e);
                        hitPoint = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
                    }
                    break;
                }
            }
            if (!hitPoint && boss && !b.hitEnemies.has(boss) && rectCollide({x: b.x, y: b.y, w: b.w, h: b.h}, boss)) {
                Dot.deal(boss, b.damage);
                b.hitEnemies.add(boss);
                triggerPriestEffects(boss, b.damage);
                triggerIceWingsFreeze(boss);
                hitPoint = { x: boss.x + boss.w / 2, y: boss.y + boss.h / 2 };
            }
            if (hitPoint) {
                if (!window.blackholeZones) window.blackholeZones = [];
                window.blackholeZones.push({
                    x: hitPoint.x,
                    y: hitPoint.y,
                    r: 110,
                    ttl: 3000,
                    level: Math.max(1, Math.floor(((typeof level !== 'undefined' ? level : 1) - 1) / 5)),
                    affected: new Set(),
                    bornAt: performance.now()
                });
                projectiles.splice(i, 1);
            }
            continue;
        }
        
        // ===== 弓箭 =====
        if (b.isArrow) {
            b.vy += (b.gravity !== undefined ? b.gravity : ARROW_GRAV);
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
                        Dot.deal(e, b.damage);
                        e.stun = STUN_DUR;
                        e.hitFlash = 5;
                        triggerPriestEffects(e, b.damage);
                        triggerIceWingsFreeze(e);
                    }
                    hit = true;
                    b.hasHit = true;
                    break;
                }
            }
            if (!hit && boss && rectCollide({x: b.x, y: b.y, w: b.w, h: b.h}, boss)) {
                Dot.deal(boss, b.damage);
                hit = true;
                b.hasHit = true;
                triggerPriestEffects(boss, b.damage);
                triggerIceWingsFreeze(boss);
            }
            if (hit) projectiles.splice(i, 1);
            continue;
        }
        
        // ===== 火焰法杖火球 =====
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
                        Dot.deal(e, b.damage);
                        e.stun = STUN_DUR;
                        e.hitFlash = 5;
                        triggerPriestEffects(e, b.damage);
                        triggerIceWingsFreeze(e);
                    }
                    hit = true;
                    b.hasHit = true;
                    break;
                }
            }
            if (!hit && boss && rectCollide({x: b.x, y: b.y, w: b.w, h: b.h}, boss)) {
                Dot.deal(boss, b.damage);
                hit = true;
                b.hasHit = true;
                triggerPriestEffects(boss, b.damage);
                triggerIceWingsFreeze(boss);
            }
            if (hit) projectiles.splice(i, 1);
            continue;
        }
        
        // ===== 砖头投射物 =====
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
                    Dot.deal(e, brickDamage);
                    e.stun = STUN_DUR;
                    e.hitFlash = 5;
                    triggerPriestEffects(e, brickDamage);
                    triggerIceWingsFreeze(e);
                }
                hit = true;
                break;
            }
        }
        if (!hit && boss && brickHitEnemy(b, boss)) {
            Dot.deal(boss, brickDamage);
            hit = true;
            triggerPriestEffects(boss, brickDamage);
            triggerIceWingsFreeze(boss);
        }
        if (hit) projectiles.splice(i,1);
    }

    // ===== 黑洞权杖：黑洞区域（持续伤害 + 吸附） =====
    if (window.blackholeZones && window.blackholeZones.length > 0) {
        let now = performance.now();
        for (let zi = window.blackholeZones.length - 1; zi >= 0; zi--) {
            let z = window.blackholeZones[zi];
            if (now - z.bornAt >= z.ttl) {
                // 区域结束：仅清理本区域设置的 blackholeLevel（不破坏宠物黑洞等高等级状态）
                for (let e of z.affected) {
                    if (e && e.blackholeLevel === z.level && !e.controlledByPet) e.blackholeLevel = 0;
                }
                window.blackholeZones.splice(zi, 1);
                continue;
            }
            for (let e of enemies) {
                if (e.hp <= 0) continue;
                if (e.controlledByPet) continue;
                let ex = e.x + e.w / 2, ey = e.y + e.h / 2;
                let dx = z.x - ex, dy = z.y - ey;
                let d = Math.hypot(dx, dy);
                if (d > 20 && d < z.r) {
                    // 吸附向黑洞中心
                    let pull = BLACKHOLE_ATTRACT_STRENGTH;
                    e.x += (dx / d) * pull * 2;
                    e.y += (dy / d) * pull * 2;
                    // 挂上持续伤害等级（enemy.js 已有每秒黑洞伤害：1 + (level-1) + (blackholeLevel-1)）
                    if (!e.blackholeLevel || e.blackholeLevel < z.level) {
                        e.blackholeLevel = z.level;
                        if (!e.blackholeLastDamage) e.blackholeLastDamage = performance.now();
                    }
                    z.affected.add(e);
                }
            }
            if (boss && boss.hp > 0) {
                let bx = boss.x + boss.w / 2, by = boss.y + boss.h / 2;
                let dx = z.x - bx, dy = z.y - by;
                let d = Math.hypot(dx, dy);
                if (d > 20 && d < z.r) {
                    let pull = BLACKHOLE_ATTRACT_STRENGTH;
                    boss.x += (dx / d) * pull * 2;
                    boss.y += (dy / d) * pull * 2;
                    if (!boss.blackholeLevel || boss.blackholeLevel < z.level) {
                        boss.blackholeLevel = z.level;
                        if (!boss.blackholeLastDamage) boss.blackholeLastDamage = performance.now();
                    }
                    z.affected.add(boss);
                }
            }
        }
    }
}

// ---------- 激光辅助 ----------
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
                    let damage = LASER_DMG;
                    damage = applyPrayerProtection(damage);
                    if (blockDamage(damage, bossCenter, boss.y)) {
                        lasers.splice(i,1);
                        i--;
                        continue;
                    }
                    addShieldCharge(20);
                    playerHP = Math.max(0, playerHP - damage);
                    lasers.splice(i,1);
                    i--;
                } else l.lastDamage = now;
            }
        }
    }
}