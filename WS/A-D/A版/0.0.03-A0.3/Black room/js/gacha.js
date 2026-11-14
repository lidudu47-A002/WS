// ---------- 卡池抽奖系统 ----------
let gachaPanelOpen = false;
let gachaPanelDiv = null;
let gachaResultQueue = [];

// 奖品定义
const GACHA_ITEMS = {
    monkey: { type: 'pet', id: 'monkey', name: 'Monkey', icon: '素材/宠物/宠物样式/monkey.png', value: 0 },
    point618: { type: 'pet', id: 'point618', name: '0.618', icon: '素材/宠物/宠物样式/0.618.png', value: 0 },
    horror: { type: 'pet', id: 'horror', name: 'Horror', icon: '素材/宠物/宠物样式/horror.png', value: 0 },
    xiaoe: { type: 'pet', id: 'xiaoe', name: '小e', icon: '素材/宠物/宠物样式/小e.png', value: 0 },
    geometry: { type: 'material', id: 'geometry', name: '几何图', icon: '素材/宠物/升级物/几何图.png', value: 0 },
    banana: { type: 'material', id: 'banana', name: '香蕉', icon: '素材/宠物/升级物/香蕉.png', value: 0 },
    eyeball: { type: 'material', id: 'eyeball', name: '眼球', icon: '素材/宠物/升级物/眼球.png', value: 0 }
};

// 概率设置：宠物总概率10% (各2.5%)，升级物总概率90% (各30%)
const PET_LIST = ['monkey', 'point618', 'horror', 'xiaoe'];
const MATERIAL_LIST = ['geometry', 'banana', 'eyeball'];

function getRandomGachaItem() {
    let r = Math.random();
    if (r < 0.1) {
        let idx = Math.floor(Math.random() * PET_LIST.length);
        return GACHA_ITEMS[PET_LIST[idx]];
    } else {
        let idx = Math.floor(Math.random() * MATERIAL_LIST.length);
        return GACHA_ITEMS[MATERIAL_LIST[idx]];
    }
}

function getTenPullItems() {
    let items = [];
    let hasPet = false;
    for (let i = 0; i < 10; i++) {
        let item = getRandomGachaItem();
        if (item.type === 'pet') hasPet = true;
        items.push(item);
    }
    if (!hasPet) {
        let idx = Math.floor(Math.random() * 10);
        let petIdx = Math.floor(Math.random() * PET_LIST.length);
        items[idx] = GACHA_ITEMS[PET_LIST[petIdx]];
    }
    return items;
}

function singleGacha() {
    if (gold < 30) {
        showInventoryMessage('金币不足，需要30金币');
        return false;
    }
    gold -= 30;
    let item = getRandomGachaItem();
    processGachaResult(item);
    if (panelVisible) updatePanelUI();
    return true;
}

function tenGacha() {
    if (gold < 270) {
        showInventoryMessage('金币不足，需要270金币');
        return false;
    }
    gold -= 270;
    let items = getTenPullItems();
    for (let item of items) {
        processGachaResult(item);
    }
    if (panelVisible) updatePanelUI();
    return true;
}

function processGachaResult(item) {
    if (item.type === 'pet') {
        if (window.ownedPets && window.ownedPets.includes(item.id)) {
            gold += 100;
            showInventoryMessage(`重复宠物 ${item.name}，补偿100金币`);
            addGachaResultMessage(`重复宠物 ${item.name} → +100金币`);
        } else {
            if (typeof addPet === 'function') {
                addPet(item.id);
                showInventoryMessage(`获得新宠物 ${item.name}！`);
                addGachaResultMessage(`获得新宠物 ${item.name}！`);
            } else {
                showInventoryMessage(`获得 ${item.name}，但宠物系统未加载`);
                addGachaResultMessage(`获得 ${item.name}（宠物系统未加载）`);
            }
        }
    } else {
        if (typeof addItem === 'function') {
            addItem(item.id, 1);
            showInventoryMessage(`获得 ${item.name} x1`);
            addGachaResultMessage(`获得 ${item.name} x1`);
        } else {
            showInventoryMessage(`获得 ${item.name}，但物品栏未加载`);
            addGachaResultMessage(`获得 ${item.name}（未加载）`);
        }
    }
}

let gachaResultMessages = [];
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
        width: 500px; background: rgba(20,20,30,0.95); border: 2px solid gold;
        border-radius: 16px; z-index: 10001; display: none; flex-direction: column;
        backdrop-filter: blur(8px); box-shadow: 0 0 30px black; color: white;
        font-family: monospace; padding: 16px;
    `;
    gachaPanelDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin:0;">🎰 抽卡机</h3>
            <div id="closeGachaBtn" style="cursor:pointer; font-size:24px;">✖</div>
        </div>
        <div style="margin-bottom: 12px;">
            <span>💰 金币: </span><span id="gachaGoldAmount">0</span>
        </div>
        <div style="display: flex; gap: 16px; justify-content: center; margin-bottom: 20px;">
            <button id="singleGachaBtn" style="padding:8px 20px; background:#2a6d4c; border:none; border-radius:20px; color:white; cursor:pointer;">单抽 (30)</button>
            <button id="tenGachaBtn" style="padding:8px 20px; background:#2a6d4c; border:none; border-radius:20px; color:white; cursor:pointer;">十连抽 (270)</button>
        </div>
        <div style="background:#0a0a12; border-radius:12px; padding:12px; height:200px; overflow-y: auto;">
            <div id="gachaResultArea" style="font-size:14px;"></div>
        </div>
        <div style="text-align:center; margin-top:12px; font-size:12px; color:#aaa;">按 E 关闭</div>
    `;
    document.body.appendChild(gachaPanelDiv);

    document.getElementById('closeGachaBtn').onclick = closeGachaPanel;
    document.getElementById('singleGachaBtn').onclick = () => {
        if (singleGacha()) updateGachaUI();
    };
    document.getElementById('tenGachaBtn').onclick = () => {
        if (tenGacha()) updateGachaUI();
    };
}

function updateGachaUI() {
    if (!gachaPanelDiv) return;
    const goldSpan = document.getElementById('gachaGoldAmount');
    if (goldSpan) goldSpan.innerText = gold;
    const resultArea = document.getElementById('gachaResultArea');
    if (resultArea) {
        resultArea.innerHTML = gachaResultMessages.map(msg => `<p style="margin:4px 0;">${msg}</p>`).join('');
        resultArea.scrollTop = resultArea.scrollHeight;
    }
}

function openGachaPanel() {
    if (!gachaPanelDiv) createGachaPanel();
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

function initGacha() {
    createGachaPanel();
    document.addEventListener('click', (e) => {
        if (gachaPanelOpen && gachaPanelDiv && !gachaPanelDiv.contains(e.target)) {
            closeGachaPanel();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGacha);
} else {
    initGacha();
}

window.openGachaPanel = openGachaPanel;
window.closeGachaPanel = closeGachaPanel;
window.gachaPanelOpen = gachaPanelOpen;