// ---------- 天赋树系统 ----------
const TALENTS = [
    { id: 0, name: '💪 Power Boost', description: 'Attack +10%', maxLevel: 3, costPerLevel: 1, effect: (level) => ({ attackMult: 1 + level * 0.1 }) },
    { id: 1, name: '🏃 Gale Step', description: 'Move Speed +15%', maxLevel: 2, costPerLevel: 1, effect: (level) => ({ speedMult: 1 + level * 0.15 }) },
    { id: 2, name: '❤️ Life Blessing', description: 'Max HP +20', maxLevel: 2, costPerLevel: 1, effect: (level) => ({ maxHpBonus: level * 20 }) },
    { id: 3, name: '🪽 Triple Jump', description: 'Unlock triple jump', maxLevel: 1, costPerLevel: 2, effect: (level) => ({ tripleJump: true }) }
];

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
    let attackMult = 1, speedMult = 1, maxHpBonus = 0, tripleJump = false;
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
    talentAttackMult = attackMult;
    talentSpeedMult = speedMult;
    talentMaxHpBonus = maxHpBonus;
    talentTripleJump = tripleJump;
    if (typeof updatePlayerMaxHp === 'function') updatePlayerMaxHp();
}

function drawTalentTree() {
    // 深色玻璃拟态背景（与原神风格面板基调统一）
    const g = ctx.createLinearGradient(0, 0, VIEW_W, VIEW_H);
    g.addColorStop(0, 'rgba(16,16,28,0.88)');
    g.addColorStop(1, 'rgba(8,8,16,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.strokeStyle = 'rgba(255,215,0,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, VIEW_W - 20, VIEW_H - 20);

    ctx.fillStyle = 'rgba(255,215,0,0.08)';
    ctx.fillRect(0, 0, VIEW_W, 60);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px "Segoe UI", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🌳 Talents', VIEW_W/2, 28);

    ctx.font = '14px "Segoe UI", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`Talent points: ${talentPoints}`, VIEW_W/2, 50);

    const startX = 24, startY = 80, cellW = 220, cellH = 88, gapX = 16, gapY = 14, cols = 3;

    for (let i = 0; i < TALENTS.length; i++) {
        const t = TALENTS[i];
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + col * (cellW + gapX);
        const y = startY + row * (cellH + gapY);
        const level = getTalentLevel(t.id);
        const isMaxed = level >= t.maxLevel;
        const canAfford = talentPoints >= t.costPerLevel && !isMaxed;

        ctx.fillStyle = level > 0 ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.roundRect(x, y, cellW, cellH, 12);
        ctx.fill();

        ctx.strokeStyle = level > 0 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, cellW, cellH, 12);
        ctx.stroke();

        ctx.fillStyle = level > 0 ? '#fff' : 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 14px "Segoe UI", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(t.name, x + 14, y + 26);

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px "Segoe UI", monospace';
        let desc = t.description;
        if (ctx.measureText(desc).width > cellW - 40) {
            while (ctx.measureText(desc + '…').width > cellW - 40 && desc.length > 0) {
                desc = desc.slice(0, -1);
            }
            desc += '…';
        }
        ctx.fillText(desc, x + 14, y + 50);

        const statusX = x + cellW - 12;
        if (isMaxed) {
            ctx.fillStyle = '#2ecc71';
            ctx.font = '11px "Segoe UI", monospace';
            ctx.textAlign = 'right';
            ctx.fillText('✓ Max', statusX, y + 74);
        } else if (canAfford) {
            ctx.fillStyle = '#ffd700';
            ctx.font = '11px "Segoe UI", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`Upgrade ${t.costPerLevel} pt`, statusX, y + 74);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '11px "Segoe UI", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`Lv.${level}/${t.maxLevel}`, statusX, y + 74);
        }

        const dotSize = 6, dotGap = 4;
        const dotStartX = x + 14;
        const dotY = y + cellH - 14;
        for (let d = 0; d < t.maxLevel; d++) {
            ctx.fillStyle = d < level ? '#ffd700' : 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.arc(dotStartX + d * (dotSize + dotGap), dotY, dotSize/2, 0, 2 * Math.PI);
            ctx.fill();
        }

        if (mouseLeftClicked) {
            const mx = mouseScreenX, my = mouseScreenY;
            if (mx > x && mx < x + cellW && my > y && my < y + cellH) {
                if (learnTalent(t.id)) {
                    showInventoryMessage(`Learned ${t.name}!`);
                } else {
                    showInventoryMessage(isMaxed ? 'Max level' : 'Not enough talent points');
                }
                mouseLeftClicked = false;
            }
        }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px "Segoe UI", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press Z to close', VIEW_W/2, VIEW_H - 16);
    ctx.textAlign = 'start';
}