// 玩家属性.js - 玩家对象、等级金币相关函数

// 初始化玩家对象
player = {
    width: 30,
    height: STANDING_HEIGHT,
    worldX: 0,
    worldY: 0,
    speed: 2.8,
    vy: 0,
    facing: 1,
    isAttacking: false,
    attackStartTime: 0,
    attackHitEnemies: new Set(),
    visualOffsetX: 0,
    jumpsLeft: 2,
};

// 获取地面Y坐标
function getGroundY() {
    return WORLD_HEIGHT - player.height - GROUND_OFFSET;
}
player.worldY = getGroundY();

// 更新状态面板内容
function updatePanel() {
    const currentChunk = Math.floor((player.worldX + player.width/2) / CHUNK_SIZE);
    panelLevel.textContent = level;
    panelExp.textContent = `${exp}/${EXP_PER_LEVEL}`;
    panelGold.textContent = gold;
    panelKills.textContent = killCount;
    panelChunk.textContent = currentChunk;
}

// 增加金币和经验（每杀死一个敌人调用一次）
function addResourcesFromKill() {
    const goldGain = Math.floor(Math.random() * 5) + 1;
    const expGain = Math.floor(Math.random() * 5) + 1;
    gold += goldGain;
    exp += expGain;

    while (exp >= EXP_PER_LEVEL) {
        exp -= EXP_PER_LEVEL;
        level++;
    }

    if (panelVisible) updatePanel();
}