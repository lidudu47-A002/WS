// ---------- 游戏状态管理 ----------

// 存档点保存
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
        skillDamageMult: skillDamageMult,
        inventorySlots: inventorySlots.map(slot => slot ? { type: slot.type, count: slot.count } : null),
        talentPoints: talentPoints,
        learnedTalents: learnedTalents,
        achievementsUnlocked: achievementsUnlocked,
        totalGoldEarned: totalGoldEarned,
        bossDefeated: bossDefeated
    };
    hasSave = true;
    playerHP = currentMaxHp;
    saveMsgDiv.style.display = 'block';
    setTimeout(() => saveMsgDiv.style.display = 'none', 1500);
    return true;
}

// 从存档点复活
function respawn() {
    if (!hasSave) return false;
    playerHP = savedData.hp;
    player.x = savedData.worldX;
    player.y = getGroundY();
    player.vy = 0;
    player.jumpsLeft = talentTripleJump ? 3 : 2;
    gold = savedData.gold;
    exp = savedData.exp;
    level = savedData.level;
    killCount = savedData.kills;
    normalAttackMult = savedData.normalAttackMult;
    skillDamageMult = savedData.skillDamageMult;
    // 恢复背包
    if (savedData.inventorySlots) {
        inventorySlots = savedData.inventorySlots.map(slot => slot ? { ...slot } : null);
    } else {
        inventorySlots = new Array(INVENTORY_SIZE).fill(null);
    }
    // 恢复天赋和成就
    if (savedData.talentPoints !== undefined) talentPoints = savedData.talentPoints;
    if (savedData.learnedTalents) learnedTalents = savedData.learnedTalents;
    if (savedData.achievementsUnlocked) achievementsUnlocked = savedData.achievementsUnlocked;
    if (savedData.totalGoldEarned !== undefined) totalGoldEarned = savedData.totalGoldEarned;
    if (savedData.bossDefeated !== undefined) bossDefeated = savedData.bossDefeated;

    if (typeof initTalents === 'function') initTalents(learnedTalents, talentPoints);
    if (typeof initAchievements === 'function') initAchievements(achievementsUnlocked, totalGoldEarned, bossDefeated);
    if (typeof applyTalentEffects === 'function') applyTalentEffects();
    if (typeof updatePlayerMaxHp === 'function') updatePlayerMaxHp();

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

// 检查当前用户是否有存档权限（与外部账户系统联动）
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

// 从对象导入存档
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
    // 导入背包
    if (saveObj.inventorySlots) {
        inventorySlots = saveObj.inventorySlots.map(slot => slot ? { type: slot.type, count: slot.count } : null);
    } else {
        inventorySlots = new Array(INVENTORY_SIZE).fill(null);
    }
    // 导入天赋和成就
    if (saveObj.talentPoints !== undefined) talentPoints = saveObj.talentPoints;
    if (saveObj.learnedTalents) learnedTalents = saveObj.learnedTalents;
    if (saveObj.achievementsUnlocked) achievementsUnlocked = saveObj.achievementsUnlocked;
    if (saveObj.totalGoldEarned !== undefined) totalGoldEarned = saveObj.totalGoldEarned;
    if (saveObj.bossDefeated !== undefined) bossDefeated = saveObj.bossDefeated;

    if (typeof initTalents === 'function') initTalents(learnedTalents, talentPoints);
    if (typeof initAchievements === 'function') initAchievements(achievementsUnlocked, totalGoldEarned, bossDefeated);
    if (typeof applyTalentEffects === 'function') applyTalentEffects();
    if (typeof updatePlayerMaxHp === 'function') updatePlayerMaxHp();

    enemies = [];
    if (saveObj.enemies) {
        saveObj.enemies.forEach(eData => {
            let enemy = {
                x: eData.x, y: eData.y, w: ENEMY_W, h: ENEMY_H,
                hp: eData.hp, stun: eData.stun, type: eData.type,
                lastAttack: eData.lastAttack || 0, hitFlash: 0
            };
            enemy.color = eData.type === 'red' ? '#ff0000' : '#000000';
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
    player.jumpsLeft = talentTripleJump ? 3 : 2;
    projectiles = [];
    pierceProjectile = null;
    lasers = [];
    lastLaser = 0;
    cameraX = Math.max(0, Math.min(player.x - VIEW_W/2, WORLD_W - VIEW_W));
    updatePanelUI();
}

// 导出存档文件
function exportSave() {
    if (!canUserSave()) {
        alert('管理员已禁止你使用存档功能');
        return;
    }
    const enemiesData = enemies.map(e => ({ x: e.x, y: e.y, type: e.type, hp: e.hp, stun: e.stun, lastAttack: e.lastAttack }));
    let bossData = null;
    if (boss) {
        bossData = {
            x: boss.x, y: boss.y, hp: boss.hp, maxHp: boss.maxHp,
            colors: boss.colors, colorIdx: boss.colorIdx, nextTime: boss.nextTime,
            interval: boss.interval, speed: boss.speed
        };
    }
    const saveObj = {
        map: window.location.pathname.includes('prison') ? 'prison' : 'black',
        hp: playerHP, gold, level, exp, kills: killCount,
        x: player.x, y: player.y,
        normalAttackMult, skillDamageMult,
        hasSavePoint: hasSave,
        savedData: hasSave ? savedData : null,
        enemies: enemiesData,
        boss: bossData,
        inventorySlots: inventorySlots.map(slot => slot ? { type: slot.type, count: slot.count } : null),
        talentPoints: talentPoints,
        learnedTalents: learnedTalents,
        achievementsUnlocked: achievementsUnlocked,
        totalGoldEarned: totalGoldEarned,
        bossDefeated: bossDefeated
    };
    const jsonStr = JSON.stringify(saveObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = window.location.pathname.includes('prison') ? 'prison_save.json' : 'black_room_save.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    saveMsgDiv.style.display = 'block';
    setTimeout(() => saveMsgDiv.style.display = 'none', 1500);
}

// 导入存档文件（通过文件选择器）
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

// 触发加载存档（打开文件对话框）
function triggerLoad() {
    if (!canUserSave()) {
        alert('管理员已禁止你使用存档功能');
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        if (e.target.files[0]) importSave(e.target.files[0]);
    };
    input.click();
}

// 从 URL 参数初始化存档（用于分享链接）
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