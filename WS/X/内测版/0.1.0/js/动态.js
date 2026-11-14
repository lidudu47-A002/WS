// 动态.js - 装饰物、刷新点、敌人生成

// 初始化装饰物（黄色壁灯）
const LAMP_COUNT = 10;
const LAMP_WIDTH = 12;
const LAMP_HEIGHT = 30;
const LAMP_Y = WORLD_HEIGHT / 2 - LAMP_HEIGHT / 2;
const MARGIN = 100;
for (let i = 0; i < LAMP_COUNT; i++) {
    const x = MARGIN + (i / (LAMP_COUNT - 1)) * (WORLD_WIDTH - 2 * MARGIN);
    DECORATIONS.push({
        x: x,
        y: LAMP_Y,
        width: LAMP_WIDTH,
        height: LAMP_HEIGHT,
        color: '#ffaa00'
    });
}

// 初始化20个固定刷新点（每个区块中心）
for (let i = 0; i < CHUNK_COUNT; i++) {
    const x = i * CHUNK_SIZE + CHUNK_SIZE / 2;
    SPAWN_POINTS.push(x);
}

// 按区块分组
chunkSpawnPoints = Array.from({ length: CHUNK_COUNT }, () => []);
SPAWN_POINTS.forEach((x, index) => {
    const chunkIndex = Math.floor(x / CHUNK_SIZE);
    chunkSpawnPoints[chunkIndex].push(x);
});

// 每个区块的上次生成时间
chunkLastSpawn = Array.from({ length: CHUNK_COUNT }, () => 
    performance.now() - Math.random() * 10000
);

// 在指定区块生成一个敌人
function spawnEnemyInChunk(chunkIndex) {
    const points = chunkSpawnPoints[chunkIndex];
    if (points.length === 0) return;
    const spawnX = points[Math.floor(Math.random() * points.length)];
    const enemyY = WORLD_HEIGHT - ENEMY_SIZE - GROUND_OFFSET;
    enemies.push({
        worldX: spawnX,
        worldY: enemyY,
        width: ENEMY_SIZE,
        height: ENEMY_SIZE,
        color: '#ff0000',
        hp: ENEMY_MAX_HP,
        stunTimer: 0,
    });
}