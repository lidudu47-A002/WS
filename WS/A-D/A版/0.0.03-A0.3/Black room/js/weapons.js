// ---------- 武器系统 ----------
const WEAPONS = {
    sword: {
        id: 'sword',
        name: '铁剑',
        icon: '素材/装备/武器/铁剑.png',
        type: 'melee',
        damageBonus: 20,
        attack: function() {
            let attackDamage = getAttackDamage() + this.damageBonus;
            let rect = {
                x: player.facing === 1 ? player.x + player.w : player.x - ATK_RANGE,
                y: player.y,
                w: ATK_RANGE,
                h: player.h
            };
            for (let e of enemies) {
                if (rectCollide(rect, e)) {
                    e.hp -= attackDamage;
                    e.stun = STUN_DUR;
                    e.hitFlash = 5;
                }
            }
            if (boss && rectCollide(rect, boss)) {
                boss.hp -= attackDamage;
            }
            player.attacking = true;
            player.attackStart = performance.now();
        }
    },
    bow: {
        id: 'bow',
        name: '弓',
        icon: '素材/装备/武器/弓.png',
        type: 'ranged',
        damageBonus: 5,
        attack: function() {
            let direction = player.facing;
            let startX = player.x + player.w / 2;
            let startY = player.y + player.h / 2;
            let speed = 8;
            let vx = direction * speed;
            let vy = 0;
            let arrowDamage = getAttackDamage() + this.damageBonus;
            let arrowImg = new Image();
            arrowImg.src = '素材/装备/武器/弓箭.png';
            projectiles.push({
                x: startX - 6, y: startY - 6,
                vx: vx, vy: vy,
                w: 12, h: 12,
                damage: arrowDamage,
                isEnemy: false,
                isArrow: true,
                img: arrowImg,
                life: 120,
                hasHit: false,
                gravity: ARROW_GRAV
            });
            player.attacking = true;
            player.attackStart = performance.now();
        }
    },
    frostBlade: {
        id: 'frostBlade',
        name: 'F·B 冰霜之刃',
        icon: '素材/装备/武器/冰霜之刃.png',
        type: 'melee',
        damageBonus: 5,
        attack: function() {
            let attackDamage = getAttackDamage() + this.damageBonus;
            let rect = {
                x: player.facing === 1 ? player.x + player.w : player.x - ATK_RANGE,
                y: player.y,
                w: ATK_RANGE,
                h: player.h
            };
            for (let e of enemies) {
                if (rectCollide(rect, e)) {
                    let finalDamage = attackDamage;
                    if (e.frozenUntil > performance.now()) {
                        finalDamage = Math.floor(finalDamage * (1 + FREEZE_DAMAGE_BONUS));
                    }
                    e.hp -= finalDamage;
                    e.stun = STUN_DUR;
                    e.hitFlash = 5;
                    if (e.slowLevel < 3) {
                        e.slowLevel++;
                        e.slowLastDecay = performance.now();
                    }
                    if (Math.random() < 0.05) {
                        e.frozenUntil = performance.now() + FREEZE_DURATION * 1000;
                    }
                }
            }
            if (boss && rectCollide(rect, boss)) {
                boss.hp -= attackDamage;
            }
            player.attacking = true;
            player.attackStart = performance.now();
        }
    },
    firewand: {
        id: 'firewand',
        name: '火焰法杖',
        icon: '素材/装备/武器/火焰法杖.png',
        type: 'ranged',
        damageBonus: 0,
        attack: function() {
            let direction = player.facing;
            let startX = player.x + player.w / 2;
            let startY = player.y + player.h / 2;
            let speed = 4;
            let vx = direction * speed;
            let vy = 0;
            let fireDamage = getAttackDamage() + this.damageBonus;
            projectiles.push({
                x: startX - 6, y: startY - 6,
                vx: vx, vy: vy,
                w: 12, h: 12,
                damage: fireDamage,
                isEnemy: false,
                isFireball: true,
                life: 120,
                hasHit: false,
                color: '#ff6600'
            });
            player.attacking = true;
            player.attackStart = performance.now();
        }
    },
    shadowDagger: {
        id: 'shadowDagger',
        name: '🗡️ 暗影匕首',
        icon: '素材/装备/武器/暗影匕首.png',
        type: 'melee',
        damageBonus: 5,
        attack: function() {
            let attackDamage = getAttackDamage() + this.damageBonus;
            let rect = {
                x: player.facing === 1 ? player.x + player.w : player.x - ATK_RANGE,
                y: player.y,
                w: ATK_RANGE,
                h: player.h
            };
            for (let e of enemies) {
                if (rectCollide(rect, e)) {
                    e.hp -= attackDamage;
                    e.stun = STUN_DUR;
                    e.hitFlash = 5;
                    if (e.weakLevel < WEAK_MAX_LEVEL) {
                        e.weakLevel++;
                        e.weakLastDecay = performance.now();
                    }
                }
            }
            if (boss && rectCollide(rect, boss)) {
                boss.hp -= attackDamage;
            }
            player.attacking = true;
            player.attackStart = performance.now();
        }
    },
    thunderHammer: {
        id: 'thunderHammer',
        name: '⚡ 雷霆锤',
        icon: '素材/装备/武器/雷霆锤.png',
        type: 'melee',
        damageBonus: 10,
        attack: function() {
            let attackDamage = getAttackDamage() + this.damageBonus;
            let rect = {
                x: player.facing === 1 ? player.x + player.w : player.x - ATK_RANGE,
                y: player.y,
                w: ATK_RANGE,
                h: player.h
            };
            for (let e of enemies) {
                if (rectCollide(rect, e)) {
                    e.hp -= attackDamage;
                    e.stun = STUN_DUR;
                    e.hitFlash = 5;
                }
            }
            if (boss && rectCollide(rect, boss)) {
                boss.hp -= attackDamage;
            }
            player.attacking = true;
            player.attackStart = performance.now();

            if (Math.random() < 0.1) {
                const curChunk = Math.floor((player.x + player.w/2) / CHUNK_SIZE);
                const chunkMinX = curChunk * CHUNK_SIZE;
                const chunkMaxX = (curChunk + 1) * CHUNK_SIZE;
                let hitCount = 0;
                for (let e of enemies) {
                    if (e.x >= chunkMinX && e.x < chunkMaxX) {
                        if (e.lightningLevel < 3) {
                            e.lightningLevel = 3;
                            e.lightningDuration = LIGHTNING_DECAY_INTERVAL;
                            e.lightningTimer = 0;
                            e._lastLightningUpdate = performance.now();
                            e._lastLightningDurationUpdate = performance.now();
                        }
                        e.hitFlash = 10;
                        hitCount++;
                    }
                }
                if (hitCount > 0) {
                    showInventoryMessage(`⚡ 雷霆闪电！击中 ${hitCount} 个敌人`);
                }
            }
        }
    },
    compoundBow: {
        id: 'compoundBow',
        name: '复合弓',
        icon: '素材/装备/武器/复合弓.png',
        type: 'ranged',
        damageBonus: 10,
        isCompound: true,
        gravity: BRICK_GRAV,
        bossMultiplier: 1.5,
        attack: function() {
            // 复合弓使用蓄力机制
        }
    },
    blackholeStaff: {
        id: 'blackholeStaff',
        name: '🕳️ 黑洞权杖',
        icon: '素材/装备/武器/黑洞权杖.png',
        type: 'ranged',
        damageBonus: 0,
        attack: function() {
            let direction = player.facing;
            let startX = player.x + player.w / 2;
            let startY = player.y + player.h / 2;
            let speed = 4;
            let vx = direction * speed;
            let vy = 0;
            let damage = getAttackDamage() + this.damageBonus;
            projectiles.push({
                x: startX - 16, y: startY - 16,
                vx: vx, vy: vy,
                w: 32, h: 32,
                damage: damage,
                isEnemy: false,
                isBlackhole: true,
                maxDist: 800,
                startX: startX,
                startY: startY,
                angle: 0,
                life: 200,
                hitEnemies: new Set()
            });
            player.attacking = true;
            player.attackStart = performance.now();
        }
    },
    // ---------- 科技长矛 ----------
    techSpear: {
        id: 'techSpear',
        name: '⚡ 科技长矛',
        icon: '素材/装备/武器/科技长矛.png',
        type: 'melee',
        damageBonus: 10,
        bossMultiplier: 1.5,
        attack: function() {
            let damage = getAttackDamage() + this.damageBonus;
            if (boss) {
                damage = Math.floor(damage * this.bossMultiplier);
            }
            // 创建科技长矛投射物
            projectiles.push({
                isTechSpear: true,
                startX: player.x + player.w/2,
                startY: player.y + player.h/2,
                facing: player.facing,
                startTime: performance.now(),
                duration: 1000, // 1秒
                damage: damage,
                hitEnemies: new Set(),
                angle: 0,
                spearLength: 40
            });
            player.attacking = true;
            player.attackStart = performance.now();
            // 锁定移动（防止攻击时移动）
            player.lockMovement = true;
        }
    }
};

let currentWeapon = null;

function equipWeapon(weaponId) {
    if (WEAPONS[weaponId]) {
        currentWeapon = WEAPONS[weaponId];
        showInventoryMessage(`装备了 ${currentWeapon.name}`);
        return true;
    }
    return false;
}

function unequipWeapon() {
    currentWeapon = null;
    showInventoryMessage('已卸下武器');
}

function performWeaponAttack() {
    if (currentWeapon && currentWeapon.attack && !currentWeapon.isCompound) {
        currentWeapon.attack();
    } else if (currentWeapon && currentWeapon.isCompound) {
        showInventoryMessage('左键蓄力发射复合弓箭矢');
    } else {
        let attackDamage = getAttackDamage();
        let rect = {
            x: player.facing === 1 ? player.x + player.w : player.x - ATK_RANGE,
            y: player.y,
            w: ATK_RANGE,
            h: player.h
        };
        for (let e of enemies) {
            if (rectCollide(rect, e)) {
                e.hp -= attackDamage;
                e.stun = STUN_DUR;
                e.hitFlash = 5;
            }
        }
        if (boss && rectCollide(rect, boss)) boss.hp -= attackDamage;
        player.attacking = true;
        player.attackStart = performance.now();
    }
}

window.currentWeapon = currentWeapon;
window.equipWeapon = equipWeapon;
window.performWeaponAttack = performWeaponAttack;