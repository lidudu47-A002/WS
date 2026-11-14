// ---------- 物品栏系统（快捷栏，无背包界面）----------
const INVENTORY_SIZE = 9;  // 快捷栏格子数（1-9）

// 背包数据：每个槽位 { type, count } 或 null
let inventorySlots = new Array(INVENTORY_SIZE).fill(null);

// 物品定义
const ITEMS = {
    hp: { name: '❤️ HP药水', icon: '素材/商店/HP药水.png', maxStack: 64, use: () => {
        if (playerHP >= currentMaxHp) {
            showInventoryMessage('生命已满！');
            return false;
        }
        playerHP = Math.min(currentMaxHp, playerHP + 20);
        return true;
    }},
    normalAtk: { name: '⚔️ 普攻药水', icon: '素材/商店/normal attack药水.png', maxStack: 64, use: () => {
        normalAttackMult *= 1.2;
        return true;
    }},
    skill: { name: '✨ 技能药水', icon: '素材/商店/skill药水.png', maxStack: 64, use: () => {
        skillDamageMult *= 1.2;
        return true;
    }}
};

// 添加物品（自动叠加）
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
    }
    return true;
}

// 使用物品（从指定槽位）
function useItemFromSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= INVENTORY_SIZE) return false;
    const slot = inventorySlots[slotIndex];
    if (!slot) return false;
    const item = ITEMS[slot.type];
    if (!item) return false;
    if (item.use()) {
        slot.count--;
        if (slot.count <= 0) {
            inventorySlots[slotIndex] = null;
        }
        if (panelVisible) updatePanelUI();
        return true;
    }
    return false;
}

// 绘制快捷栏（物品栏）
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
        
        // 背景
        ctx.fillStyle = 'rgba(30,30,40,0.8)';
        ctx.fillRect(x, y, cellW, cellH);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW, cellH);
        
        if (slot) {
            const item = ITEMS[slot.type];
            // 绘制图标
            const img = new Image();
            img.src = item.icon;
            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, x + 5, y + 5, cellW - 10, cellH - 10);
            } else {
                ctx.fillStyle = '#fff';
                ctx.font = `${fontSize}px monospace`;
                ctx.fillText(item.name[0], x + cellW/2, y + cellH/2);
            }
            // 数量
            if (slot.count > 1) {
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${fontSize}px monospace`;
                ctx.fillText(`x${slot.count}`, x + cellW - 15, y + cellH - 8);
            }
        }
        
        // 数字标签
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        ctx.fillText(`${i+1}`, x + 5, y + 15);
    }
}

// 消息系统
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

// 暴露全局变量
window.inventorySlots = inventorySlots;
window.addItem = addItem;
window.useItemFromSlot = useItemFromSlot;