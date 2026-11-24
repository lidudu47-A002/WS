// ---------- 受击延迟结算（DoT）公用模块 ----------
// 规则：敌人受到伤害时不立即扣血，而是转为 DoT 在 1 秒内扣完
//   受到伤害 = TD，每秒扣血 DoT = TD
//   等价于：每 (1 / TD) 秒扣 1 HP，全部伤害在 1 秒内结算完毕
// 用法：Dot.deal(敌人对象, 伤害值)  替换原来的  e.hp -= 伤害
//       主循环每帧调用 Dot.update(距离上一帧的秒数)
(function () {
    'use strict';

    // 总结算时长（秒）：1 = 全部伤害在 1 秒内扣完
    const DOT_TOTAL_SEC = 1;
    // 单帧最大推进时间，防止切后台回来后一帧把血扣穿
    const MAX_STEP_SEC = 0.25;

    const list = [];

    const Dot = {
        // 每秒扣血量：DoT = TD / 结算时长
        rate: function (td) {
            return Math.max(1, td) / DOT_TOTAL_SEC;
        },
        // 该次伤害完全扣完所需秒数
        duration: function (td) {
            return DOT_TOTAL_SEC;
        },
        // 登记一次伤害（不立即扣血）
        deal: function (target, amount) {
            if (!target || !(amount > 0)) return 0;
            if (typeof target.hp === 'number' && target.hp <= 0) return 0;
            var td = Math.max(1, Math.round(amount));
            list.push({ t: target, left: td, rate: this.rate(td) });
            target._dotPending = (target._dotPending || 0) + td;
            return td;
        },
        // 待结算总量
        pending: function (target) {
            return target ? (target._dotPending || 0) : 0;
        },
        // 每帧结算（dt 单位为秒）
        update: function (dt) {
            if (!list.length || !(dt > 0)) return;
            if (dt > MAX_STEP_SEC) dt = MAX_STEP_SEC;
            for (var i = list.length - 1; i >= 0; i--) {
                var d = list[i];
                var tg = d.t;
                if (!tg || (typeof tg.hp === 'number' && tg.hp <= 0)) {
                    list.splice(i, 1);
                    continue;
                }
                // 小数进度先记在 acc 里，攒满 1 点才真正扣血
                // 保证 hp / _dotPending 全程为整数，不产生小数点误差
                d.acc = (d.acc || 0) + d.rate * dt;
                var steps = Math.floor(d.acc);
                if (steps > 0) {
                    d.acc -= steps;
                    var drain = Math.min(steps, d.left);
                    d.left -= drain;
                    tg.hp -= drain;
                    tg._dotPending = Math.max(0, (tg._dotPending || 0) - drain);
                    if (tg.hp < 0) tg.hp = 0;
                }
                if (d.left <= 0) list.splice(i, 1);
            }
        },
        // 清空（重开/切场景）
        clear: function () {
            list.length = 0;
        }
    };

    window.Dot = Dot;
})();
