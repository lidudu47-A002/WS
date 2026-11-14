// ---------- 成就系统 ----------
const ACHIEVEMENTS = [
    { id: 0, name: '初次杀敌', description: '击败第一个敌人', condition: () => killCount >= 1, reward: 1 },
    { id: 1, name: '百人斩', description: '击败100个敌人', condition: () => killCount >= 100, reward: 1 },
    { id: 2, name: '等级提升', description: '等级达到5级', condition: () => level >= 5, reward: 1 },
    { id: 3, name: '等级大师', description: '等级达到10级', condition: () => level >= 10, reward: 2 },
    { id: 4, name: '财源滚滚', description: '累计获得1000金币', condition: () => totalGoldEarned >= 1000, reward: 1 },
    { id: 5, name: 'BOSS终结者', description: '击败BOSS', condition: () => bossDefeated, reward: 2 }
];

// 注意：achievementsUnlocked, totalGoldEarned, bossDefeated 已在 constants.js 中定义

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

function setBossDefeated() {
    if (!bossDefeated) {
        bossDefeated = true;
        checkAchievements();
    }
}

function drawAchievements() {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🏅 成就系统', VIEW_W/2, 40);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`已解锁: ${achievementsUnlocked.length}/${ACHIEVEMENTS.length}`, VIEW_W/2, 80);
    
    const startX = 40;
    const startY = 110;
    const lineH = 35;
    const maxLines = Math.floor((VIEW_H - 150) / lineH);
    for (let i = 0; i < Math.min(ACHIEVEMENTS.length, maxLines); i++) {
        const ach = ACHIEVEMENTS[i];
        const unlocked = achievementsUnlocked.includes(ach.id);
        const y = startY + i * lineH;
        ctx.fillStyle = unlocked ? '#44ff44' : '#888';
        ctx.font = '14px monospace';
        ctx.fillText(unlocked ? '✔' : '✘', startX, y + 12);
        ctx.fillStyle = unlocked ? '#fff' : '#aaa';
        ctx.fillText(ach.name, startX + 25, y + 12);
        ctx.fillStyle = '#ffaa00';
        ctx.fillText(`+${ach.reward}`, startX + 250, y + 12);
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        ctx.fillText(ach.description, startX + 320, y + 12);
    }
    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('按 X 关闭', VIEW_W/2, VIEW_H - 20);
}