---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 6068b4c518095d160361f8f4a0dc8946_abc955ddd53e11f1a0da525400393706
    ReservedCode1: HZFGcXHzeSVx557FwZf6OPSMiqbH1he7yG3E5EIJR/fInyOvaeJoZswfPTFBmZodU2NSE9kWiCON+Nje6SpTeOyL+Ta5vGmSJpARmWEhNVsAFHPASFOfciGWMsTjAA7J5UCozcsC6vLa/8Y2mSewzpOT7YJQOIGlSVWCDUg2pKm4CHgsFvRJlNOIN24=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 6068b4c518095d160361f8f4a0dc8946_abc955ddd53e11f1a0da525400393706
    ReservedCode2: HZFGcXHzeSVx557FwZf6OPSMiqbH1he7yG3E5EIJR/fInyOvaeJoZswfPTFBmZodU2NSE9kWiCON+Nje6SpTeOyL+Ta5vGmSJpARmWEhNVsAFHPASFOfciGWMsTjAA7J5UCozcsC6vLa/8Y2mSewzpOT7YJQOIGlSVWCDUg2pKm4CHgsFvRJlNOIN24=
---

# BOSS 战 · 2.5D 实时战斗（公用模块）

Black room 与 prison 共用本目录全部代码与素材。进入 BOSS 战时切换到 **64×64 等距大地图**，视角自南向北，全程实时战斗（无回合制）。

## 一、核心设计

| 项 | 说明 |
|---|---|
| 地图 | 64×64 格，外围 2 格实心墙，中部石柱列与断墙构成掩体，北侧为祭坛 |
| 视角 | 等距 2.5D，屏幕上方 = 世界 (-1,-1)；玩家出生在 (32, 58) 南侧，BOSS 驻守祭坛 (32, 8.2) |
| 节奏 | 实时制，无回合切换；进场演出约 1.5s 后进入战斗 |
| 轨道 | BOSS 三阶段（按血量阈值切换），技能池随阶段扩张 |
| 格子 | TW=56 / TH=28 / HU=46，整体缩放随窗口自适应（0.45~1.45） |

## 二、操作

| 输入 | 动作 |
|---|---|
| W A S D / 方向键 | 八向移动（等距步进） |
| 鼠标移动 | 瞄准 |
| 鼠标左键（按住） | 能量弹连发，0.30s 间隔 |
| 空格 | 冲刺（0.17s，15.5 格/秒，冷却 1.15s，冲刺中无敌帧） |
| E | 近战横挥（扇形 2.15 格，冷却 0.42s） |
| Q | 喝 HP 药水（+20，冷却后可再用） |

## 三、BOSS 技能

| 技能 | 说明 |
|---|---|
| volley 扇形弹幕 | 朝玩家方向散开的多发圆弹 |
| rain 落雨弹 | 全场随机落点延迟爆炸 |
| beam 龙骨炮 | 蓄力后直线激光扫射 |
| windmill 风车激光 | 绕 BOSS 旋转的多臂激光，持续 0.8s |
| ring 环爆 | 以 BOSS 为中心的多层扩散环 |
| charge 冲撞 | 锁定玩家方向后高速冲刺，撞到玩家造成伤害 |

阶段 1：volley / rain；阶段 2：volley / rain / beam / ring；阶段 3：全部六种技能 + 更大弹量，技能冷却缩短至 0.9~1.6s（阶段 1 为 1.5~2.3s，阶段 2 为 1.2~2.0s）。

## 四、目录结构

```
公用文件/boss-battle/
├─ index.html          入口（?scene=blackroom|prison&lv=等级）
├─ style.css           页面/HUD/扫描线/暗角样式
├─ pixel-paint.html    素材绘制工具（桌面版副本，可直接打开改图）
├─ js/
│  ├─ terrain.js       64×64 地图生成、碰撞（isSolid/tryMove/collideCircle）、装饰点
│  ├─ config.js        场景常量、存档继承（长短键兼容）、实体与弹幕容器
│  ├─ iso.js           等距投影 proj/unproj、地台烘焙、可见范围裁剪
│  ├─ assets.js        统一加载 assets/ 下全部 PNG
│  ├─ boss-ai.js       状态机（idle/volley/rain/beam/windmill/ring/charge）与弹幕更新
│  ├─ combat.js        射击/近战/冲刺/喝药、伤害结算、装备效果、胜负结算
│  ├─ render.js        场景/实体/HUD/小地图/进场演出绘制
│  ├─ battle.js        主循环、键鼠输入、相机跟随
│  ├─ settings.js      全局设置（BOSS 音乐开关，复制自旧版）
│  └─ music.js         BOSS 音乐（复制自旧版）
└─ assets/             全部 PNG 素材（游戏直接引用）
   └─ source/          同名 JSON 源文件，可用 pixel-paint.html 导入继续编辑
```

## 五、素材清单

| 文件 | 尺寸 | 用途 |
|---|---|---|
| floor.png / floor_dark.png / floor_glow.png | 32×16 | 地面菱形砖（常规 / 暗色 / 靠近 BOSS 发光） |
| wall.png | 32×32 | 场景墙块 |
| crystal.png | 8×14 | 角落水晶装饰（带缓动光晕） |
| boss_black.png / boss_prison.png | 24×32 | 两个场景的 BOSS 本体 |
| player.png | 12×16 | 玩家（灵魂形态） |
| soul_red.png / soul_blue.png / soul_yellow.png | 10×10 | 灵魂弹 |
| orb.png / orb_blue.png | 8×8 | 圆弹（红 / 蓝） |
| bone.png | 4×12 | 骨弹 |
| blaster.png | 16×12 | 龙骨炮 |

## 六、改素材流程

1. 打开 `公用文件/boss-battle/pixel-paint.html`（或桌面上同名文件）。
2. 「导入」→ 选择 `assets/source/<名字>.json`。
3. 改完「导出 PNG」，覆盖 `assets/<名字>.png` 即可，无需改代码。
4. 若改了尺寸，`render.js` 中的 sprite 目标宽高按比例自动适配；地面砖必须保持 32×16 才能无缝拼接菱形网格。

## 七、接入方式

- Black room：`Black room/js/game-loop.js` 玩家与 BOSS 距离 ≤120 时导出存档后跳转
  `../公用文件/boss-battle/index.html?scene=blackroom&lv=<等级>`
- prison：`prison/js/game-loop.js` 同上，参数为 `scene=prison`
- 战斗数值从 `localStorage['black_room_prison_save']` 继承：等级（lv/level）、当前武器（cw/currentWeapon）、十字架（hc/hasCross）、小丑面具（hcm/hasClownMask）、HP 药水（is/inventorySlots 中 type=hp 的数量）。
- 胜利：写入 `bd=true`（bossDefeated）后，Black room → `../../prison/prison.html?load=black`；prison → `../../prison/prison.html`。
- 失败：留在原地「重新开始」（重载页面）。

## 八、性能说明

本机为 i7-950（无 AVX），渲染已做以下优化：
- 地台菱形整图离屏烘焙，按缩放级别复用，不逐帧重建。
- 背景、暗角、扫描线按视口尺寸缓存；火盆/水晶预渲染为精灵并按缩放缓存。
- 可见格裁剪（visibleBounds），只绘制视口内的地块与实体。
- 实测：Black room 空场 42 FPS、三阶段弹幕战 32.5 FPS；prison 36.5 FPS（1280×800 无头 Chrome 软件渲染，实际 GPU 环境更高）。

*（内容由AI生成，仅供参考）*
