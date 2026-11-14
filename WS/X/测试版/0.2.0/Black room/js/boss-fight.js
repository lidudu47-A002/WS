// js/boss-fight.js
// 传说之下风格BOSS战模块（黑屋 & 监狱通用）
// 与BOSS水平距离 ≤ 30px 自动触发

// ---------- 战斗状态 ----------
let inBossFight = false;
let bossFightBoss = null;           // 进入战斗时保存的boss对象
let soul = { x: 0, y: 0, w: 20, h: 20, speed: 3.5 };
let bossFightHP = 0;
let bossFightMaxHP = 0;
let bossAttackCooldown = 0;        // 玩家攻击冷却（帧）
const BOSS_ATTACK_DELAY = 15;       // 攻击间隔（约0.25秒）
let gasterBlasters = [];
let enemyBullets = [];
let bossFightTimer = 0;

// 战斗区域（canvas 坐标）
const FIGHT_AREA_X = 100;
const FIGHT_AREA_Y = 100;
const FIGHT_AREA_W = 600;
const FIGHT_AREA_H = 240;

// 灵魂移动边界
const SOUL_MIN_X = FIGHT_AREA_X;
const SOUL_MAX_X = FIGHT_AREA_X + FIGHT_AREA_W - soul.w;
const SOUL_MIN_Y = FIGHT_AREA_Y;
const SOUL_MAX_Y = FIGHT_AREA_Y + FIGHT_AREA_H - soul.h;

// BOSS 在战斗中的绘制位置
const BOSS_FIGHT_X = FIGHT_AREA_X + FIGHT_AREA_W / 2 - 100;
const BOSS_FIGHT_Y = 20;

// 玩家攻击弹幕
let playerBullets = [];

// 战斗专用按键
let fightKeys = { up: false, down: false, left: false, right: false, attack: false };

// 用于保存原始 update / draw 函数
let originalUpdate = null;
let originalDraw = null;

// ---------- 工具函数 ----------
function soulCollide(r1, r2) {
    return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x ||
             r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
}

// ---------- 进入/退出战斗 ----------
function enterBossFight() {
    if (inBossFight || !boss) return;

    // 保存世界 boss 并暂时隐藏
    bossFightBoss = boss;
    boss = null;

    inBossFight = true;
    bossFightHP = bossFightBoss.hp;
    bossFightMaxHP = bossFightBoss.maxHp;
    soul.x = FIGHT_AREA_X + FIGHT_AREA_W / 2 - soul.w / 2;
    soul.y = FIGHT_AREA_Y + FIGHT_AREA_H / 2 - soul.h / 2;
    gasterBlasters = [];
    enemyBullets = [];
    playerBullets = [];
    bossAttackCooldown = 0;
    bossFightTimer = 0;

    // 接管全局 update / draw
    update = updateBossFight;
    draw = drawBossFight;

    // 添加捕获阶段事件监听，阻止原有操作
    window.addEventListener('keydown', onFightKeyDown, true);
    window.addEventListener('keyup', onFightKeyUp, true);
    canvas.addEventListener('mousedown', onFightMouseDown, true);
    canvas.addEventListener('mousemove', onFightMouseMove, true);
    canvas.addEventListener('mouseup', onFightMouseUp, true);
    canvas.addEventListener('contextmenu', e => e.preventDefault(), true);
}

function exitBossFight(victoryResult) {
    inBossFight = false;
    // 移除战斗监听
    window.removeEventListener('keydown', onFightKeyDown, true);
    window.removeEventListener('keyup', onFightKeyUp, true);
    canvas.removeEventListener('mousedown', onFightMouseDown, true);
    canvas.removeEventListener('mousemove', onFightMouseMove, true);
    canvas.removeEventListener('mouseup', onFightMouseUp, true);
    canvas.removeEventListener('contextmenu', e => e.preventDefault(), true);

    // 恢复全局 update / draw
    update = originalUpdate;
    draw = originalDraw;

    if (victoryResult) {
        victory = true;
        victoryMsgDiv.style.display = 'block';
        nextMapBtn.style.display = 'block';
        bossFightBoss = null;
    } else {
        boss = bossFightBoss;
        bossFightBoss = null;
        if (playerHP <= 0) {
            if (!respawn()) gameOver = true;
        }
    }
}

// ---------- 输入处理 ----------
function onFightKeyDown(e) {
    if (!inBossFight) return;
    switch (e.code) {
        case 'ArrowUp': case 'KeyW': fightKeys.up = true; e.preventDefault(); break;
        case 'ArrowDown': case 'KeyS': fightKeys.down = true; e.preventDefault(); break;
        case 'ArrowLeft': case 'KeyA': fightKeys.left = true; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': fightKeys.right = true; e.preventDefault(); break;
        case 'KeyZ': case 'Space': fightKeys.attack = true; e.preventDefault(); break;
    }
    e.stopPropagation();
}

function onFightKeyUp(e) {
    if (!inBossFight) return;
    switch (e.code) {
        case 'ArrowUp': case 'KeyW': fightKeys.up = false; e.preventDefault(); break;
        case 'ArrowDown': case 'KeyS': fightKeys.down = false; e.preventDefault(); break;
        case 'ArrowLeft': case 'KeyA': fightKeys.left = false; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': fightKeys.right = false; e.preventDefault(); break;
        case 'KeyZ': case 'Space': fightKeys.attack = false; e.preventDefault(); break;
    }
    e.stopPropagation();
}

function onFightMouseDown(e) {
    if (!inBossFight) return;
    if (e.button === 0) fightKeys.attack = true;
    e.preventDefault();
    e.stopPropagation();
}

function onFightMouseUp(e) {
    if (!inBossFight) return;
    if (e.button === 0) fightKeys.attack = false;
    e.preventDefault();
    e.stopPropagation();
}

function onFightMouseMove(e) { e.stopPropagation(); }

// ---------- 龙骨炮 ----------
function spawnGasterBlaster() {
    const side = Math.floor(Math.random() * 4); // 0:上 1:下 2:左 3:右
    let x, y, dir;
    const margin = 30;
    switch (side) {
        case 0: x = FIGHT_AREA_X + Math.random() * FIGHT_AREA_W; y = FIGHT_AREA_Y - margin; dir = 'down'; break;
        case 1: x = FIGHT_AREA_X + Math.random() * FIGHT_AREA_W; y = FIGHT_AREA_Y + FIGHT_AREA_H + margin; dir = 'up'; break;
        case 2: x = FIGHT_AREA_X - margin; y = FIGHT_AREA_Y + Math.random() * FIGHT_AREA_H; dir = 'right'; break;
        case 3: x = FIGHT_AREA_X + FIGHT_AREA_W + margin; y = FIGHT_AREA_Y + Math.random() * FIGHT_AREA_H; dir = 'left'; break;
    }
    gasterBlasters.push({ x, y, direction: dir, state: 'warn', timer: 0, warnDuration: 40, fireDuration: 25 });
}

function updateGasterBlasters() {
    for (let i = gasterBlasters.length - 1; i >= 0; i--) {
        const g = gasterBlasters[i];
        g.timer++;
        if (g.state === 'warn' && g.timer >= g.warnDuration) {
            g.state = 'fire';
            g.timer = 0;
        } else if (g.state === 'fire') {
            const laserThickness = 12;
            let laserRect = { x: 0, y: 0, w: 0, h: 0 };
            switch (g.direction) {
                case 'down': laserRect = { x: g.x - laserThickness/2, y: g.y, w: laserThickness, h: FIGHT_AREA_Y + FIGHT_AREA_H - g.y }; break;
                case 'up': laserRect = { x: g.x - laserThickness/2, y: FIGHT_AREA_Y, w: laserThickness, h: g.y - FIGHT_AREA_Y }; break;
                case 'right': laserRect = { x: g.x, y: g.y - laserThickness/2, w: FIGHT_AREA_X + FIGHT_AREA_W - g.x, h: laserThickness }; break;
                case 'left': laserRect = { x: FIGHT_AREA_X, y: g.y - laserThickness/2, w: g.x - FIGHT_AREA_X, h: laserThickness }; break;
            }
            if (soulCollide(soul, laserRect)) {
                playerHP = Math.max(0, playerHP - 8);
            }
            if (g.timer >= g.fireDuration) {
                gasterBlasters.splice(i, 1);
            }
        }
    }
}

// ---------- 敌方弹幕 ----------
function spawnBullets() {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        let side = Math.floor(Math.random() * 4);
        let startX, startY, targetX, targetY;
        if (side === 0 || side === 1) {
            startX = FIGHT_AREA_X + Math.random() * FIGHT_AREA_W;
            startY = side === 0 ? FIGHT_AREA_Y - 15 : FIGHT_AREA_Y + FIGHT_AREA_H + 15;
        } else {
            startX = side === 2 ? FIGHT_AREA_X - 15 : FIGHT_AREA_X + FIGHT_AREA_W + 15;
            startY = FIGHT_AREA_Y + Math.random() * FIGHT_AREA_H;
        }
        targetX = soul.x + soul.w/2;
        targetY = soul.y + soul.h/2;
        let angle = Math.atan2(targetY - startY, targetX - startX);
        enemyBullets.push({
            x: startX, y: startY,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            r: 5
        });
    }
}

function updateBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < FIGHT_AREA_X - 20 || b.x > FIGHT_AREA_X + FIGHT_AREA_W + 20 ||
            b.y < FIGHT_AREA_Y - 20 || b.y > FIGHT_AREA_Y + FIGHT_AREA_H + 20) {
            enemyBullets.splice(i, 1);
            continue;
        }
        const bulletRect = { x: b.x - b.r, y: b.y - b.r, w: b.r*2, h: b.r*2 };
        if (soulCollide(soul, bulletRect)) {
            playerHP = Math.max(0, playerHP - 5);
            enemyBullets.splice(i, 1);
        }
    }
}

// ---------- 玩家攻击 ----------
function playerAttack() {
    if (bossAttackCooldown > 0) return;
    bossAttackCooldown = BOSS_ATTACK_DELAY;
    playerBullets.push({
        x: soul.x + soul.w/2 - 4,
        y: soul.y - 12,
        vy: -6,
        w: 8,
        h: 16,
        color: '#ffff55'
    });
}

function updatePlayerBullets() {
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const b = playerBullets[i];
        b.y += b.vy;
        if (b.y + b.h < 0 || b.y > VIEW_H) {
            playerBullets.splice(i, 1);
            continue;
        }
        const bossRect = { x: BOSS_FIGHT_X, y: BOSS_FIGHT_Y, w: 200, h: 80 };
        if (soulCollide({x: b.x, y: b.y, w: b.w, h: b.h}, bossRect)) {
            bossFightHP -= getAttackDamage();
            playerBullets.splice(i, 1);
            if (bossFightHP <= 0) {
                bossFightHP = 0;
                exitBossFight(true);
                return;
            }
        }
    }
}

// ---------- 战斗更新 ----------
function updateBossFight(now) {
    if (!inBossFight) return;

    if (bossAttackCooldown > 0) bossAttackCooldown--;

    // 灵魂移动
    let dx = 0, dy = 0;
    if (fightKeys.left) dx -= soul.speed;
    if (fightKeys.right) dx += soul.speed;
    if (fightKeys.up) dy -= soul.speed;
    if (fightKeys.down) dy += soul.speed;
    let newX = soul.x + dx, newY = soul.y + dy;
    soul.x = Math.min(SOUL_MAX_X, Math.max(SOUL_MIN_X, newX));
    soul.y = Math.min(SOUL_MAX_Y, Math.max(SOUL_MIN_Y, newY));

    if (fightKeys.attack) playerAttack();

    bossFightTimer++;
    if (bossFightTimer % 90 === 0) spawnGasterBlaster();
    if (bossFightTimer % 30 === 0) spawnBullets();

    updateGasterBlasters();
    updateBullets();
    updatePlayerBullets();

    if (playerHP <= 0) {
        playerHP = 0;
        exitBossFight(false);
    }
}

// ---------- 战斗绘制 ----------
function drawBossFight() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(FIGHT_AREA_X, FIGHT_AREA_Y, FIGHT_AREA_W, FIGHT_AREA_H);
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(FIGHT_AREA_X, FIGHT_AREA_Y, FIGHT_AREA_W, FIGHT_AREA_H);

    // BOSS
    if (bossFightBoss) {
        let bx = BOSS_FIGHT_X, by = BOSS_FIGHT_Y, bw = 200, bh = 80;
        let cw = bw / 4, ch = bh / 4;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                ctx.fillStyle = bossFightBoss.colors[i*4 + j] || '#ff0000';
                ctx.fillRect(bx + j*cw, by + i*ch, cw, ch);
            }
        }
        // HP条
        ctx.fillStyle = '#f00';
        ctx.fillRect(bx, by - 15, bw, 8);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(bx, by - 15, bw * (bossFightHP / bossFightMaxHP), 8);
    }

    // 龙骨炮
    for (const g of gasterBlasters) {
        const gx = g.x, gy = g.y;
        if (g.state === 'warn') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(gx - 15, gy - 15, 30, 30);
            ctx.fillStyle = 'red';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('▶', gx - 7, gy + 8);
        } else if (g.state === 'fire') {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 12;
            ctx.beginPath();
            switch (g.direction) {
                case 'down': ctx.moveTo(g.x, gy); ctx.lineTo(g.x, FIGHT_AREA_Y + FIGHT_AREA_H); break;
                case 'up': ctx.moveTo(g.x, gy); ctx.lineTo(g.x, FIGHT_AREA_Y); break;
                case 'right': ctx.moveTo(gx, g.y); ctx.lineTo(FIGHT_AREA_X + FIGHT_AREA_W, g.y); break;
                case 'left': ctx.moveTo(gx, g.y); ctx.lineTo(FIGHT_AREA_X, g.y); break;
            }
            ctx.stroke();
        }
    }

    // 敌方弹幕
    for (const b of enemyBullets) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 2*Math.PI);
        ctx.fill();
    }

    // 玩家弹幕
    for (const b of playerBullets) {
        ctx.fillStyle = b.color || '#ffff55';
        ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    // 红心灵魂
    const heartSize = 20;
    const cx = soul.x + soul.w/2, cy = soul.y + soul.h/2;
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(cx, cy + heartSize/4);
    ctx.bezierCurveTo(cx - heartSize/2, cy - heartSize/2, cx - heartSize/2, cy + heartSize/4, cx, cy + heartSize/2);
    ctx.bezierCurveTo(cx + heartSize/2, cy + heartSize/4, cx + heartSize/2, cy - heartSize/2, cx, cy + heartSize/4);
    ctx.fill();

    // 玩家HP
    let hpw = 200, hph = 15, hpp = Math.min(1, playerHP / PLAYER_MAX_HP);
    ctx.fillStyle = '#333';
    ctx.fillRect(10, 10, hpw, hph);
    ctx.fillStyle = '#f00';
    ctx.fillRect(10, 10, hpw * hpp, hph);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(10, 10, hpw, hph);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`HP: ${Math.ceil(playerHP)}/${PLAYER_MAX_HP}`, 15, 8);
}

// ---------- 包装全局 update / draw，加入距离检测触发战斗 ----------
(function() {
    // 轮询直到 update 和 draw 可用（game-loop.js 已加载）
    const waitForGlobal = setInterval(() => {
        if (typeof update === 'function' && typeof draw === 'function') {
            clearInterval(waitForGlobal);
            // 保存原始函数
            originalUpdate = update;
            originalDraw = draw;

            // 新的 update
            update = function(now) {
                if (inBossFight) {
                    // 由我们自己的函数处理
                    updateBossFight(now);
                } else {
                    // 检测触发战斗
                    if (!gameOver && !victory && boss) {
                        const dist = Math.abs((player.x + player.w/2) - (boss.x + boss.w/2));
                        if (dist <= 30) {
                            enterBossFight();
                            return;
                        }
                    }
                    originalUpdate(now);
                }
            };

            // 新的 draw
            draw = function() {
                if (inBossFight) {
                    drawBossFight();
                } else {
                    originalDraw();
                }
            };
        }
    }, 10);
})();