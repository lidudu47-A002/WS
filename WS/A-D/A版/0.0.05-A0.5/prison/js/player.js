// ---------- 玩家相关 ----------
function getAttackDamage() {
    const ch = getCurrentChar();
    let base = BASE_ATTACK_DAMAGE + (ch.level - 1) * 5;
    let damage = Math.floor(base * normalAttackMult * (talentAttackMult || 1) * ch.potionAtkMult);
    // 小丑面具 ×4
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
    // 不再直接给 EXP，改为掉落经验物品（独立资源，不占背包格）
    let hint = '';
    if (type === 'black') {
        if (Math.random() < 0.5) {
            let n = 3 + Math.floor(Math.random() * 2);   // 3~4 基础
            basicExp += n;
            hint = `获得 ${n} 个基础经验`;
        } else {
            let n = 1 + Math.floor(Math.random() * 2);   // 1~2 中等
            midExp += n;
            hint = `获得 ${n} 个中等经验`;
        }
    } else if (isSmall) {
        let n = 1 + Math.floor(Math.random() * 2);       // 1~2 基础
        basicExp += n;
        hint = `获得 ${n} 个基础经验`;
    } else {
        // 普通 block
        if (Math.random() < 0.5) {
            let n = 2 + Math.floor(Math.random() * 2);   // 2~3 基础
            basicExp += n;
            hint = `获得 ${n} 个基础经验`;
        } else {
            midExp += 1;                                 // 1 中等
            hint = '获得 1 个中等经验';
        }
    }
    let goldGain = Math.floor(Math.random() * 5) + 1;
    gold += goldGain;
    if (typeof addGoldEarned === 'function') addGoldEarned(goldGain);
    if (typeof showInventoryMessage === 'function') showInventoryMessage(hint);
}

// 使用经验物品：给当前激活角色加经验
function useExpItem(which) {
    if (which === 'basic') {
        if (basicExp <= 0) { showInventoryMessage('没有基础经验物品'); return false; }
        basicExp--;
        addExpToChar(currentCharacter, BASIC_EXP_VALUE);
        showInventoryMessage(`使用基础经验 +${BASIC_EXP_VALUE} EXP`);
        return true;
    }
    if (which === 'mid') {
        if (midExp <= 0) { showInventoryMessage('没有中等经验物品'); return false; }
        midExp--;
        addExpToChar(currentCharacter, MID_EXP_VALUE);
        showInventoryMessage(`使用中等经验 +${MID_EXP_VALUE} EXP`);
        return true;
    }
    return false;
}

function updateAttackAnimation(now) {
    if (player.attacking) {
        let elapsed = now - player.attackStart, prog = Math.min(elapsed / ATK_DUR, 1);
        let off = player.w * 0.5 * Math.sin(prog * Math.PI);
        player.visualOffX = player.facing * off;
        if (prog >= 1) { player.attacking = false; player.visualOffX = 0; }
    } else player.visualOffX = 0;
}