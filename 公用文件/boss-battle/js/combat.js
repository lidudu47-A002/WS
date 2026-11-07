// ============================================================
//  combat.js — 实时战斗：近战 / 远程 / 冲刺 / 药水 / 伤害结算
// ============================================================

const Combat = {
    // ---------------- 每帧 ----------------
    update(dt) {
        // 冷却
        player.iframe = Math.max(0, player.iframe - dt);
        player.dashCd = Math.max(0, player.dashCd - dt);
        player.atkCd = Math.max(0, player.atkCd - dt);
        player.shootCd = Math.max(0, player.shootCd - dt);
        player.potionCd = Math.max(0, player.potionCd - dt);
        player.meleeFx = Math.max(0, player.meleeFx - dt * 3.2);

        // 被动：十字架回血
        if (config.hasCross && player.hp > 0 && player.hp < player.maxHp) {
            config.crossHealTimer -= dt;
            if (config.crossHealTimer <= 0) {
                config.crossHealTimer = 1.0;
                player.hp = Math.min(player.maxHp, player.hp + 2);
            }
        }

        // 灼烧（火杖近战附加）
        if (boss.burn > 0 && !boss.dead) {
            boss.burn -= dt;
            this.burnTick = (this.burnTick || 0) + dt;
            if (this.burnTick >= 0.5) {
                this.burnTick = 0;
                this.damageBoss(2, boss.x, boss.z, true);
            }
        }

        // 冰刃减速计时
        if (boss.slowT > 0) boss.slowT = Math.max(0, boss.slowT - dt);

        // 受击延迟结算：DoT 逐帧扣血
        this.updateDots(dt);
    },

    // ---------------- 近战 ----------------
    melee() {
        if (player.atkCd > 0 || gameState !== 'fight') return;
        player.atkCd = MELEE_CD;
        player.meleeFx = 1;

        const swung = [];
        let dmg = 9 + playerLevel * 1.4;
        const wid = config.currentWeaponId;

        // 武器加成
        if (wid === 'sword') dmg += 12;
        if (wid === 'firewand') dmg *= 1.25;
        if (wid === 'frostBlade') dmg += 3;
        if (wid === 'shadowDagger') dmg *= 0.92;

        // 命中判定：扇形
        const d = dist(boss.x, boss.z, player.x, player.z);
        if (!boss.dead && d < MELEE_RANGE + boss.r) {
            const nx = (boss.x - player.x) / (d || 1);
            const nz = (boss.z - player.z) / (d || 1);
            const dot = nx * player.dirX + nz * player.dirZ;
            const ang = Math.acos(clamp(dot, -1, 1));
            if (ang < MELEE_ARC * 0.5) {
                let final = dmg;
                if (wid === 'thunderHammer' && Math.random() < 0.3) {
                    final *= 2;
                    this.pushDmg('Critical!', boss.x, boss.z, 2.6, '#ffe066');
                }
                this.damageBoss(final, boss.x, boss.z);
                swung.push(boss.x, boss.z);

                if (wid === 'firewand') boss.burn = 3.0;
                if (wid === 'frostBlade') boss.slowT = 2.5;
                // 小丑面具吸血
                if (config.hasClownMask) {
                    player.hp = Math.min(player.maxHp, player.hp + 2);
                }
                // 击退
                const k = 0.35;
                BossAI.moveBoss(nx * k, nz * k);
            }
        }
        // 刀光粒子
        for (let i = 0; i < 7; i++) {
            const a = Math.atan2(player.dirZ, player.dirX) + rnd(-MELEE_ARC / 2, MELEE_ARC / 2);
            particles.push({
                kind: 'slash',
                x: player.x + Math.cos(a) * rnd(0.6, 1.9),
                z: player.z + Math.sin(a) * rnd(0.6, 1.9),
                h: rnd(0.5, 1.3), vx: 0, vz: 0, vh: 0,
                life: 0.2, maxLife: 0.2, color: '#e8f4ff'
            });
        }
    },

    // ---------------- 远程 ----------------
    shoot() {
        if (player.shootCd > 0 || gameState !== 'fight') return;
        player.shootCd = SHOOT_CD;
        const base = 6 + playerLevel * 0.9;
        const wid = config.currentWeaponId;
        const dmg = base * (wid === 'firewand' ? 1.2 : 1);
        const n = norm(player.dirX, player.dirZ);
        bullets.push({
            x: player.x + n.x * 0.6, z: player.z + n.z * 0.6, h: 1.1,
            vx: n.x * BULLET_SPEED, vz: n.z * BULLET_SPEED,
            r: 0.3, dmg: dmg, life: 1.6
        });
    },

    // ---------------- 冲刺 ----------------
    dash() {
        if (player.dashCd > 0 || gameState !== 'fight') return;
        player.dashCd = DASH_CD;
        player.dashT = DASH_TIME;
        player.iframe = Math.max(player.iframe, DASH_TIME + 0.1);
        for (let i = 0; i < 10; i++) {
            particles.push({
                kind: 'spark',
                x: player.x - player.dirX * rnd(0, 1), z: player.z - player.dirZ * rnd(0, 1),
                h: rnd(0.2, 1.2), vx: rnd(-1, 1), vz: rnd(-1, 1), vh: rnd(0, 1.5),
                life: 0.3, maxLife: 0.3, color: '#b8dcff'
            });
        }
    },

    // ---------------- 药水 ----------------
    potion() {
        if (player.potionCd > 0 || hpPotions <= 0 || gameState !== 'fight') return;
        if (player.hp >= player.maxHp) { showMsg('HP is full', 1.0); return; }
        hpPotions--;
        player.potionCd = 0.5;
        player.hp = Math.min(player.maxHp, player.hp + POTION_HEAL);
        this.pushDmg('+' + POTION_HEAL, player.x, player.z, 2.2, '#7dffa6');
        for (let i = 0; i < 12; i++) {
            particles.push({
                kind: 'spark', x: player.x, z: player.z, h: rnd(0.2, 1.6),
                vx: rnd(-1.6, 1.6), vz: rnd(-1.6, 1.6), vh: rnd(1, 3),
                life: 0.5, maxLife: 0.5, color: '#7dffa6'
            });
        }
    },

    // ---------------- BOSS 受伤 ----------------
    damageBoss(n, wx, wz, silent) {
        if (boss.dead || gameState !== 'fight') return;
        const dmg = Math.max(1, Math.round(n));
        // 不立即扣血：本次伤害 TD 转成一条 DoT，逐帧结算
        if (!boss.dots) boss.dots = [];
        boss.dots.push({ td: dmg, left: dmg, rate: dotRatePerSec(dmg) });
        boss.dotPending = (boss.dotPending || 0) + dmg;
        boss.flash = 1;
        boss.hurtT = 0.35;
        bossBarFlash = 1;
        if (!silent) this.pushDmg('-' + dmg, wx, wz, 2.0, '#ffe066');
        shake = Math.max(shake, 2.5);
    },

    // 逐帧结算 DoT
    updateDots(dt) {
        if (!boss.dots || !boss.dots.length || boss.dead) return;
        let total = 0;
        for (let i = boss.dots.length - 1; i >= 0; i--) {
            const d = boss.dots[i];
            // 小数进度先记在 acc 里，攒满 1 点才真正扣血，保证血量与待结算值为整数
            d.acc = (d.acc || 0) + d.rate * dt;
            const steps = Math.floor(d.acc);
            if (steps > 0) {
                d.acc -= steps;
                const drain = Math.min(steps, d.left);
                d.left -= drain;
                total += drain;
            }
            if (d.left <= 0) boss.dots.splice(i, 1);
        }
        if (total <= 0) return;
        boss.hp -= total;
        boss.dotPending = Math.max(0, (boss.dotPending || 0) - total);
        if (boss.hp <= 0) {
            boss.hp = 0;
            boss.dots.length = 0;
            boss.dotPending = 0;
            boss.dead = true;
            this.triggerVictory();
        }
    },

    // ---------------- 玩家受伤 ----------------
    hurtPlayer(n, wx, wz) {
        if (player.iframe > 0 || gameState !== 'fight') return;
        let dmg = n;
        // 影匕减伤
        if (config.currentWeaponId === 'shadowDagger') dmg *= 0.8;
        dmg = Math.max(1, Math.round(dmg));

        player.hp -= dmg;
        player.iframe = 0.85;
        hitFlash = 1;
        shake = Math.max(shake, 7);
        this.pushDmg('-' + dmg, player.x, player.z, 2.2, '#ff5a5a');

        // 反推
        if (wx !== undefined) {
            const nb = norm(player.x - wx, player.z - wz);
            MAP.tryMove(player, nb.x * 0.5, nb.z * 0.5, PLAYER_R);
        }

        if (player.hp <= 0) {
            player.hp = 0;
            this.triggerGameOver();
        }
    },

    // ---------------- 飘字 ----------------
    pushDmg(text, wx, wz, hh, color) {
        damageNumbers.push({
            text: text, x: wx, z: wz, h: hh || 2, color: color || '#fff',
            life: 0.9, maxLife: 0.9, vy: 1.6
        });
    },

    // ---------------- 结局 ----------------
    triggerVictory() {
        if (gameState === 'win' || gameState === 'lose') return;
        gameState = 'win';
        if (typeof markBossDefeated === 'function') markBossDefeated();
        if (typeof Music !== 'undefined' && Music.stop) {
            try { Music.stop(0.8); } catch (e) { }
        }
        victorySub.textContent = SCENE.key === 'blackroom'
            ? 'The shadow of the Black Room recedes; the road to the prison opens ' + fightTime.toFixed(1) + 's'
            : 'The chains snap and the cell door opens at the far end ' + fightTime.toFixed(1) + 's';
        victoryMsg.style.display = 'block';
        returnBtn.style.display = 'none';
        nextBtn.style.display = 'block';
        nextBtn.textContent = 'Continue';
        nextBtn.onclick = function () { window.location.href = SCENE.nextUrl; };
    },

    triggerGameOver() {
        if (gameState === 'lose' || gameState === 'win') return;
        gameState = 'lose';
        if (typeof Music !== 'undefined' && Music.stop) {
            try { Music.stop(0.8); } catch (e) { }
        }
        gameOverSub.textContent = 'You are left behind in this flattened darkness';
        gameOverMsg.style.display = 'block';
        nextBtn.style.display = 'none';
        returnBtn.style.display = 'block';
        returnBtn.textContent = 'Restart';
        returnBtn.onclick = function () { window.location.reload(); };
    }
};
