/**
 * physics-light.js —— 白色方块的冒险 · 物理引擎 + 光照引擎
 * ---------------------------------------------------------------
 * 纯前端、零依赖、无自动副作用：本文件只在 window 上挂两个构造器，
 * 不主动初始化、不接管现有游戏循环，接入时由调用方自行创建实例。
 *
 *   物理：window.WSPhysics（World / Body / clamp / overlap 等工具函数）
 *   光照：window.WSLight  （LightEngine，离屏光照贴图 + 乘法合成 + 矩形遮挡阴影）
 *
 * 单位约定：与现有游戏一致，长度 = 像素，速度 = 像素/帧，重力 = 像素/帧²。
 * 现有常量可直接沿用：GRAVITY = 0.4，CHUNK_SIZE = 400，WORLD_H = 400。
 *
 * ---------------------------------------------------------------
 * 物理用法：
 *   const world = new WSPhysics.World({ gravityY: GRAVITY, substeps: 2 });
 *   world.addSolids([{ x: 0, y: 390, w: WORLD_W, h: 10 },        // 地面
 *                    { x: 300, y: 300, w: 80, h: 12, oneWay: true }]); // 单向平台
 *   const box = world.add({ x: 100, y: 0, w: 30, h: 30 });
 *   // 每帧：
 *   box.vx = inputX * 4;
 *   world.step(1);                  // dt 以「帧」为单位
 *   if (box.onGround) box.vy = -8;  // 跳跃
 *   // 绘制：box.x / box.y；撞墙帧 box.hitWall = 1 / -1
 *
 * 光照用法：
 *   const light = new WSLight.LightEngine({ width: 800, height: 400,
 *                                           ambient: 0.45, scale: 0.5, blur: 6 });
 *   light.setOccluders([{ x: 300, y: 250, w: 40, h: 140 }]);  // 会投影的实体
 *   light.addLight({ x: 120, y: 120, radius: 260, color: '255,210,140', flicker: 0.08 });
 *   // 每帧，在场景绘制完之后：
 *   light.render(ctx, { x: cameraX, y: 0 });
 */
(function (global) {
    'use strict';

    /* ============================================================
     * 一、物理引擎
     * ============================================================ */

    var EPS = 1e-6;

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    /** AABB 相交测试 */
    function overlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    /** 点是否在矩形内 */
    function pointInRect(px, py, r) {
        return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    }

    /** 矩形是否与矩形列表任一相交 */
    function rectHitsAny(r, list) {
        for (var i = 0; i < list.length; i++) {
            if (overlap(r, list[i])) return list[i];
        }
        return null;
    }

    /**
     * 刚体。默认是动态体；isStatic = true 时为静态实体（地面 / 墙 / 平台）。
     * oneWay 单向平台：只在下落且上一帧脚底在平台顶面之上时才阻挡。
     */
    function Body(cfg) {
        cfg = cfg || {};
        this.x = cfg.x || 0;
        this.y = cfg.y || 0;
        this.w = cfg.w || 10;
        this.h = cfg.h || 10;
        this.vx = cfg.vx || 0;
        this.vy = cfg.vy || 0;
        this.isStatic = !!cfg.isStatic;
        this.oneWay = !!cfg.oneWay;
        this.restitution = cfg.restitution != null ? cfg.restitution : 0; // 弹性 0~1
        this.friction = cfg.friction != null ? cfg.friction : 1;         // 地面摩擦系数
        this.gravityScale = cfg.gravityScale != null ? cfg.gravityScale : 1;
        this.maxSpeed = cfg.maxSpeed != null ? cfg.maxSpeed : 40;         // 单轴限速（像素/帧）
        this.onGround = false;
        this.hitCeiling = false;
        this.hitWall = 0;        // -1 左侧墙，1 右侧墙，0 无
        this.tag = cfg.tag || '';
        this.data = cfg.data || null;
        this.active = true;
        this.prevX = this.x;
        this.prevY = this.y;
    }

    Body.prototype.setPos = function (x, y) {
        this.x = x; this.y = y; this.prevX = x; this.prevY = y;
        return this;
    };

    Body.prototype.center = function () {
        return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
    };

    /**
     * 物理世界。
     * @param {Object} opts gravityX / gravityY（像素每帧²）、substeps（子步数，越大越稳）、
     *                      maxFall（下落限速）、solids（初始静态矩形数组）
     */
    function World(opts) {
        opts = opts || {};
        this.gravityX = opts.gravityX || 0;
        this.gravityY = opts.gravityY != null ? opts.gravityY : 0.4;
        this.substeps = Math.max(1, opts.substeps || 2);
        this.maxFall = opts.maxFall != null ? opts.maxFall : 16;
        this.bodies = [];
        this.solids = [];
        this.stepCount = 0;
        if (opts.solids) this.addSolids(opts.solids);
    }

    World.prototype.add = function (bodyOrCfg) {
        var b = (bodyOrCfg instanceof Body) ? bodyOrCfg : new Body(bodyOrCfg);
        this.bodies.push(b);
        if (b.isStatic) this.solids.push(b);
        return b;
    };

    World.prototype.remove = function (b) {
        var i = this.bodies.indexOf(b);
        if (i >= 0) this.bodies.splice(i, 1);
        var j = this.solids.indexOf(b);
        if (j >= 0) this.solids.splice(j, 1);
        return b;
    };

    World.prototype.clear = function () {
        this.bodies.length = 0;
        this.solids.length = 0;
    };

    /** 批量添加静态矩形（地面、墙、平台、砖块） */
    World.prototype.addSolids = function (rects, extra) {
        var out = [];
        for (var i = 0; i < rects.length; i++) {
            var r = rects[i];
            var cfg = { x: r.x, y: r.y, w: r.w, h: r.h, isStatic: true };
            if (r.oneWay != null) cfg.oneWay = r.oneWay;
            if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) cfg[k] = extra[k];
            out.push(this.add(cfg));
        }
        return out;
    };

    /** 不再参与碰撞的静态体（例如被打开的机关门） */
    World.prototype.setSolidEnabled = function (b, enabled) {
        b.active = !!enabled;
        var idx = this.solids.indexOf(b);
        if (enabled && idx < 0) this.solids.push(b);
        if (!enabled && idx >= 0) this.solids.splice(idx, 1);
    };

    /**
     * 步进。dt 以「帧」为单位（dt = 1 表示 60fps 下的单帧），
     * 内部拆成 substeps 个子步，避免高速穿透。
     */
    World.prototype.step = function (dt) {
        dt = dt == null ? 1 : dt;
        if (dt <= 0) return;
        var n = this.substeps;
        var h = dt / n;
        // 状态标记每帧只重置一次（放在子步循环外），否则同一帧内后续子步会把
        // 撞墙 / 落地标记清掉，外部读到的 hitWall、onGround 永远是 0 / false。
        for (var m = 0; m < this.bodies.length; m++) {
            var bm = this.bodies[m];
            if (bm.isStatic || !bm.active) continue;
            bm.prevX = bm.x;
            bm.prevY = bm.y;
            bm.onGround = false;
            bm.hitCeiling = false;
            bm.hitWall = 0;
        }
        for (var s = 0; s < n; s++) {
            for (var i = 0; i < this.bodies.length; i++) {
                var b = this.bodies[i];
                if (b.isStatic || !b.active) continue;

                b.vx += this.gravityX * b.gravityScale * h;
                b.vy += this.gravityY * b.gravityScale * h;
                b.vx = clamp(b.vx, -b.maxSpeed, b.maxSpeed);
                b.vy = clamp(b.vy, -b.maxSpeed, this.maxFall);

                // X 轴先走，再 Y 轴，分离求解避免斜向卡角
                this._moveX(b, b.vx * h);
                this._moveY(b, b.vy * h);

                // 地面摩擦
                if (b.onGround) b.vx *= Math.pow(1 - b.friction * 0.08, h);
            }
        }
        this.stepCount++;
    };

    World.prototype._moveX = function (b, amount) {
        if (amount === 0) return;
        b.x += amount;
        for (var i = 0; i < this.solids.length; i++) {
            var s = this.solids[i];
            if (!s.active || s.oneWay) continue;
            if (!overlap(b, s)) continue;
            if (amount > 0) {
                b.x = s.x - b.w - EPS;
                b.hitWall = 1;
            } else {
                b.x = s.x + s.w + EPS;
                b.hitWall = -1;
            }
            b.vx = -b.vx * b.restitution;
            if (Math.abs(b.vx) < 0.2) b.vx = 0;
            break;
        }
    };

    World.prototype._moveY = function (b, amount) {
        if (amount === 0) return;
        var prevBottom = b.y + b.h;
        b.y += amount;
        for (var i = 0; i < this.solids.length; i++) {
            var s = this.solids[i];
            if (!s.active) continue;
            if (!overlap(b, s)) continue;
            if (amount > 0) {
                // 下落：单向平台要求上一帧脚底在平台顶面之上（允许 1px 容差）
                if (s.oneWay && prevBottom > s.y + 1) continue;
                b.y = s.y - b.h - EPS;
                b.onGround = true;
            } else {
                if (s.oneWay) continue;
                b.y = s.y + s.h + EPS;
                b.hitCeiling = true;
            }
            b.vy = -b.vy * b.restitution;
            if (Math.abs(b.vy) < 0.2) b.vy = 0;
            break;
        }
    };

    /** 只推进速度不移动（用于自定义控制器接管位移时） */
    World.prototype.applyGravity = function (b, dt) {
        dt = dt == null ? 1 : dt;
        b.vy += this.gravityY * b.gravityScale * dt;
        b.vy = clamp(b.vy, -b.maxSpeed, this.maxFall);
    };

    /**
     * 射线检测（slab 法），返回最近命中 { t, body, x, y, normal } 或 null。
     * from / to 为世界坐标；filter(body) 可返回 false 跳过该实体。
     */
    World.prototype.raycast = function (fromX, fromY, toX, toY, filter) {
        var dx = toX - fromX, dy = toY - fromY;
        var best = null;
        var list = this.solids;
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            if (!s.active) continue;
            if (filter && !filter(s)) continue;
            var tmin = 0, tmax = 1;
            var ok = true;
            // X 轴
            if (Math.abs(dx) < EPS) {
                if (fromX < s.x || fromX > s.x + s.w) ok = false;
            } else {
                var t1 = (s.x - fromX) / dx, t2 = (s.x + s.w - fromX) / dx;
                if (t1 > t2) { var tt = t1; t1 = t2; t2 = tt; }
                tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
                if (tmin > tmax) ok = false;
            }
            // Y 轴
            if (ok && Math.abs(dy) < EPS) {
                if (fromY < s.y || fromY > s.y + s.h) ok = false;
            } else if (ok) {
                var u1 = (s.y - fromY) / dy, u2 = (s.y + s.h - fromY) / dy;
                if (u1 > u2) { var uu = u1; u1 = u2; u2 = uu; }
                tmin = Math.max(tmin, u1); tmax = Math.min(tmax, u2);
                if (tmin > tmax) ok = false;
            }
            if (!ok) continue;
            if (!best || tmin < best.t) {
                best = {
                    t: tmin,
                    body: s,
                    x: fromX + dx * tmin,
                    y: fromY + dy * tmin,
                    normal: this._hitNormal(s, fromX + dx * tmin, fromY + dy * tmin)
                };
            }
        }
        return best;
    };

    World.prototype._hitNormal = function (s, x, y) {
        if (Math.abs(x - s.x) < 1) return { x: -1, y: 0 };
        if (Math.abs(x - (s.x + s.w)) < 1) return { x: 1, y: 0 };
        if (Math.abs(y - s.y) < 1) return { x: 0, y: -1 };
        if (Math.abs(y - (s.y + s.h)) < 1) return { x: 0, y: 1 };
        return { x: 0, y: 0 };
    };

    /** 查询与矩形相交的动态体 */
    World.prototype.queryRect = function (r) {
        var out = [];
        for (var i = 0; i < this.bodies.length; i++) {
            var b = this.bodies[i];
            if (b.active && overlap(b, r)) out.push(b);
        }
        return out;
    };

    /** 查询包含某点的实体（从上到下第一个） */
    World.prototype.queryPoint = function (x, y) {
        for (var i = this.bodies.length - 1; i >= 0; i--) {
            var b = this.bodies[i];
            if (b.active && pointInRect(x, y, b)) return b;
        }
        return null;
    };

    /* ============================================================
     * 二、光照引擎
     * ============================================================ */

    /**
     * LightEngine —— 离屏光照贴图
     *   亮处 = ambient 亮度 + 各光源叠加，最后以 multiply 方式合成到主画布，
     *   因此「光」不会洗白画面，只是把被压暗的区域还原亮度，暗部趋近纯黑。
     *
     * @param {Object} opts
     *   width/height 画布逻辑尺寸（默认取主画布尺寸）
     *   ambient      环境亮度 0~1，1 = 不压暗，0.4 = 夜间（默认 1）
     *   scale        光照贴图分辨率倍率，0.25~1，越小越快（默认 0.5）
     *   blur         光照贴图柔化半径（px，默认 0）
     *   soft         边缘采样半径（阴影采样抖动，0 为硬边，默认 0）
     *   color        环境色 'r,g,b'（默认 '255,255,255'）
     */
    function LightEngine(opts) {
        opts = opts || {};
        this.width = opts.width || 800;
        this.height = opts.height || 400;
        this.ambient = opts.ambient != null ? opts.ambient : 1;
        this.scale = clamp(opts.scale != null ? opts.scale : 0.5, 0.1, 1);
        this.blur = opts.blur || 0;
        this.color = opts.color || '255,255,255';
        this.lights = [];
        this.occluders = [];
        this._occVersion = 0;
        this._nextId = 1;
        this._map = document.createElement('canvas');
        this._map.width = Math.max(1, Math.round(this.width * this.scale));
        this._map.height = Math.max(1, Math.round(this.height * this.scale));
        this._ctx = this._map.getContext('2d');
        this.enabled = true;
    }

    LightEngine.prototype.resize = function (w, h) {
        this.width = w; this.height = h;
        this._map.width = Math.max(1, Math.round(w * this.scale));
        this._map.height = Math.max(1, Math.round(h * this.scale));
        return this;
    };

    /** 环境亮度：0 全黑，1 不压暗 */
    LightEngine.prototype.setAmbient = function (v) {
        this.ambient = clamp(v, 0, 1);
        return this;
    };

    /** 设置会投影的实体（矩形数组），光源会被这些矩形遮挡形成阴影 */
    LightEngine.prototype.setOccluders = function (rects) {
        this.occluders = rects ? rects.slice() : [];
        this._occVersion++;
        for (var i = 0; i < this.lights.length; i++) this.lights[i]._dirty = true;
        return this;
    };

    /**
     * 添加光源。
     * @param {Object} cfg x/y/radius（世界坐标）、color 'r,g,b'、intensity 0~1、
     *                     flicker 闪烁幅度 0~1、phase 相位、shadows 是否投影（默认 true）
     * @returns {Object} 光源对象，可直接改 x/y/intensity
     */
    LightEngine.prototype.addLight = function (cfg) {
        cfg = cfg || {};
        var l = {
            id: this._nextId++,
            x: cfg.x || 0,
            y: cfg.y || 0,
            radius: cfg.radius || 200,
            color: cfg.color || '255,255,255',
            intensity: cfg.intensity != null ? cfg.intensity : 1,
            flicker: cfg.flicker || 0,
            phase: cfg.phase || Math.random() * Math.PI * 2,
            shadows: cfg.shadows !== false,
            on: true,
            _poly: null,
            _polyKey: '',
            _dirty: true
        };
        this.lights.push(l);
        return l;
    };

    LightEngine.prototype.removeLight = function (l) {
        var i = this.lights.indexOf(l);
        if (i >= 0) this.lights.splice(i, 1);
    };

    LightEngine.prototype.clearLights = function () {
        this.lights.length = 0;
        return this;
    };

    /**
     * 每帧渲染。
     * @param {CanvasRenderingContext2D} ctx 主画布上下文
     * @param {Object} camera { x, y }：世界坐标 → 画布坐标的偏移（已绘制场景的相机位置）
     * @param {Number} timeMs 用于闪烁的时间戳
     */
    LightEngine.prototype.render = function (ctx, camera, timeMs) {
        if (!this.enabled) return;
        var camX = camera && camera.x ? camera.x : 0;
        var camY = camera && camera.y ? camera.y : 0;
        var s = this.scale;
        var mctx = this._ctx;
        var mw = this._map.width, mh = this._map.height;

        mctx.setTransform(1, 0, 0, 1, 0, 0);
        mctx.globalCompositeOperation = 'source-over';
        mctx.clearRect(0, 0, mw, mh);

        // 1) 环境亮度铺底
        var a = Math.round(this.ambient * 255);
        mctx.fillStyle = 'rgb(' + a + ',' + a + ',' + a + ')';
        mctx.fillRect(0, 0, mw, mh);

        // 2) 累加各光源（叠加模式，天然 clamp 到白）
        mctx.globalCompositeOperation = 'lighter';
        var t = timeMs == null ? 0 : timeMs;
        for (var i = 0; i < this.lights.length; i++) {
            var l = this.lights[i];
            if (!l.on) continue;
            var inten = l.intensity;
            if (l.flicker > 0) {
                var wobble = Math.sin(t * 0.008 + l.phase) * 0.5 +
                             Math.sin(t * 0.021 + l.phase * 1.7) * 0.5;
                inten = clamp(l.intensity * (1 + wobble * l.flicker), 0, 1);
            }
            if (inten <= 0.001) continue;

            var sx = (l.x - camX) * s;
            var sy = (l.y - camY) * s;
            var sr = l.radius * s;
            if (sx + sr < 0 || sx - sr > mw || sy + sr < 0 || sy - sr > mh) continue; // 视野外剔除

            mctx.save();
            if (l.shadows && this.occluders.length) {
                this._ensurePoly(l, camX, camY);
                if (l._poly && l._poly.length > 2) {
                    // 用可见多边形裁剪，再铺径向渐变
                    mctx.beginPath();
                    mctx.moveTo((l._poly[0].x - camX) * s, (l._poly[0].y - camY) * s);
                    for (var k = 1; k < l._poly.length; k++) {
                        mctx.lineTo((l._poly[k].x - camX) * s, (l._poly[k].y - camY) * s);
                    }
                    mctx.closePath();
                    mctx.clip();
                }
            }
            var g = mctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            g.addColorStop(0, 'rgba(' + l.color + ',' + inten + ')');
            g.addColorStop(0.55, 'rgba(' + l.color + ',' + (inten * 0.55) + ')');
            g.addColorStop(1, 'rgba(' + l.color + ',0)');
            mctx.fillStyle = g;
            mctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
            mctx.restore();
        }

        // 3) 合成：multiply 保证只压暗不洗白
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        if (this.blur > 0 && 'filter' in ctx) ctx.filter = 'blur(' + this.blur + 'px)';
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this._map, 0, 0, this.width, this.height);
        if ('filter' in ctx) ctx.filter = 'none';
        ctx.restore();
    };

    /** 计算光源可见多边形（矩形遮挡，射线打角点 ±ε） */
    LightEngine.prototype._ensurePoly = function (l, camX, camY) {
        var key = l.x + '|' + l.y + '|' + l.radius + '|' + this._occVersion;
        if (!l._dirty && l._polyKey === key) return;
        var occ = this.occluders;
        var pts = [];
        var i, j;
        for (i = 0; i < occ.length; i++) {
            var r = occ[i];
            // 只处理光源附近（半径内）的遮挡物
            var cx = clamp(l.x, r.x, r.x + r.w);
            var cy = clamp(l.y, r.y, r.y + r.h);
            var ddx = cx - l.x, ddy = cy - l.y;
            if (ddx * ddx + ddy * ddy > l.radius * l.radius * 1.4) continue;
            pts.push({ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y },
                     { x: r.x, y: r.y + r.h }, { x: r.x + r.w, y: r.y + r.h });
        }
        if (pts.length === 0) {
            l._poly = null;
            l._polyKey = key;
            l._dirty = false;
            return;
        }
        // 收集候选角度：整圈均匀采样（保证多边形闭合覆盖全向光）+ 各矩形角点 ±ε（保证阴影边界锐利）
        var angles = [];
        var RING = 96;
        for (i = 0; i < RING; i++) angles.push(-Math.PI + (i * 2 * Math.PI) / RING);
        for (i = 0; i < pts.length; i++) {
            var ang = Math.atan2(pts[i].y - l.y, pts[i].x - l.x);
            angles.push(ang - 0.0006, ang, ang + 0.0006);
        }
        angles.sort(function (p, q) { return p - q; });

        var poly = [];
        var lastAng = -1e9;
        for (i = 0; i < angles.length; i++) {
            var a = angles[i];
            if (a - lastAng < 1e-6) continue; // 去掉重复角度，避免退化顶点
            lastAng = a;
            var dx = Math.cos(a), dy = Math.sin(a);
            var dist = l.radius;
            for (j = 0; j < occ.length; j++) {
                var hit = raySegBox(l.x, l.y, dx, dy, occ[j], dist);
                if (hit != null && hit < dist) dist = hit;
            }
            poly.push({ x: l.x + dx * dist, y: l.y + dy * dist });
        }
        l._poly = poly;
        l._polyKey = key;
        l._dirty = false;
    };

    /** 射线与矩形求交，返回最近距离或 null */
    function raySegBox(ox, oy, dx, dy, r, maxDist) {
        var tmin = 0, tmax = maxDist, t1, t2, tmp;
        if (Math.abs(dx) < EPS) {
            if (ox < r.x || ox > r.x + r.w) return null;
        } else {
            t1 = (r.x - ox) / dx; t2 = (r.x + r.w - ox) / dx;
            if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; }
            tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
            if (tmin > tmax) return null;
        }
        if (Math.abs(dy) < EPS) {
            if (oy < r.y || oy > r.y + r.h) return null;
        } else {
            t1 = (r.y - oy) / dy; t2 = (r.y + r.h - oy) / dy;
            if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; }
            tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
            if (tmin > tmax) return null;
        }
        return tmin <= 0 ? null : tmin;
    }

    /* ============================================================
     * 三、导出
     * ============================================================ */
    global.WSPhysics = {
        World: World,
        Body: Body,
        overlap: overlap,
        pointInRect: pointInRect,
        rectHitsAny: rectHitsAny,
        clamp: clamp,
        version: '1.0.0'
    };

    global.WSLight = {
        LightEngine: LightEngine,
        version: '1.0.0'
    };

    // 允许在控制台快速试跑：WSPhysics · WSLight
})(window);
