/* =====================================================================
 * script-manifest.js —— 场景脚本清单（单入口）
 * 优化清单第 19 条：Black room / prison 两个 HTML 各手写 25 个 <script>
 * 改为一份清单，由 公用文件/js/scene-boot.js 按此顺序用 document.write 注入。
 *
 * 路径占位符：
 *   {scene} → 当前场景目录（文档 baseURI 所在目录，即 '.'）
 *   {core}  → 公用文件/js/scene-core（两场景完全一致的公共层）
 *
 * ⚠️ 顺序即依赖顺序，不可随意调整（全项目为传统 <script> 全局脚本）：
 *    scene-config.js 必须最先（提供 DECOS / prisonCells，constants.js 依赖）
 *    constants.js → player.js → enemy.js → ... → game-loop.js
 *    scene-finalize.js 必须最后（初始化收尾）
 * ===================================================================== */

window.WS_SCRIPT_MANIFEST = [
    '{scene}/js/scene-config.js',        // 场景配置 + 装饰数据（须最先）

    '../公用文件/js/storage-keys.js',
    '../公用文件/js/toast.js',
    '../公用文件/js/image-helper.js',

    '{core}/constants.js',
    '{core}/player.js',
    '{core}/enemy.js',
    '../公用文件/js/dot.js',
    '../公用文件/js/combat.js',

    '{core}/ui-display.js',              // 公共层（两场景字节一致）

    '../公用文件/js/inventory.js',
    '../公用文件/js/talent.js',
    '../公用文件/js/achievement.js',

    '{core}/game-state.js',
    '{core}/shop-system.js',             // 公共层（两场景字节一致）

    '../公用文件/js/weapons.js',

    '{core}/pet.js',
    '{core}/pet-ui.js',

    '../公用文件/js/console-ui.js',
    '../公用文件/js/console-hijack.js',
    '../公用文件/js/gacha-panel.js',
    '../公用文件/js/command-system.js',
    '../公用文件/js/render-scene.js',
    '../公用文件/js/render.js',

    '{core}/game-loop.js',

    '../公用文件/js/scene-finalize.js'   // 初始化收尾（须最后）
];
