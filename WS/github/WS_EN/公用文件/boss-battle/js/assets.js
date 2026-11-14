// ============================================================
//  assets.js — 像素素材加载
//    场景专属素材：boss-battle/black room/assets/  或  boss-battle/prison/assets/
//    两场景共用素材：boss-battle/assets/
//  均可由 pixel-paint.html 通过 assets/source/*.json 重新编辑
// ============================================================

const Assets = (function () {
    const SCENE_DIR = (function () {
        try {
            const s = String(window.__SCENE__ ||
                new URLSearchParams(window.location.search).get('scene') ||
                'blackroom').toLowerCase();
            return s === 'prison' ? 'prison' : 'black room';
        } catch (e) { return 'black room'; }
    })();

    // 场景专属目录：页面位于 boss-battle/<场景>/index.html，故为 ./assets/
    const BT = 'assets/';
    // 两场景共用素材：上一级的 boss-battle/assets/
    const CM = '../assets/';

    const MAP = {
        // ---- 场景专属：地板 / 墙三面 / Boss ----
        floor: BT + 'floor.png',
        floor_dark: BT + 'floor_dark.png',
        floor_glow: BT + 'floor_glow.png',
        wall_top: BT + 'wall_top.png',
        wall_face: BT + 'wall_face.png',
        wall_side: BT + 'wall_side.png',
        boss: BT + 'boss.png',
        wall: BT + 'wall_top.png',      // 兼容旧引用

        // ---- 共用：实体与特效 ----
        soul_red: CM + 'soul_red.png',
        soul_yellow: CM + 'soul_yellow.png',
        soul_blue: CM + 'soul_blue.png',
        player: CM + 'player.png',
        orb: CM + 'orb.png',
        orb_blue: CM + 'orb_blue.png',
        bone: CM + 'bone.png',
        blaster: CM + 'blaster.png',
        crystal: CM + 'crystal.png'
    };

    const store = {};
    let total = 0;
    let loaded = 0;
    let readyCb = null;

    function init(cb) {
        readyCb = cb;
        const keys = Object.keys(MAP);
        total = keys.length;
        keys.forEach(function (k) {
            const img = new Image();
            img.onload = function () {
                store[k] = img;
                tick();
            };
            img.onerror = function () {
                console.warn('[BOSS] Asset load failed:', MAP[k]);
                tick();
            };
            img.src = MAP[k];
        });
    }

    function tick() {
        loaded++;
        if (loaded >= total && readyCb) readyCb();
    }

    function get(name) { return store[name] || null; }

    function isReady() { return loaded >= total; }

    return { init, get, isReady };
})();
