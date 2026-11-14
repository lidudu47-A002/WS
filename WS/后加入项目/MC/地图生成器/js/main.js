// ----- 导入 Three.js 相关模块 -----
import { COLORS, TYPE_NAMES, TYPE_ICONS, TYPE_COLORS, buildVoxelTerrainFlat, buildVoxelTerrainSphere, clearVoxelScene, resizeThree, initThree, threeContainer } from './three-voxel.js';

// ----- DOM refs -----
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const sizeSlider = document.getElementById('sizeSlider');
const sizeDisplay = document.getElementById('sizeDisplay');
const sizeUnit = document.getElementById('sizeUnit');
const sizeLabel = document.getElementById('sizeLabel');
const dimensionSelect = document.getElementById('dimensionSelect');
const shapeSelect = document.getElementById('shapeSelect');
const shapeGroup = document.getElementById('shapeGroup');
const yScaleSlider = document.getElementById('yScaleSlider');
const yScaleDisplay = document.getElementById('yScaleDisplay');
const yScaleGroup = document.getElementById('yScaleGroup');
const generateBtn = document.getElementById('generateBtn');
const statsInfo = document.getElementById('statsInfo');
const seedDisplay = document.getElementById('seedDisplay');
const seedInput = document.getElementById('seedInput');
const applySeedBtn = document.getElementById('applySeedBtn');
const placeholder = document.getElementById('placeholder');

// Tooltip
const tooltip = document.getElementById('tooltip');
const tipDot = document.getElementById('tipDot');
const tipCoord = document.getElementById('tipCoord');
const tipType = document.getElementById('tipType');

// 当前数据
let currentTerrain = null;
let currentOasisMark = null;
let currentMapSize = 150;
let currentHeight = 150;
let currentDimension = '2d';

// ----- Seedable PRNG -----
class SeededRandom {
    constructor(seed) { this.seed = seed; }
    next() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
    reset(seed) { this.seed = seed; }
}
let prng = new SeededRandom(0);

function hashSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + c;
        hash = hash & hash; }
    hash = Math.abs(hash);
    return hash % 233280;
}

function generateRandomSeed() {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let r = '';
    for (let i = 0; i < 5; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
    return r;
}

function isValidSeed(str) { return /^[a-z0-9]{1,7}$/.test(str); }
let currentSeedStr = '';

// ----- 噪声生成 -----
function generateNoiseGrid(w, h, rng) {
    const grid = [];
    for (let y = 0; y < h; y++) { const row = []; for (let x = 0; x < w; x++) row.push(rng.next());
        grid.push(row); }
    return grid;
}

function lerp(a, b, t) { return a + (b - a) * t; }

function smoothstep(t) { return t * t * (3 - 2 * t); }

function getNoiseValue(grid, gx, gy) {
    const w = grid[0].length,
        h = grid.length;
    gx = Math.max(0, Math.min(w - 1, gx));
    gy = Math.max(0, Math.min(h - 1, gy));
    const x0 = Math.floor(gx),
        y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, w - 1),
        y1 = Math.min(y0 + 1, h - 1);
    const tx = smoothstep(gx - x0),
        ty = smoothstep(gy - y0);
    const v00 = grid[y0][x0],
        v10 = grid[y0][x1];
    const v01 = grid[y1][x0],
        v11 = grid[y1][x1];
    const top = lerp(v00, v10, tx);
    const bottom = lerp(v01, v11, tx);
    return lerp(top, bottom, ty);
}

function fbm(px, py, mapSize, gridSize, octaves, lacunarity, gain, baseGrid) {
    let value = 0,
        amplitude = 0.5,
        frequency = 1,
        maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
        const gx = (px / mapSize) * (gridSize - 1) * frequency;
        const gy = (py / mapSize) * (gridSize - 1) * frequency;
        value += amplitude * getNoiseValue(baseGrid, gx, gy);
        maxAmp += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }
    return value / maxAmp;
}

// ----- 连通区域 -----
function getConnectedRegions(terrain, mapSize, height, targetType) {
    const visited = new Uint8Array(terrain.length);
    const regions = [];
    const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];
    for (let i = 0; i < terrain.length; i++) {
        if (terrain[i] === targetType && !visited[i]) {
            const queue = [i];
            visited[i] = 1;
            const region = [];
            while (queue.length) {
                const idx = queue.shift();
                region.push(idx);
                const x = idx % mapSize,
                    y = Math.floor(idx / mapSize);
                for (let d of dirs) {
                    const nx = x + d[0],
                        ny = y + d[1];
                    if (nx >= 0 && nx < mapSize && ny >= 0 && ny < height) {
                        const nidx = ny * mapSize + nx;
                        if (!visited[nidx] && terrain[nidx] === targetType) {
                            visited[nidx] = 1;
                            queue.push(nidx);
                        }
                    }
                }
            }
            regions.push(region);
        }
    }
    return regions;
}

function touchesEdge(region, mapSize, height) {
    for (let idx of region) {
        const x = idx % mapSize,
            y = Math.floor(idx / mapSize);
        if (x === 0 || x === mapSize - 1 || y === 0 || y === height - 1) return true;
    }
    return false;
}

// ----- 2D/1D 绘制 (支持大尺寸ImageData优化) -----
function drawMap2D(terrain, mapSize, height) {
    const canvasSize = 800;
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = '#eef3f7';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const is1D = (height === 1);
    const colors = [COLORS.WATER, COLORS.GRASS, COLORS.FOREST, COLORS.DESERT, COLORS.SEA, COLORS.PLAIN];

    if (is1D) {
        const lineHeight = Math.max(2, canvasSize / 40);
        const startY = (canvasSize - lineHeight) / 2;
        const cellW = canvasSize / mapSize;
        for (let x = 0; x < mapSize; x++) {
            const type = terrain[x];
            ctx.fillStyle = colors[type] || '#888';
            ctx.fillRect(x * cellW, startY, cellW, lineHeight);
        }
        if (cellW >= 2) {
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= mapSize; x++) {
                ctx.beginPath();
                ctx.moveTo(x * cellW, startY);
                ctx.lineTo(x * cellW, startY + lineHeight);
                ctx.stroke();
            }
        }
    } else {
        const cellSize = canvasSize / mapSize;
        if (mapSize > 400) {
            const imageData = ctx.createImageData(canvasSize, canvasSize);
            const data = imageData.data;
            const colorMap = {
                0: [41, 128, 185, 255],
                1: [39, 174, 96, 255],
                2: [46, 139, 87, 255],
                3: [243, 156, 18, 255],
                4: [26, 82, 118, 255],
                5: [139, 195, 74, 255],
            };
            for (let py = 0; py < canvasSize; py++) {
                const gy = Math.floor(py / cellSize);
                if (gy >= mapSize) continue;
                const rowOffset = gy * mapSize;
                for (let px = 0; px < canvasSize; px++) {
                    const gx = Math.floor(px / cellSize);
                    if (gx >= mapSize) continue;
                    const type = terrain[rowOffset + gx];
                    const rgb = colorMap[type] || [0, 0, 0, 255];
                    const idx = (py * canvasSize + px) * 4;
                    data[idx] = rgb[0];
                    data[idx + 1] = rgb[1];
                    data[idx + 2] = rgb[2];
                    data[idx + 3] = rgb[3];
                }
            }
            ctx.putImageData(imageData, 0, 0);
        } else {
            for (let y = 0; y < mapSize; y++) {
                for (let x = 0; x < mapSize; x++) {
                    const type = terrain[y * mapSize + x];
                    ctx.fillStyle = colors[type] || '#888';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
            if (cellSize >= 4) {
                ctx.strokeStyle = 'rgba(0,0,0,0.06)';
                ctx.lineWidth = 0.5;
                for (let i = 0; i <= mapSize; i++) {
                    const pos = i * cellSize;
                    ctx.beginPath();
                    ctx.moveTo(pos, 0);
                    ctx.lineTo(pos, canvasSize);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(0, pos);
                    ctx.lineTo(canvasSize, pos);
                    ctx.stroke();
                }
            }
        }
    }
    currentTerrain = terrain;
    currentMapSize = mapSize;
    currentHeight = height;
    currentDimension = (height === 1) ? '1d' : '2d';
}

// ========== 地形生成 ==========
function generateTerrain(mapSize, dimension, rng) {
    const height = (dimension === '1d') ? 1 : mapSize;
    const total = mapSize * height;
    const gridSize = Math.min(32, Math.max(8, Math.floor(mapSize / 8)));
    const octaves = 4,
        lacunarity = 2.0,
        gain = 0.5;
    const baseGrid = generateNoiseGrid(gridSize, gridSize, rng);

    const noiseMap = new Float32Array(total);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < mapSize; x++) {
            const n = fbm(x, y, mapSize, gridSize, octaves, lacunarity, gain, baseGrid);
            noiseMap[y * mapSize + x] = n;
        }
    }

    const terrain = new Uint8Array(total);
    const oasisMark = new Uint8Array(total);

    // 1. 全图设为海
    for (let i = 0; i < total; i++) terrain[i] = 4;

    // 2. 草地
    const GRASS_MIN = 0.20, GRASS_MAX = 0.45;
    for (let i = 0; i < total; i++) {
        const n = noiseMap[i];
        if (n >= GRASS_MIN && n < GRASS_MAX) terrain[i] = 1;
    }

    // 3. 平原（斜向条带覆盖草地）
    const grassIndices = [];
    for (let i = 0; i < total; i++) if (terrain[i] === 1) grassIndices.push(i);
    if (grassIndices.length > 0) {
        const plainMask = generatePlainStripMask(mapSize, height, rng);
        for (let i = 0; i < total; i++) {
            if (plainMask[i] && terrain[i] === 1) terrain[i] = 5;
        }
        let plainCount = 0;
        for (let v of terrain) if (v === 5) plainCount++;
        let ratio = plainCount / total;
        if (ratio < 0.15 && grassIndices.length > 0) {
            let expanded = 0;
            let maxExpand = Math.ceil(total * 0.15) - plainCount;
            const plainSet = new Set();
            for (let i = 0; i < total; i++) if (terrain[i] === 5) plainSet.add(i);
            const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
            const candidates = [];
            for (let idx of plainSet) {
                const x = idx % mapSize;
                const y = Math.floor(idx / mapSize);
                for (let d of dirs) {
                    const nx = x + d[0];
                    const ny = y + d[1];
                    if (nx < 0 || nx >= mapSize || ny < 0 || ny >= height) continue;
                    const nidx = ny * mapSize + nx;
                    if (terrain[nidx] === 1 && !plainSet.has(nidx)) candidates.push(nidx);
                }
            }
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(rng.next() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }
            const toConvert = Math.min(maxExpand, candidates.length);
            for (let i = 0; i < toConvert; i++) {
                terrain[candidates[i]] = 5;
                expanded++;
            }
            plainCount += expanded;
            ratio = plainCount / total;
        }
        if (ratio > 0.50) {
            const plainSet = new Set();
            for (let i = 0; i < total; i++) if (terrain[i] === 5) plainSet.add(i);
            const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
            const edgeCells = [];
            for (let idx of plainSet) {
                const x = idx % mapSize;
                const y = Math.floor(idx / mapSize);
                let isEdge = false;
                for (let d of dirs) {
                    const nx = x + d[0];
                    const ny = y + d[1];
                    if (nx < 0 || nx >= mapSize || ny < 0 || ny >= height) { isEdge = true; break; }
                    const nidx = ny * mapSize + nx;
                    if (!plainSet.has(nidx)) { isEdge = true; break; }
                }
                if (isEdge) edgeCells.push(idx);
            }
            for (let i = edgeCells.length - 1; i > 0; i--) {
                const j = Math.floor(rng.next() * (i + 1));
                [edgeCells[i], edgeCells[j]] = [edgeCells[j], edgeCells[i]];
            }
            const targetPlain = Math.floor(total * 0.50);
            const toRemove = plainCount - targetPlain;
            const removeCount = Math.min(toRemove, edgeCells.length);
            for (let i = 0; i < removeCount; i++) {
                terrain[edgeCells[i]] = 1;
            }
            plainCount -= removeCount;
            ratio = plainCount / total;
        }
    }

    // 4. 森林和沙漠：覆盖剩余海
    for (let i = 0; i < total; i++) {
        if (terrain[i] === 4) {
            const n = noiseMap[i];
            if (n >= 0.25) {
                if (n < 0.60) terrain[i] = 2;
                else terrain[i] = 3;
            }
        }
    }

    // 5. 沙漠绿洲：数量 = min(5, floor(沙漠面积百分比 / 2))
    const desertIndices = [];
    for (let i = 0; i < total; i++) if (terrain[i] === 3) desertIndices.push(i);
    if (desertIndices.length > 0) {
        const desertRatio = (desertIndices.length / total) * 100;
        let oasisCount = Math.min(5, Math.floor(desertRatio / 2));
        if (oasisCount > desertIndices.length) oasisCount = desertIndices.length;
        if (oasisCount > 0) {
            // 随机打乱种子
            for (let i = desertIndices.length - 1; i > 0; i--) {
                const j = Math.floor(rng.next() * (i + 1));
                [desertIndices[i], desertIndices[j]] = [desertIndices[j], desertIndices[i]];
            }
            const selected = desertIndices.slice(0, oasisCount);
            // 扩展半径2（曼哈顿距离≤2）
            for (let idx of selected) {
                // 核心
                terrain[idx] = rng.next() < 0.5 ? 0 : 1;
                oasisMark[idx] = 1;
                const x = idx % mapSize;
                const y = Math.floor(idx / mapSize);
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                        if (Math.abs(dx) + Math.abs(dy) > 2) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx < 0 || nx >= mapSize || ny < 0 || ny >= height) continue;
                        const nidx = ny * mapSize + nx;
                        if (terrain[nidx] === 3) {
                            terrain[nidx] = rng.next() < 0.5 ? 0 : 1;
                            oasisMark[nidx] = 1;
                        }
                    }
                }
            }
        }
    }

    // 6. 海合规检查
    const seaRegions = getConnectedRegions(terrain, mapSize, height, 4);
    const totalCells = total;
    const threshold = totalCells * 0.15;
    for (let region of seaRegions) {
        const area = region.length;
        const edgeTouch = touchesEdge(region, mapSize, height);
        if (area <= threshold || !edgeTouch) {
            for (let idx of region) terrain[idx] = 0;
        }
    }

    // 统计
    let cWater = 0, cGrass = 0, cForest = 0, cDesert = 0, cSea = 0, cPlain = 0, cOasis = 0;
    for (let i = 0; i < total; i++) {
        if (oasisMark[i]) {
            cOasis++;
        } else {
            const v = terrain[i];
            if (v === 0) cWater++;
            else if (v === 1) cGrass++;
            else if (v === 2) cForest++;
            else if (v === 3) cDesert++;
            else if (v === 4) cSea++;
            else if (v === 5) cPlain++;
        }
    }
    const stats = {
        water: (cWater / total * 100),
        grass: (cGrass / total * 100),
        forest: (cForest / total * 100),
        desert: (cDesert / total * 100),
        sea: (cSea / total * 100),
        plain: (cPlain / total * 100),
        oasis: (cOasis / total * 100),
    };
    return { terrain, oasisMark, stats, height };
}

// ----- 生成平原条带掩码（斜向，1~2条） -----
function generatePlainStripMask(mapSize, height, rng) {
    const total = mapSize * height;
    const mask = new Uint8Array(total);

    const numPlains = rng.next() < 0.5 ? 1 : 2;
    const minWidth = Math.max(2, Math.floor(mapSize * 0.12));
    const maxWidth = Math.max(minWidth + 1, Math.floor(mapSize * 0.25));

    const strips = [];
    let attempts = 0;
    const maxAttempts = 100;

    while (strips.length < numPlains && attempts < maxAttempts) {
        attempts++;
        const direction = rng.next() < 0.5 ? 1 : -1;
        const width = minWidth + Math.floor(rng.next() * (maxWidth - minWidth));
        const maxOffset = (mapSize - width) / 2;
        const offset = (rng.next() * 2 - 1) * maxOffset;

        let overlap = false;
        for (let existing of strips) {
            if (existing.direction === direction) {
                if (Math.abs(existing.offset - offset) < existing.width + width) {
                    overlap = true;
                    break;
                }
            }
        }
        if (!overlap) {
            strips.push({ direction, width, offset });
        }
    }

    if (strips.length === 0) {
        const direction = rng.next() < 0.5 ? 1 : -1;
        const width = minWidth + Math.floor(rng.next() * (maxWidth - minWidth));
        strips.push({ direction, width, offset: 0 });
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < mapSize; x++) {
            const idx = y * mapSize + x;
            for (let strip of strips) {
                const d = strip.direction;
                const w = strip.width;
                const off = strip.offset;
                const value = y - d * x;
                const dist = Math.abs(value - off) / Math.sqrt(1 + d * d);
                if (dist < w / 2) {
                    mask[idx] = 1;
                    break;
                }
            }
        }
    }
    return mask;
}

// ----- 核心更新 -----
function generateAndDraw(seedStr) {
    let validSeed = seedStr;
    if (!isValidSeed(seedStr)) validSeed = generateRandomSeed();
    currentSeedStr = validSeed;
    seedDisplay.textContent = `种子: ${validSeed}`;
    seedInput.value = validSeed;

    const numSeed = hashSeed(validSeed);
    prng.reset(numSeed);

    const mapSize = parseInt(sizeSlider.value, 10);
    const dimension = dimensionSelect.value;
    const yScale = parseInt(yScaleSlider.value, 10) / 30;
    sizeDisplay.textContent = mapSize;
    updateControls();

    const is3D = (dimension === '3d');
    const is1D = (dimension === '1d');

    const result = generateTerrain(mapSize, dimension, prng);
    let { terrain, oasisMark, stats, height } = result;

    // ---- 3D平面模式：移除森林（类型2），转为草地（类型1） ----
    if (is3D && shapeSelect.value === 'flat') {
        for (let i = 0; i < terrain.length; i++) {
            if (terrain[i] === 2) terrain[i] = 1;
        }
        let cWater = 0, cGrass = 0, cForest = 0, cDesert = 0, cSea = 0, cPlain = 0, cOasis = 0;
        for (let i = 0; i < terrain.length; i++) {
            if (oasisMark[i]) {
                cOasis++;
            } else {
                const v = terrain[i];
                if (v === 0) cWater++;
                else if (v === 1) cGrass++;
                else if (v === 2) cForest++;
                else if (v === 3) cDesert++;
                else if (v === 4) cSea++;
                else if (v === 5) cPlain++;
            }
        }
        const total = terrain.length;
        stats = {
            water: (cWater / total * 100),
            grass: (cGrass / total * 100),
            forest: (cForest / total * 100),
            desert: (cDesert / total * 100),
            sea: (cSea / total * 100),
            plain: (cPlain / total * 100),
            oasis: (cOasis / total * 100),
        };
    }

    currentTerrain = terrain;
    currentOasisMark = oasisMark;
    currentMapSize = mapSize;
    currentHeight = height;
    currentDimension = (dimension === '1d') ? '1d' : (dimension === '3d' ? '3d' : '2d');

    canvas.style.display = is3D ? 'none' : 'block';
    threeContainer.style.display = is3D ? 'block' : 'none';
    placeholder.classList.add('hidden');

    if (is3D) {
        threeContainer.style.aspectRatio = '1 / 1';
        const shape = shapeSelect.value;
        if (shape === 'sphere') {
            buildVoxelTerrainSphere(terrain, mapSize, height);
        } else {
            buildVoxelTerrainFlat(terrain, mapSize, height, prng, yScale);
        }
    } else {
        drawMap2D(terrain, mapSize, height);
        clearVoxelScene();
    }

    const dimLabel = is3D ? '3D体素' : (is1D ? '1D条带' : '2D地图');
    statsInfo.innerHTML = `
        🌊 海 ${stats.sea.toFixed(1)}%  ·  💧 内陆水 ${stats.water.toFixed(1)}%  ·  🌾 平原 ${stats.plain.toFixed(1)}%  ·  🌿 草地 ${stats.grass.toFixed(1)}%  ·  🌲 森林 ${stats.forest.toFixed(1)}%  ·  🏜️ 沙漠 ${stats.desert.toFixed(1)}%  ·  🌴 绿洲 ${stats.oasis.toFixed(1)}%  ·  ${dimLabel}  ${mapSize}×${height}
        <span class="seed-display">种子: ${validSeed}</span>
    `;
    tooltip.classList.remove('visible');

    if (is3D) setTimeout(resizeThree, 50);
}

function updateControls() {
    const dim = dimensionSelect.value;
    const currentVal = parseInt(sizeSlider.value, 10);
    
    if (dim === '1d') {
        sizeLabel.textContent = '长度';
        sizeUnit.textContent = '× 1';
        shapeGroup.style.display = 'none';
        yScaleGroup.style.display = 'none';
        sizeSlider.max = 1000;
        if (currentVal > 1000) { sizeSlider.value = 1000; sizeDisplay.textContent = 1000; }
    } else if (dim === '3d') {
        sizeLabel.textContent = '直径';
        sizeUnit.textContent = `× ${sizeSlider.value}`;
        shapeGroup.style.display = 'flex';
        sizeSlider.max = 300;
        if (currentVal > 300) { sizeSlider.value = 300; sizeDisplay.textContent = 300; }
        if (shapeSelect.value === 'flat') {
            yScaleGroup.style.display = 'flex';
        } else {
            yScaleGroup.style.display = 'none';
        }
    } else { // 2D
        sizeLabel.textContent = '尺寸';
        sizeUnit.textContent = `× ${sizeSlider.value}`;
        shapeGroup.style.display = 'none';
        yScaleGroup.style.display = 'none';
        sizeSlider.max = 1000;
        if (currentVal > 1000) { sizeSlider.value = 1000; sizeDisplay.textContent = 1000; }
    }
}

// ----- Tooltip (仅2D/1D) -----
function getTerrainType(x, y) {
    if (!currentTerrain) return -1;
    if (x < 0 || x >= currentMapSize || y < 0 || y >= currentHeight) return -1;
    return currentTerrain[y * currentMapSize + x];
}

function updateTooltip(e) {
    if (currentDimension === '3d') {
        tooltip.classList.remove('visible');
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const canvasSize = 800;
    const scaleX = canvasSize / rect.width;
    const scaleY = canvasSize / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    if (mx < 0 || mx >= canvasSize || my < 0 || my >= canvasSize) {
        tooltip.classList.remove('visible');
        return;
    }
    const cellW = canvasSize / currentMapSize;
    const cellH = canvasSize / currentHeight;
    const gx = Math.floor(mx / cellW);
    const gy = Math.floor(my / cellH);
    if (gx < 0 || gx >= currentMapSize || gy < 0 || gy >= currentHeight) {
        tooltip.classList.remove('visible');
        return;
    }
    const idx = gy * currentMapSize + gx;
    const type = getTerrainType(gx, gy);
    if (type === -1) { tooltip.classList.remove('visible'); return; }

    let name, icon, color;
    if (currentOasisMark && currentOasisMark[idx]) {
        name = '绿洲';
        icon = '🌴';
        color = '#AAD751';
    } else if (type === 4) {
        name = '海';
        icon = '🌊';
        color = COLORS.SEA;
    } else if (type === 5) {
        name = '平原';
        icon = '🌾';
        color = COLORS.PLAIN;
    } else if (type === 0) {
        name = '内陆水';
        icon = '💧';
        color = COLORS.WATER;
    } else {
        name = TYPE_NAMES[type] || '未知';
        icon = TYPE_ICONS[type] || '❓';
        color = TYPE_COLORS[type] || '#888';
    }

    tipDot.style.backgroundColor = color;
    tipCoord.textContent = `(${gx}, ${gy})`;
    tipType.textContent = `${icon} ${name}`;

    let left = e.clientX + 14,
        top = e.clientY - 8;
    const tr = tooltip.getBoundingClientRect();
    const tw = tr.width || 160,
        th = tr.height || 36;
    if (left + tw > window.innerWidth - 10) left = e.clientX - tw - 14;
    if (top + th > window.innerHeight - 10) top = window.innerHeight - th - 10;
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.classList.add('visible');
}

// ----- 事件绑定 -----
sizeSlider.addEventListener('input', function() {
    sizeDisplay.textContent = this.value;
    const dim = dimensionSelect.value;
    if (dim === '1d') sizeUnit.textContent = '× 1';
    else sizeUnit.textContent = `× ${this.value}`;
});

yScaleSlider.addEventListener('input', function() {
    yScaleDisplay.textContent = this.value;
});

dimensionSelect.addEventListener('change', function() {
    updateControls();
    generateAndDraw(currentSeedStr);
    if (this.value === '3d') setTimeout(resizeThree, 100);
});

shapeSelect.addEventListener('change', function() {
    updateControls();
    generateAndDraw(currentSeedStr);
});

generateBtn.addEventListener('click', function() {
    generateAndDraw(generateRandomSeed());
});

applySeedBtn.addEventListener('click', function() {
    const val = seedInput.value.trim().toLowerCase();
    if (val === '') generateAndDraw(generateRandomSeed());
    else generateAndDraw(val);
});

seedInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') applySeedBtn.click();
});

canvas.addEventListener('mousemove', updateTooltip);
canvas.addEventListener('mouseleave', function() { tooltip.classList.remove('visible'); });
window.addEventListener('resize', function() {
    tooltip.classList.remove('visible');
    if (currentDimension === '3d') resizeThree();
});

const ro = new ResizeObserver(() => { if (currentDimension === '3d') resizeThree(); });
ro.observe(threeContainer);

// 初始化
function init() {
    initThree();
    const initialSeed = generateRandomSeed();
    generateAndDraw(initialSeed);
}
init();

// 暴露给全局，方便调试
window.__terrain = { generateAndDraw, currentSeedStr };