// ============================================================
//  导入 Three.js
// ============================================================
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ============================================================
//  全局变量
// ============================================================
let prevTime = 0;
let highlightLines = null;

// ============================================================
//  常量与配置
// ============================================================
const WORLD_SIZE = 48;
const WORLD_HEIGHT = 32;
const BLOCK_SIZE = 1;
const COLORS = {
    WATER: '#2980B9',
    SEA: '#1a5276',
    GRASS: '#27AE60',
    DESERT: '#F39C12',
    TRUNK: '#8B4513',
    LEAF: '#228B22',
    DIRT: '#8D6E63',
};
const TYPE_NAMES = ['内陆水', '草地', '沙漠', '海', '树干', '树叶', '泥土'];
const TYPE_COLORS = [COLORS.WATER, COLORS.GRASS, COLORS.DESERT, COLORS.SEA, COLORS.TRUNK, COLORS.LEAF, COLORS.DIRT];
const PLACEABLE_TYPES = [
    { id: 1, name: '草地', color: COLORS.GRASS, icon: '🌿' },
    { id: 2, name: '沙漠', color: COLORS.DESERT, icon: '🏜️' },
    { id: 0, name: '内陆水', color: COLORS.WATER, icon: '💧' },
    { id: 3, name: '海', color: COLORS.SEA, icon: '🌊' },
    { id: 4, name: '树干', color: COLORS.TRUNK, icon: '🪵' },
    { id: 5, name: '树叶', color: COLORS.LEAF, icon: '🍃' },
    { id: 6, name: '泥土', color: COLORS.DIRT, icon: '🟫' },
];

// ============================================================
//  存档管理 (localStorage)
// ============================================================
const SAVE_KEY_PREFIX = 'voxel_save_';
const SAVE_LIST_KEY = 'voxel_save_list';
function getSaveList() { const data = localStorage.getItem(SAVE_LIST_KEY); return data ? JSON.parse(data) : []; }
function setSaveList(list) { localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(list)); }
function getSaveData(name) { const raw = localStorage.getItem(SAVE_KEY_PREFIX + name); return raw ? JSON.parse(raw) : null; }
function setSaveData(name, data) { localStorage.setItem(SAVE_KEY_PREFIX + name, JSON.stringify(data)); let list = getSaveList(); if (!list.includes(name)) { list.push(name); setSaveList(list); } }
function deleteSaveData(name) { localStorage.removeItem(SAVE_KEY_PREFIX + name); let list = getSaveList().filter(n => n !== name); setSaveList(list); }
function generateUniqueName(base) { let list = getSaveList(); if (!list.includes(base)) return base; let i = 1; while (list.includes(base + '(' + i + ')')) i++; return base + '(' + i + ')'; }

// ============================================================
//  PRNG & 噪声
// ============================================================
class SeededRandom { constructor(seed) { this.seed = seed; } next() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; } }
function hashSeed(str) { let h = 0; for (let i=0;i<str.length;i++) { const c=str.charCodeAt(i); h=((h<<5)-h)+c; h=h&h; } return Math.abs(h)%233280; }
function generateRandomSeed() { return Math.floor(Math.random()*1000000).toString(); }
function generateNoiseGrid(w,h,rng) { const grid=[]; for (let y=0;y<h;y++){ const row=[]; for (let x=0;x<w;x++) row.push(rng.next()); grid.push(row); } return grid; }
function lerp(a,b,t){ return a+(b-a)*t; }
function smoothstep(t){ return t*t*(3-2*t); }
function getNoiseValue(grid,gx,gy){ const w=grid[0].length,h=grid.length; gx=Math.max(0,Math.min(w-1,gx)); gy=Math.max(0,Math.min(h-1,gy)); const x0=Math.floor(gx),y0=Math.floor(gy); const x1=Math.min(x0+1,w-1),y1=Math.min(y0+1,h-1); const tx=smoothstep(gx-x0),ty=smoothstep(gy-y0); const v00=grid[y0][x0],v10=grid[y0][x1]; const v01=grid[y1][x0],v11=grid[y1][x1]; const top=lerp(v00,v10,tx); const bottom=lerp(v01,v11,tx); return lerp(top,bottom,ty); }
function fbm(px,py,mapSize,gridSize,octaves,lacunarity,gain,baseGrid){ let value=0, amplitude=0.5, frequency=1, maxAmp=0; for (let i=0;i<octaves;i++){ const gx=(px/mapSize)*(gridSize-1)*frequency; const gy=(py/mapSize)*(gridSize-1)*frequency; value+=amplitude*getNoiseValue(baseGrid,gx,gy); maxAmp+=amplitude; amplitude*=gain; frequency*=lacunarity; } return value/maxAmp; }

// ============================================================
//  连通区域 (后处理) — 适配新ID：沙漠=2
// ============================================================
function getConnectedRegions(terrain, mapSize, height, targetType) {
    const visited = new Uint8Array(terrain.length);
    const regions = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let i=0;i<terrain.length;i++) {
        if (terrain[i]===targetType && !visited[i]) {
            const queue=[i]; visited[i]=1; const region=[];
            while(queue.length) {
                const idx=queue.shift(); region.push(idx);
                const x=idx%mapSize, y=Math.floor(idx/mapSize);
                for (let d of dirs) {
                    const nx=x+d[0], ny=y+d[1];
                    if (nx>=0 && nx<mapSize && ny>=0 && ny<height) {
                        const nidx=ny*mapSize+nx;
                        if (!visited[nidx] && terrain[nidx]===targetType) { visited[nidx]=1; queue.push(nidx); }
                    }
                }
            }
            regions.push(region);
        }
    }
    return regions;
}
function touchesEdge(region,mapSize,height){ for (let idx of region){ const x=idx%mapSize,y=Math.floor(idx/mapSize); if (x===0||x===mapSize-1||y===0||y===height-1) return true; } return false; }
function isSurroundedByDesert(region,terrain,mapSize,height){ for (let idx of region){ const x=idx%mapSize,y=Math.floor(idx/mapSize); const dirs=[[1,0],[-1,0],[0,1],[0,-1]]; for (let d of dirs){ const nx=x+d[0],ny=y+d[1]; if (nx<0||nx>=mapSize||ny<0||ny>=height) return false; const nidx=ny*mapSize+nx; if (terrain[nidx]!==2) return false; } } return true; }
function postProcess2D(terrain, mapSize) {
    const height=mapSize, total=terrain.length;
    const minDesertPatch=Math.floor(total*0.02);
    const desertRegions=getConnectedRegions(terrain,mapSize,height,2);
    if (desertRegions.length>0){
        desertRegions.sort((a,b)=>b.length-a.length);
        const keep=[]; let kept=false;
        for (let i=0;i<desertRegions.length;i++){ if (desertRegions[i].length>=minDesertPatch){ keep.push(i); kept=true; } }
        if (!kept && desertRegions.length>0) keep.push(0);
        for (let i=0;i<desertRegions.length;i++){ if (!keep.includes(i)){ for (let idx of desertRegions[i]) terrain[idx]=1; } }
    }
    let desertCount=0; for (let v of terrain) if (v===2) desertCount++;
    if (desertCount===0) return;
    const maxGrassInDesert=Math.floor(desertCount*0.1);
    const grassRegions=getConnectedRegions(terrain,mapSize,height,1);
    const islands=[];
    for (let region of grassRegions){ if (isSurroundedByDesert(region,terrain,mapSize,height)) islands.push(region); }
    for (let region of islands){
        if (region.length>maxGrassInDesert){
            const shuffled=region.slice(); for (let i=shuffled.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
            const keep=shuffled.slice(0,maxGrassInDesert);
            const remove=shuffled.slice(maxGrassInDesert);
            for (let idx of remove) terrain[idx]=2;
            region=keep;
        }
        if (region.length===0) continue;
        if (region.length===1){ terrain[region[0]]=2; continue; }
        let waterCount=Math.floor(region.length*0.2);
        waterCount=Math.max(1,Math.min(waterCount,region.length-1));
        const shuffledRegion=region.slice(); for (let i=shuffledRegion.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffledRegion[i],shuffledRegion[j]]=[shuffledRegion[j],shuffledRegion[i]]; }
        for (let idx of shuffledRegion.slice(0,waterCount)) terrain[idx]=0;
    }
}
function detectSeas(terrain,mapSize,height){
    const total=terrain.length;
    const threshold=total*0.15;
    const waterRegions=getConnectedRegions(terrain,mapSize,height,0);
    for (let region of waterRegions){ if (region.length>threshold && touchesEdge(region,mapSize,height)){ for (let idx of region) terrain[idx]=3; } }
}

// ============================================================
//  地形生成 — 只有水(0)、草地(1)、沙漠(2)
// ============================================================
function generateTerrain(mapSize, rng) {
    const height = mapSize;
    const total = mapSize * height;
    const gridSize = Math.min(32, Math.max(8, Math.floor(mapSize / 8)));
    const octaves = 4, lacunarity = 2.0, gain = 0.5;
    const baseGrid = generateNoiseGrid(gridSize, gridSize, rng);
    const terrain = new Uint8Array(total);
    const TH_WATER = 0.38;
    const TH_GRASS = 0.50;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < mapSize; x++) {
            const n = fbm(x, y, mapSize, gridSize, octaves, lacunarity, gain, baseGrid);
            if (n < TH_WATER) {
                terrain[y*mapSize + x] = 0;
            } else if (n < TH_GRASS) {
                terrain[y*mapSize + x] = 1;
            } else {
                terrain[y*mapSize + x] = 2;
            }
        }
    }
    postProcess2D(terrain, mapSize);
    detectSeas(terrain, mapSize, height);
    return { terrain, height, mapSize };
}

// ============================================================
//  程序化纹理生成
// ============================================================
function generateBlockTexture(type, size = 32) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    function rng(seed) { let s = seed; return function() { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
    const rand = rng(type * 137 + 42);
    switch (type) {
        case 0: { const base='#2980B9'; ctx.fillStyle=base; ctx.fillRect(0,0,size,size); for (let i=0;i<12;i++){ const x=rand()*size,y=rand()*size,w=2+rand()*6,h=1+rand()*2; ctx.fillStyle=`rgba(255,255,255,${0.2+rand()*0.4})`; ctx.beginPath(); ctx.ellipse(x,y,w,h,0,0,Math.PI*2); ctx.fill(); } ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1; for (let i=0;i<8;i++){ const y=rand()*size; ctx.beginPath(); for (let x=0;x<size;x+=1){ const dx=x/size*Math.PI*4+rand()*2; const dy=Math.sin(dx+i*1.2)*2+Math.sin(dx*0.7+i)*1.5; if (x===0) ctx.moveTo(x,y+dy); else ctx.lineTo(x,y+dy); } ctx.stroke(); } break; }
        case 1: { const base='#4CAF50'; ctx.fillStyle=base; ctx.fillRect(0,0,size,size); const soilH=size*0.3; ctx.fillStyle='#8D6E63'; ctx.fillRect(0,size-soilH,size,soilH); for (let i=0;i<30;i++){ const x=rand()*size,y=size-soilH+rand()*soilH; ctx.fillStyle=`rgba(121,85,72,${0.3+rand()*0.5})`; ctx.fillRect(x,y,1+rand()*2,1+rand()*2); } for (let i=0;i<60;i++){ const x=rand()*size,y=rand()*(size-soilH),len=3+rand()*6,angle=(rand()-0.5)*0.8; const shade=0.6+rand()*0.4; ctx.strokeStyle=`rgb(60,${Math.floor(160+shade*80)},40)`; ctx.lineWidth=1+rand()*1.5; ctx.beginPath(); ctx.moveTo(x,y); const endX=x+Math.sin(angle)*len, endY=y-len; ctx.quadraticCurveTo(x+Math.sin(angle+0.3)*len*0.5,y-len*0.7,endX,endY); ctx.stroke(); } for (let i=0;i<4;i++){ const x=rand()*size,y=rand()*(size-soilH),colors=['#FFD54F','#FF8A65','#CE93D8','#EF5350']; ctx.fillStyle=colors[Math.floor(rand()*colors.length)]; ctx.beginPath(); ctx.arc(x,y,1+rand()*1.5,0,Math.PI*2); ctx.fill(); } break; }
        case 2: { const base='#F9A825'; ctx.fillStyle=base; ctx.fillRect(0,0,size,size); for (let i=0;i<120;i++){ const x=rand()*size,y=rand()*size,shade=0.3+rand()*0.7,r=Math.floor(180+shade*60),g=Math.floor(120+shade*50),b=Math.floor(40+shade*30); ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(x,y,1+rand()*2,1+rand()*2); } for (let i=0;i<5;i++){ const y=rand()*size; ctx.strokeStyle=`rgba(160,100,40,${0.1+rand()*0.2})`; ctx.lineWidth=1; ctx.beginPath(); for (let x=0;x<size;x+=1){ const dy=Math.sin(x/size*Math.PI*6+i*2.1)*1.5; if (x===0) ctx.moveTo(x,y+dy); else ctx.lineTo(x,y+dy); } ctx.stroke(); } break; }
        case 3: { const base='#0D47A1'; ctx.fillStyle=base; ctx.fillRect(0,0,size,size); for (let i=0;i<15;i++){ const x=rand()*size,y=rand()*size,w=3+rand()*8,h=1+rand()*3; ctx.fillStyle=`rgba(100,200,255,${0.15+rand()*0.35})`; ctx.beginPath(); ctx.ellipse(x,y,w,h,0,0,Math.PI*2); ctx.fill(); } for (let i=0;i<6;i++){ const y=rand()*size; ctx.strokeStyle=`rgba(0,20,60,${0.2+rand()*0.3})`; ctx.lineWidth=1+rand()*1.5; ctx.beginPath(); for (let x=0;x<size;x+=1){ const dy=Math.sin(x/size*Math.PI*5+i*1.8)*2+Math.sin(x/size*Math.PI*2+i*0.7)*1.5; if (x===0) ctx.moveTo(x,y+dy); else ctx.lineTo(x,y+dy); } ctx.stroke(); } break; }
        case 4: { const base='#6D4C41'; ctx.fillStyle=base; ctx.fillRect(0,0,size,size); for (let i=0;i<12;i++){ const y=rand()*size,shade=0.3+rand()*0.5,r=Math.floor(80+shade*60),g=Math.floor(50+shade*50),b=Math.floor(30+shade*40); ctx.strokeStyle=`rgb(${r},${g},${b})`; ctx.lineWidth=1+rand()*2; ctx.beginPath(); for (let x=0;x<size;x+=1){ const dy=Math.sin(x/size*Math.PI*3+i*1.5)*1.5+Math.sin(x/size*Math.PI*7+i*2.3)*0.8; if (x===0) ctx.moveTo(x,y+dy); else ctx.lineTo(x,y+dy); } ctx.stroke(); } for (let i=0;i<2;i++){ const x=rand()*size,y=rand()*size,rad=2+rand()*4; ctx.fillStyle=`rgba(50,30,20,${0.3+rand()*0.4})`; ctx.beginPath(); ctx.arc(x,y,rad,0,Math.PI*2); ctx.fill(); ctx.fillStyle=`rgba(90,60,40,${0.2+rand()*0.3})`; ctx.beginPath(); ctx.arc(x+rand()*2-1,y+rand()*2-1,rad*0.5,0,Math.PI*2); ctx.fill(); } break; }
        case 5: { const base='#2E7D32'; ctx.fillStyle=base; ctx.fillRect(0,0,size,size); for (let i=0;i<25;i++){ const x=rand()*size,y=rand()*size,w=3+rand()*6,h=2+rand()*4,angle=rand()*Math.PI*2,shade=0.5+rand()*0.5; ctx.fillStyle=`rgba(50,${Math.floor(130+shade*80)},40,${0.5+rand()*0.4})`; ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.beginPath(); ctx.ellipse(0,0,w,h,0,0,Math.PI*2); ctx.fill(); ctx.restore(); } for (let i=0;i<15;i++){ const x=rand()*size,y=rand()*size,len=2+rand()*5,angle=rand()*Math.PI*2; ctx.strokeStyle=`rgba(20,60,20,${0.2+rand()*0.3})`; ctx.lineWidth=0.5; ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(-len/2,0); ctx.lineTo(len/2,0); ctx.stroke(); ctx.restore(); } for (let i=0;i<20;i++){ const x=rand()*size,y=rand()*size; ctx.fillStyle=`rgba(180,255,160,${0.1+rand()*0.2})`; ctx.fillRect(x,y,1+rand()*2,1+rand()*2); } break; }
        case 6: { const base='#8D6E63'; ctx.fillStyle=base; ctx.fillRect(0,0,size,size); for (let i=0;i<150;i++){ const x=rand()*size,y=rand()*size,shade=0.2+rand()*0.6,r=Math.floor(120+shade*60),g=Math.floor(80+shade*50),b=Math.floor(50+shade*40); ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(x,y,1+rand()*2,1+rand()*2); } for (let i=0;i<30;i++){ const x=rand()*size,y=rand()*size; ctx.fillStyle=`rgba(60,40,30,${0.2+rand()*0.4})`; ctx.beginPath(); ctx.arc(x,y,1+rand()*3,0,Math.PI*2); ctx.fill(); } for (let i=0;i<20;i++){ const x=rand()*size,y=rand()*size; ctx.fillStyle=`rgba(180,160,130,${0.15+rand()*0.25})`; ctx.fillRect(x,y,1+rand()*2,1+rand()*2); } break; }
        default: { ctx.fillStyle='#888'; ctx.fillRect(0,0,size,size); }
    }
    for (let i=0;i<20;i++){ const x=rand()*size,y=rand()*size; ctx.fillStyle=`rgba(255,255,255,${0.03+rand()*0.05})`; ctx.fillRect(x,y,1,1); }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

// ============================================================
//  Three.js 场景变量
// ============================================================
const container = document.getElementById('three-container');
const hudCoord = document.getElementById('coordDisplay');
const hudBlockName = document.getElementById('blockName');
const hudBlockColor = document.getElementById('blockColorPreview');
const hudSeed = document.getElementById('seedDisplay');
const hotbarEl = document.getElementById('hotbar');
const messageEl = document.getElementById('message');

let scene, camera, renderer, controls;
let worldData = null;
let worldMapSize = WORLD_SIZE;
let worldHeight = WORLD_HEIGHT;
let seedStr = '';
let meshGroup = null;
let selectedSlot = 0;
let msgTimeout = null;
const textureMap = {};
const player = { position: new THREE.Vector3(WORLD_SIZE/2, 20, WORLD_SIZE/2), velocity: new THREE.Vector3(0,0,0), onGround: false };
const keys = {};

function showMessage(text, duration=2000) {
    messageEl.textContent = text;
    messageEl.classList.add('show');
    if (msgTimeout) clearTimeout(msgTimeout);
    msgTimeout = setTimeout(()=>{ messageEl.classList.remove('show'); }, duration);
}

// ============================================================
//  UI 控制
// ============================================================
const menuMain = document.getElementById('menu-main');
const menuSaves = document.getElementById('menu-saves');
const menuNewSave = document.getElementById('menu-new-save');
const saveListContainer = document.getElementById('save-list-container');
const btnStart = document.getElementById('btn-start');
const btnExit = document.getElementById('btn-exit');
const btnBackMain = document.getElementById('btn-back-main');
const btnNewSave = document.getElementById('btn-new-save');
const btnCreateSave = document.getElementById('btn-create-save');
const btnCancelNew = document.getElementById('btn-cancel-new');
const inputSaveName = document.getElementById('input-save-name');
const inputGameMode = document.getElementById('input-game-mode');
const inputSeed = document.getElementById('input-seed');

let currentSaveName = '';
let currentGameMode = 'creative';
let currentSeed = '';

function showMainMenu() { menuMain.classList.remove('hidden'); menuSaves.classList.add('hidden'); menuNewSave.classList.add('hidden'); }
function showSavesMenu() { menuMain.classList.add('hidden'); menuSaves.classList.remove('hidden'); menuNewSave.classList.add('hidden'); renderSaveList(); }
function showNewSaveDialog() { menuMain.classList.add('hidden'); menuSaves.classList.add('hidden'); menuNewSave.classList.remove('hidden'); inputSaveName.value='新游戏'; inputSeed.value=''; inputGameMode.value='creative'; }
function hideAllMenus() { menuMain.classList.add('hidden'); menuSaves.classList.add('hidden'); menuNewSave.classList.add('hidden'); }

function renderSaveList() {
    const list = getSaveList();
    if (list.length===0) { saveListContainer.innerHTML = `<div style="padding:20px;color:#8899aa;">📭 暂无存档，请新建</div>`; return; }
    let html = '';
    list.forEach(name => {
        const data = getSaveData(name);
        if (!data) return;
        const mode = data.mode || 'creative';
        const seed = data.seed || '随机';
        const pos = data.playerPos ? `${Math.round(data.playerPos.x)}, ${Math.round(data.playerPos.y)}, ${Math.round(data.playerPos.z)}` : '未知';
        html += `
            <div class="save-item">
                <div class="info">
                    <div class="name">📁 ${name}</div>
                    <div class="detail">模式: ${mode==='creative'?'创造':'生存'} ｜ 种子: ${seed} ｜ 位置: ${pos}</div>
                </div>
                <div style="display:flex; gap:4px;">
                    <button class="btn-load" data-save="${name}">加载</button>
                    <button class="btn-delete" data-save="${name}" title="删除存档">🗑️</button>
                </div>
            </div>
        `;
    });
    saveListContainer.innerHTML = html;
    saveListContainer.querySelectorAll('.btn-load').forEach(btn => {
        btn.addEventListener('click', (e) => { const name = btn.dataset.save; loadSave(name); });
    });
    saveListContainer.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const name = btn.dataset.save;
            if (confirm(`确定要删除存档「${name}」吗？此操作不可恢复！`)) { deleteSave(name); }
        });
    });
}

function deleteSave(name) {
    if (currentSaveName === name) {
        if (confirm('你正在游玩该存档，删除后将返回主菜单。是否继续？')) {
            deleteSaveData(name);
            currentSaveName = '';
            location.reload();
        }
        return;
    }
    deleteSaveData(name);
    renderSaveList();
    showMessage(`🗑️ 已删除存档「${name}」`, 1500);
}

function loadSave(name) {
    const data = getSaveData(name);
    if (!data) { alert('存档不存在！'); return; }
    currentSaveName = name;
    currentSeed = data.seed || '';
    currentGameMode = data.mode || 'creative';
    startGameWithSeed(currentSeed, data.playerPos || null);
}

function createNewSave() {
    let name = inputSaveName.value.trim() || '新游戏';
    const uniqueName = generateUniqueName(name);
    const mode = inputGameMode.value;
    let seed = inputSeed.value.trim() || '';
    if (!seed) seed = Math.floor(Math.random()*1000000).toString();
    const saveData = { mode, seed, playerPos: null, created: Date.now() };
    setSaveData(uniqueName, saveData);
    currentSaveName = uniqueName;
    currentSeed = seed;
    currentGameMode = mode;
    startGameWithSeed(seed, null);
}

function startGameWithSeed(seed, playerPos) {
    hideAllMenus();
    sessionStorage.setItem('voxel_launch_seed', seed);
    sessionStorage.setItem('voxel_launch_pos', playerPos ? JSON.stringify(playerPos) : 'null');
    sessionStorage.setItem('voxel_launch_save', currentSaveName);
    sessionStorage.setItem('voxel_launch_mode', currentGameMode); // ★ 保存模式
    window.location.reload();
}

btnStart.addEventListener('click', showSavesMenu);
btnExit.addEventListener('click', ()=>{ window.close(); alert('如果页面未关闭，请手动关闭标签页。'); });
btnBackMain.addEventListener('click', showMainMenu);
btnNewSave.addEventListener('click', showNewSaveDialog);
btnCancelNew.addEventListener('click', showSavesMenu);
btnCreateSave.addEventListener('click', createNewSave);

// ★ 从 sessionStorage 恢复启动参数
const launchSeed = sessionStorage.getItem('voxel_launch_seed');
const launchPos = sessionStorage.getItem('voxel_launch_pos');
const launchSave = sessionStorage.getItem('voxel_launch_save');
const launchMode = sessionStorage.getItem('voxel_launch_mode');
if (launchSeed !== null) {
    sessionStorage.removeItem('voxel_launch_seed');
    sessionStorage.removeItem('voxel_launch_pos');
    sessionStorage.removeItem('voxel_launch_save');
    sessionStorage.removeItem('voxel_launch_mode');
    hideAllMenus();
    const pos = launchPos !== 'null' ? JSON.parse(launchPos) : null;
    currentGameMode = launchMode || 'creative'; // ★ 恢复模式
    currentSaveName = launchSave || '';
    initGame(launchSeed, pos);
} else {
    showMainMenu();
}

// ============================================================
//  游戏初始化
// ============================================================
function initGame(seed, playerPos) {
    seedStr = seed || generateRandomSeed();
    for (let i=0; i<=6; i++) textureMap[i] = generateBlockTexture(i, 32);
    const seedNum = hashSeed(seedStr);
    const rng = new SeededRandom(seedNum);
    const result = generateTerrain(WORLD_SIZE, rng);
    worldMapSize = result.mapSize;
    worldHeight = result.height;
    initThree();
    buildWorld(result.terrain, worldMapSize, worldHeight, playerPos);
    hudSeed.textContent = `🌱 种子: ${seedStr}`;
    hotbarEl.innerHTML = '';
    PLACEABLE_TYPES.forEach((item, i) => {
        const slot = document.createElement('div');
        slot.className = 'slot' + (i===selectedSlot ? ' active' : '');
        const tex = textureMap[item.id] || textureMap[1];
        const dataUrl = tex.image.toDataURL ? tex.image.toDataURL() : '';
        slot.innerHTML = `<div class="block-preview" style="background-image: url('${dataUrl}'); background-size: cover;"></div><span class="key-hint">${i+1}</span>`;
        slot.title = `${item.icon} ${item.name}`;
        slot.addEventListener('click', ()=>{
            selectedSlot = i;
            updateHUD();
            showMessage(`🔨 选择: ${item.icon} ${item.name}`, 600);
        });
        hotbarEl.appendChild(slot);
    });
    updateHUD();
    showMessage('🎮 游戏已加载！', 2000);

    // === 加载生存模式（如果当前是生存模式） ===
    console.log('当前游戏模式:', currentGameMode); // 调试
    if (currentGameMode === 'survival') {
        import('./survival.js').then(module => {
            module.initSurvival({
                player,
                scene,
                camera,
                controls,
                worldData,
                worldMapSize,
                worldHeight,
                updatePlayer,
            });
        }).catch(err => console.error('加载生存模式失败:', err));
    }
}

// ============================================================
//  Three.js 初始化 (不变)
// ============================================================
function initThree() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 40, 80);
    camera = new THREE.PerspectiveCamera(70, w/h, 0.1, 200);
    camera.position.copy(player.position);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    controls = new PointerLockControls(camera, document.body);
    controls.addEventListener('lock', ()=>{ hideAllMenus(); });
    controls.addEventListener('unlock', ()=>{ showMessage('🔓 鼠标解锁', 1500); });
    
    const ambient = new THREE.AmbientLight(0x88aacc, 0.8);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3a5f3a, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
    sun.position.set(60, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    const d = 50;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8888ff, 0.5);
    fill.position.set(-40, 30, -60);
    scene.add(fill);
    const backFill = new THREE.DirectionalLight(0x88aaff, 0.3);
    backFill.position.set(0, 10, -80);
    scene.add(backFill);
    
    const grid = new THREE.GridHelper(100, 20, 0x88aacc, 0x446688);
    grid.position.y = -0.5;
    scene.add(grid);

    // 瞄准高亮边框
    const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001, 1.001, 1.001));
    const edgeMat = new THREE.LineBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.9,
    });
    highlightLines = new THREE.LineSegments(edgeGeo, edgeMat);
    highlightLines.visible = false;
    scene.add(highlightLines);

    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('contextmenu', (e)=>e.preventDefault());
    renderer.domElement.addEventListener('click', ()=>{
        if (!controls.isLocked) controls.lock();
    });
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    animate();
}

function onResize() { /* 不变 */ }

// ============================================================
//  地形构建 (不变)
// ============================================================
function buildWorld(terrainData, mapSize, height, initPlayerPos) {
    // ... 与之前相同，不变 ...
}
function buildWorldMeshes(world, mapSize, height, initPlayerPos) { /* 不变 */ }
function rebuildWorld() { /* 不变 */ }

// ============================================================
//  方块操作 (不变)
// ============================================================
// ... getBlock, setBlock, getTargetBlock, breakBlock, placeBlock, updateHUD 保持不变 ...

// ============================================================
//  物理与事件 (不变)
// ============================================================
function updatePlayer(delta) { /* 不变 */ }
function collidesWithWorld(pos) { /* 不变 */ }
function onKeyDown(e) { /* 不变 */ }
function onKeyUp(e) { /* 不变 */ }
function onMouseDown(e) { /* 不变 */ }

// ============================================================
//  动画循环 (不变)
// ============================================================
function animate() { /* 不变 */ }

console.log('✅ 体素世界完整版已加载 (修复生存模式启动)');