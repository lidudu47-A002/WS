// ---------- 游戏状态管理 ----------
function doSave(now) {
    if (now - lastSaveTime < SAVE_COOLDOWN) return false;
    lastSaveTime = now;
    savedData = {
        hp: playerHP,
        worldX: player.x,
        gold: gold,
        exp: exp,
        level: level,
        kills: killCount,
        normalAttackMult: normalAttackMult,
        skillDamageMult: skillDamageMult
    };
    hasSave = true;
    playerHP = PLAYER_MAX_HP;
    saveMsgDiv.style.display = 'block';
    setTimeout(() => saveMsgDiv.style.display = 'none', 1500);
    return true;
}

function respawn() {
    if (!hasSave) return false;
    playerHP = savedData.hp;
    player.x = savedData.worldX;
    player.y = getGroundY();
    player.vy = 0;
    player.jumpsLeft = 2;
    gold = savedData.gold;
    exp = savedData.exp;
    level = savedData.level;
    killCount = savedData.kills;
    normalAttackMult = savedData.normalAttackMult;
    skillDamageMult = savedData.skillDamageMult;
    projectiles = [];
    pierceProjectile = null;
    lasers = [];
    lastLaser = 0;
    cameraX = Math.max(0, Math.min(player.x - VIEW_W/2, WORLD_W - VIEW_W));
    respawnMsgDiv.style.display = 'block';
    setTimeout(() => respawnMsgDiv.style.display = 'none', 2000);
    if (panelVisible) updatePanelUI();
    return true;
}

function canUserSave() {
    const currentUser = sessionStorage.getItem('ws_current_user');
    if (!currentUser) return true;
    try {
        const accounts = JSON.parse(localStorage.getItem('ws_accounts') || '{}');
        const userData = accounts[currentUser];
        if (userData && userData.canSave === false) return false;
    } catch (e) {}
    return true;
}

function importSaveFromObject(saveObj) {
    playerHP = saveObj.hp;
    gold = saveObj.gold;
    level = saveObj.level;
    exp = saveObj.exp;
    killCount = saveObj.kills;
    player.x = saveObj.x;
    player.y = saveObj.y;
    normalAttackMult = saveObj.normalAttackMult || 1.0;
    skillDamageMult = saveObj.skillDamageMult || 1.0;
    hasSave = saveObj.hasSavePoint || false;
    if (hasSave && saveObj.savedData) savedData = saveObj.savedData;
    enemies = [];
    if (saveObj.enemies) {
        saveObj.enemies.forEach(eData => {
            let enemy = {
                x: eData.x, y: eData.y, w: ENEMY_W, h: ENEMY_H,
                hp: eData.hp, stun: eData.stun, type: eData.type,
                lastAttack: eData.lastAttack || 0, hitFlash: 0
            };
            enemy.color = eData.type === 'red' ? '#ff0000' : BLACK_ENEMY_COLOR;
            enemies.push(enemy);
        });
    }
    if (saveObj.boss) {
        boss = {
            x: saveObj.boss.x, y: saveObj.boss.y, w: BOSS_SIZE, h: BOSS_SIZE,
            hp: saveObj.boss.hp, maxHp: saveObj.boss.maxHp,
            colors: saveObj.boss.colors || Array(16).fill('#ff0000'),
            colorIdx: saveObj.boss.colorIdx || 0,
            nextTime: saveObj.boss.nextTime || 0,
            interval: saveObj.boss.interval || 100,
            speed: saveObj.boss.speed || 0
        };
    } else boss = null;
    player.vy = 0;
    player.jumpsLeft = 2;
    projectiles = [];
    pierceProjectile = null;
    lasers = [];
    lastLaser = 0;
    cameraX = Math.max(0, Math.min(player.x - VIEW_W/2, WORLD_W - VIEW_W));
    updatePanelUI();
}

function exportSave() {
    if (!canUserSave()) {
        alert('管理员已禁止你使用存档功能');
        return;
    }
    const enemiesData = enemies.map(e => ({
        x: e.x, y: e.y, type: e.type, hp: e.hp, stun: e.stun, lastAttack: e.lastAttack
    }));
    let bossData = null;
    if (boss) {
        bossData = {
            x: boss.x, y: boss.y, hp: boss.hp, maxHp: boss.maxHp,
            colors: boss.colors, colorIdx: boss.colorIdx, nextTime: boss.nextTime,
            interval: boss.interval, speed: boss.speed
        };
    }
    const saveObj = {
        map: 'prison',
        hp: playerHP, gold, level, exp, kills: killCount,
        x: player.x, y: player.y,
        normalAttackMult, skillDamageMult,
        hasSavePoint: hasSave,
        savedData: hasSave ? savedData : null,
        enemies: enemiesData,
        boss: bossData
    };
    const jsonStr = JSON.stringify(saveObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prison_save.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    saveMsgDiv.style.display = 'block';
    setTimeout(() => saveMsgDiv.style.display = 'none', 1500);
}

function importSave(file) {
    if (!canUserSave()) {
        alert('管理员已禁止你使用存档功能');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const saveObj = JSON.parse(e.target.result);
            importSaveFromObject(saveObj);
            loadMsgDiv.style.display = 'block';
            setTimeout(() => loadMsgDiv.style.display = 'none', 2000);
        } catch (err) {
            alert('存档损坏');
        }
    };
    reader.readAsText(file);
}

function triggerLoad() {
    if (!canUserSave()) {
        alert('管理员已禁止你使用存档功能');
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => { if (e.target.files[0]) importSave(e.target.files[0]); };
    input.click();
}

function initFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    const loadParam = urlParams.get('load');
    if (dataParam) {
        try {
            const decoded = JSON.parse(atob(dataParam));
            playerHP = decoded.hp;
            gold = decoded.gold;
            level = decoded.level;
            exp = decoded.exp;
            killCount = decoded.kills;
            normalAttackMult = decoded.normalAttackMult || 1.0;
            skillDamageMult = decoded.skillDamageMult || 1.0;
        } catch(e) {}
    }
    if (loadParam) {
        try {
            const jsonStr = decodeURIComponent(escape(window.atob(loadParam)));
            const saveObj = JSON.parse(jsonStr);
            importSaveFromObject(saveObj);
            loadMsgDiv.style.display = 'block';
            setTimeout(() => loadMsgDiv.style.display = 'none', 2000);
        } catch(e) {}
    }
    updatePanelUI();
}