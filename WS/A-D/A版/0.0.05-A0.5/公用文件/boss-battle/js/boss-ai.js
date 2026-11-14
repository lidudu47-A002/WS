// ============================================================
//  boss-ai.js — 实时 BOSS AI（非回合制 · 弹幕 / 龙炮 / 冲撞）
//  每帧 updateBoss(dt) 推进，技能按阶段自动释放
// ============================================================

const BossAI = {
    // ---------------- 主更新 ----------------
    update(dt) {
        if (boss.dead) { this.updateDebris(dt); return; }

        // 阶段判定
        const ratio = boss.hp / boss.maxHp;
        const np = ratio > 0.66 ? 1 : (ratio > 0.33 ? 2 : 3);
        if (np !== boss.phase) {
            boss.phase = np;
            boss.skillCd = 0.9;
            boss.flash = 0.5;
            shake = Math.max(shake, 7);
            showMsg(np === 2 ? '第二阶段 · 骨翼张开' : '最终阶段 · 深渊苏醒', 2.4);
        }

        boss.floatT += dt;
        boss.flash = Math.max(0, boss.flash - dt * 3);
        boss.hurtT = Math.max(0, boss.hurtT - dt);

        // 状态机
        boss.statusT += dt;
        switch (boss.status) {
            case 'idle': this.stateIdle(dt); break;
            case 'volley': this.stateVolley(dt); break;
            case 'rain': this.stateRain(dt); break;
            case 'beam': this.stateBeam(dt); break;
            case 'windmill': this.stateWindmill(dt); break;
            case 'charge': this.stateCharge(dt); break;
            case 'ring': this.stateRing(dt); break;
            default: boss.status = 'idle';
        }
    },

    setStatus(s) {
        boss.status = s;
        boss.statusT = 0;
        boss.volleyLeft = 0;
        boss.volleyTimer = 0;
    },

    // ---------------- 待机：保持距离 + 侧向游走 ----------------
    stateIdle(dt) {
        const d = dist(boss.x, boss.z, player.x, player.z);
        const dx = player.x - boss.x, dz = player.z - boss.z;
        const n = norm(dx, dz);

        // 保持 4.5~9 格弹幕距离
        let sp = 0;
        if (d > 9) sp = 3.0;
        else if (d > 7) sp = 1.4;
        else if (d < 4.5) sp = -1.4;

        // 侧向游走，避免原地站桩
        boss.strafeT = (boss.strafeT || 0) - dt;
        if (boss.strafeT <= 0) {
            boss.strafeT = rnd(0.9, 1.9);
            boss.strafeDir = Math.random() < 0.5 ? -1 : 1;
            boss.strafeSp = rnd(0.5, 1.3);
        }
        const sd = boss.strafeDir || 1;
        const sx = -n.z * sd * boss.strafeSp;
        const sz = n.x * sd * boss.strafeSp;

        this.moveBoss((n.x * sp + sx) * dt, (n.z * sp + sz) * dt);

        boss.skillCd -= dt;
        if (boss.skillCd <= 0) this.chooseSkill(d);
    },

    // ---------------- 技能选择 ----------------
    chooseSkill(d) {
        const p = boss.phase;
        const pool = [];
        if (p === 1) {
            pool.push('volley', 'rain');
        } else if (p === 2) {
            pool.push('volley', 'rain', 'beam', 'ring');
        } else {
            pool.push('volley', 'rain', 'beam', 'ring', 'windmill', 'charge');
        }
        // 距离过近优先近身手段
        if (d < 5 && Math.random() < 0.45) {
            this.setStatus('charge');
            return;
        }
        const pick = pool[Math.floor(Math.random() * pool.length)];
        this.setStatus(pick);
        if (pick === 'volley') boss.volleyLeft = p >= 2 ? 6 : 4;
        if (pick === 'rain') boss.rainLeft = p >= 3 ? 5 : 4;
        if (pick === 'beam') this.prepareBlaster();
        if (pick === 'windmill') this.startWindmill();
    },

    skillDone() {
        boss.skillCd = boss.phase === 1 ? rnd(1.5, 2.3) : (boss.phase === 2 ? rnd(1.2, 2.0) : rnd(0.9, 1.6));
        this.setStatus('idle');
    },

    // ---------------- 追踪弹 ----------------
    stateVolley(dt) {
        boss.volleyTimer -= dt;
        if (boss.volleyTimer <= 0 && boss.volleyLeft > 0) {
            boss.volleyLeft--;
            boss.volleyTimer = 0.14;
            const ang = Math.atan2(player.z - boss.z, player.x - boss.x) + rnd(-0.2, 0.2);
            eBullets.push({
                x: boss.x, z: boss.z, h: 1.5,
                vx: Math.cos(ang) * 7.2, vz: Math.sin(ang) * 7.2,
                r: 0.46, dmg: 7, type: 'orb', life: 6, spin: 0, homing: 0.65
            });
        }
        if (boss.volleyLeft <= 0 && boss.volleyTimer <= -0.35) this.skillDone();
        if (boss.statusT > 4.5) this.skillDone();
    },

    // ---------------- 骨弹雨 ----------------
    stateRain(dt) {
        boss.rainTimer = (boss.rainTimer || 0) - dt;
        if (boss.rainTimer <= 0 && boss.rainLeft > 0) {
            boss.rainLeft--;
            boss.rainTimer = 0.32;
            // 以玩家为中心散布落点
            const n = boss.phase >= 3 ? 3 : 2;
            for (let i = 0; i < n; i++) {
                const ang = Math.random() * Math.PI * 2;
                const rad = rnd(0.5, 5.5);
                const tx = clamp(player.x + Math.cos(ang) * rad, 2, WORLD_W - 2);
                const tz = clamp(player.z + Math.sin(ang) * rad, 2, WORLD_H - 2);
                particles.push({
                    kind: 'mark', x: tx, z: tz, life: 0.62, maxLife: 0.62, r: 0.75
                });
                eBullets.push({
                    x: tx, z: tz, h: 9, vh: -14,
                    vx: 0, vz: 0, r: 0.5, dmg: 6, type: 'bone',
                    life: 1.4, ground: true, spin: Math.random() * 6
                });
            }
        }
        if (boss.rainLeft <= 0 && (boss.rainTimer || 0) <= -0.5) this.skillDone();
        if (boss.statusT > 5.5) this.skillDone();
    },

    // ---------------- 龙骨炮 ----------------
    prepareBlaster() {
        const side = Math.random() < 0.5 ? -1 : 1;
        blasters.length = 0;
        blasters.push({
            side: side,
            x: clamp(player.x + side * rnd(3, 6), 3, WORLD_W - 3),
            z: 3.2,
            anchorX: boss.x, anchorZ: boss.z,
            charge: 0, fired: 0, life: 3.2, beam: 0
        });
        showMsg('龙骨炮 · 蓄能', 1.4);
    },

    stateBeam(dt) {
        const b = blasters[0];
        if (!b) { this.skillDone(); return; }
        if (b.life > 0) b.life -= dt;
        b.x += (boss.x - b.x) * Math.min(1, dt * 1.2);
        b.z += (boss.z - b.z) * Math.min(1, dt * 1.2);

        if (b.life > 0) {
            b.charge += dt;
            if (b.charge > 1.05 && b.beam <= 0) {
                b.beam = 0.45;         // 光柱持续时间
                shake = Math.max(shake, 5);
                // 判定：以 BOSS 为原点朝玩家方向的宽矩形
                const n = norm(player.x - boss.x, player.z - boss.z);
                for (let t = 0; t < 30; t += 0.6) {
                    const px = boss.x + n.x * t;
                    const pz = boss.z + n.z * t;
                    if (dist(px, pz, player.x, player.z) < 1.5) {
                        Combat.hurtPlayer(12, px, pz);
                        break;
                    }
                    if (MAP.isSolid(px, pz)) break;
                }
            }
            if (b.beam > 0) {
                b.beam -= dt;
                if (b.beam <= 0) b.life = Math.min(b.life, 0.4);
            }
            if (b.life <= 0.42) b.life = Math.min(b.life, 0.42);
            if (boss.statusT > 3.6) this.skillDone();
        } else {
            this.skillDone();
        }
    },

    // ---------------- 风车激光 ----------------
    startWindmill() {
        windmills.length = 0;
        windmills.push({
            x: boss.x, z: boss.z, ang: Math.random() * Math.PI,
            count: 8, speed: 2.1, life: 4.2, maxLife: 4.2, tick: 0
        });
        showMsg('风车 · 旋转光刃', 1.6);
    },

    stateWindmill(dt) {
        const w = windmills[0];
        if (!w) { this.skillDone(); return; }
        w.x += (boss.x - w.x) * Math.min(1, dt * 2);
        w.z += (boss.z - w.z) * Math.min(1, dt * 2);
        w.ang += w.speed * dt * (boss.phase >= 3 ? 1.35 : 1);
        w.life -= dt;
        w.tick -= dt;

        if (w.tick <= 0) {
            w.tick = 0.28;
            // 8 条光束，沿线检测玩家
            for (let i = 0; i < w.count; i++) {
                const a = w.ang + (Math.PI * 2 / w.count) * i;
                for (let t = 1.2; t < 14; t += 0.7) {
                    const px = w.x + Math.cos(a) * t;
                    const pz = w.z + Math.sin(a) * t;
                    if (MAP.isSolid(px, pz)) break;
                    if (dist(px, pz, player.x, player.z) < 0.62) {
                        Combat.hurtPlayer(4, px, pz);
                        break;
                    }
                }
            }
        }
        if (w.life <= 0) { windmills.length = 0; this.skillDone(); }
    },

    // ---------------- 环形弹幕 ----------------
    stateRing(dt) {
        if (!boss.ringFired) {
            boss.ringFired = true;
            const n = boss.phase >= 3 ? 22 : 16;
            const base = Math.random() * Math.PI;
            for (let i = 0; i < n; i++) {
                const a = base + (Math.PI * 2 / n) * i;
                eBullets.push({
                    x: boss.x, z: boss.z, h: 1.4,
                    vx: Math.cos(a) * 6.0, vz: Math.sin(a) * 6.0,
                    r: 0.42, dmg: 5, type: 'orb', life: 5, spin: 0
                });
            }
            shake = Math.max(shake, 4);
            if (boss.phase >= 3) {
                // 双层反向
                setTimeout(function () {
                    for (let i = 0; i < n; i++) {
                        const a = base + (Math.PI * 2 / n) * i + 0.14;
                        eBullets.push({
                            x: boss.x, z: boss.z, h: 1.4,
                            vx: Math.cos(a) * 4.2, vz: Math.sin(a) * 4.2,
                            r: 0.36, dmg: 4, type: 'orb', life: 5, spin: 0
                        });
                    }
                }, 260);
            }
        }
        if (boss.statusT > 0.8) { boss.ringFired = false; this.skillDone(); }
    },

    // ---------------- 冲撞 ----------------
    stateCharge(dt) {
        if (!boss.chargeDirX && !boss.chargeDirZ) {
            const n = norm(player.x - boss.x, player.z - boss.z);
            boss.chargeDirX = n.x; boss.chargeDirZ = n.z;
            boss.chargeWind = 0.55;
            showMsg('冲撞 · 躲开', 1.2);
        }
        boss.chargeWind -= dt;
        if (boss.chargeWind > 0) return;

        const sp = 11.5;
        const nx = boss.x + boss.chargeDirX * sp * dt;
        const nz = boss.z + boss.chargeDirZ * sp * dt;
        if (MAP.isSolid(nx + boss.chargeDirX, nz + boss.chargeDirZ)) {
            boss.chargeDirX = 0; boss.chargeDirZ = 0;
            shake = Math.max(shake, 8);
            for (let i = 0; i < 16; i++) {
                particles.push({
                    kind: 'spark', x: boss.x, z: boss.z, h: rnd(0.3, 2),
                    vx: rnd(-6, 6), vz: rnd(-6, 6), vh: rnd(1, 6),
                    life: rnd(0.3, 0.7), maxLife: 0.7, color: SCENE.accent
                });
            }
            this.skillDone();
            return;
        }
        boss.x = nx; boss.z = nz;

        if (dist(boss.x, boss.z, player.x, player.z) < boss.r + PLAYER_R + 0.3) {
            Combat.hurtPlayer(10, boss.x, boss.z);
        }
        if (boss.statusT > 2.2) {
            boss.chargeDirX = 0; boss.chargeDirZ = 0;
            this.skillDone();
        }
    },

    // ---------------- BOSS 位移（带地形碰撞） ----------------
    moveBoss(dx, dz) {
        const nx = boss.x + dx, nz = boss.z + dz;
        const rr = boss.r * 0.75;
        if (!MAP.isSolid(nx + Math.sign(dx) * rr, boss.z)) boss.x = nx;
        if (!MAP.isSolid(boss.x, nz + Math.sign(dz) * rr)) boss.z = nz;
        boss.x = clamp(boss.x, 3, WORLD_W - 3);
        boss.z = clamp(boss.z, 3, WORLD_H - 3);
    },

    // ---------------- 弹幕推进 ----------------
    updateBullets(dt) {
        // 玩家弹
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            const nx = b.x + b.vx * dt;
            const nz = b.z + b.vz * dt;
            b.life -= dt;
            if (MAP.isSolid(nx, nz) || b.life <= 0) {
                this.spark(b.x, b.z, '#9fe6ff', 4);
                bullets.splice(i, 1);
                continue;
            }
            b.x = nx; b.z = nz; b.h = 1.1;

            if (!boss.dead && dist(b.x, b.z, boss.x, boss.z) < boss.r + 0.3) {
                Combat.damageBoss(b.dmg, b.x, b.z);
                this.spark(b.x, b.z, '#cfefff', 6);
                bullets.splice(i, 1);
            }
        }

        // BOSS 弹
        for (let i = eBullets.length - 1; i >= 0; i--) {
            const b = eBullets[i];
            b.life -= dt;
            b.spin = (b.spin || 0) + dt * 3;

            if (b.ground) {
                b.h += (b.vh || -14) * dt;
                if (b.h <= 0) {
                    // 落地：小范围判定
                    if (dist(b.x, b.z, player.x, player.z) < 1.05) {
                        Combat.hurtPlayer(b.dmg, b.x, b.z);
                    }
                    this.spark(b.x, b.z, SCENE.accent, 10);
                    eBullets.splice(i, 1);
                    continue;
                }
            } else {
                if (b.homing) {
                    const n = norm(player.x - b.x, player.z - b.z);
                    const cur = norm(b.vx, b.vz);
                    const sp = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
                    const blend = Math.min(1, dt * b.homing);
                    b.vx = (cur.x * (1 - blend) + n.x * blend) * sp;
                    b.vz = (cur.z * (1 - blend) + n.z * blend) * sp;
                }
                const nx = b.x + b.vx * dt;
                const nz = b.z + b.vz * dt;
                if (MAP.isSolid(nx, nz)) {
                    if (dist(b.x, b.z, player.x, player.z) < 0.6) {
                        Combat.hurtPlayer(b.dmg, b.x, b.z);
                    }
                    this.spark(b.x, b.z, SCENE.accent, 5);
                    eBullets.splice(i, 1);
                    continue;
                }
                b.x = nx; b.z = nz;

                if (dist(b.x, b.z, player.x, player.z) < b.r + PLAYER_R) {
                    Combat.hurtPlayer(b.dmg, b.x, b.z);
                    this.spark(b.x, b.z, SCENE.accent, 8);
                    eBullets.splice(i, 1);
                    continue;
                }
            }
            if (b.life <= 0) eBullets.splice(i, 1);
        }

        // 龙炮寿命
        for (let i = blasters.length - 1; i >= 0; i--) {
            if (blasters[i].life <= -0.6) blasters.splice(i, 1);
        }
    },

    spark(x, z, color, n) {
        for (let i = 0; i < n; i++) {
            particles.push({
                kind: 'spark', x: x, z: z, h: rnd(0.4, 1.2),
                vx: rnd(-3.5, 3.5), vz: rnd(-3.5, 3.5), vh: rnd(0.5, 4),
                life: rnd(0.2, 0.5), maxLife: 0.5, color: color
            });
        }
    },

    updateDebris(dt) {
        // BOSS 死亡后残焰
        if (Math.random() < dt * 24) {
            particles.push({
                kind: 'spark',
                x: boss.x + rnd(-2, 2), z: boss.z + rnd(-2, 2), h: rnd(0, 2.4),
                vx: rnd(-0.6, 0.6), vz: rnd(-0.6, 0.6), vh: rnd(1, 3.5),
                life: rnd(0.5, 1.1), maxLife: 1.1, color: SCENE.accentSoft
            });
        }
    }
};
