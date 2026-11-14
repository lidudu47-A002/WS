// ---------- 商店系统 ----------
let pendingItem = null;

document.getElementById('closeShopBtn').onclick = () => {
    shopPanel.style.display = 'none';
};

document.querySelectorAll('.shop-item-card').forEach(card => {
    card.onclick = e => {
        e.stopPropagation();
        pendingItem = card.dataset.item;
        let icon = '', name = '';
        if (pendingItem === 'hp') {
            icon = '素材/商店/HP药水.png';
            name = 'HP药水';
        } else if (pendingItem === 'normalAtk') {
            icon = '素材/商店/normal attack药水.png';
            name = '普攻药水';
        } else {
            icon = '素材/商店/skill药水.png';
            name = '技能药水';
        }
        document.getElementById('confirmIcon').innerHTML = `<img src="${icon}" alt="${name}">`;
        document.getElementById('confirmText').innerText = `购买 ${name}？`;
        confirmModal.style.display = 'flex';
    };
});

document.getElementById('confirmBuy').onclick = () => {
    if (!pendingItem) return;
    let ok = false;
    if (pendingItem === 'hp') {
        if (gold >= 30 && playerHP < PLAYER_MAX_HP) {
            gold -= 30;
            playerHP = Math.min(PLAYER_MAX_HP, playerHP + 20);
            ok = true;
        } else {
            alert('金币不足或生命已满');
        }
    } else if (pendingItem === 'normalAtk') {
        if (gold >= 100) {
            gold -= 100;
            normalAttackMult *= 1.2;
            ok = true;
        } else {
            alert('金币不足');
        }
    } else if (pendingItem === 'skill') {
        if (gold >= 50) {
            gold -= 50;
            skillDamageMult *= 1.2;
            ok = true;
        } else {
            alert('金币不足');
        }
    }
    if (ok && panelVisible) updatePanelUI();
    confirmModal.style.display = 'none';
    pendingItem = null;
};

document.getElementById('confirmCancel').onclick = () => {
    confirmModal.style.display = 'none';
    pendingItem = null;
};