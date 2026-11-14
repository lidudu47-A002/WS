// ============================================================
//  render.js — 2.5D 等距渲染（64×64 大地图 · 从南至北）
//  地面整图烘焙 + 视口裁剪 + 深度排序
// ============================================================

const Render = {
    time: 0,

    frame(dt) {
        this.time += dt;
        const c = ctx;
        const w = getViewW(), h = getViewH();

        this.drawBackground(c, w, h);

        c.save();
        c.translate(CAM.shakeX, CAM.shakeY);

        Iso.drawFloor(c);

        const vb = Iso.visibleBounds(3);
        const list = [];
        this.collectTerrain(list, vb);
        this.collectDeco(list, vb);
        this.collectEntities(list);
        list.sort(function (a, b) { return a.d - b.d; });
        for (let i = 0; i < list.length; i++) list[i].draw(c);

        this.drawEBullets(c);
        this.drawBullets(c);
        this.drawBlasters(c);
        this.drawWindmills(c);
        this.drawParticles(c);
        this.drawDamageNumbers(c);

        c.restore();

        this.drawHUD(c, w, h);
        this.drawVignette(c, w, h);
        if (hitFlash > 0) {
            c.fillStyle = 'rgba(255, 40, 40, ' + (hitFlash * 0.28).toFixed(3) + ')';
            c.fillRect(0, 0, w, h);
        }
        if (gameState === 'intro') this.drawIntro(c, w, h);
        this.drawMessage(c, w, h);
    },

    // ---------------- 背景 ----------------
    drawBackground(c, w, h) {
        if (!this._bg || this._bgW !== w || this._bgH !== h) {
            const off = document.createElement('canvas');
            off.width = w;
            off.height = h;
            const b = off.getContext('2d');
            const g = b.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, SCENE.fogTop);
            g.addColorStop(0.55, SCENE.fogBottom);
            g.addColorStop(1, '#030207');
            b.fillStyle = g;
            b.fillRect(0, 0, w, h);

            const rg = b.createRadialGradient(w * 0.5, h * 0.12, 10, w * 0.5, h * 0.12, h * 0.8);
            rg.addColorStop(0, 'rgba(120, 90, 200, 0.10)');
            rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
            b.fillStyle = rg;
            b.fillRect(0, 0, w, h);

            this._bg = off;
            this._bgW = w;
            this._bgH = h;
        }
        c.drawImage(this._bg, 0, 0);
    },

    // ---------------- 地形块 ----------------
    collectTerrain(list, vb) {
        // 两场景独立配色（贴图缺失时的回退色）
        const pal = IS_PRISON
            ? { top: '#3d5164', face: '#26333f', side: '#17202a',
                pTop: '#54697d', pFace: '#2f3d4a', pSide: '#1c2530',
                aTop: '#5f7d6e', aFace: '#33463c', aSide: '#20302a' }
            : { top: '#3a3350', face: '#241f36', side: '#171327',
                pTop: '#5b5177', pFace: '#332b4a', pSide: '#221c35',
                aTop: '#6a4f86', aFace: '#3b2a52', aSide: '#281b3a' };

        for (let z = vb.z0; z < vb.z1; z++) {
            for (let x = vb.x0; x < vb.x1; x++) {
                const t = MAP.grid[z * WORLD_W + x];
                if (!t) continue;
                const d = x + z;
                if (t === 1) {
                    list.push({ d: d, draw: function (c) {
                        if (!Iso.drawBlockTex(c, x, z, 2.1, 'wall')) {
                            Iso.drawBlock(c, x, z, 2.1, pal.top, pal.face, pal.side);
                        }
                    } });
                } else if (t === 2) {
                    list.push({ d: d, draw: function (c) {
                        if (!Iso.drawBlockTex(c, x, z, 0.5, 'wall')) {
                            Iso.drawBlock(c, x, z, 0.5, pal.aTop, pal.aFace, pal.aSide);
                        }
                        if (!Iso.drawBlockTex(c, x, z, 3.4, 'pillar')) {
                            Iso.drawBlock(c, x, z, 3.4, pal.pTop, pal.pFace, pal.pSide);
                        }
                    } });
                } else if (t === 3) {
                    list.push({ d: d, draw: function (c) {
                        if (!Iso.drawBlockTex(c, x, z, 0.55, 'altar')) {
                            Iso.drawBlock(c, x, z, 0.55, pal.aTop, pal.aFace, pal.aSide);
                        }
                    } });
                } else if (t === 4) {
                    list.push({ d: d, draw: function (c) {
                        Iso.drawBars(c, x, z, 2.6);
                    } });
                }
            }
        }
    },

    // ---------------- 装饰 ----------------
    // 火盆 / 水晶预渲染精灵（避免每帧创建渐变）
    decoSprites() {
        const s = Iso.getScale();
        const key = s.toFixed(3) + '|' + (Assets.get('crystal') ? 1 : 0);
        if (this._decoKey === key) return this._deco;
        const mk = function (w, h) {
            const cv = document.createElement('canvas');
            cv.width = Math.max(4, Math.ceil(w));
            cv.height = Math.max(4, Math.ceil(h));
            const g = cv.getContext('2d');
            g.imageSmoothingEnabled = false;
            return { c: cv, g: g };
        };

        // 火盆
        const br = mk(Math.max(18, Iso.lenPx(1.5)), Math.max(32, Iso.heightPx(2.6)));
        (function () {
            const g = br.g, W = br.c.width, H = br.c.height;
            const baseH = Math.round(H * 0.40);
            const baseW = Math.round(W * 0.44);
            g.fillStyle = '#2b2434';
            g.fillRect(Math.round(W / 2 - baseW / 2), H - baseH, baseW, baseH);
            g.fillStyle = '#40344f';
            g.fillRect(Math.round(W / 2 - baseW / 2), H - baseH, Math.max(2, Math.round(baseW * 0.38)), baseH);
            g.fillStyle = '#1a1420';
            g.fillRect(Math.round(W / 2 - baseW / 2), H - 3, baseW, 3);
            g.fillStyle = '#5a4a70';
            g.beginPath();
            g.ellipse(W / 2, H - baseH, baseW * 0.8, baseW * 0.26, 0, 0, Math.PI * 2);
            g.fill();
            const fy = H - baseH - Math.round(baseH * 0.08);
            const fr = Math.max(8, W * 0.44);
            const fg = g.createRadialGradient(W / 2, fy - fr * 0.3, 1, W / 2, fy - fr * 0.3, fr);
            fg.addColorStop(0, 'rgba(255, 245, 210, 0.98)');
            fg.addColorStop(0.3, 'rgba(255, 180, 80, 0.80)');
            fg.addColorStop(0.65, 'rgba(255, 90, 40, 0.34)');
            fg.addColorStop(1, 'rgba(255, 60, 20, 0)');
            g.fillStyle = fg;
            g.beginPath();
            g.arc(W / 2, fy - fr * 0.3, fr, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = 'rgba(255, 236, 180, 0.95)';
            g.beginPath();
            g.arc(W / 2, fy - fr * 0.35, Math.max(1.5, W * 0.05), 0, Math.PI * 2);
            g.fill();
        })();

        // 水晶
        const cr = mk(Math.max(16, Iso.lenPx(1.6)), Math.max(20, Iso.heightPx(1.9)));
        (function () {
            const g = cr.g, W = cr.c.width, H = cr.c.height;
            const img = Assets.get('crystal');
            if (img) {
                g.globalAlpha = 0.95;
                g.drawImage(img, 0, 0, W, H);
            } else {
                g.fillStyle = SCENE.accentSoft;
                g.beginPath();
                g.moveTo(W / 2, 0);
                g.lineTo(W * 0.78, H * 0.45);
                g.lineTo(W / 2, H);
                g.lineTo(W * 0.22, H * 0.45);
                g.closePath();
                g.fill();
            }
        })();

        this._deco = { brazier: br.c, crystal: cr.c };
        this._decoKey = key;
        return this._deco;
    },

    collectDeco(list, vb) {
        const self = this;
        const sp = this.decoSprites();
        for (let i = 0; i < MAP.deco.length; i++) {
            const o = MAP.deco[i];
            if (o.x < vb.x0 - 2 || o.x > vb.x1 + 2 || o.z < vb.z0 - 2 || o.z > vb.z1 + 2) continue;
            list.push({ d: o.x + o.z + 0.01, draw: function (c) {
                const p = Iso.proj(o.x, o.z, 0);
                if (o.kind === 'brazier') {
                    const flick = 1 + Math.sin(self.time * 9 + o.x) * 0.06;
                    const dw = sp.brazier.width;
                    const dh = sp.brazier.height * flick;
                    c.drawImage(sp.brazier, Math.round(p.x - dw / 2), Math.round(p.y - dh), dw, Math.round(dh));
                } else {
                    const dw = sp.crystal.width, dh = sp.crystal.height;
                    c.save();
                    c.globalAlpha = 0.92;
                    c.drawImage(sp.crystal, Math.round(p.x - dw / 2), Math.round(p.y - dh), dw, dh);
                    c.restore();
                }
            } });
        }
    },

    // ---------------- 实体 ----------------
    collectEntities(list) {
        if (!boss.dead) list.push({ d: boss.x + boss.z, draw: this.drawBoss.bind(this) });
        list.push({ d: player.x + player.z, draw: this.drawPlayer.bind(this) });
    },

    shadow(c, x, z, radiusCells, alpha) {
        const p = Iso.proj(x, z, 0);
        const r = Iso.lenPx(radiusCells) * 0.5;
        c.save();
        c.globalAlpha = alpha === undefined ? 0.42 : alpha;
        c.fillStyle = '#000';
        c.beginPath();
        c.ellipse(p.x, p.y, r, r * 0.5, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
    },

    drawBoss(c) {
        const s = Iso.getScale();
        const bob = Math.sin(this.time * 1.8) * 0.16;
        const hBase = boss.h + bob;
        this.shadow(c, boss.x, boss.z, 4.6, 0.5);

        const p0 = Iso.proj(boss.x, boss.z, 0);
        const R = 80 * s;
        const gg = c.createRadialGradient(p0.x, p0.y - 40 * s, 6, p0.x, p0.y - 40 * s, R);
        gg.addColorStop(0, 'rgba(255, 60, 90, 0.28)');
        gg.addColorStop(0.5, 'rgba(180, 30, 80, 0.11)');
        gg.addColorStop(1, 'rgba(0, 0, 0, 0)');
        c.fillStyle = gg;
        c.fillRect(p0.x - R, p0.y - 40 * s - R, R * 2, R * 2);

        const img = Assets.get('boss') || Assets.get('soul_red');
        const wc = 4.6, hc = 6.2;
        const wp = Iso.lenPx(wc);
        const hpx = Iso.heightPx(hc);
        const p = Iso.proj(boss.x, boss.z, hBase + hc);

        if (img) c.drawImage(img, p.x - wp / 2, p.y, wp, hpx);
        else { c.fillStyle = '#20060f'; c.fillRect(p.x - wp / 2, p.y, wp, hpx); }

        if (boss.flash > 0.02 && img) {
            c.save();
            c.globalCompositeOperation = 'lighter';
            c.globalAlpha = boss.flash * 0.45;
            c.drawImage(img, p.x - wp / 2, p.y, wp, hpx);
            c.restore();
        }

        // 眼睛
        const eyeY = Iso.proj(boss.x, boss.z, hBase + hc * 0.62).y;
        const eyeGap = 15 * s;
        const eyeR = (boss.phase >= 3 ? 5.2 : 4.0) * s;
        for (let i = -1; i <= 1; i += 2) {
            const ex = p0.x + eyeGap * i;
            const gr = c.createRadialGradient(ex, eyeY, 1, ex, eyeY, eyeR * 3);
            gr.addColorStop(0, '#fff');
            gr.addColorStop(0.3, SCENE.accent);
            gr.addColorStop(1, 'rgba(255, 0, 40, 0)');
            c.fillStyle = gr;
            c.beginPath();
            c.arc(ex, eyeY, eyeR * 3, 0, Math.PI * 2);
            c.fill();
        }
    },

    drawPlayer(c) {
        const s = Iso.getScale();
        const img = Assets.get('player');
        const bob = player.moving ? Math.abs(Math.sin(player.walkPhase)) * 0.12 : 0;

        this.shadow(c, player.x, player.z, 1.15, 0.45);

        const wp = Iso.lenPx(1.15);
        const hpx = Iso.heightPx(1.75);
        const p = Iso.proj(player.x, player.z, bob + 1.75);

        c.save();
        if (player.iframe > 0 && Math.floor(this.time * 20) % 2 === 0) c.globalAlpha = 0.45;
        if (img) {
            if (player.dirX < -0.15) {
                c.translate(p.x, 0);
                c.scale(-1, 1);
                c.drawImage(img, -wp / 2, p.y, wp, hpx);
            } else {
                c.drawImage(img, p.x - wp / 2, p.y, wp, hpx);
            }
        } else {
            c.fillStyle = '#eaf4ff';
            c.fillRect(p.x - wp / 2, p.y, wp, hpx);
        }
        c.restore();

        if (player.meleeFx > 0) {
            const a0 = Math.atan2(player.dirZ, player.dirX);
            c.save();
            c.globalAlpha = player.meleeFx * 0.8;
            c.strokeStyle = '#dff2ff';
            c.lineWidth = 3 * s;
            c.beginPath();
            const sweep = MELEE_ARC * (1 - player.meleeFx * 0.3);
            const steps = 12;
            for (let i = 0; i <= steps; i++) {
                const a = a0 - sweep / 2 + (sweep / steps) * i;
                const q = Iso.proj(player.x + Math.cos(a) * MELEE_RANGE * 0.9,
                    player.z + Math.sin(a) * MELEE_RANGE * 0.9, 1.0);
                if (i === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y);
            }
            c.stroke();
            c.restore();
        }
    },

    // ---------------- 弹幕 ----------------
    drawEBullets(c) {
        for (let i = 0; i < eBullets.length; i++) {
            const b = eBullets[i];
            if (b.ground) {
                this.shadow(c, b.x, b.z, 1.0, 0.35);
                const p = Iso.proj(b.x, b.z, b.h);
                const img = Assets.get('bone');
                const size = Iso.lenPx(1.1);
                c.save();
                c.translate(p.x, p.y);
                c.rotate(b.spin || 0);
                if (img) c.drawImage(img, -size / 2, -size / 2, size, size);
                else { c.fillStyle = '#e8e0d0'; c.fillRect(-size / 2, -size / 4, size, size / 2); }
                c.restore();
            } else {
                this.shadow(c, b.x, b.z, 0.85, 0.28);
                const p = Iso.proj(b.x, b.z, b.h);
                const R = Iso.lenPx(b.r) * 2.2;
                const gr = c.createRadialGradient(p.x, p.y, 1, p.x, p.y, R);
                gr.addColorStop(0, 'rgba(255,255,255,0.92)');
                gr.addColorStop(0.35, SCENE.accent);
                gr.addColorStop(1, 'rgba(255,0,60,0)');
                c.fillStyle = gr;
                c.beginPath();
                c.arc(p.x, p.y, R, 0, Math.PI * 2);
                c.fill();
            }
        }
    },

    drawBullets(c) {
        for (let i = 0; i < bullets.length; i++) {
            const b = bullets[i];
            const p = Iso.proj(b.x, b.z, b.h);
            const R = Iso.lenPx(0.42) * 2.2;
            const gr = c.createRadialGradient(p.x, p.y, 1, p.x, p.y, R);
            gr.addColorStop(0, '#ffffff');
            gr.addColorStop(0.4, '#7fd8ff');
            gr.addColorStop(1, 'rgba(60,160,255,0)');
            c.fillStyle = gr;
            c.beginPath();
            c.arc(p.x, p.y, R, 0, Math.PI * 2);
            c.fill();
        }
    },

    // ---------------- 龙骨炮 ----------------
    drawBlasters(c) {
        const s = Iso.getScale();
        for (let i = 0; i < blasters.length; i++) {
            const b = blasters[i];
            const dx = player.x - boss.x, dz = player.z - boss.z;
            const dl = Math.hypot(dx, dz) || 1;
            const nx = dx / dl, nz = dz / dl;
            const qx = -nz, qz = nx;
            const halfW = 1.45;
            const maxT = 30;
            const charge = Math.max(0, Math.min(1, b.charge / 1.05));

            // 地面蓄能环
            const gp = Iso.proj(b.x, b.z, 0);
            const rr = Iso.lenPx(2.3) * (0.45 + charge * 0.7);
            c.save();
            c.globalAlpha = 0.45 + Math.sin(this.time * 24) * 0.18;
            c.strokeStyle = 'rgba(255, 80, 70, 0.95)';
            c.lineWidth = 2 * s;
            c.beginPath();
            c.ellipse(gp.x, gp.y, rr, rr * 0.5, 0, 0, Math.PI * 2);
            c.stroke();
            c.restore();

            // 光束
            const alpha = b.beam > 0 ? Math.min(1, b.beam / 0.14) : 0.24 * charge;
            if (alpha > 0.01) {
                c.save();
                c.globalAlpha = alpha * 0.6;
                c.beginPath();
                let first = true;
                for (let t = 0; t <= maxT; t += 1.2) {
                    const p = Iso.proj(boss.x + nx * t + qx * halfW, boss.z + nz * t + qz * halfW, 1.05);
                    if (first) { c.moveTo(p.x, p.y); first = false; } else c.lineTo(p.x, p.y);
                }
                for (let t = maxT; t >= 0; t -= 1.2) {
                    const p = Iso.proj(boss.x + nx * t - qx * halfW, boss.z + nz * t - qz * halfW, 1.05);
                    c.lineTo(p.x, p.y);
                }
                c.closePath();
                c.fillStyle = b.beam > 0 ? '#ffe2dd' : 'rgba(255, 90, 80, 1)';
                c.fill();
                if (b.beam > 0) {
                    c.globalAlpha = alpha;
                    c.strokeStyle = '#ffffff';
                    c.lineWidth = 3 * s;
                    c.beginPath();
                    const p0 = Iso.proj(boss.x, boss.z, 1.15);
                    const p1 = Iso.proj(boss.x + nx * maxT, boss.z + nz * maxT, 1.15);
                    c.moveTo(p0.x, p0.y);
                    c.lineTo(p1.x, p1.y);
                    c.stroke();
                }
                c.restore();
            }

            // 炮口球体
            const sp = Iso.proj(b.x, b.z, 1.55 + Math.sin(this.time * 6) * 0.1);
            const R = Iso.lenPx(1.2) * (0.5 + charge * 0.9);
            const gr = c.createRadialGradient(sp.x, sp.y, 1, sp.x, sp.y, R);
            gr.addColorStop(0, '#ffffff');
            gr.addColorStop(0.35, 'rgba(255, 120, 100, 0.85)');
            gr.addColorStop(1, 'rgba(255, 40, 40, 0)');
            c.fillStyle = gr;
            c.beginPath();
            c.arc(sp.x, sp.y, R, 0, Math.PI * 2);
            c.fill();
        }
    },

    // ---------------- 风车激光 ----------------
    drawWindmills(c) {
        const s = Iso.getScale();
        for (let i = 0; i < windmills.length; i++) {
            const w = windmills[i];
            const fade = Math.min(1, w.life / 0.6);
            const base = Iso.proj(w.x, w.z, 1.2);
            for (let k = 0; k < w.count; k++) {
                const a = w.ang + (Math.PI * 2 / w.count) * k;
                const p1 = Iso.proj(w.x + Math.cos(a) * 14, w.z + Math.sin(a) * 14, 1.2);
                const g = c.createLinearGradient(base.x, base.y, p1.x, p1.y);
                g.addColorStop(0, 'rgba(255, 255, 255, ' + (0.85 * fade).toFixed(3) + ')');
                g.addColorStop(0.35, 'rgba(160, 220, 255, ' + (0.5 * fade).toFixed(3) + ')');
                g.addColorStop(1, 'rgba(80, 160, 255, 0)');
                c.strokeStyle = g;
                c.lineWidth = 4 * s;
                c.beginPath();
                c.moveTo(base.x, base.y);
                c.lineTo(p1.x, p1.y);
                c.stroke();
            }
            const R = Iso.lenPx(1.9);
            const gg = c.createRadialGradient(base.x, base.y, 2, base.x, base.y, R);
            gg.addColorStop(0, 'rgba(255,255,255,' + (0.9 * fade).toFixed(3) + ')');
            gg.addColorStop(1, 'rgba(120, 200, 255, 0)');
            c.fillStyle = gg;
            c.beginPath();
            c.arc(base.x, base.y, R, 0, Math.PI * 2);
            c.fill();
        }
    },

    // ---------------- 粒子 ----------------
    drawParticles(c) {
        const s = Iso.getScale();
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const k = Math.max(0, p.life / (p.maxLife || 1));
            if (p.kind === 'mark') {
                const sp = Iso.proj(p.x, p.z, 0);
                const r = Iso.lenPx(p.r) * (1.35 - k * 0.35);
                c.save();
                c.globalAlpha = k * 0.85;
                c.strokeStyle = 'rgba(255, 90, 70, 0.95)';
                c.lineWidth = 2.2 * s;
                c.beginPath();
                c.ellipse(sp.x, sp.y, r, r * 0.5, 0, 0, Math.PI * 2);
                c.stroke();
                c.restore();
            } else if (p.kind === 'slash') {
                const sp = Iso.proj(p.x, p.z, p.h || 1);
                c.save();
                c.globalAlpha = k * 0.9;
                c.strokeStyle = '#e8f7ff';
                c.lineWidth = 3.4 * s;
                c.beginPath();
                c.arc(sp.x, sp.y, Iso.lenPx(p.r || 1.4) * (1.2 - k * 0.4), 0, Math.PI * 2);
                c.stroke();
                c.restore();
            } else {
                const sp = Iso.proj(p.x, p.z, p.h || 0.6);
                const R = Iso.lenPx(0.34) * (0.6 + k * 1.1);
                const col = p.color || SCENE.accent;
                const g = c.createRadialGradient(sp.x, sp.y, 0.5, sp.x, sp.y, R * 2.6);
                g.addColorStop(0, 'rgba(255,255,255,' + (0.95 * k).toFixed(3) + ')');
                g.addColorStop(0.4, col);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                c.globalAlpha = k;
                c.fillStyle = g;
                c.beginPath();
                c.arc(sp.x, sp.y, R * 2.6, 0, Math.PI * 2);
                c.fill();
                c.globalAlpha = 1;
            }
        }
    },

    // ---------------- 伤害数字 ----------------
    drawDamageNumbers(c) {
        const s = Iso.getScale();
        for (let i = 0; i < damageNumbers.length; i++) {
            const d = damageNumbers[i];
            const k = Math.max(0, d.life / (d.maxLife || 1));
            const p = Iso.proj(d.x, d.z, d.h || 2);
            c.save();
            c.globalAlpha = Math.min(1, k * 1.6);
            c.font = 'bold ' + Math.round(15 * s) + 'px "Segoe UI", sans-serif';
            c.textAlign = 'center';
            c.lineWidth = 3 * s;
            c.strokeStyle = 'rgba(0,0,0,0.75)';
            c.strokeText(d.text, p.x, p.y);
            c.fillStyle = d.color || '#fff';
            c.fillText(d.text, p.x, p.y);
            c.restore();
        }
    },

    // ---------------- HUD ----------------
    drawHUD(c, w, h) {
        const s = Math.min(1.35, Math.max(0.78, h / 900));

        // 玩家血条
        const barW = 250 * s, barH = 13 * s, bx = 26 * s, by = 26 * s;
        c.save();
        c.fillStyle = 'rgba(8, 6, 14, 0.62)';
        this.roundRect(c, bx - 8 * s, by - 8 * s, barW + 16 * s, barH + 16 * s, 6 * s);
        c.fill();

        c.fillStyle = 'rgba(255,255,255,0.10)';
        this.roundRect(c, bx, by, barW, barH, 4 * s);
        c.fill();

        const hpRatio = Math.max(0, player.hp / player.maxHp);
        const hpCol = hpRatio > 0.5 ? '#57e08a' : (hpRatio > 0.25 ? '#ffc44d' : '#ff4d55');
        const g = c.createLinearGradient(bx, 0, bx + barW, 0);
        g.addColorStop(0, hpCol);
        g.addColorStop(1, 'rgba(255,255,255,0.85)');
        c.fillStyle = g;
        this.roundRect(c, bx, by, barW * hpRatio, barH, 4 * s);
        c.fill();

        c.fillStyle = 'rgba(255,255,255,0.92)';
        c.font = 'bold ' + Math.round(11 * s) + 'px "Segoe UI", sans-serif';
        c.textAlign = 'left';
        c.fillText('HP  ' + Math.ceil(Math.max(0, player.hp)) + ' / ' + player.maxHp, bx + 4 * s, by + barH + 15 * s);

        // 冲刺 / 药水
        const dashReady = player.dashCd <= 0;
        const infoY = by + barH + 32 * s;
        c.fillStyle = dashReady ? 'rgba(140, 230, 255, 0.95)' : 'rgba(255,255,255,0.35)';
        c.font = 'bold ' + Math.round(11 * s) + 'px "Segoe UI", sans-serif';
        c.fillText(dashReady ? 'Dash Ready' : 'Dash ' + player.dashCd.toFixed(1) + 's', bx, infoY);
        c.fillStyle = 'rgba(255, 180, 190, 0.95)';
        c.fillText('Potion x' + hpPotions, bx + 96 * s, infoY);
        c.restore();

        // BOSS 血条
        if (!boss.dead) {
            const bw = Math.min(w * 0.6, 720 * s);
            const bh = 12 * s;
            const x0 = (w - bw) / 2;
            const y0 = h - 54 * s;
            c.save();
            c.fillStyle = 'rgba(8, 4, 10, 0.6)';
            this.roundRect(c, x0 - 6 * s, y0 - 30 * s, bw + 12 * s, bh + 40 * s, 8 * s);
            c.fill();

            c.fillStyle = 'rgba(255,255,255,0.9)';
            c.font = 'bold ' + Math.round(14 * s) + 'px "Segoe UI", sans-serif';
            c.textAlign = 'center';
            c.fillText(SCENE.bossName + '   ·   Phase ' + boss.phase + '', w / 2, y0 - 12 * s);

            c.fillStyle = 'rgba(255,255,255,0.10)';
            this.roundRect(c, x0, y0, bw, bh, 5 * s);
            c.fill();
            const br = Math.max(0, boss.hp / boss.maxHp);
            const bg = c.createLinearGradient(x0, 0, x0 + bw, 0);
            bg.addColorStop(0, SCENE.accent);
            bg.addColorStop(0.6, '#ff6b52');
            bg.addColorStop(1, '#ffd0a0');
            c.fillStyle = bg;
            this.roundRect(c, x0, y0, bw * br, bh, 5 * s);
            c.fill();
            if (bossBarFlash > 0) {
                c.globalAlpha = Math.min(1, bossBarFlash * 0.8);
                c.fillStyle = '#fff';
                this.roundRect(c, x0, y0, bw * br, bh, 5 * s);
                c.fill();
                c.globalAlpha = 1;
            }

            // 待结算 DoT（延迟扣血）提示
            const pending = boss.dotPending || 0;
            if (pending > 0.05) {
                const rateNow = (boss.dots || []).reduce(function (a, d) { return a + d.rate; }, 0);
                c.fillStyle = 'rgba(255, 150, 120, 0.9)';
                c.font = 'bold ' + Math.round(11 * s) + 'px "Segoe UI", sans-serif';
                c.textAlign = 'left';
                c.fillText('Bleed pending -' + Math.round(pending) + '   ' + Math.round(rateNow) + ' /s',
                    x0, y0 + bh + 18 * s);
                c.textAlign = 'center';
            }
            c.restore();
        }

        // 右上信息
        c.save();
        c.textAlign = 'right';
        c.font = 'bold ' + Math.round(12 * s) + 'px "Segoe UI", sans-serif';
        c.fillStyle = 'rgba(255,255,255,0.62)';
        c.fillText('Left  ' + Math.floor(boss.hp > 0 ? boss.hp : 0) + '  /  ' + boss.maxHp, w - 26 * s, 34 * s);
        c.fillText('Time  ' + fightTime.toFixed(1) + 's', w - 26 * s, 54 * s);
        if (SCENE.musicName) {
            c.font = Math.round(11 * s) + 'px "Segoe UI", sans-serif';
            c.fillStyle = SCENE.accent || 'rgba(255,255,255,0.55)';
            c.globalAlpha = 0.72;
            c.fillText('♪ ' + SCENE.musicName, w - 26 * s, 74 * s);
            c.globalAlpha = 1;
        }
        c.restore();

        this.drawMinimap(c, w, h, s);
    },

    drawMinimap(c, w, h, s) {
        const size = 118 * s;
        const mx = w - size - 24 * s;
        const my = 70 * s;
        const cell = size / WORLD_W;
        c.save();
        c.fillStyle = 'rgba(6, 5, 12, 0.66)';
        this.roundRect(c, mx - 4, my - 4, size + 8, size + 8, 6 * s);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.16)';
        c.lineWidth = 1;
        c.stroke();

        const mmWall = IS_PRISON ? 'rgba(104, 136, 168, 0.55)' : 'rgba(120, 108, 165, 0.55)';
        const mmPillar = IS_PRISON ? 'rgba(140, 178, 210, 0.82)' : 'rgba(150, 130, 205, 0.8)';
        const mmAltar = IS_PRISON ? 'rgba(108, 172, 142, 0.9)' : 'rgba(120, 80, 170, 0.9)';
        for (let z = 0; z < WORLD_H; z++) {
            for (let x = 0; x < WORLD_W; x++) {
                const t = MAP.grid[z * WORLD_W + x];
                if (!t) continue;
                c.fillStyle = t === 1 ? mmWall
                    : (t === 2 ? mmPillar
                        : (t === 4 ? 'rgba(198, 218, 244, 0.72)' : mmAltar));
                c.fillRect(mx + x * cell, my + z * cell, cell + 0.4, cell + 0.4);
            }
        }
        if (!boss.dead) {
            c.fillStyle = '#ff3b30';
            c.beginPath();
            c.arc(mx + boss.x * cell, my + boss.z * cell, Math.max(2, cell * 2.2), 0, Math.PI * 2);
            c.fill();
        }
        c.fillStyle = '#7fe6a8';
        c.beginPath();
        c.arc(mx + player.x * cell, my + player.z * cell, Math.max(1.6, cell * 1.6), 0, Math.PI * 2);
        c.fill();
        c.restore();
    },

    roundRect(c, x, y, w, h, r) {
        const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        c.beginPath();
        c.moveTo(x + rr, y);
        c.lineTo(x + w - rr, y);
        c.quadraticCurveTo(x + w, y, x + w, y + rr);
        c.lineTo(x + w, y + h - rr);
        c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        c.lineTo(x + rr, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - rr);
        c.lineTo(x, y + rr);
        c.quadraticCurveTo(x, y, x + rr, y);
        c.closePath();
    },

    drawVignette(c, w, h) {
        if (!this._vig || this._vigW !== w || this._vigH !== h) {
            const off = document.createElement('canvas');
            off.width = w;
            off.height = h;
            const b = off.getContext('2d');
            const g = b.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.78);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(1, 'rgba(0,0,0,0.72)');
            b.fillStyle = g;
            b.fillRect(0, 0, w, h);
            this._vig = off;
            this._vigW = w;
            this._vigH = h;
        }
        c.drawImage(this._vig, 0, 0);
    },

    drawIntro(c, w, h) {
        const s = Math.min(1.4, Math.max(0.8, h / 900));
        const k = Math.min(1, introT / 0.6) * Math.min(1, Math.max(0, (3.4 - introT) / 0.8));
        if (k <= 0.01) return;
        c.save();
        c.globalAlpha = k;
        c.textAlign = 'center';
        c.fillStyle = 'rgba(0,0,0,0.45)';
        c.fillRect(0, h * 0.32, w, 118 * s);

        c.fillStyle = '#fff';
        c.font = 'bold ' + Math.round(34 * s) + 'px "Segoe UI", sans-serif';
        c.fillText(SCENE.bossTitle, w / 2, h * 0.32 + 58 * s);

        c.fillStyle = 'rgba(255,255,255,0.62)';
        c.font = Math.round(13 * s) + 'px "Segoe UI", sans-serif';
        c.fillText('WASD Move   ·   Left Click Shoot   ·   Space Dash   ·   E Melee   ·   Q Potion', w / 2, h * 0.32 + 92 * s);

        if (SCENE.musicName) {
            c.fillStyle = SCENE.accent || 'rgba(255,255,255,0.6)';
            c.globalAlpha = k * 0.85;
            c.font = Math.round(12 * s) + 'px "Segoe UI", sans-serif';
            c.fillText('♪ ' + SCENE.musicName + (SCENE.musicNameEn ? '  ·  ' + SCENE.musicNameEn : ''), w / 2, h * 0.32 + 112 * s);
            c.globalAlpha = k;
        }
        c.restore();
    },

    drawMessage(c, w, h) {
        if (msgTimer <= 0 || !msgText) return;
        const s = Math.min(1.35, Math.max(0.8, h / 900));
        const a = Math.min(1, msgTimer * 1.6);
        c.save();
        c.globalAlpha = a;
        c.textAlign = 'center';
        c.font = 'bold ' + Math.round(19 * s) + 'px "Segoe UI", sans-serif';
        c.fillStyle = 'rgba(0,0,0,0.62)';
        const tw = c.measureText(msgText).width;
        this.roundRect(c, w / 2 - tw / 2 - 22 * s, h * 0.19 - 26 * s, tw + 44 * s, 40 * s, 6 * s);
        c.fill();
        c.fillStyle = SCENE.accentSoft;
        c.fillText(msgText, w / 2, h * 0.19);
        c.restore();
    }
};
