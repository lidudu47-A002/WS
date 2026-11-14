// 全局设置管理（帧率限制）—— 适用于黑屋BOSS战
(function() {
    let settings = {
        fpsLimit: 0        // 0=无限制, 30, 60, 144
    };
    
    function loadSettings() {
        const stored = localStorage.getItem('boss_battle_settings');
        if (stored) {
            try {
                const s = JSON.parse(stored);
                if (s.fpsLimit !== undefined) settings.fpsLimit = s.fpsLimit;
            } catch(e) {}
        }
    }
    
    function saveSettings() {
        localStorage.setItem('boss_battle_settings', JSON.stringify(settings));
    }
    
    function getFPSLimit() {
        return settings.fpsLimit;
    }
    
    function setFPSLimit(limit) {
        settings.fpsLimit = limit;
        saveSettings();
    }
    
    // 创建设置面板（HTML元素）
    let settingsPanel = null;
    function ensureSettingsPanel() {
        if (settingsPanel) return settingsPanel;
        const panel = document.createElement('div');
        panel.id = 'bossSettingsPanel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1e1e2e;
            border: 2px solid gold;
            border-radius: 16px;
            padding: 20px;
            width: 320px;
            z-index: 3000;
            color: white;
            box-shadow: 0 0 30px black;
            font-family: monospace;
            display: none;
        `;
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #555; padding-bottom: 8px;">
                <h3 style="margin:0;">⚙️ 设置</h3>
                <button id="closeSettingsPanelBtn" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">✖</button>
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">帧率限制（帧/秒）</label>
                <select id="fpsLimitSelect" style="padding: 6px; width: 100%; background: #2a2a3a; color: white; border: 1px solid #5a5a8a; border-radius: 8px;">
                    <option value="0">无限制</option>
                    <option value="30">30</option>
                    <option value="60">60</option>
                    <option value="144">144</option>
                </select>
                <div style="font-size: 0.7rem; color: #aaa; margin-top: 5px;">* 限制帧率可降低CPU/GPU占用</div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="saveSettingsBtn" style="background: #2a6d4c; border: none; padding: 6px 20px; border-radius: 20px; color: white; cursor: pointer;">保存</button>
            </div>
        `;
        document.body.appendChild(panel);
        settingsPanel = panel;
        
        // 绑定事件
        const closeBtn = panel.querySelector('#closeSettingsPanelBtn');
        const fpsSelect = panel.querySelector('#fpsLimitSelect');
        const saveBtn = panel.querySelector('#saveSettingsBtn');
        
        closeBtn.onclick = () => { panel.style.display = 'none'; };
        saveBtn.onclick = () => {
            const newLimit = parseInt(fpsSelect.value);
            setFPSLimit(newLimit);
            alert('设置已保存');
            panel.style.display = 'none';
        };
        
        // 点击空白区域关闭
        document.addEventListener('click', (e) => {
            if (panel.style.display === 'block' && !panel.contains(e.target) && e.target !== document.getElementById('settingsBtn')) {
                panel.style.display = 'none';
            }
        });
        
        return panel;
    }
    
    function openSettingsPanel() {
        const panel = ensureSettingsPanel();
        const fpsSelect = document.getElementById('fpsLimitSelect');
        if (fpsSelect) fpsSelect.value = settings.fpsLimit;
        panel.style.display = 'block';
    }
    
    // 监听 Q 键（KeyQ）
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyQ') {
            e.preventDefault();
            openSettingsPanel();
        }
    });
    
    // 暴露全局 API
    window.WSSettings = {
        loadSettings,
        getFPSLimit,
        setFPSLimit,
        openSettingsPanel
    };
    
    loadSettings();
})();