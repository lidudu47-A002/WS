// ---------- 成就系统 ----------
const ACHIEVEMENTS = [
    { id: 0, name: '初次杀敌', description: '击败第一个敌人', condition: () => killCount >= 1, reward: 1 },
    { id: 1, name: '百人斩', description: '击败100个敌人', condition: () => killCount >= 100, reward: 1 },
    { id: 2, name: '等级提升', description: '等级达到5级', condition: () => level >= 5, reward: 1 },
    { id: 3, name: '等级大师', description: '等级达到10级', condition: () => level >= 10, reward: 2 },
    { id: 4, name: '财源滚滚', description: '累计获得1000金币', condition: () => totalGoldEarned >= 1000, reward: 1 },
    { id: 5, name: 'BOSS终结者', description: '击败BOSS', condition: () => bossDefeated, reward: 2 }
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
            showInventoryMessage(`🏆 成就解锁：${ach.name}！ +${ach.reward} 天赋点`);
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
    ctx.fillText('🏅 成就', VIEW_W/2, 28);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '13px "Segoe UI", monospace';
    ctx.fillText(`已解锁 ${achievementsUnlocked.length}/${ACHIEVEMENTS.length}`, VIEW_W/2, 48);

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
        ctx.fillText(`+${ach.reward} 天赋点`, VIEW_W - 28, y + 14);

        ctx.fillStyle = unlocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
        ctx.font = '11px "Segoe UI", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(ach.description, VIEW_W - 28, y + 32);
        ctx.textAlign = 'start';
    }

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px "Segoe UI", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('按 X 关闭', VIEW_W/2, VIEW_H - 16);
    ctx.textAlign = 'start';
}