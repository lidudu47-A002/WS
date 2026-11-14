// ---------- UI显示与更新 ----------

// 角色状态面板（按住 F 显示，松开隐藏）
function updatePanelUI() {
    const ch = (typeof getCurrentChar === 'function') ? getCurrentChar() : null;
    const lv = ch && typeof ch.level === 'number' ? ch.level : (typeof level === 'number' ? level : 1);
    const ex = ch && typeof ch.exp === 'number' ? ch.exp : (typeof exp === 'number' ? exp : 0);
    const need = (typeof expToNext === 'function') ? expToNext(lv) : 100;
    const $set = function (id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    $set('panelLevel', lv);
    $set('panelExp', ex + '/' + need);
    $set('panelGold', (typeof gold === 'number' ? gold : 0));
    $set('panelKills', (typeof killCount === 'number' ? killCount : 0));
    $set('panelChunk', Math.floor((player.x + player.w / 2) / CHUNK_SIZE) + 1);
    $set('panelAtk', (typeof getAttackDamage === 'function') ? Math.floor(getAttackDamage()) : 0);
    const mult = (typeof getSkillMultiplier === 'function') ? getSkillMultiplier() : 1;
    $set('panelMult', 'x' + mult.toFixed(2));
}

function showStatusPanel() {
    panelVisible = true;
    window.panelVisible = true;
    const el = document.getElementById('statusPanel');
    if (el) el.style.display = 'block';
    updatePanelUI();
}

function hideStatusPanel() {
    panelVisible = false;
    window.panelVisible = false;
    const el = document.getElementById('statusPanel');
    if (el) el.style.display = 'none';
}

function toggleStatusPanel() {
    if (panelVisible) hideStatusPanel();
    else showStatusPanel();
}

window.updatePanelUI = updatePanelUI;
window.showStatusPanel = showStatusPanel;
window.hideStatusPanel = hideStatusPanel;
window.toggleStatusPanel = toggleStatusPanel;


// 加载存档点动画图片
function loadSaveStarImage() {
    const img = new Image();
    img.src = '../公用文件/图片/存档点.gif';
    img.onload = () => { saveStarImage = img; };
    img.onerror = () => { console.warn('Checkpoint image not found'); };
}
