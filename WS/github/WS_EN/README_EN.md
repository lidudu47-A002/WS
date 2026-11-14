---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 6068b4c518095d160361f8f4a0dc8946_bdad061cdac211f19232525400248c00
    ReservedCode1: Py7bjL9UjVFDbFErztaMJZfzNIKYVY4W4ZJDCWxudC7w2pRMVdSk3KrQg9qMbyCOqgns34hOu9mg5/eFRbq3V5wuAn5act4qNv5Miy7o1herjoaLtMTqjCq/noSrMZZH1G5TeJgT6wTISmH7wo+AOSunHBL7S37NMuSTAker4pDkKeytJXjHBAPKzd4=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 6068b4c518095d160361f8f4a0dc8946_bdad061cdac211f19232525400248c00
    ReservedCode2: Py7bjL9UjVFDbFErztaMJZfzNIKYVY4W4ZJDCWxudC7w2pRMVdSk3KrQg9qMbyCOqgns34hOu9mg5/eFRbq3V5wuAn5act4qNv5Miy7o1herjoaLtMTqjCq/noSrMZZH1G5TeJgT6wTISmH7wo+AOSunHBL7S37NMuSTAker4pDkKeytJXjHBAPKzd4=
---

# The Adventure of the White Square — English Build

This folder is the fully localized English build of the original Chinese project.
The original project is untouched at: C:\Users\Administrator\Desktop\WS

## How to run
Open any of the entry pages directly in a browser (Chrome / Edge):

| Entry | File |
| --- | --- |
| Launcher / account | 主页\index.html |
| Black room (main game) | Black room\Black room.html |
| Prison (second scene) | prison\prison.html |
| Tutorial hub | tutorial\index.html |
| Newbie tutorial | tutorial\newbie.html |
| Boss battle (2.5D) | 公用文件\boss-battle\index.html |
| Pixel painter tool | 公用文件\boss-battle\pixel-paint.html |
| Legacy single file | white square.html |

Because the game loads assets with relative paths and reads some JSON, open it through a
local web server rather than file:// if the browser blocks local fetches:

    cd C:\Users\Administrator\Desktop\WS_EN
    python -m http.server 8000
    then visit http://127.0.0.1:8000/主页/index.html

## Localization scope
- All player-visible text translated: menus, HUD, dialogs, alerts, tooltips, achievements,
  talents, shop, gacha panel, pets, tutorial chapters, admin console, settings, painter tool.
- Emoji, template placeholders (${...}) and inline code were preserved.
- Asset paths and folder names were NOT renamed (still Chinese, e.g. 公用文件\图片\...), so
  every sprite / music reference keeps working.
- Developer code comments remain in Chinese; they are invisible in game and are kept as-is.
- Existing save data in localStorage stores Chinese item names; new saves use English names.

## Build/QA
- 49 JS files pass `node --check` (0 syntax errors).
- 10 HTML entry pages load with 0 page errors in headless Edge (Chromium).
- Screenshot QA of HUD, inventory, pet, talent, achievement, shop, console, tutorial,
  boss battle and painter pages: no Chinese characters detected in rendered UI.
*（内容由AI生成，仅供参考）*
