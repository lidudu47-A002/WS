// ---------- 商店系统 ----------
let pendingItem = null;

// 关闭商店按钮
document.getElementById('closeShopBtn').onclick = () => {
    shopPanel.style.display = 'none';
    window.shopPanelOpen = false;
};

// 商店物品点击事件
document.querySelectorAll('.shop-item-card').forEach(card => {
    card.onclick = e => {
        e.stopPropagation();
        pendingItem = card.dataset.item;
        let icon = '', name = '';
        if (pendingItem === 'hp') {
            icon = '../公用文件/图片/商店/HP药水.png';
            name = 'HP药水';
        } else if (pendingItem === 'normalAtk') {
            icon = '../公用文件/图片/商店/normal attack药水.png';
            name = '普攻药水';
        } else {
            icon = '../公用文件/图片/商店/skill药水.png';
            name = '技能药水';
        }
        document.getElementById('confirmIcon').innerHTML = `<img src="${icon}" alt="${name}">`;
        document.getElementById('confirmText').innerText = `购买 ${name}？`;
        confirmModal.style.display = 'flex';
    };
});

// 确认购买
document.getElementById('confirmBuy').onclick = () => {
    if (!pendingItem) return;
    let ok = false;
    if (pendingItem === 'hp') {
        if (gold >= 30) {
            gold -= 30;
            addItem('hp', 1);
            ok = true;
            showInventoryMessage('获得 HP药水 x1');
        } else {
            alert('金币不足');
        }
    } else if (pendingItem === 'normalAtk') {
        if (gold >= 100) {
            gold -= 100;
            addItem('normalAtk', 1);
            ok = true;
            showInventoryMessage('获得 普攻药水 x1');
        } else {
            alert('金币不足');
        }
    } else if (pendingItem === 'skill') {
        if (gold >= 50) {
            gold -= 50;
            addItem('skill', 1);
            ok = true;
            showInventoryMessage('获得 技能药水 x1');
        } else {
            alert('金币不足');
        }
    }
    if (ok && panelVisible) updatePanelUI();
    confirmModal.style.display = 'none';
    pendingItem = null;
};

// 取消购买
document.getElementById('confirmCancel').onclick = () => {
    confirmModal.style.display = 'none';
    pendingItem = null;
};