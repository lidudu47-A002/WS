// ============ 新手教程 · 交互与迷你演示 ============
(function () {
    'use strict';

    // ---------- 步骤内容 ----------
    var STEPS = [
        {
            chapter: 'Chapter 1 · The Basics',
            adv: false,
            scene: 0,
            title: 'You are a white square',
            desc: 'In this black world the only right thing to do is walk right — fight through 20 chunks and smash everything in your way.',
            caption: 'Black Room · Start',
            keys: [],
            points: [
                'Every run starts in the Black Room, and right is the way forward',
                'That glowing white square in the bottom-left corner is you',
                'Two chapters: Chapter 1 covers the basics, Chapter 2 covers console / shop / pets'
            ]
        },
        {
            chapter: 'Chapter 1 · The Basics',
            adv: false,
            scene: 1,
            title: 'First, learn to run',
            desc: 'Movement is the key to survival. Enemies close in from both sides; jumping and crouching dodges most attacks.',
            caption: 'Move and Jump',
            keys: ['A', 'D', '←', '→', 'Space', 'Shift', '↓'],
            points: [
                'A / D or ← / → to move left and right',
                'Space to jump; press again in the air for a double jump',
                'Hold Shift or ↓ to crouch, slip through low passages and dodge incoming blocks'
            ]
        },
        {
            chapter: 'Chapter 1 · The Basics',
            adv: false,
            scene: 2,
            title: 'The mouse decides how you fight',
            desc: 'Every attack goes in the direction you face. Melee is for close range, bricks are for hitting from afar.',
            caption: 'Melee Slash · Charged Brick',
            keys: ['Left Mouse Button', 'Right Mouse Button'],
            points: [
                'Left click for a melee slash; if you miss and an enemy is within 20–150px ahead, you auto-dash and follow up with another hit',
                'Hold right click to charge, release to throw a brick: 50 base damage, far above the 10 of a basic attack',
                'The brick has a 5s cooldown — save it for tanky enemies'
            ]
        },
        {
            chapter: 'Chapter 1 · The Basics',
            adv: false,
            scene: 3,
            title: 'Gold and EXP',
            desc: 'Killing enemies does not grant EXP directly — they drop EXP items. Picking them up is not using them; you must consume them.',
            caption: 'Loot Settlement',
            keys: ['P', 'Q', 'R'],
            points: [
                'Every kill drops gold plus Basic EXP / Mid EXP',
                'Press P for the character panel, then Q to use Basic EXP (50 EXP) and R to use Mid EXP (100 EXP)',
                'Leveling raises attack and skill multiplier; the cap is level 50'
            ]
        },
        {
            chapter: 'Chapter 1 · The Basics',
            adv: false,
            scene: 4,
            title: 'Common Panels and Hotkeys',
            desc: 'These keys are your whole control desk — memorize the most frequent ones first.',
            caption: 'Status Panel and Inventory',
            keys: ['F', 'E', '1-9'],
            points: [
                'Hold F to view your status (level, gold, chunk, attack); release to close',
                'E opens the inventory: drag gear to equip, keys 1–9 use hotbar items',
                'Shift + 1–4 unequips Jester Mask / Cross / Weapon / Priest Robe'
            ]
        },
        {
            chapter: 'Chapter 1 · The Basics',
            adv: false,
            scene: 6,
            title: 'Checkpoints decide how many times you can respawn',
            desc: 'Walking through the glowing star area auto-saves. It is your only insurance.',
            caption: 'Checkpoint · Auto Save',
            keys: ['S', 'L'],
            points: [
                'Entering the checkpoint star auto-saves; after dying you respawn at the nearest checkpoint',
                'Die before reaching any checkpoint and the run simply ends',
                'S exports a save file, L loads one; neither works in guest mode'
            ]
        },
        {
            chapter: 'Chapter 1 · The Basics',
            adv: false,
            scene: 14,
            title: 'Talents and Achievements',
            desc: 'Two long-term paths to power: talent points buy stats, achievements hand out talent points.',
            caption: 'Talents · Achievements',
            keys: ['Z', 'X'],
            points: [
                'Z opens talents: attack, move speed, HP, and a triple jump that needs its prerequisites maxed',
                'X shows achievements; completing them grants talent points — the only source',
                'Chapter 1 ends here. The next chapter covers the systems that bend the rules.'
            ]
        },
        {
            chapter: 'Chapter 2 · Advanced Systems',
            adv: true,
            scene: 9,
            title: 'Chapter 2: The Advanced Trio',
            desc: 'Console, shop and pets — the three biggest time-savers in the main game, explained in one go.',
            caption: 'Advanced Systems Overview',
            keys: ['T', 'H', 'R', 'V'],
            points: [
                'Console T: not just cheat codes — sprite swaps, spawn toggles and teleports live here too',
                'Shop H and gacha R: two ways to spend gold — one buys lives, one gambles',
                'Pets V: rolled pets and stockpiled materials all live in this panel'
            ]
        },
        {
            chapter: 'Chapter 2 · Advanced Systems',
            adv: true,
            scene: 10,
            title: 'Console: learn the syntax first',
            desc: 'The input box adds the / prefix; commands go verb + args, in that order.',
            caption: 'Console · Basic Syntax',
            keys: ['T', 'Tab', 'Enter', 'Esc'],
            points: [
                'T toggles the console; Tab cycles suggestions, Enter runs, Esc closes',
                'st summon toggles natural enemy spawning; turn it off when stuck or short on materials',
                'bm 3 teleports to chunk 3 (0–19); kill clears every enemy on the field',
                'tune LV = 10 sets your level to 10; the cap is 50'
            ]
        },
        {
            chapter: 'Chapter 2 · Advanced Systems',
            adv: true,
            scene: 7,
            title: 'give and image: get items, change looks',
            desc: 'give stuffs items into your inventory; image swaps a weapon sprite for another one.',
            caption: 'give · image',
            keys: ['T', 'give', 'image'],
            points: [
                'give 100 coin grants gold, up to 2000 at once; give also grants EXP items',
                'give sword / fb / fs / sd / th / cb / bh / ts grants a weapon',
                'give monkey / 0.618 / horror / en grants that pet',
                'image Iron Sword = Frost Blade swaps the sprite; image reset restores all looks'
            ]
        },
        {
            chapter: 'Chapter 2 · Advanced Systems',
            adv: true,
            scene: 11,
            title: 'summon and ~~~ customization',
            desc: 'summon spawns enemies: the third number is the chunk, and everything after ~~~ is custom parameters.',
            caption: 'summon · Custom Enemies',
            keys: ['T', 'summon', '~~~'],
            points: [
                'summon 5 block spawns 5 block enemies; summon 3 black spawns black enemies',
                'summon 2 block 7 spawns 2 in chunk 7; omit it to use the current chunk',
                'summon 1 black ~~~ HP=6~fb gives the enemy 6 HP and a Frost Blade',
                'Weapon aliases: sword / fb / fs / sd / th / cb / bh / ts'
            ]
        },
        {
            chapter: 'Chapter 2 · Advanced Systems',
            adv: true,
            scene: 5,
            title: 'Shop and Gacha: how to spend gold',
            desc: 'Gold has two uses: turn into HP right now, or gamble it into a long-term asset.',
            caption: 'Black Market · Gacha',
            keys: ['H', 'R'],
            points: [
                'H opens the black market: HP Potion 30 gold, Basic Attack Potion 100, Skill Potion 50',
                'The R gacha panel switches between pets / weapons: 30 per pull, 270 per 10-pull (save 30)',
                'The pet pool is about 10% pets and 90% upgrade materials; duplicate pets refund 100 gold',
                'Short on gold for a 10-pull? Skip potions — gacha materials are the only way to upgrade pets'
            ]
        },
        {
            chapter: 'Chapter 2 · Advanced Systems',
            adv: true,
            scene: 12,
            title: 'Pets and Tech Shield',
            desc: 'Pets are not fighters but long-term buffs; the tech shield is your only active defense.',
            caption: 'Pet Panel · Materials',
            keys: ['V', 'Shift+1~4'],
            points: [
                'V opens the pet panel with your pets and upgrade progress',
                'Geometry / Banana / Eyeball are pet upgrade materials, mainly from gacha',
                'Equip the tech shield, let it charge, then press V to raise it and block one hit',
                'Equip by dragging in the E inventory; Shift + 1–4 unequips the matching slot'
            ]
        },
        {
            chapter: 'Chapter 2 · Advanced Systems',
            adv: true,
            scene: 8,
            title: 'Ready',
            desc: 'Both chapters done. The beginner stage has 7 enemies and 2 checkpoints — get comfortable there first.',
            caption: 'Set Off',
            keys: [],
            points: [
                'Click Start Adventure below to enter the beginner stage',
                'Beginner stage: 4 hearts, 2 checkpoints, respawn at the nearest one',
                'Clearing it unlocks the main game; to skip, use Skip Tutorial in the top-right'
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
        nextBtn.textContent = (index === STEPS.length - 1) ? 'Start Adventure' : 'Next';

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
        ctx.fillText(price + ' gold', x + 31, y + 68);
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
            ctx.fillText('Chunk 1 / 20', 12, 24);
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
                ctx.fillText('+ Gold  + EXP', 246, GROUND - 88 - k * 12);
            }
            drawWindow(246, 34, 150, 78, 'Loot', ['Gold x1–6', 'Basic EXP / Mid EXP'], '');
        } else if (i === 4) {
            drawPlayer(84, GROUND - 30, 1, 0);
            drawEnemy(352, GROUND - 26, 0);
            drawWindow(150, 30, 190, 150, 'Character Status', ['LV        1', 'EXP       0 / 100', 'Gold      0', 'Attack    10', 'Skill Mult  x1.00'], 'F');
        } else if (i === 5) {
            drawPlayer(64, GROUND - 30, 1, 0);
            var pulse = 0.5 + 0.5 * Math.sin(stepT * 3);
            drawShopCard(140, 92, 'HP Potion', '30', pulse);
            drawShopCard(214, 92, 'Basic Attack Potion', '100', 1 - pulse);
            drawShopCard(288, 92, 'Skill Potion', '50', pulse);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
            ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
            ctx.fillText('Black Market · H', 140, 78);
            for (var gi = 0; gi < 4; gi++) {
                drawCoin(180 + gi * 26, 196 - Math.sin(stepT * 2 + gi) * 6);
            }
            ctx.fillStyle = 'rgba(255, 215, 0, ' + (0.55 + 0.25 * Math.sin(stepT * 3)).toFixed(2) + ')';
            ctx.font = 'bold 11px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('R Gacha · 30 each / 270 for 10', VW / 2, GROUND + 26);
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
                ctx.fillText('✓ Auto-saved', 196, GROUND - 132);
            }
        } else if (i === 7) {
            drawWindow(52, 34, 300, 150, 'Console', [], '');
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
            ctx.fillText('Tab complete　Enter run　Esc close', 68, 156);
            drawPlayer(96, GROUND - 30, 1, 0);
        } else if (i === 8) {
            var rx = (stepT * 92) % 470 - 30;
            drawPlayer(rx, GROUND - 30, 1, 0);
            drawEnemy(300 - ((stepT * 20) % 60), GROUND - 26, 0);
            ctx.fillStyle = 'rgba(255, 215, 0, ' + (0.5 + 0.3 * Math.sin(stepT * 4)).toFixed(2) + ')';
            ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('H E A D   R I G H T', VW / 2, 40);
            ctx.textAlign = 'left';
        } else if (i === 9) {
            var pu = 0.5 + 0.5 * Math.sin(stepT * 2.2);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.82)';
            ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
            ctx.fillText('Chapter 2 · The Advanced Trio', 26, 52);
            drawEntryCard(24, 74, 104, 104, 'T', 'Console', 'House Rules', pu);
            drawEntryCard(158, 74, 104, 104, 'H', 'Shop · Gacha', 'R Gacha', 1 - pu);
            drawEntryCard(292, 74, 104, 104, 'V', 'Pets', 'Long-term Buffs', pu);
            drawPlayer(190, GROUND - 30, 1, 0);
        } else if (i === 10) {
            drawWindow(38, 26, 344, 150, 'Console · Verb + Args', [
                'st summon     spawn toggle',
                'bm 3          teleport to chunk 3',
                'kill          clear the field',
                'tune LV = 10  set level directly'
            ], 'T');
            ctx.fillStyle = 'rgba(232, 232, 240, 0.5)';
            ctx.font = '11px "Microsoft YaHei", sans-serif';
            ctx.fillText('Tab complete　Enter run　Esc close', 40, 198);
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
            ctx.fillText('Count in the middle, chunk last, custom args after ~~~', 86, 74);
            drawPlayer(340, GROUND - 30, -1, 0);
        } else if (i === 12) {
            drawWindow(44, 26, 300, 150, 'Pet Panel · V', [
                'monkey       obtained',
                '0.618        Materials 2 / 5',
                'horror       not obtained',
                'Tech Shield  charged 100%'
            ], 'V');
            drawPlayer(200, GROUND - 30, 1, 0);
            var shR = 30 + Math.sin(stepT * 3) * 2;
            ctx.strokeStyle = 'rgba(120, 190, 255, ' + (0.35 + 0.3 * Math.sin(stepT * 3)).toFixed(2) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(210, GROUND - 15, shR, 0, Math.PI * 2);
            ctx.stroke();
        } else if (i === 14) {
            drawWindow(40, 26, 160, 150, 'Talents · Z', [
                'Attack +10%',
                'Move Speed +8%',
                'HP +1',
                'Triple Jump locked'
            ], 'Z');
            drawWindow(220, 26, 160, 150, 'Achievements · X', [
                'First Black Room  done',
                'First 10-pull  done',
                'Century Slayer 12/100',
                'Cleared 0/1'
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
