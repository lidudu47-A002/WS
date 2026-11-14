// ---------- 宠物界面（左侧书签，右侧详情，点击书签不关闭面板）----------
let petPanelOpen = false;
let petPanelDiv = null;
let currentSelectedPet = null;

const PET_INFO = {
    monkey: {
        id: 'monkey',
        name: 'Monkey',
        icon: '素材/宠物/宠物样式/monkey.png',
        attack: '念力悬浮',
        damage: `10 + (等级-1)*10 点伤害`,
        cooldown: '3秒',
        range: '左右各400px',
        special: '敌人不可移动、免疫伤害，1秒后摔落'
    },
    point618: {
        id: 'point618',
        name: '0.618',
        icon: '素材/宠物/宠物样式/0.618.png',
        attack: '三角形刺',
        damage: '锁定目标10点，其他敌人5点',
        cooldown: '2秒',
        range: '左右各400px',
        special: '穿透所有敌人，三角形飞行800px后消失'
    },
    horror: {
        id: 'horror',
        name: 'Horror',
        icon: '素材/宠物/宠物样式/horror.png',
        attack: '全屏诅咒',
        damage: `5 + (等级-1)×5 点伤害，每5秒一次`,
        cooldown: '5秒',
        range: '全屏',
        special: '对全场所有敌人造成伤害，并附加永久减速1级（不衰减）'
    },
    xiaoe: {
        id: 'xiaoe',
        name: '小e',
        icon: '素材/宠物/宠物样式/小e.png',
        attack: '斩击',
        damage: `20 + (等级-1)×2 点伤害`,
        cooldown: '3秒',
        range: '300x300px',
        special: '飘向敌人，显示斩击特效，造成伤害后返回'
    }
};

function createPetPanel() {
    if (petPanelDiv) return;
    petPanelDiv = document.createElement('div');
    petPanelDiv.id = 'petPanel';
    petPanelDiv.style.position = 'fixed';
    petPanelDiv.style.top = '50%';
    petPanelDiv.style.left = '50%';
    petPanelDiv.style.transform = 'translate(-50%, -50%)';
    petPanelDiv.style.width = '700px';
    petPanelDiv.style.height = '450px';
    petPanelDiv.style.background = 'rgba(20, 20, 30, 0.95)';
    petPanelDiv.style.border = '2px solid gold';
    petPanelDiv.style.borderRadius = '16px';
    petPanelDiv.style.zIndex = '10000';
    petPanelDiv.style.display = 'none';
    petPanelDiv.style.flexDirection = 'row';
    petPanelDiv.style.backdropFilter = 'blur(8px)';
    petPanelDiv.style.boxShadow = '0 0 30px rgba(0,0,0,0.8)';
    petPanelDiv.style.overflow = 'hidden';
    document.body.appendChild(petPanelDiv);

    const sidebar = document.createElement('div');
    sidebar.id = 'petSidebar';
    sidebar.style.width = '100px';
    sidebar.style.backgroundColor = '#1a1a2a';
    sidebar.style.borderRight = '1px solid gold';
    sidebar.style.display = 'flex';
    sidebar.style.flexDirection = 'column';
    sidebar.style.alignItems = 'center';
    sidebar.style.padding = '10px 0';
    sidebar.style.gap = '10px';
    petPanelDiv.appendChild(sidebar);

    const content = document.createElement('div');
    content.id = 'petContent';
    content.style.flex = '1';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.padding = '16px';
    content.style.position = 'relative';
    petPanelDiv.appendChild(content);

    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✖';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '15px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.color = '#aaa';
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        closePetPanel();
    };
    content.appendChild(closeBtn);
}

function buildSidebar() {
    const sidebar = document.getElementById('petSidebar');
    if (!sidebar) return;
    while (sidebar.firstChild) sidebar.removeChild(sidebar.firstChild);

    const owned = window.ownedPets || [];
    if (owned.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.textContent = '暂无宠物';
        emptyMsg.style.color = '#aaa';
        emptyMsg.style.fontSize = '14px';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.marginTop = '20px';
        sidebar.appendChild(emptyMsg);
        return;
    }

    owned.forEach(petId => {
        const pet = PET_INFO[petId];
        if (!pet) return;
        const btn = document.createElement('div');
        btn.className = 'pet-tab';
        btn.setAttribute('data-pet', petId);
        btn.style.width = '64px';
        btn.style.height = '64px';
        btn.style.margin = '5px';
        btn.style.borderRadius = '12px';
        btn.style.backgroundColor = (currentSelectedPet === petId) ? '#3a3a4e' : '#2a2a3a';
        btn.style.border = (currentSelectedPet === petId) ? '2px solid gold' : '1px solid #555';
        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        const img = new Image();
        img.src = pet.icon;
        img.style.width = '48px';
        img.style.height = '48px';
        img.style.objectFit = 'contain';
        btn.appendChild(img);
        btn.onclick = (e) => {
            e.stopPropagation();
            if (currentSelectedPet === petId) return;
            currentSelectedPet = petId;
            document.querySelectorAll('.pet-tab').forEach(tab => {
                const id = tab.getAttribute('data-pet');
                if (id === petId) {
                    tab.style.backgroundColor = '#3a3a4e';
                    tab.style.border = '2px solid gold';
                } else {
                    tab.style.backgroundColor = '#2a2a3a';
                    tab.style.border = '1px solid #555';
                }
            });
            updatePetDetail();
        };
        sidebar.appendChild(btn);
    });
}

function updatePetDetail() {
    const contentDiv = document.getElementById('petContent');
    if (!contentDiv) return;
    while (contentDiv.children.length > 1) contentDiv.removeChild(contentDiv.lastChild);
    if (!currentSelectedPet || !PET_INFO[currentSelectedPet]) {
        const errorMsg = document.createElement('div');
        errorMsg.textContent = '请选择宠物';
        errorMsg.style.padding = '20px';
        errorMsg.style.textAlign = 'center';
        contentDiv.appendChild(errorMsg);
        return;
    }
    const pet = PET_INFO[currentSelectedPet];
    const isActive = window.activePets && window.activePets.some(p => p.type === pet.id);

    const flexRow = document.createElement('div');
    flexRow.style.display = 'flex';
    flexRow.style.gap = '20px';
    flexRow.style.marginTop = '20px';
    contentDiv.appendChild(flexRow);

    const leftCol = document.createElement('div');
    leftCol.style.width = '150px';
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'column';
    leftCol.style.alignItems = 'center';
    const bigImg = new Image();
    bigImg.src = pet.icon;
    bigImg.style.width = '128px';
    bigImg.style.height = '128px';
    bigImg.style.objectFit = 'contain';
    bigImg.style.backgroundColor = '#333';
    bigImg.style.borderRadius = '16px';
    bigImg.style.padding = '10px';
    leftCol.appendChild(bigImg);
    flexRow.appendChild(leftCol);

    const rightCol = document.createElement('div');
    rightCol.style.flex = '1';
    const nameDiv = document.createElement('div');
    nameDiv.textContent = pet.name;
    nameDiv.style.fontSize = '28px';
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.color = '#ffd966';
    nameDiv.style.marginBottom = '12px';
    rightCol.appendChild(nameDiv);
    const btn = document.createElement('button');
    btn.textContent = isActive ? '收回宠物' : '召唤宠物';
    btn.style.padding = '8px 20px';
    btn.style.borderRadius = '25px';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.style.backgroundColor = isActive ? '#aa3333' : '#2a6d4c';
    btn.style.color = 'white';
    btn.style.marginBottom = '20px';
    btn.onclick = (e) => {
        e.stopPropagation();
        if (isActive) removePet(pet.id);
        else addPet(pet.id);
        updatePetDetail();
        if (window.panelVisible) updatePanelUI();
    };
    rightCol.appendChild(btn);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    const rows = [
        ['攻击方式', pet.attack],
        ['伤害', pet.damage],
        ['冷却时间', pet.cooldown],
        ['索敌范围', pet.range],
        ['特殊效果', pet.special]
    ];
    rows.forEach(row => {
        const tr = document.createElement('tr');
        const tdLabel = document.createElement('td');
        tdLabel.textContent = row[0];
        tdLabel.style.padding = '8px';
        tdLabel.style.borderBottom = '1px solid #555';
        tdLabel.style.fontWeight = 'bold';
        tdLabel.style.width = '30%';
        const tdValue = document.createElement('td');
        tdValue.textContent = row[1];
        tdValue.style.padding = '8px';
        tdValue.style.borderBottom = '1px solid #555';
        tr.appendChild(tdLabel);
        tr.appendChild(tdValue);
        table.appendChild(tr);
    });
    rightCol.appendChild(table);
    flexRow.appendChild(rightCol);
}

function refreshPetPanel() {
    buildSidebar();
    updatePetDetail();
}

function openPetPanel() {
    if (!petPanelDiv) createPetPanel();
    const owned = window.ownedPets || [];
    if (owned.length > 0 && (!currentSelectedPet || !owned.includes(currentSelectedPet))) {
        currentSelectedPet = owned[0];
    }
    refreshPetPanel();
    petPanelDiv.style.display = 'flex';
    petPanelOpen = true;
    window.petPanelOpen = true;
}

function closePetPanel() {
    if (petPanelDiv) petPanelDiv.style.display = 'none';
    petPanelOpen = false;
    window.petPanelOpen = false;
    canvas.focus();
}

function initPetUI() {
    createPetPanel();
    document.addEventListener('click', (e) => {
        if (petPanelOpen && petPanelDiv && !petPanelDiv.contains(e.target)) {
            closePetPanel();
        }
    });
}

window.openPetPanel = openPetPanel;
window.closePetPanel = closePetPanel;
window.petPanelOpen = petPanelOpen;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPetUI);
} else {
    initPetUI();
}