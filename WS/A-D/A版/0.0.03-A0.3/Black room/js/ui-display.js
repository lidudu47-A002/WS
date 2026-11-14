// ---------- UI显示与更新 ----------

// 更新角色状态面板
function updatePanelUI() {
    let curChunk = Math.floor((player.x + player.w/2) / CHUNK_SIZE);
    panelLevel.innerText = level;
    panelExp.innerText = `${exp}/${EXP_PER_LV}`;
    panelGold.innerText = gold;
    panelKills.innerText = killCount;
    panelChunk.innerText = curChunk;
    panelAtk.innerText = getAttackDamage();
    panelMult.innerText = `x${getSkillMultiplier().toFixed(2)}`;
}

// 加载存档点动画图片
function loadSaveStarImage() {
    const img = new Image();
    img.src = '素材/存档点.gif';
    img.onload = () => { saveStarImage = img; };
    img.onerror = () => { console.warn('未找到存档点图片'); };
}

// 显示普通消息（由其他模块调用）
function showMessage(msg, duration = 1500) {
    // 可扩展：显示浮动提示
    console.log(msg);
}

// 显示胜利界面（已在 game-loop 中控制，这里仅作占位）
function showVictory() {
    victoryMsgDiv.style.display = 'block';
    nextMapBtn.style.display = 'block';
}

// 显示游戏结束界面
function showGameOver() {
    gameOver = true;
    // 绘制由 render.js 负责，这里只改变状态
}