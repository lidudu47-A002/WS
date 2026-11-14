// ---------- 主游戏循环及事件 ----------
let commandInputActive = false;
let commandOverlay = null;
let commandInput = null;
let mouseLeftClicked = false;
let mouseRightClicked = false;

// 垂直镜头偏移（固定为 0，因为游戏为横向卷轴）
let cameraY = 0;

// 自然生成开关（由 ST summon 控制）
window.stopNaturalSpawn = false;

// ---------- 角色系统变量 ----------
let characterPanelOpen = false;
let characterSelectOption = 0; // 0=Ava, 1=Bl
const CHARACTER_KEYS = { '1': 'ava', '2': 'bl' };

// Bl 技能相关
let blSkillActive = false;
let blSkillStartX = 0, blSkillStartY = 0;
let blSkillEndX = 0, blSkillEndY = 0;
let blSkillStartTime = 0;

// ---------- 组合键 P+数字 ----------
let pKeyPressed = false;

function createCommandUI() {
    if (commandOverlay) return;
    commandOverlay = document.createElement('div');
    commandOverlay.style.position = 'fixed';
    commandOverlay.style.top = '0';
    commandOverlay.style.left = '0';
    commandOverlay.style.width = '100%';
    commandOverlay.style.height = '100%';
    commandOverlay.style.background = 'rgba(0,0,0,0.7)';
    commandOverlay.style.zIndex = '1000';
    commandOverlay.style.display = 'flex';
    commandOverlay.style.justifyContent = 'center';
    commandOverlay.style.alignItems = 'center';

    const inputWrapper = document.createElement('div');
    inputWrapper.style.width = '80%';
    inputWrapper.style.maxWidth = '600px';
    inputWrapper.style.background = '#000';
    inputWrapper.style.border = '2px solid #fff';
    inputWrapper.style.borderRadius = '8px';
    inputWrapper.style.padding = '16px';
    inputWrapper.style.display = 'flex';
    inputWrapper.style.alignItems = 'center';

    const prefix = document.createElement('span');
    prefix.textContent = '/';
    prefix.style.color = '#fff';
    prefix.style.fontSize = '20px';
    prefix.style.marginRight = '8px';
    prefix.style.fontFamily = 'monospace';

    commandInput = document.createElement('input');
    commandInput.type = 'text';
    commandInput.style.flex = '1';
    commandInput.style.background = '#000';
    commandInput.style.border = 'none';
    commandInput.style.outline = 'none';
    commandInput.style.color = '#fff';
    commandInput.style.fontSize = '20px';
    commandInput.style.fontFamily = 'monospace';
    commandInput.style.padding = '4px';
    commandInput.placeholder = 'ST summon  或  bm 14  或  tune LV = 3  或  summon 5 block ~~~HP=150~bow  或  kill  或  give ...';

    inputWrapper.appendChild(prefix);
    inputWrapper.appendChild(commandInput);
    commandOverlay.appendChild(inputWrapper);
    document.body.appendChild(commandOverlay);

    commandOverlay.addEventListener('click', (e) => {
        if (e.target === commandOverlay) closeCommandUI();
    });
    commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = commandInput.value.trim();
            executeCommand(cmd);
            closeCommandUI();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeCommandUI();
        }
    });
}

function closeCommandUI() {
    if (commandOverlay) {
        document.body.removeChild(commandOverlay);
        commandOverlay = null;
        commandInput = null;
        commandInputActive = false;
        canvas.focus();
    }
}

// ---------- 执行命令 ----------
function executeCommand(cmd) {
    if (cmd.toLowerCase() === 'st summon') {
        window.stopNaturalSpawn = !window.stopNaturalSpawn;
        alert(window.stopNaturalSpawn ? '✅ 已停止敌人自然生成' : '✅ 已恢复敌人自然生成');
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
        if (panelVisible) updatePanelUI();
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
        } else if (item === 'bow') {
            addItem('bow', 1);
            alert('获得弓 x1');
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
            alert('未知物品，可用: sword, bow, fb, fs, monkey, 0.618, horror, en, cross, cm, sd, th');
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
        if (panelVisible) updatePanelUI();
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
            'bow': 'bow',
            'fb': 'frostBlade',
            'fs': 'firewand',
            'sd': 'shadowDagger',
            'th': 'thunderHammer'
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
                    alert(`未知武器: ${trimmed}，可用: sword, bow, fb, fs, sd, th`);
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
        if (panelVisible) updatePanelUI();
        alert(`已设置等级为 ${level}，经验值已重置。`);
        return;
    }

    alert('指令格式错误！\n可用指令：\nST summon（切换自然生成）\n/bm 区块号\n/tune LV = 等级\n/summon 数量 生物名 [区块号] [~~~HP=数字~武器名]\n/kill\n/give ...');
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
            lastAttack: 0, hitFlash: 0,
            summoned: true,
            weaponId: customWeapon || null,
            weaponDamageBonus: 0,
            weaponRange: 0,
            aiState: 'idle',
            moveTargetX: x,
            moveTargetY: groundY,
            _meleeLastAttack: 0,
            fireLevel: 0,
            fireLastDamage: performance.now(),
            fireLastDecay: performance.now(),
            slowLevel: 0,
            slowLastDecay: performance.now(),
            frozenUntil: 0,
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
            _lastLightningDurationUpdate: performance.now()
        };
        if (enemy.weaponId && WEAPONS[enemy.weaponId]) {
            const weapon = WEAPONS[enemy.weaponId];
            enemy.weaponDamageBonus = weapon.damageBonus || 0;
            if (weapon.type === 'ranged') {
                const rangeMap = { bow: 500, firewand: 450 };
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

// ---------- 角色系统函数 ----------
function toggleCharacterPanel() {
    if (window.characterUnlocked !== true) {
        showInventoryMessage('❌ 角色模块未解锁，请先击败黑屋BOSS');
        return;
    }
    characterPanelOpen = !characterPanelOpen;
    if (characterPanelOpen) {
        characterSelectOption = window.currentCharacter === 'bl' ? 1 : 0;
    }
}

function switchCharacter(charId) {
    if (charId === 'bl' && !window.characterUnlocked) {
        showInventoryMessage('❌ Bl 未解锁');
        return;
    }
    if (window.currentCharacter !== charId) {
        window.currentCharacter = charId;
        showInventoryMessage(`✅ 切换到 ${CHARACTERS[charId].name}`);
        if (panelVisible) updatePanelUI();
    }
}

function activateBlSkill(now) {
    if (window.currentCharacter !== 'bl') {
        showInventoryMessage('❌ 当前角色不是 Bl');
        return;
    }
    if (window.blSkillCooldown > 0) {
        showInventoryMessage(`⏳ 技能冷却中 (${Math.ceil(window.blSkillCooldown/1000)}s)`);
        return;
    }
    blSkillActive = true;
    blSkillStartX = mouseScreenX + cameraX;
    blSkillStartY = mouseScreenY + cameraY;
    blSkillEndX = blSkillStartX + BL_SKILL_SIZE;
    blSkillEndY = blSkillStartY + BL_SKILL_SIZE;
    blSkillStartTime = now;
    showInventoryMessage('🔽 选择冰锥区域（移动鼠标调整位置，再次右键确认）');
}

function confirmBlSkill(now) {
    if (!blSkillActive) return;
    blSkillActive = false;
    const centerX = (blSkillStartX + blSkillEndX) / 2;
    const centerY = (blSkillStartY + blSkillEndY) / 2;
    const halfSize = BL_SKILL_SIZE / 2;
    const minX = centerX - halfSize;
    const maxX = centerX + halfSize;
    const minY = centerY - halfSize;
    const maxY = centerY + halfSize;

    let hitCount = 0;
    for (let e of enemies) {
        const ex = e.x + e.w/2, ey = e.y + e.h/2;
        if (ex >= minX && ex <= maxX && ey >= minY && ey <= maxY) {
            const damage = BL_SKILL_DAMAGE_BASE + (level - 1) * BL_SKILL_DAMAGE_PER_LEVEL;
            e.hp -= damage;
            e.hitFlash = 5;
            e.slowLevel = Math.max(e.slowLevel || 0, 3);
            e.slowLastDecay = performance.now();
            hitCount++;
            if (typeof damageNumbers !== 'undefined') {
                damageNumbers.push({
                    x: ex, y: e.y - 10,
                    damage: `-${damage}`,
                    timer: 30,
                    color: '#44aaff'
                });
            }
        }
    }
    if (hitCount > 0) {
        showInventoryMessage(`❄️ 冰锥击中 ${hitCount} 个敌人！`);
        if (typeof damageNumbers !== 'undefined') {
            damageNumbers.push({
                x: centerX, y: centerY - 20,
                damage: '❄️ 冰锥！',
                timer: 60,
                color: '#88ddff'
            });
        }
    } else {
        showInventoryMessage('❄️ 冰锥未击中任何敌人');
    }
    window.blSkillCooldown = BL_SKILL_COOLDOWN;
}

function activateBlFreeze() {
    if (window.currentCharacter !== 'bl') {
        showInventoryMessage('❌ 当前角色不是 Bl');
        return;
    }
    if (window.blSkillCooldown > 0) {
        showInventoryMessage(`⏳ 技能冷却中 (${Math.ceil(window.blSkillCooldown/1000)}s)`);
        return;
    }
    let frozenCount = 0;
    const now = performance.now();
    for (let e of enemies) {
        e.frozenUntil = now + BL_FREEZE_DURATION;
        e.hitFlash = 5;
        frozenCount++;
    }
    showInventoryMessage(`❄️ 全场冰冻！${frozenCount} 个敌人被冻结5秒`);
    window.blSkillCooldown = BL_SKILL_COOLDOWN;
}

// ---------- 鼠标事件 ----------
canvas.addEventListener('mousemove', function(e) {
    if (window.petPanelOpen || window.gachaPanelOpen || window.weaponGachaPanelOpen) return;
    let r = canvas.getBoundingClientRect(), sx = canvas.width/r.width, sy = canvas.height/r.height;
    mouseScreenX = Math.min(Math.max(0, (e.clientX-r.left)*sx), VIEW_W);
    mouseScreenY = Math.min(Math.max(0, (e.clientY-r.top)*sy), VIEW_H);
    if (charging) updatePreview();
    if (blSkillActive) {
        blSkillEndX = mouseScreenX + cameraX;
        blSkillEndY = mouseScreenY + cameraY;
    }
});

canvas.addEventListener('mousedown', function(e) {
    if (window.petPanelOpen || window.gachaPanelOpen || window.weaponGachaPanelOpen) return;
    if (victory||gameOver) return;
    if (e.button===0) {
        mouseLeftClicked = true;
        if (!player.attacking) performWeaponAttack();
    } else if (e.button===2) {
        e.preventDefault();
        mouseRightClicked = true;
        if (window.currentCharacter === 'bl' && window.characterUnlocked) {
            if (!blSkillActive) {
                const now = performance.now();
                activateBlSkill(now);
            } else {
                const now = performance.now();
                confirmBlSkill(now);
            }
        } else {
            charging=true;
            updatePreview();
        }
    }
});

canvas.addEventListener('mouseup', function(e) {
    if (window.petPanelOpen || window.gachaPanelOpen || window.weaponGachaPanelOpen) return;
    if (victory||gameOver) return;
    if (e.button===2 && charging) {
        if (window.currentCharacter !== 'bl') {
            e.preventDefault(); let now=performance.now(); if (now-lastBrick<BRICK_CD) { charging=false; return; } lastBrick=now;
            let pcx=player.x, pcy=player.y+player.h/2, tw=mouseScreenX+cameraX, th=mouseScreenY, dx=tw-pcx, dy=th-pcy, len=Math.hypot(dx,dy);
            if (len>0.001) { let nx=dx/len, ny=dy/len; projectiles.push({ x:previewBrick.worldX, y:previewBrick.worldY, vx:nx*BRICK_SPD, vy:ny*BRICK_SPD, angle:previewBrick.angle, w:BRICK_W, h:BRICK_H, damage:getBrickDamage(), isEnemy:false }); }
            charging=false;
        }
    }
});

canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
canvas.addEventListener('mouseleave', function() {
    charging=false;
    if (blSkillActive) {
        blSkillActive = false;
        showInventoryMessage('❌ 取消冰锥选择');
    }
});

// ---------- 键盘事件 ----------
window.addEventListener('keydown', function(e) {
    if (commandInputActive) return;

    // 武器卡池 R 键
    if (e.code === 'KeyR') {
        e.preventDefault();
        if (window.weaponGachaPanelOpen) {
            if (typeof window.closeWeaponGachaPanel === 'function') window.closeWeaponGachaPanel();
        } else {
            if (typeof window.openWeaponGachaPanel === 'function') window.openWeaponGachaPanel();
        }
        return;
    }

    // 角色面板快捷键
    if (e.code === 'KeyP') {
        e.preventDefault();
        if (window.location.pathname.includes('prison')) {
            toggleCharacterPanel();
        } else {
            showInventoryMessage('❌ 角色模块仅在监狱可用');
        }
        return;
    }

    // 组合键 P+1 / P+2
    if (pKeyPressed && (e.key === '1' || e.key === '2')) {
        e.preventDefault();
        const charId = CHARACTER_KEYS[e.key];
        if (charId) {
            switchCharacter(charId);
            characterPanelOpen = false;
        }
    }

    // P 键按住状态
    if (e.code === 'KeyP') {
        pKeyPressed = true;
    }

    // 如果角色面板打开，数字键直接切换
    if (characterPanelOpen && (e.key === '1' || e.key === '2')) {
        e.preventDefault();
        const charId = CHARACTER_KEYS[e.key];
        if (charId) {
            switchCharacter(charId);
            characterPanelOpen = false;
        }
    }

    // 其他按键
    if (window.gachaPanelOpen || window.petPanelOpen || window.weaponGachaPanelOpen || window.codeEditorOpen || victory || gameOver) {
        if (e.code === 'KeyC' && window.currentCharacter === 'bl') {
            // C键全屏冰冻（即使在面板打开时也有效）
        } else {
            return;
        }
    }
    if (talentOpen || achievementOpen) {
        if (e.code === 'KeyC' && window.currentCharacter === 'bl') {
            // 允许在天赋/成就界面使用C键？
        } else {
            return;
        }
    }

    let c = e.code;

    // Bl 全屏冰冻（按 C）
    if (c === 'KeyC' && window.currentCharacter === 'bl' && window.characterUnlocked) {
        e.preventDefault();
        activateBlFreeze();
        return;
    }

    // 数字键快捷物品
    if (c >= 'Digit1' && c <= 'Digit9') {
        e.preventDefault();
        const slotIndex = parseInt(c.slice(-1)) - 1;
        if (slotIndex >= 0 && slotIndex < INVENTORY_SIZE) useItemFromSlot(slotIndex);
        return;
    }

    if (c === 'KeyT') { e.preventDefault(); commandInputActive = true; createCommandUI(); if (commandInput) commandInput.focus(); return; }
    if (c === 'KeyZ') { e.preventDefault(); if (!achievementOpen) { talentOpen = !talentOpen; if (talentOpen) achievementOpen = false; } return; }
    if (c === 'KeyX') { e.preventDefault(); if (!talentOpen) { achievementOpen = !achievementOpen; if (achievementOpen) talentOpen = false; } return; }
    if (talentOpen || achievementOpen) return;
    if (c==='KeyF') { e.preventDefault(); if (!panelVisible) { panelVisible=true; statusPanel.style.display='block'; updatePanelUI(); } return; }
    if (c==='KeyH') { e.preventDefault(); shopPanel.style.display = shopPanel.style.display==='flex' ? 'none' : 'flex'; return; }
    if (c==='KeyS') { e.preventDefault(); exportSave(); return; }
    if (c==='KeyL') { e.preventDefault(); triggerLoad(); return; }
    if (c==='KeyA'||c==='ArrowLeft') { left=true; e.preventDefault(); }
    else if (c==='KeyD'||c==='ArrowRight') { right=true; e.preventDefault(); }
    else if (c==='Space'||c==='ArrowUp') { if (!jumpUsed) { let g = player.y >= getGroundY()-0.001; if (g||player.jumpsLeft>0) { player.vy=JUMP_POWER; jumpUsed=true; player.jumpsLeft = g ? 1 : player.jumpsLeft-1; } } e.preventDefault(); }
    else if (c==='ShiftLeft'||c==='ShiftRight') { shiftDown=true; e.preventDefault(); }
    else if (c==='ArrowDown') { arrowDown=true; e.preventDefault(); }
    else if (c==='KeyC') { // C键已被Bl技能使用，但如果当前不是Bl，执行穿透技能
        if (window.currentCharacter !== 'bl') {
            e.preventDefault(); let now=performance.now(); if (now-lastPierce>=PIERCE_CD && !pierceCharge && !pierceProjectile) { pierceCharge=true; pierceStart=now; }
        } else {
            // Bl 的 C 键已在上面处理，这里不会执行
        }
    }
});

window.addEventListener('keyup', function(e) {
    if (commandInputActive) return;
    if (window.gachaPanelOpen || window.petPanelOpen || window.weaponGachaPanelOpen) return;
    if (window.codeEditorOpen) return;
    if (talentOpen || achievementOpen) return;
    if (e.code === 'KeyP') {
        pKeyPressed = false;
    }
    let c = e.code;
    if (c==='KeyF') { e.preventDefault(); if (panelVisible) { panelVisible=false; statusPanel.style.display='none'; } return; }
    if (c==='KeyA'||c==='ArrowLeft') { left=false; e.preventDefault(); }
    else if (c==='KeyD'||c==='ArrowRight') { right=false; e.preventDefault(); }
    else if (c==='Space'||c==='ArrowUp') { jumpUsed=false; e.preventDefault(); }
    else if (c==='ShiftLeft'||c==='ShiftRight') { shiftDown=false; e.preventDefault(); }
    else if (c==='ArrowDown') { arrowDown=false; e.preventDefault(); }
    else if (c==='KeyC') { if (pierceCharge) pierceCharge=false; e.preventDefault(); }
});

function onBlur() {
    left=right=shiftDown=arrowDown=jumpUsed=charging=false;
    if (panelVisible) { panelVisible=false; statusPanel.style.display='none'; }
    shopPanel.style.display='none';
    confirmModal.style.display='none';
    talentOpen = false;
    achievementOpen = false;
    mouseLeftClicked = false;
    mouseRightClicked = false;
    if (commandOverlay) closeCommandUI();
    if (blSkillActive) {
        blSkillActive = false;
    }
}
window.addEventListener('blur', onBlur);
document.addEventListener('visibilitychange', () => { if (document.hidden) onBlur(); });

// ---------- 碰撞更新 ----------
function updateCollision() {
    let allEntities = [player, ...enemies];
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

// ---------- 主更新循环 ----------
function update(now) {
    if (window.gachaPanelOpen || window.petPanelOpen || window.weaponGachaPanelOpen) return;
    if (window.codeEditorOpen) return;
    if (victory || gameOver) return;
    if (talentOpen || achievementOpen) {
        if (typeof updateInventory === 'function') updateInventory();
        return;
    }
    if (boss) {
        const dist = Math.abs((player.x + player.w/2) - (boss.x + boss.w/2));
        if (dist <= 120) {
            if (typeof exportSaveToLocalStorage === 'function') {
                exportSaveToLocalStorage();
            }
            window.location.href = 'boss-battle/index.html?lv=' + level;
            return;
        }
    }
    for (let sp of savePoints) if (player.x + player.w > sp.x && player.x < sp.x + sp.width) { doSave(now); break; }
    updatePlayerMovement();
    updateAttackAnimation(now);
    updateEnemies(now);
    // ----- 黑色敌人子弹更新（CD 已在 constants.js 中改为 5000ms） -----
    updateBlackEnemyBullets();
    // -----------------------------------------------------------------
    updateProjectiles();
    updatePierce(now);
    updateBoss(now);
    updateCollision();

    // 十字架保护
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

    // Bl 技能冷却
    if (window.blSkillCooldown > 0) {
        window.blSkillCooldown -= (now - (window._lastUpdateTime || now));
        if (window.blSkillCooldown < 0) window.blSkillCooldown = 0;
    }

    window._lastUpdateTime = now;

    updateCam();
    if (panelVisible) updatePanelUI();
    if (typeof updateAllPets === 'function') updateAllPets(now);
}

// ---------- 绘制角色面板 ----------
function drawCharacterPanel() {
    if (!characterPanelOpen) return;
    const W = VIEW_W, H = VIEW_H;
    const panelW = 250, panelH = 150;
    const px = (W - panelW) / 2, py = (H - panelH) / 2;
    ctx.fillStyle = 'rgba(20,20,30,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'gold';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 16);
    ctx.stroke();

    ctx.fillStyle = '#ffd966';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('选择角色', W/2, py + 35);

    const items = ['Ava', 'Bl'];
    for (let i = 0; i < items.length; i++) {
        const y = py + 65 + i * 38;
        const isSelected = (i === characterSelectOption);
        const isActive = (window.currentCharacter === (i === 0 ? 'ava' : 'bl'));
        ctx.fillStyle = isSelected ? '#ffaa00' : (isActive ? '#44ff44' : '#666');
        ctx.fillRect(px + 20, y - 14, panelW - 40, 30);
        ctx.strokeStyle = isSelected ? 'gold' : '#888';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(px + 20, y - 14, panelW - 40, 30);
        ctx.fillStyle = '#fff';
        ctx.font = '18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText((i === 0 ? '🟦 ' : '🟦 ') + items[i], px + 35, y + 6);
        if (isActive && !isSelected) {
            ctx.fillStyle = '#44ff44';
            ctx.font = '12px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('(当前)', px + panelW - 25, y + 6);
        }
        if (i === 1 && !window.characterUnlocked) {
            ctx.fillStyle = '#ff4444';
            ctx.font = '12px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('(未解锁)', px + panelW - 25, y + 6);
        }
    }
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('按 1/2 切换  按 P 关闭', W/2, py + panelH - 15);
    ctx.textAlign = 'start';
}

// ---------- 覆盖 draw ----------
const originalDraw = draw;
draw = function() {
    originalDraw();
    // 绘制角色面板（在游戏之上）
    drawCharacterPanel();
    // 绘制 Bl 冰锥选择区域
    if (blSkillActive) {
        const sx = blSkillStartX - cameraX, sy = blSkillStartY - cameraY;
        const ex = blSkillEndX - cameraX, ey = blSkillEndY - cameraY;
        ctx.save();
        ctx.strokeStyle = '#44aaff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(sx, sy, ex - sx, ey - sy);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(68, 170, 255, 0.15)';
        ctx.fillRect(sx, sy, ex - sx, ey - sy);
        ctx.restore();
        // 绘制冰锥图标中心
        const cx = (sx + ex) / 2, cy = (sy + ey) / 2;
        ctx.save();
        ctx.font = '32px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#88ddff';
        ctx.shadowColor = 'cyan';
        ctx.shadowBlur = 15;
        ctx.fillText('❄️', cx, cy);
        ctx.restore();
    }
};

// ---------- 主循环 ----------
function loop(t) {
    update(t);
    draw();
    requestAnimationFrame(loop);
}

// ========== 页面关闭提醒 ==========
(function() {
    window.hasManualSave = window.hasManualSave || false;

    window.addEventListener('beforeunload', function(e) {
        if (window.hasManualSave) return;
        if (typeof player === 'undefined' || !player) return;
        e.preventDefault();
        e.returnValue = 'IMA提醒：请按 S 键保存游戏存档后再关闭页面。';
    });
})();