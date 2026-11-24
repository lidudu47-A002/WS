/* =====================================================================
 * scene-config.js —— 监狱（prison）场景配置
 * 优化清单第 10 条 / 第 19 条：单入口 game.html?scene=prison 由
 * 公用文件/js/scene-boot.js 首先加载本文件，场景目录只保留
 * 「配置 + 差异化逻辑文件」，公共脚本统一放在 公用文件/js/scene-core。
 * 本文件必须保持为「纯配置 + 装饰数据」，不得依赖任何后续脚本。
 * ===================================================================== */

window.WS_SCENE_CONFIG = {
    id: 'prison',
    title: '监狱 · 从左到右',
    mapChunks: 15,                              // 原 prison.html 内联初始化：MAP_CHUNKS = 15
    saveMap: 'prison',                          // 存档 map 字段
    bgm: '../音乐/prison/Chains in Step.mp3',   // 场景 BGM（登记用，播放仍由原逻辑负责）
    finalRedirect: '../forest/index.html',      // 终局跳转：bossDefeated 时离场
    deco: { cells: 15, cellW: 380, cellH: 300, gap: 20 },
    blackNaturalSpawn: true      // 监狱允许黑色敌人(black)自然生成
};

/* ---------- 场景判定工具（替代各脚本对 location.pathname 的硬判定） ---------- */
window.WS_isPrison = function () { return window.WS_SCENE_ID === 'prison'; };
window.WS_url = function (p) {
    try { return new URL(p, document.baseURI).href; } catch (e) { return p; }
};

/* ---------- 牢房背景数据——原 prison.html 内联脚本原样搬迁 ---------- */
/* 旧 prison.html 未定义 DECOS（黑屋专属装饰），此处同样不定义，
 * 使 typeof DECOS 仍为 'undefined'，与旧版完全一致 */
var prisonCells = [];
var CELL_W = 380, CELL_H = 300, GAP = 20;
for (let i = 0; i < 15; i++) {
    let x = i * 400 + 10;
    let y = 40 + Math.sin(i * 0.8) * 30;
    prisonCells.push({ x: x, y: y, width: CELL_W, height: CELL_H });
}
