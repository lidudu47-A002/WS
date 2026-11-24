/* =====================================================================
 * scene-config.js —— 黑屋（Black room）场景配置
 * 优化清单第 10 条 / 第 19 条：单入口 game.html?scene=black 由
 * 公用文件/js/scene-boot.js 首先加载本文件，场景目录只保留
 * 「配置 + 差异化逻辑文件」，公共脚本统一放在 公用文件/js/scene-core。
 * 本文件必须保持为「纯配置 + 装饰数据」，不得依赖任何后续脚本。
 * ===================================================================== */

window.WS_SCENE_CONFIG = {
    id: 'black',
    title: '黑屋 · 从左到右',
    mapChunks: 20,               // 原 Black room.html 内联初始化：MAP_CHUNKS = 20
    saveMap: 'black',            // 存档 map 字段
    bgm: null,                   // 黑屋无专属 BGM（沿用公用文件 BGM 逻辑）
    finalRedirect: null,         // 黑屋无终局跳转（仅 prison 有）
    deco: { count: 10, color: '#ffaa00' },
    blackNaturalSpawn: false     // 黑屋禁止黑色敌人(black)自然生成
};

/* ---------- 场景判定工具（替代各脚本对 location.pathname 的硬判定） ---------- */
window.WS_isPrison = function () { return window.WS_SCENE_ID === 'prison'; };
/* 把「相对场景目录」的路径解析成绝对 URL：单入口下文档 URL 是根目录 game.html，
 * 直接用 location.href = '../公用文件/...' 会解析错层级，必须走本函数 */
window.WS_url = function (p) {
    try { return new URL(p, document.baseURI).href; } catch (e) { return p; }
};

/* ---------- 装饰（纯视觉）——原 Black room.html 内联脚本原样搬迁 ---------- */
var DECOS = [];
for (let i = 0; i < 10; i++) {
    let x = 100 + (i / 9) * (8000 - 200);
    DECOS.push({ x, y: 200 - 15, w: 12, h: 30, color: '#ffaa00' });
}
var prisonCells = []; // 黑屋无牢房
