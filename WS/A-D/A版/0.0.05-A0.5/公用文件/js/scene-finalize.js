/* =====================================================================
 * scene-finalize.js —— 场景初始化收尾（公用）
 * 优化清单第 19 条：原来两个 HTML 末尾各有一段几乎相同的内联初始化脚本
 * （MAP_CHUNKS / WORLD_W / genSpawnPoints / loadSaveStarImage / initFromURL /
 *   initTalents / initAchievements / applyTalentEffects / updatePlayerMaxHp / loop），
 * 现统一由本文件按 window.WS_SCENE_CONFIG 执行。
 *
 * 与原来的差异只有一处：prison 的「终局跳转森林」由配置 finalRedirect 驱动，
 * 黑屋未配置则跳过，等价于原逻辑。
 * ===================================================================== */

(function () {
    var cfg = window.WS_SCENE_CONFIG || {};

    /* 地图尺寸（constants.js 里是顶层 let，此处按原 HTML 的方式重新赋值） */
    MAP_CHUNKS = cfg.mapChunks || 20;
    WORLD_W = MAP_CHUNKS * CHUNK_SIZE;
    genSpawnPoints();

    loadSaveStarImage();
    initFromURL();

    /* 终局跳转（原 prison.html 内联脚本逻辑）：boss 已击败则离场，不再进本场景 */
    if (cfg.finalRedirect && window.bossDefeated === true) {
        window.hasManualSave = true;   // 终局跳转前放行，避免 beforeunload 拦截弹窗
        window.location.replace(window.WS_url(cfg.finalRedirect));
        throw new Error('跳转至森林');
    }

    if (typeof initTalents === 'function') initTalents(learnedTalents, talentPoints);
    if (typeof initAchievements === 'function') initAchievements(achievementsUnlocked, totalGoldEarned, bossDefeated);
    if (typeof applyTalentEffects === 'function') applyTalentEffects();
    if (typeof updatePlayerMaxHp === 'function') updatePlayerMaxHp();
    requestAnimationFrame(loop);
})();
