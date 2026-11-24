// ============================================================
//  summon.js — 召唤物：block（小方块随从）
//   · 开场召唤 1 个；BOSS 每 40s 检测场上是否有 block，没有就补 1 个
//   · block 会移动到 player 身边，玩家原地不动 0.5s 且在攻击范围内时出手（5 点伤害）
//   · block 自身 HP = 50，可被近战/能量弹击碎
// ============================================================

const BLOCK_HP = 50;            // block 血量
const BLOCK_SPEED = 2.3;        // 移动速度（格 / 秒）
const BLOCK_R = 0.55;           // 碰撞 / 受击半径（格）
const BLOCK_ATK_RANGE = 2.0;    // 攻击范围（格）
const BLOCK_ATK_DMG = 5;        // 单次攻击伤害
const BLOCK_ATK_CD = 1.05;      // 攻击间隔
const BLOCK_IDLE_SEC = 0.5;     // 玩家需原地不动的时长
const BLOCK_CHECK_SEC = 40;     // BOSS 检测场上 block 的间隔
const BLOCK_MAX = 1;            // 场上同时最多 1 个

const Summon = {
    list: [],
    checkT: BLOCK_CHECK_SEC,
    idleT: 0,
    time: 0,

    reset() {
        this.list.length = 0;
        this.checkT = BLOCK_CHECK_SEC;
        this.idleT = 0;
    },

    count() {
        return this.list.length;
    },

    // 随机空地：只落在可走空地格中心，避开 BOSS、玩家与已有 block
    pickSpot() {
        const L = MAP.BORDER + 1, R = MAP.W - MAP.BORDER - 1;
        const T = MAP.BORDER + 1, B = MAP.H - MAP.BORDER - 1;
        let best = null;
        for (let t = 0; t < 260; t++) {
            const x = Math.floor(rnd(L, R));
            const z = Math.floor(rnd(T, B));
            if (MAP.tileAt(x, z) !== 0) continue;
            const cx = x + 0.5, cz = z + 0.5;
            if (dist(cx, cz, boss.x, boss.z) < 4.5) continue;
            if (dist(cx, cz, player.x, player.z) < 4.0) continue;
            if (!best) best = { x: cx, z: cz };
            let blocked = false;
            for (let i = 0; i < this.list.length; i++) {
                const o = this.list[i];
                if (dist(cx, cz, o.x, o.z) < 2.2) { blocked = true; break; }
            }
            if (!blocked) return { x: cx, z: cz };
        }
        return best;
    },

    spawn(silent) {
        if (this.list.length >= BLOCK_MAX) return null;
        if (boss.dead) return null;
        const spot = this.pickSpot();
        if (!spot) return null;
        const blk = {
            x: spot.x, z: spot.z,
            hp: BLOCK_HP, maxHp: BLOCK_HP,
            r: BLOCK_R,
            atkCd: 0.4, spawnT: silent ? 0 : 0.55,
            flash: 0, hurtT: 0, lunge: 0,
            face: 0, seed: rnd(0, 6.283)
        };
        this.list.push(blk);
        for (let i = 0; i < 14; i++) {
            particles.push({
                kind: 'spark', x: blk.x, z: blk.z, h: rnd(0.1, 1.8),
                vx: rnd(-2.4, 2.4), vz: rnd(-2.4, 2.4), vh: rnd(1, 4.5),
                life: 0.55, maxLife: 0.55, color: SCENE.accent
            });
        }
        if (!silent) {
            shake = Math.max(shake, 3);
            showMsg('地面裂开 —— block 现身了', 1.8);
        }
        return blk;
    },

    update(dt) {
        this.time += dt;
        if (gameState !== 'fight') return;

        // 玩家静止计时：键盘/摇杆无输入且不在冲刺中
        if (!player.moving && player.dashT <= 0) this.idleT += dt;
        else this.idleT = 0;

        // BOSS 每 40s 检测一次：场上没有 block 就补 1 个
        if (!boss.dead) {
            this.checkT -= dt;
            if (this.checkT <= 0) {
                this.checkT = BLOCK_CHECK_SEC;
                if (this.count() < 1) this.spawn();
            }
        }

        for (let i = this.list.length - 1; i >= 0; i--) {
            const b = this.list[i];
            b.flash = Math.max(0, b.flash - dt * 3.4);
            b.hurtT = Math.max(0, b.hurtT - dt);
            b.lunge = Math.max(0, b.lunge - dt * 4);
            if (b.spawnT > 0) { b.spawnT -= dt; continue; }
            if (b.atkCd > 0) b.atkCd = Math.max(0, b.atkCd - dt);

            const d = dist(b.x, b.z, player.x, player.z) || 0.001;
            const n = norm(player.x - b.x, player.z - b.z);
            b.face = Math.atan2(n.z, n.x);

            // 贴到玩家身边：距离过远靠近，过近稍微退开，保持在攻击范围内游走
            if (d > BLOCK_ATK_RANGE * 0.82) {
                const bx = b.x, bz = b.z;
                MAP.tryMove(b, n.x * BLOCK_SPEED * dt, n.z * BLOCK_SPEED * dt, b.r);
                if (Math.abs(b.x - bx) < 1e-6 && Math.abs(b.z - bz) < 1e-6) {
                    // 正面被墙挡住时侧向绕行
                    const side = ((this.time + i) % 2 < 1) ? 1 : -1;
                    MAP.tryMove(b, -n.z * side * BLOCK_SPEED * dt, n.x * side * BLOCK_SPEED * dt, b.r);
                }
            } else if (d < BLOCK_ATK_RANGE * 0.55) {
                MAP.tryMove(b, -n.x * BLOCK_SPEED * 0.55 * dt, -n.z * BLOCK_SPEED * 0.55 * dt, b.r);
            }
            b.x = clamp(b.x, MAP.BORDER + 0.8, MAP.W - MAP.BORDER - 0.8);
            b.z = clamp(b.z, MAP.BORDER + 0.8, MAP.H - MAP.BORDER - 0.8);

            // 出手条件：玩家原地不动达到 0.5s，且玩家在攻击范围内
            const dd = dist(b.x, b.z, player.x, player.z);
            if (!boss.dead && b.atkCd <= 0 && this.idleT >= BLOCK_IDLE_SEC && dd <= BLOCK_ATK_RANGE) {
                b.atkCd = BLOCK_ATK_CD;
                b.lunge = 1;
                for (let k = 0; k < 6; k++) {
                    particles.push({
                        kind: 'spark', x: b.x + n.x * 0.4, z: b.z + n.z * 0.4, h: rnd(0.4, 1.1),
                        vx: n.x * rnd(1, 3), vz: n.z * rnd(1, 3), vh: rnd(0.4, 2),
                        life: 0.28, maxLife: 0.28, color: '#ff9db1'
                    });
                }
                Combat.hurtPlayer(BLOCK_ATK_DMG, b.x, b.z);
            }
        }
    },

    // 受击 ----------------------------------------------------
    damage(b, n) {
        if (!b || b.hp <= 0) return;
        const dmg = Math.max(1, Math.round(n));
        b.hp -= dmg;
        b.flash = 1;
        b.hurtT = 0.3;
        Combat.pushDmg('-' + dmg, b.x, b.z, 1.7, '#ffe066');
        shake = Math.max(shake, 1.6);
        if (b.hp <= 0) {
            b.hp = 0;
            this.kill(b);
        }
    },

    kill(b) {
        const i = this.list.indexOf(b);
        if (i >= 0) this.list.splice(i, 1);
        for (let k = 0; k < 16; k++) {
            particles.push({
                kind: 'spark', x: b.x, z: b.z, h: rnd(0.1, 1.5),
                vx: rnd(-3, 3), vz: rnd(-3, 3), vh: rnd(1, 4.6),
                life: 0.55, maxLife: 0.55, color: '#cfe8ff'
            });
        }
        shake = Math.max(shake, 2.5);
        showMsg('block 被击碎', 1.1);
    },

    // 绘制（由 render 的深度排序调用）------------------------
    drawOne(c, b) {
        const s = Iso.getScale();
        const hgt = 0.95;

        Render.shadow(c, b.x, b.z + 0.18, 1.6, 0.46);

        const px = b.x - 0.5, pz = b.z - 0.5;

        // 脚下常亮能量环：让 block 在暗场里一眼可辨
        const base = Iso.proj(b.x, b.z, 0);
        const pulse = 0.55 + 0.45 * Math.sin(this.time * 4.2 + b.seed);
        c.save();
        c.globalAlpha = 0.35 + 0.3 * pulse;
        c.strokeStyle = SCENE.accent;
        c.lineWidth = Math.max(1, 2 * s);
        c.beginPath();
        c.ellipse(base.x, base.y, 26 * s, 13 * s, 0, 0, Math.PI * 2);
        c.stroke();
        c.restore();

        Iso.drawBlock(c, px, pz, hgt, '#9fd0ff', '#4f7ba8', '#2b4460');

        // 亮色描边让方块轮廓从地面里跳出来
        c.save();
        c.globalAlpha = 0.55 + 0.45 * pulse;
        c.strokeStyle = 'rgba(190, 235, 255, 0.9)';
        c.lineWidth = Math.max(1, 1.6 * s);
        const e0 = Iso.proj(px, pz + 1, 0);
        const e1 = Iso.proj(px + 1, pz + 1, 0);
        const e2 = Iso.proj(px + 1, pz + 1, hgt);
        const e3 = Iso.proj(px, pz + 1, hgt);
        c.beginPath();
        c.moveTo(e0.x, e0.y);
        c.lineTo(e1.x, e1.y);
        c.lineTo(e2.x, e2.y);
        c.lineTo(e3.x, e3.y);
        c.closePath();
        c.stroke();
        c.restore();

        // 出场瞬间：一圈扩散地面环
        if (b.spawnT > 0) {
            const p0 = Iso.proj(b.x, b.z, 0);
            const rr = (1 - b.spawnT / 0.55) * Iso.lenPx(1.6);
            c.save();
            c.globalAlpha = b.spawnT / 0.55 * 0.8;
            c.strokeStyle = SCENE.accent;
            c.lineWidth = Math.max(1, 2 * s);
            c.beginPath();
            c.ellipse(p0.x, p0.y, rr, rr * 0.5, 0, 0, Math.PI * 2);
            c.stroke();
            c.restore();
        }

        // 顶面高光边（让它像一块独立的方砖）
        const t0 = Iso.proj(px, pz, hgt);
        const hw = Iso.hTW, hd = Iso.hTH, hs = Iso.hSH;
        c.save();
        c.strokeStyle = 'rgba(150, 190, 240, 0.5)';
        c.lineWidth = Math.max(1, 1.4 * s);
        c.beginPath();
        c.moveTo(t0.x, t0.y);
        c.lineTo(t0.x + hw, t0.y);
        c.lineTo(t0.x + hw + hs, t0.y + hd);
        c.lineTo(t0.x + hs, t0.y + hd);
        c.closePath();
        c.stroke();
        c.restore();

        // 受击闪白
        if (b.flash > 0.02) {
            c.save();
            c.globalCompositeOperation = 'lighter';
            c.globalAlpha = b.flash * 0.5;
            Iso.drawBlock(c, px, pz, hgt, '#ffffff', '#ffd9e2', '#ffb0c4');
            c.restore();
        }

        // 血条
        const top = Iso.proj(b.x, b.z, hgt + 0.62);
        const bw = 36 * s, bh = 5 * s;
        c.save();
        c.fillStyle = 'rgba(0, 0, 0, 0.62)';
        c.fillRect(top.x - bw / 2, top.y, bw, bh);
        c.fillStyle = '#7dffa6';
        c.fillRect(top.x - bw / 2, top.y, bw * Math.max(0, b.hp) / b.maxHp, bh);
        c.strokeStyle = 'rgba(210, 230, 255, 0.6)';
        c.lineWidth = 1;
        c.strokeRect(top.x - bw / 2 + 0.5, top.y + 0.5, bw - 1, bh - 1);
        c.restore();
    }
};
