// ---------- 天赋树系统 ----------
const TALENTS = [
    { id: 0, name: '💪 力量强化', description: '攻击力 +10%', maxLevel: 3, costPerLevel: 1, effect: (level) => ({ attackMult: 1 + level * 0.1 }) },
    { id: 1, name: '🏃 疾风步', description: '移动速度 +15%', maxLevel: 2, costPerLevel: 1, effect: (level) => ({ speedMult: 1 + level * 0.15 }) },
    { id: 2, name: '❤️ 生命祝福', description: '最大生命值 +20', maxLevel: 2, costPerLevel: 1, effect: (level) => ({ maxHpBonus: level * 20 }) },
    { id: 3, name: '🪽 三段跳', description: '解锁三段跳', maxLevel: 1, costPerLevel: 2, effect: (level) => ({ tripleJump: true }) }
];

// 注意：talentPoints, learnedTalents 已在 constants.js 中定义，此处不再重复声明
function initTalents(savedTalents, savedPoints) {
    if (savedTalents) learnedTalents = savedTalents;
    else learnedTalents = TALENTS.map(t => ({ id: t.id, level: 0 }));
    if (savedPoints !== undefined) talentPoints = savedPoints;
    applyTalentEffects();
}

function getTalentLevel(id) {
    const t = learnedTalents.find(t => t.id === id);
    return t ? t.level : 0;
}

function learnTalent(id) {
    const talent = TALENTS.find(t => t.id === id);
    if (!talent) return false;
    const current = getTalentLevel(id);
    if (current >= talent.maxLevel) return false;
    const cost = talent.costPerLevel;
    if (talentPoints < cost) return false;
    talentPoints -= cost;
    const idx = learnedTalents.findIndex(t => t.id === id);
    if (idx !== -1) learnedTalents[idx].level++;
    else learnedTalents.push({ id, level: 1 });
    applyTalentEffects();
    return true;
}

function applyTalentEffects() {
    let attackMult = 1;
    let speedMult = 1;
    let maxHpBonus = 0;
    let tripleJump = false;
    for (const t of learnedTalents) {
        const talent = TALENTS.find(tl => tl.id === t.id);
        if (talent && t.level > 0) {
            const eff = talent.effect(t.level);
            if (eff.attackMult) attackMult *= eff.attackMult;
            if (eff.speedMult) speedMult *= eff.speedMult;
            if (eff.maxHpBonus) maxHpBonus += eff.maxHpBonus;
            if (eff.tripleJump) tripleJump = true;
        }
    }
    window.talentAttackMult = attackMult;
    window.talentSpeedMult = speedMult;
    window.talentMaxHpBonus = maxHpBonus;
    window.talentTripleJump = tripleJump;
    if (typeof updatePlayerMaxHp === 'function') updatePlayerMaxHp();
}

function drawTalentTree() {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    
    const startX = 20;
    const startY = 60;
    const cellW = 240;
    const cellH = 100;
    const cols = 2;
    
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🌳 天赋树', VIEW_W/2, 40);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`可用天赋点: ${talentPoints}`, VIEW_W/2, 80);
    
    for (let i = 0; i < TALENTS.length; i++) {
        const t = TALENTS[i];
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + col * (cellW + 20);
        const y = startY + row * (cellH + 20);
        const level = getTalentLevel(t.id);
        
        ctx.fillStyle = level > 0 ? 'rgba(50,50,80,0.7)' : 'rgba(30,30,40,0.7)';
        ctx.fillRect(x, y, cellW, cellH);
        ctx.strokeStyle = '#888';
        ctx.strokeRect(x, y, cellW, cellH);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(t.name, x + 10, y + 25);
        
        ctx.font = '12px monospace';
        ctx.fillStyle = '#aaa';
        let desc = t.description;
        if (ctx.measureText(desc).width > cellW - 20) {
            while (ctx.measureText(desc + '…').width > cellW - 20 && desc.length > 0) {
                desc = desc.slice(0, -1);
            }
            desc += '…';
        }
        ctx.fillText(desc, x + 10, y + 48);
        
        ctx.fillStyle = '#ffaa00';
        ctx.fillText(`等级 ${level}/${t.maxLevel}`, x + 10, y + 75);
        if (level < t.maxLevel) {
            ctx.fillStyle = '#44ff44';
            ctx.fillText(`消耗 ${t.costPerLevel} 点`, x + cellW - 70, y + 75);
        } else {
            ctx.fillStyle = '#ff4444';
            ctx.fillText('已满级', x + cellW - 60, y + 75);
        }
        
        if (mouseLeftClicked) {
            const mx = mouseScreenX, my = mouseScreenY;
            if (mx > x && mx < x + cellW && my > y && my < y + cellH) {
                if (learnTalent(t.id)) {
                    showInventoryMessage(`学习了 ${t.name}！`);
                } else {
                    showInventoryMessage('天赋点不足或已达上限');
                }
                mouseLeftClicked = false;
            }
        }
    }
    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('按 Z 关闭', VIEW_W/2, VIEW_H - 20);
}