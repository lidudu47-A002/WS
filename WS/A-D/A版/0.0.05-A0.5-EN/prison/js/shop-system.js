// 优化清单第 21 条：innerHTML 插值统一转义，避免外部字符串（名称/路径）破坏结构
function escapeHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

// ---------- 商店系统 ----------
let pendingItem = null;

const SHOP_ITEMS = {
    hp: { price: 30, name: 'HP Potion', icon: '../公用文件/图片/商店/HP药水.png' },
    normalAtk: { price: 100, name: 'Normal Attack Potion', icon: '../公用文件/图片/商店/normal attack药水.png' },
    skill: { price: 50, name: 'Skill Potion', icon: '../公用文件/图片/商店/skill药水.png' }
};

document.getElementById('closeShopBtn').onclick = () => {
    shopPanel.style.display = 'none';
    window.shopPanelOpen = false;
};

document.querySelectorAll('.shop-item-card').forEach(card => {
    card.onclick = e => {
        e.stopPropagation();
        pendingItem = card.dataset.item;
        const item = SHOP_ITEMS[pendingItem] || SHOP_ITEMS.skill;
        document.getElementById('confirmIcon').innerHTML = `<img src="${escapeHtml(item.icon)}" alt="${escapeHtml(item.name)}">`;
        document.getElementById('confirmText').innerText = `Buy ${item.name}?`;
        confirmModal.style.display = 'flex';
    };
});

document.getElementById('confirmBuy').onclick = () => {
    if (!pendingItem) return;
    const item = SHOP_ITEMS[pendingItem];
    if (item) {
        if (gold < item.price) {
            showToast('Not enough Gold');
        } else {
            gold -= item.price;
            addItem(pendingItem, 1);
            showInventoryMessage(`Obtained ${item.name} x1`);
            if (panelVisible) updatePanelUI();
        }
    }
    confirmModal.style.display = 'none';
    pendingItem = null;
};

document.getElementById('confirmCancel').onclick = () => {
    confirmModal.style.display = 'none';
    pendingItem = null;
};
