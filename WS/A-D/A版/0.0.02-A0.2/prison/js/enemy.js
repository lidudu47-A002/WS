// ---------- 敌人系统 ----------
// 常量已在 constants.js 中定义，直接使用

function spawnEnemyInChunk(chunkIdx, type) {
    let pts = chunkSpawnPoints[chunkIdx];
    if (!pts.length) return false;
    let sx = pts[Math.floor(Math.random()*pts.length)];
    let sy = WORLD_H - ENEMY_H - GROUND_Y_OFFSET;
    let enemy = {
        x: sx, y: sy, w: ENEMY_W, h: ENEMY_H,
        hp: ENEMY_HP, stun: 0, type: type,
        lastAttack: 0, hitFlash: 0,
        summoned: false,
        slowLevel: 0,
        slowLastDecay: performance.now(),
        frozenUntil: 0,
        fireLevel: 0,
        fireLastDamage: performance.now(),
        fireLastDecay: performance.now(),
        controlledByPet: false,
        suspended: false,
        suspendStartTime: 0,
        suspendTargetY: 0,
        suspendOriginalY: 0,
        canBeDamaged: true,
        hasPermanentSlow: false,
        blackholeLevel: 0,
        blackholeLastDamage: performance.now()
    };
    enemy.color = type === 'red' ? '#ff0000' : BLACK_ENEMY_COLOR;
    enemies.push(enemy);
    return true;
}

function updateEnemies(now) {
    let curChunk = Math.floor((player.x + player.w/2) / CHUNK_SIZE);
    // 红色敌人生成
    for (let ch = 0; ch < MAP_CHUNKS; ch++) {
        let dist = Math.abs(ch - curChunk), interval = 0;
        if (dist === 0) interval = 4000;
        else if (dist === 1) interval = 8000;
        else if (dist === 2) interval = 10000;
        if (!interval) continue;
        let redCount = enemies.filter(e => e.type === 'red' && !e.summoned).length;
        if (redCount < RED_ENEMY_MAX && now - redChunkLastSpawn[ch] >= interval) {
            if (spawnEnemyInChunk(ch, 'red')) redChunkLastSpawn[ch] = now;
        }
    }
    // 黑色敌人生成（自然生成）
    for (let ch = 0; ch < MAP_CHUNKS; ch++) {
        let dist = Math.abs(ch - curChunk), interval = 0;
        if (dist === 0) interval = 8000;
        else if (dist === 1) interval = 16000;
        else if (dist === 2) interval = 20000;
        if (!interval) continue;
        let blackCount = enemies.filter(e => e.type === 'black' && !e.summoned).length;
        if (blackCount < BLACK_ENEMY_MAX && now - blackChunkLastSpawn[ch] >= interval) {
            if (spawnEnemyInChunk(ch, 'black')) blackChunkLastSpawn[ch] = now;
        }
    }

    // 1. 火焰伤害与衰减（跳过被宠物控制的敌人）
    for (let e of enemies) {
        if (e.controlledByPet) continue;
        if (e.fireLevel > 0) {
            let damagePerTick = 4 + (e.fireLevel - 1) * 2;
            if (now - e.fireLastDamage >= 1000) {
                if (e.canBeDamaged) e.hp -= damagePerTick;
                e.hitFlash = 5;
                e.fireLastDamage = now;
            }
            if (now - e.fireLastDecay >= 3000) {
                e.fireLevel--;
                e.fireLastDecay = now;
            }
        }
    }

    // 2. 黑洞伤害与吸引效果
    let monkeyPet = null;
    if (typeof window.activePets !== 'undefined') {
        monkeyPet = window.activePets.find(p => p.type === 'monkey');
    }
    let blackholeCenters = [];
    if (monkeyPet) {
        if (monkeyPet.smallBlackhole) {
            blackholeCenters.push({ x: monkeyPet.smallBlackhole.x + 32, y: monkeyPet.smallBlackhole.y + 32, radius: 64, level: 1 });
        }
        if (monkeyPet.largeBlackhole) {
            blackholeCenters.push({ x: monkeyPet.largeBlackhole.x + 64, y: monkeyPet.largeBlackhole.y + 64, radius: 200, level: 3 });
        }
    }

    for (let e of enemies) {
        if (e.controlledByPet) continue;
        // 黑洞伤害
        if (e.blackholeLevel > 0) {
            let damage = 1 + (level - 1);
            damage += (e.blackholeLevel - 1);
            if (now - e.blackholeLastDamage >= BLACKHOLE_DAMAGE_INTERVAL) {
                if (e.canBeDamaged) e.hp -= damage;
                e.hitFlash = 5;
                e.blackholeLastDamage = now;
            }
        }
        // 黑洞吸引效果
        if (blackholeCenters.length > 0) {
            let closestBH = null;
            let minDist = Infinity;
            for (let bh of blackholeCenters) {
                let dx = (e.x + e.w/2) - bh.x;
                let dy = (e.y + e.h/2) - bh.y;
                let dist = Math.hypot(dx, dy);
                if (dist < minDist) {
                    minDist = dist;
                    closestBH = bh;
                }
            }
            if (closestBH && minDist < closestBH.radius) {
                let attract = BLACKHOLE_ATTRACT_STRENGTH * closestBH.level;
                let dx = closestBH.x - (e.x + e.w/2);
                let dy = closestBH.y - (e.y + e.h/2);
                let len = Math.hypot(dx, dy);
                if (len > 0.001) {
                    let nx = dx / len;
                    let ny = dy / len;
                    e.x += nx * attract * 2;
                    e.y += ny * attract * 2;
                    e.x = Math.min(Math.max(0, e.x), WORLD_W - e.w);
                    e.y = Math.min(Math.max(0, e.y), WORLD_H - e.h);
                }
            }
        }
    }

    // 3. 减速/冷冻状态更新
    for (let e of enemies) {
        if (e.controlledByPet) continue;
        if (e.frozenUntil && e.frozenUntil <= now) e.frozenUntil = 0;
        if (e.slowLevel > 0 && now - e.slowLastDecay >= SLOW_DECAY_INTERVAL) {
            e.slowLevel--;
            e.slowLastDecay = now;
        }
        let speedMult = 1;
        if (e.frozenUntil > now) speedMult = 0;
        else if (e.slowLevel > 0) {
            let slowPercent = SLOW_BASE + (e.slowLevel - 1) * SLOW_PER_LEVEL;
            speedMult = 1 - Math.min(slowPercent, 0.45);
        }
        if (e.hasPermanentSlow) speedMult *= 0.85;
        e._speedMult = speedMult;
        let pc = player.x + player.w/2, ec = e.x + e.w/2;
        if (pc > ec) e._moveDir = 1;
        else if (pc < ec) e._moveDir = -1;
        else e._moveDir = 0;
        e._rawSpeed = e._moveDir === 0 ? 0 : ENEMY_SPD * e._speedMult * e._moveDir;
    }

    // 4. 速度限制（同向队形）
    let leftEnemies = enemies.filter(e => e._moveDir === -1 && e.stun === 0 && !e.controlledByPet);
    let rightEnemies = enemies.filter(e => e._moveDir === 1 && e.stun === 0 && !e.controlledByPet);
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

    // 5. 移动（跳过被控制、眩晕、悬浮）
    for (let e of enemies) {
        if (e.controlledByPet || e.suspended) {
            if (e.hitFlash > 0) e.hitFlash--;
            continue;
        }
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
        if (e.hitFlash > 0) e.hitFlash--;
    }

    // 6. 火焰传染
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            let a = enemies[i];
            let b = enemies[j];
            if (rectCollide(a, b)) {
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
            }
        }
    }

    // 7. 处理死亡敌人
    let toDelete = [];
    for (let e of enemies) {
        if (e.hp <= 0) toDelete.push(e);
    }
    for (let e of toDelete) {
        if (typeof window.onPetKill === 'function') {
            window.onPetKill('monkey', e.x + e.w/2, e.y + e.h/2, ENEMY_HP);
        }
        if (monkeyPet) {
            let absorbed = false;
            if (monkeyPet.smallBlackhole) {
                let bhx = monkeyPet.smallBlackhole.x + 32;
                let bhy = monkeyPet.smallBlackhole.y + 32;
                let dx = (e.x + e.w/2) - bhx;
                let dy = (e.y + e.h/2) - bhy;
                if (Math.hypot(dx, dy) < 64) {
                    if (typeof window.onPetAbsorbBody === 'function') {
                        window.onPetAbsorbBody('monkey', e.x + e.w/2, e.y + e.h/2, ENEMY_HP);
                    }
                    absorbed = true;
                }
            }
            if (!absorbed && monkeyPet.largeBlackhole) {
                let bhx = monkeyPet.largeBlackhole.x + 64;
                let bhy = monkeyPet.largeBlackhole.y + 64;
                let dx = (e.x + e.w/2) - bhx;
                let dy = (e.y + e.h/2) - bhy;
                if (Math.hypot(dx, dy) < 200) {
                    if (typeof window.onPetAbsorbBody === 'function') {
                        window.onPetAbsorbBody('monkey', e.x + e.w/2, e.y + e.h/2, ENEMY_HP);
                    }
                    absorbed = true;
                }
            }
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

function updateBoss(now) {
    if (!boss) return;
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
        colors: Array(16).fill('#ff0000'), colorIdx: 0, nextTime: 0, interval: 100, speed: 0
    };
}
createBoss();