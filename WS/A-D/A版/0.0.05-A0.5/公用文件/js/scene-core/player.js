// ---------- 玩家相关 ----------
function getAttackDamage() {
    const ch = getCurrentChar();
    let base = BASE_ATTACK_DAMAGE + (ch.level - 1) * 5;
    let damage = Math.floor(base * normalAttackMult * (talentAttackMult || 1) * ch.potionAtkMult);
    if (window.hasClownMask) {
        damage *= CLOWN_MASK_MULTIPLIER;
    }
    return damage;
}

function getSkillMultiplier() {
    const ch = getCurrentChar();
    let mult = (1 + (ch.level - 1) * 0.2) * skillDamageMult * ch.potionSkillMult;
    if (window.hasClownMask) {
        mult *= CLOWN_MASK_MULTIPLIER;
    }
    return mult;
}

function getBrickDamage() { return Math.floor(BASE_BRICK_DAMAGE * getSkillMultiplier()); }

function addKillReward(type, isSmall) {
    let goldGain = Math.floor(Math.random() * 5) + 1;
    gold += goldGain;
    if (typeof addGoldEarned === 'function') addGoldEarned(goldGain);
    // 击败敌人不再直接给 EXP：改为掉落经验物品（独立资源，不占背包格）
    let basic = 0, mid = 0;
    if (type === 'black') {
        if (Math.random() < 0.5) { basic = 3 + Math.floor(Math.random() * 2); }   // 3~4 基础经验
        else { mid = 1 + Math.floor(Math.random() * 2); }                          // 1~2 中等经验
    } else if (isSmall) {
        basic = 1 + Math.floor(Math.random() * 2);                                 // 1~2 基础经验
    } else {
        if (Math.random() < 0.5) { basic = 2 + Math.floor(Math.random() * 2); }   // 2~3 基础经验
        else { mid = 1; }                                                          // 1 中等经验
    }
    if (basic > 0) {
        basicExp += basic;
        showInventoryMessage(`✨ 获得 基础经验 x${basic}（+${basic * BASIC_EXP_VALUE} EXP）`);
    }
    if (mid > 0) {
        midExp += mid;
        showInventoryMessage(`💎 获得 中等经验 x${mid}（+${mid * MID_EXP_VALUE} EXP）`);
    }
}

// 使用经验物品：给当前激活角色加 EXP（基础/中等经验不占格子，一键使用）
function useExpItem(which) {
    const ch = getCurrentChar();
    if (which === 'basic') {
        if (basicExp <= 0) { showInventoryMessage('❌ 没有基础经验'); return false; }
        basicExp--;
        addExpToChar(ch.id, BASIC_EXP_VALUE);
        showInventoryMessage(`⚡ ${ch.name} 获得 ${BASIC_EXP_VALUE} EXP`);
    } else {
        if (midExp <= 0) { showInventoryMessage('❌ 没有中等经验'); return false; }
        midExp--;
        addExpToChar(ch.id, MID_EXP_VALUE);
        showInventoryMessage(`⚡ ${ch.name} 获得 ${MID_EXP_VALUE} EXP`);
    }
    return true;
}

function updateAttackAnimation(now) {
    if (player.attacking) {
        let elapsed = now - player.attackStart, prog = Math.min(elapsed / ATK_DUR, 1);
        let off = player.w * 0.5 * Math.sin(prog * Math.PI);
        player.visualOffX = player.facing * off;
        if (prog >= 1) { player.attacking = false; player.visualOffX = 0; }
    } else player.visualOffX = 0;
}