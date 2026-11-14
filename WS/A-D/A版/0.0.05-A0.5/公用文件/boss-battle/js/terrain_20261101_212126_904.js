// ============================================================
//  terrain.js — 两张互不相同的 boss 战地图
//    blackroom : 64×64 黑屋祭坛（石柱 + 断墙 + 中央大道）
//    prison    : 48×48 监狱（= 64 × 75%）牢房格网 + 十字走廊 + 北端刑台
//  坐标：x 向右、z 向下（z 越大越靠南），单位=格
//  grid 值：0 空地 / 1 墙 / 2 石柱 / 3 祭坛台 / 4 铁栏
// ============================================================

const SCENE_KEY_TERRAIN = (function () {
    try {
        return (new URLSearchParams(window.location.search).get('scene') || 'blackroom').toLowerCase();
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
        // 外围 2 格厚石墙
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
        // 外围 2 格厚石墙
        fill(0, 0, W, 2, 1);
        fill(0, H - 2, W, 2, 1);
        fill(0, 0, 2, H, 1);
        fill(W - 2, 0, 2, H, 1);

        // 十字主走廊：纵向 x 20..27，横向 z 20..25（保持空地）
        carve(20, 2, 8, H - 4);
        carve(2, 20, W - 4, 6);

        // ---- 西侧牢房格网（x 3..19，z 3..19） ----
        for (let z = 3; z <= 19; z += 5) fill(3, z, 17, 1, 1);   // 横隔墙
        for (let x = 3; x <= 18; x += 5) fill(x, 3, 1, 17, 1);   // 竖隔墙
        // 门洞（铁栏）：朝向纵走廊的东墙 + 朝向横走廊的南墙
        for (let z0 = 4; z0 <= 19; z0 += 5) {
            set(18, z0 + 1, 4);
            set(18, z0 + 2, 4);
            fill(5, 19, 2, 1, 4);
            fill(10, 19, 2, 1, 4);
            fill(15, 19, 2, 1, 4);
        }

        // ---- 东侧牢房格网（x 28..44，z 3..19） ----
        for (let z = 3; z <= 19; z += 5) fill(28, z, 17, 1, 1);
        for (let x = 29; x <= 44; x += 5) fill(x, 3, 1, 17, 1);
        for (let z0 = 4; z0 <= 19; z0 += 5) {
            set(29, z0 + 1, 4);
            set(29, z0 + 2, 4);
            fill(30, 19, 2, 1, 4);
            fill(35, 19, 2, 1, 4);
            fill(40, 19, 2, 1, 4);
        }

        // ---- 北端刑台 ----
        fill(21, 3, 6, 3, 3);          // 刑台（不可通行，BOSS 立于其上）
        fill(14, 8, 6, 2, 1);          // 刑台两侧短墙
        fill(28, 8, 6, 2, 1);
        fill(20, 12, 2, 2, 2);         // 门柱
        fill(26, 12, 2, 2, 2);

        // ---- 南段掩体（铁砧式断墙，中路留门） ----
        fill(10, 30, 6, 2, 1);
        fill(32, 30, 6, 2, 1);
        fill(10, 38, 5, 2, 1);
        fill(33, 38, 5, 2, 1);
        fill(22, 36, 2, 2, 2);
        fill(24, 36, 2, 2, 2);

        // ---- 装饰：铁栅火盆 + 刑台水晶 ----
        for (let z = 10; z <= 42; z += 8) {
            deco.push({ x: 19.2, z: z, kind: 'brazier' });
            deco.push({ x: 28.8, z: z, kind: 'brazier' });
        }
        deco.push({ x: 18.5, z: 5.5, kind: 'crystal' });
        deco.push({ x: 29.5, z: 5.5, kind: 'crystal' });
        deco.push({ x: 24, z: 9.5, kind: 'crystal' });

        spawn = { x: 24, z: 43 };
        bossHome = { x: 24, z: 4.6 };
    }

    // ---------- 查询 ----------
    function tileAt(x, z) {
        if (x < 0 || z < 0 || x >= W || z >= H) return 1;
        return grid[idx(Math.floor(x), Math.floor(z))];
    }
    function isSolid(x, z) { return tileAt(x, z) !== 0; }

    // 圆与地形的碰撞检测
    function collideCircle(o, r) {
        if (isSolid(o.x - r, o.z) || isSolid(o.x + r, o.z)) return true;
        if (isSolid(o.x - r, o.z - r) || isSolid(o.x + r, o.z - r) ||
            isSolid(o.x - r, o.z + r) || isSolid(o.x + r, o.z + r)) return true;
        return false;
    }

    // 沿单轴尝试移动，遇阻则贴边停止
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
