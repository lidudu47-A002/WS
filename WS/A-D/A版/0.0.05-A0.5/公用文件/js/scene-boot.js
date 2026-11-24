/* =====================================================================
 * scene-boot.js —— 单入口引导器
 * 优化清单第 19 条：读取 game.html?scene=black|prison，
 * 按 公用文件/js/script-manifest.js 的清单顺序注入全部场景脚本。
 *
 * 关键设计：
 *  1) game.html 的 <head> 内联脚本已把 <base href="场景目录/"> 写好，
 *     因此本文件内所有路径都相对「场景目录」，与原两套 HTML 语义一致
 *     （脚本里 ../公用文件/... 的写法无需改动）。
 *  2) 用 document.write 在解析期同步注入 <script>，保证传统全局脚本的
 *     加载与执行顺序完全等于原 HTML 的手写顺序，不引入 async 竞争。
 *  3) 本文件自身不读 WS_SCENE_CONFIG —— document.write 写入的脚本要等
 *     本脚本执行结束后才执行；配置读取统一放到最后的 scene-finalize.js。
 * ===================================================================== */

(function () {
    var SCENE_PATH = {
        '{scene}': '.',                             // 场景目录 = 文档 baseURI
        '{core}': '../公用文件/js/scene-core'       // 公共层（两场景字节一致）
    };

    var list = window.WS_SCRIPT_MANIFEST || [];
    if (!list.length) {
        console.error('[scene-boot] 脚本清单 script-manifest.js 未加载，场景无法启动');
        return;
    }

    var out = [];
    for (var i = 0; i < list.length; i++) {
        var src = list[i];
        for (var key in SCENE_PATH) {
            if (src.indexOf(key) !== -1) src = src.split(key).join(SCENE_PATH[key]);
        }
        out.push('<script src="' + src + '"><' + '/script>');
    }

    document.write(out.join('\n'));
})();
