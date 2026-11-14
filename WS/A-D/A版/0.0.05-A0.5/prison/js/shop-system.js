// ---------- 商店系统 ----------
let pendingItem = null;

const SHOP_ITEMS = {
    hp: { price: 30, name: 'HP药水', icon: '../公用文件/图片/商店/HP药水.png' },
    normalAtk: { price: 100, name: '普攻药水', icon: '../公用文件/图片/商店/normal attack药水.png' },
    skill: { price: 50, name: '技能药水', icon: '../公用文件/图片/商店/skill药水.png' }
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
        document.getElementById('confirmIcon').innerHTML = `<img src="${item.icon}" alt="${item.name}">`;
        document.getElementById('confirmText').innerText = `购买 ${item.name}？`;
        confirmModal.style.display = 'flex';
    };
});

document.getElementById('confirmBuy').onclick = () => {
    if (!pendingItem) return;
    const item = SHOP_ITEMS[pendingItem];
    if (item) {
        if (gold < item.price) {
            alert('金币不足');
        } else {
            gold -= item.price;
            addItem(pendingItem, 1);
            showInventoryMessage(`获得 ${item.name} x1`);
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
