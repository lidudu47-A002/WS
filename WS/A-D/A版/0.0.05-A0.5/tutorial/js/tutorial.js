// ============ 新手教程 · 交互与迷你演示 ============
(function () {
    'use strict';

    // ---------- 步骤内容 ----------
    var STEPS = [
        {
            chapter: '第一章 · 基础操作',
            adv: false,
            scene: 0,
            title: '你是一块白色方块',
            desc: '在这片黑色世界里，你能做的唯一正确的事就是向右走 —— 一路闯过 20 个区块，把挡路的东西全部打碎。',
            caption: '黑屋 · 起点',
            keys: [],
            points: [
                '每一局都从「黑屋」开始，向右就是前进的方向',
                '左下角那个会发光的白色方块就是你',
                '教程共两章：第一章操作基础，第二章指令台 / 商店 / 宠物'
            ]
        },
        {
            chapter: '第一章 · 基础操作',
            adv: false,
            scene: 1,
            title: '先学会跑起来',
            desc: '移动是活下来的前提。敌人会从两侧压过来，跳起和下蹲能躲掉绝大多数攻击。',
            caption: '移动与跳跃',
            keys: ['A', 'D', '←', '→', 'Space', 'Shift', '↓'],
            points: [
                'A / D 或 ← / → 左右移动',
                'Space 跳跃，腾空时还能再跳一次（二段跳）',
                '按住 Shift 或 ↓ 下蹲，可穿过低矮通道、避开飞来的方块'
            ]
        },
        {
            chapter: '第一章 · 基础操作',
            adv: false,
            scene: 2,
            title: '鼠标决定你怎么打',
            desc: '所有攻击都朝着你面朝的方向出手。近战负责贴脸，砖块负责隔空拆人。',
            caption: '近战挥砍 · 蓄力砖块',
            keys: ['鼠标左键', '鼠标右键'],
            points: [
                '左键近战挥砍；挥空时若前方 20~150 像素内有敌人，会自动突进追击并补一刀',
                '右键蓄力后松手投掷砖块，基础伤害 50，远高于普攻的 10',
                '砖块冷却 5 秒，留着招呼血厚的敌人'
            ]
        },
        {
            chapter: '第一章 · 基础操作',
            adv: false,
            scene: 3,
            title: '金币与经验',
            desc: '击杀敌人不会直接给你经验，而是掉落经验物品 —— 捡到不等于用到，得手动吃。',
            caption: '战利品结算',
            keys: ['P', 'Q', 'R'],
            points: [
                '每击杀一个敌人都会掉落金币，以及基础经验 / 中等经验',
                '按 P 打开角色面板后：Q 使用基础经验（50 EXP），R 使用中等经验（100 EXP）',
                '升级提升攻击力与技能倍率，等级上限 50'
            ]
        },
        {
            chapter: '第一章 · 基础操作',
            adv: false,
            scene: 4,
            title: '常用面板与快捷键',
            desc: '这些键位构成了你的整个操作台，先记住最高频的几个。',
            caption: '状态面板与背包',
            keys: ['F', 'E', '1-9'],
            points: [
                '按住 F 查看角色状态（等级、金币、区块、攻击力），松开自动关闭',
                'E 打开背包：拖拽装备上身，数字键 1~9 使用快捷栏物品',
                'Shift + 1~4 依次卸下小丑面具 / 十字架 / 武器 / 神父服'
            ]
        },
        {
            chapter: '第一章 · 基础操作',
            adv: false,
            scene: 6,
            title: '存档点决定你能复活几次',
            desc: '走过发光的星标区域就会自动存档。这是你唯一的保险。',
            caption: '存档点 · 自动保存',
            keys: ['S', 'L'],
            points: [
                '踩进存档点星标范围即自动保存，阵亡后会从最近的存档点复活',
                '没有经过任何存档点时阵亡，这一局就直接结束',
                'S 导出存档文件，L 读取存档；游客模式下两者都不可用'
            ]
        },
        {
            chapter: '第一章 · 基础操作',
            adv: false,
            scene: 14,
            title: '天赋与成就',
            desc: '变强的两条长线：天赋点用来点属性，成就负责发天赋点。',
            caption: '天赋 · 成就',
            keys: ['Z', 'X'],
            points: [
                'Z 打开天赋面板：攻击、移速、生命，以及需要点满前置才能解锁的三段跳',
                'X 查看成就；达成成就会发放天赋点，是天赋点的唯一来源',
                '第一章到此结束。下一章开始讲能改规则的那套东西'
            ]
        },
        {
            chapter: '第二章 · 进阶系统',
            adv: true,
            scene: 9,
            title: '第二章：进阶三件套',
            desc: '指令台、商店、宠物 —— 正篇里最省时间的三套系统，一次讲清。',
            caption: '进阶系统总览',
            keys: ['T', 'H', 'R', 'V'],
            points: [
                '指令台 T：不只是作弊码，交付贴图、刷怪开关、传送都在这里',
                '商店 H 与抽卡 R：金币的两条花法，一条买命，一条赌运气',
                '宠物 V：抽出来的宠物、攒下的材料都收在这个面板里'
            ]
        },
        {
            chapter: '第二章 · 进阶系统',
            adv: true,
            scene: 10,
            title: '指令台：先学会它的语法',
            desc: '输入框自带 / 前缀，指令按「动词 + 参数」排列，和说话一样有顺序。',
            caption: '指令台 · 基础语法',
            keys: ['T', 'Tab', 'Enter', 'Esc'],
            points: [
                'T 开关指令台；Tab 循环补全候选，Enter 执行，Esc 关闭',
                'st summon 切换敌人自然生成开关，卡关或缺材料时可以关掉刷怪',
                'bm 3 传送到第 3 区块（0~19）；kill 清掉场上所有敌人',
                'tune LV = 10 直接把等级设为 10，等级上限 50'
            ]
        },
        {
            chapter: '第二章 · 进阶系统',
            adv: true,
            scene: 7,
            title: 'give 与 image：拿东西、换长相',
            desc: 'give 负责把物品塞进你的背包，image 负责把武器的贴图换成别人的。',
            caption: 'give · image',
            keys: ['T', 'give', 'image'],
            points: [
                'give 100 coin 给金币，单次上限 2000；give 同样能给经验物品',
                'give sword / fb / fs / sd / th / cb / bh / ts 直接发武器',
                'give monkey / 0.618 / horror / en 直接获得对应宠物',
                'image 铁剑 = 冰霜之刃 替换贴图；image reset 还原全部外观'
            ]
        },
        {
            chapter: '第二章 · 进阶系统',
            adv: true,
            scene: 11,
            title: 'summon 与 ~~~ 自定义',
            desc: 'summon 是造敌人的指令，第三个数字是区块，~~~ 之后是给敌人加的自定义参数。',
            caption: 'summon · 自定义敌人',
            keys: ['T', 'summon', '~~~'],
            points: [
                'summon 5 block 生成 5 只 block 类敌人；summon 3 black 生成黑色敌人',
                'summon 2 block 7 表示在第 7 区块生成 2 只，省略则默认当前区块',
                'summon 1 black ~~~ HP=6~fb 让敌人带 6 血并持冰霜之刃',
                '武器可用别名 sword / fb / fs / sd / th / cb / bh / ts'
            ]
        },
        {
            chapter: '第二章 · 进阶系统',
            adv: true,
            scene: 5,
            title: '商店与抽卡：金币怎么花',
            desc: '金币只有两种价值：立刻变成血量，或者赌成一个长期资产。',
            caption: '黑市商店 · 抽卡',
            keys: ['H', 'R'],
            points: [
                'H 打开黑市：HP 药水 30 金币，普攻药水 100，技能药水 50',
                'R 抽卡面板可在「宠物 / 武器」间切换：单抽 30，十连 270（省 30）',
                '宠物池约 10% 出宠物、90% 出升级材料，重复宠物返还 100 金币',
                '钱不够十连时先别买药水，抽卡的材料是宠物升级的唯一来源'
            ]
        },
        {
            chapter: '第二章 · 进阶系统',
            adv: true,
            scene: 12,
            title: '宠物与科技盾牌',
            desc: '宠物不是战斗单位，是长期增益；科技盾牌是你唯一能主动按出来的防御。',
            caption: '宠物面板 · 材料',
            keys: ['V', 'Shift+1~4'],
            points: [
                'V 打开宠物面板，查看已获得的宠物与升级进度',
                '几何图 / 香蕉 / 眼球是宠物升级材料，主要从抽卡产出',
                '装备科技盾牌后充能满，按 V 释放护盾挡下一次伤害',
                '换装用 E 背包拖拽，Shift + 1~4 依次卸下对应装备位'
            ]
        },
        {
            chapter: '第二章 · 进阶系统',
            adv: true,
            scene: 8,
            title: '准备好了',
            desc: '两章讲完。新手关里有 7 个敌人和 2 个存档点，先在那里把手感练熟。',
            caption: '出发',
            keys: [],
            points: [
                '点击下方「开始冒险」进入新手关实战',
                '新手关 4 颗心、2 个存档点，阵亡从最近存档点重来',
                '通关后才进正篇；想跳过的点右上角「跳过教程」'
            ]
        }
    ];

    // ---------- DOM ----------
    var panel = document.querySelector('.panel');
    var stepIndexEl = document.getElementById('stepIndex');
    var chapterTagEl = document.getElementById('chapterTag');
    var stepTitleEl = document.getElementById('stepTitle');
    var stepDescEl = document.getElementById('stepDesc');
    var keyRowEl = document.getElementById('keyRow');
    var pointListEl = document.getElementById('pointList');
    var progressBar = document.getElementById('progressBar');
    var dotsEl = document.getElementById('dots');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    var skipBtn = document.getElementById('skipBtn');
    var captionEl = document.getElementById('stageCaption');

    var index = 0;
    var stepT = 0;   // 当前步骤的演示计时

    function pad2(n) { return n < 10 ? '0' + n : String(n); }

    function renderStep(animate) {
        var st = STEPS[index];

        stepIndexEl.textContent = pad2(index + 1) + ' / ' + pad2(STEPS.length);
        chapterTagEl.textContent = st.chapter || '';
        chapterTagEl.className = 'chapter-tag' + (st.adv ? ' adv' : '');
        stepTitleEl.textContent = st.title;
        stepDescEl.textContent = st.desc;
        captionEl.textContent = st.caption;

        // 按键
        keyRowEl.innerHTML = '';
        for (var i = 0; i < st.keys.length; i++) {
            var cap = document.createElement('span');
            cap.className = 'keycap';
            cap.textContent = st.keys[i];
            cap.style.animationDelay = (i * 55) + 'ms';
            keyRowEl.appendChild(cap);
        }

        // 要点
        pointListEl.innerHTML = '';
        for (var j = 0; j < st.points.length; j++) {
            var li = document.createElement('li');
            li.textContent = st.points[j];
            pointListEl.appendChild(li);
        }

        // 进度与圆点
        progressBar.style.width = ((index + 1) / STEPS.length * 100) + '%';
        var dots = dotsEl.children;
        for (var k = 0; k < dots.length; k++) {
            dots[k].className = (k === index) ? 'dot active' : 'dot';
        }

        prevBtn.disabled = (index === 0);
        nextBtn.textContent = (index === STEPS.length - 1) ? '开始冒险' : '下一步';

        if (animate) {
            panel.classList.remove('fade-swap');
            void panel.offsetWidth;
            panel.classList.add('fade-swap');
        }

        stepT = 0;
    }

    function buildDots() {
        dotsEl.innerHTML = '';
        for (var i = 0; i < STEPS.length; i++) {
            (function (n) {
                var d = document.createElement('div');
                d.className = 'dot';
                d.title = STEPS[n].title;
                d.addEventListener('click', function () {
                    index = n;
                    renderStep(true);
                });
                dotsEl.appendChild(d);
            })(i);
        }
    }

    function next() {
        if (index >= STEPS.length - 1) { enterGame(); return; }
        index++;
        renderStep(true);
    }

    function prev() {
        if (index <= 0) return;
        index--;
        renderStep(true);
    }

    function markDone() {
        try { localStorage.setItem('ws_tutorial_done', String(Date.now())); } catch (e) {}
    }

    function enterGame() {
        markDone();
        var guest = false;
        try {
            guest = new URLSearchParams(window.location.search).get('guest') === '1';
        } catch (e) {
            guest = /[?&]guest=1/i.test(window.location.search);
        }
        // 教程讲完 → 新手关实操（跳过教程同样走新手关）
        window.location.href = 'newbie.html' + (guest ? '?guest=1' : '');
    }

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    skipBtn.addEventListener('click', enterGame);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            next();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prev();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            enterGame();
        }
    });

    // 支持 ?step=N 直接定位到某一步（0 起，用于调试与深链）
    try {
        var sp = new URLSearchParams(window.location.search).get('step');
        if (sp !== null) {
            var want = parseInt(sp, 10);
            if (!isNaN(want) && want >= 0 && want < STEPS.length) index = want;
        }
    } catch (e) {}

    // 从主页新存档流程进入时，显示返回主页入口
    try {
        if (new URLSearchParams(window.location.search).get('from') === 'newgame') {
            var backHome = document.getElementById('backHome');
            if (backHome) backHome.style.display = 'inline-block';
        }
    } catch (e) {}

    buildDots();
    renderStep(false);

    // ================= 迷你演示场景 =================
    var canvas = document.getElementById('demoCanvas');
    var ctx = canvas.getContext('2d');
    var VW = 420, VH = 280, GROUND = 216;
    var running = true;

    function fitCanvas() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(VW * dpr);
        canvas.height = Math.round(VH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fitCanvas();
    window.addEventListener('resize', fitCanvas);

    function rr(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawPlayer(x, y, face, swing) {
        // 挥砍弧
        if (swing > 0.02) {
            ctx.save();
            ctx.strokeStyle = 'rgba(220, 235, 255, ' + (0.85 * swing).toFixed(3) + ')';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            var start = -0.9 + (1 - swing) * 0.9;
            ctx.beginPath();
            ctx.arc(x + 15, y + 15, 26 + swing * 8, start, start + 1.5 * swing);
            ctx.stroke();
            ctx.restore();
        }
        ctx.save();
        ctx.shadowColor = 'rgba(180, 210, 255, 0.55)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffffff';
        rr(x, y, 30, 30, 6);
        ctx.fill();
        ctx.restore();
        // 眼睛
        ctx.fillStyle = '#0b0c14';
        var ex = face > 0 ? 17 : 9;
        ctx.fillRect(x + ex, y + 11, 4, 5);
        ctx.fillRect(x + ex + (face > 0 ? -7 : 7), y + 11, 3, 4);
    }

    function drawEnemy(x, y, flash) {
        var c = flash > 0.5 ? '#ffd6d6' : (flash > 0 ? '#ff8b7d' : '#e2402f');
        ctx.save();
        ctx.shadowColor = flash > 0 ? 'rgba(255, 200, 200, 0.6)' : 'rgba(255, 70, 70, 0.45)';
        ctx.shadowBlur = flash > 0 ? 22 : 13;
        ctx.fillStyle = c;
        rr(x, y, 26, 26, 5);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#1a0808';
        ctx.fillRect(x + 7, y + 9, 4, 5);
        ctx.fillRect(x + 16, y + 9, 4, 5);
    }

    function drawBrick(x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(0.5);
        ctx.shadowColor = 'rgba(140, 220, 255, 0.6)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#bfe6ff';
        rr(-7, -9, 14, 18, 3);
        ctx.fill();
        ctx.restore();
    }

    function drawCoin(x, y) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 200, 60, 0.6)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffd966';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawStar(cx, cy, r, points) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffd966';
        ctx.beginPath();
        for (var i = 0; i < points * 2; i++) {
            var rad = (i % 2 === 0) ? r : r * 0.45;
            var ang = (Math.PI / points) * i - Math.PI / 2;
            var px = cx + Math.cos(ang) * rad;
            var py = cy + Math.sin(ang) * rad;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawGround() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.028)';
        ctx.fillRect(0, GROUND, VW, VH - GROUND);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, GROUND + 0.5);
        ctx.lineTo(VW, GROUND + 0.5);
        ctx.stroke();
    }

    var PILLARS = [40, 110, 180, 250, 320, 390];
    function drawPillars(offset) {
        for (var i = 0; i < PILLARS.length; i++) {
            var x = PILLARS[i] - ((offset || 0) % 380);
            if (x < -40) x += 380;
            ctx.fillStyle = 'rgba(255, 170, 0, 0.10)';
            ctx.fillRect(x, GROUND - 34, 12, 34);
        }
    }

    var SPARKS = [];
    for (var si = 0; si < 24; si++) {
        SPARKS.push({ x: (si * 71) % VW, y0: (si * 47) % (GROUND - 30), sp: 6 + (si % 5) * 2.5 });
    }

    function drawSparks() {
        for (var i = 0; i < SPARKS.length; i++) {
            var s = SPARKS[i];
            var span = GROUND - 40;
            var y = s.y0 - (stepT * s.sp) % span;
            if (y < 6) y += span;
            var a = 0.06 + 0.07 * (0.5 + 0.5 * Math.sin(stepT * 2 + i));
            ctx.fillStyle = 'rgba(200, 220, 255, ' + a.toFixed(3) + ')';
            ctx.fillRect(s.x, y, 2, 2);
        }
    }

    function drawWindow(x, y, w, h, title, rows, badge) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 26;
        ctx.fillStyle = 'rgba(20, 22, 34, 0.92)';
        rr(x, y, w, h, 12);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
        ctx.lineWidth = 1.2;
        rr(x, y, w, h, 12);
        ctx.stroke();

        ctx.fillStyle = '#ffd966';
        ctx.font = 'bold 12px Consolas, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(title, x + 14, y + 22);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 30);
        ctx.lineTo(x + w - 12, y + 30);
        ctx.stroke();

        ctx.font = '12px Consolas, monospace';
        for (var i = 0; i < rows.length; i++) {
            ctx.fillStyle = 'rgba(232, 232, 240, 0.8)';
            ctx.fillText(rows[i], x + 16, y + 50 + i * 20);
        }

        if (badge) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.16)';
            rr(x + w - 40, y + h - 30, 28, 20, 6);
            ctx.fill();
            ctx.fillStyle = '#ffe9a8';
            ctx.font = 'bold 11px Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(badge, x + w - 26, y + h - 16);
            ctx.textAlign = 'left';
        }
    }

    function drawShopCard(x, y, label, price, pulse) {
        ctx.save();
        ctx.fillStyle = 'rgba(22, 24, 38, 0.9)';
        rr(x, y, 62, 78, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 215, 0, ' + (0.2 + pulse * 0.35).toFixed(2) + ')';
        ctx.lineWidth = 1.2;
        rr(x, y, 62, 78, 10);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = 'rgba(255, 215, 0, 0.75)';
        rr(x + 19, y + 14, 24, 24, 6);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(232, 232, 240, 0.9)';
        ctx.font = '11px "Microsoft YaHei", sans-serif';
        ctx.fillText(label, x + 31, y + 54);
        ctx.fillStyle = '#ffd966';
        ctx.font = 'bold 11px Consolas, monospace';
        ctx.fillText(price + ' 金', x + 31, y + 68);
        ctx.textAlign = 'left';
    }

    function drawEntryCard(x, y, w, h, glyph, title, sub, pulse) {
        ctx.save();
        ctx.fillStyle = 'rgba(22, 24, 38, 0.9)';
        rr(x, y, w, h, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 215, 0, ' + (0.16 + pulse * 0.4).toFixed(2) + ')';
        ctx.lineWidth = 1.2;
        rr(x, y, w, h, 12);
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 215, 0, ' + (0.6 + pulse * 0.35).toFixed(2) + ')';
        ctx.font = 'bold 24px Consolas, monospace';
        ctx.fillText(glyph, x + w / 2, y + 44);
        ctx.fillStyle = '#e8e8f0';
        ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
        ctx.fillText(title, x + w / 2, y + 68);
        ctx.fillStyle = 'rgba(232, 232, 240, 0.45)';
        ctx.font = '10px Consolas, monospace';
        ctx.fillText(sub, x + w / 2, y + 86);
        ctx.textAlign = 'left';
    }

    function drawHpBar(x, y, w, cur, max) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        rr(x, y, w, 5, 2.5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 110, 120, 0.9)';
        rr(x, y, Math.max(0, w * (cur / max)), 5, 2.5);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 200, 210, 0.85)';
        ctx.font = '9px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cur + ' / ' + max, x + w / 2, y - 4);
        ctx.textAlign = 'left';
    }

    function drawScene() {
        ctx.clearRect(0, 0, VW, VH);

        var bg = ctx.createLinearGradient(0, 0, 0, VH);
        bg.addColorStop(0, '#0d0f19');
        bg.addColorStop(1, '#07080e');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, VW, VH);

        var i = (STEPS[index] && STEPS[index].scene !== undefined) ? STEPS[index].scene : index;

        if (i === 8) drawPillars(stepT * 42); else drawPillars(0);
        drawSparks();
        drawGround();

        if (i === 0) {
            var bob = Math.sin(stepT * 2) * 4;
            drawPlayer(190, GROUND - 30 + bob, 1, 0);
            drawEnemy(302, GROUND - 26, 0);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.55)';
            ctx.font = 'bold 20px Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('→', 259, GROUND - 42 + Math.sin(stepT * 3) * 3);
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = '11px Consolas, monospace';
            ctx.fillText('区块 1 / 20', 12, 24);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.fillRect(12, 30, 62, 3);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
            ctx.fillRect(12, 30, 10, 3);
        } else if (i === 1) {
            var T = 2.6;
            var p = (stepT % T) / T;
            var yOff = 0;
            if (p < 0.62) {
                yOff = -Math.sin((p / 0.62) * Math.PI) * 54;
            }
            var mx = 140 + Math.sin(stepT * 1.15) * 48;
            drawPlayer(mx, GROUND - 30 + yOff, Math.cos(stepT * 1.15) >= 0 ? 1 : -1, 0);
            // 地面轨迹线
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(88, GROUND - 2);
            ctx.lineTo(196, GROUND - 2);
            ctx.stroke();
            ctx.setLineDash([]);
            // 跳起高度提示
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.22)';
            ctx.beginPath();
            ctx.moveTo(330, GROUND - 56);
            ctx.quadraticCurveTo(360, GROUND - 96, 392, GROUND - 56);
            ctx.stroke();
        } else if (i === 2) {
            var ap = (stepT % 1.5) / 1.5;
            var swing = ap < 0.32 ? Math.sin((ap / 0.32) * Math.PI) : 0;
            drawPlayer(148, GROUND - 30, 1, swing);
            var bp = (stepT % 2.6) / 2.6;
            if (bp < 0.46) {
                var q = bp / 0.46;
                drawBrick(186 + q * 108, GROUND - 44 - Math.sin(q * Math.PI) * 24);
            }
            var flash = 0;
            if (bp > 0.46 && bp < 0.6) flash = 1;
            else if (bp >= 0.6) flash = 0;
            drawEnemy(300, GROUND - 26, flash);
            if (flash > 0) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(313, GROUND - 13, 22 + (bp - 0.46) * 90, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else if (i === 3) {
            drawPlayer(96, GROUND - 30, 1, 0);
            var ph = stepT % 2.4;
            if (ph < 1.2) {
                drawEnemy(300, GROUND - 26, ph > 0.98 ? 0.7 : 0);
            } else {
                var k = (ph - 1.2) / 1.2;
                ctx.globalAlpha = 1 - k;
                for (var ci = 0; ci < 3; ci++) {
                    drawCoin(292 + (ci - 1) * 20, GROUND - 32 - k * 46 - ci * 5);
                }
                ctx.globalAlpha = 1;
                ctx.fillStyle = 'rgba(255, 225, 132, ' + (1 - k).toFixed(2) + ')';
                ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
                ctx.fillText('+ 金币  + 经验', 246, GROUND - 88 - k * 12);
            }
            drawWindow(246, 34, 150, 78, '战利品', ['金币 x1~6', '基础经验 / 中等经验'], '');
        } else if (i === 4) {
            drawPlayer(84, GROUND - 30, 1, 0);
            drawEnemy(352, GROUND - 26, 0);
            drawWindow(150, 30, 190, 150, '角色状态', ['LV        1', 'EXP       0 / 100', '金币      0', '攻击力    10', '技能倍率  x1.00'], 'F');
        } else if (i === 5) {
            drawPlayer(64, GROUND - 30, 1, 0);
            var pulse = 0.5 + 0.5 * Math.sin(stepT * 3);
            drawShopCard(140, 92, 'HP 药水', '30', pulse);
            drawShopCard(214, 92, '普攻药水', '100', 1 - pulse);
            drawShopCard(288, 92, '技能药水', '50', pulse);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
            ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
            ctx.fillText('黑市商店 · H', 140, 78);
            for (var gi = 0; gi < 4; gi++) {
                drawCoin(180 + gi * 26, 196 - Math.sin(stepT * 2 + gi) * 6);
            }
            ctx.fillStyle = 'rgba(255, 215, 0, ' + (0.55 + 0.25 * Math.sin(stepT * 3)).toFixed(2) + ')';
            ctx.font = 'bold 11px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('R 抽卡 · 单抽 30 / 十连 270', VW / 2, GROUND + 26);
            ctx.textAlign = 'left';
        } else if (i === 6) {
            var beaconX = 322;
            var grad = ctx.createLinearGradient(0, GROUND - 170, 0, GROUND);
            grad.addColorStop(0, 'rgba(255, 215, 0, 0)');
            grad.addColorStop(1, 'rgba(255, 215, 0, ' + (0.16 + 0.1 * Math.sin(stepT * 3)).toFixed(2) + ')');
            ctx.fillStyle = grad;
            ctx.fillRect(beaconX - 30, GROUND - 170, 60, 170);
            drawStar(beaconX, GROUND - 92, 11 + Math.sin(stepT * 3) * 1.2, 5);
            var sx = 46 + ((stepT * 58) % 246);
            drawPlayer(sx, GROUND - 30, 1, 0);
            if (sx > 250) {
                ctx.fillStyle = 'rgba(195, 232, 141, ' + Math.min(1, (sx - 250) / 30).toFixed(2) + ')';
                ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
                ctx.fillText('✓ 已自动存档', 196, GROUND - 132);
            }
        } else if (i === 7) {
            drawWindow(52, 34, 300, 150, '指令台', [], '');
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.lineWidth = 1;
            rr(66, 72, 272, 34, 8);
            ctx.stroke();
            var full = 'give 100 coin';
            var speed = 11;
            var n = Math.floor(stepT * speed);
            var shown = full;
            if (n < full.length + 6) {
                shown = full.slice(0, Math.min(n, full.length));
            }
            ctx.fillStyle = '#e8e8f0';
            ctx.font = '13px Consolas, monospace';
            ctx.fillText('/ ' + shown, 78, 94);
            if (Math.floor(stepT * 2) % 2 === 0) {
                var caretX = 78 + ctx.measureText('/ ' + shown).width + 2;
                ctx.fillStyle = '#ffd966';
                ctx.fillRect(caretX, 83, 1.5, 14);
            }
            ctx.fillStyle = 'rgba(232, 232, 240, 0.5)';
            ctx.font = '11px "Microsoft YaHei", sans-serif';
            ctx.fillText('Tab 补全　Enter 执行　Esc 关闭', 68, 156);
            drawPlayer(96, GROUND - 30, 1, 0);
        } else if (i === 8) {
            var rx = (stepT * 92) % 470 - 30;
            drawPlayer(rx, GROUND - 30, 1, 0);
            drawEnemy(300 - ((stepT * 20) % 60), GROUND - 26, 0);
            ctx.fillStyle = 'rgba(255, 215, 0, ' + (0.5 + 0.3 * Math.sin(stepT * 4)).toFixed(2) + ')';
            ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('向 右 出 发', VW / 2, 40);
            ctx.textAlign = 'left';
        } else if (i === 9) {
            var pu = 0.5 + 0.5 * Math.sin(stepT * 2.2);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.82)';
            ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
            ctx.fillText('第二章 · 进阶三件套', 26, 52);
            drawEntryCard(24, 74, 104, 104, 'T', '指令台', '改规则', pu);
            drawEntryCard(158, 74, 104, 104, 'H', '商店 · 抽卡', 'R 抽卡', 1 - pu);
            drawEntryCard(292, 74, 104, 104, 'V', '宠物', '长期增益', pu);
            drawPlayer(190, GROUND - 30, 1, 0);
        } else if (i === 10) {
            drawWindow(38, 26, 344, 150, '指令台 · 动词 + 参数', [
                'st summon     刷怪开关',
                'bm 3          传送到区块 3',
                'kill          清掉场上敌人',
                'tune LV = 10  直接设等级'
            ], 'T');
            ctx.fillStyle = 'rgba(232, 232, 240, 0.5)';
            ctx.font = '11px "Microsoft YaHei", sans-serif';
            ctx.fillText('Tab 补全　Enter 执行　Esc 关闭', 40, 198);
            drawPlayer(330, GROUND - 30, 1, 0);
        } else if (i === 11) {
            var showX = [112, 168, 224];
            for (var ei = 0; ei < showX.length; ei++) {
                drawEnemy(showX[ei], GROUND - 26, 0);
                drawHpBar(showX[ei] - 14, GROUND - 48, 56, 6, 6);
            }
            // 敌人手里的武器标记
            ctx.save();
            ctx.translate(showX[2] + 32, GROUND - 34);
            ctx.rotate(-0.6);
            ctx.fillStyle = 'rgba(190, 230, 255, 0.9)';
            ctx.fillRect(0, -2, 26, 4);
            ctx.restore();
            ctx.fillStyle = 'rgba(255, 215, 0, 0.82)';
            ctx.font = 'bold 11px Consolas, monospace';
            ctx.fillText('summon 1 black ~~~ HP=6~fb', 86, 56);
            ctx.fillStyle = 'rgba(232, 232, 240, 0.42)';
            ctx.font = '11px "Microsoft YaHei", sans-serif';
            ctx.fillText('数量走中间，区块走最后，~~~ 之后是自定义', 86, 74);
            drawPlayer(340, GROUND - 30, -1, 0);
        } else if (i === 12) {
            drawWindow(44, 26, 300, 150, '宠物面板 · V', [
                'monkey       已获得',
                '0.618        材料 2 / 5',
                'horror       未获得',
                '科技盾牌     充能 100%'
            ], 'V');
            drawPlayer(200, GROUND - 30, 1, 0);
            var shR = 30 + Math.sin(stepT * 3) * 2;
            ctx.strokeStyle = 'rgba(120, 190, 255, ' + (0.35 + 0.3 * Math.sin(stepT * 3)).toFixed(2) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(210, GROUND - 15, shR, 0, Math.PI * 2);
            ctx.stroke();
        } else if (i === 14) {
            drawWindow(40, 26, 160, 150, '天赋 · Z', [
                '攻击 +10%',
                '移速 +8%',
                '生命 +1',
                '三段跳 锁定'
            ], 'Z');
            drawWindow(220, 26, 160, 150, '成就 · X', [
                '初见黑屋 达成',
                '首次十连 达成',
                '百人斩 12/100',
                '通关 0/1'
            ], 'X');
            drawPlayer(190, GROUND - 30, 1, 0);
        }
    }

    var lastTs = 0;
    function loop(ts) {
        if (!running) return;
        if (!lastTs) lastTs = ts;
        var dt = (ts - lastTs) / 1000;
        lastTs = ts;
        if (dt > 0.06) dt = 0.06;
        stepT += dt;
        drawScene();
        window.requestAnimationFrame(loop);
    }
    window.requestAnimationFrame(loop);

    window.addEventListener('blur', function () { lastTs = 0; });
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) lastTs = 0;
    });
})();
