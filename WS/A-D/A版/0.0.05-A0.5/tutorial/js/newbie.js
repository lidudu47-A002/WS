/* ===== 新手关 · newbie.js =====
 * 目标：越过障碍、击杀敌人、抵达终点
 * 纯 Canvas 2D，无外部依赖
 */
(function () {
    'use strict';

    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');

    // ---------- 逻辑视口与画布适配 ----------
    var VW = 960, VH = 540;
    var cw = 0, ch = 0, dpr = 1, scale = 1, ox = 0, oy = 0;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cw = canvas.clientWidth || window.innerWidth;
        ch = canvas.clientHeight || window.innerHeight;
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        scale = Math.min(cw / VW, ch / VH);
        ox = (cw - VW * scale) / 2;
        oy = (ch - VH * scale) / 2;
    }
    window.addEventListener('resize', resize);
    resize();

    // ---------- 参数 ----------
    var WORLD_W = 4200;
    var GROUND_Y = 470;
    var GRAVITY = 2000;
    var MOVE_SPEED = 275;
    var JUMP_V = -690;
    var MAX_FALL = 980;
    var MAX_JUMP = 2;
    var COYOTE = 0.1;          // 离开平台后仍可起跳的宽容时间
    var JUMP_BUFFER = 0.12;    // 落地前提前按跳的缓存时间
    var ATTACK_CD = 0.34;
    var ATTACK_DUR = 0.18;
    var ATTACK_DMG = 1;
    var ATTACK_RANGE = 50;
    var START_HP = 4;

    var FINISH_X = 3950;

    var guest = false;
    try { guest = /[?&]guest=1/i.test(window.location.search); } catch (e) { guest = false; }
    var NEXT_PAGE = '../Black room/Black room.html' + (guest ? '?guest=1' : '');

    // ---------- 关卡几何 ----------
    var solids = [
        { x: -40, y: GROUND_Y, w: WORLD_W + 80, h: 110, kind: 'ground' },
        { x: 560, y: 410, w: 42, h: 60, kind: 'block' },
        { x: 900, y: 380, w: 44, h: 90, kind: 'block' },
        { x: 1160, y: 362, w: 210, h: 20, kind: 'ledge' },
        { x: 1760, y: 392, w: 42, h: 78, kind: 'block' },
        { x: 1900, y: 332, w: 150, h: 18, kind: 'ledge' },
        { x: 2120, y: 402, w: 120, h: 68, kind: 'block' },
        { x: 2660, y: 372, w: 44, h: 98, kind: 'block' },
        // 第二章区段：纯空中平台，避开敌人巡逻高度
        { x: 2980, y: 372, w: 150, h: 18, kind: 'ledge' },
        { x: 3230, y: 330, w: 120, h: 18, kind: 'ledge' },
        { x: 3430, y: 300, w: 150, h: 18, kind: 'ledge' },
        { x: 3660, y: 360, w: 130, h: 18, kind: 'ledge' }
    ];

    var TYPE_SIZE = {
        runner: { w: 28, h: 28 },
        brute: { w: 40, h: 40 },
        flyer: { w: 26, h: 26 },
        spitter: { w: 30, h: 34 }
    };

    var enemyBlueprints = [
        { type: 'runner', x: 1000, minX: 960, maxX: 1140, hp: 2, speed: 74 },
        { type: 'brute', x: 2000, minX: 1930, maxX: 2160, hp: 5, speed: 48 },
        { type: 'runner', x: 2500, minX: 2400, maxX: 2650, hp: 2, speed: 82 },
        { type: 'flyer', x: 2880, minX: 2820, maxX: 3120, hp: 2, speed: 96, hover: 150 },
        { type: 'spitter', x: 3220, minX: 3150, maxX: 3320, hp: 3, speed: 26 },
        { type: 'brute', x: 3480, minX: 3400, maxX: 3650, hp: 6, speed: 52 },
        { type: 'runner', x: 3800, minX: 3720, maxX: 3900, hp: 3, speed: 88 }
    ];

    var enemies = [];
    var bullets = [];

    function resetEnemies() {
        enemies = enemyBlueprints.map(function (b, i) {
            var sz = TYPE_SIZE[b.type];
            var baseY = GROUND_Y - sz.h - (b.type === 'flyer' ? (b.hover || 150) : 0);
            return {
                id: i,
                type: b.type,
                x: b.x, y: baseY, baseY: baseY,
                w: sz.w, h: sz.h,
                vx: 0, vy: 0,
                dir: i % 2 === 0 ? 1 : -1,
                minX: b.minX, maxX: b.maxX,
                speed: b.speed,
                hp: b.hp, maxHp: b.hp,
                hitFlash: 0,
                hoverPhase: i * 1.7,
                fireCd: 1.1 + (i % 3) * 0.45,
                telegraph: 0,
                dead: false
            };
        });
        bullets = [];
    }
    resetEnemies();

    // ---------- 玩家状态 ----------
    var player = {};
    var particles = [];
    var shake = 0;
    var won = false;

    var checkpointList = [
        { x: 1520, y: GROUND_Y - 28, reached: false },
        { x: 3060, y: GROUND_Y - 28, reached: false }
    ];
    var checkpoint = { x: 80, y: GROUND_Y - 28 };

    function resetPlayer(atCheckpoint) {
        player = {
            x: atCheckpoint ? checkpoint.x : 80,
            y: atCheckpoint ? checkpoint.y : GROUND_Y - 28,
            w: 26, h: 28,
            vx: 0, vy: 0,
            onGround: false,
            jumps: MAX_JUMP,
            coyote: 0,
            face: 1,
            hp: START_HP, maxHp: START_HP,
            invul: 0,
            atkTimer: 0,
            atkCd: 0,
            hitSet: null,
            walkPhase: 0
        };
    }
    resetPlayer(false);

    // ---------- 输入 ----------
    var keys = { left: false, right: false };
    var jumpBuffer = 0;

    function setKey(code, down) {
        switch (code) {
            case 'KeyA':
            case 'ArrowLeft':
                keys.left = down; break;
            case 'KeyD':
            case 'ArrowRight':
                keys.right = down; break;
            case 'Space':
            case 'KeyW':
            case 'ArrowUp':
                if (down) jumpBuffer = JUMP_BUFFER;
                break;
            case 'KeyJ':
                if (down) attack();
                break;
            case 'KeyR':
                if (down) restart();
                break;
            case 'Escape':
                if (down) leave();
                break;
        }
    }

    document.addEventListener('keydown', function (e) {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) {
            e.preventDefault();
        }
        if (e.repeat) return;
        setKey(e.code, true);
    });

    document.addEventListener('keyup', function (e) {
        if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && player.vy < -220) {
            player.vy *= 0.5;   // 松开跳跃键提前收力，实现长短跳
        }
        setKey(e.code, false);
    });

    canvas.addEventListener('mousedown', function (e) {
        if (e.button === 0) attack();
    });

    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    // ---------- 攻击 ----------
    function attack() {
        if (won || player.atkCd > 0) return;
        player.atkCd = ATTACK_CD;
        player.atkTimer = ATTACK_DUR;
        player.hitSet = {};
        player.face = keys.left && !keys.right ? -1 : (keys.right && !keys.left ? 1 : player.face);
    }

    function attackBox() {
        var range = ATTACK_RANGE, hh = 38;
        return {
            x: player.face === 1 ? player.x + player.w - 4 : player.x - range + 4,
            y: player.y + player.h / 2 - hh / 2,
            w: range,
            h: hh
        };
    }

    function overlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    // ---------- 粒子 ----------
    function spawnParticles(x, y, n, color, spread) {
        for (var i = 0; i < n; i++) {
            var ang = Math.random() * Math.PI * 2;
            var sp = 60 + Math.random() * (spread || 160);
            particles.push({
                x: x, y: y,
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp - 40,
                life: 0.32 + Math.random() * 0.3,
                max: 0.62,
                size: 2 + Math.random() * 3,
                color: color
            });
        }
    }

    // ---------- 物理 ----------
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    function moveAndCollide(dt) {
        // 水平
        player.x += player.vx * dt;
        for (var i = 0; i < solids.length; i++) {
            var s = solids[i];
            if (overlap(player, s)) {
                if (player.vx > 0) player.x = s.x - player.w;
                else if (player.vx < 0) player.x = s.x + s.w;
                player.vx = 0;
            }
        }
        player.x = clamp(player.x, 0, WORLD_W - player.w);

        // 垂直
        player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL);
        player.y += player.vy * dt;
        player.onGround = false;
        for (var j = 0; j < solids.length; j++) {
            var b = solids[j];
            if (overlap(player, b)) {
                if (player.vy > 0) {
                    player.y = b.y - player.h;
                    player.vy = 0;
                    player.onGround = true;
                    player.jumps = MAX_JUMP;
                    player.coyote = COYOTE;
                } else if (player.vy < 0) {
                    player.y = b.y + b.h;
                    player.vy = 0;
                }
            }
        }
    }

    function tryJump() {
        if (player.onGround || player.coyote > 0 || player.jumps > 0) {
            if (player.onGround || player.coyote > 0) {
                player.jumps = MAX_JUMP - 1;
                player.coyote = 0;
            } else {
                player.jumps--;
            }
            player.vy = JUMP_V;
            player.onGround = false;
            spawnParticles(player.x + player.w / 2, player.y + player.h, 6, 'rgba(200,220,255,0.85)', 90);
            return true;
        }
        return false;
    }

    // ---------- 教学横幅 ----------
    var triggers = [
        { x: -999, text: '← → / A D 移动，先走起来' },
        { x: 380, text: '空格 跳跃 —— 松手能控制跳多高' },
        { x: 760, text: '空中再按一次空格，可以二段跳' },
        { x: 880, text: '敌人出现：鼠标左键 / J 挥砍' },
        { x: 1950, text: '大块头血厚，砍两下先撤，别硬顶' },
        { x: 2820, text: '会飞的敌人，从下方往上砍' },
        { x: 3150, text: '紫色敌人会吐弹丸，等它蓄力完再冲' },
        { x: 3450, text: '两个存档点都过了，最后一波' },
        { x: 3860, text: '终点就在前面' }
    ];
    var bannerEl = document.getElementById('banner');
    var bannerTextEl = document.getElementById('bannerText');
    var bannerTimer = 0;
    var bannerQueue = [];
    var firedTriggers = {};

    function fireTriggers() {
        for (var i = 0; i < triggers.length; i++) {
            var t = triggers[i];
            if (!firedTriggers[i] && player.x >= t.x) {
                firedTriggers[i] = true;
                bannerQueue.push(t.text);
            }
        }
        if (!bannerTimer && bannerQueue.length) {
            bannerTextEl.textContent = bannerQueue.shift();
            bannerEl.classList.add('show');
            bannerTimer = 2.4;
        }
    }

    function tickBanner(dt) {
        if (bannerTimer > 0) {
            bannerTimer -= dt;
            if (bannerTimer <= 0) {
                bannerTimer = 0;
                bannerEl.classList.remove('show');
            }
        }
    }

    // ---------- HUD ----------
    var heartsEl = document.getElementById('hearts');
    var progFill = document.getElementById('progFill');
    var goalChip = document.getElementById('goalChip');

    function drawHearts() {
        if (heartsEl.children.length !== player.maxHp) {
            heartsEl.innerHTML = '';
            for (var i = 0; i < player.maxHp; i++) {
                var d = document.createElement('div');
                d.className = 'heart';
                heartsEl.appendChild(d);
            }
        }
        for (var k = 0; k < heartsEl.children.length; k++) {
            heartsEl.children[k].className = 'heart' + (k < player.hp ? '' : ' lost');
        }
    }

    function updateHud() {
        drawHearts();
        var p = clamp(player.x / FINISH_X, 0, 1);
        progFill.style.width = (p * 100).toFixed(1) + '%';
        var killed = enemies.filter(function (e) { return e.dead; }).length;
        goalChip.textContent = won
            ? '已完成'
            : '目标：击败拦路敌人，抵达终点　·　敌人 ' + killed + ' / ' + enemies.length;
    }

    // ---------- 关卡逻辑 ----------
    function updatePlayer(dt) {
        var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        if (dir !== 0) {
            player.vx = dir * MOVE_SPEED;
            player.face = dir;
            player.walkPhase += dt * 12;
        } else {
            player.vx *= Math.pow(0.001, dt);
            if (Math.abs(player.vx) < 6) player.vx = 0;
        }

        if (jumpBuffer > 0) {
            jumpBuffer -= dt;
            if (tryJump()) jumpBuffer = 0;
        }
        if (!player.onGround && player.coyote > 0) {
            player.coyote -= dt;
            if (player.coyote < 0) player.coyote = 0;
        }

        moveAndCollide(dt);

        if (player.atkCd > 0) player.atkCd -= dt;
        if (player.atkTimer > 0) player.atkTimer -= dt;
        if (player.invul > 0) player.invul -= dt;

        // 检查点
        for (var ci = 0; ci < checkpointList.length; ci++) {
            var cp = checkpointList[ci];
            if (!cp.reached && player.x > cp.x - 20) {
                cp.reached = true;
                checkpoint = { x: cp.x, y: cp.y };
                spawnParticles(cp.x, GROUND_Y - 40, 16, 'rgba(120,200,255,0.95)', 200);
                bannerQueue.push('存档点已记录 · 倒下从这里复活');
            }
        }

        // 掉落保护
        if (player.y > VH + 200) {
            hurt(1, true);
        }

        // 到达终点
        if (!won && player.x + player.w >= FINISH_X) {
            win();
        }
    }

    function updateEnemies(dt) {
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (e.dead) continue;

            if (e.hitFlash > 0) e.hitFlash -= dt;

            var pcx = player.x + player.w / 2;
            var pcy = player.y + player.h / 2;
            var ecx = e.x + e.w / 2;
            var near = Math.abs(pcx - ecx);

            if (e.hitFlash > 0 || Math.abs(e.vx) > 4) {
                // 受击击退：所有类型共用
                e.x += e.vx * dt;
                e.vx *= Math.pow(0.02, dt);
            } else {
                e.vx = 0;
                if (e.type === 'flyer') {
                    e.hoverPhase += dt * 2.1;
                    e.y += (e.baseY + Math.sin(e.hoverPhase) * 22 - e.y) * Math.min(1, dt * 6);
                    if (near < 340) e.dir = pcx > ecx ? 1 : -1;
                    e.x += e.dir * e.speed * (near < 340 ? 0.85 : 0.5) * dt;
                } else if (e.type === 'spitter') {
                    if (near < 520) e.dir = pcx > ecx ? 1 : -1;
                    e.x += e.dir * e.speed * dt;
                    e.fireCd -= dt;
                    if (e.telegraph > 0) {
                        e.telegraph -= dt;
                        if (e.telegraph <= 0) {
                            var dx = pcx - ecx;
                            var dy = pcy - (e.y + e.h / 2);
                            var len = Math.sqrt(dx * dx + dy * dy) || 1;
                            bullets.push({
                                x: ecx, y: e.y + e.h / 2,
                                vx: dx / len * 300, vy: dy / len * 300,
                                life: 3.4, r: 6
                            });
                        }
                    } else if (e.fireCd <= 0 && near < 520) {
                        e.fireCd = 2.2;
                        e.telegraph = 0.28;
                    }
                } else {
                    var chase = e.type === 'brute' ? (near < 210 ? 1.8 : 0.7) : (near < 260 ? 1.5 : 1);
                    if (near < 520) e.dir = pcx > ecx ? 1 : -1;
                    e.x += e.dir * e.speed * chase * dt;
                }
                if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
                if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
            }

            // 攻击命中
            if (player.atkTimer > 0 && player.hitSet && !player.hitSet[e.id]) {
                if (overlap(attackBox(), e)) {
                    player.hitSet[e.id] = true;
                    e.hp -= ATTACK_DMG;
                    e.hitFlash = 0.18;
                    e.vx = (e.x + e.w / 2 < player.x + player.w / 2 ? -1 : 1) * (e.type === 'brute' ? 110 : 330);
                    shake = Math.max(shake, 5);
                    spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 9, 'rgba(255,120,130,0.95)', 190);
                    if (e.hp <= 0) {
                        e.dead = true;
                        spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 18, 'rgba(255,200,90,0.95)', 240);
                        shake = Math.max(shake, 8);
                    }
                }
            }

            // 触碰玩家
            if (!e.dead && overlap(player, e) && player.invul <= 0) {
                hurt(1, false, e);
            }
        }
    }

    function updateBullets(dt) {
        for (var i = bullets.length - 1; i >= 0; i--) {
            var b = bullets[i];
            b.life -= dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            if (b.life <= 0 || b.x < -40 || b.x > WORLD_W + 40 || b.y > VH + 80) {
                bullets.splice(i, 1);
                continue;
            }

            var box = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
            var blocked = false;
            for (var s = 0; s < solids.length; s++) {
                if (overlap(box, solids[s])) { blocked = true; break; }
            }
            if (blocked) {
                spawnParticles(b.x, b.y, 6, 'rgba(255,160,120,0.9)', 120);
                bullets.splice(i, 1);
                continue;
            }

            if (player.invul <= 0 && overlap(box, player)) {
                hurt(1, false, null);
                spawnParticles(b.x, b.y, 10, 'rgba(255,110,120,0.95)', 160);
                bullets.splice(i, 1);
            }
        }
    }

    function hurt(amount, fromFall, source) {
        if (won) return;
        player.hp -= amount;
        player.invul = 1.1;
        shake = Math.max(shake, 9);
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, 12, 'rgba(255,90,110,0.95)', 200);
        if (source) {
            player.vx = (player.x + player.w / 2 < source.x + source.w / 2 ? -1 : 1) * 300;
            player.vy = -260;
        }
        if (player.hp <= 0) {
            player.hp = player.maxHp;
            resetEnemies();
            resetPlayer(true);
            player.invul = 1.4;
            bannerQueue.push('别慌，从存档点再来一次');
        }
    }

    function win() {
        won = true;
        try { localStorage.setItem('ws_newbie_cleared', String(Date.now())); } catch (e) {}
        var killed = enemies.filter(function (e) { return e.dead; }).length;
        document.getElementById('winText').textContent =
            '剩 ' + player.hp + ' / ' + player.maxHp + ' 心，击杀 ' + killed + ' / ' + enemies.length +
            '。真正的冒险从这里开始。';
        document.getElementById('winPanel').classList.add('show');
        spawnParticles(player.x + player.w / 2, player.y, 26, 'rgba(255,220,120,0.95)', 260);
    }

    function restart() {
        won = false;
        checkpoint = { x: 80, y: GROUND_Y - 28 };
        checkpointList.forEach(function (cp) { cp.reached = false; });
        firedTriggers = {};
        bannerQueue = [];
        bannerTimer = 0;
        bannerEl.classList.remove('show');
        particles = [];
        resetEnemies();
        resetPlayer(false);
        document.getElementById('winPanel').classList.remove('show');
    }

    function leave() {
        window.location.href = NEXT_PAGE;
    }

    document.getElementById('exitBtn').addEventListener('click', leave);
    document.getElementById('goGameBtn').addEventListener('click', leave);
    document.getElementById('replayBtn').addEventListener('click', restart);

    // ---------- 渲染 ----------
    var camX = 0;

    function drawBackground() {
        var g = ctx.createLinearGradient(0, 0, 0, VH);
        g.addColorStop(0, '#0b0d16');
        g.addColorStop(0.62, '#0d1018');
        g.addColorStop(1, '#07080d');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, VW, VH);

        // 远景方块（视差）
        ctx.save();
        var parallax = camX * 0.25;
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = '#9fb6ff';
        ctx.lineWidth = 1.5;
        for (var i = 0; i < 22; i++) {
            var bx = ((i * 173) - parallax) % (VW + 260) - 130;
            var by = 90 + ((i * 97) % 250);
            var bs = 34 + (i % 4) * 16;
            ctx.strokeRect(bx, by, bs, bs);
        }
        ctx.restore();

        // 网格
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        var step = 48;
        var off = (camX * 0.6) % step;
        for (var x = -off; x < VW + step; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, VH);
            ctx.stroke();
        }
        for (var y = 0; y < VH; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(VW, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawSolids() {
        for (var i = 0; i < solids.length; i++) {
            var s = solids[i];
            if (s.kind === 'ground') {
                var gg = ctx.createLinearGradient(0, s.y, 0, s.y + 90);
                gg.addColorStop(0, 'rgba(48,54,76,0.95)');
                gg.addColorStop(1, 'rgba(16,18,28,0.98)');
                ctx.fillStyle = gg;
                ctx.fillRect(s.x, s.y, s.w, s.h);
                ctx.strokeStyle = 'rgba(150,180,255,0.55)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x + s.w, s.y);
                ctx.stroke();
                // 地面刻度
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.lineWidth = 1;
                for (var t = s.x; t < s.x + s.w; t += 64) {
                    ctx.beginPath();
                    ctx.moveTo(t, s.y + 6);
                    ctx.lineTo(t, s.y + 22);
                    ctx.stroke();
                }
            } else {
                ctx.fillStyle = s.kind === 'ledge' ? 'rgba(60,74,110,0.92)' : 'rgba(44,50,72,0.95)';
                ctx.fillRect(s.x, s.y, s.w, s.h);
                ctx.strokeStyle = 'rgba(160,190,255,0.6)';
                ctx.lineWidth = 2;
                ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
                ctx.strokeStyle = 'rgba(255,215,0,0.28)';
                ctx.beginPath();
                ctx.moveTo(s.x + 1, s.y + 1);
                ctx.lineTo(s.x + s.w - 1, s.y + 1);
                ctx.stroke();
            }
        }
    }

    function drawPlayer() {
        var px = player.x, py = player.y;
        var blink = player.invul > 0 && Math.floor(player.invul * 14) % 2 === 0;
        if (blink) ctx.globalAlpha = 0.4;

        // 影子
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(px + player.w / 2, GROUND_Y + 2, player.w * 0.55, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 身体
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(180,205,255,0.85)';
        ctx.shadowBlur = 16;
        ctx.fillRect(px, py, player.w, player.h);
        ctx.shadowBlur = 0;

        // 眼睛
        ctx.fillStyle = '#0c0f18';
        var eyeY = py + player.h * 0.34;
        var eyeOff = player.face === 1 ? 5 : -1;
        ctx.fillRect(px + player.w / 2 - 5 + eyeOff, eyeY, 3, 4);
        ctx.fillRect(px + player.w / 2 + 2 + eyeOff, eyeY, 3, 4);

        // 挥砍弧
        if (player.atkTimer > 0) {
            var prog = 1 - player.atkTimer / ATTACK_DUR;
            var cx = px + player.w / 2;
            var cy = py + player.h / 2;
            var r = 30 + prog * 18;
            var a0 = player.face === 1 ? -0.9 : Math.PI - 0.9;
            var a1 = player.face === 1 ? 0.9 : Math.PI + 0.9;
            ctx.strokeStyle = 'rgba(255,240,190,' + (0.85 * (1 - prog)) + ')';
            ctx.lineWidth = 5 * (1 - prog) + 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, r, a0, a1);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    function drawEnemies() {
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (e.dead) continue;

            ctx.fillStyle = 'rgba(0,0,0,' + (e.type === 'flyer' ? 0.14 : 0.3) + ')';
            ctx.beginPath();
            ctx.ellipse(e.x + e.w / 2, GROUND_Y + 2, e.w * 0.5, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            var body = e.hitFlash > 0 ? '#ffffff'
                : (e.type === 'brute' ? '#b32b45'
                : e.type === 'flyer' ? '#ff8a4c'
                : e.type === 'spitter' ? '#a45cff' : '#e8455f');
            var glow = e.type === 'brute' ? 'rgba(200,40,70,0.75)'
                : e.type === 'flyer' ? 'rgba(255,140,60,0.8)'
                : e.type === 'spitter' ? 'rgba(170,90,255,0.8)' : 'rgba(255,70,90,0.75)';

            ctx.fillStyle = body;
            ctx.shadowColor = glow;
            ctx.shadowBlur = 14;

            if (e.type === 'flyer') {
                ctx.save();
                ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-e.w * 0.35, -e.h * 0.35, e.w * 0.7, e.h * 0.7);
                ctx.restore();
            } else if (e.type === 'spitter') {
                ctx.beginPath();
                ctx.moveTo(e.x + e.w / 2, e.y);
                ctx.lineTo(e.x + e.w, e.y + e.h * 0.75);
                ctx.lineTo(e.x, e.y + e.h * 0.75);
                ctx.closePath();
                ctx.fill();
                ctx.fillRect(e.x + 2, e.y + e.h * 0.75, e.w - 4, e.h * 0.25);
            } else {
                ctx.fillRect(e.x, e.y, e.w, e.h);
            }
            ctx.shadowBlur = 0;

            ctx.fillStyle = e.type === 'brute' ? '#2a0710' : '#1a0a0e';
            var ey = e.y + (e.type === 'brute' ? 13 : e.type === 'spitter' ? 10 : 9);
            var ex = e.x + (e.dir === 1 ? e.w * 0.52 : e.w * 0.18);
            ctx.fillRect(ex, ey, 4, 5);
            ctx.fillRect(ex + 8, ey, 4, 5);

            // 蓄力提示
            if (e.telegraph > 0) {
                ctx.fillStyle = 'rgba(255,240,160,' + (0.2 + 0.5 * Math.abs(Math.sin(e.telegraph * 60))).toFixed(2) + ')';
                ctx.beginPath();
                ctx.arc(e.x + e.w / 2, e.y + e.h / 2, e.w * 0.95, 0, Math.PI * 2);
                ctx.fill();
            }

            // 血条
            var barW = e.w + 6;
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(e.x - 3, e.y - 9, barW, 4);
            ctx.fillStyle = '#ff8a6b';
            ctx.fillRect(e.x - 3, e.y - 9, barW * (e.hp / e.maxHp), 4);
        }
    }

    function drawCheckpoints() {
        for (var i = 0; i < checkpointList.length; i++) {
            var cp = checkpointList[i];
            var cx = cp.x;
            var on = cp.reached;

            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.ellipse(cx, GROUND_Y + 2, 22, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = on ? 'rgba(140,210,255,0.9)' : 'rgba(120,135,180,0.55)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx, GROUND_Y);
            ctx.lineTo(cx, GROUND_Y - 96);
            ctx.stroke();

            ctx.fillStyle = on ? 'rgba(110,195,255,0.85)' : 'rgba(110,125,170,0.45)';
            ctx.beginPath();
            ctx.moveTo(cx, GROUND_Y - 96);
            ctx.lineTo(cx + 32, GROUND_Y - 84);
            ctx.lineTo(cx, GROUND_Y - 72);
            ctx.closePath();
            ctx.fill();

            if (!on) {
                var pulse = 0.5 + 0.5 * Math.sin(stepTime() / 320 + i);
                ctx.strokeStyle = 'rgba(120,160,240,' + (0.15 + 0.3 * pulse).toFixed(2) + ')';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, GROUND_Y - 48, 34 + pulse * 10, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    function stepTime() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    function drawBullets() {
        for (var i = 0; i < bullets.length; i++) {
            var b = bullets[i];
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(Math.atan2(b.vy, b.vx));
            ctx.fillStyle = 'rgba(255,120,220,0.95)';
            ctx.shadowColor = 'rgba(255,90,200,0.9)';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(9, 0);
            ctx.lineTo(-5, 5);
            ctx.lineTo(-5, -5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    function drawFinish() {
        var fx = FINISH_X + 40;
        // 门柱
        ctx.strokeStyle = 'rgba(255,215,0,0.85)';
        ctx.lineWidth = 4;
        ctx.strokeRect(fx, GROUND_Y - 132, 78, 132);

        // 光带
        var g = ctx.createLinearGradient(fx, 0, fx + 78, 0);
        g.addColorStop(0, 'rgba(255,215,0,0.16)');
        g.addColorStop(0.5, 'rgba(255,240,180,0.3)');
        g.addColorStop(1, 'rgba(255,215,0,0.16)');
        ctx.fillStyle = g;
        ctx.fillRect(fx, GROUND_Y - 132, 78, 132);

        // 旗
        ctx.fillStyle = '#ffd966';
        ctx.fillRect(fx + 86, GROUND_Y - 150, 3, 150);
        ctx.beginPath();
        ctx.moveTo(fx + 89, GROUND_Y - 150);
        ctx.lineTo(fx + 89 + 34, GROUND_Y - 138);
        ctx.lineTo(fx + 89, GROUND_Y - 126);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(255,235,170,0.92)';
        ctx.font = '600 15px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('终点', fx + 39, GROUND_Y - 146);
        ctx.textAlign = 'left';
    }

    function drawParticles() {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var a = Math.max(0, p.life / p.max);
            ctx.globalAlpha = a;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    function render() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#07080d';
        ctx.fillRect(0, 0, cw, ch);

        var sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
        var sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;

        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, (ox + sx) * dpr, (oy + sy) * dpr);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, VW, VH);
        ctx.clip();

        drawBackground();

        ctx.save();
        ctx.translate(-camX, 0);
        drawSolids();
        drawCheckpoints();
        drawFinish();
        drawEnemies();
        drawBullets();
        drawPlayer();
        drawParticles();
        ctx.restore();

        ctx.restore();
    }

    // ---------- 主循环 ----------
    var last = 0;

    function frame(ts) {
        if (!last) last = ts;
        var dt = Math.min((ts - last) / 1000, 0.033);
        last = ts;
        update(dt);
        render();
        requestAnimationFrame(frame);
    }

    function update(dt) {
        if (!won) {
            updatePlayer(dt);
            updateEnemies(dt);
            updateBullets(dt);
        }

        // 粒子
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.life -= dt;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            p.vy += 900 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= Math.pow(0.2, dt);
        }

        if (shake > 0) {
            shake -= dt * 40;
            if (shake < 0) shake = 0;
        }

        fireTriggers();
        tickBanner(dt);
        updateHud();

        var targetCam = clamp(player.x + player.w / 2 - VW * 0.42, 0, Math.max(0, WORLD_W - VW));
        camX += (targetCam - camX) * Math.min(1, dt * 6);
    }

    requestAnimationFrame(frame);

    // ---------- 调试接口（只读 + 推进，用于自动化验证） ----------
    window.__newbie = {
        get state() {
            return {
                won: won,
                camX: camX,
                player: {
                    x: player.x, y: player.y, vy: player.vy,
                    onGround: player.onGround, jumps: player.jumps,
                    hp: player.hp, maxHp: player.maxHp, atkCd: player.atkCd
                },
                enemies: enemies.map(function (e) {
                    return { type: e.type, x: e.x, y: e.y, hp: e.hp, dead: e.dead };
                }),
                bullets: bullets.map(function (b) { return { x: b.x, y: b.y }; }),
                checkpoints: checkpointList.map(function (c) { return { x: c.x, reached: c.reached }; })
            };
        },
        step: function (ms) {
            update(Math.min(ms / 1000, 0.033));
        },
        render: render,
        key: function (code, down) { setKey(code, down); },
        reset: restart
    };
})();
