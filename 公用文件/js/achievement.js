// ---------- 成就系统 ----------
const ACHIEVEMENTS = [
    { id: 0, name: 'First Blood', description: 'Defeat your first enemy', condition: () => killCount >= 1, reward: 1 },
    { id: 1, name: 'Century Slayer', description: 'Defeat 100 enemies', condition: () => killCount >= 100, reward: 1 },
    { id: 2, name: 'Level Up', description: 'Reach level 5', condition: () => level >= 5, reward: 1 },
    { id: 3, name: 'Level Master', description: 'Reach level 10', condition: () => level >= 10, reward: 2 },
    { id: 4, name: 'Rolling in Gold', description: 'Earn 1000 gold in total', condition: () => totalGoldEarned >= 1000, reward: 1 },
    { id: 5, name: 'Boss Terminator', description: 'Defeat a boss', condition: () => bossDefeated, reward: 2 }
];

function initAchievements(savedUnlocked, savedTotalGold, savedBossDefeated) {
    if (savedUnlocked) achievementsUnlocked = savedUnlocked;
    else achievementsUnlocked = [];
    if (savedTotalGold !== undefined) totalGoldEarned = savedTotalGold;
    if (savedBossDefeated !== undefined) bossDefeated = savedBossDefeated;
}

function checkAchievements() {
    let newUnlock = false;
    for (const ach of ACHIEVEMENTS) {
        if (!achievementsUnlocked.includes(ach.id) && ach.condition()) {
            achievementsUnlocked.push(ach.id);
            talentPoints += ach.reward;
            newUnlock = true;
            showInventoryMessage(`🏆 Achievement unlocked: ${ach.name}! +${ach.reward} talent points`);
        }
    }
    if (newUnlock) {
        applyTalentEffects();
        if (panelVisible) updatePanelUI();
    }
}

function addGoldEarned(amount) {
    totalGoldEarned += amount;
    checkAchievements();
}

function drawAchievements() {
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
    ctx.fillRect(0, 0, VIEW_W, 56);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px "Segoe UI", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🏅 Achievements', VIEW_W/2, 28);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '13px "Segoe UI", monospace';
    ctx.fillText(`Unlocked ${achievementsUnlocked.length}/${ACHIEVEMENTS.length}`, VIEW_W/2, 48);

    const startX = 28, startY = 76, lineH = 40;
    const maxLines = Math.floor((VIEW_H - 120) / lineH);

    for (let i = 0; i < Math.min(ACHIEVEMENTS.length, maxLines); i++) {
        const ach = ACHIEVEMENTS[i];
        const unlocked = achievementsUnlocked.includes(ach.id);
        const y = startY + i * lineH;

        if (unlocked) {
            ctx.fillStyle = 'rgba(46,204,113,0.08)';
            ctx.beginPath();
            ctx.roundRect(startX - 8, y - 6, VIEW_W - startX * 2 + 16, lineH - 2, 6);
            ctx.fill();
        }

        ctx.fillStyle = unlocked ? '#2ecc71' : 'rgba(255,255,255,0.15)';
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(unlocked ? '✔' : '○', startX, y + 14);

        ctx.fillStyle = unlocked ? '#fff' : 'rgba(255,255,255,0.35)';
        ctx.font = '13px "Segoe UI", monospace';
        ctx.fillText(ach.name, startX + 28, y + 14);

        ctx.fillStyle = unlocked ? '#ffd700' : 'rgba(255,255,255,0.15)';
        ctx.font = '12px "Segoe UI", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`+${ach.reward} talent points`, VIEW_W - 28, y + 14);

        ctx.fillStyle = unlocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
        ctx.font = '11px "Segoe UI", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(ach.description, VIEW_W - 28, y + 32);
        ctx.textAlign = 'start';
    }

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px "Segoe UI", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press X to close', VIEW_W/2, VIEW_H - 16);
    ctx.textAlign = 'start';
}