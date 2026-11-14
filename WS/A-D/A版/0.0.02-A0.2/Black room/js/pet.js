// ---------- 宠物系统 ----------
window.ownedPets = window.ownedPets || [];
let activePets = [];

class Pet {
    constructor(type, data) {
        this.type = type;
        this.name = data.name;
        this.icon = data.icon;
        this.x = 0;
        this.y = 0;
        this.isMoving = false;
        this.moveTargetX = 0;
        this.moveTargetY = 0;
        this.moveSpeed = 3;
        this.attackCooldown = 0;
        this.skillActive = false;
        this.skillStartTime = 0;
        this.controllingEnemy = null;
        this.activeTriangles = [];
        this.killCount = 0;
        this.smallBlackhole = null;
        this.largeBlackhole = null;
        this.bodies = [];
        this.horrorLastDamage = 0;
        this.blackholeFrame = 0;
        this.lastBlackholeTime = 0;
        // 小e专用状态
        this.eState = 'idle';
        this.eTargetEnemy = null;
        this.eSlashStartTime = 0;
        this.eMoveStartX = 0;
        this.eMoveStartY = 0;
        this.eReturnSpeed = 4.5;   // 玩家速度 2.8 * 1.6 ≈ 4.5
        this.updateFunc = data.update;
        this.updateSkillFunc = data.updateSkill;
        this.resetSkillFunc = data.resetSkill;
        this.drawFunc = data.draw;
        if (data.startSkill) this.startSkill = data.startSkill.bind(this);
        if (data.updateSkillMonkey) this.updateSkillMonkey = data.updateSkillMonkey.bind(this);
        if (data.resetSkillMonkey) this.resetSkillMonkey = data.resetSkillMonkey.bind(this);
        if (data.onKill) this.onKill = data.onKill.bind(this);
        if (data.absorbBody) this.absorbBody = data.absorbBody.bind(this);
        if (data.throwBodies) this.throwBodies = data.throwBodies.bind(this);
        if (data.updateBlackholes) this.updateBlackholes = data.updateBlackholes.bind(this);
        if (data.init) data.init(this);
    }
}

const PET_DEFS = {
    // ---------- Monkey 宠物 ----------
    monkey: {
        name: 'Monkey',
        icon: '素材/宠物/宠物样式/monkey.png',
        init: (pet) => {
            pet.killCount = 0;
            pet.smallBlackhole = null;
            pet.largeBlackhole = null;
            pet.bodies = [];
        },
        update: (pet, now) => {
            if (pet.attackCooldown > 0) pet.attackCooldown--;
            let offsetX = -40;
            pet.x = player.x + player.w/2 - 16 + offsetX;
            pet.y = player.y - 20;
            pet.x = Math.min(Math.max(0, pet.x), WORLD_W - 32);
            pet.y = Math.min(Math.max(20, pet.y), WORLD_H - 32);
            if (pet.skillActive) return;
            if (pet.attackCooldown > 0) return;
            let closest = null;
            let minDist = Infinity;
            const pcx = player.x + player.w/2;
            const pcy = player.y + player.h/2;
            for (let e of enemies) {
                if (e.hp <= 0) continue;
                if (e.controlledByPet) continue;
                let dx = (e.x + e.w/2) - pcx;
                if (Math.abs(dx) > 200) continue;
                let dy = (e.y + e.h/2) - pcy;
                if (Math.abs(dy) > 200) continue;
                let dist = Math.hypot(dx, dy);
                if (dist < minDist) {
                    minDist = dist;
                    closest = e;
                }
            }
            if (closest && pet.startSkill) {
                pet.startSkill(closest);
                pet.attackCooldown = 180;
            }
        },
        startSkill: function(enemy) {
            this.skillActive = true;
            this.skillStartTime = performance.now();
            this.controllingEnemy = enemy;
            enemy.controlledByPet = true;
            enemy.suspended = true;
            enemy.suspendStartTime = performance.now();
            enemy.suspendTargetY = 297;
            enemy.suspendOriginalY = enemy.y;
            enemy.canBeDamaged = false;
        },
        updateSkillMonkey: function(pet, now) {
            if (!pet.skillActive) return;
            let enemy = pet.controllingEnemy;
            if (!enemy || enemy.hp <= 0) {
                pet.resetSkillMonkey(pet);
                return;
            }
            let elapsed = (now - pet.skillStartTime) / 1000;
            if (elapsed < 0.8) {
                let t = elapsed / 0.8;
                let newY = enemy.suspendOriginalY + (enemy.suspendTargetY - enemy.suspendOriginalY) * t;
                enemy.y = newY;
            } else if (elapsed < 1.0) {
                enemy.y = enemy.suspendTargetY;
            } else {
                let damage = 10 + (level - 1) * 5;
                enemy.hp -= damage;
                enemy.hitFlash = 5;
                if (typeof damageNumbers !== 'undefined') {
                    damageNumbers.push({
                        x: enemy.x + enemy.w/2,
                        y: enemy.y - 15,
                        damage: damage,
                        timer: 60
                    });
                }
                enemy.y = enemy.suspendOriginalY;
                pet.resetSkillMonkey(pet);
            }
        },
        resetSkillMonkey: function(pet) {
            if (pet.controllingEnemy) {
                let e = pet.controllingEnemy;
                e.controlledByPet = false;
                e.suspended = false;
                e.canBeDamaged = true;
                if (e.y === e.suspendTargetY && e.suspendOriginalY) e.y = e.suspendOriginalY;
            }
            pet.skillActive = false;
            pet.controllingEnemy = null;
            pet.isMoving = false;
        },
        onKill: function(pet, enemyX, enemyY, enemyMaxHp) {
            pet.killCount++;
            if (pet.killCount >= 30 && !pet.largeBlackhole) {
                pet.largeBlackhole = {
                    x: player.x + player.w/2 - 64,
                    y: player.y - 200,
                    startTime: performance.now(),
                    duration: 10000,
                    bodies: []
                };
                return;
            }
            if (pet.killCount % 5 === 0 && !pet.smallBlackhole) {
                pet.smallBlackhole = {
                    x: enemyX - 32,
                    y: enemyY - 32,
                    startTime: performance.now(),
                    duration: 5000,
                    bodies: []
                };
            }
        },
        updateBlackholes: function(pet, now) {
            if (pet.smallBlackhole) {
                let bh = pet.smallBlackhole;
                if (now - bh.startTime >= bh.duration) {
                    pet.throwBodies(pet, bh.x + 32, bh.y + 32);
                    pet.smallBlackhole = null;
                } else {
                    const cx = bh.x + 32, cy = bh.y + 32;
                    for (let e of enemies) {
                        let dx = (e.x + e.w/2) - cx;
                        let dy = (e.y + e.h/2) - cy;
                        let dist = Math.hypot(dx, dy);
                        if (dist < 64) {
                            e.hasPermanentSlow = true;
                            e.blackholeLevel = 1;
                        } else {
                            if (e.blackholeLevel === 1 && !e.hasPermanentSlowFromOther) {
                                e.hasPermanentSlow = false;
                                e.blackholeLevel = 0;
                            }
                        }
                    }
                }
            }
            if (pet.largeBlackhole) {
                let bh = pet.largeBlackhole;
                if (now - bh.startTime >= bh.duration) {
                    pet.throwBodies(pet, bh.x + 64, bh.y + 64);
                    pet.largeBlackhole = null;
                } else {
                    const cx = bh.x + 64, cy = bh.y + 64;
                    for (let e of enemies) {
                        let dx = (e.x + e.w/2) - cx;
                        let dy = (e.y + e.h/2) - cy;
                        let dist = Math.hypot(dx, dy);
                        if (dist < 200) {
                            e.blackholeLevel = 3;
                            e.hasPermanentSlow = true;
                        } else if (dist < 400) {
                            e.blackholeLevel = 2;
                            e.hasPermanentSlow = true;
                        } else if (dist < 500) {
                            e.blackholeLevel = 1;
                            e.hasPermanentSlow = true;
                        } else {
                            if (e.blackholeLevel && !e.hasPermanentSlowFromOther) {
                                e.hasPermanentSlow = false;
                                e.blackholeLevel = 0;
                            }
                        }
                    }
                }
            }
        },
        absorbBody: function(pet, enemyX, enemyY, enemyMaxHp) {
            if (pet.smallBlackhole) {
                pet.smallBlackhole.bodies.push({ x: enemyX, y: enemyY, hp: enemyMaxHp });
            } else if (pet.largeBlackhole) {
                pet.largeBlackhole.bodies.push({ x: enemyX, y: enemyY, hp: enemyMaxHp });
            }
        },
        throwBodies: function(pet, centerX, centerY) {
            let bodies = pet.smallBlackhole ? pet.smallBlackhole.bodies : (pet.largeBlackhole ? pet.largeBlackhole.bodies : []);
            if (bodies.length === 0) return;
            let closest = null;
            let minDist = Infinity;
            for (let e of enemies) {
                if (e.hp <= 0) continue;
                let dx = (e.x + e.w/2) - centerX;
                let dy = (e.y + e.h/2) - centerY;
                let dist = Math.hypot(dx, dy);
                if (dist < minDist) {
                    minDist = dist;
                    closest = e;
                }
            }
            if (closest) {
                let totalDamage = 0;
                for (let body of bodies) {
                    totalDamage += body.hp * 0.1 * level;
                }
                closest.hp -= Math.floor(totalDamage);
                closest.hitFlash = 5;
                if (typeof damageNumbers !== 'undefined') {
                    damageNumbers.push({
                        x: closest.x + closest.w/2,
                        y: closest.y - 15,
                        damage: Math.floor(totalDamage),
                        timer: 60
                    });
                }
            }
            bodies.length = 0;
        },
        draw: (pet) => {
            let img = new Image();
            img.src = pet.icon;
            let px = pet.x - cameraX;
            let py = pet.y;
            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, px, py, 32, 32);
            } else {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(px, py, 32, 32);
                ctx.fillStyle = '#fff';
                ctx.font = '12px monospace';
                ctx.fillText('🐒', px + 8, py + 20);
            }
            const now = performance.now();
            if (!pet.lastBlackholeTime) pet.lastBlackholeTime = now;
            if (now - pet.lastBlackholeTime >= 200) {
                pet.blackholeFrame = (pet.blackholeFrame + 1) % 36;
                pet.lastBlackholeTime = now;
            }
            const angleStep = (pet.blackholeFrame * 10) * Math.PI / 180;
            if (pet.smallBlackhole) {
                let bhImg = new Image();
                bhImg.src = '素材/宠物/其他/黑洞.gif';
                let bhx = pet.smallBlackhole.x - cameraX;
                let bhy = pet.smallBlackhole.y;
                if (bhImg.complete && bhImg.naturalWidth > 0) {
                    ctx.drawImage(bhImg, bhx, bhy, 64, 64);
                } else {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(bhx, bhy, 64, 64);
                }
                ctx.save();
                ctx.translate(bhx + 32, bhy + 32);
                ctx.rotate(angleStep);
                ctx.beginPath();
                ctx.arc(0, 0, 36, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 100, 50, 0.6)';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.restore();
            }
            if (pet.largeBlackhole) {
                let bhImg = new Image();
                bhImg.src = '素材/宠物/其他/黑洞.gif';
                let bhx = pet.largeBlackhole.x - cameraX;
                let bhy = pet.largeBlackhole.y;
                if (bhImg.complete && bhImg.naturalWidth > 0) {
                    ctx.drawImage(bhImg, bhx, bhy, 128, 128);
                } else {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(bhx, bhy, 128, 128);
                }
                ctx.save();
                ctx.translate(bhx + 64, bhy + 64);
                ctx.rotate(-angleStep);
                ctx.beginPath();
                ctx.arc(0, 0, 70, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 200, 100, 0.8)';
                ctx.lineWidth = 5;
                ctx.stroke();
                ctx.restore();
            }
        }
    },
    // ---------- 0.618 宠物 ----------
    point618: {
        name: '0.618',
        icon: '素材/宠物/宠物样式/0.618.png',
        init: (pet) => {
            pet.attackCooldown = 0;
            pet.activeTriangles = [];
        },
        update: (pet, now) => {
            if (pet.attackCooldown > 0) pet.attackCooldown--;
            pet.x = player.x + player.w/2 - 16;
            pet.y = player.y - 60;
            pet.x = Math.min(Math.max(0, pet.x), WORLD_W - 32);
            pet.y = Math.min(Math.max(20, pet.y), WORLD_H - 32);
            if (pet.attackCooldown <= 0) {
                let closest = null;
                let minDist = Infinity;
                const pcx = player.x + player.w/2;
                const pcy = player.y + player.h/2;
                for (let e of enemies) {
                    if (e.hp <= 0) continue;
                    let dx = (e.x + e.w/2) - pcx;
                    if (Math.abs(dx) > 200) continue;
                    let dy = (e.y + e.h/2) - pcy;
                    if (Math.abs(dy) > 200) continue;
                    let dist = Math.hypot(dx, dy);
                    if (dist < minDist) {
                        minDist = dist;
                        closest = e;
                    }
                }
                if (closest) {
                    let isBouncing = (Math.random() < 0.05);
                    let newTriangle = {
                        target: closest,
                        x: player.x + player.w/2,
                        y: player.y - 10,
                        angle: Math.atan2(closest.y + closest.h/2 - (player.y - 10), closest.x + closest.w/2 - (player.x + player.w/2)),
                        travelDist: 0,
                        hitSet: new Set(),
                        isBouncing: isBouncing,
                        bounceCount: 0
                    };
                    pet.activeTriangles.push(newTriangle);
                    if (pet.activeTriangles.length > 5) pet.activeTriangles.shift();
                    pet.attackCooldown = isBouncing ? 180 : 120;
                } else {
                    pet.attackCooldown = 30;
                }
            }
        },
        updateSkill: function(pet, now) {
            if (pet.activeTriangles.length === 0) return;
            let speed = 8;
            for (let i = 0; i < pet.activeTriangles.length; i++) {
                let t = pet.activeTriangles[i];
                let dx = Math.cos(t.angle) * speed;
                let dy = Math.sin(t.angle) * speed;
                t.x += dx;
                t.y += dy;
                t.travelDist += speed;

                if (t.isBouncing) {
                    let bounced = false;
                    if (t.y <= 0) {
                        t.y = 0;
                        t.angle = -t.angle;
                        bounced = true;
                    } else if (t.y >= WORLD_H) {
                        t.y = WORLD_H;
                        t.angle = -t.angle;
                        bounced = true;
                    }
                    if (!bounced && t.x <= 0) {
                        t.x = 0;
                        t.angle = Math.PI - t.angle;
                        bounced = true;
                    } else if (!bounced && t.x >= WORLD_W) {
                        t.x = WORLD_W;
                        t.angle = Math.PI - t.angle;
                        bounced = true;
                    }
                    if (bounced) {
                        t.bounceCount++;
                        if (t.bounceCount >= 30) {
                            pet.activeTriangles.splice(i, 1);
                            i--;
                            continue;
                        }
                    }
                } else {
                    if (t.y <= 0 || t.y >= WORLD_H || t.travelDist >= 800) {
                        pet.activeTriangles.splice(i, 1);
                        i--;
                        continue;
                    }
                }

                let rect = { x: t.x - 8, y: t.y - 8, w: 16, h: 16 };
                for (let e of enemies) {
                    if (e.hp <= 0) continue;
                    if (t.isBouncing) {
                        if (rectCollide(rect, e)) {
                            let damage = 5 + (level - 1);
                            e.hp -= damage;
                            e.hitFlash = 5;
                        }
                    } else {
                        if (!t.hitSet.has(e) && rectCollide(rect, e)) {
                            let damage = (e === t.target) ? 10 + (level - 1) * 2 : 5 + (level - 1);
                            e.hp -= damage;
                            e.hitFlash = 5;
                            t.hitSet.add(e);
                        }
                    }
                }
                if (t.x < -100 || t.x > WORLD_W + 100 || t.y < -100 || t.y > WORLD_H + 100) {
                    pet.activeTriangles.splice(i, 1);
                    i--;
                }
            }
        },
        draw: (pet) => {
            let img = new Image();
            img.src = pet.icon;
            let px = pet.x - cameraX;
            let py = pet.y;
            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, px, py, 32, 32);
            } else {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(px, py, 32, 32);
                ctx.fillStyle = '#fff';
                ctx.font = '12px monospace';
                ctx.fillText('0.618', px + 4, py + 20);
            }
            for (let t of pet.activeTriangles) {
                let cx = t.x - cameraX;
                let cy = t.y;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(t.angle);
                ctx.beginPath();
                ctx.moveTo(18, 0);
                ctx.lineTo(-6, -6);
                ctx.lineTo(-6, 6);
                ctx.closePath();
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.restore();
            }
        }
    },
    // ---------- Horror 宠物 ----------
    horror: {
        name: 'Horror',
        icon: '素材/宠物/宠物样式/horror.png',
        init: (pet) => {
            pet.horrorLastDamage = performance.now();
        },
        update: (pet, now) => {
            let offsetX = -50;
            pet.x = player.x + player.w/2 - 16 + offsetX;
            pet.y = player.y - 40;
            pet.x = Math.min(Math.max(0, pet.x), WORLD_W - 32);
            pet.y = Math.min(Math.max(20, pet.y), WORLD_H - 32);
            if (now - pet.horrorLastDamage >= 5000) {
                let damage = 5 + (level - 1) * 5;
                for (let e of enemies) {
                    if (e.hp <= 0) continue;
                    e.hp -= damage;
                    e.hitFlash = 5;
                    e.hasPermanentSlow = true;
                }
                pet.horrorLastDamage = now;
            }
        },
        draw: (pet) => {
            let img = new Image();
            img.src = pet.icon;
            let px = pet.x - cameraX;
            let py = pet.y;
            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, px, py, 32, 32);
            } else {
                ctx.fillStyle = '#2c2c2c';
                ctx.fillRect(px, py, 32, 32);
                ctx.fillStyle = '#fff';
                ctx.font = '12px monospace';
                ctx.fillText('H', px + 12, py + 20);
            }
        }
    },
    // ---------- 小e 宠物 ----------
    xiaoe: {
        name: '小e',
        icon: '素材/宠物/宠物样式/小e.png',
        init: (pet) => {
            pet.eState = 'idle';
            pet.eTargetEnemy = null;
            pet.eSlashStartTime = 0;
            pet.attackCooldown = 0;
            pet.eReturnSpeed = 4.5;   // 玩家速度 2.8 * 1.6 ≈ 4.5
        },
        update: (pet, now) => {
            // 待机状态时冷却递减，同时移动至玩家面前
            if (pet.eState === 'idle') {
                if (pet.attackCooldown > 0) pet.attackCooldown--;
                // 跟随玩家
                let offsetX = player.facing === 1 ? 50 : -50;
                let targetX = player.x + player.w/2 - 16 + offsetX;
                let targetY = player.y + player.h/2 - 16;
                pet.moveTargetX = Math.min(Math.max(0, targetX), WORLD_W - 32);
                pet.moveTargetY = Math.min(Math.max(20, targetY), WORLD_H - 32);
                pet.isMoving = true;
                pet.currentSpeed = pet.moveSpeed;
                
                if (pet.attackCooldown <= 0) {
                    // 索敌
                    let closest = null;
                    let minDist = Infinity;
                    const pcx = player.x + player.w/2;
                    const pcy = player.y + player.h/2;
                    for (let e of enemies) {
                        if (e.hp <= 0) continue;
                        let dx = (e.x + e.w/2) - pcx;
                        if (Math.abs(dx) > 300) continue;
                        let dy = (e.y + e.h/2) - pcy;
                        if (Math.abs(dy) > 300) continue;
                        let dist = Math.hypot(dx, dy);
                        if (dist < minDist) {
                            minDist = dist;
                            closest = e;
                        }
                    }
                    if (closest) {
                        pet.eTargetEnemy = closest;
                        pet.eState = 'movingToEnemy';
                        // 目标位置：敌人前方（靠近玩家的一侧）
                        let targetX = closest.x;
                        let dirX = (closest.x + closest.w/2) - (player.x + player.w/2);
                        if (dirX > 0) targetX = closest.x - 20;
                        else targetX = closest.x + closest.w + 20;
                        pet.moveTargetX = Math.min(Math.max(0, targetX), WORLD_W - 32);
                        pet.moveTargetY = Math.min(Math.max(20, closest.y), WORLD_H - 32);
                        pet.isMoving = true;
                        pet.currentSpeed = pet.moveSpeed;
                    }
                }
            } 
            else if (pet.eState === 'movingToEnemy') {
                // 检查是否到达目标
                if (!pet.isMoving && Math.hypot(pet.x - pet.moveTargetX, pet.y - pet.moveTargetY) < 5) {
                    pet.eState = 'waitingSlash';
                    pet.eSlashStartTime = now;
                    pet.isMoving = false;
                }
            } 
            else if (pet.eState === 'waitingSlash') {
                if (now - pet.eSlashStartTime >= 500) {
                    if (pet.eTargetEnemy && pet.eTargetEnemy.hp > 0) {
                        let damage = 20 + (level - 1) * 2;
                        pet.eTargetEnemy.hp -= damage;
                        pet.eTargetEnemy.hitFlash = 5;
                        if (typeof damageNumbers !== 'undefined') {
                            damageNumbers.push({
                                x: pet.eTargetEnemy.x + pet.eTargetEnemy.w/2,
                                y: pet.eTargetEnemy.y - 15,
                                damage: damage,
                                timer: 60
                            });
                        }
                    }
                    pet.eState = 'movingBack';
                    pet.isMoving = true;
                    pet.currentSpeed = pet.eReturnSpeed;
                }
            } 
            else if (pet.eState === 'movingBack') {
                // 动态更新目标点为玩家前方
                let offsetX = player.facing === 1 ? 50 : -50;
                let targetX = player.x + player.w/2 - 16 + offsetX;
                let targetY = player.y + player.h/2 - 16;
                pet.moveTargetX = Math.min(Math.max(0, targetX), WORLD_W - 32);
                pet.moveTargetY = Math.min(Math.max(20, targetY), WORLD_H - 32);
                pet.isMoving = true;
                if (Math.hypot(pet.x - pet.moveTargetX, pet.y - pet.moveTargetY) < 5) {
                    pet.eState = 'idle';
                    pet.eTargetEnemy = null;
                    pet.attackCooldown = 180; // 3秒冷却
                    pet.isMoving = false;
                }
            }

            // 统一移动逻辑
            if (pet.isMoving) {
                let speed = pet.currentSpeed !== undefined ? pet.currentSpeed : pet.moveSpeed;
                let dx = pet.moveTargetX - pet.x;
                let dy = pet.moveTargetY - pet.y;
                let dist = Math.hypot(dx, dy);
                if (dist < speed) {
                    pet.x = pet.moveTargetX;
                    pet.y = pet.moveTargetY;
                    pet.isMoving = false;
                } else {
                    let stepX = (dx / dist) * speed;
                    let stepY = (dy / dist) * speed;
                    pet.x += stepX;
                    pet.y += stepY;
                }
                pet.x = Math.min(Math.max(0, pet.x), WORLD_W - 32);
                pet.y = Math.min(Math.max(20, pet.y), WORLD_H - 32);
            }
        },
        draw: (pet) => {
            let img = new Image();
            img.src = pet.icon;
            let px = pet.x - cameraX;
            let py = pet.y;
            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, px, py, 32, 32);
            } else {
                ctx.fillStyle = '#ffaa66';
                ctx.fillRect(px, py, 32, 32);
                ctx.fillStyle = '#fff';
                ctx.font = '12px monospace';
                ctx.fillText('小e', px + 4, py + 20);
            }
            if (pet.eState === 'waitingSlash' && pet.eTargetEnemy) {
                let slashImg = new Image();
                slashImg.src = '素材/宠物/其他/斩.png';
                let ex = pet.eTargetEnemy.x - cameraX;
                let ey = pet.eTargetEnemy.y;
                if (slashImg.complete && slashImg.naturalWidth > 0) {
                    ctx.drawImage(slashImg, ex, ey, pet.eTargetEnemy.w, pet.eTargetEnemy.h);
                } else {
                    ctx.fillStyle = 'rgba(255,0,0,0.5)';
                    ctx.fillRect(ex, ey, pet.eTargetEnemy.w, pet.eTargetEnemy.h);
                }
            }
        }
    }
};

// ---------- 通用宠物管理函数 ----------
function addPet(petType) {
    if (!PET_DEFS[petType]) return false;
    if (!window.ownedPets.includes(petType)) window.ownedPets.push(petType);
    if (activePets.some(p => p.type === petType)) {
        showInventoryMessage(`已有 ${PET_DEFS[petType].name} 在场`);
        return false;
    }
    let pet = new Pet(petType, PET_DEFS[petType]);
    if (petType === 'monkey') {
        pet.x = player.x + player.w/2 - 16;
        pet.y = player.y - 20;
    } else if (petType === 'point618') {
        pet.x = player.x + player.w/2 - 16;
        pet.y = player.y - 60;
    } else if (petType === 'horror') {
        pet.x = player.x + player.w/2 - 16 - 50;
        pet.y = player.y - 40;
    } else if (petType === 'xiaoe') {
        let offsetX = player.facing === 1 ? 50 : -50;
        pet.x = player.x + player.w/2 - 16 + offsetX;
        pet.y = player.y + player.h/2 - 16;
    } else {
        pet.x = player.x + player.w/2 - 16;
        pet.y = player.y - 40;
    }
    activePets.push(pet);
    showInventoryMessage(`召唤 ${pet.name}`);
    return true;
}

function removePet(petType) {
    let idx = activePets.findIndex(p => p.type === petType);
    if (idx !== -1) {
        let pet = activePets[idx];
        if (pet.resetSkillFunc) pet.resetSkillFunc(pet);
        activePets.splice(idx, 1);
        showInventoryMessage(`收回 ${PET_DEFS[petType].name}`);
        return true;
    }
    return false;
}

function updateAllPets(now) {
    for (let pet of activePets) {
        let def = PET_DEFS[pet.type];
        if (def.update) def.update(pet, now);
        if (pet.type === 'monkey' && pet.skillActive && pet.updateSkillMonkey) {
            pet.updateSkillMonkey(pet, now);
        } else if (pet.type === 'point618' && def.updateSkill) {
            def.updateSkill(pet, now);
        } else if (pet.skillActive && def.updateSkill) {
            def.updateSkill(pet, now);
        }
        if (pet.type === 'monkey' && pet.updateBlackholes) {
            pet.updateBlackholes(pet, now);
        }
    }
}

function drawAllPets() {
    for (let pet of activePets) {
        let def = PET_DEFS[pet.type];
        if (def.draw) def.draw(pet);
    }
}

function onPetKill(petType, enemyX, enemyY, enemyMaxHp) {
    if (petType === 'monkey') {
        let pet = activePets.find(p => p.type === 'monkey');
        if (pet && pet.onKill) pet.onKill(pet, enemyX, enemyY, enemyMaxHp);
    }
}

function onPetAbsorbBody(petType, enemyX, enemyY, enemyMaxHp) {
    if (petType === 'monkey') {
        let pet = activePets.find(p => p.type === 'monkey');
        if (pet && pet.absorbBody) pet.absorbBody(pet, enemyX, enemyY, enemyMaxHp);
    }
}

window.addPet = addPet;
window.removePet = removePet;
window.updateAllPets = updateAllPets;
window.drawAllPets = drawAllPets;
window.updatePet = updateAllPets;
window.drawPet = drawAllPets;
window.onPetKill = onPetKill;
window.onPetAbsorbBody = onPetAbsorbBody;
if (!window.ownedPets) window.ownedPets = [];