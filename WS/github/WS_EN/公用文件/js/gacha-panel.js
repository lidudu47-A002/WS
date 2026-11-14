// ---------- 统一抽卡面板（按 R 打开，标签切换宠物 / 武器） ----------
let gachaPanelOpen = false;
let gachaPanelDiv = null;
let gachaCurrentTab = 'pet'; // 'pet' 或 'weapon'

// 宠物池
const PET_GACHA_ITEMS = {
    monkey: { type: 'pet', id: 'monkey', name: 'Monkey', icon: '../公用文件/图片/宠物/宠物样式/monkey.png' },
    point618: { type: 'pet', id: 'point618', name: '0.618', icon: '../公用文件/图片/宠物/宠物样式/0.618.png' },
    horror: { type: 'pet', id: 'horror', name: 'Horror', icon: '../公用文件/图片/宠物/宠物样式/horror.png' },
    xiaoe: { type: 'pet', id: 'xiaoe', name: 'Little e', icon: '../公用文件/图片/宠物/宠物样式/小e.png' },
    geometry: { type: 'material', id: 'geometry', name: 'Geometry', icon: '../公用文件/图片/宠物/升级物/几何图.png' },
    banana: { type: 'material', id: 'banana', name: 'Banana', icon: '../公用文件/图片/宠物/升级物/香蕉.png' },
    eyeball: { type: 'material', id: 'eyeball', name: 'Eyeball', icon: '../公用文件/图片/宠物/升级物/眼球.png' }
};
const PET_LIST = ['monkey', 'point618', 'horror', 'xiaoe'];
const PET_MATERIALS = ['geometry', 'banana', 'eyeball'];

// 武器池
const WEAPON_GACHA_ITEMS = {
    sword: { type: 'weapon', id: 'sword', name: 'Iron Sword', icon: '../公用文件/图片/装备/武器/铁剑.png' },
    frostBlade: { type: 'weapon', id: 'frostBlade', name: 'F·B Frost Blade', icon: '../公用文件/图片/装备/武器/冰霜之刃.png' },
    firewand: { type: 'weapon', id: 'firewand', name: 'Flame Staff', icon: '../公用文件/图片/装备/武器/火焰法杖.png' },
    shadowDagger: { type: 'weapon', id: 'shadowDagger', name: '🗡️ Shadow Dagger', icon: '../公用文件/图片/装备/武器/暗影匕首.png' },
    thunderHammer: { type: 'weapon', id: 'thunderHammer', name: '⚡ Thunder Hammer', icon: '../公用文件/图片/装备/武器/雷霆锤.png' },
    compoundBow: { type: 'weapon', id: 'compoundBow', name: 'Composite Bow', icon: '../公用文件/图片/装备/武器/复合弓.png' },
    blackholeStaff: { type: 'weapon', id: 'blackholeStaff', name: '🕳️ Black Hole Scepter', icon: '../公用文件/图片/装备/武器/黑洞权杖.png' },
    techSpear: { type: 'weapon', id: 'techSpear', name: '⚡ Tech Spear', icon: '../公用文件/图片/装备/武器/科技长矛.png' },
    priestRobes: { type: 'accessory', id: 'priestRobes', name: '✝️ Priest Robe', icon: '../公用文件/图片/装备/增益/苏褡.png' },
    cross: { type: 'accessory', id: 'cross', name: '✝️ Cross', icon: '../公用文件/图片/装备/增益/十字架.png' },
    clownMask: { type: 'accessory', id: 'clownMask', name: '🤡 Jester Mask', icon: '../公用文件/图片/装备/其他/小丑面具.png' },
    iceWings: { type: 'accessory', id: 'iceWings', name: '❄️ Frost Wings', icon: '../公用文件/图片/装备/其他/冰霜之翼.png' },
    techShield: { type: 'accessory', id: 'techShield', name: '🛡 Tech Shield', icon: '../公用文件/图片/装备/盾牌/科技盾牌.png' }
};
const WEAPON_LIST = ['sword', 'frostBlade', 'firewand', 'shadowDagger', 'thunderHammer', 'compoundBow', 'blackholeStaff', 'techSpear', 'priestRobes', 'cross', 'clownMask', 'iceWings', 'techShield'];

let gachaResultMessages = [];

function getRandomPetItem() {
    let r = Math.random();
    if (r < 0.1) {
        let idx = Math.floor(Math.random() * PET_LIST.length);
        return PET_GACHA_ITEMS[PET_LIST[idx]];
    } else {
        let idx = Math.floor(Math.random() * PET_MATERIALS.length);
        return PET_GACHA_ITEMS[PET_MATERIALS[idx]];
    }
}

function getRandomWeaponItem() {
    let r = Math.random();
    let idx = Math.floor(Math.random() * WEAPON_LIST.length);
    return WEAPON_GACHA_ITEMS[WEAPON_LIST[idx]];
}

function processGachaResult(item, poolType) {
    if (poolType === 'pet') {
        if (item.type === 'pet') {
            if (window.ownedPets && window.ownedPets.includes(item.id)) {
                gold += 100;
                showInventoryMessage(`Duplicate pet ${item.name}, 100 gold refunded`);
                addGachaResultMessage(`Duplicate pet ${item.name} → +100 gold`);
            } else {
                if (typeof addPet === 'function') {
                    addPet(item.id);
                    showInventoryMessage(`New pet ${item.name}!`);
                    addGachaResultMessage(`New pet ${item.name}!`);
                }
            }
        } else {
            addItem(item.id, 1);
            showInventoryMessage(`Obtained ${item.name} x1`);
            addGachaResultMessage(`Obtained ${item.name} x1`);
        }
    } else {
        // 武器池
        if (item.type === 'weapon' || item.type === 'accessory') {
            let existing = inventorySlots.some(slot => slot && slot.type === item.id);
            if (existing) {
                let compensation = (item.id === 'firewand') ? 200 : 100;
                gold += compensation;
                showInventoryMessage(`Duplicate ${item.name}, ${compensation} gold refunded`);
                addGachaResultMessage(`Duplicate ${item.name} → +${compensation} gold`);
            } else {
                addItem(item.id, 1);
                showInventoryMessage(`Obtained ${item.name}!`);
                addGachaResultMessage(`Obtained ${item.name}!`);
            }
        } else {
            addItem(item.id, 1);
            showInventoryMessage(`Obtained ${item.name} x1`);
            addGachaResultMessage(`Obtained ${item.name} x1`);
        }
    }
}

function singleGacha(poolType) {
    const cost = 30;
    if (gold < cost) {
        showInventoryMessage('Not enough gold: 30 needed');
        return false;
    }
    gold -= cost;
    let item = (poolType === 'pet') ? getRandomPetItem() : getRandomWeaponItem();
    processGachaResult(item, poolType);
    if (panelVisible) updatePanelUI();
    updateGachaUI();
    return true;
}

function tenGacha(poolType) {
    const cost = 270;
    if (gold < cost) {
        showInventoryMessage('Not enough gold: 270 needed');
        return false;
    }
    gold -= cost;
    for (let i = 0; i < 10; i++) {
        let item = (poolType === 'pet') ? getRandomPetItem() : getRandomWeaponItem();
        processGachaResult(item, poolType);
    }
    if (panelVisible) updatePanelUI();
    updateGachaUI();
    return true;
}

function addGachaResultMessage(msg) {
    gachaResultMessages.push(msg);
    if (gachaResultMessages.length > 10) gachaResultMessages.shift();
    updateGachaUI();
}

function clearGachaMessages() {
    gachaResultMessages = [];
    updateGachaUI();
}

function createGachaPanel() {
    if (gachaPanelDiv) return;
    gachaPanelDiv = document.createElement('div');
    gachaPanelDiv.id = 'gachaPanel';
    gachaPanelDiv.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 520px; background: rgba(18,18,28,0.95); border: 2px solid gold;
        border-radius: 24px; z-index: 10001; display: none; flex-direction: column;
        backdrop-filter: blur(18px); box-shadow: 0 25px 60px rgba(0,0,0,0.8);
        color: white; font-family: monospace; padding: 20px;
    `;
    gachaPanelDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin:0; color: gold;">🎰 Gacha</h3>
            <div id="closeGachaBtn" style="cursor:pointer; font-size:24px;">✖</div>
        </div>
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <button id="petTabBtn" class="gacha-tab active" style="flex:1; padding:8px; border:none; border-radius:12px; background:gold; color:#0a0a12; font-weight:bold; cursor:pointer;">🐾 Pets</button>
            <button id="weaponTabBtn" class="gacha-tab" style="flex:1; padding:8px; border:none; border-radius:12px; background:rgba(255,255,255,0.1); color:#aaa; cursor:pointer;">⚔️ Weapons</button>
        </div>
        <div style="margin-bottom: 12px;">
            <span>💰 Gold: </span><span id="gachaGoldAmount">0</span>
        </div>
        <div style="display: flex; gap: 16px; justify-content: center; margin-bottom: 20px;">
            <button id="singleGachaBtn" style="padding:10px 24px; background:#2a6d4c; border:none; border-radius:20px; color:white; cursor:pointer;">Single Pull (30)</button>
            <button id="tenGachaBtn" style="padding:10px 24px; background:#2a6d4c; border:none; border-radius:20px; color:white; cursor:pointer;">10-Pull (270)</button>
        </div>
        <div style="background:rgba(0,0,0,0.4); border-radius:12px; padding:12px; height:200px; overflow-y: auto;">
            <div id="gachaResultArea" style="font-size:14px;"></div>
        </div>
        <div style="text-align:center; margin-top:12px; font-size:12px; color:#aaa;">Use the tabs above to switch pools · Press R to close</div>
    `;
    document.body.appendChild(gachaPanelDiv);

    document.getElementById('closeGachaBtn').onclick = closeGachaPanel;
    document.getElementById('singleGachaBtn').onclick = () => singleGacha(gachaCurrentTab);
    document.getElementById('tenGachaBtn').onclick = () => tenGacha(gachaCurrentTab);
    document.getElementById('petTabBtn').onclick = () => switchTab('pet');
    document.getElementById('weaponTabBtn').onclick = () => switchTab('weapon');
}

function switchTab(tab) {
    gachaCurrentTab = tab;
    document.querySelectorAll('.gacha-tab').forEach(btn => btn.classList.remove('active'));
    if (tab === 'pet') {
        document.getElementById('petTabBtn').classList.add('active');
        document.getElementById('petTabBtn').style.background = 'gold';
        document.getElementById('petTabBtn').style.color = '#0a0a12';
        document.getElementById('weaponTabBtn').style.background = 'rgba(255,255,255,0.1)';
        document.getElementById('weaponTabBtn').style.color = '#aaa';
    } else {
        document.getElementById('weaponTabBtn').classList.add('active');
        document.getElementById('weaponTabBtn').style.background = 'gold';
        document.getElementById('weaponTabBtn').style.color = '#0a0a12';
        document.getElementById('petTabBtn').style.background = 'rgba(255,255,255,0.1)';
        document.getElementById('petTabBtn').style.color = '#aaa';
    }
    clearGachaMessages();
    updateGachaUI();
}

function updateGachaUI() {
    if (!gachaPanelDiv) return;
    document.getElementById('gachaGoldAmount').innerText = gold;
    const area = document.getElementById('gachaResultArea');
    if (area) {
        area.innerHTML = gachaResultMessages.map(msg => `<p style="margin:4px 0;">${msg}</p>`).join('');
        area.scrollTop = area.scrollHeight;
    }
}

function openGachaPanel() {
    if (!gachaPanelDiv) createGachaPanel();
    if (!gachaCurrentTab) gachaCurrentTab = 'pet';
    switchTab(gachaCurrentTab);
    updateGachaUI();
    gachaPanelDiv.style.display = 'flex';
    gachaPanelOpen = true;
    window.gachaPanelOpen = true;
}

function closeGachaPanel() {
    if (gachaPanelDiv) gachaPanelDiv.style.display = 'none';
    gachaPanelOpen = false;
    window.gachaPanelOpen = false;
    canvas.focus();
}

function initGachaPanel() {
    createGachaPanel();
    document.addEventListener('click', (e) => {
        if (gachaPanelOpen && gachaPanelDiv && !gachaPanelDiv.contains(e.target)) {
            closeGachaPanel();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGachaPanel);
} else {
    initGachaPanel();
}

window.openGachaPanel = openGachaPanel;
window.closeGachaPanel = closeGachaPanel;
window.gachaPanelOpen = gachaPanelOpen;