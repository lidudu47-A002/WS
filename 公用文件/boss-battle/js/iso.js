// ============================================================
//  iso.js — 等距（2.5D）投影 + 大地图地面烘焙 + 相机裁剪
//  世界坐标：x 向右、z 向南（z 越大越靠南）、h 向上，单位=格
//  相机跟随玩家，屏幕上方 = 世界北方（z 减小）
// ============================================================

const Iso = (function () {
    const TW = 56;      // 1 格对应的菱形宽（未缩放）
    const TH = 28;      // 1 格对应的菱形高
    const HU = 46;      // 1 格高度对应的屏幕像素

    let scale = 1;
    let ox = 0, oy = 0;
    let hTW = TW * 0.5, hTH = TH * 0.5;

    let cache = null;      // 整张 64×64 地面离屏图
    let cacheW = 0, cacheH = 0, builtScale = 0;

    function layout(w, h) {
        // 视口内希望看到的格数（监狱地图更小，看近一点）
        const cols = WORLD_W <= 48 ? 12 : 14;
        const rows = WORLD_H <= 48 ? 20 : 24;
        const sW = w / (TW * cols);
        const sH = h / (TH * rows);
        const ns = clamp(Math.min(sW, sH), 0.45, 1.45);
        hTW = TW * 0.5 * ns;
        hTH = TH * 0.5 * ns;
        ox = w * 0.5;
        oy = h * 0.52;
        if (Math.abs(ns - builtScale) > 0.001) {
            scale = ns;
            buildFloor();
        } else {
            scale = ns;
        }
    }

    function getScale() { return scale; }

    // ---------- 投影 ----------
    function proj(x, z, hh) {
        const rx = x - CAM.x, rz = z - CAM.z;
        return {
            x: ox + (rx - rz) * hTW,
            y: oy + (rx + rz) * hTH - (hh || 0) * HU * scale
        };
    }

    // 屏幕 → 地面世界坐标
    function unproj(sx, sy) {
        const a = (sx - ox) / hTW;
        const b = (sy - oy) / hTH;
        return { x: (a + b) / 2 + CAM.x, z: (b - a) / 2 + CAM.z };
    }

    function lenPx(l) { return l * TW * scale; }
    function heightPx(l) { return l * HU * scale; }

    // ---------- 地面烘焙（整图一次性） ----------
    function buildFloor() {
        const W = Math.ceil((WORLD_W + WORLD_H) * hTW) + 4;
        const H = Math.ceil((WORLD_W + WORLD_H) * hTH) + 4;
        cacheW = W; cacheH = H;

        const off = document.createElement('canvas');
        off.width = W;
        off.height = H;
        const c = off.getContext('2d');
        c.imageSmoothingEnabled = false;

        const iw = TW * scale;
        const ih = TH * scale;
        const halfH = hTH;

        // cache 坐标：cx = ((x-z)+WORLD_W)*hTW, cy = (x+z)*hTH
        function cx(x, z) { return ((x - z) + WORLD_W) * hTW; }
        function cy(x, z) { return (x + z) * hTH; }

        const imgFloor = Assets.get('floor');
        const imgDark = Assets.get('floor_dark');
        const imgGlow = Assets.get('floor_glow');

        for (let z = 0; z < WORLD_H; z++) {
            for (let x = 0; x < WORLD_W; x++) {
                const mx = x + 0.5, mz = z + 0.5;
                const p = { x: cx(mx, mz), y: cy(mx, mz) };

                const dToBoss = Math.sqrt(dist2(mx, mz, MAP.bossHome.x, MAP.bossHome.z));
                const glow = dToBoss < 9;

                let img;
                if (glow) img = imgGlow || imgFloor;
                else img = ((x + z) % 2 === 0) ? imgFloor : (imgDark || imgFloor);

                if (img) {
                    c.drawImage(img, p.x - iw / 2, p.y - ih / 2, iw, ih);
                } else {
                    c.fillStyle = ((x + z) % 2 === 0)
                        ? (IS_PRISON ? '#182734' : '#1d1830')
                        : (IS_PRISON ? '#111c26' : '#151123');
                    c.beginPath();
                    c.moveTo(p.x, p.y - halfH);
                    c.lineTo(p.x + hTW, p.y);
                    c.lineTo(p.x, p.y + halfH);
                    c.lineTo(p.x - hTW, p.y);
                    c.closePath();
                    c.fill();
                }

                // 远离中轴的暗化，营造纵深
                const axisDark = Math.min(0.5,
                    Math.abs(mx - WORLD_W * 0.5) / (WORLD_W * 0.94) +
                    Math.max(0, mz - WORLD_H * 0.62) / (WORLD_H * 1.1));
                if (axisDark > 0.05) {
                    c.fillStyle = 'rgba(4, 2, 10, ' + axisDark.toFixed(3) + ')';
                    c.beginPath();
                    c.moveTo(p.x, p.y - halfH);
                    c.lineTo(p.x + hTW, p.y);
                    c.lineTo(p.x, p.y + halfH);
                    c.lineTo(p.x - hTW, p.y);
                    c.closePath();
                    c.fill();
                }
            }
        }

        cache = off;
        builtScale = scale;
    }

    // 把地面按当前相机画到屏幕（1:1 贴图，避免每帧缩放采样）
    function drawFloor(c) {
        if (!cache) return;
        const srcX = Math.round(WORLD_W * hTW - ox + (CAM.x - CAM.z) * hTW);
        const srcY = Math.round((CAM.x + CAM.z) * hTH - oy);
        const vw = getViewW(), vh = getViewH();
        // 越界部分交给 canvas 自动裁剪；1:1 无缩放
        c.drawImage(cache, srcX, srcY, vw, vh, 0, 0, vw, vh);
    }

    // ---------- 视口裁剪 ----------
    function visibleBounds(pad) {
        pad = pad || 2;
        const w = getViewW(), h = getViewH();
        const pts = [
            unproj(0, 0), unproj(w, 0), unproj(0, h), unproj(w, h)
        ];
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        pts.forEach(function (p) {
            if (p.x < x0) x0 = p.x;
            if (p.x > x1) x1 = p.x;
            if (p.z < z0) z0 = p.z;
            if (p.z > z1) z1 = p.z;
        });
        return {
            x0: Math.max(0, Math.floor(x0) - pad),
            x1: Math.min(WORLD_W, Math.ceil(x1) + pad),
            z0: Math.max(0, Math.floor(z0) - pad),
            z1: Math.min(WORLD_H, Math.ceil(z1) + pad)
        };
    }

    // ---------- 立方体（墙块）绘制 ----------
    function blockTop(x, z) {
        const p = proj(x, z, 0);
        return p;
    }

    // 画一个 1×1×hgt 的方块，返回顶面中心屏幕坐标
    function drawBlock(c, x, z, hgt, colTop, colFace, colSide) {
        const p = proj(x + 0.5, z + 0.5, 0);
        const w = hTW, hh = hTH;
        const H = (hgt || 1) * HU * scale;

        // 南面（朝向屏幕下方，最亮）
        c.fillStyle = colFace;
        c.beginPath();
        c.moveTo(p.x - w, p.y);
        c.lineTo(p.x, p.y + hh);
        c.lineTo(p.x, p.y + hh - H);
        c.lineTo(p.x - w, p.y - H);
        c.closePath();
        c.fill();

        // 东面（较暗）
        c.fillStyle = colSide;
        c.beginPath();
        c.moveTo(p.x + w, p.y);
        c.lineTo(p.x, p.y + hh);
        c.lineTo(p.x, p.y + hh - H);
        c.lineTo(p.x + w, p.y - H);
        c.closePath();
        c.fill();

        // 顶面
        c.fillStyle = colTop;
        c.beginPath();
        c.moveTo(p.x, p.y - hh - H);
        c.lineTo(p.x + w, p.y - H);
        c.lineTo(p.x, p.y + hh - H);
        c.lineTo(p.x - w, p.y - H);
        c.closePath();
        c.fill();
    }

    // ---------- 贴图化方块（场景专属墙/地板贴图，预渲染为精灵） ----------
    const spriteCache = {};
    let spriteScale = 0;

    // 把 32×32 贴图按等距三面贴到 1×1×hgt 方块的缓存画布上
    function blockSprite(hgt, kind) {
        const topImg = kind === 'altar' ? (Assets.get('floor_glow') || Assets.get('wall_top')) : Assets.get('wall_top');
        const faceImg = Assets.get('wall_face');
        const sideImg = Assets.get('wall_side');
        if (!topImg || !faceImg || !sideImg) return null;

        if (Math.abs(spriteScale - scale) > 0.001) spriteScale = scale;
        const key = kind + '|' + hgt.toFixed(2) + '|' + scale.toFixed(3);
        if (spriteCache[key]) return spriteCache[key];

        const w = hTW, hh = hTH, H = hgt * HU * scale;
        const pad = 2;
        const cv = document.createElement('canvas');
        cv.width = Math.ceil(2 * w) + pad * 2;
        cv.height = Math.ceil(2 * hh + H) + pad * 2;
        const g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;
        const px = w + pad, py = hh + pad;   // 格子中心地面点

        g.save();
        g.setTransform(w, hh, 0, -H, px - w, py);          // 南面
        g.drawImage(faceImg, 0, 0, 1, 1);
        g.restore();

        g.save();
        g.setTransform(w, -hh, 0, -H, px, py + hh);        // 东面
        g.drawImage(sideImg, 0, 0, 1, 1);
        g.restore();

        g.save();
        g.setTransform(w, -hh, w, hh, px - w, py - H);     // 顶面
        g.drawImage(topImg, 0, 0, 1, 1);
        g.restore();

        // 石柱顶加一点高光，与墙区分
        if (kind === 'pillar') {
            g.fillStyle = 'rgba(190, 205, 235, 0.16)';
            g.save();
            g.setTransform(w, -hh, w, hh, px - w, py - H);
            g.fillRect(0, 0, 1, 1);
            g.restore();
        }

        spriteCache[key] = { cv: cv, w: cv.width, h: cv.height };
        return spriteCache[key];
    }

    // 用贴图方块绘制地形块；无贴图时返回 false 由调用方回退纯色
    function drawBlockTex(c, x, z, hgt, kind) {
        const sp = blockSprite(hgt, kind);
        if (!sp) return false;
        const p = proj(x + 0.5, z + 0.5, 0);
        c.drawImage(sp.cv, p.x - hTW - 2, p.y - hTH - 2);
        return true;
    }

    // 铁栏：沿 x 方向的竖杆栅栏
    function drawBars(c, x, z, hgt) {
        const H = (hgt || 2.6) * HU * scale;
        const n = 5;
        const bw = Math.max(1, lenPx(0.05));
        for (let i = 0; i < n; i++) {
            const p = proj(x + (i + 0.5) / n, z + 0.5, 0);
            c.fillStyle = '#8fa2ba';
            c.fillRect(p.x - bw / 2, p.y - H, bw, H);
            c.fillStyle = 'rgba(24, 32, 44, 0.55)';
            c.fillRect(p.x - bw / 2, p.y - H, bw * 0.45, H);
        }
        // 上下横梁
        const a = proj(x, z + 0.5, hgt || 2.6);
        const b = proj(x + 1, z + 0.5, hgt || 2.6);
        const a2 = proj(x, z + 0.5, (hgt || 2.6) * 0.18);
        const b2 = proj(x + 1, z + 0.5, (hgt || 2.6) * 0.18);
        c.strokeStyle = '#a9bcd2';
        c.lineWidth = Math.max(1, lenPx(0.035));
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
        c.beginPath(); c.moveTo(a2.x, a2.y); c.lineTo(b2.x, b2.y); c.stroke();
    }

    return {
        TW, TH, HU,
        layout, proj, unproj, lenPx, heightPx,
        getScale, drawFloor, visibleBounds, drawBlock, blockTop,
        drawBlockTex, drawBars,
        get hTW() { return hTW; },
        get hTH() { return hTH; },
        rebuild: buildFloor
    };
})();
