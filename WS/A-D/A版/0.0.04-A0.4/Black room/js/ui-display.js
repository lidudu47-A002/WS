// ---------- UI显示与更新 ----------

// 兼容旧调用：角色信息已合并进新角色面板与顶部状态条，此函数不再更新任何字段
function updatePanelUI() {}


// 加载存档点动画图片
function loadSaveStarImage() {
    const img = new Image();
    img.src = '../公用文件/图片/存档点.gif';
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