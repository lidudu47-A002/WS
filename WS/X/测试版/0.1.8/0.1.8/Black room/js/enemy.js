// ---------- 敌人系统 ----------
function spawnEnemyInChunk(chunkIdx) {
    let pts = chunkSpawnPoints[chunkIdx];
    if (!pts.length) return false;
    let sx = pts[Math.floor(Math.random()*pts.length)];
    let sy = WORLD_H - ENEMY_H - GROUND_Y_OFFSET;
    enemies.push({
        x: sx, y: sy, w: ENEMY_W, h: ENEMY_H,
        hp: ENEMY_HP, stun: 0, color: '#ff0000',
        hitFlash: 0
    });
    return true;
}

function updateEnemies(now) {
    let curChunk = Math.floor((player.x + player.w/2) / CHUNK_SIZE);
    for (let ch = 0; ch < MAP_CHUNKS; ch++) {
        let dist = Math.abs(ch - curChunk), interval = 0;
        if (dist === 0) interval = 4000;
        else if (dist === 1) interval = 8000;
        else if (dist === 2) interval = 10000;
        if (!interval) continue;
        if (enemies.length < MAX_ENEMY && now - chunkLastSpawn[ch] >= interval) {
            if (spawnEnemyInChunk(ch)) chunkLastSpawn[ch] = now;
        }
    }
    for (let e of enemies) {
        if (e.stun > 0) e.stun--;
        if (e.hitFlash > 0) e.hitFlash--;
        let pc = player.x + player.w/2, ec = e.x + e.w/2;
        if (pc > ec) e.x += ENEMY_SPD;
        else if (pc < ec) e.x -= ENEMY_SPD;
        e.x = Math.min(Math.max(0, e.x), WORLD_W - e.w);
    }
    let oldLen = enemies.length;
    enemies = enemies.filter(e => e.hp > 0);
    let killed = oldLen - enemies.length;
    if (killed > 0) {
        killCount += killed;
        for (let i=0; i<killed; i++) addKillReward();
    }
}

function updateBoss(now) {
    if (!boss) return;
    const bossCenter = boss.x + boss.w/2, playerCenter = player.x + player.w/2;
    const distance = Math.abs(bossCenter - playerCenter);

    // 玩家在 3 个区块（1200px）内时，Boss 向玩家移动
    if (distance < CHUNK_SIZE * 3) {
        if (playerCenter > bossCenter) {
            boss.x += BOSS_SPEED;
        } else if (playerCenter < bossCenter) {
            boss.x -= BOSS_SPEED;
        }
    }

    // 限制 Boss 不超出世界边界
    boss.x = Math.min(Math.max(0, boss.x), WORLD_W - boss.w);

    // 颜色持续变幻（与原地图一致）
    if (now >= (boss.nextTime || 0)) {
        boss.nextTime = now + boss.interval;
        let cols = ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#4b0082','#8f00ff','#ffffff'];
        boss.colors[boss.colorIdx] = cols[Math.floor(Math.random()*cols.length)];
        boss.colorIdx = (boss.colorIdx+1) % 16;
    }
}

function createBoss() {
    boss = {
        x: WORLD_W - BOSS_SIZE,
        y: WORLD_H - BOSS_SIZE - GROUND_Y_OFFSET,
        w: BOSS_SIZE, h: BOSS_SIZE,
        hp: BOSS_HP, maxHp: BOSS_HP,
        colors: Array(16).fill('#ff0000'),
        colorIdx: 0,
        nextTime: 0,
        interval: 100,
        speed: BOSS_SPEED   // 使用常量 BOSS_SPEED
    };
}
createBoss();