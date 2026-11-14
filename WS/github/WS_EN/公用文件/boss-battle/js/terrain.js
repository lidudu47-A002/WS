// ============================================================
//  terrain.js — 两张互不相同的 boss 战地图
//    blackroom : 64×64 黑屋祭坛（石柱 + 断墙 + 中央大道）
//    prison    : 48×48 监狱（= 64 × 75% 取整）牢房格网 + 十字走廊 + 北端刑台
//  坐标：x 向右、z 向下（z 越大越靠南），单位=格
//  grid 值：0 空地 / 1 墙 / 2 石柱 / 3 祭坛台 / 4 铁栏
// ============================================================

const SCENE_KEY_TERRAIN = (function () {
    try {
        return String(window.__SCENE__ ||
            new URLSearchParams(window.location.search).get('scene') ||
            'blackroom').toLowerCase();
    } catch (e) { return 'blackroom'; }
})();
const IS_PRISON = SCENE_KEY_TERRAIN === 'prison';

// 监狱地图 = 黑屋地图的 75%（64 × 0.75 = 48）
const WORLD_W = IS_PRISON ? 48 : 64;
const WORLD_H = IS_PRISON ? 48 : 64;

const MAP = (function () {
    const W = WORLD_W, H = WORLD_H;
    const grid = new Uint8Array(W * H);
    const deco = [];          // 装饰物（火盆/水晶），不参与碰撞

    function idx(x, z) { return z * W + x; }
    function set(x, z, v) {
        if (x < 0 || z < 0 || x >= W || z >= H) return;
        grid[idx(x, z)] = v;
    }
    function fill(x0, z0, w, h, v) {
        for (let z = z0; z < z0 + h; z++) {
            for (let x = x0; x < x0 + w; x++) set(x, z, v);
        }
    }
    function carve(x0, z0, w, h) { fill(x0, z0, w, h, 0); }

    let spawn, bossHome;

    if (!IS_PRISON) {
        // ==================== 黑屋 · 64×64 祭坛大厅 ====================
        fill(0, 0, W, 2, 1);
        fill(0, H - 2, W, 2, 1);
        fill(0, 0, 2, H, 1);
        fill(W - 2, 0, 2, H, 1);

        // 纵向石柱列（每 8 格一对）
        for (let z = 15; z <= 53; z += 8) {
            fill(17, z - 1, 3, 3, 2);
            fill(44, z - 1, 3, 3, 2);
        }

        // 两侧断墙（掩体与走位）
        for (let z = 20; z <= 48; z += 16) {
            fill(8, z, 5, 2, 1);
            fill(51, z, 5, 2, 1);
            fill(10, z + 5, 3, 2, 1);
            fill(51, z + 5, 3, 2, 1);
        }

        // 中段横向残墙（中路留 8 格门洞）
        fill(20, 33, 8, 2, 1);
        fill(36, 33, 8, 2, 1);
        fill(22, 44, 6, 2, 1);
        fill(36, 44, 6, 2, 1);

        // 北端 BOSS 祭坛区
        fill(30, 6, 4, 3, 3);
        fill(20, 10, 8, 2, 1);
        fill(36, 10, 8, 2, 1);
        fill(26, 14, 2, 2, 2);
        fill(36, 14, 2, 2, 2);

        // 南端出生区缓冲
        fill(24, 55, 4, 2, 1);
        fill(36, 55, 4, 2, 1);

        // 装饰
        for (let z = 18; z <= 52; z += 10) {
            deco.push({ x: 24.5, z: z, kind: 'brazier' });
            deco.push({ x: 39.5, z: z, kind: 'brazier' });
        }
        deco.push({ x: 22.5, z: 8.5, kind: 'crystal' });
        deco.push({ x: 41.5, z: 8.5, kind: 'crystal' });
        deco.push({ x: 32, z: 11.5, kind: 'crystal' });

        spawn = { x: 32, z: 58 };
        bossHome = { x: 32, z: 8.2 };
    } else {
        // ==================== 监狱 · 48×48 牢房格网 ====================
        fill(0, 0, W, 2, 1);
        fill(0, H - 2, W, 2, 1);
        fill(0, 0, 2, H, 1);
        fill(W - 2, 0, 2, H, 1);

        // 十字主走廊：纵向 x 20..27 贯通，横向 z 20..25 贯通
        carve(20, 2, 8, H - 4);
        carve(2, 20, W - 4, 6);

        // ---------- 牢房格网：南北两大段，每段左右各 3×3 间（每间 4×4，隔墙 1 格） ----------
        [[3, 18], [26, 41]].forEach(function (seg) {
            const z0 = seg[0], z1 = seg[1];
            for (let z = z0; z <= z1; z += 5) {          // 横隔线
                fill(3, z, 17, 1, 1);
                fill(28, z, 17, 1, 1);
            }
            for (let x = 3; x <= 18; x += 5) fill(x, z0, 1, z1 - z0 + 1, 1);   // 西侧竖隔
            for (let x = 29; x <= 44; x += 5) fill(x, z0, 1, z1 - z0 + 1, 1);  // 东侧竖隔
        });

        // ---------- 牢房门洞（朝向走廊，可通行） ----------
        for (let z = 5; z <= 16; z += 5) {               // 北段：东/西向牢门
            set(18, z, 0); set(18, z + 1, 0);
            set(29, z, 0); set(29, z + 1, 0);
        }
        for (let z = 28; z <= 39; z += 5) {              // 南段：东/西向牢门
            set(18, z, 0); set(18, z + 1, 0);
            set(29, z, 0); set(29, z + 1, 0);
        }
        for (let x = 5; x <= 16; x += 5) {               // 北段南侧牢门（z=18）
            set(x, 18, 0); set(x + 1, 18, 0);
            set(x + 27, 18, 0); set(x + 28, 18, 0);
        }
        for (let x = 5; x <= 16; x += 5) {               // 南段北侧牢门（z=26）
            set(x, 26, 0); set(x + 1, 26, 0);
            set(x + 27, 26, 0); set(x + 28, 26, 0);
        }

        // ---------- 北端刑台 ----------
        fill(21, 3, 6, 3, 3);          // 刑台台座（不可通行，BOSS 立于其上）
        fill(14, 8, 6, 1, 1);
        fill(28, 8, 6, 1, 1);
        fill(20, 12, 2, 2, 2);         // 刑台门柱
        fill(26, 12, 2, 2, 2);

        // ---------- 走廊里的铁栏门禁（透视装饰，不可通行） ----------
        set(19, 19, 4); set(28, 19, 4);
        set(19, 20, 4); set(28, 20, 4);
        set(19, 25, 4); set(28, 25, 4);
        set(19, 26, 4); set(28, 26, 4);

        // ---------- 南段掩体 ----------
        set(20, 33, 2); set(27, 33, 2);
        set(20, 38, 2); set(27, 38, 2);
        set(10, 22, 2); set(37, 22, 2);

        // ---------- 装饰 ----------
        for (let z = 10; z <= 42; z += 8) {
            deco.push({ x: 19.4, z: z, kind: 'brazier' });
            deco.push({ x: 28.6, z: z, kind: 'brazier' });
        }
        deco.push({ x: 18.5, z: 5.5, kind: 'crystal' });
        deco.push({ x: 29.5, z: 5.5, kind: 'crystal' });
        deco.push({ x: 24, z: 7.6, kind: 'crystal' });

        spawn = { x: 24, z: 43 };
        bossHome = { x: 24, z: 4.6 };
    }

    // ---------- 查询 ----------
    function tileAt(x, z) {
        if (x < 0 || z < 0 || x >= W || z >= H) return 1;
        return grid[idx(Math.floor(x), Math.floor(z))];
    }
    function isSolid(x, z) { return tileAt(x, z) !== 0; }

    function collideCircle(o, r) {
        if (isSolid(o.x - r, o.z) || isSolid(o.x + r, o.z)) return true;
        if (isSolid(o.x - r, o.z - r) || isSolid(o.x + r, o.z - r) ||
            isSolid(o.x - r, o.z + r) || isSolid(o.x + r, o.z + r)) return true;
        return false;
    }

    function tryMove(o, dx, dz, r) {
        if (dx !== 0) {
            const nx = o.x + dx;
            const probe = { x: nx + Math.sign(dx) * r, z: o.z };
            if (!isSolid(probe.x, o.z - r * 0.7) && !isSolid(probe.x, o.z + r * 0.7) &&
                !isSolid(nx + Math.sign(dx) * r, o.z)) {
                o.x = nx;
            }
        }
        if (dz !== 0) {
            const nz = o.z + dz;
            const probeZ = nz + Math.sign(dz) * r;
            if (!isSolid(o.x - r * 0.7, probeZ) && !isSolid(o.x + r * 0.7, probeZ) &&
                !isSolid(o.x, probeZ)) {
                o.z = nz;
            }
        }
    }

    return {
        W, H, grid, deco,
        tileAt, isSolid, collideCircle, tryMove,
        spawn, bossHome
    };
})();
