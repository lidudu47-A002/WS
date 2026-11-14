// ---------- 玩家相关 ----------
function getAttackDamage() {
    let base = BASE_ATTACK_DAMAGE + (level - 1) * 5;
    let damage = Math.floor(base * normalAttackMult * (talentAttackMult || 1));
    // 小丑面具 ×4
    if (window.hasClownMask) {
        damage *= CLOWN_MASK_MULTIPLIER;
    }
    return damage;
}

function getSkillMultiplier() {
    let mult = (1 + (level - 1) * 0.2) * skillDamageMult;
    if (window.hasClownMask) {
        mult *= CLOWN_MASK_MULTIPLIER;
    }
    return mult;
}

function getBrickDamage() { return Math.floor(BASE_BRICK_DAMAGE * getSkillMultiplier()); }
function getPiercePassDamage() { return Math.floor(BASE_PIERCE_PASS * getSkillMultiplier()); }
function getPierceFinalAdd() { return Math.floor(BASE_PIERCE_FINAL_ADD * getSkillMultiplier()); }

function performAttack() {
    if (typeof performWeaponAttack === 'function') {
        performWeaponAttack();
    } else {
        // 降级：徒手攻击
        let attackDamage = getAttackDamage();
        let rect = { x: player.facing===1 ? player.x+player.w : player.x-ATK_RANGE, y: player.y, w: ATK_RANGE, h: player.h };
        for (let e of enemies) {
            if (rectCollide(rect, e)) { e.hp -= attackDamage; e.stun = STUN_DUR; e.hitFlash = 5; }
        }
        if (boss && rectCollide(rect, boss)) boss.hp -= attackDamage;
        player.attacking = true;
        player.attackStart = performance.now();
    }
}

function addKillReward() {
    let goldGain = Math.floor(Math.random() * 5) + 1;
    gold += goldGain;
    if (typeof addGoldEarned === 'function') addGoldEarned(goldGain);
    exp += Math.floor(Math.random() * 5) + 1;
    while (exp >= EXP_PER_LV) { exp -= EXP_PER_LV; level++; if (typeof checkAchievements === 'function') checkAchievements(); }
    if (panelVisible) updatePanelUI();
}

function updatePlayerMovement() {
    if (left && !right) player.facing = -1;
    else if (right && !left) player.facing = 1;
    let baseSpeed = 2.8;
    let speed = baseSpeed * (talentSpeedMult || 1);
    // 小丑面具 ×4
    if (window.hasClownMask) {
        speed *= CLOWN_MASK_MULTIPLIER;
    }
    let dx = 0;
    if (left) dx -= speed;
    if (right) dx += speed;
    player.x = Math.min(Math.max(0, player.x + dx), WORLD_W - player.w);
    player.vy += GRAVITY;
    player.y += player.vy;
    let grounded = false;
    if (player.y > getGroundY()) { player.y = getGroundY(); player.vy = 0; grounded = true; }
    if (player.y < 0) { player.y = 0; player.vy = 0; }
    if (grounded || player.y >= getGroundY()-0.001) {
        jumpUsed = false;
        player.jumpsLeft = talentTripleJump ? 3 : 2;
    }
    let duck = shiftDown || arrowDown;
    let targetH = (grounded && duck) ? DUCK_H : STAND_H;
    if (targetH !== player.h) {
        let oldBottom = player.y + player.h;
        player.h = targetH;
        if (grounded) player.y = getGroundY();
        else player.y = oldBottom - player.h;
    }
}

function updateAttackAnimation(now) {
    if (player.attacking) {
        let elapsed = now - player.attackStart, prog = Math.min(elapsed / ATK_DUR, 1);
        let off = player.w * 0.5 * Math.sin(prog * Math.PI);
        player.visualOffX = player.facing * off;
        if (prog >= 1) { player.attacking = false; player.visualOffX = 0; }
    } else player.visualOffX = 0;
}