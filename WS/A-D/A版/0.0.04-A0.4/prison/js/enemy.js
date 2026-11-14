// ---------- 敌人系统 ----------
function buildEnemyObject(x, y, type, opts) {
    let enemy = {
        x: x, y: y, w: ENEMY_W, h: ENEMY_H,
        hp: ENEMY_HP, maxHp: ENEMY_HP,
        stun: 0, type: type,
        lastAttack: 0, hitFlash: 0,
        squash: 0, squashPhase: 0, wobble: 0, wobblePhase: 0, knockback: 0, knockbackDir: 0,
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
        facing: 1,
        _rawSpeed: 0,
        _lastLightningUpdate: performance.now(),
        _lastLightningDurationUpdate: performance.now(),
        isCharmed: false,
        charmTarget: null,
        charmLastAttack: 0
    };
    enemy.color = type === 'red' ? '#ff0000' : BLACK_ENEMY_COLOR;
    if (opts) {
        if (opts.hp !== undefined) { enemy.hp = opts.hp; enemy.maxHp = opts.hp; }
        if (opts.w !== undefined) { enemy.w = opts.w; enemy.h = opts.h; }
        if (opts.baseSpeed !== undefined) enemy.baseSpeed = opts.baseSpeed;
        if (opts.isSmall) {
            enemy.isSmall = true;
            enemy.inMergeGroup = false;
            enemy.spawnTime = performance.now();
        }
    }
    return enemy;
}

function spawnEnemyInChunk(chunkIdx, type) {
    let pts = chunkSpawnPoints[chunkIdx];
    if (!pts.length) return false;
    let sx = pts[Math.floor(Math.random()*pts.length)];
    let sy = WORLD_H - ENEMY_H - GROUND_Y_OFFSET;
    let enemy = buildEnemyObject(sx, sy, type);
    enemies.push(enemy);
    return true;
}

// ---------- small block 分裂与排队合成 ----------
let smallMergeGroup = [];
let smallMergeStart = 0;

function spawnSmallBlocksAt(ex, ey) {
    for (let i = 0; i < 2; i++) {
        let sb = buildEnemyObject(
            ex - SMALL_BLOCK_W / 2 + (i === 0 ? -9 : 9),
            ey - SMALL_BLOCK_H / 2,
            'red',
            { hp: SMALL_BLOCK_HP, w: SMALL_BLOCK_W, h: SMALL_BLOCK_H, baseSpeed: SMALL_BLOCK_SPD, isSmall: true }
        );
        sb.y = WORLD_H - SMALL_BLOCK_H - GROUND_Y_OFFSET;
        enemies.push(sb);
    }
}

function updateSmallMerge(now) {
    // 组员死亡/离场 → 打断合成，剩余散开重新排队
    if (smallMergeGroup.length > 0) {
        let alive = smallMergeGroup.filter(e => e && e.hp > 0 && enemies.indexOf(e) >= 0 && e.camp === CAMP.ENEMY);
        if (alive.length !== smallMergeGroup.length) {
            for (let e of smallMergeGroup) if (e) e.inMergeGroup = false;
            smallMergeGroup = [];
            smallMergeStart = 0;
            return;
        }
    }
    // 无合成组时，取最早生成的 3 个游离 small 开新组（同时仅 1 组）
    if (smallMergeGroup.length === 0) {
        let free = enemies.filter(e => e.isSmall && e.hp > 0 && e.camp === CAMP.ENEMY && !e.inMergeGroup);
        if (free.length >= SMALL_MERGE_TEAM) {
            free.sort((a, b) => (a.spawnTime || 0) - (b.spawnTime || 0));
            smallMergeGroup = free.slice(0, SMALL_MERGE_TEAM);
            for (let e of smallMergeGroup) e.inMergeGroup = true;
            smallMergeStart = now;
        }
        return;
    }
    // 向彼此中心点靠拢（途中跳过碰撞：碰撞系统已排除 inMergeGroup）
    let cx = 0, cy = 0;
    for (let e of smallMergeGroup) { cx += e.x + e.w / 2; cy += e.y + e.h / 2; }
    cx /= smallMergeGroup.length; cy /= smallMergeGroup.length;
    for (let e of smallMergeGroup) {
        let ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
        let dx = cx - ecx, dy = cy - ecy, len = Math.hypot(dx, dy);
        if (len > 0.01) {
            let step = Math.min(SMALL_MERGE_APPROACH_SPEED, len);
            e.x += (dx / len) * step;
            e.y += (dy / len) * step;
        }
    }
    // 前摇 1.5s 结束且组员全部存活 → 合成为 1 个满血普通 block
    if (now - smallMergeStart >= SMALL_MERGE_WINDUP_MS) {
        let bx = 0, by = 0;
        for (let e of smallMergeGroup) { bx += e.x + e.w / 2; by += e.y + e.h / 2; }
        bx /= smallMergeGroup.length; by /= smallMergeGroup.length;
        for (let e of smallMergeGroup) e.inMergeGroup = false;
        for (let e of smallMergeGroup) {
            let idx = enemies.indexOf(e);
            if (idx >= 0) enemies.splice(idx, 1);
        }
        smallMergeGroup = [];
        smallMergeStart = 0;
        let nb = buildEnemyObject(bx - ENEMY_W / 2, by - ENEMY_H / 2, 'red');
        nb.x = Math.min(Math.max(0, nb.x), WORLD_W - nb.w);
        nb.y = WORLD_H - ENEMY_H - GROUND_Y_OFFSET;
        enemies.push(nb);
    }
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
        let redCount = enemies.filter(e => e.type === 'red' && !e.isSmall && !e.summoned && e.camp === CAMP.ENEMY).length;
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

        // 敌人每秒回复 1 HP（战斗中也持续生效）
        if (e.hp > 0 && e.hp < e.maxHp && now - (e.lastRegenAt || 0) >= 1000) {
            e.hp = Math.min(e.maxHp, e.hp + 1);
            e.lastRegenAt = now;
        }

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
        if (e.inMergeGroup) continue;
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
        if (e._moveDir !== 0) e.facing = e._moveDir;
        e._rawSpeed = e._moveDir === 0 ? 0 : e.baseSpeed * e._speedMult * e._moveDir;
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
        if (e.inMergeGroup) {
            if (e.hitFlash > 0) e.hitFlash--;
            continue;
        }
        if (e.controlledByPet || e.suspended) {
            if (e.hitFlash > 0) e.hitFlash--;
            continue;
        }
        if (e.isCharmed || e.camp === CAMP.ALLY) continue;
        if (e.stun > 0) {
            e.stun--;
            if (e.hitFlash > 0) e.hitFlash--;
            // 击退（Knockback）：受击沿攻击方向位移，衰减后恢复
            if (e.knockback > 0) {
                e.x += e.knockbackDir * e.knockback * 0.35;
                e.knockback *= 0.82;
                if (e.knockback < 0.5) e.knockback = 0;
                e.x = Math.min(Math.max(0, e.x), WORLD_W - e.w);
                for (let o of enemies) {
                    if (o === e || o.inMergeGroup || !o.canBeDamaged) continue;
                    if (rectCollide(e, o)) {
                        if (e.x + e.w > o.x + o.w) e.x = o.x + o.w + 0.01;
                        else if (e.x < o.x) e.x = o.x - e.w - 0.01;
                    }
                }
            }
            continue;
        }
        if (e._speedMult === 0) {
            if (e.hitFlash > 0) e.hitFlash--;
            continue;
        }
        // 击退：优先于 AI 移动
        if (e.knockback > 0) {
            e.x += e.knockbackDir * e.knockback * 0.35;
            e.knockback *= 0.82;
            if (e.knockback < 0.5) e.knockback = 0;
        } else {
            e.x += e._rawSpeed;
        }
        // 击退/移动后边界钳制（防止穿过墙壁）
        e.x = Math.min(Math.max(0, e.x), WORLD_W - e.w);
        // 与其它敌人相互阻挡：击退位移不可穿过其它敌人
        for (let o of enemies) {
            if (o === e || o.inMergeGroup || !o.canBeDamaged) continue;
            if (rectCollide(e, o)) {
                if (e.x + e.w > o.x + o.w) e.x = o.x + o.w + 0.01;
                else if (e.x < o.x) e.x = o.x - e.w - 0.01;
            }
        }
        // 受击形变/抖动衰减
        if (e.squash > 0) { e.squashPhase += 0.18; e.squash *= 0.88; if (e.squash < 0.01) e.squash = 0; }
        if (e.wobble > 0) { e.wobblePhase += 0.22; e.wobble *= 0.86; if (e.wobble < 0.01) e.wobble = 0; }
        if (!e.suspended) e.y = WORLD_H - e.h - GROUND_Y_OFFSET;
        if (e.hitFlash > 0) e.hitFlash--;
    }

    updateSmallMerge(now);

    // 状态传染
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            let a = enemies[i];
            let b = enemies[j];
            if (!rectCollide(a, b)) continue;
            if (a.inMergeGroup || b.inMergeGroup) continue;
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
        // block 死亡分裂 2 个 small block（small 不再分裂）
        if (e.type === 'red' && !e.isSmall) {
            spawnSmallBlocksAt(e.x + e.w / 2, e.y + e.h / 2);
        }
    }
    let oldLen = enemies.length;
    enemies = enemies.filter(e => e.hp > 0);
    let killed = oldLen - enemies.length;
    if (killed > 0) {
        killCount += killed;
        // 按敌人类型掉落经验物品：block 2~3基础或1中等 / small 1~2基础 / black 3~4基础或1~2中等
        for (let e of toDelete) {
            addKillReward(e.type, e.isSmall);
        }
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
            if (blockDamage(damage, b.startX, b.startY)) {
                projectiles.splice(i,1);
                continue;
            }
            addShieldCharge(20);
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
    if (boss.knockback > 0) {
        boss.x += boss.knockbackDir * boss.knockback * 0.35;
        boss.knockback *= 0.82;
        if (boss.knockback < 0.5) boss.knockback = 0;
    } else {
        boss.x += boss.speed;
    }
    // 击退/移动后边界钳制（防止穿过墙壁）
    boss.x = Math.min(Math.max(0, boss.x), WORLD_W - boss.w);
    // 受击形变/抖动衰减
    if (boss.squash > 0) { boss.squashPhase += 0.18; boss.squash *= 0.88; if (boss.squash < 0.01) boss.squash = 0; }
    if (boss.wobble > 0) { boss.wobblePhase += 0.22; boss.wobble *= 0.86; if (boss.wobble < 0.01) boss.wobble = 0; }
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
        squash: 0, squashPhase: 0, wobble: 0, wobblePhase: 0, knockback: 0, knockbackDir: 0,
        skipTurn: false
    };
}
createBoss();