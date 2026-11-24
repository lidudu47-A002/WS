/* =====================================================================
 * hud-template.js —— 场景 HUD 公共片段
 * 优化清单第 19 条：Black room.html / prison.html 两份 HTML 的 body 结构
 * 89% 重复（状态面板 / 商店 / 确认框 / 提示条 / canvas），抽成本片段。
 *
 * 为什么用 document.write 而不是 fetch：
 *   本项目为纯前端 file:// 直接打开，file 协议下 fetch / XHR 读本地文件
 *   会被同源策略拦截，因此公共片段以「同步写入」的方式内联到 body。
 *   写入时机在解析期，晚于 HUD 的内联初始化脚本之前，DOM 顺序与原来一致。
 * ===================================================================== */

document.write([
'<div class="game-wrapper">',
'    <div class="status-panel" id="statusPanel">',
'        <h2>角色状态</h2>',
'        <div class="status-row"><span class="status-label">LV</span><span class="status-value" id="panelLevel">1</span></div>',
'        <div class="status-row"><span class="status-label">EXP</span><span class="status-value" id="panelExp">0/100</span></div>',
'        <div class="status-row"><span class="status-label">金币</span><span class="status-value" id="panelGold">0</span></div>',
'        <div class="status-row"><span class="status-label">杀敌数</span><span class="status-value" id="panelKills">0</span></div>',
'        <div class="status-row"><span class="status-label">当前区块</span><span class="status-value" id="panelChunk">0</span></div>',
'        <div class="status-row"><span class="status-label">攻击力(普攻)</span><span class="status-value" id="panelAtk">10</span></div>',
'        <div class="status-row"><span class="status-label">技能倍率</span><span class="status-value" id="panelMult">x1.00</span></div>',
'        <div class="close-hint">松开 F 关闭</div>',
'    </div>',
'',
'    <div id="shopPanel" class="shop-panel">',
'        <div class="shop-content">',
'            <div class="boss-image"></div>',
'            <h2>🛒 黑市商店</h2>',
'            <div class="items-container">',
'                <div class="shop-item-card" data-item="hp">',
'                    <div class="shop-item-icon"><img src="../公用文件/图片/商店/HP药水.png" alt="HP药水"></div>',
'                    <div class="shop-item-name">HP药水</div>',
'                    <div class="shop-item-price">30 金币</div>',
'                </div>',
'                <div class="shop-item-card" data-item="normalAtk">',
'                    <div class="shop-item-icon"><img src="../公用文件/图片/商店/normal attack药水.png" alt="普攻药水"></div>',
'                    <div class="shop-item-name">普攻药水</div>',
'                    <div class="shop-item-price">100 金币</div>',
'                </div>',
'                <div class="shop-item-card" data-item="skill">',
'                    <div class="shop-item-icon"><img src="../公用文件/图片/商店/skill药水.png" alt="技能药水"></div>',
'                    <div class="shop-item-name">技能药水</div>',
'                    <div class="shop-item-price">50 金币</div>',
'                </div>',
'            </div>',
'            <div class="close-shop"><div class="close-shop-btn" id="closeShopBtn">关闭商店</div></div>',
'        </div>',
'    </div>',
'',
'    <div id="confirmModal" class="confirm-modal">',
'        <div class="confirm-content">',
'            <div id="confirmIcon" class="confirm-icon"></div>',
'            <div id="confirmText" class="confirm-text">购买 HP药水？</div>',
'            <div class="confirm-buttons">',
'                <div id="confirmBuy" class="confirm-buy">购买</div>',
'                <div id="confirmCancel" class="confirm-cancel">取消</div>',
'            </div>',
'        </div>',
'    </div>',
'',
'    <div class="victory-message" id="victoryMessage">胜利！</div>',
'    <div id="nextMapBtn" style="display: none;"></div>',
'    <div class="save-message" id="saveMessage">✨ 游戏已保存 ✨</div>',
'    <div class="respawn-message" id="respawnMessage">💀 从存档点复活 💀</div>',
'    <div class="load-message" id="loadMessage">📂 存档加载成功 📂</div>',
'    <canvas id="gameCanvas" width="800" height="400"></canvas>',
'</div>'
].join('\n'));
