// ---------- 游戏状态管理（压缩版） ----------

// ========== 压缩辅助常量 ==========
// 短键名映射表（仅用于压缩导出，导入时反向还原）
const KEY_MAP = {
    // 顶层
    map: 'mp', hp: 'hp', gold: 'gd', level: 'lv', exp: 'ex', kills: 'kl',
    x: 'px', y: 'py', normalAttackMult: 'nam', skillDamageMult: 'sdm',
    hasSavePoint: 'hsp', savedData: 'sd',
    enemies: 'en', boss: 'bs', inventorySlots: 'is',
    talentPoints: 'tp', learnedTalents: 'lt', achievementsUnlocked: 'au',
    totalGoldEarned: 'tge', bossDefeated: 'bd',
    hasCross: 'hc', crossProtectionAvailable: 'cpa', crossCooldownTimer: 'cct',
    hasClownMask: 'hcm', ownedPets: 'op', activePets: 'ap', currentWeapon: 'cw',
    // savedData 内部
    worldX: 'wx',
    // 敌人属性
    type: 't', hp: 'h', stun: 's', lastAttack: 'la', summoned: 'sm',
    slowLevel: 'sl', slowLastDecay: 'sld', frozenUntil: 'fu', fireLevel: 'fl',
    fireLastDamage: 'fld', fireLastDecay: 'frd', controlledByPet: 'cbp',
    suspended: 'sp', suspendStartTime: 'sst', suspendTargetY: 'sty',
    suspendOriginalY: 'soy', canBeDamaged: 'cbd', hasPermanentSlow: 'hps',
    blackholeLevel: 'bhl', blackholeLastDamage: 'bld',
    lightningLevel: 'll', lightningTimer: 'ltm', lightningDuration: 'ldu',
    lightningLastDamage: 'lld', lightningLastDecay: 'llk',
    weakLevel: 'wl', weakLastDecay: 'wld',
    // boss 属性
    colors: 'cl', colorIdx: 'ci', nextTime: 'nt', interval: 'iv', speed: 'spd',
    maxHp: 'mh',
    // 角色系统
    currentCharacter: 'cc', characterUnlocked: 'cu'
};

// 反向映射
const REV_KEY_MAP = {};
for (const [long, short] of Object.entries(KEY_MAP)) {
    REV_KEY_MAP[short] = long;
}

// 默认值列表（用于省略时填充）
const DEFAULTS = {
    stun: 0,
    summoned: false,
    slowLevel: 0,
    frozenUntil: 0,
    fireLevel: 0,
    controlledByPet: false,
    suspended: false,
    suspendStartTime: 0,
    suspendTargetY: 0,
    suspendOriginalY: 0,
    canBeDamaged: true,
    hasPermanentSlow: false,
    blackholeLevel: 0,
    lightningLevel: 0,
    lightningTimer: 0,
    lightningDuration: 0,
    weakLevel: 0,
    hp: 80,
    type: 'red',
    lastAttack: 0,
};

// 压缩函数
function compressObject(obj, defaults = {}) {
    if (Array.isArray(obj)) {
        return obj.map(item => compressObject(item, defaults));
    }
    if (obj && typeof obj === 'object') {
        const compressed = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value === undefined || value === null) continue;
            if (defaults.hasOwnProperty(key) && value === defaults[key]) continue;
            let processed = value;
            if (typeof value === 'object') {
                processed = compressObject(value, defaults);
                if (processed === undefined || processed === null) continue;
                if (Array.isArray(processed) && processed.length === 0) continue;
                if (!Array.isArray(processed) && Object.keys(processed).length === 0) continue;
            }
            if (typeof processed === 'number') {
                processed = Math.round(processed * 10) / 10;
                if (processed === 0 && (defaults.hasOwnProperty(key) && defaults[key] === 0)) continue;
            }
            const shortKey = KEY_MAP[key] || key;
            compressed[shortKey] = processed;
        }
        return compressed;
    }
    return obj;
}

// 解压函数
function decompressObject(obj, defaults = {}) {
    if (Array.isArray(obj)) {
        return obj.map(item => decompressObject(item, defaults));
    }
    if (obj && typeof obj === 'object') {
        const decompressed = {};
        for (const [shortKey, value] of Object.entries(obj)) {
            const longKey = REV_KEY_MAP[shortKey] || shortKey;
            let processed = value;
            if (typeof value === 'object') {
                processed = decompressObject(value, defaults);
                if (processed === undefined || processed === null) continue;
            }
            decompressed[longKey] = processed;
        }
        for (const [key, def] of Object.entries(defaults)) {
            if (!decompressed.hasOwnProperty(key)) {
                decompressed[key] = def;
            }
        }
        return decompressed;
    }
    return obj;
}

// ========== 原有函数，修改了 exportSave / importSaveFromObject ==========

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
        bossDefeated: bossDefeated,
        // 十字架
        hasCross: window.hasCross || false,
        crossProtectionAvailable: window.crossProtectionAvailable !== undefined ? window.crossProtectionAvailable : true,
        crossCooldownTimer: window.crossCooldownTimer || 0,
        // 小丑面具
        hasClownMask: window.hasClownMask || false,
        // 角色系统
        currentCharacter: window.currentCharacter || 'ava',
        characterUnlocked: window.characterUnlocked || false,
        enemies: enemies.map(e => ({
            x: e.x, y: e.y, type: e.type, hp: e.hp, stun: e.stun,
            lastAttack: e.lastAttack, summoned: e.summoned || false,
            slowLevel: e.slowLevel, slowLastDecay: e.slowLastDecay,
            frozenUntil: e.frozenUntil, fireLevel: e.fireLevel,
            fireLastDamage: e.fireLastDamage, fireLastDecay: e.fireLastDecay,
            controlledByPet: e.controlledByPet, suspended: e.suspended,
            suspendStartTime: e.suspendStartTime, suspendTargetY: e.suspendTargetY,
            suspendOriginalY: e.suspendOriginalY, canBeDamaged: e.canBeDamaged,
            hasPermanentSlow: e.hasPermanentSlow,
            blackholeLevel: e.blackholeLevel, blackholeLastDamage: e.blackholeLastDamage,
            lightningLevel: e.lightningLevel, lightningTimer: e.lightningTimer,
            lightningDuration: e.lightningDuration, lightningLastDamage: e.lightningLastDamage,
            lightningLastDecay: e.lightningLastDecay,
            weakLevel: e.weakLevel, weakLastDecay: e.weakLastDecay
        })),
        boss: boss ? {
            x: boss.x, y: boss.y, hp: boss.hp, maxHp: boss.maxHp,
            colors: boss.colors, colorIdx: boss.colorIdx,
            nextTime: boss.nextTime, interval: boss.interval, speed: boss.speed
        } : null,
        ownedPets: window.ownedPets || [],
        activePets: activePets ? activePets.map(p => ({ type: p.type })) : [],
        currentWeapon: currentWeapon ? currentWeapon.id : null
    };
    hasSave = true;
    playerHP = currentMaxHp;
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
    let triple = (typeof talentTripleJump !== 'undefined') ? talentTripleJump : false;
    player.jumpsLeft = triple ? 3 : 2;
    gold = savedData.gold;
    exp = savedData.exp;
    level = savedData.level;
    killCount = savedData.kills;
    normalAttackMult = savedData.normalAttackMult;
    skillDamageMult = savedData.skillDamageMult;

    if (savedData.inventorySlots) {
        inventorySlots = savedData.inventorySlots.map(slot => slot ? { ...slot } : null);
    } else {
        inventorySlots = new Array(INVENTORY_SIZE).fill(null);
    }

    if (savedData.talentPoints !== undefined) talentPoints = savedData.talentPoints;
    if (savedData.learnedTalents) learnedTalents = savedData.learnedTalents;
    if (savedData.achievementsUnlocked) achievementsUnlocked = savedData.achievementsUnlocked;
    if (savedData.totalGoldEarned !== undefined) totalGoldEarned = savedData.totalGoldEarned;
    if (savedData.bossDefeated !== undefined) bossDefeated = savedData.bossDefeated;

    // 恢复十字架
    if (savedData.hasCross !== undefined) {
        window.hasCross = savedData.hasCross;
        window.crossProtectionAvailable = savedData.crossProtectionAvailable !== undefined ? savedData.crossProtectionAvailable : true;
        window.crossCooldownTimer = savedData.crossCooldownTimer || 0;
    }
    if (savedData.hasClownMask !== undefined) {
        window.hasClownMask = savedData.hasClownMask;
    }
    // 恢复角色
    if (savedData.currentCharacter !== undefined) {
        window.currentCharacter = savedData.currentCharacter;
    }
    if (savedData.characterUnlocked !== undefined) {
        window.characterUnlocked = savedData.characterUnlocked;
    }

    if (typeof initTalents === 'function') initTalents(learnedTalents, talentPoints);
    if (typeof initAchievements === 'function') initAchievements(achievementsUnlocked, totalGoldEarned, bossDefeated);
    if (typeof applyTalentEffects === 'function') applyTalentEffects();
    if (typeof updatePlayerMaxHp === 'function') updatePlayerMaxHp();

    enemies = [];
    if (savedData.enemies) {
        savedData.enemies.forEach(eData => {
            let enemy = {
                x: eData.x, y: eData.y, w: ENEMY_W, h: ENEMY_H,
                hp: eData.hp, stun: eData.stun, type: eData.type,
                lastAttack: eData.lastAttack || 0, hitFlash: 0,
                summoned: eData.summoned || false,
                slowLevel: eData.slowLevel || 0,
                slowLastDecay: eData.slowLastDecay || performance.now(),
                frozenUntil: eData.frozenUntil || 0,
                fireLevel: eData.fireLevel || 0,
                fireLastDamage: eData.fireLastDamage || performance.now(),
                fireLastDecay: eData.fireLastDecay || performance.now(),
                controlledByPet: eData.controlledByPet || false,
                suspended: eData.suspended || false,
                suspendStartTime: eData.suspendStartTime || 0,
                suspendTargetY: eData.suspendTargetY || 0,
                suspendOriginalY: eData.suspendOriginalY || 0,
                canBeDamaged: eData.canBeDamaged !== undefined ? eData.canBeDamaged : true,
                hasPermanentSlow: eData.hasPermanentSlow || false,
                blackholeLevel: eData.blackholeLevel || 0,
                blackholeLastDamage: eData.blackholeLastDamage || performance.now(),
                lightningLevel: eData.lightningLevel || 0,
                lightningTimer: eData.lightningTimer || 0,
                lightningDuration: eData.lightningDuration || 0,
                lightningLastDamage: eData.lightningLastDamage || performance.now(),
                lightningLastDecay: eData.lightningLastDecay || performance.now(),
                weakLevel: eData.weakLevel || 0,
                weakLastDecay: eData.weakLastDecay || performance.now(),
                _lastLightningUpdate: performance.now(),
                _lastLightningDurationUpdate: performance.now()
            };
            enemy.color = eData.type === 'red' ? '#ff0000' : BLACK_ENEMY_COLOR;
            enemies.push(enemy);
        });
    }
    if (savedData.boss) {
        boss = {
            x: savedData.boss.x, y: savedData.boss.y, w: BOSS_SIZE, h: BOSS_SIZE,
            hp: savedData.boss.hp, maxHp: savedData.boss.maxHp,
            colors: savedData.boss.colors || Array(16).fill('#ff0000'),
            colorIdx: savedData.boss.colorIdx || 0,
            nextTime: savedData.boss.nextTime || 0,
            interval: savedData.boss.interval || 100,
            speed: savedData.boss.speed || 0
        };
    } else boss = null;

    if (savedData.ownedPets) window.ownedPets = savedData.ownedPets;
    if (savedData.activePets && typeof addPet === 'function') {
        for (let p of savedData.activePets) {
            addPet(p.type);
        }
    }
    if (savedData.currentWeapon && typeof equipWeapon === 'function') {
        equipWeapon(savedData.currentWeapon);
    }

    player.vy = 0;
    player.jumpsLeft = triple ? 3 : 2;
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
    const isCompressed = (saveObj.mp !== undefined && saveObj.map === undefined);
    let data = saveObj;
    if (isCompressed) {
        data = decompressObject(saveObj, {});
    }

    playerHP = data.hp;
    gold = data.gold;
    level = data.level;
    exp = data.exp;
    killCount = data.kills;
    player.x = data.x;
    player.y = data.y;
    normalAttackMult = data.normalAttackMult || 1.0;
    skillDamageMult = data.skillDamageMult || 1.0;
    hasSave = data.hasSavePoint || false;
    if (hasSave && data.savedData) {
        if (data.savedData.mp !== undefined) {
            savedData = decompressObject(data.savedData, {});
        } else {
            savedData = data.savedData;
        }
    }

    if (data.inventorySlots) {
        inventorySlots = data.inventorySlots.map(slot => slot ? { type: slot.type, count: slot.count } : null);
    } else {
        inventorySlots = new Array(INVENTORY_SIZE).fill(null);
    }

    if (data.talentPoints !== undefined) talentPoints = data.talentPoints;
    if (data.learnedTalents) learnedTalents = data.learnedTalents;
    if (data.achievementsUnlocked) achievementsUnlocked = data.achievementsUnlocked;
    if (data.totalGoldEarned !== undefined) totalGoldEarned = data.totalGoldEarned;
    if (data.bossDefeated !== undefined) bossDefeated = data.bossDefeated;

    // 十字架
    if (data.hasCross !== undefined) {
        window.hasCross = data.hasCross;
        window.crossProtectionAvailable = data.crossProtectionAvailable !== undefined ? data.crossProtectionAvailable : true;
        window.crossCooldownTimer = data.crossCooldownTimer || 0;
    }
    if (data.hasClownMask !== undefined) {
        window.hasClownMask = data.hasClownMask;
    }
    // 角色
    if (data.currentCharacter !== undefined) {
        window.currentCharacter = data.currentCharacter;
    }
    if (data.characterUnlocked !== undefined) {
        window.characterUnlocked = data.characterUnlocked;
    }

    if (data.ownedPets) window.ownedPets = data.ownedPets;
    if (data.activePets && typeof addPet === 'function') {
        for (let p of data.activePets) {
            addPet(p.type);
        }
    }
    if (data.currentWeapon && typeof equipWeapon === 'function') {
        equipWeapon(data.currentWeapon);
    }

    if (typeof initTalents === 'function') initTalents(learnedTalents, talentPoints);
    if (typeof initAchievements === 'function') initAchievements(achievementsUnlocked, totalGoldEarned, bossDefeated);
    if (typeof applyTalentEffects === 'function') applyTalentEffects();
    if (typeof updatePlayerMaxHp === 'function') updatePlayerMaxHp();

    enemies = [];
    if (data.enemies) {
        data.enemies.forEach(eData => {
            let e = eData;
            if (eData.t !== undefined) {
                e = decompressObject(eData, DEFAULTS);
            }
            const enemy = {
                x: e.x, y: e.y, w: ENEMY_W, h: ENEMY_H,
                hp: e.hp !== undefined ? e.hp : 80,
                stun: e.stun || 0,
                type: e.type || 'red',
                lastAttack: e.lastAttack || 0,
                hitFlash: 0,
                summoned: e.summoned || false,
                slowLevel: e.slowLevel || 0,
                slowLastDecay: e.slowLastDecay || performance.now(),
                frozenUntil: e.frozenUntil || 0,
                fireLevel: e.fireLevel || 0,
                fireLastDamage: e.fireLastDamage || performance.now(),
                fireLastDecay: e.fireLastDecay || performance.now(),
                controlledByPet: e.controlledByPet || false,
                suspended: e.suspended || false,
                suspendStartTime: e.suspendStartTime || 0,
                suspendTargetY: e.suspendTargetY || 0,
                suspendOriginalY: e.suspendOriginalY || 0,
                canBeDamaged: e.canBeDamaged !== undefined ? e.canBeDamaged : true,
                hasPermanentSlow: e.hasPermanentSlow || false,
                blackholeLevel: e.blackholeLevel || 0,
                blackholeLastDamage: e.blackholeLastDamage || performance.now(),
                lightningLevel: e.lightningLevel || 0,
                lightningTimer: e.lightningTimer || 0,
                lightningDuration: e.lightningDuration || 0,
                lightningLastDamage: e.lightningLastDamage || performance.now(),
                lightningLastDecay: e.lightningLastDecay || performance.now(),
                weakLevel: e.weakLevel || 0,
                weakLastDecay: e.weakLastDecay || performance.now(),
                _lastLightningUpdate: performance.now(),
                _lastLightningDurationUpdate: performance.now()
            };
            enemy.color = enemy.type === 'red' ? '#ff0000' : BLACK_ENEMY_COLOR;
            enemies.push(enemy);
        });
    }
    if (data.boss) {
        let b = data.boss;
        if (b.cl !== undefined) {
            b = decompressObject(b, {});
        }
        boss = {
            x: b.x, y: b.y, w: BOSS_SIZE, h: BOSS_SIZE,
            hp: b.hp, maxHp: b.maxHp,
            colors: b.colors || Array(16).fill('#ff0000'),
            colorIdx: b.colorIdx || 0,
            nextTime: b.nextTime || 0,
            interval: b.interval || 100,
            speed: b.speed || 0
        };
    } else boss = null;

    player.vy = 0;
    let triple = (typeof talentTripleJump !== 'undefined') ? talentTripleJump : false;
    player.jumpsLeft = triple ? 3 : 2;
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
        x: e.x, y: e.y, type: e.type, hp: e.hp, stun: e.stun, lastAttack: e.lastAttack,
        summoned: e.summoned || false,
        slowLevel: e.slowLevel, slowLastDecay: e.slowLastDecay,
        frozenUntil: e.frozenUntil, fireLevel: e.fireLevel,
        fireLastDamage: e.fireLastDamage, fireLastDecay: e.fireLastDecay,
        controlledByPet: e.controlledByPet, suspended: e.suspended,
        suspendStartTime: e.suspendStartTime, suspendTargetY: e.suspendTargetY,
        suspendOriginalY: e.suspendOriginalY, canBeDamaged: e.canBeDamaged,
        hasPermanentSlow: e.hasPermanentSlow,
        blackholeLevel: e.blackholeLevel, blackholeLastDamage: e.blackholeLastDamage,
        lightningLevel: e.lightningLevel, lightningTimer: e.lightningTimer,
        lightningDuration: e.lightningDuration, lightningLastDamage: e.lightningLastDamage,
        lightningLastDecay: e.lightningLastDecay,
        weakLevel: e.weakLevel, weakLastDecay: e.weakLastDecay
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
        map: window.location.pathname.includes('prison') ? 'prison' : 'black',
        hp: playerHP, gold, level, exp, kills: killCount,
        x: player.x, y: player.y,
        normalAttackMult, skillDamageMult,
        hasSavePoint: hasSave,
        savedData: hasSave ? savedData : null,
        enemies: enemiesData,
        boss: bossData,
        inventorySlots: inventorySlots.map(slot => slot ? { type: slot.type, count: slot.count } : null),
        talentPoints, learnedTalents, achievementsUnlocked, totalGoldEarned, bossDefeated,
        hasCross: window.hasCross || false,
        crossProtectionAvailable: window.crossProtectionAvailable !== undefined ? window.crossProtectionAvailable : true,
        crossCooldownTimer: window.crossCooldownTimer || 0,
        hasClownMask: window.hasClownMask || false,
        // 角色
        currentCharacter: window.currentCharacter || 'ava',
        characterUnlocked: window.characterUnlocked || false,
        ownedPets: window.ownedPets,
        activePets: activePets ? activePets.map(p => ({ type: p.type })) : [],
        currentWeapon: currentWeapon ? currentWeapon.id : null
    };

    let compressed = compressObject(saveObj, {});
    if (compressed.sd) {
        compressed.sd = compressObject(saveObj.savedData, {});
    }
    if (compressed.en) {
        compressed.en = compressed.en.map(en => compressObject(en, DEFAULTS));
    }

    const jsonStr = JSON.stringify(compressed, null, 2);
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
    input.onchange = (e) => {
        if (e.target.files[0]) importSave(e.target.files[0]);
    };
    input.click();
}

function initFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    const loadParam = urlParams.get('load');

    if (dataParam) {
        try {
            const decoded = JSON.parse(atob(dataParam));
            importSaveFromObject(decoded);
        } catch(e) {}
    }

    if (loadParam === 'pending') {
        const pendingData = localStorage.getItem('ws_pending_save');
        if (pendingData) {
            try {
                const saveObj = JSON.parse(pendingData);
                importSaveFromObject(saveObj);
                localStorage.removeItem('ws_pending_save');
                loadMsgDiv.style.display = 'block';
                setTimeout(() => loadMsgDiv.style.display = 'none', 2000);
                console.log('[地图] 已从 localStorage 加载存档');
            } catch(e) {
                console.warn('[地图] 从 localStorage 恢复存档失败', e);
            }
        } else {
            console.warn('[地图] 未找到待加载的存档数据');
        }
    }

    if (loadParam === 'black') {
        const saved = localStorage.getItem('black_room_prison_save');
        if (saved) {
            try {
                const saveObj = JSON.parse(saved);
                importSaveFromObject(saveObj);
                if (window.location.pathname.includes('prison')) {
                    player.x = 50;
                    player.y = getGroundY();
                    cameraX = 0;
                    updateCam();
                }
                loadMsgDiv.style.display = 'block';
                setTimeout(() => loadMsgDiv.style.display = 'none', 2000);
                console.log('[地图] 已从黑屋存档恢复数据');
            } catch(e) {
                console.warn('[地图] 从黑屋恢复存档失败', e);
            }
        } else {
            console.warn('[地图] 未找到黑屋存档数据');
        }
    }

    if (loadParam && loadParam !== 'pending' && loadParam !== 'black') {
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

function exportSaveToLocalStorage() {
    const enemiesData = enemies.map(e => ({
        x: e.x, y: e.y, type: e.type, hp: e.hp, stun: e.stun, lastAttack: e.lastAttack,
        summoned: e.summoned || false,
        slowLevel: e.slowLevel, slowLastDecay: e.slowLastDecay,
        frozenUntil: e.frozenUntil, fireLevel: e.fireLevel,
        fireLastDamage: e.fireLastDamage, fireLastDecay: e.fireLastDecay,
        controlledByPet: e.controlledByPet, suspended: e.suspended,
        suspendStartTime: e.suspendStartTime, suspendTargetY: e.suspendTargetY,
        suspendOriginalY: e.suspendOriginalY, canBeDamaged: e.canBeDamaged,
        hasPermanentSlow: e.hasPermanentSlow,
        blackholeLevel: e.blackholeLevel, blackholeLastDamage: e.blackholeLastDamage,
        lightningLevel: e.lightningLevel, lightningTimer: e.lightningTimer,
        lightningDuration: e.lightningDuration, lightningLastDamage: e.lightningLastDamage,
        lightningLastDecay: e.lightningLastDecay,
        weakLevel: e.weakLevel, weakLastDecay: e.weakLastDecay
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
        map: window.location.pathname.includes('prison') ? 'prison' : 'black',
        hp: playerHP,
        gold, level, exp, kills: killCount,
        x: player.x, y: player.y,
        normalAttackMult, skillDamageMult,
        hasSavePoint: hasSave,
        savedData: hasSave ? savedData : null,
        enemies: enemiesData,
        boss: bossData,
        inventorySlots: inventorySlots.map(slot => slot ? { type: slot.type, count: slot.count } : null),
        talentPoints, learnedTalents, achievementsUnlocked, totalGoldEarned, bossDefeated,
        hasCross: window.hasCross || false,
        crossProtectionAvailable: window.crossProtectionAvailable !== undefined ? window.crossProtectionAvailable : true,
        crossCooldownTimer: window.crossCooldownTimer || 0,
        hasClownMask: window.hasClownMask || false,
        currentCharacter: window.currentCharacter || 'ava',
        characterUnlocked: window.characterUnlocked || false,
        ownedPets: window.ownedPets,
        activePets: activePets ? activePets.map(p => ({ type: p.type })) : [],
        currentWeapon: currentWeapon ? currentWeapon.id : null,
        cameraX
    };
    localStorage.setItem('black_room_prison_save', JSON.stringify(saveObj));
}