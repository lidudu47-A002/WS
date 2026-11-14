// ---------- 主游戏循环及事件 ----------
let mouseLeftClicked = false;
let mouseRightClicked = false;

// 垂直镜头偏移
let cameraY = 0;

// 自然生成开关
window.stopNaturalSpawn = false;

// ---------- 角色系统变量（黑屋空实现） ----------
let characterPanelOpen = false;
let characterSelectOption = 0;
const CHARACTER_KEYS = { '1': 'ava', '2': 'bl' };
let pKeyPressed = false;
let jumpHeld = false;

// ---------- 复合弓蓄力状态 ----------
let compoundBowCharging = false;
let compoundBowPreviewX = 0;
let compoundBowPreviewY = 0;
let compoundBowHitEnemy = null;
let compoundBowStartX = 0;
let compoundBowStartY = 0;
let compoundBowTargetX = 0;
let compoundBowTargetY = 0;

// ---------- 命令UI（已迁移至 command-system.js：openCommandUI/closeCommandUI/isCommandActive） ----------

// ---------- give 指令物品解析（统一由 ITEMS 驱动，避免漏项） ----------
const GIVE_ALIASES = {
    fb: 'frostBlade', fs: 'firewand', cb: 'compoundBow', bh: 'blackholeStaff',
    ts: 'techSpear', pr: 'priestRobes', cm: 'clownMask', sd: 'shadowDagger',
    th: 'thunderHammer', en: 'xiaoe', '0.618': 'point618',
    ic: 'iceWings', iw: 'iceWings', ice: 'iceWings', wings: 'iceWings',
    '冰翼': 'iceWings', '冰霜翼': 'iceWings',
    shield: 'techShield', tshield: 'techShield', techshield: 'techShield',
    '盾牌': 'techShield', '科技盾': 'techShield'
};
const GIVE_PET_IDS = { monkey: 1, point618: 1, horror: 1, xiaoe: 1 };

// 去掉 emoji / 空白 / 分隔符，便于用中文名或大小写变体匹配
function stripItemLabel(s) {
    return String(s || '').replace(/[\uD800-\uDFFF\u2600-\u27BF\uFE0F\u200D\s\-_·.]/g, '').toLowerCase();
}

function resolveGiveItemId(raw) {
    const key = String(raw || '').trim();
    if (!key || typeof ITEMS === 'undefined') return null;
    const lower = key.toLowerCase();
    if (GIVE_ALIASES[lower] && ITEMS[GIVE_ALIASES[lower]]) return GIVE_ALIASES[lower];
    if (ITEMS[lower]) return lower;
    for (const id in ITEMS) {
        if (id.toLowerCase() === lower) return id;
    }
    const target = stripItemLabel(key);
    if (!target) return null;
    for (const id in ITEMS) {
        const label = stripItemLabel(ITEMS[id].name);
        if (label === target || label.indexOf(target) >= 0) return id;
    }
    return null;
}

function giveItemByCommand(raw) {
    const id = resolveGiveItemId(raw);
    if (!id) return false;
    const name = (ITEMS[id] && ITEMS[id].name) || id;
    if (GIVE_PET_IDS[id]) {
        if (typeof addPet !== 'function') { alert('宠物系统未加载'); return true; }
        addPet(id);
        alert('获得 ' + name + ' 宠物');
        return true;
    }
    if (typeof addItem !== 'function') { alert('物品系统未加载'); return true; }
    if (!addItem(id, 1)) { alert('物品栏已满，无法获得 ' + name); return true; }
    alert('获得 ' + name + ' x1');
    return true;
}

// ---------- 执行命令 ----------
function executeCommand(cmd) {
    // give：按 ITEMS 全量直通（含科技盾牌 / 冰霜之翼 / 药水 / 材料），命中即返回
    if (/^give\s+\S+/i.test(cmd) && giveItemByCommand(cmd.replace(/^give\s+/i, '').trim())) return;
    if (cmd.toLowerCase() === 'st summon') {
        window.stopNaturalSpawn = !window.stopNaturalSpawn;
        alert(window.stopNaturalSpawn ? '✅ 已停止敌人自然生成' : '✅ 已恢复敌人自然生成');
        return;
    }

    if (/^image\s+(reset|clear|还原)$/i.test(cmd.trim())) {
        if (typeof window.resetImageOverrides === 'function') window.resetImageOverrides();
        else alert('贴图系统未加载');
        return;
    }

    const imageMatch = cmd.match(/^image\s+(.+?)\s*=\s*(.+)$/i);
    if (imageMatch) {
        if (typeof window.applyImageOverride === 'function') {
            window.applyImageOverride(imageMatch[1].trim(), imageMatch[2].trim());
        } else {
            alert('贴图系统未加载');
        }
        return;
    }

    const coinMatch = cmd.match(/^give\s+(\d+)\s+coin$/i);
    if (coinMatch) {
        let amount = parseInt(coinMatch[1], 10);
        if (isNaN(amount) || amount <= 0) {
            alert('金币数量必须为正整数');
            return;
        }
        if (amount > 2000) {
            amount = 2000;
            alert('单次最多获得2000金币，已自动调整为2000');
        }
        gold += amount;
        alert(`获得 ${amount} 金币`);
        return;
    }

    const giveMatch = cmd.match(/^give\s+(\S+)$/i);
    if (giveMatch) {
        let item = giveMatch[1].toLowerCase();
        if (item === 'fb') {
            addItem('frostBlade', 1);
            alert('获得 F·B 冰霜之刃 x1');
        } else if (item === 'fs') {
            addItem('firewand', 1);
            alert('获得火焰法杖 x1');
        } else if (item === 'sword') {
            addItem('sword', 1);
            alert('获得铁剑 x1');
        } else if (item === 'compoundbow' || item === 'cb') {
            addItem('compoundBow', 1);
            alert('获得复合弓 x1');
        } else if (item === 'blackholestaff' || item === 'bh') {
            addItem('blackholeStaff', 1);
            alert('获得黑洞权杖 x1');
        } else if (item === 'techspear' || item === 'ts') {
            addItem('techSpear', 1);
            alert('获得科技长矛 x1');
        } else if (item === 'priestrobes' || item === 'pr') {
            addItem('priestRobes', 1);
            alert('获得神父服 x1');
        } else if (item === 'monkey') {
            if (typeof addPet === 'function') {
                addPet('monkey');
                alert('获得 Monkey 宠物');
            } else {
                alert('宠物系统未加载');
            }
        } else if (item === '0.618') {
            if (typeof addPet === 'function') {
                addPet('point618');
                alert('获得 0.618 宠物');
            } else {
                alert('宠物系统未加载');
            }
        } else if (item === 'horror') {
            if (typeof addPet === 'function') {
                addPet('horror');
                alert('获得 Horror 宠物');
            } else {
                alert('宠物系统未加载');
            }
        } else if (item === 'en') {
            if (typeof addPet === 'function') {
                addPet('xiaoe');
                alert('获得 小e 宠物');
            } else {
                alert('宠物系统未加载');
            }
        } else if (item === 'cross') {
            addItem('cross', 1);
            alert('获得 ✝️ 十字架 x1');
        } else if (item === 'cm' || item === 'clownmask') {
            addItem('clownMask', 1);
            alert('获得 🤡 小丑面具 x1');
        } else if (item === 'sd') {
            addItem('shadowDagger', 1);
            alert('获得 🗡️ 暗影匕首 x1');
        } else if (item === 'th' || item === 'thunderhammer') {
            addItem('thunderHammer', 1);
            alert('获得 ⚡ 雷霆锤 x1');
        } else {
            alert('未知物品，可用: sword, fb, fs, compoundbow/cb, blackholestaff/bh, techspear/ts, priestrobes/pr, monkey, 0.618, horror, en, cross, cm, sd, th');
        }
        return;
    }

    if (cmd.toLowerCase() === 'kill') {
        let killed = 0;
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.type === 'red' || e.type === 'black') {
                if (typeof addKillReward === 'function') addKillReward();
                killCount++;
                enemies.splice(i, 1);
                killed++;
            }
        }
        alert(`已杀死 ${killed} 个敌人`);
        return;
    }

    const summonMatch = cmd.match(/^summon\s+(\d+)\s+(\w+)(?:\s+(\d+))?(?:\s*~~~\s*(.*))?$/i);
    if (summonMatch) {
        const count = parseInt(summonMatch[1], 10);
        const type = summonMatch[2].toLowerCase();
        const chunkArg = summonMatch[3];
        const extraStr = summonMatch[4] || '';

        let targetChunk = null;
        if (chunkArg !== undefined && chunkArg !== '') {
            targetChunk = parseInt(chunkArg, 10);
        }

        let customHP = null;
        let customWeapon = null;

        const weaponAliases = {
            'sword': 'sword',
            'fb': 'frostBlade',
            'fs': 'firewand',
            'sd': 'shadowDagger',
            'th': 'thunderHammer',
            'cb': 'compoundBow',
            'bh': 'blackholeStaff',
            'ts': 'techSpear'
        };

        if (extraStr) {
            const parts = extraStr.split('~').filter(s => s.trim() !== '');
            for (const part of parts) {
                const trimmed = part.trim();
                const hpMatch = trimmed.match(/^HP\s*=\s*(\d+)$/i);
                if (hpMatch) {
                    customHP = parseInt(hpMatch[1], 10);
                    if (customHP <= 0) customHP = 1;
                    continue;
                }
                const aliasKey = trimmed.toLowerCase();
                const weaponId = weaponAliases[aliasKey];
                if (weaponId && WEAPONS[weaponId]) {
                    customWeapon = weaponId;
                } else if (WEAPONS[trimmed]) {
                    customWeapon = trimmed;
                } else {
                    alert(`未知武器: ${trimmed}，可用: sword, fb, fs, sd, th, cb, bh, ts`);
                    return;
                }
            }
        }

        summonEnemies(count, type, targetChunk, customHP, customWeapon);
        return;
    }

    const bmMatch = cmd.match(/^bm\s+(\d+)$/i);
    if (bmMatch) {
        const block = parseInt(bmMatch[1], 10);
        if (block < 0) { alert('区块不可小于0'); return; }
        if (block >= MAP_CHUNKS) { alert('区块不可大于最大区块数(' + (MAP_CHUNKS - 1) + ')'); return; }
        const targetX = block * CHUNK_SIZE + CHUNK_SIZE / 2 - player.w / 2;
        player.x = Math.min(Math.max(0, targetX), WORLD_W - player.w);
        player.y = getGroundY();
        player.vy = 0;
        player.jumpsLeft = talentTripleJump ? 3 : 2;
        cameraX = Math.max(0, Math.min(player.x - VIEW_W/2, WORLD_W - VIEW_W));
        return;
    }

    const tuneMatch = cmd.match(/^tune\s+LV\s*=\s*(\d+)$/i);
    if (tuneMatch) {
        const newLevel = parseInt(tuneMatch[1], 10);
        if (isNaN(newLevel) || newLevel < 1) { alert('等级不能小于1'); return; }
        if (newLevel > 20) { alert('等级不能大于20'); return; }
        level = newLevel;
        exp = 0;
        alert(`已设置等级为 ${level}，经验值已重置。`);
        return;
    }

    alert('指令格式错误！\n可用指令：\nST summon（切换自然生成）\n/bm 区块号\n/tune LV = 等级\n/summon 数量 生物名 [区块号] [~~~HP=数字~武器名]\n/kill\n/give ...\n/image 物品名(或ID) = 物品名(或ID)（替换贴图）');
}

function summonEnemies(count, type, targetChunk, customHP, customWeapon) {
    if (count <= 0 || count > 100) {
        alert('数量应为 1 到 100 之间');
        return;
    }
    if (type !== 'block' && type !== 'black') {
        alert('生物名只能是 block（红色敌人）或 black（黑色敌人）');
        return;
    }
    const enemyType = type === 'block' ? 'red' : 'black';
    let minX, maxX;
    if (targetChunk !== undefined) {
        if (targetChunk < 0 || targetChunk >= MAP_CHUNKS) {
            alert('区块号超出范围 (0-' + (MAP_CHUNKS-1) + ')');
            return;
        }
        minX = targetChunk * CHUNK_SIZE;
        maxX = (targetChunk + 1) * CHUNK_SIZE - ENEMY_W;
    } else {
        minX = player.x - 200;
        maxX = player.x + player.w + 200;
        if (minX < 0) minX = 0;
        if (maxX > WORLD_W - ENEMY_W) maxX = WORLD_W - ENEMY_W;
        if (maxX <= minX) maxX = minX + 100;
    }
    const groundY = WORLD_H - ENEMY_H - GROUND_Y_OFFSET;
    let spawned = 0;
    for (let i = 0; i < count; i++) {
        let x = minX + Math.random() * (maxX - minX);
        x = Math.min(maxX, Math.max(minX, x));
        let overlap = true;
        let attempts = 0;
        while (overlap && attempts < 10) {
            overlap = false;
            if (Math.abs(x - player.x) < 40) {
                overlap = true;
                x = minX + Math.random() * (maxX - minX);
                attempts++;
            }
        }
        const enemy = {
            x: x, y: groundY, w: ENEMY_W, h: ENEMY_H,
            hp: customHP || ENEMY_HP,
            maxHp: customHP || ENEMY_HP,
            stun: 0, type: enemyType,
            lastAttack: 0, hitFlash: 0, facing: 1,
            summoned: true,
            weaponId: customWeapon || null,
            weaponDamageBonus: 0,
            weaponRange: 0,
            aiState: 'idle',
            moveTargetX: x,
            moveTargetY: groundY,
            _meleeLastAttack: 0,
            // 状态系统（GPU 计算用）
            stateFlags: STATE_FLAGS.NONE,
            stateParams: new Float32Array(8),
            stateTimers: new Float32Array(8),
            camp: CAMP.ENEMY,
            targetEnemy: null,
            attackSpeedMult: 1.0,
            baseSpeed: ENEMY_SPD,
            charmedUntil: 0,
            frozenUntil: 0,
            slowLevel: 0,
            slowLastDecay: performance.now(),
            fireLevel: 0,
            fireLastDamage: performance.now(),
            fireLastDecay: performance.now(),
            lightningLevel: 0,
            lightningTimer: 0,
            lightningDuration: LIGHTNING_DECAY_INTERVAL,
            lightningLastDamage: performance.now(),
            lightningLastDecay: performance.now(),
            blackholeLevel: 0,
            blackholeLastDamage: performance.now(),
            weakLevel: 0,
            weakLastDecay: performance.now(),
            controlledByPet: false,
            suspended: false,
            suspendStartTime: 0,
            suspendTargetY: 0,
            suspendOriginalY: 0,
            canBeDamaged: true,
            hasPermanentSlow: false,
            _speedMult: 1,
            _moveDir: 0,
            _rawSpeed: 0,
            _lastLightningUpdate: performance.now(),
            _lastLightningDurationUpdate: performance.now(),
            // 魅惑相关
            isCharmed: false,
            charmTarget: null,
            charmLastAttack: 0
        };
        if (enemy.weaponId && WEAPONS[enemy.weaponId]) {
            const weapon = WEAPONS[enemy.weaponId];
            enemy.weaponDamageBonus = weapon.damageBonus || 0;
            if (weapon.type === 'ranged') {
                const rangeMap = { firewand: 450, compoundBow: 500, blackholeStaff: 500 };
                enemy.weaponRange = rangeMap[enemy.weaponId] || 400;
            } else {
                enemy.weaponRange = 40;
            }
        } else {
            enemy.weaponRange = 40;
        }
        enemy.color = enemyType === 'red' ? '#ff0000' : BLACK_ENEMY_COLOR;
        enemies.push(enemy);
        spawned++;
    }
    alert(`成功召唤 ${spawned} 个 ${type === 'block' ? '红色敌人' : '黑色敌人'}${targetChunk !== undefined ? ' 在区块 ' + targetChunk : ' 在玩家附近'}${customHP ? `，血量 ${customHP}` : ''}${customWeapon ? `，武器 ${customWeapon}` : ''}`);
    if (typeof checkAchievements === 'function') checkAchievements();
}

function updatePreview() {
    let pcx = player.x, pcy = player.y+player.h/2, tw = mouseScreenX+cameraX, th = mouseScreenY, dx = tw-pcx, dy = th-pcy, len = Math.hypot(dx,dy);
    if (len>0.001) { let nx=dx/len, ny=dy/len; previewBrick.worldX = pcx - nx*BRICK_BACK; previewBrick.worldY = pcy - ny*BRICK_BACK; previewBrick.angle = Math.atan2(dy,dx); previewBrick.active = true; }
    else previewBrick.active = false;
}

function toggleCharacterPanel() {
    characterPanelOpen = !characterPanelOpen;
    if (characterPanelOpen) characterSelectOption = 0;
}
// 每角色独立装备：切换角色时保存当前装备，再载入目标角色装备
function saveActiveEquipment() {
    const ch = getCurrentChar();
    ch.savedWeapon = currentWeapon ? currentWeapon.id : null;
    ch.savedEquipSlots = equipSlots.map(s => s ? { type: s.type, count: 1 } : null);
}
function loadActiveEquipment() {
    const ch = getCurrentChar();
    if (ch.savedWeapon && window.WEAPONS && WEAPONS[ch.savedWeapon]) {
        currentWeapon = { ...WEAPONS[ch.savedWeapon], id: ch.savedWeapon };
    } else {
        currentWeapon = null;
    }
    for (let i = 0; i < EQUIP_SLOTS; i++) {
        equipSlots[i] = (ch.savedEquipSlots && ch.savedEquipSlots[i]) ? { ...ch.savedEquipSlots[i] } : null;
    }
    window.hasCross = equipSlots.some(s => s && s.type === 'cross') || false;
    window.hasClownMask = equipSlots.some(s => s && s.type === 'clownMask') || false;
    window.hasPriestRobes = equipSlots.some(s => s && s.type === 'priestRobes') || false;
    window.hasIceWings = equipSlots.some(s => s && s.type === 'iceWings') || false;
    window.hasTechShield = equipSlots.some(s => s && s.type === 'techShield') || false;
    if (typeof updatePlayerMaxHp === 'function') updatePlayerMaxHp();
}
function switchCharacter(charId) {
    if (charId === currentCharacter) { characterPanelOpen = false; return; }
    saveActiveEquipment();
    currentCharacter = charId;
    loadActiveEquipment();
    characterPanelOpen = false;
    showInventoryMessage(`已切换到 ${getCurrentChar().name}`);
}
// ---------- 复合弓预测辅助函数 ----------
function getCompoundBowPrediction(startX, startY, targetX, targetY, gravity, groundY) {
    let dx = targetX - startX;
    let dy = targetY - startY;
    let len = Math.hypot(dx, dy);
    if (len < 0.001) return null;
    let speed = 8;
    let vx = (dx / len) * speed;
    let vy = (dy / len) * speed;
    let simX = startX, simY = startY;
    let simVx = vx, simVy = vy;
    const dt = 0.05;
    const maxSteps = 400;
    let landX = simX, landY = simY;
    let hitEnemy = null;
    for (let i = 0; i < maxSteps; i++) {
        simX += simVx * dt;
        simVy += gravity * dt;
        simY += simVy * dt;
        let arrowRect = { x: simX - 6, y: simY - 6, w: 12, h: 12 };
        for (let e of enemies) {
            if (e.hp <= 0) continue;
            if (rectCollide(arrowRect, e)) {
                hitEnemy = e;
                return { x: e.x + e.w/2, y: e.y + e.h/2, hitEnemy: e };
            }
        }
        if (simY >= groundY) {
            landX = simX;
            landY = groundY;
            break;
        }
        if (simX < 0 || simX > WORLD_W) break;
    }
    return { x: landX, y: landY, hitEnemy: null };
}

// ---------- 更新复合弓瞄准 ----------
function updateCompoundBowAim() {
    if (!compoundBowCharging) return;
    let startX = player.x + player.w/2;
    let startY = player.y + player.h/2;
    let mouseWorldX = mouseScreenX + cameraX;
    let mouseWorldY = mouseScreenY;
    let dx = mouseWorldX - startX;
    let dy = mouseWorldY - startY;
    let facing = player.facing;
    if (dx * facing < 0) {
        dx = -dx;
        mouseWorldX = startX + dx;
    }
    compoundBowTargetX = mouseWorldX;
    compoundBowTargetY = mouseWorldY;
    let result = getCompoundBowPrediction(startX, startY, mouseWorldX, mouseWorldY, BRICK_GRAV, WORLD_H - GROUND_Y_OFFSET);
    if (result) {
        compoundBowPreviewX = result.x;
        compoundBowPreviewY = result.y;
        compoundBowHitEnemy = result.hitEnemy;
    }
}

// ---------- 复合弓发射 ----------
function fireCompoundBow() {
    if (!currentWeapon || !currentWeapon.isCompound) return;
    let startX = player.x + player.w/2;
    let startY = player.y + player.h/2;
    let targetX = compoundBowTargetX;
    let targetY = compoundBowTargetY;
    let dx = targetX - startX;
    let dy = targetY - startY;
    let len = Math.hypot(dx, dy);
    if (len < 0.001) {
        dx = player.facing * 100;
        dy = 0;
        len = 100;
    }
    let speed = 8;
    let vx = (dx / len) * speed;
    let vy = (dy / len) * speed;
    let baseDamage = getAttackDamage() + currentWeapon.damageBonus;
    if (boss) {
        baseDamage = Math.floor(baseDamage * (currentWeapon.bossMultiplier || 1));
    }
    let arrowImg = new Image();
    arrowImg.src = '../公用文件/图片/装备/武器/弓箭.png';
    projectiles.push({
        x: startX - 6, y: startY - 6,
        vx: vx, vy: vy,
        w: 12, h: 12,
        damage: baseDamage,
        isEnemy: false,
        isArrow: true,
        img: arrowImg,
        life: 120,
        hasHit: false,
        gravity: BRICK_GRAV
    });
    player.attacking = true;
    player.attackStart = performance.now();
    compoundBowCharging = false;
    compoundBowHitEnemy = null;
}

// ========== 神父服被动效果触发函数 ==========
function triggerPriestEffects(target, damageDealt) {
    if (!window.hasPriestRobes) return;
    if (!target || target.hp <= 0) return;
    const hasMask = window.hasClownMask;
    const now = performance.now();

    // 1. 说教（全场僵直）- 攻击非Boss敌人时触发
    if (target !== boss) {
        let preachChance = hasMask ? PRIEST_PREACH_MASKED : PRIEST_PREACH_CHANCE;
        if (Math.random() < preachChance) {
            for (let e of enemies) {
                if (e.hp > 0) {
                    e.stateFlags |= STATE_FLAGS.STUNNED;
                    e.stateTimers[7] = PRIEST_PREACH_DURATION;
                    e.stun = 60; // 兼容旧系统
                }
            }
            showInventoryMessage('📖 说教！全场敌人僵直4秒');
            if (typeof damageNumbers !== 'undefined') {
                damageNumbers.push({
                    x: target.x + target.w/2,
                    y: target.y - 30,
                    damage: '📖 说教！',
                    timer: 60,
                    color: '#ffdd44'
                });
            }
        }
    }

    // 2. 弥撒（单体魅惑）- 攻击非Boss敌人时触发
    if (target !== boss) {
        let massChance = hasMask ? PRIEST_MASS_MASKED : PRIEST_MASS_CHANCE;
        if (Math.random() < massChance) {
            target.stateFlags |= STATE_FLAGS.CHARMED;
            target.stateTimers[0] = PRIEST_MASS_DURATION;
            target.camp = CAMP.ALLY;
            target.isCharmed = true;
            target.charmedUntil = now + PRIEST_MASS_DURATION;
            target.attackSpeedMult = PRIEST_CHARM_SPEED_MIN + Math.random() * (PRIEST_CHARM_SPEED_MAX - PRIEST_CHARM_SPEED_MIN);
            // 清除旧目标，让AI重新选择
            target.charmTarget = null;
            showInventoryMessage('⛪ 弥撒！敌人被魅惑10秒');
            if (typeof damageNumbers !== 'undefined') {
                damageNumbers.push({
                    x: target.x + target.w/2,
                    y: target.y - 30,
                    damage: '⛪ 魅惑！',
                    timer: 60,
                    color: '#ff66ff'
                });
            }
        }
    }

    // 3. Boss 战专属：跳过回合
    if (target === boss) {
        if (Math.random() < PRIEST_BOSS_SKIP_CHANCE) {
            boss.skipTurn = true;
            showInventoryMessage('👑 Boss 被神父震慑，跳过一回合！');
            if (typeof damageNumbers !== 'undefined') {
                damageNumbers.push({
                    x: boss.x + boss.w/2,
                    y: boss.y - 30,
                    damage: '👑 跳过！',
                    timer: 60,
                    color: '#ff8844'
                });
            }
        }
    }
}

// ========== 神父服祈祷（伤害免疫） ==========
function applyPrayerProtection(damage) {
    if (!window.hasPriestRobes) return damage;
    const hasMask = window.hasClownMask;
    let prayChance = PRIEST_PRAY_CHANCE;
    // Boss 战额外加成
    if (boss) {
        prayChance += PRIEST_PRAY_BOSS_BONUS;
    }
    if (Math.random() < prayChance) {
        showInventoryMessage('✝️ 祈祷生效！免疫伤害');
        if (typeof damageNumbers !== 'undefined') {
            damageNumbers.push({
                x: player.x + player.w/2,
                y: player.y - 20,
                damage: '✝️ 免疫',
                timer: 40,
                color: '#44ff88'
            });
        }
        return 0;
    }
    return damage;
}

// ========== 魅惑敌人AI（更新敌人时调用） ==========
function updateCharmedEnemy(enemy, now) {
    if (!enemy.isCharmed || enemy.camp !== CAMP.ALLY) {
        // 检查是否应该结束魅惑
        if (enemy.stateTimers[0] <= 0 && enemy.isCharmed) {
            enemy.isCharmed = false;
            enemy.camp = CAMP.ENEMY;
            enemy.attackSpeedMult = 1.0;
            enemy.charmTarget = null;
            enemy.stateFlags &= ~STATE_FLAGS.CHARMED;
        }
        return;
    }

    // 检查魅惑是否到期
    if (enemy.stateTimers[0] <= 0) {
        enemy.isCharmed = false;
        enemy.camp = CAMP.ENEMY;
        enemy.attackSpeedMult = 1.0;
        enemy.charmTarget = null;
        enemy.stateFlags &= ~STATE_FLAGS.CHARMED;
        return;
    }

    // 寻找目标（其他敌人）
    if (!enemy.charmTarget || enemy.charmTarget.hp <= 0) {
        let nearest = null;
        let minDist = Infinity;
        for (let e of enemies) {
            if (e === enemy || e.camp === CAMP.ALLY || e.hp <= 0) continue;
            let dx = (e.x + e.w/2) - (enemy.x + enemy.w/2);
            let dy = (e.y + e.h/2) - (enemy.y + enemy.h/2);
            let dist = Math.hypot(dx, dy);
            if (dist < minDist) {
                minDist = dist;
                nearest = e;
            }
        }
        enemy.charmTarget = nearest;
    }

    if (!enemy.charmTarget) return;

    let target = enemy.charmTarget;
    let dx = (target.x + target.w/2) - (enemy.x + enemy.w/2);
    let dy = (target.y + target.h/2) - (enemy.y + enemy.h/2);
    let dist = Math.hypot(dx, dy);

    // 检测目标是否被其他敌人保护（其他敌人不攻击魅惑单位）
    // 这个逻辑在 updateEnemies 中处理

    if (dist < 50) {
        // 攻击目标（使用冷却）
        let cooldown = enemy.type === 'black' ? BLACK_ENEMY_ATTACK_COOLDOWN : ENEMY_RANGED_ATTACK_COOLDOWN;
        cooldown *= enemy.attackSpeedMult;
        if (now - enemy.charmLastAttack > cooldown) {
            // 造成伤害
            let damage = 10 + (enemy.weaponDamageBonus || 0);
            Dot.deal(target, damage);
            target.hitFlash = 5;
            enemy.charmLastAttack = now;
            if (typeof damageNumbers !== 'undefined') {
                damageNumbers.push({
                    x: target.x + target.w/2,
                    y: target.y - 15,
                    damage: damage,
                    timer: 30,
                    color: '#ff66ff'
                });
            }
        }
    } else {
        // 向目标移动
        let speed = ENEMY_SPD * enemy.attackSpeedMult * 1.2;
        if (dx > 0) enemy.facing = 1;
        else if (dx < 0) enemy.facing = -1;
        enemy.x += (dx / dist) * speed;
        enemy.y += (dy / dist) * speed;
        enemy.x = Math.min(Math.max(0, enemy.x), WORLD_W - enemy.w);
        enemy.y = Math.min(Math.max(0, enemy.y), WORLD_H - enemy.h);
    }
}

// ---------- 鼠标事件 ----------
canvas.addEventListener('mousemove', function(e) {
    if (window.petPanelOpen || window.gachaPanelOpen) return;
    let r = canvas.getBoundingClientRect(), sx = canvas.width/r.width, sy = canvas.height/r.height;
    mouseScreenX = Math.min(Math.max(0, (e.clientX-r.left)*sx), VIEW_W);
    mouseScreenY = Math.min(Math.max(0, (e.clientY-r.top)*sy), VIEW_H);
    if (charging) updatePreview();
});

canvas.addEventListener('mousedown', function(e) {
    if (window.petPanelOpen || window.gachaPanelOpen) return;
    { let r0 = canvas.getBoundingClientRect(), s0x = canvas.width/r0.width, s0y = canvas.height/r0.height;
      mouseScreenX = Math.min(Math.max(0, (e.clientX-r0.left)*s0x), VIEW_W);
      mouseScreenY = Math.min(Math.max(0, (e.clientY-r0.top)*s0y), VIEW_H); }
    if (victory||gameOver) return;
    if (typeof invMouseDown === 'function' && invMouseDown(mouseScreenX, mouseScreenY)) { e.preventDefault(); return; }
    if (e.button===0) {
        if (currentWeapon && currentWeapon.isCompound) {
            e.preventDefault();
            if (!compoundBowCharging) {
                compoundBowCharging = true;
                compoundBowHitEnemy = null;
                updateCompoundBowAim();
            }
            return;
        }
        mouseLeftClicked = true;
        if (!player.attacking) performWeaponAttack();
    } else if (e.button===2) {
        e.preventDefault();
        mouseRightClicked = true;
        charging=true;
        updatePreview();
    }
});

canvas.addEventListener('mouseup', function(e) {
    if (window.petPanelOpen || window.gachaPanelOpen) return;
    { let r0 = canvas.getBoundingClientRect(), s0x = canvas.width/r0.width, s0y = canvas.height/r0.height;
      mouseScreenX = Math.min(Math.max(0, (e.clientX-r0.left)*s0x), VIEW_W);
      mouseScreenY = Math.min(Math.max(0, (e.clientY-r0.top)*s0y), VIEW_H); }
    if (typeof invMouseUp === 'function' && invMouseUp()) { e.preventDefault(); return; }
    if (victory||gameOver) return;
    if (e.button===0 && compoundBowCharging) {
        e.preventDefault();
        fireCompoundBow();
        return;
    }
    if (e.button===2 && charging) {
        e.preventDefault(); let now=performance.now(); if (now-lastBrick<BRICK_CD) { charging=false; return; } lastBrick=now;
        let pcx=player.x, pcy=player.y+player.h/2, tw=mouseScreenX+cameraX, th=mouseScreenY, dx=tw-pcx, dy=th-pcy, len=Math.hypot(dx,dy);
        if (len>0.001) { let nx=dx/len, ny=dy/len; projectiles.push({ x:previewBrick.worldX, y:previewBrick.worldY, vx:nx*BRICK_SPD, vy:ny*BRICK_SPD, angle:previewBrick.angle, w:BRICK_W, h:BRICK_H, damage:getBrickDamage(), isEnemy:false }); }
        charging=false;
    }
});

canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
canvas.addEventListener('mouseleave', function() {
    if (typeof invCancelDrag === 'function') invCancelDrag();
    charging=false;
    if (compoundBowCharging) {
        compoundBowCharging = false;
        compoundBowHitEnemy = null;
    }
});

// ---------- 键盘事件 ----------
window.addEventListener('keydown', function(e) {
    if (typeof window.isCommandActive === 'function' && window.isCommandActive()) return;

    // 状态面板：按住 F 显示（松开由 keyup 关闭）
    if (e.code === 'KeyF') {
        e.preventDefault();
        if (typeof showStatusPanel === 'function') showStatusPanel();
        return;
    }

    // Shift 组合键卸下装备（含神父服 Shift+4）
    if (e.shiftKey) {
        if (e.code === 'Digit1') {
            e.preventDefault();
            unequipAccessory('clownMask');
            return;
        } else if (e.code === 'Digit2') {
            e.preventDefault();
            unequipAccessory('cross');
            return;
        } else if (e.code === 'Digit3') {
            e.preventDefault();
            unequipAccessory('weapon');
            return;
        } else if (e.code === 'Digit4') {
            e.preventDefault();
            unequipAccessory('priestRobes');
            return;
        }
    }

    // 抽卡 R 键（统一面板：宠物 / 武器 标签切换）
    if (e.code === 'KeyR') {
        e.preventDefault();
        if (window.gachaPanelOpen) closeGachaPanel();
        else openGachaPanel();
        return;
    }
    if (e.code === 'KeyV') {
        e.preventDefault();
        // 科技盾牌：充能满时 V 释放护盾；未装备/未满时保持原宠物面板功能
        if (window.hasTechShield && (window.shieldCharge || 0) >= 100) {
            window.shieldActive = true;
            window.shieldActiveUntil = performance.now() + 800;
            window.shieldCharge = 0;
            if (typeof showInventoryMessage === 'function') showInventoryMessage('🛡 科技护盾激活！');
        } else if (window.hasTechShield) {
            if (typeof showInventoryMessage === 'function') showInventoryMessage('🛡 护盾充能中 ' + Math.floor(window.shieldCharge || 0) + '%');
        } else {
            if (window.petPanelOpen) closePetPanel();
            else openPetPanel();
        }
        return;
    }
    if (window.gachaPanelOpen || window.petPanelOpen) return;
    if (window.codeEditorOpen) return;
    if (victory||gameOver) return;

    // 角色/背包/商店/指令面板打开时：仅放行关闭键（P/E/H/T），其余输入暂停
    if (characterPanelOpen || window.gamePanelOpen || window.shopPanelOpen || (typeof window.isCommandActive === 'function' && window.isCommandActive())) {
        if (e.code === 'KeyT') { e.preventDefault(); if (typeof window.closeCommandUI === 'function') window.closeCommandUI(); return; }
        if (e.code === 'KeyP' || e.code === 'KeyE' || e.code === 'KeyH') {
            // 放行，由下方开关逻辑关闭面板
        } else {
            return;
        }
    }

    // 角色面板（黑屋+监狱均可打开）
    if (e.code === 'KeyP') {
        e.preventDefault();
        toggleCharacterPanel();
        return;
    }

    // 角色面板打开时：Q 使用基础经验 / R 使用中等经验（给当前激活角色）
    if (characterPanelOpen && (e.code === 'KeyQ' || e.code === 'KeyR')) {
        e.preventDefault();
        useExpItem(e.code === 'KeyQ' ? 'basic' : 'mid');
        return;
    }

    if (pKeyPressed && (e.key === '1' || e.key === '2')) {
        e.preventDefault();
        const charId = CHARACTER_KEYS[e.key];
        if (charId) {
            switchCharacter(charId);
            characterPanelOpen = false;
        }
    }
    if (e.code === 'KeyP') {
        pKeyPressed = true;
    }
    if (characterPanelOpen && (e.key === '1' || e.key === '2')) {
        e.preventDefault();
        const charId = CHARACTER_KEYS[e.key];
        if (charId) {
            switchCharacter(charId);
            characterPanelOpen = false;
        }
    }

    let c = e.code;
    if (c >= 'Digit1' && c <= 'Digit9') {
        e.preventDefault();
        if (slotIndex >= 0 && slotIndex < HOTBAR_SIZE) useItemFromSlot(slotIndex, true);
        if (slotIndex >= 0 && slotIndex < INVENTORY_SIZE) useItemFromSlot(slotIndex);
        return;
    }
    if (c === 'KeyE') {
        e.preventDefault();
        if (window.gamePanelOpen) { closeGamePanel(); if (typeof invCancelDrag === 'function') invCancelDrag(); }
        else openGamePanel();
        return;
    }
    if (c === 'KeyT') { e.preventDefault(); if (typeof window.openCommandUI === 'function') window.openCommandUI(); return; }
    if (c === 'KeyZ') { e.preventDefault(); if (!achievementOpen) { talentOpen = !talentOpen; if (talentOpen) achievementOpen = false; } return; }
    if (c === 'KeyX') { e.preventDefault(); if (!talentOpen) { achievementOpen = !achievementOpen; if (achievementOpen) talentOpen = false; } return; }
    if (talentOpen || achievementOpen) return;
    if (c==='KeyH') { e.preventDefault(); const shopOpen = shopPanel.style.display !== 'flex'; shopPanel.style.display = shopOpen ? 'flex' : 'none'; window.shopPanelOpen = shopOpen; return; }
    if (c==='KeyS') { e.preventDefault(); if (isGuestMode()) { if (typeof showInventoryMessage === 'function') showInventoryMessage('游客模式无法存档'); return; } exportSave(); return; }
    if (c==='KeyL') { e.preventDefault(); if (isGuestMode()) { if (typeof showInventoryMessage === 'function') showInventoryMessage('游客模式无法读档'); return; } triggerLoad(); return; }
    if (c==='KeyA'||c==='ArrowLeft') { left=true; e.preventDefault(); }
    else if (c==='KeyD'||c==='ArrowRight') { right=true; e.preventDefault(); }
    else if (c==='Space'||c==='ArrowUp') { jumpHeld=true; if (!jumpUsed) { let g = player.y >= getGroundY()-0.001; if (g||player.jumpsLeft>0) { player.vy=JUMP_POWER; jumpUsed=true; player.jumpsLeft = g ? 1 : player.jumpsLeft-1; } } e.preventDefault(); }
    else if (c==='ShiftLeft'||c==='ShiftRight') { shiftDown=true; e.preventDefault(); }
    else if (c==='ArrowDown') { arrowDown=true; e.preventDefault(); }
});

window.addEventListener('keyup', function(e) {
    // 状态面板：松开 F 关闭（优先处理，避免被面板开关逻辑拦截）
    if (e.code === 'KeyF') {
        e.preventDefault();
        if (typeof hideStatusPanel === 'function') hideStatusPanel();
        return;
    }
    if (typeof window.isCommandActive === 'function' && window.isCommandActive()) return;
    if (window.gachaPanelOpen || window.petPanelOpen) return;
    if (window.codeEditorOpen) return;
    if (talentOpen || achievementOpen) return;
    if (characterPanelOpen || window.gamePanelOpen || window.shopPanelOpen) return;
    if (e.code === 'KeyP') {
        pKeyPressed = false;
    }
    let c = e.code;
    if (c==='KeyA'||c==='ArrowLeft') { left=false; e.preventDefault(); }
    else if (c==='KeyD'||c==='ArrowRight') { right=false; e.preventDefault(); }
    else if (c==='Space'||c==='ArrowUp') { jumpUsed=false; window.gliding=false; jumpHeld=false; e.preventDefault(); }
    else if (c==='ShiftLeft'||c==='ShiftRight') { shiftDown=false; e.preventDefault(); }
    else if (c==='ArrowDown') { arrowDown=false; e.preventDefault(); }
});

function onBlur() {
    left=right=shiftDown=arrowDown=jumpUsed=jumpHeld=charging=false;
    window.gliding = false;
    shopPanel.style.display='none';
    window.shopPanelOpen = false;
    confirmModal.style.display='none';
    talentOpen = false;
    achievementOpen = false;
    mouseLeftClicked = false;
    mouseRightClicked = false;
    if (typeof window.isCommandActive === 'function' && window.isCommandActive()) window.closeCommandUI();
    compoundBowCharging = false;
    compoundBowHitEnemy = null;
    player.lockMovement = false;
}
window.addEventListener('blur', onBlur);
document.addEventListener('visibilitychange', () => { if (document.hidden) onBlur(); });

function updateCollision() {
    let allEntities = [player, ...enemies.filter(e => !e.inMergeGroup)];
    if (boss) allEntities.push(boss);
    const ITER = 12;
    for (let iter = 0; iter < ITER; iter++) {
        for (let i = 0; i < allEntities.length; i++) {
            for (let j = i+1; j < allEntities.length; j++) {
                let a = allEntities[i], b = allEntities[j];
                let overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
                let overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
                if (overlapX > 0 && overlapY > 0) {
                    let dx = overlapX / 2;
                    if (a.x < b.x) { a.x -= dx; b.x += dx; } else { a.x += dx; b.x -= dx; }
                }
            }
        }
        for (let e of allEntities) e.x = Math.min(Math.max(0, e.x), WORLD_W - e.w);
    }
}

// ---------- 玩家移动 ----------
function updatePlayerMovement() {
    if (player.lockMovement) return;

    if (left && !right) player.facing = -1;
    else if (right && !left) player.facing = 1;
    let baseSpeed = 2.8;
    let speed = baseSpeed * (talentSpeedMult || 1);
    if (window.hasClownMask) {
        speed *= CLOWN_MASK_MULTIPLIER;
    }
    let dx = 0;
    if (left) dx -= speed;
    if (right) dx += speed;
    player.x = Math.min(Math.max(0, player.x + dx), WORLD_W - player.w);
    // ===== 近战突进：逐帧插值推进到目标点，到达即止，不穿墙不穿怪 =====
    if (player.dashRemaining > 0) {
        let step = Math.min(player.dashRemaining, 5);
        let nx = player.x + player.dashDir * step;
        if (player.dashDir > 0) nx = Math.min(nx, player.dashTargetX);
        else nx = Math.max(nx, player.dashTargetX);
        nx = Math.min(Math.max(0, nx), WORLD_W - player.w);
        let blocked = false;
        for (let e of enemies) {
            if (e.hp <= 0) continue;
            if (rectCollide({x: nx, y: player.y, w: player.w, h: player.h}, e)) { blocked = true; break; }
        }
        if (!blocked && boss && rectCollide({x: nx, y: player.y, w: player.w, h: player.h}, boss)) blocked = true;
        if (!blocked) player.x = nx;
        player.dashRemaining -= step;
        if (player.dashRemaining < 0) player.dashRemaining = 0;
        if (blocked) player.dashRemaining = 0;
    }
    player.vy += GRAVITY;
    // 冰霜之翼滑翔：装备且按住跳跃键、处于下落状态时缓降 + 水平微调 + 拖尾
    if (window.hasIceWings && jumpHeld && player.vy > 0 && player.y < getGroundY() - 0.001) {
        window.gliding = true;
        player.vy = player.vy * 0.3;
        if (Math.random() < 0.6) {
            if (!window.iceTrail) window.iceTrail = [];
            window.iceTrail.push({x: player.x + player.w/2 + (Math.random()*8-4), y: player.y + player.h, vy: 0.4 + Math.random()*0.5, life: 1});
        }
    } else {
        window.gliding = false;
    }
    player.y += player.vy;
    let grounded = false;
    if (player.y > getGroundY()) { player.y = getGroundY(); player.vy = 0; grounded = true; }
    if (player.y < 0) { player.y = 0; player.vy = 0; }
    if (grounded || player.y >= getGroundY()-0.001) {
        jumpUsed = false;
        player.jumpsLeft = talentTripleJump ? 3 : 2;
    }
    let duck = shiftDown || arrowDown;
    let targetH = (grounded && duck) ? DUCK_H : STAND_H;
    if (targetH !== player.h) {
        let oldBottom = player.y + player.h;
        player.h = targetH;
        if (grounded) player.y = getGroundY();
        else player.y = oldBottom - player.h;
    }
}

// ---------- 攻击函数（含跳跃限制） ----------
function performWeaponAttack() {
    let groundY = getGroundY();
    let isGrounded = player.y >= groundY - 0.5;
    if (!isGrounded) {
        if (!currentWeapon || currentWeapon.type === 'melee') {
            showInventoryMessage('跳跃中无法使用近战攻击');
            return;
        }
    }
    let hitTarget = null;
    let dealtDamage = 0;

    if (currentWeapon && currentWeapon.attack && !currentWeapon.isCompound) {
        // 这里需要捕获攻击目标用于神父服效果
        // 由于各个武器的攻击函数不同，我们通过修改攻击函数来记录目标
        // 或者直接在武器攻击后调用 triggerPriestEffects
        currentWeapon.attack();
        // 获取最后一个被攻击的敌人（简化处理）
        for (let e of enemies) {
            if (e.hitFlash > 0) {
                hitTarget = e;
                break;
            }
        }
        if (hitTarget) {
            dealtDamage = getAttackDamage() + (currentWeapon.damageBonus || 0);
            triggerPriestEffects(hitTarget, dealtDamage);
            triggerIceWingsFreeze(hitTarget);
        }
    } else if (currentWeapon && currentWeapon.isCompound) {
        showInventoryMessage('左键蓄力发射复合弓箭矢');
    } else {
        // ===== 预备动作：攻击前短暂蓄力前摇（windup） =====
        const _wNow = performance.now();
        if (!player._windup) {
            player._windup = { start: _wNow, dur: WINDUP_MS, facing: player.facing };
            player.attacking = true;
            player.attackStart = _wNow;
            playSfx('windup', 0.16);
            return;
        }
        // 前摇推进由 updateMeleeWindup 处理，到期后执行 performMeleeSwing
        return;
    }
}

// ---------- 近战打击感：时间缩放 / 残影 / 突进 / 震动 / 冲击波 / 音效 / 前摇 ----------
// 统一节奏系数：新增特效时长统一乘以该系数（0.65 更利落，0.45 更绵长，二选一）
const EFFECT_RHYTHM = 0.65;
window._gameTimeScale = 1.0;
window._gameTimeScaleTimer = 0;
window._slashTrailTimer = 0;
window._slashTrailX = 0;
window._slashTrailY = 0;
window._slashOpacity = 0;
window._hitStopTimer = 0;
window._hitFlashTimer = 0;
// 镜头震动（Screen Shake）：命中时画面整体震动衰减
window._shakeAmt = 0;
// 冲击波（命中点扩散圆环）
window._shockwaves = [];
// 预备动作前摇时长（ms）
const WINDUP_MS = 90;

// ---------- Web Audio 程序化打击音效（无素材文件，纯合成） ----------
let _sfxCtx = null, _sfxNoise = null;
function _getSfxCtx() {
    if (!_sfxCtx) {
        try { _sfxCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { _sfxCtx = null; }
    }
    if (_sfxCtx && _sfxCtx.state === 'suspended') { try { _sfxCtx.resume(); } catch (e) {} }
    return _sfxCtx;
}
function _noiseBuffer() {
    const ctx = _getSfxCtx();
    if (!ctx) return null;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    return buf;
}
function playSfx(kind, volume) {
    const ctx = _getSfxCtx();
    if (!ctx) return;
    if (!_sfxNoise) _sfxNoise = _noiseBuffer();
    const t0 = ctx.currentTime;
    const v = volume || 0.45;
    const master = ctx.createGain();
    master.gain.setValueAtTime(v, t0);
    master.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
    master.connect(ctx.destination);
    if (kind === 'hit') {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, t0);
        osc.frequency.exponentialRampToValueAtTime(80, t0 + 0.09);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.6, t0);
        og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
        osc.connect(og); og.connect(master);
        osc.start(t0); osc.stop(t0 + 0.12);
        if (_sfxNoise) {
            const src = ctx.createBufferSource(); src.buffer = _sfxNoise;
            const ng = ctx.createGain();
            ng.gain.setValueAtTime(0.8, t0);
            ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
            src.connect(ng); ng.connect(master);
            src.start(t0); src.stop(t0 + 0.1);
        }
    } else if (kind === 'crit') {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, t0);
        osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.16);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.7, t0);
        og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
        osc.connect(og); og.connect(master);
        osc.start(t0); osc.stop(t0 + 0.2);
        if (_sfxNoise) {
            const src = ctx.createBufferSource(); src.buffer = _sfxNoise;
            const ng = ctx.createGain();
            ng.gain.setValueAtTime(1.0, t0);
            ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
            src.connect(ng); ng.connect(master);
            src.start(t0); src.stop(t0 + 0.16);
        }
    } else if (kind === 'whiff') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, t0);
        osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.07);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.18, t0);
        og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
        osc.connect(og); og.connect(master);
        osc.start(t0); osc.stop(t0 + 0.09);
    } else if (kind === 'windup') {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, t0);
        osc.frequency.linearRampToValueAtTime(220, t0 + 0.08);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.12, t0);
        og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
        osc.connect(og); og.connect(master);
        osc.start(t0); osc.stop(t0 + 0.1);
    }
}

// ---------- 受击反馈：形变 / 抖动 / 击退（boss 与普通敌人不同处理） ----------
function applyHitFeel(e, damage, dir) {
    if (!e) return;
    e.squash = 0.3 * EFFECT_RHYTHM;
    e.squashPhase = 0;
    e.wobble = 4.5 * EFFECT_RHYTHM;
    e.wobblePhase = 0;
    const isBoss = (typeof boss !== 'undefined' && e === boss);
    e.knockback = isBoss ? 4 * EFFECT_RHYTHM : 12 * EFFECT_RHYTHM;
    e.knockbackDir = isBoss ? dir * 0.35 : dir;
}

// ---------- 近战出刀判定（前摇结束后执行，含全部打击感触发） ----------
function performMeleeSwing(facing, now) {
    if (!player) return;
    facing = facing || player.facing;
    let attackDamage = getAttackDamage();
    let rect = {
        x: facing === 1 ? player.x + player.w : player.x - ATK_RANGE,
        y: player.y,
        w: ATK_RANGE,
        h: player.h
    };
    let hitCount = 0;
    let hitTarget = null;
    for (let e of enemies) {
        if (rectCollide(rect, e)) {
            Dot.deal(e, attackDamage);
            e.stun = STUN_DUR;
            e.hitFlash = 5;
            hitTarget = e;
            dealtDamage = attackDamage;
            triggerPriestEffects(e, attackDamage);
            triggerIceWingsFreeze(e);
            hitCount++;
            spawnHitParticles(e, attackDamage);
            applyHitFeel(e, attackDamage, facing);
        }
    }
    if (boss && rectCollide(rect, boss)) {
        Dot.deal(boss, attackDamage);
        hitTarget = boss;
        dealtDamage = attackDamage;
        triggerPriestEffects(boss, attackDamage);
        triggerIceWingsFreeze(boss);
        hitCount++;
        spawnHitParticles(boss, attackDamage);
        applyHitFeel(boss, attackDamage, facing);
    }
    if (hitCount > 0) {
        // 命中时间膨胀：更慢的时间缩放 + 命中停顿 + 全屏白闪
        window._gameTimeScale = 0.15;
        window._gameTimeScaleTimer = 0;
        window._hitStopTimer = 130;
        window._hitFlashTimer = now;
        // 挥砍残影
        window._slashTrailX = facing === 1 ? player.x + player.w + 20 : player.x - 20;
        window._slashTrailY = player.y + player.h / 2;
        window._slashTrailTimer = now;
        // 镜头震动（Screen Shake）
        window._shakeAmt = 7 * EFFECT_RHYTHM;
        // 冲击波（命中点扩散圆环）
        const hx = hitTarget ? hitTarget.x + hitTarget.w / 2 : player.x + player.w / 2;
        const hy = hitTarget ? hitTarget.y + hitTarget.h / 2 : player.y + player.h / 2;
        window._shockwaves.push({ x: hx, y: hy, r: 6, maxR: 36 * EFFECT_RHYTHM, life: 1 });
        // 命中音效（高伤害更暴击化）
        playSfx(attackDamage >= 25 ? 'crit' : 'hit', attackDamage >= 25 ? 0.6 : 0.45);
    } else {
        // 未命中：挥空音效 + 寻找前向 20~100px 的最近敌人，平滑突进到目标点，到达后自动触发一次近战攻击
        playSfx('whiff', 0.16);
        let dashTarget = null;
        let dashDist = Infinity;
        for (let e of enemies) {
            if (e.hp <= 0) continue;
            const d = facing === 1 ? e.x - (player.x + player.w) : player.x - (e.x + e.w);
            if (d >= 20 && d <= 150 && d < dashDist) { dashTarget = e; dashDist = d; }
        }
        if (!dashTarget && boss && boss.hp > 0) {
            const d = facing === 1 ? boss.x - (player.x + player.w) : player.x - (boss.x + boss.w);
            if (d >= 20 && d <= 150 && d < dashDist) { dashTarget = boss; dashDist = d; }
        }
        if (dashTarget) {
            let targetX = facing === 1 ? dashTarget.x - player.w - 6 : dashTarget.x + dashTarget.w + 6;
            targetX = Math.min(Math.max(0, targetX), WORLD_W - player.w);
            player.dashDir = facing;
            player.dashTargetX = targetX;
            player.dashRemaining = Math.abs(targetX - player.x);
            player.dashPendingAttack = true;
        }
    }
    player.attacking = true;
    player.attackStart = now;
}

// ---------- 预备动作前摇推进（windup 到期后出刀） ----------
function updateMeleeWindup(now) {
    if (!player._windup) return;
    if (now - player._windup.start >= player._windup.dur) {
        const f = player._windup.facing;
        player._windup = null;
        performMeleeSwing(f, now);
    }
}

// ---------- 近战粒子系统 ----------
const HIT_PARTICLES = [];
const MAX_HIT_PARTICLES = 150;

function spawnHitParticles(enemy, damage) {
    if (HIT_PARTICLES.length >= MAX_HIT_PARTICLES) return;

    // 敌人朝向：facing=1 朝右，facing=-1 朝左；未知时默认朝右
    let facing = enemy.facing;
    if (facing === undefined || facing === null || facing === 0) {
        facing = 1;
    }

    // 命中点 = 敌人中心
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;
    const speedMult = 0.5 + (damage / 20) * 0.5;
    const num = Math.min(3 + Math.floor(damage / 5), 10);
    const halfAngle = Math.PI * 0.35;

    // 基准方向 = 敌人朝向的反方向（facing=1 -> 朝左 π；facing=-1 -> 朝右 0）
    const baseAngle = (1 + facing) * Math.PI * 0.5;
    for (let i = 0; i < num; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * halfAngle;
        const spd = (1.5 + Math.random() * 2.0) * speedMult;
        HIT_PARTICLES.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 0.3,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.025,
            size: 1.5 + Math.random() * 2.0
        });
    }
}

function updateParticles() {
    for (let i = HIT_PARTICLES.length - 1; i >= 0; i--) {
        const p = HIT_PARTICLES[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy += 0.06;
        p.life -= p.decay;
        if (p.life <= 0) {
            HIT_PARTICLES.splice(i, 1);
        }
    }
}

// 从 BOSS 战返回（含浏览器前进/后退的 bfcache 恢复）时解除跳转锁；
// 否则 __bossJumping 会一直为 true，第二次遭遇 BOSS 就不再跳转。
window.addEventListener('pageshow', function () { window.__bossJumping = false; });

// ---------- 主更新循环 ----------
function update(now) {
    if (window.gachaPanelOpen || window.petPanelOpen) return;
    if (window.codeEditorOpen) return;
    if (victory || gameOver) return;
    if (talentOpen || achievementOpen) {
        if (typeof updateInventory === 'function') updateInventory();
        return;
    }

    // 角色/背包/商店/指令面板打开时暂停游戏逻辑（仅推进背包消息倒计时）
    if (characterPanelOpen || window.gamePanelOpen || window.shopPanelOpen || (typeof window.isCommandActive === 'function' && window.isCommandActive())) {
        if (typeof updateInventory === 'function') updateInventory();
        return;
    }
    if (boss) {
        const dist = Math.abs((player.x + player.w/2) - (boss.x + boss.w/2));
        if (dist <= 120 && !window.__bossJumping) {
            // 遭遇 BOSS 一律进入 BOSS 战。
            // 旧逻辑读 ws_boss_cleared 记录（打过一次就永久不再触发），是早期遗留；
            // 这里直接移除该判定，避免"碰到 BOSS 毫无反应"。
            window.__bossJumping = true;
            try {
                if (typeof exportSaveToLocalStorage === 'function') exportSaveToLocalStorage();
            } catch (err) {
                console.warn('[BOSS] 跳转前保存失败，仍继续跳转', err);
            }
            // 存档已落盘，跳过 beforeunload 的"请先按 S 保存"拦截，避免来回弹窗
            window.hasManualSave = true;
            const guestParam = (typeof isGuestMode === 'function' && isGuestMode()) ? '&guest=1' : '';
            window.location.href = '../公用文件/boss-battle/index.html?scene=prison&lv=' + level + guestParam;
            return;
        }
    }
    // 时间缩放衰减
    window._gameTimeScaleTimer += 16.67 * (window._gameTimeScale || 1);
    if (window._gameTimeScale < 1.0 && window._gameTimeScaleTimer >= 350) {
        window._gameTimeScale = 1.0;
        window._gameTimeScaleTimer = 0;
    }

    // 挥砍残影衰减（绘制迁移到 draw 覆盖层，避免被场景重绘覆盖）
    window._slashOpacity = 0;
    if (window._slashTrailTimer > 0) {
        let elapsed = now - window._slashTrailTimer;
        if (elapsed < 220) window._slashOpacity = 1 - elapsed / 220;
        else { window._slashTrailTimer = 0; window._slashOpacity = 0; }
    }

    // 镜头震动衰减（Screen Shake）
    if (window._shakeAmt > 0.2) window._shakeAmt *= 0.86;
    else window._shakeAmt = 0;
    // 冲击波推进（命中点扩散圆环）
    for (let i = window._shockwaves.length - 1; i >= 0; i--) {
        const sw = window._shockwaves[i];
        sw.r += (sw.maxR - sw.r) * 0.22;
        sw.life -= 0.055;
        if (sw.life <= 0) window._shockwaves.splice(i, 1);
    }

    for (let sp of savePoints) if (player.x + player.w > sp.x && player.x < sp.x + sp.width) { doSave(now); break; }
    updatePlayerMovement();
    // ===== 预备动作前摇推进 =====
    updateMeleeWindup(now);
    if (player._windup) {
        // 蓄力表现：向攻击反方向小幅后拉
        const wp = Math.min(1, (now - player._windup.start) / player._windup.dur);
        player.visualOffX = -player.facing * player.w * 0.22 * (1 - wp);
    } else {
        updateAttackAnimation(now);
    }
    // ===== 突进到达后自动攻击：无需再次按键 =====
    if (player.dashPendingAttack && player.dashRemaining <= 0) {
        player.dashPendingAttack = false;
        performMeleeSwing(player.facing, now);
    }
    // 科技盾牌：自然充能 25%/秒（约 4 秒充满）+ 护盾激活计时
    if (window.hasTechShield) {
        window.shieldCharge = Math.min(100, (window.shieldCharge || 0) + 25 * ((now - (window._lastUpdateTime || now)) / 1000));
        if (window.shieldActive && now >= (window.shieldActiveUntil || 0)) window.shieldActive = false;
    }
    updateEnemies(now);
    updateBlackEnemyBullets();
    updateProjectiles();
    updateBoss(now);
    updateCollision();

    // 魅惑敌人AI更新
    for (let e of enemies) {
        if (e.isCharmed || (e.stateFlags & STATE_FLAGS.CHARMED)) {
            updateCharmedEnemy(e, now);
        }
    }

    if (compoundBowCharging) {
        updateCompoundBowAim();
    }

    // 十字架保护（原有逻辑）
    if (playerHP <= 0 && window.hasCross && window.crossProtectionAvailable) {
        const healAmount = Math.floor(currentMaxHp * 0.1);
        playerHP = Math.max(1, healAmount);
        window.crossProtectionAvailable = false;
        window.crossCooldownTimer = CROSS_SAVE_COOLDOWN;
        showInventoryMessage('✝️ 十字架抵消了致命伤害！回复10%生命');
        window._crossTriggeredThisFrame = true;
    } else {
        window._crossTriggeredThisFrame = false;
    }
    if (playerHP <= 0) {
        if (!respawn()) gameOver = true;
    }

    // 十字架回血
    if (window.hasCross) {
        window.crossHealTimer = (window.crossHealTimer || 0) + (now - (window._lastUpdateTime || now));
        if (window.crossHealTimer >= CROSS_HEAL_INTERVAL) {
            window.crossHealTimer = 0;
            if (playerHP < currentMaxHp && playerHP > 0) {
                playerHP = Math.min(currentMaxHp, playerHP + CROSS_HEAL_AMOUNT);
                if (typeof damageNumbers !== 'undefined' && damageNumbers !== null) {
                    damageNumbers.push({
                        x: player.x + player.w/2,
                        y: player.y - 10,
                        damage: '+2 HP',
                        timer: 30,
                        color: '#44ff88'
                    });
                }
            }
        }
        if (!window.crossProtectionAvailable) {
            window.crossCooldownTimer = (window.crossCooldownTimer || 0) - (now - (window._lastUpdateTime || now));
            if (window.crossCooldownTimer <= 0) {
                window.crossProtectionAvailable = true;
                window.crossCooldownTimer = 0;
                showInventoryMessage('✝️ 十字架保护已就绪');
            }
        }
    } else {
        window.crossHealTimer = 0;
        window.crossProtectionAvailable = true;
        window.crossCooldownTimer = 0;
    }

    // 小丑面具扣血
    if (window.hasClownMask) {
        window.clownMaskDamageTimer = (window.clownMaskDamageTimer || 0) + (now - (window._lastUpdateTime || now));
        if (window.clownMaskDamageTimer >= CLOWN_MASK_HP_DRAIN_INTERVAL) {
            window.clownMaskDamageTimer = 0;
            if (playerHP > 1) {
                playerHP -= CLOWN_MASK_HP_DRAIN_AMOUNT;
                addShieldCharge(20);
                if (typeof damageNumbers !== 'undefined' && damageNumbers !== null) {
                    damageNumbers.push({
                        x: player.x + player.w/2,
                        y: player.y - 10,
                        damage: '-1 HP',
                        timer: 30,
                        color: '#ff6666'
                    });
                }
            }
        }
    } else {
        window.clownMaskDamageTimer = 0;
    }

    // 受击延迟结算：DoT 逐帧扣血（1 秒内扣完全部伤害）
    if (window.Dot) Dot.update((now - (window._lastUpdateTime || now)) / 1000);

    window._lastUpdateTime = now;

    updateCam();
    if (typeof updateAllPets === 'function') updateAllPets(now);
}


// ---------- 覆盖 draw ----------
const originalDraw = draw;
draw = function() {
    // ===== 镜头震动（Screen Shake）：命中时画面整体震动衰减 =====
    if (window._shakeAmt > 0.2) {
        const _shx = (Math.random() - 0.5) * 2 * window._shakeAmt;
        const _shy = (Math.random() - 0.5) * 2 * window._shakeAmt;
        ctx.save();
        ctx.translate(_shx, _shy);
    }
    originalDraw();
    if (window._shakeAmt > 0.2) ctx.restore();
    // ===== 挥砍刀光（绘制在场景之上，避免被场景重绘覆盖） =====
    if (window._slashOpacity > 0 && player.attacking && (!currentWeapon || currentWeapon.type === 'melee')) {
        const sx = window._slashTrailX, sy = window._slashTrailY;
        ctx.save();
        ctx.globalAlpha = window._slashOpacity * 0.8;
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur = 20;
        const facing = player.facing;
        ctx.beginPath();
        ctx.moveTo(sx - 20, sy - 25);
        ctx.lineTo(sx + 40 * facing, sy - 5);
        ctx.lineTo(sx + 45 * facing, sy + 15);
        ctx.lineTo(sx - 15, sy + 25);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = window._slashOpacity * 0.4;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#aaddff';
        ctx.beginPath();
        ctx.moveTo(sx - 10, sy - 10);
        ctx.lineTo(sx + 50 * facing, sy);
        ctx.stroke();
        ctx.restore();
    }
    // ===== 命中闪光（全屏白闪，随命中停顿一起衰减） =====
    if (window._hitFlashTimer > 0) {
        const flashElapsed = performance.now() - window._hitFlashTimer;
        if (flashElapsed < 120) {
            const flashAlpha = 0.35 * (1 - flashElapsed / 120);
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,' + flashAlpha.toFixed(3) + ')';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
            ctx.restore();
        } else {
            window._hitFlashTimer = 0;
        }
    }
    // ===== 冲击波（命中点扩散圆环） =====
    for (let i = window._shockwaves.length - 1; i >= 0; i--) {
        const sw = window._shockwaves[i];
        const swx = sw.x - cameraX;
        if (swx < -80 || swx > VIEW_W + 80) continue;
        const swAlpha = Math.max(0, sw.life);
        ctx.save();
        ctx.globalAlpha = swAlpha * 0.85;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5 * swAlpha + 1;
        ctx.beginPath();
        ctx.arc(swx, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = swAlpha * 0.2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(swx, sw.y, sw.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    if (compoundBowCharging && currentWeapon && currentWeapon.isCompound) {
        let sx = compoundBowPreviewX - cameraX;
        let sy = compoundBowPreviewY;
        if (sx > -20 && sx < VIEW_W + 20 && sy > -20 && sy < VIEW_H + 20) {
            ctx.save();
            if (compoundBowHitEnemy) {
                ctx.strokeStyle = '#ff4444';
                ctx.fillStyle = 'rgba(255, 68, 68, 0.5)';
            } else {
                ctx.strokeStyle = '#ffaa44';
                ctx.fillStyle = 'rgba(255, 170, 68, 0.3)';
            }
            ctx.setLineDash([]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx - 12, sy);
            ctx.lineTo(sx + 12, sy);
            ctx.moveTo(sx, sy - 12);
            ctx.lineTo(sx, sy + 12);
            ctx.stroke();
            ctx.restore();
        }
    }
};

function loop(t) {
    update(t);
    draw();
    requestAnimationFrame(loop);
}

(function() {
    window.hasManualSave = window.hasManualSave || false;

    window.addEventListener('beforeunload', function(e) {
        if (window.hasManualSave) return;
        if (typeof player === 'undefined' || !player) return;
        e.preventDefault();
        e.returnValue = 'IMA提醒：请按 S 键保存游戏存档后再关闭页面。';
    });
})();
