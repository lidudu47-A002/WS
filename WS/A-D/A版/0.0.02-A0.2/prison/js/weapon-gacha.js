// ---------- 武器卡池抽奖系统 ----------
let weaponGachaPanelOpen = false;
let weaponGachaPanelDiv = null;
let weaponGachaResultMessages = [];

// 奖品定义（仅用于显示）
const WEAPON_GACHA_ITEMS = {
    // 武器（6种）
    sword: { type: 'weapon', id: 'sword', name: '铁剑', icon: '素材/装备/武器/铁剑.png', value: 0 },
    bow: { type: 'weapon', id: 'bow', name: '弓', icon: '素材/装备/武器/弓.png', value: 0 },
    frostBlade: { type: 'weapon', id: 'frostBlade', name: 'F·B 冰霜之刃', icon: '素材/装备/武器/冰霜之刃.png', value: 0 },
    firewand: { type: 'weapon', id: 'firewand', name: '火焰法杖', icon: '素材/装备/武器/火焰法杖.png', value: 0 },
    shadowDagger: { type: 'weapon', id: 'shadowDagger', name: '🗡️ 暗影匕首', icon: '素材/装备/武器/暗影匕首.png', value: 0 },
    thunderHammer: { type: 'weapon', id: 'thunderHammer', name: '⚡ 雷霆锤', icon: '素材/装备/武器/雷霆锤.png', value: 0 },
    // 升级物（3种）
    geometry: { type: 'material', id: 'geometry', name: '几何图', icon: '素材/宠物/升级物/几何图.png', value: 0 },
    banana: { type: 'material', id: 'banana', name: '香蕉', icon: '素材/宠物/升级物/香蕉.png', value: 0 },
    eyeball: { type: 'material', id: 'eyeball', name: '眼球', icon: '素材/宠物/升级物/眼球.png', value: 0 }
};

// 武器列表（用于概率）
const WEAPON_LIST = ['sword', 'bow', 'frostBlade', 'firewand', 'shadowDagger', 'thunderHammer'];
// 升级物列表 - 改名避免与 gacha.js 冲突
const WEAPON_MATERIAL_LIST = ['geometry', 'banana', 'eyeball'];

// 每个武器概率 1%，升级物均分剩余 94%
function getRandomWeaponGachaItem() {
    let r = Math.random();
    if (r < 0.06) {
        // 武器总概率 6%
        let idx = Math.floor(Math.random() * WEAPON_LIST.length);
        return WEAPON_GACHA_ITEMS[WEAPON_LIST[idx]];
    } else {
        // 升级物总概率 94%
        let idx = Math.floor(Math.random() * WEAPON_MATERIAL_LIST.length);
        return WEAPON_GACHA_ITEMS[WEAPON_MATERIAL_LIST[idx]];
    }
}

// 处理抽卡结果
function processWeaponGachaResult(item) {
    if (item.type === 'weapon') {
        // 检查是否已拥有该武器（物品栏中是否存在且未满？武器maxStack=1，所以存在即拥有）
        let existing = inventorySlots.some(slot => slot && slot.type === item.id);
        if (existing) {
            // 重复武器，给予金币补偿
            let compensation = (item.id === 'firewand') ? 200 : 100;
            gold += compensation;
            showInventoryMessage(`重复武器 ${item.name}，补偿 ${compensation} 金币`);
            addWeaponGachaResultMessage(`重复武器 ${item.name} → +${compensation}金币`);
        } else {
            // 新武器，直接添加
            addItem(item.id, 1);
            showInventoryMessage(`获得新武器 ${item.name}！`);
            addWeaponGachaResultMessage(`获得新武器 ${item.name}！`);
        }
    } else {
        // 升级物，直接添加（可叠加）
        addItem(item.id, 1);
        showInventoryMessage(`获得 ${item.name} x1`);
        addWeaponGachaResultMessage(`获得 ${item.name} x1`);
    }
}

function singleWeaponGacha() {
    if (gold < 30) {
        showInventoryMessage('金币不足，需要30金币');
        return false;
    }
    gold -= 30;
    let item = getRandomWeaponGachaItem();
    processWeaponGachaResult(item);
    if (panelVisible) updatePanelUI();
    return true;
}

function tenWeaponGacha() {
    if (gold < 270) {
        showInventoryMessage('金币不足，需要270金币');
        return false;
    }
    gold -= 270;
    for (let i = 0; i < 10; i++) {
        let item = getRandomWeaponGachaItem();
        processWeaponGachaResult(item);
    }
    if (panelVisible) updatePanelUI();
    return true;
}

// 消息管理
function addWeaponGachaResultMessage(msg) {
    weaponGachaResultMessages.push(msg);
    if (weaponGachaResultMessages.length > 10) weaponGachaResultMessages.shift();
    updateWeaponGachaUI();
}

function clearWeaponGachaMessages() {
    weaponGachaResultMessages = [];
    updateWeaponGachaUI();
}

// 创建面板
function createWeaponGachaPanel() {
    if (weaponGachaPanelDiv) return;
    weaponGachaPanelDiv = document.createElement('div');
    weaponGachaPanelDiv.id = 'weaponGachaPanel';
    weaponGachaPanelDiv.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 500px; background: rgba(20,20,30,0.95); border: 2px solid #ffaa00;
        border-radius: 16px; z-index: 10002; display: none; flex-direction: column;
        backdrop-filter: blur(8px); box-shadow: 0 0 30px black; color: white;
        font-family: monospace; padding: 16px;
    `;
    weaponGachaPanelDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin:0;">🎯 武器卡池</h3>
            <div id="closeWeaponGachaBtn" style="cursor:pointer; font-size:24px;">✖</div>
        </div>
        <div style="margin-bottom: 12px;">
            <span>💰 金币: </span><span id="weaponGachaGoldAmount">0</span>
        </div>
        <div style="display: flex; gap: 16px; justify-content: center; margin-bottom: 20px;">
            <button id="singleWeaponGachaBtn" style="padding:8px 20px; background:#2a6d4c; border:none; border-radius:20px; color:white; cursor:pointer;">单抽 (30)</button>
            <button id="tenWeaponGachaBtn" style="padding:8px 20px; background:#2a6d4c; border:none; border-radius:20px; color:white; cursor:pointer;">十连抽 (270)</button>
        </div>
        <div style="background:#0a0a12; border-radius:12px; padding:12px; height:200px; overflow-y: auto;">
            <div id="weaponGachaResultArea" style="font-size:14px;"></div>
        </div>
        <div style="text-align:center; margin-top:12px; font-size:12px; color:#aaa;">按 R 关闭</div>
    `;
    document.body.appendChild(weaponGachaPanelDiv);

    document.getElementById('closeWeaponGachaBtn').onclick = closeWeaponGachaPanel;
    document.getElementById('singleWeaponGachaBtn').onclick = () => {
        if (singleWeaponGacha()) updateWeaponGachaUI();
    };
    document.getElementById('tenWeaponGachaBtn').onclick = () => {
        if (tenWeaponGacha()) updateWeaponGachaUI();
    };
}

function updateWeaponGachaUI() {
    if (!weaponGachaPanelDiv) return;
    const goldSpan = document.getElementById('weaponGachaGoldAmount');
    if (goldSpan) goldSpan.innerText = gold;
    const resultArea = document.getElementById('weaponGachaResultArea');
    if (resultArea) {
        resultArea.innerHTML = weaponGachaResultMessages.map(msg => `<p style="margin:4px 0;">${msg}</p>`).join('');
        resultArea.scrollTop = resultArea.scrollHeight;
    }
}

function openWeaponGachaPanel() {
    if (!weaponGachaPanelDiv) createWeaponGachaPanel();
    updateWeaponGachaUI();
    weaponGachaPanelDiv.style.display = 'flex';
    weaponGachaPanelOpen = true;
    window.weaponGachaPanelOpen = true;
}

function closeWeaponGachaPanel() {
    if (weaponGachaPanelDiv) weaponGachaPanelDiv.style.display = 'none';
    weaponGachaPanelOpen = false;
    window.weaponGachaPanelOpen = false;
    canvas.focus();
}

// 初始化（注册事件）
function initWeaponGacha() {
    createWeaponGachaPanel();
    // 点击外部关闭
    document.addEventListener('click', (e) => {
        if (weaponGachaPanelOpen && weaponGachaPanelDiv && !weaponGachaPanelDiv.contains(e.target)) {
            closeWeaponGachaPanel();
        }
    });
    // 键盘事件由 game-loop.js 处理 R 键，但这里也保留一个备用（但会被 game-loop 拦截，所以不重复绑定）
    // 实际上，我们在 game-loop.js 中已处理 R 键，所以这里无需再绑定。
    // 暴露全局函数供 game-loop 调用
    window.openWeaponGachaPanel = openWeaponGachaPanel;
    window.closeWeaponGachaPanel = closeWeaponGachaPanel;
    window.weaponGachaPanelOpen = weaponGachaPanelOpen;
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeaponGacha);
} else {
    initWeaponGacha();
}