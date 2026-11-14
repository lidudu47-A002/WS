// ============================================================
//  terrain.js — 两张 boss 战地图（方案B：24×24 正方形等距场地）
//    blackroom : 24×24 黑屋祭坛方场（石柱 + 断墙 + 中轴大道）
//    prison    : 24×24 监狱方场（错位矮墙 + 界桩 + 北端铁栏门）
//  坐标：x 向右、z 向下（z 越大越靠南），单位=格
//  grid 值：0 空地 / 1 墙 / 2 石柱 / 3 祭坛台 / 4 铁栏
//  ------------------------------------------------------------
//  场地结构（两场景尺寸一致，保证 BOSS 数值与战斗时长不变）：
//    四周 2 格厚封闭围墙 → 可走区域 x,z ∈ [2, 21]，即 20×20 净走位区
//    BOSS 出生点在北端（z≈5），玩家出生点在南端（z≈19.5）
//    中段/南段布置掩体，掩体之间留 ≥3 格通道，连通率 100%
// ============================================================

const SCENE_KEY_TERRAIN = (function () {
    try {
        return String(window.__SCENE__ ||
            new URLSearchParams(window.location.search).get('scene') ||
            'blackroom').toLowerCase();
    } catch (e) { return 'blackroom'; }
})();
const IS_PRISON = SCENE_KEY_TERRAIN === 'prison';

// 两套地图统一为 24×24 正方形场地（方案B）
const WORLD_W = 24;
const WORLD_H = 24;
// 围墙厚度：外圈 2 格封闭
const ARENA_BORDER = 2;

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

    // ---------- 两场景公共：2 格厚封闭边界 ----------
    fill(0, 0, W, ARENA_BORDER, 1);                    // 北墙 z=0..1
    fill(0, H - ARENA_BORDER, W, ARENA_BORDER, 1);     // 南墙 z=22..23
    fill(0, 0, ARENA_BORDER, H, 1);                    // 西墙 x=0..1
    fill(W - ARENA_BORDER, 0, ARENA_BORDER, H, 1);     // 东墙 x=22..23

    if (!IS_PRISON) {
        // ==================== 黑屋 · 24×24 祭坛方场 ====================
        // 北端祭坛台座：贴北墙、仅 1 格深（z=2），
        // 不与 BOSS 出生点 (12, 5) 的碰撞探针（r*0.75=1.275 格）重叠
        fill(9, 2, 6, 1, 3);

        // 四根 2×2 石柱，对称分布，中轴留 10 格大道
        fill(5, 6, 2, 2, 2);
        fill(17, 6, 2, 2, 2);
        fill(5, 15, 2, 2, 2);
        fill(17, 15, 2, 2, 2);

        // 中段横向残墙：中路留 10 格门洞，两翼靠墙留 2 格侧道
        fill(4, 11, 3, 1, 1);
        fill(17, 11, 3, 1, 1);

        // 南端出生区的错位掩体（玩家出生点北侧，留出绕行空间）
        fill(6, 17, 2, 2, 1);
        fill(16, 17, 2, 2, 1);

        // ---------- 装饰 ----------
        deco.push({ x: 8.5, z: 10, kind: 'brazier' });
        deco.push({ x: 15.5, z: 10, kind: 'brazier' });
        deco.push({ x: 8.5, z: 14, kind: 'brazier' });
        deco.push({ x: 15.5, z: 14, kind: 'brazier' });
        deco.push({ x: 9.5, z: 4.0, kind: 'crystal' });
        deco.push({ x: 14.5, z: 4.0, kind: 'crystal' });
        deco.push({ x: 12.0, z: 3.4, kind: 'crystal' });

        spawn = { x: 12, z: 19.5 };
        bossHome = { x: 12, z: 5.0 };
    } else {
        // ==================== 监狱 · 24×24 方场 ====================
        // 北端铁栏门（嵌在北墙中线，仍算实心边界，只是外观为栅栏）
        fill(9, 0, 6, ARENA_BORDER, 4);

        // 北端刑台台座：贴北墙 1 格深
        fill(10, 2, 4, 1, 3);
        // 刑台两根门柱
        set(7, 4, 2);
        set(16, 4, 2);

        // 中段错位矮墙（左右各一道，中路留 4 格主道 + 两侧 ≥3 格绕行）
        fill(3, 9, 4, 1, 1);      // x3..6, z9
        fill(16, 9, 4, 1, 1);     // x16..19, z9
        // 中央短墙（把场地分成南北两段，两侧各留 3 格以上通道）
        fill(9, 13, 6, 1, 1);     // x9..14, z13

        // 南段牢区：错位短墙
        fill(4, 17, 4, 1, 1);     // x4..7, z17
        fill(16, 17, 4, 1, 1);    // x16..19, z17

        // 界桩（1×1 石柱，不挡路，保留牢区结构感）
        set(8, 6, 2);
        set(15, 6, 2);
        set(8, 15, 2);
        set(15, 15, 2);
        set(4, 20, 2);
        set(19, 20, 2);

        // ---------- 装饰 ----------
        deco.push({ x: 8.5, z: 8, kind: 'brazier' });
        deco.push({ x: 15.5, z: 8, kind: 'brazier' });
        deco.push({ x: 8.5, z: 16, kind: 'brazier' });
        deco.push({ x: 15.5, z: 16, kind: 'brazier' });
        deco.push({ x: 9.5, z: 4.2, kind: 'crystal' });
        deco.push({ x: 14.5, z: 4.2, kind: 'crystal' });

        spawn = { x: 12, z: 19.2 };
        // BOSS 出生点必须落在空地：台座占 z=2，站 z=5.2 前后都有移动余量
        bossHome = { x: 12, z: 5.2 };
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

    // 可走区域（去掉围墙后的净场地，供调试与自动化校验）
    const ARENA = {
        x0: ARENA_BORDER, z0: ARENA_BORDER,
        x1: W - ARENA_BORDER - 1, z1: H - ARENA_BORDER - 1
    };

    return {
        W, H, grid, deco, ARENA, BORDER: ARENA_BORDER,
        tileAt, isSolid, collideCircle, tryMove,
        spawn, bossHome
    };
})();
