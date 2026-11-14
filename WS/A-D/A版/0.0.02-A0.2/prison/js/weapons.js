// ---------- 武器系统 ----------
const WEAPONS = {
    sword: {
        id: 'sword',
        name: '铁剑',
        icon: '素材/装备/武器/铁剑.png',
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
            if (boss && rectCollide(rect, boss)) boss.hp -= attackDamage;
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
                hasHit: false
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
                    // 施加虚弱（这里仅做演示，未实现虚弱系统）
                }
            }
            if (boss && rectCollide(rect, boss)) boss.hp -= attackDamage;
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
            if (boss && rectCollide(rect, boss)) boss.hp -= attackDamage;
            player.attacking = true;
            player.attackStart = performance.now();

            // 10%概率触发闪电
            if (Math.random() < 0.1) {
                const curChunk = Math.floor((player.x + player.w/2) / CHUNK_SIZE);
                const chunkMinX = curChunk * CHUNK_SIZE;
                const chunkMaxX = (curChunk + 1) * CHUNK_SIZE;
                let hitCount = 0;
                for (let e of enemies) {
                    if (e.x >= chunkMinX && e.x < chunkMaxX) {
                        e.lightningLevel = 3;
                        e.lightningDuration = LIGHTNING_DECAY_INTERVAL;
                        e.lightningTimer = 0;
                        e._lastLightningUpdate = performance.now();
                        e._lastLightningDurationUpdate = performance.now();
                        e.hitFlash = 10;
                        hitCount++;
                    }
                }
                if (hitCount > 0) {
                    showInventoryMessage(`⚡ 雷霆闪电！击中 ${hitCount} 个敌人`);
                }
            }
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
    if (currentWeapon && currentWeapon.attack) {
        currentWeapon.attack();
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