// ---------- 龙骨炮（静止激光，框内预警） ----------
const GASTER_WARN = 90;
const GASTER_FIRE = 30;
const LASER_DAMAGE = 10;

function spawnGasterBlaster() {
    if (!boxW || !boxH) return;
    const side = Math.floor(Math.random() * 4);
    let x, y, dir;
    switch (side) {
        case 0: x = boxX + Math.random() * boxW; y = boxY; dir = 'down'; break;
        case 1: x = boxX + Math.random() * boxW; y = boxY + boxH; dir = 'up'; break;
        case 2: x = boxX; y = boxY + Math.random() * boxH; dir = 'right'; break;
        case 3: x = boxX + boxW; y = boxY + Math.random() * boxH; dir = 'left'; break;
    }
    gasterBlasters.push({ x, y, direction: dir, state: 'warn', timer: 0 });
}

function getLaserRect(g, progress) {
    const thickness = 12;
    let r = {};
    switch (g.direction) {
        case 'down':
            r = { x: g.x - thickness/2, y: g.y, w: thickness, h: (boxY + boxH - g.y) * progress };
            break;
        case 'up':
            r = { x: g.x - thickness/2, y: g.y - (g.y - boxY) * progress, w: thickness, h: (g.y - boxY) * progress };
            break;
        case 'right':
            r = { x: g.x, y: g.y - thickness/2, w: (boxX + boxW - g.x) * progress, h: thickness };
            break;
        case 'left':
            r = { x: g.x - (g.x - boxX) * progress, y: g.y - thickness/2, w: (g.x - boxX) * progress, h: thickness };
            break;
    }
    return r;
}

function updateGasterBlasters() {
    for (let i = gasterBlasters.length - 1; i >= 0; i--) {
        const g = gasterBlasters[i];
        g.timer++;
        if (g.state === 'warn' && g.timer >= GASTER_WARN) {
            g.state = 'fire';
            g.timer = 0;
        } else if (g.state === 'fire') {
            if (g.timer >= GASTER_FIRE) {
                gasterBlasters.splice(i, 1);
                continue;
            }
            const progress = Math.min(1, g.timer / GASTER_FIRE);
            const laserRect = getLaserRect(g, progress);
            const soulRect = { x: soulX, y: soulY, w: SOUL_SIZE, h: SOUL_SIZE };
            if (rectCollide(soulRect, laserRect)) {
                playerHP = Math.max(0, playerHP - LASER_DAMAGE);
                gasterBlasters.splice(i, 1);
            }
        }
    }
}

// ---------- 弧线弹幕 ----------
const BULLET_SPEED = 2.5;
const BULLET_DAMAGE = 5;
const BULLET_RADIUS = 5;
const BULLET_TURN_RATE = 0.005;

function spawnBullets() {
    const count = 3;
    const W = getViewW(), H = getViewH();
    for (let i = 0; i < count; i++) {
        const side = Math.floor(Math.random() * 4);
        let startX, startY;
        const margin = 15;
        if (side === 0 || side === 1) {
            startX = Math.random() * W;
            startY = side === 0 ? margin : H - margin;
        } else {
            startX = side === 2 ? margin : W - margin;
            startY = Math.random() * H;
        }
        const targetX = soulX + SOUL_SIZE/2;
        const targetY = soulY + SOUL_SIZE/2;
        let baseAngle = Math.atan2(targetY - startY, targetX - startX);
        let angleOffset = (Math.random() - 0.5) * 0.4;
        let angle = baseAngle + angleOffset;
        enemyBullets.push({
            x: startX, y: startY,
            angle, speed: BULLET_SPEED,
            vx: Math.cos(angle) * BULLET_SPEED,
            vy: Math.sin(angle) * BULLET_SPEED,
            r: BULLET_RADIUS
        });
    }
}

function updateBullets() {
    const W = getViewW(), H = getViewH();
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.angle += BULLET_TURN_RATE;
        b.vx = Math.cos(b.angle) * b.speed;
        b.vy = Math.sin(b.angle) * b.speed;
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
            enemyBullets.splice(i, 1);
            continue;
        }
        const bulletRect = { x: b.x - b.r, y: b.y - b.r, w: b.r*2, h: b.r*2 };
        const soulRect = { x: soulX, y: soulY, w: SOUL_SIZE, h: SOUL_SIZE };
        if (rectCollide(soulRect, bulletRect)) {
            playerHP = Math.max(0, playerHP - BULLET_DAMAGE);
            enemyBullets.splice(i, 1);
        }
    }
}

function clearAllAttacks() {
    gasterBlasters = [];
    enemyBullets = [];
}