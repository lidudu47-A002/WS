// ---------- 物品栏系统 ----------
const INVENTORY_SIZE = 9;
let inventorySlots = new Array(INVENTORY_SIZE).fill(null);

const ITEMS = {
    hp: {
        name: '❤️ HP药水',
        icon: '素材/商店/HP药水.png',
        maxStack: 64,
        use: () => {
            if (playerHP >= currentMaxHp) {
                showInventoryMessage('生命已满！');
                return false;
            }
            playerHP = Math.min(currentMaxHp, playerHP + 20);
            return true;
        }
    },
    normalAtk: {
        name: '⚔️ 普攻药水',
        icon: '素材/商店/normal attack药水.png',
        maxStack: 64,
        use: () => {
            normalAttackMult *= 1.2;
            return true;
        }
    },
    skill: {
        name: '✨ 技能药水',
        icon: '素材/商店/skill药水.png',
        maxStack: 64,
        use: () => {
            skillDamageMult *= 1.2;
            return true;
        }
    },
    // ---------- 武器 ----------
    sword: {
        name: '铁剑',
        icon: '素材/装备/武器/铁剑.png',
        maxStack: 1,
        use: () => {
            if (currentWeapon && currentWeapon.id === 'sword') {
                showInventoryMessage('已装备铁剑');
                return false;
            }
            equipWeapon('sword');
            return true;
        }
    },
    bow: {
        name: '弓',
        icon: '素材/装备/武器/弓.png',
        maxStack: 1,
        use: () => {
            if (currentWeapon && currentWeapon.id === 'bow') {
                showInventoryMessage('已装备弓');
                return false;
            }
            equipWeapon('bow');
            return true;
        }
    },
    frostBlade: {
        name: 'F·B 冰霜之刃',
        icon: '素材/装备/武器/冰霜之刃.png',
        maxStack: 1,
        use: () => {
            if (currentWeapon && currentWeapon.id === 'frostBlade') {
                showInventoryMessage('已装备冰霜之刃');
                return false;
            }
            equipWeapon('frostBlade');
            return true;
        }
    },
    firewand: {
        name: '火焰法杖',
        icon: '素材/装备/武器/火焰法杖.png',
        maxStack: 1,
        use: () => {
            if (currentWeapon && currentWeapon.id === 'firewand') {
                showInventoryMessage('已装备火焰法杖');
                return false;
            }
            equipWeapon('firewand');
            return true;
        }
    },
    shadowDagger: {
        name: '🗡️ 暗影匕首',
        icon: '素材/装备/武器/暗影匕首.png',
        maxStack: 1,
        use: () => {
            if (currentWeapon && currentWeapon.id === 'shadowDagger') {
                showInventoryMessage('已装备暗影匕首');
                return false;
            }
            equipWeapon('shadowDagger');
            return true;
        }
    },
    thunderHammer: {
        name: '⚡ 雷霆锤',
        icon: '素材/装备/武器/雷霆锤.png',
        maxStack: 1,
        use: () => {
            if (currentWeapon && currentWeapon.id === 'thunderHammer') {
                showInventoryMessage('已装备雷霆锤');
                return false;
            }
            equipWeapon('thunderHammer');
            return true;
        }
    },
    compoundBow: {
        name: '🏹 复合弓',
        icon: '素材/装备/武器/复合弓.png',
        maxStack: 1,
        use: () => {
            if (currentWeapon && currentWeapon.id === 'compoundBow') {
                showInventoryMessage('已装备复合弓');
                return false;
            }
            equipWeapon('compoundBow');
            return true;
        }
    },
    blackholeStaff: {
        name: '🕳️ 黑洞权杖',
        icon: '素材/装备/武器/黑洞权杖.png',
        maxStack: 1,
        use: () => {
            if (currentWeapon && currentWeapon.id === 'blackholeStaff') {
                showInventoryMessage('已装备黑洞权杖');
                return false;
            }
            equipWeapon('blackholeStaff');
            return true;
        }
    },
    techSpear: {
        name: '⚡ 科技长矛',
        icon: '素材/装备/武器/科技长矛.png',
        maxStack: 1,
        use: () => {
            if (currentWeapon && currentWeapon.id === 'techSpear') {
                showInventoryMessage('已装备科技长矛');
                return false;
            }
            equipWeapon('techSpear');
            return true;
        }
    },
    // ---------- 挂饰 ----------
    cross: {
        name: '✝️ 十字架',
        icon: '素材/装备/增益/十字架.png',
        maxStack: 1,
        use: () => {
            if (window.hasCross) {
                showInventoryMessage('十字架已装备');
                return false;
            }
            window.hasCross = true;
            updatePlayerMaxHp();
            showInventoryMessage('✝️ 已装备十字架，生命上限+10%，每秒回2HP');
            return true;
        }
    },
    clownMask: {
        name: '🤡 小丑面具',
        icon: '素材/装备/其他/小丑面具.png',
        maxStack: 1,
        use: () => {
            if (window.hasClownMask) {
                showInventoryMessage('小丑面具已装备');
                return false;
            }
            window.hasClownMask = true;
            updatePlayerMaxHp();
            showInventoryMessage('🤡 已戴上面具，属性×4，每秒-1HP');
            return true;
        }
    },
    // ---------- 宠物 ----------
    monkey: {
        name: 'Monkey',
        icon: '素材/宠物/宠物样式/monkey.png',
        maxStack: 1,
        use: () => addPet('monkey')
    },
    point618: {
        name: '0.618',
        icon: '素材/宠物/宠物样式/0.618.png',
        maxStack: 1,
        use: () => addPet('point618')
    },
    horror: {
        name: 'Horror',
        icon: '素材/宠物/宠物样式/horror.png',
        maxStack: 1,
        use: () => addPet('horror')
    },
    xiaoe: {
        name: '小e',
        icon: '素材/宠物/宠物样式/小e.png',
        maxStack: 1,
        use: () => addPet('xiaoe')
    },
    // ---------- 抽卡材料 ----------
    geometry: {
        name: '几何图',
        icon: '素材/宠物/升级物/几何图.png',
        maxStack: 99,
        use: () => { showInventoryMessage('暂无用途'); return true; }
    },
    banana: {
        name: '香蕉',
        icon: '素材/宠物/升级物/香蕉.png',
        maxStack: 99,
        use: () => { showInventoryMessage('暂无用途'); return true; }
    },
    eyeball: {
        name: '眼球',
        icon: '素材/宠物/升级物/眼球.png',
        maxStack: 99,
        use: () => { showInventoryMessage('暂无用途'); return true; }
    }
};

function addItem(type, amount = 1) {
    if (!ITEMS[type]) return false;
    const maxStack = ITEMS[type].maxStack;
    let remaining = amount;
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
    if (remaining > 0) {
        showInventoryMessage(`物品栏已满，丢失 ${remaining} 个 ${ITEMS[type].name}`);
        return false;
    }
    return true;
}

function useItemFromSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= INVENTORY_SIZE) return false;
    const slot = inventorySlots[slotIndex];
    if (!slot) return false;
    const item = ITEMS[slot.type];
    if (!item) return false;

    if (item.maxStack === 1) {
        let oldWeaponId = currentWeapon ? currentWeapon.id : null;
        if (item.use()) {
            inventorySlots[slotIndex] = null;
            // 只有使用武器时，才将旧武器放回该格子
            if (WEAPONS[slot.type] && oldWeaponId && oldWeaponId !== slot.type) {
                inventorySlots[slotIndex] = { type: oldWeaponId, count: 1 };
            }
            if (panelVisible) updatePanelUI();
            return true;
        }
        return false;
    } else {
        if (item.use()) {
            slot.count--;
            if (slot.count <= 0) inventorySlots[slotIndex] = null;
            if (panelVisible) updatePanelUI();
            return true;
        }
        return false;
    }
}

function unequipAccessory(type) {
    if (type === 'clownMask') {
        if (!window.hasClownMask) {
            showInventoryMessage('未装备小丑面具');
            return false;
        }
        if (!addItem('clownMask', 1)) {
            showInventoryMessage('物品栏已满，无法卸下小丑面具');
            return false;
        }
        window.hasClownMask = false;
        updatePlayerMaxHp();
        showInventoryMessage('已卸下小丑面具');
        return true;
    } else if (type === 'cross') {
        if (!window.hasCross) {
            showInventoryMessage('未装备十字架');
            return false;
        }
        if (!addItem('cross', 1)) {
            showInventoryMessage('物品栏已满，无法卸下十字架');
            return false;
        }
        window.hasCross = false;
        updatePlayerMaxHp();
        showInventoryMessage('已卸下十字架');
        return true;
    } else if (type === 'weapon') {
        if (!currentWeapon) {
            showInventoryMessage('未装备武器');
            return false;
        }
        const weaponId = currentWeapon.id;
        unequipWeapon();
        if (!addItem(weaponId, 1)) {
            equipWeapon(weaponId);
            showInventoryMessage('物品栏已满，无法卸下武器');
            return false;
        }
        showInventoryMessage(`已卸下 ${WEAPONS[weaponId].name}`);
        return true;
    }
    return false;
}

function drawHotbar() {
    const hotbarSize = INVENTORY_SIZE;
    const cellW = 50;
    const cellH = 50;
    const startX = (VIEW_W - (hotbarSize * cellW)) / 2;
    const startY = VIEW_H - cellH - 20;
    const fontSize = 14;
    for (let i = 0; i < hotbarSize; i++) {
        const x = startX + i * cellW;
        const y = startY;
        const slot = inventorySlots[i];
        ctx.fillStyle = 'rgba(30,30,40,0.8)';
        ctx.fillRect(x, y, cellW, cellH);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW, cellH);
        if (slot) {
            const item = ITEMS[slot.type];
            const img = new Image();
            img.src = item.icon;
            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, x + 5, y + 5, cellW - 10, cellH - 10);
            } else {
                ctx.fillStyle = '#fff';
                ctx.font = `${fontSize}px monospace`;
                ctx.fillText(item.name[0], x + cellW/2, y + cellH/2);
            }
            if (slot.count > 1) {
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${fontSize}px monospace`;
                ctx.fillText(`x${slot.count}`, x + cellW - 15, y + cellH - 8);
            }
        }
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        ctx.fillText(`${i+1}`, x + 5, y + 15);
    }
}

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

// ---------- 消耗指定数量的物品 ----------
function consumeItem(type, amount) {
    let remaining = amount;
    for (let i = 0; i < INVENTORY_SIZE && remaining > 0; i++) {
        const slot = inventorySlots[i];
        if (slot && slot.type === type) {
            const deduct = Math.min(slot.count, remaining);
            slot.count -= deduct;
            remaining -= deduct;
            if (slot.count <= 0) inventorySlots[i] = null;
        }
    }
    if (remaining > 0) {
        showInventoryMessage(`物品不足，缺少 ${remaining} 个 ${ITEMS[type].name}`);
        return false;
    }
    return true;
}

window.inventorySlots = inventorySlots;
window.addItem = addItem;
window.useItemFromSlot = useItemFromSlot;
window.unequipAccessory = unequipAccessory;
window.inventoryMessage = inventoryMessage;
window.showInventoryMessage = showInventoryMessage;
window.consumeItem = consumeItem;