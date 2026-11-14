// 引擎.js - 物理、碰撞、摄像机、主更新循环

// 碰撞检测（矩形）
function rectCollide(r1, r2) {
    return !(r2.worldX >= r1.worldX + r1.width ||
             r2.worldX + r2.width <= r1.worldX ||
             r2.worldY >= r1.worldY + r1.height ||
             r2.worldY + r2.height <= r1.worldY);
}

// 砖头与敌人的碰撞（圆形近似）
function brickCollideWithEnemy(brick, enemy) {
    const brickCenterX = brick.worldX + brick.width/2;
    const brickCenterY = brick.worldY + brick.height/2;
    const radius = Math.hypot(brick.width, brick.height) / 2;
    const closestX = Math.max(enemy.worldX, Math.min(brickCenterX, enemy.worldX + enemy.width));
    const closestY = Math.max(enemy.worldY, Math.min(brickCenterY, enemy.worldY + enemy.height));
    const dx = brickCenterX - closestX;
    const dy = brickCenterY - closestY;
    return (dx * dx + dy * dy) < radius * radius;
}

// 更新摄像机
function updateCamera() {
    let targetCameraX = cameraX;
    const playerScreenX = player.worldX - cameraX;
    if (playerScreenX < DEAD_ZONE_LEFT) {
        targetCameraX = player.worldX - DEAD_ZONE_LEFT;
    } else if (playerScreenX > DEAD_ZONE_RIGHT) {
        targetCameraX = player.worldX - DEAD_ZONE_RIGHT;
    }
    targetCameraX = Math.max(0, Math.min(targetCameraX, WORLD_WIDTH - VIEW_WIDTH));
    cameraX += (targetCameraX - cameraX) * 0.1;
    cameraX = Math.max(0, Math.min(cameraX, WORLD_WIDTH - VIEW_WIDTH));
}

// 更新穿刺攻击物
function updatePierceProjectile(now) {
    if (!pierceProjectile) return;

    const p = pierceProjectile;
    // 移动
    p.x += p.vx;
    p.y += p.vy;

    // 边界移除
    if (p.x < -50 || p.x > WORLD_WIDTH + 50 || p.y < -50 || p.y > WORLD_HEIGHT + 50) {
        pierceProjectile = null;
        return;
    }

    // 碰撞检测
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (p.hitEnemies.has(enemy)) continue;

        if (rectCollide({worldX: p.x, worldY: p.y, width: p.width, height: p.height}, enemy)) {
            // 沿途伤害
            enemy.hp -= PIERCE_PASS_DAMAGE;
            enemy.stunTimer = STUN_DURATION;
            p.hitEnemies.add(enemy);
            p.penetrationsLeft--;
            p.lastEnemy = enemy;  // 记录最后击中的敌人

            if (p.penetrationsLeft <= 0) {
                // 最后一名敌人追加额外伤害
                if (p.lastEnemy) {
                    p.lastEnemy.hp -= (PIERCE_FINAL_DAMAGE - PIERCE_PASS_DAMAGE);
                }
                pierceProjectile = null;
                return;
            }
        }
    }
}

// 主更新函数
function update(now) {
    if (victory) return;

    // 朝向
    if (leftPressed && !rightPressed) player.facing = -1;
    else if (rightPressed && !leftPressed) player.facing = 1;

    // 水平移动
    let deltaX = 0;
    if (leftPressed) deltaX -= player.speed;
    if (rightPressed) deltaX += player.speed;
    let newWorldX = player.worldX + deltaX;
    newWorldX = Math.max(0, Math.min(newWorldX, WORLD_WIDTH - player.width));
    player.worldX = newWorldX;

    // 检测胜利条件
    if (player.worldX + player.width >= WORLD_WIDTH) {
        victory = true;
        victoryMessage.style.display = 'block';
        return;
    }

    // 垂直物理
    player.vy += GRAVITY;
    player.worldY += player.vy;

    // 地面/天花板碰撞
    let isGrounded = false;
    if (player.worldY > getGroundY()) {
        player.worldY = getGroundY();
        player.vy = 0;
        isGrounded = true;
    }
    if (player.worldY < 0) {
        player.worldY = 0;
        player.vy = 0;
    }
    isGrounded = isGrounded || (player.worldY >= getGroundY() - 0.001);
    if (isGrounded) {
        jumpUsed = false;
        player.jumpsLeft = 2;
    }

    // 蹲伏
    const duckRequested = shiftPressed || downPressed;
    const targetHeight = (isGrounded && duckRequested) ? DUCKING_HEIGHT : STANDING_HEIGHT;
    if (targetHeight !== player.height) {
        const oldBottom = player.worldY + player.height;
        player.height = targetHeight;
        if (isGrounded) {
            player.worldY = getGroundY();
        } else {
            player.worldY = oldBottom - player.height;
        }
    }

    // ----- 区块生成逻辑 -----
    const playerCenterX = player.worldX + player.width / 2;
    const currentChunk = Math.floor(playerCenterX / CHUNK_SIZE);

    for (let chunk = 0; chunk < CHUNK_COUNT; chunk++) {
        const distance = Math.abs(chunk - currentChunk);
        let interval;
        if (distance === 0) interval = 4000;
        else if (distance === 1) interval = 8000;
        else if (distance === 2) interval = 10000;
        else continue;

        if (enemies.length < MAX_ENEMIES_TOTAL && now - chunkLastSpawn[chunk] >= interval) {
            spawnEnemyInChunk(chunk);
            chunkLastSpawn[chunk] = now;
        }
    }

    // 左键攻击
    if (player.isAttacking) {
        const elapsed = now - player.attackStartTime;
        const progress = Math.min(elapsed / ATTACK_DURATION, 1.0);
        const maxOffset = player.width * 0.5;
        const offsetFactor = Math.sin(progress * Math.PI);
        player.visualOffsetX = player.facing * maxOffset * offsetFactor;

        const attackRect = {
            worldX: player.facing === 1 ? player.worldX + player.width : player.worldX - ATTACK_RANGE,
            worldY: player.worldY,
            width: ATTACK_RANGE,
            height: player.height
        };

        for (let enemy of enemies) {
            if (player.attackHitEnemies.has(enemy)) continue;
            if (rectCollide(attackRect, enemy)) {
                enemy.hp -= ATTACK_DAMAGE;
                enemy.stunTimer = STUN_DURATION;
                player.attackHitEnemies.add(enemy);
            }
        }

        if (progress >= 1.0) {
            player.isAttacking = false;
            player.visualOffsetX = 0;
            player.attackHitEnemies.clear();
        }
    } else {
        player.visualOffsetX = 0;
    }

    // 砖头更新
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const b = projectiles[i];
        b.vy += BRICK_GRAVITY;
        b.worldX += b.vx;
        b.worldY += b.vy;

        if (b.worldX < -50 || b.worldX > WORLD_WIDTH + 50 || b.worldY < -50 || b.worldY > WORLD_HEIGHT + 50) {
            projectiles.splice(i, 1);
            continue;
        }

        let hit = false;
        for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];
            if (brickCollideWithEnemy(b, enemy)) {
                enemy.hp -= b.damage;
                enemy.stunTimer = STUN_DURATION;
                hit = true;
                break;
            }
        }
        if (hit) {
            projectiles.splice(i, 1);
        }
    }

    // 更新穿刺攻击物
    updatePierceProjectile(now);

    // 敌人移动
    for (let enemy of enemies) {
        if (enemy.stunTimer > 0) {
            enemy.stunTimer--;
            continue;
        }
        const playerCenterX = player.worldX + player.width / 2;
        const enemyCenterX = enemy.worldX + enemy.width / 2;
        if (playerCenterX > enemyCenterX) {
            enemy.worldX += ENEMY_SPEED;
        } else if (playerCenterX < enemyCenterX) {
            enemy.worldX -= ENEMY_SPEED;
        }
        enemy.worldX = Math.max(0, Math.min(enemy.worldX, WORLD_WIDTH - enemy.width));
    }

    // 移除死亡敌人，增加金币和经验
    const oldCount = enemies.length;
    enemies = enemies.filter(e => e.hp > 0);
    const killed = oldCount - enemies.length;
    if (killed > 0) {
        killCount += killed;
        for (let i = 0; i < killed; i++) {
            addResourcesFromKill();
        }
    }

    // 碰撞分离
    const entities = [player, ...enemies];
    const iterationCount = 10;
    for (let iter = 0; iter < iterationCount; iter++) {
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const a = entities[i];
                const b = entities[j];
                const overlapX = Math.min(a.worldX + a.width, b.worldX + b.width) - Math.max(a.worldX, b.worldX);
                const overlapY = Math.min(a.worldY + a.height, b.worldY + b.height) - Math.max(a.worldY, b.worldY);
                if (overlapX > 0 && overlapY > 0) {
                    const dx = overlapX / 2;
                    if (a.worldX < b.worldX) {
                        a.worldX -= dx;
                        b.worldX += dx;
                    } else {
                        a.worldX += dx;
                        b.worldX -= dx;
                    }
                }
            }
        }
        for (let entity of entities) {
            entity.worldX = Math.max(0, Math.min(entity.worldX, WORLD_WIDTH - entity.width));
        }
    }

    // 更新摄像机
    updateCamera();

    // 如果面板可见，刷新面板内容
    if (panelVisible) updatePanel();
}