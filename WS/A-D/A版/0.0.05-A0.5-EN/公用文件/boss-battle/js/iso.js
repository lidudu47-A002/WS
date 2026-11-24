// ============================================================
//  iso.js — 斜轴测（2.5D）投影 + 方场地面烘焙 + 镜头裁剪
//  世界坐标：x 向右、z 向南（z 越大越靠南、越靠近镜头）、h 向上，单位=格
//  投影：屏幕 sx = ox + x*TW + z*SH ，屏幕 sy = oy + z*TH - h*HU
//    → 世界的 x 轴几乎水平，z 轴向下并略微右斜（约 31°），
//      因此正方形场地在屏幕上是一条边（南边）正对玩家的矩形，
//      每个方块都能同时看到 顶面 / 南面（正面）/ 东面（侧面）三个立体面。
// ============================================================

const Iso = (function () {
    const TW = 44;      // 1 格的屏幕宽度（未缩放）
    const TH = 26;      // 1 格的纵深高度（未缩放）
    const SH = 2;       // 每格纵深带来的水平错位（东面可见宽度；值越小越"正对"玩家，0 = 完全正投影）
    const HU = 46;      // 1 格高度对应的屏幕像素

    let scale = 1;
    let ox = 0, oy = 0;
    let TWc = TW, THc = TH, SHc = SH, HUc = HU;

    let cache = null;
    let cacheW = 0, cacheH = 0, builtScale = -1;
    let cacheOX = 0, cacheOY = 0;   // 烘焙原点（世界 0,0 在缓存中的像素位置）

    function isSmallArena() { return WORLD_W <= 32 && WORLD_H <= 32; }

    function layout(w, h) {
        let ns;
        if (isSmallArena()) {
            // 方场整块入画：宽 = W*TW + H*SH，高 = H*TH + 北墙高度
            const fitW = WORLD_W * TW + WORLD_H * SH;
            const fitH = WORLD_H * TH + 2.1 * HU;
            ns = clamp(Math.min(w * 0.94 / fitW, h * 0.86 / fitH), 0.40, 2.2);
        } else {
            const cols = WORLD_W <= 48 ? 12 : 14;
            const rows = WORLD_H <= 48 ? 20 : 24;
            ns = clamp(Math.min(w / (TW * cols), h / (TH * rows)), 0.45, 1.45);
        }
        TWc = TW * ns; THc = TH * ns; SHc = SH * ns; HUc = HU * ns;
        ox = w * 0.5;
        if (isSmallArena()) {
            // 让"场地矩形 + 北墙高度"在竖直方向居中
            oy = h * 0.5 + 1.05 * HUc;
        } else {
            oy = h * 0.52;
        }
        scale = ns;
        if (Math.abs(ns - builtScale) > 0.001) buildFloor();
    }

    function getScale() { return scale; }

    // ---------- 投影 ----------
    function proj(x, z, hh) {
        const rx = x - CAM.x, rz = z - CAM.z;
        return {
            x: ox + rx * TWc + rz * SHc,
            y: oy + rz * THc - (hh || 0) * HUc
        };
    }

    // 屏幕 → 地面世界坐标（hh 可指定高度平面）
    function unproj(sx, sy, hh) {
        const rz = (sy - oy + (hh || 0) * HUc) / THc;
        const rx = (sx - ox - rz * SHc) / TWc;
        return { x: rx + CAM.x, z: rz + CAM.z };
    }

    function lenPx(l) { return l * TWc; }
    function heightPx(l) { return l * HUc; }

    // ---------- 地面整图烘焙 ----------
    function buildFloor() {
        const padPx = 6;
        const W = Math.ceil(WORLD_W * TWc + WORLD_H * SHc) + padPx * 2;
        const H = Math.ceil(WORLD_H * THc) + padPx * 2;
        cacheW = W; cacheH = H;
        cacheOX = padPx;
        cacheOY = padPx;

        const off = document.createElement('canvas');
        off.width = W;
        off.height = H;
        const c = off.getContext('2d');
        c.imageSmoothingEnabled = false;

        function cx(x, z) { return cacheOX + x * TWc + z * SHc; }
        function cy(z) { return cacheOY + z * THc; }

        // 新的斜轴测投影下，地砖按"格子四边形"整块铺满（不再套用等距菱形贴图），
        // 靠镜头的两条边画砖缝，横向的格子边与视口水平线平行 → 一眼能看出场地是方的。
        const baseA = IS_PRISON ? '#18252f' : '#241b33';
        const baseB = IS_PRISON ? '#141e28' : '#1d1629';
        const seamCol = IS_PRISON ? 'rgba(7,14,22,0.80)' : 'rgba(9,5,16,0.80)';
        const hiCol = IS_PRISON ? 'rgba(150,200,240,' : 'rgba(230,190,255,';

        for (let z = 0; z < WORLD_H; z++) {
            for (let x = 0; x < WORLD_W; x++) {
                // 外圈两格是围墙投影范围，不铺地砖
                const inArena = x >= ARENA_BORDER && x < WORLD_W - ARENA_BORDER &&
                    z >= ARENA_BORDER && z < WORLD_H - ARENA_BORDER;
                const mx = x + 0.5, mz = z + 0.5;

                // 四个角（NW / NE / SE / SW）
                const ax = cx(x, z), ay = cy(z);
                const bx = cx(x + 1, z), by = cy(z);
                const dx2 = cx(x + 1, z + 1), dy2 = cy(z + 1);
                const ex = cx(x, z + 1), ey = cy(z + 1);

                c.beginPath();
                c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(dx2, dy2); c.lineTo(ex, ey);
                c.closePath();
                c.fillStyle = inArena ? (((x + z) % 2 === 0) ? baseA : baseB)
                    : (IS_PRISON ? '#0e1620' : '#140e1e');
                c.fill();

                if (inArena) {
                    // 每块砖的细微明暗差，避免大面积死板
                    const h = ((x * 73856093) ^ (z * 19349663)) & 255;
                    if (h < 96) {
                        c.fillStyle = hiCol + ((96 - h) / 96 * 0.045).toFixed(3) + ')';
                        c.fill();
                    }
                    // 砖缝：画朝镜头的两条边（南边、东边）
                    c.strokeStyle = seamCol;
                    c.lineWidth = 1;
                    c.beginPath();
                    c.moveTo(ex + 0.5, ey + 0.5);
                    c.lineTo(dx2 + 0.5, dy2 + 0.5);
                    c.lineTo(bx + 0.5, by + 0.5);
                    c.stroke();

                    // 远离中轴的暗化，营造纵深
                    const axisDark = Math.min(0.5,
                        Math.abs(mx - WORLD_W * 0.5) / (WORLD_W * 0.94) +
                        Math.max(0, mz - WORLD_H * 0.62) / (WORLD_H * 1.1));
                    if (axisDark > 0.05) {
                        c.fillStyle = 'rgba(4, 2, 10, ' + axisDark.toFixed(3) + ')';
                        c.fill();
                    }
                }
            }
        }

        // BOSS 脚下的一圈辉光（一次性径向渐变，取代原来的逐格辉光贴图）
        (function () {
            const gx = cx(MAP.bossHome.x, MAP.bossHome.z);
            const gy = cy(MAP.bossHome.z);
            const R = 8.4 * TWc;
            const rg = c.createRadialGradient(gx, gy, 4, gx, gy, R);
            rg.addColorStop(0, IS_PRISON ? 'rgba(70,170,255,0.30)' : 'rgba(255,120,70,0.28)');
            rg.addColorStop(0.55, IS_PRISON ? 'rgba(60,140,220,0.10)' : 'rgba(200,70,50,0.09)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = rg;
            c.beginPath();
            c.ellipse(gx, gy, R, R * 0.62, 0, 0, Math.PI * 2);
            c.fill();
        })();

        cache = off;
        builtScale = scale;
    }

    function drawFloor(c) {
        if (!cache) return;
        const srcX = Math.round(cacheOX - ox + CAM.x * TWc + CAM.z * SHc);
        const srcY = Math.round(cacheOY - oy + CAM.z * THc);
        const vw = getViewW(), vh = getViewH();
        c.drawImage(cache, srcX, srcY, vw, vh, 0, 0, vw, vh);
    }

    // ---------- 视口裁剪 ----------
    function visibleBounds(pad) {
        pad = pad || 2;
        const w = getViewW(), h = getViewH();
        const pts = [unproj(0, 0), unproj(w, 0), unproj(0, h), unproj(w, h)];
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (p.x < x0) x0 = p.x;
            if (p.x > x1) x1 = p.x;
            if (p.z < z0) z0 = p.z;
            if (p.z > z1) z1 = p.z;
        }
        return {
            x0: Math.max(0, Math.floor(x0) - pad),
            x1: Math.min(WORLD_W, Math.ceil(x1) + pad),
            z0: Math.max(0, Math.floor(z0) - pad),
            z1: Math.min(WORLD_H, Math.ceil(z1) + pad)
        };
    }

    // ---------- 立体方块 ----------
    function blockTop(x, z, hh) {
        return proj(x + 0.5, z + 0.5, hh || 0);
    }

    // 画 1×1×hgt 的立体方块：南面(亮) + 东面(暗) + 顶面
    function drawBlock(c, x, z, hgt, colTop, colFace, colSide) {
        const A = proj(x, z, 0);
        const w = TWc, d = THc, sh = SHc;
        const H = (hgt || 1) * HUc;

        // 南面（正面，正对玩家）
        c.fillStyle = colFace;
        c.fillRect(A.x + sh, A.y + d - H, w, H);

        // 东面（右侧，最暗）
        c.fillStyle = colSide;
        c.beginPath();
        c.moveTo(A.x + w, A.y);
        c.lineTo(A.x + w + sh, A.y + d);
        c.lineTo(A.x + w + sh, A.y + d - H);
        c.lineTo(A.x + w, A.y - H);
        c.closePath();
        c.fill();

        // 顶面
        c.fillStyle = colTop;
        c.beginPath();
        c.moveTo(A.x, A.y - H);
        c.lineTo(A.x + w, A.y - H);
        c.lineTo(A.x + w + sh, A.y + d - H);
        c.lineTo(A.x + sh, A.y + d - H);
        c.closePath();
        c.fill();
    }

    // ---------- 贴图化立体方块（预渲染精灵） ----------
    const spriteCache = {};

    function blockSprite(hgt, kind) {
        const topImg = kind === 'altar'
            ? (Assets.get('floor_glow') || Assets.get('wall_top'))
            : Assets.get('wall_top');
        const faceImg = Assets.get('wall_face');
        const sideImg = Assets.get('wall_side');
        if (!topImg || !faceImg || !sideImg) return null;

        const key = kind + '|' + hgt.toFixed(2) + '|' + scale.toFixed(3);
        if (spriteCache[key]) return spriteCache[key];

        const w = TWc, d = THc, sh = SHc, H = hgt * HUc;
        const pad = 2;
        const cv = document.createElement('canvas');
        cv.width = Math.ceil(w + sh) + pad * 2;
        cv.height = Math.ceil(d + H) + pad * 2;
        const g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;

        const ax = pad, ay = pad + H;    // 世界 (x,z) 角点在地面高度的位置

        // 南面：矩形
        g.save();
        g.setTransform(w, 0, 0, H, ax + sh, ay + d - H);
        g.drawImage(faceImg, 0, 0, 1, 1);
        g.restore();

        // 东面：平行四边形
        g.save();
        g.setTransform(sh, d, 0, -H, ax + w, ay);
        g.drawImage(sideImg, 0, 0, 1, 1);
        g.restore();

        // 顶面：平行四边形
        g.save();
        g.setTransform(w, 0, sh, d, ax, ay - H);
        g.drawImage(topImg, 0, 0, 1, 1);
        g.restore();

        if (kind === 'pillar') {
            g.save();
            g.setTransform(w, 0, sh, d, ax, ay - H);
            g.fillStyle = 'rgba(190, 205, 235, 0.16)';
            g.fillRect(0, 0, 1, 1);
            g.restore();
        }

        spriteCache[key] = { cv: cv, ax: ax, ay: ay };
        return spriteCache[key];
    }

    function drawBlockTex(c, x, z, hgt, kind) {
        const sp = blockSprite(hgt, kind);
        if (!sp) return false;
        const p = proj(x, z, 0);
        c.drawImage(sp.cv, Math.round(p.x - sp.ax), Math.round(p.y - sp.ay));
        return true;
    }

    // ---------- 铁栏：沿 x 方向立着的栅栏（带厚度感） ----------
    function drawBars(c, x, z, hgt) {
        const H = (hgt || 2.6) * HUc;
        // 石基座
        drawBlock(c, x, z, 0.14, '#3a2c3f', '#241a29', '#180f1d');

        const n = 6;
        const bw = Math.max(1.5, TWc * 0.055);
        for (let k = 0; k < 2; k++) {
            const zz = z + 0.35 + k * 0.45;
            const dim = k === 0 ? 1 : 0.62;
            for (let i = 0; i < n; i++) {
                const p = proj(x + (i + 0.5) / n, zz, 0);
                const hh = H * (k === 0 ? 1 : 0.94);
                c.fillStyle = k === 0 ? '#8fa2ba' : '#63768c';
                c.fillRect(p.x - bw / 2, p.y - hh, bw, hh);
                c.fillStyle = 'rgba(20, 26, 36, ' + (0.45 * dim).toFixed(2) + ')';
                c.fillRect(p.x + bw * 0.1, p.y - hh, bw * 0.4, hh);
            }
            // 上下横梁
            const a = proj(x, zz, (hgt || 2.6) * (k === 0 ? 1 : 0.94));
            const b = proj(x + 1, zz, (hgt || 2.6) * (k === 0 ? 1 : 0.94));
            const a2 = proj(x, zz, (hgt || 2.6) * 0.2);
            const b2 = proj(x + 1, zz, (hgt || 2.6) * 0.2);
            c.strokeStyle = k === 0 ? '#a9bcd2' : '#75889e';
            c.lineWidth = Math.max(1, TWc * 0.035);
            c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
            c.beginPath(); c.moveTo(a2.x, a2.y); c.lineTo(b2.x, b2.y); c.stroke();
        }
    }

    return {
        TW, TH, SH, HU,
        layout, proj, unproj, lenPx, heightPx,
        getScale, drawFloor, visibleBounds, drawBlock, blockTop,
        isSmallArena,
        drawBlockTex, drawBars,
        get hTW() { return TWc; },
        get hTH() { return THc; },
        get hSH() { return SHc; },
        rebuild: buildFloor
    };
})();
