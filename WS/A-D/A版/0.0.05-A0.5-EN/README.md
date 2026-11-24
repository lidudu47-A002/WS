# 白色方块的冒险 · 0.0.05-A0.5

纯前端本地 Web 游戏（HTML + Canvas），无后端、无打包步骤，进度保存在浏览器 localStorage。
版本号唯一来源为 `公用文件/js/version.js`；页面中用 `data-ws-version` 标记的元素会被自动注入版本号，禁止再手写版本字符串。

## 运行方式

1. 直接用浏览器打开根目录 `white square.html`；
2. 或在本目录起一个静态服务器（推荐，避免 `file://` 下部分资源与 fetch 受限），例如：
   `python -m http.server 8000`，然后访问 `http://localhost:8000/white square.html`。

入口链路：`white square.html` → 游客模式进 `tutorial/`，或登录进 `主页/` → 选择 Black room / prison 场景。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `white square.html` | 入口页（游客模式 / 登录） |
| `主页/` | 账号系统（`auth.js`）、管理员后台（`admin.js`） |
| `Black room/` | 黑屋场景：`Black room.html` + 22 个场景脚本 |
| `prison/` | 监狱场景：`prison.html` + 22 个场景脚本 |
| `tutorial/` | 新手教程（`newbie.js` / `tutorial.js`） |
| `公用文件/js/` | 跨场景公用模块：渲染、战斗、道具、宠物、指令系统、存储键名、版本 |
| `公用文件/boss-battle/` | BOSS 战子系统，`index.html?scene=blackroom\|prison` 决定场景 |
| `公用文件/css/`、`公用文件/图片/`、`公用文件/音乐/` | 样式与资源 |

两套主场景（Black room / prison）当前各自保留一份脚本副本，同名文件差异极小（`shop-system.js`、`ui-display.js` 完全一致）。

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

- 全项目为传统 `<script>` 全局脚本，跨文件依赖依赖加载顺序（页面内 25 个脚本的顺序不可随意调整）。
- 鉴权为纯前端实现，token 未签名、用户表明文存 localStorage，只能视为"本地玩家档案"，不能当真实权限。
- 建议改动前用 Git 管理；历史手工备份文件不要再放进 `js/` 目录。
- BOSS 战音乐（`公用文件/音乐/**`）使用 `preload = 'none'` 按需加载，首次 `play()` 才读盘，避免进入场景即占用带宽与解码（清单第 14 条）。
- 资源引用可随时用 `check_assets.py` 校验（见仓库外工具目录），脚本只读、不修改任何文件。
