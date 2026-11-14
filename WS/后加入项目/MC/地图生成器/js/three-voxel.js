// ----- Three.js 体素地形模块 -----
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ----- 颜色导出 (与 main.js 共享) -----
export const COLORS = {
    WATER: '#2980B9',
    SEA: '#1a5276',
    GRASS: '#27AE60',
    FOREST: '#2E8B57',
    DESERT: '#F39C12',
    PLAIN: '#8BC34A',        // 平原
    TRUNK: '#8B4513',
    LEAF: '#228B22',
};

export const TYPE_NAMES = ['内陆水', '草地', '森林', '沙漠', '海', '平原', '树干', '树叶'];
export const TYPE_ICONS = ['💧', '🌿', '🌲', '🏜️', '🌊', '🌾', '🪵', '🍃'];
export const TYPE_COLORS = [
    COLORS.WATER, COLORS.GRASS, COLORS.FOREST,
    COLORS.DESERT, COLORS.SEA, COLORS.PLAIN,
    COLORS.TRUNK, COLORS.LEAF
];

// ----- Three.js 场景 -----
let scene, camera, renderer, controls;
let threeInitialized = false;
let voxelGroup = null;
export const threeContainer = document.getElementById('three-container');

// ----- 颜色映射 (本地) -----
const colorMap = [
    new THREE.Color(COLORS.WATER),
    new THREE.Color(COLORS.GRASS),
    new THREE.Color(COLORS.FOREST),
    new THREE.Color(COLORS.DESERT),
    new THREE.Color(COLORS.SEA),
    new THREE.Color(COLORS.PLAIN),
    new THREE.Color(COLORS.TRUNK),
    new THREE.Color(COLORS.LEAF),
];

// ----- 初始化 Three.js -----
export function initThree() {
    if (threeInitialized) return;
    const container = threeContainer;
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 600;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2634);

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(200, 150, 200);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 15, 0);
    controls.update();

    // 灯光
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    dirLight.position.set(100, 120, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    const d = 200;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 300;
    scene.add(dirLight);

    const fill = new THREE.DirectionalLight(0x8888ff, 0.5);
    fill.position.set(-80, 60, -100);
    scene.add(fill);

    threeInitialized = true;
    animateThree();
}

function animateThree() {
    if (!threeInitialized) return;
    requestAnimationFrame(animateThree);
    controls.update();
    renderer.render(scene, camera);
}

export function resizeThree() {
    if (!threeInitialized) return;
    const container = threeContainer;
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 600;
    renderer.setSize(w, h);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
}

export function clearVoxelScene() {
    if (voxelGroup) {
        scene.remove(voxelGroup);
        voxelGroup.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
        voxelGroup = null;
    }
}

// ----- 体素地形构建：平面 (含树木，支持Y轴缩放) -----
export function buildVoxelTerrainFlat(terrain, mapSize, height, rng, yScale = 1.0) {
    if (!threeInitialized) initThree();
    clearVoxelScene();

    const size = mapSize;
    // 基础地形高度（平原与草地同高）
    const baseHeights = { 0: 10, 1: 10, 2: 15, 3: 12, 4: 10, 5: 10 };
    const typeHeights = {};
    for (let key in baseHeights) {
        typeHeights[key] = Math.max(1, Math.round(baseHeights[key] * yScale));
    }

    const colHeights = new Uint8Array(size * size);
    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            const idx = z * size + x;
            const type = terrain[idx];
            const h = typeHeights[type] || 10;
            colHeights[idx] = h;
        }
    }

    // 统计地形方块数量 (类型0-4, 5为平原)
    const typeCounts = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            const idx = z * size + x;
            const totalHeight = 20 + colHeights[idx];
            for (let y = 0; y < totalHeight; y++) {
                let blockType = (y < 20) ? 1 : terrain[idx];
                typeCounts[blockType]++;
            }
        }
    }

    // 在草地上生成树木（只在草地类型1上生成）
    const TREE_PROB = 0.08;
    const TRUNK_MIN = 2;
    const TRUNK_MAX = 4;
    const LEAF_RADIUS = 2;
    const treeBlocks = [];

    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            const idx = z * size + x;
            if (terrain[idx] === 1) {
                if (rng.next() < TREE_PROB) {
                    const surfaceY = 20 + colHeights[idx];
                    const trunkHeight = TRUNK_MIN + Math.floor(rng.next() * (TRUNK_MAX - TRUNK_MIN + 1));
                    for (let i = 0; i < trunkHeight; i++) {
                        const py = surfaceY + i;
                        if (py < 100) {
                            treeBlocks.push({ x: x - size/2, y: py, z: z - size/2, type: 6 });
                            typeCounts[6]++;
                        }
                    }
                    const topY = surfaceY + trunkHeight - 1;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -LEAF_RADIUS; dx <= LEAF_RADIUS; dx++) {
                            for (let dz = -LEAF_RADIUS; dz <= LEAF_RADIUS; dz++) {
                                if (dx*dx + dz*dz + dy*dy <= LEAF_RADIUS*LEAF_RADIUS + 1) {
                                    if (dx === 0 && dy >= 0 && dy < trunkHeight && dz === 0) continue;
                                    const px = x - size/2 + dx;
                                    const py = topY + dy;
                                    const pz = z - size/2 + dz;
                                    if (py < 100) {
                                        treeBlocks.push({ x: px, y: py, z: pz, type: 7 });
                                        typeCounts[7]++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 创建 InstancedMesh
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const meshes = [];
    for (let t = 0; t < 8; t++) {
        if (typeCounts[t] === 0) continue;
        const mat = new THREE.MeshStandardMaterial({
            color: colorMap[t],
            roughness: 0.6,
            metalness: 0.05,
        });
        if (t === 0 || t === 4) { mat.transparent = true;
            mat.opacity = 0.75; }
        const mesh = new THREE.InstancedMesh(boxGeo, mat, typeCounts[t]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes.push(mesh);
    }

    const dummy = new THREE.Object3D();
    const instanceIndex = [0, 0, 0, 0, 0, 0, 0, 0];

    // 填充地形方块
    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            const idx = z * size + x;
            const totalHeight = 20 + colHeights[idx];
            for (let y = 0; y < totalHeight; y++) {
                let blockType = (y < 20) ? 1 : terrain[idx];
                const meshIndex = meshes.findIndex(m => {
                    const c = m.material.color;
                    const t = colorMap[blockType];
                    return c.r === t.r && c.g === t.g && c.b === t.b;
                });
                if (meshIndex === -1) continue;
                const mesh = meshes[meshIndex];
                const instIdx = instanceIndex[blockType];
                dummy.position.set(x - size/2, y, z - size/2);
                dummy.updateMatrix();
                mesh.setMatrixAt(instIdx, dummy.matrix);
                instanceIndex[blockType]++;
            }
        }
    }

    // 填充树木方块
    for (let block of treeBlocks) {
        const type = block.type;
        const meshIndex = meshes.findIndex(m => {
            const c = m.material.color;
            const t = colorMap[type];
            return c.r === t.r && c.g === t.g && c.b === t.b;
        });
        if (meshIndex === -1) continue;
        const mesh = meshes[meshIndex];
        const instIdx = instanceIndex[type];
        dummy.position.set(block.x, block.y, block.z);
        dummy.updateMatrix();
        mesh.setMatrixAt(instIdx, dummy.matrix);
        instanceIndex[type]++;
    }

    for (let mesh of meshes) mesh.instanceMatrix.needsUpdate = true;

    voxelGroup = new THREE.Group();
    for (let mesh of meshes) voxelGroup.add(mesh);
    scene.add(voxelGroup);

    const maxHeight = 20 + Math.max(...Object.values(typeHeights));
    const dist = Math.max(size, maxHeight * 1.5) * 1.0;
    camera.position.set(dist * 0.6, dist * 0.5 + 20, dist * 0.6);
    controls.target.set(0, maxHeight * 0.3, 0);
    controls.update();
    resizeThree();
}

// ----- 体素地形构建：球形 (只显示最外两层) -----
export function buildVoxelTerrainSphere(terrain, mapSize, height) {
    if (!threeInitialized) initThree();
    clearVoxelScene();

    const size = mapSize;
    const radius = Math.floor(size / 2);
    const SHELL_THICKNESS = 2; // 只渲染最外两层

    // 地形类型高度（仅用于球壳厚度，但球形中我们直接使用地形类型）
    const typeHeights = { 0: 10, 1: 10, 2: 15, 3: 12, 4: 10, 5: 10 };

    // 统计每种类型的方块数量（只统计壳层）
    const typeCounts = [0, 0, 0, 0, 0, 0];
    for (let y = -radius; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
            for (let x = -radius; x <= radius; x++) {
                const dist = Math.sqrt(x * x + y * y + z * z);
                if (dist > radius) continue;
                if (dist < radius - SHELL_THICKNESS) continue;
                const px = Math.round(x + size/2);
                const pz = Math.round(z + size/2);
                if (px < 0 || px >= size || pz < 0 || pz >= size) continue;
                const terrainIdx = pz * size + px;
                const terrainType = terrain[terrainIdx];
                typeCounts[terrainType]++;
            }
        }
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const meshes = [];
    for (let t = 0; t < 6; t++) {
        if (typeCounts[t] === 0) continue;
        const mat = new THREE.MeshStandardMaterial({
            color: colorMap[t],
            roughness: 0.6,
            metalness: 0.05,
        });
        if (t === 0 || t === 4) { mat.transparent = true;
            mat.opacity = 0.75; }
        const mesh = new THREE.InstancedMesh(boxGeo, mat, typeCounts[t]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes.push(mesh);
    }

    const dummy = new THREE.Object3D();
    const instanceIndex = [0, 0, 0, 0, 0, 0];

    // 填充实例
    for (let y = -radius; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
            for (let x = -radius; x <= radius; x++) {
                const dist = Math.sqrt(x * x + y * y + z * z);
                if (dist > radius) continue;
                if (dist < radius - SHELL_THICKNESS) continue;
                const px = Math.round(x + size/2);
                const pz = Math.round(z + size/2);
                if (px < 0 || px >= size || pz < 0 || pz >= size) continue;
                const terrainIdx = pz * size + px;
                const terrainType = terrain[terrainIdx];

                const meshIndex = meshes.findIndex(m => {
                    const c = m.material.color;
                    const t = colorMap[terrainType];
                    return c.r === t.r && c.g === t.g && c.b === t.b;
                });
                if (meshIndex === -1) continue;
                const mesh = meshes[meshIndex];
                const instIdx = instanceIndex[terrainType];
                dummy.position.set(x, y, z);
                dummy.updateMatrix();
                mesh.setMatrixAt(instIdx, dummy.matrix);
                instanceIndex[terrainType]++;
            }
        }
    }

    for (let mesh of meshes) mesh.instanceMatrix.needsUpdate = true;

    voxelGroup = new THREE.Group();
    for (let mesh of meshes) voxelGroup.add(mesh);
    scene.add(voxelGroup);

    const dist = Math.max(size, 60) * 0.8;
    camera.position.set(dist * 0.6, dist * 0.5 + 20, dist * 0.6);
    controls.target.set(0, 0, 0);
    controls.update();
    resizeThree();
}