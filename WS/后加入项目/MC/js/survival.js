// ============================================================
//  生存模式模块
// ============================================================

// 玩家生存属性
let health = 20;
let maxHealth = 20;
let hunger = 20;
let maxHunger = 20;
let hungerTimer = 0;
let lastY = 0;
let isInitialized = false;

// 生存 HUD 元素
let healthBar, hungerBar;
let healthText, hungerText;

// 保存游戏引用
let game = null;

// ============================================================
//  初始化生存模式
// ============================================================
export function initSurvival(gameRef) {
    if (isInitialized) return;
    console.log('🔥 生存模式初始化开始...');
    game = gameRef;
    const { player } = gameRef;

    // 重置生存属性
    health = maxHealth;
    hunger = maxHunger;
    hungerTimer = 0;
    lastY = player.position.y;

    // 创建生存 HUD
    createSurvivalHUD();

    // Monkey patch updatePlayer
    const originalUpdate = gameRef.updatePlayer;
    gameRef.updatePlayer = function(delta) {
        // 调用原更新
        originalUpdate.call(gameRef, delta);

        // --- 生存逻辑 ---
        // 1. 掉落伤害
        const currentY = player.position.y;
        if (currentY < lastY - 5) {
            const damage = Math.floor((lastY - currentY) * 0.5);
            if (damage > 0) {
                takeDamage(damage);
            }
        }
        lastY = currentY;

        // 2. 饥饿度消耗 (每10秒消耗1点)
        hungerTimer += delta;
        if (hungerTimer >= 10) {
            hungerTimer = 0;
            if (hunger > 0) {
                hunger--;
                updateHungerBar();
            } else {
                // 饥饿为0时，每20秒扣1点生命
                if (Math.floor(Date.now() / 20000) % 2 === 0) {
                    takeDamage(1);
                }
            }
        }

        // 3. 生命值恢复（饥饿值>18时缓慢恢复）
        if (hunger > 18 && health < maxHealth) {
            if (Math.floor(Date.now() / 1000) % 4 === 0) {
                health = Math.min(health + 1, maxHealth);
                updateHealthBar();
            }
        }

        // 4. 死亡检测
        if (health <= 0) {
            respawnPlayer(gameRef);
        }
    };

    isInitialized = true;
    console.log('✅ 生存模式已激活');
}

// ============================================================
//  创建生存 HUD
// ============================================================
function createSurvivalHUD() {
    // 如果已存在则移除旧的
    const old = document.getElementById('survival-hud');
    if (old) old.remove();

    const hudContainer = document.createElement('div');
    hudContainer.id = 'survival-hud';
    hudContainer.style.cssText = `
        position: absolute;
        bottom: 80px;
        right: 20px;
        z-index: 20;
        color: #fff;
        font-size: 16px;
        font-weight: bold;
        text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        background: rgba(0,0,0,0.6);
        padding: 12px 16px;
        border-radius: 8px;
        backdrop-filter: blur(4px);
        min-width: 160px;
        text-align: left;
        pointer-events: none;
        border: 1px solid rgba(255,255,255,0.1);
    `;

    // 生命值
    const healthRow = document.createElement('div');
    healthRow.style.marginBottom = '6px';
    healthRow.innerHTML = '❤️ 生命: ';
    healthBar = document.createElement('span');
    healthBar.style.cssText = 'display:inline-block; width:120px; height:12px; background:#333; border-radius:6px; overflow:hidden; vertical-align:middle; margin-left:6px;';
    const healthFill = document.createElement('span');
    healthFill.id = 'health-fill';
    healthFill.style.cssText = 'display:block; height:100%; width:100%; background:#e74c3c; transition:width 0.2s;';
    healthBar.appendChild(healthFill);
    healthText = document.createElement('span');
    healthText.style.marginLeft = '8px';
    healthText.textContent = '20/20';
    healthRow.appendChild(healthBar);
    healthRow.appendChild(healthText);

    // 饥饿值
    const hungerRow = document.createElement('div');
    hungerRow.innerHTML = '🍖 饥饿: ';
    hungerBar = document.createElement('span');
    hungerBar.style.cssText = 'display:inline-block; width:120px; height:12px; background:#333; border-radius:6px; overflow:hidden; vertical-align:middle; margin-left:6px;';
    const hungerFill = document.createElement('span');
    hungerFill.id = 'hunger-fill';
    hungerFill.style.cssText = 'display:block; height:100%; width:100%; background:#f39c12; transition:width 0.2s;';
    hungerBar.appendChild(hungerFill);
    hungerText = document.createElement('span');
    hungerText.style.marginLeft = '8px';
    hungerText.textContent = '20/20';
    hungerRow.appendChild(hungerBar);
    hungerRow.appendChild(hungerText);

    hudContainer.appendChild(healthRow);
    hudContainer.appendChild(hungerRow);
    document.getElementById('game-container').appendChild(hudContainer);

    // 初始更新
    updateHealthBar();
    updateHungerBar();
    console.log('✅ 生存 HUD 已创建');
}

function updateHealthBar() {
    const fill = document.getElementById('health-fill');
    if (fill) {
        const percent = (health / maxHealth) * 100;
        fill.style.width = percent + '%';
        if (healthText) healthText.textContent = `${Math.round(health)}/${maxHealth}`;
    }
}

function updateHungerBar() {
    const fill = document.getElementById('hunger-fill');
    if (fill) {
        const percent = (hunger / maxHunger) * 100;
        fill.style.width = percent + '%';
        if (hungerText) hungerText.textContent = `${Math.round(hunger)}/${maxHunger}`;
    }
}

// ============================================================
//  伤害 & 恢复
// ============================================================
function takeDamage(amount) {
    health = Math.max(0, health - amount);
    updateHealthBar();
}

function respawnPlayer(gameRef) {
    const { player, worldData, worldMapSize, worldHeight, camera } = gameRef;
    // 寻找安全重生点（世界中心最高点）
    let spawnY = worldHeight - 1;
    for (let y = worldHeight - 1; y >= 0; y--) {
        const wIdx = (y * worldMapSize + Math.floor(worldMapSize/2)) * worldMapSize + Math.floor(worldMapSize/2);
        if (worldData[wIdx] > 0) {
            spawnY = y + 2;
            break;
        }
    }
    player.position.set(0, spawnY, 0);
    camera.position.copy(player.position);
    player.velocity.set(0,0,0);
    health = maxHealth / 2;
    hunger = maxHunger / 2;
    updateHealthBar();
    updateHungerBar();
    // 显示消息
    const msg = document.getElementById('message');
    if (msg) {
        msg.textContent = '💀 你死了！已重生';
        msg.classList.add('show');
        setTimeout(() => msg.classList.remove('show'), 3000);
    }
}

// ============================================================
//  清理函数（可选）
// ============================================================
export function cleanupSurvival() {
    const hud = document.getElementById('survival-hud');
    if (hud) hud.remove();
    isInitialized = false;
}