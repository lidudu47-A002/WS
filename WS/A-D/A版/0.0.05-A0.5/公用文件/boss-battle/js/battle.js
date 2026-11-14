// ============================================================
//  battle.js — 主循环、输入与实时战斗流程（24×24 正方形方场）
// ============================================================

const keys = Object.create(null);
const mouse = { x: 0, y: 0, down: false, inside: false };

let lastTime = 0;
let bossAwake = false;
let started = false;

// ---------------- 输入 ----------------
function bindInput() {
    window.addEventListener('keydown', function (e) {
        const k = (e.key || '').toLowerCase();
        keys[k] = true;
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) {
            e.preventDefault();
        }
        if (gameState !== 'fight') return;
        if (k === ' ') Combat.dash();
        if (k === 'e') Combat.melee();
        if (k === 'q') Combat.potion();
    });

    window.addEventListener('keyup', function (e) {
        keys[(e.key || '').toLowerCase()] = false;
    });

    window.addEventListener('blur', clearInput);

    canvas.addEventListener('mousemove', function (e) {
        const r = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
        mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
        mouse.inside = true;
    });

    canvas.addEventListener('mouseleave', function () { mouse.inside = false; });

    canvas.addEventListener('mousedown', function (e) {
        if (e.button === 0) mouse.down = true;
    });

    window.addEventListener('mouseup', function (e) {
        if (e.button === 0) mouse.down = false;
    });

    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // 触屏简易支持：按住即射击，点击移动方向
    canvas.addEventListener('touchstart', function (e) {
        const t = e.touches[0];
        if (!t) return;
        const r = canvas.getBoundingClientRect();
        mouse.x = (t.clientX - r.left) * (canvas.width / r.width);
        mouse.y = (t.clientY - r.top) * (canvas.height / r.height);
        mouse.down = true;
        e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', function () { mouse.down = false; });
}

function clearInput() {
    for (const k in keys) keys[k] = false;
    mouse.down = false;
}

// ---------------- 玩家 ----------------
function updateAim() {
    // 触屏设备无鼠标指针，自动朝 BOSS 方向
    if (typeof Touch !== 'undefined' && Touch.isTouch() && Touch.autoAim() && !boss.dead) {
        const n0 = norm(boss.x - player.x, boss.z - player.z);
        player.dirX = n0.x;
        player.dirZ = n0.z;
        return;
    }
    if (!mouse.inside) return;
    const g = Iso.unproj(mouse.x, mouse.y);
    const n = norm(g.x - player.x, g.z - player.z);
    player.dirX = n.x;
    player.dirZ = n.z;
}

function updatePlayer(dt) {
    updateAim();

    // 等距方向：屏幕上 = 世界 (-1,-1)
    let dx = 0, dz = 0;
    if (typeof Touch !== 'undefined' && Touch.hasMove()) {
        // 摇杆（屏幕系）→ 世界等距方向
        const ax = Touch.axis.x, ay = Touch.axis.y;
        dx = ax + ay;
        dz = ay - ax;
    } else {
        if (keys['w'] || keys['arrowup']) { dx -= 1; dz -= 1; }
        if (keys['s'] || keys['arrowdown']) { dx += 1; dz += 1; }
        if (keys['a'] || keys['arrowleft']) { dx -= 1; dz += 1; }
        if (keys['d'] || keys['arrowright']) { dx += 1; dz -= 1; }
    }

    player.moving = (dx !== 0 || dz !== 0);
    if (player.moving) {
        const n = norm(dx, dz);
        dx = n.x; dz = n.z;
        player.walkPhase += dt * 9;
    }

    if (player.dashT > 0) {
        player.dashT -= dt;
        const sp = DASH_SPEED;
        MAP.tryMove(player, player.dirX * sp * dt, player.dirZ * sp * dt, PLAYER_R);
    } else {
        const sp = PLAYER_SPEED * (boss.slowT > 0 ? 1 : 1);
        if (player.moving) MAP.tryMove(player, dx * sp * dt, dz * sp * dt, PLAYER_R);
    }

    // 边界
    player.x = clamp(player.x, 2.5, WORLD_W - 2.5);
    player.z = clamp(player.z, 2.5, WORLD_H - 2.5);

    // 射击（按住连发）
    if (mouse.down) Combat.shoot();
}

// ---------------- 相机 ----------------
function updateCamera(dt) {
    // 24×24 方场整块入画：相机锁在场地中心，玩家在整片正方形场地内移动，
    // 保证任何时候都能看清方场边界（不再跟随玩家平移导致边界出画的错觉）
    const lockView = (typeof Iso !== 'undefined' && Iso.isSmallArena) ? Iso.isSmallArena() : false;
    const tx = lockView ? WORLD_W * 0.5 : player.x;
    const tz = lockView ? WORLD_H * 0.5 : player.z;
    const k = Math.min(1, dt * 7.5);
    CAM.x += (tx - CAM.x) * k;
    CAM.z += (tz - CAM.z) * k;

    if (shake > 0) {
        shake = Math.max(0, shake - dt * 26);
        const a = Math.random() * Math.PI * 2;
        CAM.shakeX = Math.cos(a) * shake;
        CAM.shakeY = Math.sin(a) * shake * 0.6;
    } else {
        CAM.shakeX = 0;
        CAM.shakeY = 0;
    }
}

// ---------------- 特效 ----------------
function updateFx(dt) {
    if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - dt * 1.8);
    if (bossBarFlash > 0) bossBarFlash = Math.max(0, bossBarFlash - dt * 2.2);
    if (msgTimer > 0) msgTimer = Math.max(0, msgTimer - dt);

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        if (p.vx) p.x += p.vx * dt;
        if (p.vz) p.z += p.vz * dt;
        if (p.vh !== undefined) {
            p.vh -= 12 * dt;
            p.h = (p.h || 0) + p.vh * dt;
            if (p.h < 0) { p.h = 0; p.vh = -p.vh * 0.32; }
        }
    }

    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const d = damageNumbers[i];
        d.life -= dt;
        d.vy = (d.vy || 1.6) - dt * 2.6;
        d.h = (d.h || 2) + d.vy * dt;
        if (d.life <= 0) damageNumbers.splice(i, 1);
    }
}

// ---------------- 主循环 ----------------
function loop(now) {
    requestAnimationFrame(loop);
    if (!lastTime) lastTime = now;
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) return;

    Iso.layout(getViewW(), getViewH());

    if (gameState === 'intro') {
        introT += dt;
        updateCamera(dt);
        if (introT >= 3.2) {
            gameState = 'fight';
            fightTime = 0;
            showMsg('向北 —— 它就在祭坛上', 2.2);
            if (typeof Music !== 'undefined' && Music.play) {
                try { Music.play(); } catch (e) { }
            }
        }
    } else if (gameState === 'fight') {
        fightTime += dt;

        // 唤醒距离：场地缩为 24 格后按比例收敛（原 64 场地 = 26 格，
        // 保留"先向北走几步再唤醒 BOSS"的节奏），不影响 BOSS 数值与伤害
        const wakeDist = Math.min(26, WORLD_H * 0.4);
        if (!bossAwake && dist(player.x, player.z, boss.x, boss.z) < wakeDist) {
            bossAwake = true;
            showMsg(SCENE.bossTitle, 2.6);
            shake = Math.max(shake, 4);
        }

        if (player.hp > 0) updatePlayer(dt);
        Combat.update(dt);
        if (bossAwake) BossAI.update(dt);
        BossAI.updateBullets(dt);
        updateCamera(dt);
        updateFx(dt);
    } else {
        updateCamera(dt);
        updateFx(dt);
        if (!boss.dead) BossAI.update(dt);
        BossAI.updateBullets(dt);
    }

    Render.frame(dt);
}

// ---------------- 初始化 ----------------
function initBattle() {
    gameState = 'intro';
    introT = 0;
    fightTime = 0;
    bossAwake = false;
    bossBarFlash = 0;
    msgTimer = 0;

    player.x = MAP.spawn.x;
    player.z = MAP.spawn.z;
    player.hp = player.maxHp;
    player.dirX = 0;
    player.dirZ = -1;

    boss.x = MAP.bossHome.x;
    boss.z = MAP.bossHome.z;
    boss.hp = boss.maxHp;
    boss.phase = 1;
    boss.status = 'idle';
    boss.dead = false;
    if (boss.dots) boss.dots.length = 0;
    boss.dotPending = 0;

    if (typeof Iso !== 'undefined' && Iso.isSmallArena && Iso.isSmallArena()) {
        // 小方场：开场就把相机摆到场心，避免 intro 期间画面从南向北漂移
        CAM.x = WORLD_W * 0.5;
        CAM.z = WORLD_H * 0.5;
    } else {
        CAM.x = player.x;
        CAM.z = player.z;
    }

    bindInput();
    started = true;
    requestAnimationFrame(loop);
}

Assets.init(function () {
    initBattle();
});

document.addEventListener('dragstart', function (e) { e.preventDefault(); });

document.addEventListener('visibilitychange', function () {
    if (document.hidden) clearInput();
    lastTime = 0;
    mouse.down = false;
});
