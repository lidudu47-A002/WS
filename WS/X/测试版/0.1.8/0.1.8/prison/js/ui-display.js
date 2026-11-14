// ---------- UI显示与更新 ----------
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

function loadSaveStarImage() {
    const img = new Image();
    img.src = '素材/存档点.gif';
    img.onload = () => { saveStarImage = img; };
    img.onerror = () => { console.warn('未找到存档点图片'); };
}