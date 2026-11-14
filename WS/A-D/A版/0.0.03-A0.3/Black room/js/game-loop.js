// ---------- 主游戏循环及事件 ----------
let commandInputActive = false;
let commandOverlay = null;
let commandInput = null;
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
let blSkillActive = false;
let blSkillStartX = 0, blSkillStartY = 0;
let blSkillEndX = 0, blSkillEndY = 0;
let blSkillStartTime = 0;
let pKeyPressed = false;

// ---------- 复合弓蓄力状态 ----------
let compoundBowCharging = false;
let compoundBowPreviewX = 0;
let compoundBowPreviewY = 0;
let compoundBowHitEnemy = null;
let compoundBowStartX = 0;
let compoundBowStartY = 0;
let compoundBowTargetX = 0;
let compoundBowTargetY = 0;

// ---------- 命令UI ----------
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
        } else if (item === 'compoundbow' || item === 'cb') {
            addItem('compoundBow', 1);
            alert('获得复合弓 x1');
        } else if (item === 'blackholestaff' || item === 'bh') {
            addItem('blackholeStaff', 1);
            alert('获得黑洞权杖 x1');
        } else if (item === 'techspear' || item === 'ts') {
            addItem('techSpear', 1);
            alert('获得科技长矛 x1');
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
            alert('未知物品，可用: sword, bow, fb, fs, compoundbow/cb, blackholestaff/bh, techspear/ts, monkey, 0.618, horror, en, cross, cm, sd, th');
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
                    alert(`未知武器: ${trimmed}，可用: sword, bow, fb, fs, sd, th, cb, bh, ts`);
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
                const rangeMap = { bow: 500, firewand: 450, compoundBow: 500, blackholeStaff: 500 };
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
    showInventoryMessage('❌ 角色模块仅在监狱可用');
}
function switchCharacter(charId) {
    showInventoryMessage('❌ 角色模块仅在监狱可用');
}
function activateBlSkill(now) {}
function confirmBlSkill(now) {}
function activateBlFreeze() {}

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
    arrowImg.src = '素材/装备/武器/弓箭.png';
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
    if (window.petPanelOpen || window.gachaPanelOpen || window.weaponGachaPanelOpen) return;
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
    charging=false;
    if (blSkillActive) {
        blSkillActive = false;
        showInventoryMessage('❌ 取消冰锥选择');
    }
    if (compoundBowCharging) {
        compoundBowCharging = false;
        compoundBowHitEnemy = null;
    }
});

// ---------- 键盘事件 ----------
window.addEventListener('keydown', function(e) {
    if (commandInputActive) return;

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
        }
    }

    if (e.code === 'KeyR') {
        e.preventDefault();
        if (window.weaponGachaPanelOpen) {
            if (typeof window.closeWeaponGachaPanel === 'function') window.closeWeaponGachaPanel();
        } else {
            if (typeof window.openWeaponGachaPanel === 'function') window.openWeaponGachaPanel();
        }
        return;
    }

    if (e.code === 'KeyE') {
        e.preventDefault();
        if (window.gachaPanelOpen) closeGachaPanel();
        else openGachaPanel();
        return;
    }
    if (e.code === 'KeyV') {
        e.preventDefault();
        if (window.petPanelOpen) closePetPanel();
        else openPetPanel();
        return;
    }
    if (window.gachaPanelOpen || window.petPanelOpen || window.weaponGachaPanelOpen) return;
    if (window.codeEditorOpen) return;
    if (victory||gameOver) return;

    if (e.code === 'KeyP') {
        e.preventDefault();
        if (window.location.pathname.includes('prison')) {
            toggleCharacterPanel();
        } else {
            showInventoryMessage('❌ 角色模块仅在监狱可用');
        }
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
    else if (c==='KeyC') { e.preventDefault(); let now=performance.now(); if (now-lastPierce>=PIERCE_CD && !pierceCharge && !pierceProjectile) { pierceCharge=true; pierceStart=now; } }
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
    compoundBowCharging = false;
    compoundBowHitEnemy = null;
    player.lockMovement = false;
}
window.addEventListener('blur', onBlur);
document.addEventListener('visibilitychange', () => { if (document.hidden) onBlur(); });

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
    player.vy += GRAVITY;
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
    // 检查是否在地面
    let groundY = getGroundY();
    let isGrounded = player.y >= groundY - 0.5; // 容差
    if (!isGrounded) {
        // 如果没有武器或武器类型为近战，则禁止攻击
        if (!currentWeapon || currentWeapon.type === 'melee') {
            showInventoryMessage('跳跃中无法使用近战攻击');
            return;
        }
    }
    // 原有攻击逻辑
    if (currentWeapon && currentWeapon.attack && !currentWeapon.isCompound) {
        currentWeapon.attack();
    } else if (currentWeapon && currentWeapon.isCompound) {
        showInventoryMessage('左键蓄力发射复合弓箭矢');
    } else {
        let attackDamage = getAttackDamage();
        let rect = {
            x: player.facing === 1 ? player.x + player.w : player.x - ATK_RANGE,
            y: player.y,
            w: ATK_RANGE,
            h: player.h
        };
        for (let e of enemies) {
            if (rectCollide(rect, e)) {
                e.hp -= attackDamage;
                e.stun = STUN_DUR;
                e.hitFlash = 5;
            }
        }
        if (boss && rectCollide(rect, boss)) boss.hp -= attackDamage;
        player.attacking = true;
        player.attackStart = performance.now();
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
    updateBlackEnemyBullets();
    updateProjectiles();
    updatePierce(now);
    updateBoss(now);
    updateCollision();

    if (compoundBowCharging) {
        updateCompoundBowAim();
    }

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

    if (window.blSkillCooldown > 0) {
        window.blSkillCooldown -= (now - (window._lastUpdateTime || now));
        if (window.blSkillCooldown < 0) window.blSkillCooldown = 0;
    }

    window._lastUpdateTime = now;

    updateCam();
    if (panelVisible) updatePanelUI();
    if (typeof updateAllPets === 'function') updateAllPets(now);
}

function drawCharacterPanel() {}

// ---------- 覆盖 draw ----------
const originalDraw = draw;
draw = function() {
    originalDraw();
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