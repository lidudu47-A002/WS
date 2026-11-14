// ---------- Minecraft 风格物品栏系统 ----------
// 背包 3x9 (27格) + 快捷栏 9格 + 装备栏 4格 (挂饰×2, 面具×1, 外衣×1)
// 武器只需手持，不占装备槽

const INVENTORY_SIZE = 27;
const HOTBAR_SIZE = 9;
const EQUIP_SLOTS = 4; // 0=挂饰, 1=挂饰, 2=面具, 3=外衣

let inventorySlots = new Array(INVENTORY_SIZE).fill(null);
let hotbarSlots = new Array(HOTBAR_SIZE).fill(null);
let equipSlots = new Array(EQUIP_SLOTS).fill(null);

// 物品定义（保持原有，补充新物品）
const ITEMS = {
    hp: { name: '❤️ HP药水', icon: '../公用文件/图片/商店/HP药水.png', maxStack: 64 },
    normalAtk: { name: '⚔️ 普攻药水', icon: '../公用文件/图片/商店/normal attack药水.png', maxStack: 64 },
    skill: { name: '✨ 技能药水', icon: '../公用文件/图片/商店/skill药水.png', maxStack: 64 },
    // ---------- 武器 ----------
    sword: { name: '铁剑', icon: '../公用文件/图片/装备/武器/铁剑.png', maxStack: 1 },
    frostBlade: { name: 'F·B 冰霜之刃', icon: '../公用文件/图片/装备/武器/冰霜之刃.png', maxStack: 1 },
    firewand: { name: '火焰法杖', icon: '../公用文件/图片/装备/武器/火焰法杖.png', maxStack: 1 },
    shadowDagger: { name: '🗡️ 暗影匕首', icon: '../公用文件/图片/装备/武器/暗影匕首.png', maxStack: 1 },
    thunderHammer: { name: '⚡ 雷霆锤', icon: '../公用文件/图片/装备/武器/雷霆锤.png', maxStack: 1 },
    compoundBow: { name: '复合弓', icon: '../公用文件/图片/装备/武器/复合弓.png', maxStack: 1 },
    blackholeStaff: { name: '🕳️ 黑洞权杖', icon: '../公用文件/图片/装备/武器/黑洞权杖.png', maxStack: 1 },
    techSpear: { name: '⚡ 科技长矛', icon: '../公用文件/图片/装备/武器/科技长矛.png', maxStack: 1 },
    // ---------- 装备配件 ----------
    priestRobes: { name: '✝️ 神父服', icon: '../公用文件/图片/装备/增益/苏褡.png', maxStack: 1, slotType: 'robe' },
    cross: { name: '✝️ 十字架', icon: '../公用文件/图片/装备/增益/十字架.png', maxStack: 1, slotType: 'accessory' },
    clownMask: { name: '🤡 小丑面具', icon: '../公用文件/图片/装备/其他/小丑面具.png', maxStack: 1, slotType: 'mask' },
    iceWings: { name: '❄️ 冰霜之翼', icon: '../公用文件/图片/装备/其他/冰霜之翼.png', maxStack: 1, slotType: 'accessory' },
    techShield: { name: '🛡 科技盾牌', icon: '../公用文件/图片/装备/盾牌/科技盾牌.png', maxStack: 1, slotType: 'shield' },
    // ---------- 宠物 ----------
    monkey: { name: 'Monkey', icon: '../公用文件/图片/宠物/宠物样式/monkey.png', maxStack: 1 },
    point618: { name: '0.618', icon: '../公用文件/图片/宠物/宠物样式/0.618.png', maxStack: 1 },
    horror: { name: 'Horror', icon: '../公用文件/图片/宠物/宠物样式/horror.png', maxStack: 1 },
    xiaoe: { name: '小e', icon: '../公用文件/图片/宠物/宠物样式/小e.png', maxStack: 1 },
    // ---------- 抽卡材料 ----------
    geometry: { name: '几何图', icon: '../公用文件/图片/宠物/升级物/几何图.png', maxStack: 99 },
    banana: { name: '香蕉', icon: '../公用文件/图片/宠物/升级物/香蕉.png', maxStack: 99 },
    eyeball: { name: '眼球', icon: '../公用文件/图片/宠物/升级物/眼球.png', maxStack: 99 }
};

// 药水使用（效果按当前激活角色生效，记录为角色级增益字段；切换角色互不影响）
ITEMS.hp.use = function () {
    playerHP = Math.min(playerHP + HP_POTION_HEAL, currentMaxHp);
    showInventoryMessage('❤️ HP 药水生效：当前角色回复 ' + HP_POTION_HEAL + ' 点生命');
    return true;
};
ITEMS.normalAtk.use = function () {
    const ch = getCurrentChar();
    ch.potionAtkMult = Math.min(5, (ch.potionAtkMult || 1) * 1.5);
    showInventoryMessage('⚔️ 普攻药水生效：当前角色普攻倍率 x' + ch.potionAtkMult.toFixed(1));
    return true;
};
ITEMS.skill.use = function () {
    const ch = getCurrentChar();
    ch.potionSkillMult = Math.min(5, (ch.potionSkillMult || 1) * 1.5);
    showInventoryMessage('✨ 技能药水生效：当前角色技能倍率 x' + ch.potionSkillMult.toFixed(1));
    return true;
};

// 物品总格数 36
function getTotalSlots() { return INVENTORY_SIZE + HOTBAR_SIZE; }

// ---------- 添加物品 ----------
function addItem(type, amount = 1) {
    if (!ITEMS[type]) return false;
    const maxStack = ITEMS[type].maxStack;
    let remaining = amount;

    // 优先放入背包 27 格
    for (let i = 0; i < INVENTORY_SIZE && remaining > 0; i++) {
        const slot = inventorySlots[i];
        if (slot && slot.type === type && slot.count < maxStack) {
            const canAdd = Math.min(maxStack - slot.count, remaining);
            slot.count += canAdd;
            remaining -= canAdd;
        }
    }
    for (let i = 0; i < INVENTORY_SIZE && remaining > 0; i++) {
        if (inventorySlots[i] === null) {
            const add = Math.min(maxStack, remaining);
            inventorySlots[i] = { type: type, count: add };
            remaining -= add;
        }
    }

    // 再放入快捷栏 9 格
    for (let i = 0; i < HOTBAR_SIZE && remaining > 0; i++) {
        const slot = hotbarSlots[i];
        if (slot && slot.type === type && slot.count < maxStack) {
            const canAdd = Math.min(maxStack - slot.count, remaining);
            slot.count += canAdd;
            remaining -= canAdd;
        }
    }
    for (let i = 0; i < HOTBAR_SIZE && remaining > 0; i++) {
        if (hotbarSlots[i] === null) {
            const add = Math.min(maxStack, remaining);
            hotbarSlots[i] = { type: type, count: add };
            remaining -= add;
        }
    }

    if (remaining > 0) {
        showInventoryMessage(`物品栏已满，丢失 ${remaining} 个 ${ITEMS[type].name}`);
        return false;
    }
    return true;
}

// ---------- 使用物品 ----------
function useItemFromSlot(slotIndex, isHotbar) {
    const slots = isHotbar ? hotbarSlots : inventorySlots;
    const slot = slots[slotIndex];
    if (!slot) return false;

    const item = ITEMS[slot.type];
    if (!item) return false;

    if (item.maxStack === 1) {
        // 单件物品（武器、配件、宠物等）
        let oldWeaponId = currentWeapon ? currentWeapon.id : null;
        let oldWeaponSource = lastWeaponSource ? { ...lastWeaponSource } : null;

        if (item.use()) {
            slots[slotIndex] = null;
            // 卸掉旧武器放回物品栏
            if (oldWeaponId && oldWeaponId !== slot.type) {
                const oldSlots = oldWeaponSource && oldWeaponSource.isHotbar ? hotbarSlots : inventorySlots;
                if (oldSlots) {
                    let found = false;
                    for (let i = 0; i < oldSlots.length; i++) {
                        if (oldSlots[i] && oldSlots[i].type === oldWeaponId) { found = true; break; }
                    }
                    if (!found) {
                        // 找不到就直接放入背包
                        for (let i = 0; i < INVENTORY_SIZE; i++) {
                            if (inventorySlots[i] === null) {
                                inventorySlots[i] = { type: oldWeaponId, count: 1 };
                                break;
                            }
                        }
                    }
                }
            }
            return true;
        }
        return false;
    } else {
        if (item.use()) {
            slot.count--;
            if (slot.count <= 0) slots[slotIndex] = null;
            return true;
        }
        return false;
    }
}

// ---------- 装备/卸装备 ----------

function getEquipSlotIndex(slotType) {
    switch (slotType) {
        case 'accessory': return 0; // 第一个挂饰格
        case 'robe': return 3; // 外衣
        case 'mask': return 2; // 面具
        case 'shield': return 4; // 盾牌
    }
    return 1; // accessory 也可能放第二个挂饰格
}

function equipAccessory(type) {
    if (!ITEMS[type]) return false;
    const item = ITEMS[type];
    if (!item.slotType) return false;

    const slotIndex = getEquipSlotIndex(item.slotType);
    const oldEquip = equipSlots[slotIndex];

    // 先在 inventory + hotbar 中找到该物品
    let found = false;
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        if (inventorySlots[i] && inventorySlots[i].type === type) {
            equipSlots[slotIndex] = { type: type, count: 1, source: 'inventory', index: i };
            inventorySlots[i] = null;
            found = true;
            break;
        }
    }
    if (!found) {
        for (let i = 0; i < HOTBAR_SIZE; i++) {
            if (hotbarSlots[i] && hotbarSlots[i].type === type) {
                equipSlots[slotIndex] = { type: type, count: 1, source: 'hotbar', index: i };
                hotbarSlots[i] = null;
                found = true;
                break;
            }
        }
    }
    if (!found) {
        showInventoryMessage(`未找到 ${item.name}`);
        return false;
    }

    // 卸掉旧装备
    if (oldEquip) {
        putBack(oldEquip.type);
    }

    // 处理特殊装备效果
    if (type === 'clownMask') { window.hasClownMask = true; updatePlayerMaxHp(); }
    if (type === 'cross') { window.hasCross = true; updatePlayerMaxHp(); }
    if (type === 'priestRobes') { window.hasPriestRobes = true; }
    if (type === 'iceWings') { window.hasIceWings = true; }
    if (type === 'techShield') { window.hasTechShield = true; }

    showInventoryMessage(`已装备 ${item.name}`);
    return true;
}

function unequipAccessory(type) {
    const item = ITEMS[type];
    if (!item || !item.slotType) return false;

    const slotIndex = getEquipSlotIndex(item.slotType);
    const equip = equipSlots[slotIndex];
    if (!equip || equip.type !== type) {
        showInventoryMessage(`未装备 ${item.name}`);
        return false;
    }

    // 移除特殊装备效果
    if (type === 'clownMask') { window.hasClownMask = false; updatePlayerMaxHp(); }
    if (type === 'cross') { window.hasCross = false; updatePlayerMaxHp(); }
    if (type === 'priestRobes') { window.hasPriestRobes = false; }
    if (type === 'iceWings') { window.hasIceWings = false; }
    if (type === 'techShield') { window.hasTechShield = false; if (window.shieldActive) { window.shieldActive = false; } }

    putBack(type);
    equipSlots[slotIndex] = null;
    showInventoryMessage(`已卸下 ${item.name}`);
    return true;
}

function putBack(type) {
    if (!addItem(type, 1)) {
        showInventoryMessage(`物品栏已满，无法卸下 ${ITEMS[type].name}`);
    }
}

// 武器：从 inventory/hotbar 取，装备到 currentWeapon（不占装备槽）
function equipWeaponFromSlot(slotIndex, isHotbar) {
    const slots = isHotbar ? hotbarSlots : inventorySlots;
    const slot = slots[slotIndex];
    if (!slot || !ITEMS[slot.type]) return false;

    // 卸当前武器
    if (currentWeapon) {
        let oldWeapon = currentWeapon.id;
        unequipWeapon();
        // 尝试放回去
        putBack(oldWeapon);
    }

    // 装备新武器
    currentWeapon = ITEMS[slot.type];
    lastWeaponSource = { isHotbar: isHotbar, index: slotIndex };
    slots[slotIndex] = null;
    showInventoryMessage(`已装备 ${currentWeapon.name}`);
    return true;
}

function unequipWeapon() {
    if (!currentWeapon) { showInventoryMessage('未装备武器'); return false; }
    putBack(currentWeapon.id);
    currentWeapon = null;
    lastWeaponSource = null;
    showInventoryMessage(`已卸下 ${ITEMS[currentWeapon?.id].name || '武器'}`);
    return true;
}

// ---------- 背包面板开关 ----------
window.gamePanelOpen = false;
function openGamePanel() { window.gamePanelOpen = true; }
function closeGamePanel() { window.gamePanelOpen = false; }

// ---------- 鼠标拖拽系统 ----------
let dragState = null; // { item:{type,count}, fromZone, fromIndex }

function getInvLayout() {
    const cellW = 50, cellH = 50, equipCellW = 40, equipCellH = 40;
    const equipStartX = (VIEW_W - EQUIP_SLOTS * equipCellW) / 2;
    const equipStartY = 10;
    const weaponRect = { x: equipStartX + EQUIP_SLOTS * equipCellW + 10, y: equipStartY, w: equipCellW, h: equipCellH };
    const backStartX = (VIEW_W - INVENTORY_SIZE / 3 * cellW) / 2;
    const backStartY = equipStartY + equipCellH + 10;
    const hotStartX = (VIEW_W - HOTBAR_SIZE * cellW) / 2;
    const hotStartY = VIEW_H - cellH - 20;
    return { cellW: cellW, cellH: cellH, equipCellW: equipCellW, equipCellH: equipCellH,
             equipStartX: equipStartX, equipStartY: equipStartY, weaponRect: weaponRect,
             backStartX: backStartX, backStartY: backStartY, hotStartX: hotStartX, hotStartY: hotStartY };
}

function equipSlotNeed(index) {
    if (index === 2) return 'mask';
    if (index === 3) return 'robe';
    if (index === 4) return 'shield';
    return 'accessory';
}

function isWeaponType(type) {
    return typeof WEAPONS !== 'undefined' && !!WEAPONS[type];
}

function peekSlotItem(zone, index) {
    if (zone === 'back') return inventorySlots[index] || null;
    if (zone === 'hot') return hotbarSlots[index] || null;
    if (zone === 'equip') return equipSlots[index] || null;
    if (zone === 'weapon') return currentWeapon ? { type: currentWeapon.id, count: 1 } : null;
    return null;
}

function takeSlotItem(zone, index) {
    const it = peekSlotItem(zone, index);
    if (!it) return null;
    if (zone === 'back') inventorySlots[index] = null;
    else if (zone === 'hot') hotbarSlots[index] = null;
    else if (zone === 'equip') equipSlots[index] = null;
    else if (zone === 'weapon') { currentWeapon = null; if (typeof lastWeaponSource !== 'undefined') lastWeaponSource = null; }
    return { type: it.type, count: it.count };
}

function hitTestInv(sx, sy) {
    const L = getInvLayout();
    if (sy >= L.hotStartY && sy <= L.hotStartY + L.cellH && sx >= L.hotStartX) {
        const col = Math.floor((sx - L.hotStartX) / L.cellW);
        if (col >= 0 && col < HOTBAR_SIZE) return { zone: 'hot', index: col };
    }
    if (!window.gamePanelOpen) return null;
    if (sy >= L.equipStartY && sy <= L.equipStartY + L.equipCellH && sx >= L.equipStartX) {
        const i = Math.floor((sx - L.equipStartX) / L.equipCellW);
        if (i >= 0 && i < EQUIP_SLOTS) return { zone: 'equip', index: i };
    }
    const w = L.weaponRect;
    if (sx >= w.x && sx <= w.x + w.w && sy >= w.y && sy <= w.y + w.h) return { zone: 'weapon', index: 0 };
    if (sy >= L.backStartY && sx >= L.backStartX) {
        const col = Math.floor((sx - L.backStartX) / L.cellW);
        const row = Math.floor((sy - L.backStartY) / L.cellH);
        if (col >= 0 && col < 9 && row >= 0 && row < 3) return { zone: 'back', index: row * 9 + col };
    }
    return null;
}

function rectOfHit(hit) {
    const L = getInvLayout();
    if (hit.zone === 'equip') return { x: L.equipStartX + hit.index * L.equipCellW, y: L.equipStartY, w: L.equipCellW, h: L.equipCellH };
    if (hit.zone === 'weapon') return { x: L.weaponRect.x, y: L.weaponRect.y, w: L.weaponRect.w, h: L.weaponRect.h };
    if (hit.zone === 'hot') return { x: L.hotStartX + hit.index * L.cellW, y: L.hotStartY, w: L.cellW, h: L.cellH };
    const row = Math.floor(hit.index / 9), col = hit.index % 9;
    return { x: L.backStartX + col * L.cellW, y: L.backStartY + row * L.cellH, w: L.cellW, h: L.cellH };
}

function isDropAllowed(src, dst) {
    if (!src || !dst) return false;
    if (src.fromZone === dst.zone && src.fromIndex === dst.index) return false;
    if (dst.zone === 'weapon') return isWeaponType(src.item.type);
    if (dst.zone === 'equip') {
        const info = ITEMS[src.item.type] || {};
        return info.slotType === equipSlotNeed(dst.index);
    }
    return true;
}

function putItemInto(zone, index, item) {
    if (!item) return false;
    if (zone === 'back') {
        if (inventorySlots[index] === null) { inventorySlots[index] = item; return true; }
    } else if (zone === 'hot') {
        if (hotbarSlots[index] === null) { hotbarSlots[index] = item; return true; }
    } else if (zone === 'equip') {
        if (equipSlots[index] === null) { equipSlots[index] = item; return true; }
    } else if (zone === 'weapon') {
        if (typeof WEAPONS !== 'undefined' && WEAPONS[item.type]) { currentWeapon = WEAPONS[item.type]; return true; }
    }
    return addItem(item.type, item.count);
}

function refreshEquipEffects() {
    let mask = false, cross = false, robe = false, ice = false, shield = false;
    for (let i = 0; i < EQUIP_SLOTS; i++) {
        const sl = equipSlots[i];
        if (!sl) continue;
        if (sl.type === 'clownMask') mask = true;
        else if (sl.type === 'cross') cross = true;
        else if (sl.type === 'priestRobes') robe = true;
        else if (sl.type === 'iceWings') ice = true;
        else if (sl.type === 'techShield') shield = true;
    }
    window.hasClownMask = mask;
    window.hasCross = cross;
    window.hasPriestRobes = robe;
    window.hasIceWings = ice;
    window.hasTechShield = shield;
    if (typeof updatePlayerMaxHp === 'function') updatePlayerMaxHp();
}

function transferItem(src, dst) {
    const item = src.item;
    if (dst.zone === 'weapon') {
        if (!isWeaponType(item.type)) { showInventoryMessage('该物品不能装备到武器位'); return false; }
        if (currentWeapon && currentWeapon.id) {
            putItemInto(src.fromZone, src.fromIndex, { type: currentWeapon.id, count: 1 });
        }
        if (typeof equipWeapon === 'function') equipWeapon(item.type);
        else currentWeapon = (typeof WEAPONS !== 'undefined') ? WEAPONS[item.type] : null;
        showInventoryMessage('已装备 ' + (ITEMS[item.type] && ITEMS[item.type].name ? ITEMS[item.type].name : item.type));
        return true;
    }
    if (dst.zone === 'equip') {
        const need = equipSlotNeed(dst.index);
        const info = ITEMS[item.type] || {};
        if (info.slotType !== need) { showInventoryMessage('该物品不能装备到此处'); return false; }
        const old = equipSlots[dst.index];
        equipSlots[dst.index] = { type: item.type, count: 1 };
        if (old) putItemInto(src.fromZone, src.fromIndex, { type: old.type, count: 1 });
        showInventoryMessage('已装备 ' + (info.name || item.type));
        return true;
    }
    const arr = (dst.zone === 'hot') ? hotbarSlots : inventorySlots;
    const t = arr[dst.index];
    if (t === null) { arr[dst.index] = item; return true; }
    const tInfo = ITEMS[item.type] || {};
    if (t.type === item.type && (tInfo.maxStack || 1) > 1) {
        const maxStack = tInfo.maxStack;
        const can = Math.min(maxStack - t.count, item.count);
        if (can > 0) {
            t.count += can;
            item.count -= can;
            if (item.count > 0) putItemInto(src.fromZone, src.fromIndex, item);
            return true;
        }
    }
    arr[dst.index] = item;
    putItemInto(src.fromZone, src.fromIndex, t);
    return true;
}

function invMouseDown(sx, sy) {
    if (dragState) return true;
    const hit = hitTestInv(sx, sy);
    if (!hit) return false;
    const it = takeSlotItem(hit.zone, hit.index);
    if (it) {
        dragState = { item: it, fromZone: hit.zone, fromIndex: hit.index };
        refreshEquipEffects();
    }
    return true;
}

function invMouseUp() {
    if (!dragState) return false;
    const src = dragState;
    const dst = hitTestInv(mouseScreenX, mouseScreenY);
    let ok = false;
    if (dst) ok = transferItem(src, dst);
    if (!ok) putItemInto(src.fromZone, src.fromIndex, src.item);
    dragState = null;
    refreshEquipEffects();
    return true;
}

function invCancelDrag() {
    if (!dragState) return false;
    putItemInto(dragState.fromZone, dragState.fromIndex, dragState.item);
    dragState = null;
    refreshEquipEffects();
    return true;
}

function drawDragLayer() {
    if (!dragState) return;
    const hit = hitTestInv(mouseScreenX, mouseScreenY);
    if (hit) {
        const r = rectOfHit(hit);
        ctx.save();
        ctx.strokeStyle = isDropAllowed(dragState, hit) ? '#44ff88' : '#ff4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        ctx.restore();
    }
    const info = ITEMS[dragState.item.type];
    const size = 42;
    const dx = mouseScreenX - size / 2, dy = mouseScreenY - size / 2;
    ctx.save();
    ctx.globalAlpha = 0.85;
    if (info && info.icon) {
        const img = new Image();
        img.src = info.icon;
        if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, dx, dy, size, size);
        else {
            ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
            ctx.fillText((info.name || '?').charAt(0), mouseScreenX, mouseScreenY + 4); ctx.textAlign = 'left';
        }
    } else {
        ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
        ctx.fillText((info && info.name ? info.name : '?').charAt(0), mouseScreenX, mouseScreenY + 4); ctx.textAlign = 'left';
    }
    ctx.restore();
}

// ---------- 绘制界面 ----------
function drawHotbar() {
    const cellW = 50;
    const cellH = 50;
    const equipCellW = 40;
    const equipCellH = 40;

    if (window.gamePanelOpen) {
    // === 装备栏（顶部 4 格） ===
    const equipStartX = (VIEW_W - EQUIP_SLOTS * equipCellW) / 2;
    const equipStartY = 10;
    const equipNames = ['📿 挂饰', '', '🎭 面具', '🧥 外衣', '🛡 盾牌'];
    const equipSlotsDef = [
        { name: '挂饰', index: 0 }, { name: '挂饰', index: 1 },
        { name: '面具', index: 2 }, { name: '外衣', index: 3 },
        { name: '盾牌', index: 4 }
    ];

    for (let i = 0; i < EQUIP_SLOTS; i++) {
        const x = equipStartX + i * equipCellW;
        const y = equipStartY;
        ctx.fillStyle = 'rgba(22,22,38,0.78)';
        ctx.fillRect(x, y, equipCellW, equipCellH);
        ctx.strokeStyle = '#c8a000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, equipCellW, equipCellH);

        // 装备格标签
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(equipSlotsDef[i].name, x + equipCellW / 2, y + equipCellH - 2);
        ctx.textAlign = 'left';

        const slot = equipSlots[equipSlotsDef[i].index];
        if (slot) {
            const item = ITEMS[slot.type];
            const img = new Image();
            img.src = item.icon;
            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, x + 2, y + 2, equipCellW - 4, equipCellH - 4);
            } else {
                ctx.fillStyle = '#fff';
                ctx.font = '10px monospace';
                ctx.fillText(item.name[0], x + equipCellW / 2, y + equipCellH / 2);
            }
        }
    }

    // === 武器手持位 ===
    {
        const wpx = equipStartX + EQUIP_SLOTS * equipCellW + 10;
        const wpy = equipStartY;
        ctx.fillStyle = 'rgba(22,22,38,0.78)';
        ctx.fillRect(wpx, wpy, equipCellW, equipCellH);
        ctx.strokeStyle = '#c8a000';
        ctx.lineWidth = 1;
        ctx.strokeRect(wpx, wpy, equipCellW, equipCellH);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('武器', wpx + equipCellW / 2, wpy + equipCellH - 2);
        ctx.textAlign = 'left';
        if (currentWeapon && currentWeapon.icon) {
            const wimg = new Image();
            wimg.src = currentWeapon.icon;
            if (wimg.complete && wimg.naturalWidth > 0) {
                ctx.drawImage(wimg, wpx + 2, wpy + 2, equipCellW - 4, equipCellH - 4);
            } else {
                ctx.fillStyle = '#fff';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText((currentWeapon.name || '?').charAt(0), wpx + equipCellW / 2, wpy + equipCellH / 2);
                ctx.textAlign = 'left';
            }
        }
    }

    // === 主背包 3x9（27格） ===
    const backStartX = (VIEW_W - INVENTORY_SIZE / 3 * cellW) / 2;
    const backStartY = equipStartY + equipCellH + 10;

    // 背包标签
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('背包 (27)', backStartX, backStartY - 2);

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 9; col++) {
            const idx = row * 9 + col;
            const x = backStartX + col * cellW;
            const y = backStartY + row * cellH;

            ctx.fillStyle = 'rgba(22,22,38,0.78)';
            ctx.fillRect(x, y, cellW, cellH);
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellW, cellH);

            const slot = inventorySlots[idx];
            if (slot) {
                const item = ITEMS[slot.type];
                if (item && item.icon) {
                    const img = new Image();
                    img.src = item.icon;
                    if (img.complete && img.naturalWidth > 0) {
                        ctx.drawImage(img, x + 4, y + 4, cellW - 8, cellH - 8);
                    }
                }
                if (slot.count > 1) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 12px monospace';
                    ctx.fillText(`x${slot.count}`, x + cellW - 16, y + cellH - 6);
                }
            }
        }
    }

    }

    // === 快捷栏 9 格（底部） ===
    const hotStartX = (VIEW_W - HOTBAR_SIZE * cellW) / 2;
    const hotStartY = VIEW_H - cellH - 20;
    const hotLabelY = hotStartY - 16;
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('快捷栏 (9)', hotStartX, hotLabelY);

    for (let i = 0; i < HOTBAR_SIZE; i++) {
        const x = hotStartX + i * cellW;
        const y = hotStartY;

        ctx.fillStyle = 'rgba(22,22,38,0.78)';
        ctx.fillRect(x, y, cellW, cellH);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW, cellH);

        const slot = hotbarSlots[i];
        if (slot) {
            const item = ITEMS[slot.type];
            if (item && item.icon) {
                const img = new Image();
                img.src = item.icon;
                if (img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, x + 4, y + 4, cellW - 8, cellH - 8);
                }
            }
            if (slot.count > 1) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px monospace';
                ctx.fillText(`x${slot.count}`, x + cellW - 16, y + cellH - 6);
            }
        }
        // 快捷栏数字标签
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(`${i + 1}`, x + 5, y + 14);
    }

}

// 消息与更新
let inventoryMessage = '';
let messageTimer = 0;
function showInventoryMessage(msg) {
    inventoryMessage = msg;
    messageTimer = 60;
}
function updateInventory() {
    if (messageTimer > 0) {
        messageTimer--;
        if (messageTimer === 0) inventoryMessage = '';
    }
}

// 导出
window.inventorySlots = inventorySlots;
window.hotbarSlots = hotbarSlots;
window.equipSlots = equipSlots;
window.addItem = addItem;
window.useItemFromSlot = useItemFromSlot;
window.equipAccessory = equipAccessory;
window.unequipAccessory = unequipAccessory;
window.equipWeaponFromSlot = equipWeaponFromSlot;
window.unequipWeapon = unequipWeapon;
window.putBack = putBack;
window.inventoryMessage = inventoryMessage;
window.showInventoryMessage = showInventoryMessage;
window.updateInventory = updateInventory;
window.getEquipSlotIndex = getEquipSlotIndex;
window.totalItems = () => INVENTORY_SIZE + HOTBAR_SIZE;
window.invMouseDown = invMouseDown;
window.invMouseUp = invMouseUp;
window.invCancelDrag = invCancelDrag;
window.drawDragLayer = drawDragLayer;
window.refreshEquipEffects = refreshEquipEffects;
