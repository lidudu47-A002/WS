// ============================================================
//  terrain.js 鈥?涓ゅ紶 boss 鎴樺湴鍥撅紙24脳24 姝ｆ柟褰㈡柟鍦猴級
//    blackroom : 榛戝眿绁潧鏂瑰満锛堢煶鏌?+ 鏂 + 涓酱澶ч亾锛?
//    prison    : 鐩戠嫳鏂瑰満锛堥敊浣嶇煯澧?+ 鐣屾々 + 鍖楃閾佹爮闂級
//  涓栫晫鍧愭爣锛歺 鍚戝彸銆亃 鍚戜笅锛坺 瓒婂ぇ瓒婇潬鍗楋級锛屽崟浣?鏍?
//  鎶曞奖涓烘枩杞存祴锛堣 iso.js锛夛細灞忓箷姘村钩 = x锛屽睆骞曠旱娣?= z锛?
//  鍥犳鏂瑰満鍦ㄥ睆骞曚笂鏄?涓€鏉¤竟锛堝崡杈癸級姝ｅ鐜╁"鐨勭煩褰紝鑰岄潪灏栬鏈濆悜鐜╁銆?
//  grid 鍊硷細0 绌哄湴 / 1 澧?/ 2 鐭虫煴 / 3 鍙板骇 / 4 閾佹爮
// ============================================================

const SCENE_KEY_TERRAIN = (function () {
    try {
        return String(window.__SCENE__ ||
            new URLSearchParams(window.location.search).get('scene') ||
            'blackroom').toLowerCase();
    } catch (e) { return 'blackroom'; }
})();
const IS_PRISON = SCENE_KEY_TERRAIN === 'prison';

const WORLD_W = 24;
const WORLD_H = 24;
const ARENA_BORDER = 2;   // 鍥涘懆澧欎綋鍘氬害锛堟牸锛夛紝鍙蛋鍖?2..21

const MAP = (function () {
    const W = WORLD_W, H = WORLD_H;
    const grid = new Uint8Array(W * H);
    const deco = [];

    function set(x, z, v) {
        if (x < 0 || z < 0 || x >= W || z >= H) return;
        grid[z * W + x] = v;
    }
    function fill(x0, z0, w, h, v) {
        for (let z = z0; z < z0 + h; z++) {
            for (let x = x0; x < x0 + w; x++) set(x, z, v);
        }
    }

    // 鍥涘懆 2 鏍煎帤灏侀棴鍥村
    fill(0, 0, W, ARENA_BORDER, 1);
    fill(0, H - ARENA_BORDER, W, ARENA_BORDER, 1);
    fill(0, ARENA_BORDER, ARENA_BORDER, H - ARENA_BORDER * 2, 1);
    fill(W - ARENA_BORDER, ARENA_BORDER, ARENA_BORDER, H - ARENA_BORDER * 2, 1);

    let spawn, bossHome;

    if (!IS_PRISON) {
        // ==================== 榛戝眿 路 绁潧鏂瑰満 ====================
        // 鍖楃绁潧鍙板骇锛堣创鐫€鍖楀锛屼綅浜?BOSS 韬悗锛?
        fill(9, 2, 6, 1, 3);

        // 鍥涙牴 2脳2 鐭虫煴
        fill(5, 6, 2, 2, 2);
        fill(17, 6, 2, 2, 2);
        fill(5, 15, 2, 2, 2);
        fill(17, 15, 2, 2, 2);

        // 涓宸﹀彸鏂锛堜腑璺暀 10 鏍奸棬娲烇級
        fill(4, 11, 3, 1, 1);
        fill(17, 11, 3, 1, 1);

        // 鍗楁鍑虹敓鍖烘帺浣?
        fill(6, 17, 2, 2, 1);
        fill(16, 17, 2, 2, 1);

        // ---------- 瑁呴グ ----------
        deco.push({ x: 7.5, z: 3.5, kind: 'brazier' });
        deco.push({ x: 15.5, z: 3.5, kind: 'brazier' });
        deco.push({ x: 3.5, z: 9.5, kind: 'brazier' });
        deco.push({ x: 20.5, z: 9.5, kind: 'brazier' });
        deco.push({ x: 8.5, z: 14.5, kind: 'brazier' });
        deco.push({ x: 15.5, z: 14.5, kind: 'brazier' });

        spawn = { x: 12, z: 19.5 };
        bossHome = { x: 12, z: 5.0 };
    } else {
        // ==================== 鐩戠嫳 路 鏂瑰満 ====================
        // 鍖楃閾佹爮闂紙妯檲鍦ㄥ寳澧欏墠锛?
        fill(9, 2, 6, 1, 4);
        // 鍒戝彴鍙板骇
        fill(10, 3, 4, 1, 3);

        // 鐣屾々
        set(8, 5, 2); set(15, 5, 2);
        set(8, 16, 2); set(15, 16, 2);

        // 涓閿欎綅鐭
        fill(3, 9, 4, 1, 1);
        fill(17, 9, 4, 1, 1);
        fill(9, 13, 6, 1, 1);

        // 鍗楁鐗㈠尯鐭
        fill(4, 18, 4, 1, 1);
        fill(16, 18, 4, 1, 1);

        // ---------- 瑁呴グ ----------
        deco.push({ x: 7.5, z: 4.5, kind: 'brazier' });
        deco.push({ x: 16.5, z: 4.5, kind: 'brazier' });
        deco.push({ x: 3.5, z: 11.5, kind: 'brazier' });
        deco.push({ x: 20.5, z: 11.5, kind: 'brazier' });
        deco.push({ x: 8.5, z: 15.5, kind: 'brazier' });
        deco.push({ x: 15.5, z: 15.5, kind: 'brazier' });

        spawn = { x: 12, z: 19.2 };
        bossHome = { x: 12, z: 6.0 };
    }

    // ---------- 鏌ヨ ----------
    function tileAt(x, z) {
        if (x < 0 || z < 0 || x >= W || z >= H) return 1;
        return grid[z * W + Math.floor(x)];
    }
    function isSolid(x, z) {
        if (x < 0 || z < 0 || x >= W || z >= H) return true;
        return grid[Math.floor(z) * W + Math.floor(x)] !== 0;
    }

    function collideCircle(o, r) {
        if (isSolid(o.x - r, o.z) || isSolid(o.x + r, o.z)) return true;
        if (isSolid(o.x, o.z - r) || isSolid(o.x, o.z + r)) return true;
        if (isSolid(o.x - r, o.z - r) || isSolid(o.x + r, o.z - r) ||
            isSolid(o.x - r, o.z + r) || isSolid(o.x + r, o.z + r)) return true;
        return false;
    }

    function tryMove(o, dx, dz, r) {
        if (dx !== 0) {
            const nx = o.x + dx;
            const edge = nx + Math.sign(dx) * r;
            if (!isSolid(edge, o.z - r * 0.72) && !isSolid(edge, o.z) &&
                !isSolid(edge, o.z + r * 0.72)) {
                o.x = nx;
            }
        }
        if (dz !== 0) {
            const nz = o.z + dz;
            const edge = nz + Math.sign(dz) * r;
            if (!isSolid(o.x - r * 0.72, edge) && !isSolid(o.x, edge) &&
                !isSolid(o.x + r * 0.72, edge)) {
                o.z = nz;
            }
        }
    }

    // 娌垮皠绾挎眰鍒板満鍦板唴澹佺殑璺濈锛堜緵榫欓鐐厜鏌?/ 椋庤溅鍏夊垉瑁佸壀锛?
    function edgeT(x, z, dx, dz, maxT) {
        const L = ARENA_BORDER, R = W - ARENA_BORDER;
        const Tp = ARENA_BORDER, B = H - ARENA_BORDER;
        let t = maxT;
        if (dx > 1e-6) t = Math.min(t, (R - x) / dx);
        else if (dx < -1e-6) t = Math.min(t, (L - x) / dx);
        if (dz > 1e-6) t = Math.min(t, (B - z) / dz);
        else if (dz < -1e-6) t = Math.min(t, (Tp - z) / dz);
        return Math.max(0, t);
    }

    return {
        W, H, grid, deco, BORDER: ARENA_BORDER,
        tileAt, isSolid, collideCircle, tryMove, edgeT,
        spawn, bossHome
    };
})();
