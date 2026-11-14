// ---------- 敌人系统 ----------
function spawnEnemyInChunk(chunkIdx, type) {
    let pts = chunkSpawnPoints[chunkIdx];
    if (!pts.length) return false;
    let sx = pts[Math.floor(Math.random()*pts.length)];
    let sy = WORLD_H - ENEMY_H - GROUND_Y_OFFSET;
    let enemy = {
        x: sx, y: sy, w: ENEMY_W, h: ENEMY_H,
        hp: ENEMY_HP, stun: 0, type: type,
        lastAttack: 0, hitFlash: 0
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
        let redCount = enemies.filter(e => e.type === 'red').length;
        if (redCount < RED_ENEMY_MAX && now - redChunkLastSpawn[ch] >= interval) {
            if (spawnEnemyInChunk(ch, 'red')) redChunkLastSpawn[ch] = now;
        }
    }
    // 黑色敌人生成
    for (let ch = 0; ch < MAP_CHUNKS; ch++) {
        let dist = Math.abs(ch - curChunk), interval = 0;
        if (dist === 0) interval = 8000;
        else if (dist === 1) interval = 16000;
        else if (dist === 2) interval = 20000;
        if (!interval) continue;
        let blackCount = enemies.filter(e => e.type === 'black').length;
        if (blackCount < BLACK_ENEMY_MAX && now - blackChunkLastSpawn[ch] >= interval) {
            if (spawnEnemyInChunk(ch, 'black')) blackChunkLastSpawn[ch] = now;
        }
    }
    // 移动敌人
    for (let e of enemies) {
        if (e.stun > 0) e.stun--;
        if (e.hitFlash > 0) e.hitFlash--;
        let pc = player.x + player.w/2, ec = e.x + e.w/2;
        if (pc > ec) e.x += ENEMY_SPD;
        else if (pc < ec) e.x -= ENEMY_SPD;
        e.x = Math.min(Math.max(0, e.x), WORLD_W - e.w);
    }
    // 清理死亡敌人并统计击杀
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
    if (boss.hp <= 0 && !victory) {
        victory = true;
        victoryMsgDiv.style.display = 'block';
        // 监狱地图胜利后可以跳转到下一关，这里保留 nextMapBtn 显示
        nextMapBtn.style.display = 'block';
        boss = null;
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