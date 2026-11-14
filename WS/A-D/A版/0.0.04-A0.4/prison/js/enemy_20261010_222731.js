// ---------- 敌人系统 ----------
function spawnEnemyInChunk(chunkIdx, type) {
    let pts = chunkSpawnPoints[chunkIdx];
    if (!pts.length) return false;
    let sx = pts[Math.floor(Math.random()*pts.length)];
    let sy = WORLD_H - ENEMY_H - GROUND_Y_OFFSET;
    let enemy = {
        x: sx, y: sy, w: ENEMY_W, h: ENEMY_H,
        hp: ENEMY_HP, maxHp: ENEMY_HP,
        stun: 0, type: type,
        lastAttack: 0, hitFlash: 0,
        summoned: false,
        stateFlags: STATE_FLAGS.NONE,
        stateParams: new Float32Array(8),
        stateTimers: new Float32Array(8),
        camp: CAMP.ENEMY,
        targetEnemy: null,
        attackSpeedMult: 1.0,
        baseSpeed: ENEMY_SPD,
        charmedUntil: 0,
        frozenUntil: 0,
        slowLevel: 0,
        slowLastDecay: performance.now(),
        fireLevel: 0,
        fireLastDamage: performance.now(),
        fireLastDecay: performance.now(),
        lightningLevel: 0,
        lightningTimer: 0,
        lightningDuration: LIGHTNING_DECAY_INTERVAL,
        lightningLastDamage: performance.now(),
        lightningLastDecay: performance.now(),
        blackholeLevel: 0,
        blackholeLastDamage: performance.now(),
        weakLevel: 0,
        weakLastDecay: performance.now(),
        controlledByPet: false,
        suspended: false,
        suspendStartTime: 0,
        suspendTargetY: 0,
        suspendOriginalY: 0,
        canBeDamaged: true,
        hasPermanentSlow: false,
        _speedMult: 1,
        _moveDir: 0,
        _rawSpeed: 0,
        _lastLightningUpdate: performance.now(),
        _lastLightningDurationUpdate: performance.now(),
        isCharmed: false,
        charmTarget: null,
        charmLastAttack: 0
    };
    enemy.color = type === 'red' ? '#ff0000' : BLACK_ENEMY_COLOR;
    enemies.push(enemy);
    return true;
}

function updateEnemies(now) {
    let curChunk = Math.floor((player.x + player.w/2) / CHUNK_SIZE);
    for (let ch = 0; ch < MAP_CHUNKS; ch++) {
        if (window.stopNaturalSpawn) continue;
        let dist = Math.abs(ch - curChunk), interval = 0;
        if (dist === 0) interval = 4000;
        else if (dist === 1) interval = 8000;
        else if (dist === 2) interval = 10000;
        if (!interval) continue;
        let redCount = enemies.filter(e => e.type === 'red' && !e.summoned && e.camp === CAMP.ENEMY).length;
        if (redCount < RED_ENEMY_MAX && now - redChunkLastSpawn[ch] >= interval) {
            if (spawnEnemyInChunk(ch, 'red')) redChunkLastSpawn[ch] = now;
        }
    }
    for (let ch = 0; ch < MAP_CHUNKS; ch++) {
        if (window.stopNaturalSpawn) continue;
        let dist = Math.abs(ch - curChunk), interval = 0;
        if (dist === 0) interval = 8000;
        else if (dist === 1) interval = 16000;
        else if (dist === 2) interval = 20000;
        if (!interval) continue;
        let blackCount = enemies.filter(e => e.type === 'black' && !e.summoned && e.camp === CAMP.ENEMY).length;
        if (blackCount < BLACK_ENEMY_MAX && now - blackChunkLastSpawn[ch] >= interval) {
            if (spawnEnemyInChunk(ch, 'black')) blackChunkLastSpawn[ch] = now;
        }
    }

    // 状态伤害和衰减
    for (let e of enemies) {
        if (e.controlledByPet) continue;
        if (e.isCharmed || e.camp === CAMP.ALLY) continue; // 魅惑敌人不受状态伤害（由AI控制）

        // 火焰
        if (e.fireLevel > 0) {
            let damagePerTick = FIRE_DAMAGE_BASE + (e.fireLevel - 1) * FIRE_DAMAGE_PER_LEVEL;
            if (now - e.fireLastDamage >= 1000) {
                if (e.canBeDamaged) e.hp -= damagePerTick;
                e.hitFlash = 5;
                e.fireLastDamage = now;
            }
            if (now - e.fireLastDecay >= FIRE_DECAY_INTERVAL) {
                e.fireLevel--;
                e.fireLastDecay = now;
            }
        }

        // 电离子
        if (e.lightningLevel > 0) {
            let interval = LIGHTNING_INTERVAL_BASE - (e.lightningLevel - 1) * LIGHTNING_INTERVAL_PER_LEVEL;
            interval = Math.max(500, interval);
            let damage = LIGHTNING_DAMAGE_BASE + (e.lightningLevel - 1) * LIGHTNING_DAMAGE_PER_LEVEL;
            let hasSlowOrFrozen = (e.slowLevel > 0 || e.frozenUntil > now);
            if (hasSlowOrFrozen) damage *= LIGHTNING_BONUS_MULTIPLIER;
            e.lightningTimer = (e.lightningTimer || 0) + (now - (e._lastLightningUpdate || now));
            e._lastLightningUpdate = now;
            if (e.lightningTimer >= interval) {
                e.lightningTimer = 0;
                if (e.canBeDamaged) {
                    e.hp -= Math.floor(damage);
                    e.hitFlash = 5;
                    if (typeof damageNumbers !== 'undefined') {
                        damageNumbers.push({
                            x: e.x + e.w/2,
                            y: e.y - 20,
                            damage: Math.floor(damage),
                            timer: 30,
                            color: '#aa88ff'
                        });
                    }
                }
            }
            if (e.lightningDuration === undefined) e.lightningDuration = LIGHTNING_DECAY_INTERVAL;
            e.lightningDuration -= (now - (e._lastLightningDurationUpdate || now));
            e._lastLightningDurationUpdate = now;
            if (e.lightningDuration <= 0) {
                e.lightningLevel--;
                e.lightningDuration = LIGHTNING_DECAY_INTERVAL;
                if (e.lightningLevel <= 0) {
                    e.lightningLevel = 0;
                    e.lightningTimer = 0;
                }
            }
        }

        // 黑洞
        if (e.blackholeLevel > 0) {
            let damage = 1 + (level - 1) + (e.blackholeLevel - 1);
            if (now - e.blackholeLastDamage >= BLACKHOLE_DAMAGE_INTERVAL) {
                if (e.canBeDamaged) e.hp -= damage;
                e.hitFlash = 5;
                e.blackholeLastDamage = now;
            }
        }

        // 减速衰减
        if (e.slowLevel > 0 && now - e.slowLastDecay >= SLOW_DECAY_INTERVAL) {
            e.slowLevel--;
            e.slowLastDecay = now;
        }

        // 虚弱衰减
        if (e.weakLevel > 0 && now - e.weakLastDecay >= WEAK_DECAY_INTERVAL) {
            e.weakLevel--;
            e.weakLastDecay = now;
        }

        // 速度计算
        let speedMult = 1;
        if (e.frozenUntil > now) speedMult = 0;
        else if (e.slowLevel > 0) {
            let slowPercent = SLOW_BASE + (e.slowLevel - 1) * SLOW_PER_LEVEL;
            speedMult = 1 - Math.min(slowPercent, 0.45);
        }
        if (e.hasPermanentSlow) speedMult *= 0.85;
        if (e.weakLevel > 0) {
            speedMult *= (1 - e.weakLevel * WEAK_SPEED_REDUCTION_PER_LEVEL);
        }
        e._speedMult = speedMult;
    }

    // 魅惑AI（在game-loop中处理，这里只做移动限制）
    for (let e of enemies) {
        if (e.isCharmed || e.camp === CAMP.ALLY) {
            // 魅惑敌人由 updateCharmedEnemy 控制移动
            continue;
        }
    }

    // 普通敌人AI
    for (let e of enemies) {
        if (e.controlledByPet || e.suspended || e.stun > 0) continue;
        if (e.isCharmed || e.camp === CAMP.ALLY) continue;
        if (e.stateFlags & STATE_FLAGS.STUNNED) {
            e.stun = 60;
            continue;
        }

        let pc = player.x + player.w/2, ec = e.x + e.w/2;
        if (pc > ec) e._moveDir = 1;
        else if (pc < ec) e._moveDir = -1;
        else e._moveDir = 0;
        e._rawSpeed = e._moveDir === 0 ? 0 : ENEMY_SPD * e._speedMult * e._moveDir;
    }

    // 速度限制
    let leftEnemies = enemies.filter(e => e._moveDir === -1 && e.stun === 0 && !e.controlledByPet && !e.suspended && !e.isCharmed && e.camp === CAMP.ENEMY);
    let rightEnemies = enemies.filter(e => e._moveDir === 1 && e.stun === 0 && !e.controlledByPet && !e.suspended && !e.isCharmed && e.camp === CAMP.ENEMY);
    leftEnemies.sort((a, b) => a.x - b.x);
    rightEnemies.sort((a, b) => b.x - a.x);
    for (let i = 1; i < leftEnemies.length; i++) {
        let prev = leftEnemies[i-1];
        let curr = leftEnemies[i];
        let prevSpeed = Math.abs(prev._rawSpeed);
        if (prevSpeed < 0.01) continue;
        let currSpeed = Math.abs(curr._rawSpeed);
        if (currSpeed > prevSpeed) curr._rawSpeed = (curr._rawSpeed > 0 ? prevSpeed : -prevSpeed);
    }
    for (let i = 1; i < rightEnemies.length; i++) {
        let prev = rightEnemies[i-1];
        let curr = rightEnemies[i];
        let prevSpeed = Math.abs(prev._rawSpeed);
        if (prevSpeed < 0.01) continue;
        let currSpeed = Math.abs(curr._rawSpeed);
        if (currSpeed > prevSpeed) curr._rawSpeed = (curr._rawSpeed > 0 ? prevSpeed : -prevSpeed);
    }

    // 移动
    for (let e of enemies) {
        if (e.controlledByPet || e.suspended) {
            if (e.hitFlash > 0) e.hitFlash--;
            continue;
        }
        if (e.isCharmed || e.camp === CAMP.ALLY) continue;
        if (e.stun > 0) {
            e.stun--;
            if (e.hitFlash > 0) e.hitFlash--;
            continue;
        }
        if (e._speedMult === 0) {
            if (e.hitFlash > 0) e.hitFlash--;
            continue;
        }
        e.x += e._rawSpeed;
        e.x = Math.min(Math.max(0, e.x), WORLD_W - e.w);
        if (!e.suspended) e.y = WORLD_H - ENEMY_H - GROUND_Y_OFFSET;
        if (e.hitFlash > 0) e.hitFlash--;
    }

    // 状态传染
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            let a = enemies[i];
            let b = enemies[j];
            if (!rectCollide(a, b)) continue;
            if (a.isCharmed || b.isCharmed) continue;
            if (a.camp === CAMP.ALLY || b.camp === CAMP.ALLY) continue;
            if (a.fireLevel > 0 || b.fireLevel > 0) {
                let newLevel = Math.max(a.fireLevel, b.fireLevel);
                if (a.fireLevel < newLevel && !a.controlledByPet) {
                    a.fireLevel = newLevel;
                    a.fireLastDecay = now;
                }
                if (b.fireLevel < newLevel && !b.controlledByPet) {
                    b.fireLevel = newLevel;
                    b.fireLastDecay = now;
                }
            }
            if (a.lightningLevel > 0 || b.lightningLevel > 0) {
                let newLevel = Math.max(a.lightningLevel, b.lightningLevel);
                if (a.lightningLevel < newLevel && !a.controlledByPet) {
                    a.lightningLevel = newLevel;
                    a.lightningDuration = LIGHTNING_DECAY_INTERVAL;
                    a._lastLightningDurationUpdate = now;
                }
                if (b.lightningLevel < newLevel && !b.controlledByPet) {
                    b.lightningLevel = newLevel;
                    b.lightningDuration = LIGHTNING_DECAY_INTERVAL;
                    b._lastLightningDurationUpdate = now;
                }
            }
            if (a.blackholeLevel > 0 || b.blackholeLevel > 0) {
                let newLevel = Math.max(a.blackholeLevel, b.blackholeLevel);
                if (a.blackholeLevel < newLevel && !a.controlledByPet) {
                    a.blackholeLevel = newLevel;
                }
                if (b.blackholeLevel < newLevel && !b.controlledByPet) {
                    b.blackholeLevel = newLevel;
                }
            }
        }
    }

    // 处理死亡
    let toDelete = [];
    for (let e of enemies) {
        if (e.hp <= 0) toDelete.push(e);
    }
    for (let e of toDelete) {
        if (typeof window.onPetKill === 'function') {
            window.onPetKill('monkey', e.x + e.w/2, e.y + e.h/2, ENEMY_HP);
        }
    }
    let oldLen = enemies.length;
    enemies = enemies.filter(e => e.hp > 0);
    let killed = oldLen - enemies.length;
    if (killed > 0) {
        killCount += killed;
        for (let i=0; i<killed; i++) addKillReward();
    }
}

// ---------- 黑色敌人子弹 ----------
function updateBlackEnemyBullets() {
    for (let enemy of enemies) {
        if (enemy.type !== 'black') continue;
        if (enemy.isCharmed || enemy.camp === CAMP.ALLY) continue;
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
            let damage = b.damage;
            damage = applyPrayerProtection(damage);
            playerHP = Math.max(0, playerHP - damage);
            projectiles.splice(i,1);
        }
    }
}

// ---------- BOSS ----------
function updateBoss(now) {
    if (!boss) return;
    if (boss.skipTurn) {
        boss.skipTurn = false;
        return;
    }
    const bossCenter = boss.x + boss.w/2, playerCenter = player.x + player.w/2;
    const distance = Math.abs(bossCenter - playerCenter);
    if (distance < CHUNK_SIZE) {
        if (playerCenter > bossCenter) boss.speed = BOSS_SPEED;
        else if (playerCenter < bossCenter) boss.speed = -BOSS_SPEED;
        else boss.speed = 0;
    } else boss.speed = 0;
    boss.x += boss.speed;
    boss.x = Math.min(Math.max(0, boss.x), WORLD_W - boss.w);
    if (now >= (boss.nextTime || 0)) {
        boss.nextTime = now + boss.interval;
        let cols = ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#4b0082','#8f00ff','#ffffff'];
        boss.colors[boss.colorIdx] = cols[Math.floor(Math.random()*cols.length)];
        boss.colorIdx = (boss.colorIdx+1) % 16;
    }
}

function createBoss() {
    boss = {
        x: WORLD_W - BOSS_SIZE, y: WORLD_H - BOSS_SIZE - GROUND_Y_OFFSET,
        w: BOSS_SIZE, h: BOSS_SIZE, hp: BOSS_HP, maxHp: BOSS_HP,
        colors: Array(16).fill('#ff0000'), colorIdx: 0, nextTime: 0, interval: 100, speed: 0,
        skipTurn: false
    };
}
createBoss();