# 白色方块的冒险 · 0.0.05-A0.5

纯前端本地 Web 游戏（HTML + Canvas），无后端、无打包步骤，进度保存在浏览器 localStorage。
版本号唯一来源为 `公用文件/js/version.js`；页面中用 `data-ws-version` 标记的元素会被自动注入版本号，禁止再手写版本字符串。

## 运行方式

1. 直接用浏览器打开根目录 `white square.html`；
2. 或在本目录起一个静态服务器（推荐，避免 `file://` 下部分资源与 fetch 受限），例如：
   `python -m http.server 8000`，然后访问 `http://localhost:8000/white square.html`。

入口链路：`white square.html` → 游客模式进 `tutorial/`，或登录进 `主页/` → 选择场景 → 落到 `game.html?scene=black|prison`。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `white square.html` | 入口页（游客模式 / 登录） |
| `主页/` | 账号系统（`auth.js`）、管理员后台（`admin.js`） |
| `game.html` | **主场景唯一入口**：`game.html?scene=black\|prison`，按清单动态注入脚本 |
| `Black room/` | 黑屋场景：**仅** `js/scene-config.js`（`Black room.html` 仅为兼容旧链接的转发壳） |
| `prison/` | 监狱场景：**仅** `js/scene-config.js`（`prison.html` 仅为兼容旧链接的转发壳） |
| `tutorial/` | 新手教程（`newbie.js` / `tutorial.js`） |
| `公用文件/js/` | 跨场景公用模块：渲染、战斗、道具、宠物、指令系统、存储键名、版本 |
| `公用文件/js/scene-core/` | 两场景共用脚本（9 个）：`constants.js`、`player.js`、`enemy.js`、`game-state.js`、`pet.js`、`pet-ui.js`、`game-loop.js`、`shop-system.js`、`ui-display.js`，单份共用 |
| `公用文件/js/script-manifest.js` | 场景脚本清单（唯一加载顺序来源，含 `{scene}` / `{core}` 占位符） |
| `公用文件/js/scene-boot.js` | 单入口引导器：按清单顺序注入脚本 |
| `公用文件/js/hud-template.js` | 公共 HUD 片段（`document.write` 同步写入，`file://` 下无 fetch 限制） |
| `公用文件/js/scene-finalize.js` | 初始化收尾：按 `WS_SCENE_CONFIG` 执行地图尺寸/天赋/成就/主循环/终局跳转 |
| `公用文件/boss-battle/` | BOSS 战子系统，`index.html?scene=blackroom\|prison` 决定场景 |
| `公用文件/css/`、`公用文件/图片/`、`公用文件/音乐/` | 样式与资源 |

两套主场景（Black room / prison）已合流为单入口（清单第 10、19 条）：

- HTML 只剩一份 `game.html`，HUD 抽到 `hud-template.js`，两场景不再各自维护 HTML；
- 脚本清单集中在 `script-manifest.js`，新增/删除脚本只改这里一处；
- 全部同名脚本已移入 `公用文件/js/scene-core/`（共 9 个），场景目录不再保留任何副本；
- 场景目录**只留** `scene-config.js`，两场景的行为差异全部收敛为该文件的配置字段：`id` / `title` / `mapChunks` / `saveMap` / `bgm` / `finalRedirect` / `deco` / `blackNaturalSpawn`；
- `Black room.html`、`prison.html` 改为转发壳，保留原 URL 参数（`?load=`、`?guest=` 等）后跳到 `game.html`。

## 存档与存储键名

键名的唯一来源是 `公用文件/js/storage-keys.js`（`window.WS_KEYS` / `window.WS_STORAGE`），任何模块禁止手写键名字符串。

| 常量 | 键名 | 位置 | 内容 |
| --- | --- | --- | --- |
| `USERS` | `ws_users` | localStorage | 用户表（含 `hash`、`salt`、`role`、`canSave`） |
| `TOKEN` | `ws_token` | sessionStorage | 登录令牌（Base64 JSON：`username` / `role` / `canSave` / `exp`） |
| `PENDING_SAVE` | `ws_pending_save` | localStorage | 待导入的存档文件内容 |
| `SAVE` | `black_room_prison_save` | localStorage | 游戏主存档（两场景共用） |

`ws_accounts` / `ws_current_user` 为已废弃旧键名，`storage-keys.js` 会在启动期自动迁移到上表键名（不删除旧数据）。
存档权限判定统一走 `WS_STORAGE.canSave()`：读取 `ws_token` 解码后的 `canSave` 字段，未登录（游客/单机）不限制。

存档导出采用短键名压缩（映射表见 `game-state.js` 的 `KEY_MAP`），导入时按 `saveObj.mp` 是否存在判断是否为压缩格式。

## 控制台指令

按 `R` · `W` · `S` · `C`（依次按下）唤出指令输入框，实现见 `公用文件/js/console-hijack.js` 与 `console-ui.js`。
可用指令：`help`、`give <道具>`、`summon <数量> <block|black>`（可接 `~~~ <武器>`）、`st summon`、`kill`、`bm`、`tune LV =`、`image <名称|reset>`。
该控制台会以 `new Function` 注入游戏变量，属单机作弊工具，不具备任何安全边界。

**显式开关**（清单第 21 条）：默认开启，可用 URL 参数 `?console=off` 或 `localStorage.ws_console_enabled = '0'` 关闭；
运行时调用 `WS_setConsoleEnabled(false)` 写入开关，刷新后生效，当前状态见 `window.WS_CONSOLE_ENABLED`。
关闭后仅屏蔽 UI 与执行入口并补齐被屏蔽的全局符号，不影响游戏本体；如要彻底移除，构建时剔除 `console-ui.js` 与 `console-hijack.js`。

## 已知工程约束

- 全项目为传统 `<script>` 全局脚本，跨文件依赖依赖加载顺序：`公用文件/js/script-manifest.js` 里的 26 条顺序即唯一准绳，`scene-config.js` 必须最先、`scene-finalize.js` 必须最后，中间顺序不可随意调整。
- 鉴权为纯前端实现，token 未签名、用户表明文存 localStorage，只能视为"本地玩家档案"，不能当真实权限。
- 建议改动前用 Git 管理；历史手工备份文件不要再放进 `js/` 目录。
- BOSS 战音乐（`公用文件/音乐/**`）使用 `preload = 'none'` 按需加载，首次 `play()` 才读盘，避免进入场景即占用带宽与解码（清单第 14 条）。
- 资源引用可随时用 `check_assets.py` 校验（见仓库外工具目录），脚本只读、不修改任何文件。

## 单入口场景合流

```
game.html?scene=black|prison
  ├─ <head> 内联：解析 scene → window.WS_SCENE_ID / window.__WS_SCENE__
  ├─ <base href="场景目录/">    ← 场景内相对路径（贴图、音乐、json）按场景解析
  ├─ hud-template.js            ← 公共 HUD（document.write）
  ├─ script-manifest.js         ← 脚本清单
  └─ scene-boot.js              ← 按清单顺序 document.write 注入
        scene-config.js（每场景第一）
        … 21 个公共/差异化脚本 …
        scene-finalize.js（每场景最后）
```

新增一个场景脚本的步骤：默认放 `公用文件/js/scene-core/`（两场景共用），确属单场景专有才放该场景目录的 `js/`，再在 `script-manifest.js` 对应位置插入一行，两个场景自动同步生效。

**场景差异一律走配置**：需要区分两场景时，在 `scene-config.js` 增字段（如 `blackNaturalSpawn`），脚本里读 `window.WS_SCENE_CONFIG` 分支，禁止再复制一份脚本进场景目录——否则等于退回第 10 条要消除的双份维护。

`scene-config.js` 只允许出现配置与装饰数据（禁止依赖后续脚本的调用），字段：`id` / `title` / `mapChunks` / `saveMap` / `bgm` / `finalRedirect` / `deco`。
场景判定统一用 `window.WS_isPrison()`，禁止再用 `location.pathname.includes('prison')`；跨场景跳转用 `window.WS_url(path)` 解析，避免 `<base>` 影响相对路径。
