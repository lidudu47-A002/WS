// 全局设置管理（帧率、BOSS战音乐开关）—— 适用于所有页面
(function() {
    let settings = {
        fpsLimit: 0,        // 0=无限制, 30, 60, 144
        bossMusicEnabled: true
    };
    
    function loadSettings() {
        const stored = localStorage.getItem('ws_global_settings');
        if (stored) {
            try {
                const s = JSON.parse(stored);
                if (s.fpsLimit !== undefined) settings.fpsLimit = s.fpsLimit;
                if (s.bossMusicEnabled !== undefined) settings.bossMusicEnabled = s.bossMusicEnabled;
            } catch(e) {}
        }
        applyMusicState();
    }
    
    function saveSettings() {
        localStorage.setItem('ws_global_settings', JSON.stringify(settings));
    }
    
    function getFPSLimit() {
        return settings.fpsLimit;
    }
    
    function setFPSLimit(limit) {
        settings.fpsLimit = limit;
        saveSettings();
    }
    
    function isBossMusicEnabled() {
        return settings.bossMusicEnabled;
    }
    
    function setBossMusicEnabled(enabled) {
        settings.bossMusicEnabled = enabled;
        saveSettings();
        applyMusicState();
    }
    
    function applyMusicState() {
        if (typeof Music !== 'undefined') {
            if (!Music.setEnabled) {
                // 为 Music 对象添加开关方法
                Music._enabled = settings.bossMusicEnabled;
                Music.setEnabled = function(enabled) {
                    this._enabled = enabled;
                    if (!enabled && this.isPlaying) this.stop();
                };
                const originalPlay = Music.play;
                Music.play = function() {
                    if (this._enabled) originalPlay.call(this);
                };
                Music.isPlaying = false;
                const originalStop = Music.stop;
                Music.stop = function() {
                    originalStop.call(this);
                    this.isPlaying = false;
                };
            }
            Music.setEnabled(settings.bossMusicEnabled);
        }
    }
    
    // 暴露全局 API
    window.WSSettings = {
        loadSettings,
        getFPSLimit,
        setFPSLimit,
        isBossMusicEnabled,
        setBossMusicEnabled,
        applyMusicState,
        openSettingsPanel  // 便于控制台测试
    };
    
    // 创建/获取设置面板元素
    let settingsPanel = null;
    function ensureSettingsPanel() {
        if (settingsPanel) return settingsPanel;
        const panel = document.createElement('div');
        panel.id = 'globalSettingsPanel';
        panel.className = 'settings-panel';
        panel.style.display = 'none';
        panel.innerHTML = `
            <div class="settings-header">
                <h3>⚙️ 全局设置</h3>
                <button id="closeSettingsPanel">✖</button>
            </div>
            <div class="settings-item">
                <label>帧率限制（帧/秒）</label>
                <select id="fpsLimitSelect">
                    <option value="0">无限制</option>
                    <option value="30">30</option>
                    <option value="60">60</option>
                    <option value="144">144</option>
                </select>
                <div class="hint">* 限制帧率可降低CPU/GPU占用，游戏将按此帧率运行</div>
            </div>
            <div class="settings-item">
                <label>BOSS战音乐</label>
                <input type="checkbox" id="bossMusicCheckbox"> 开启
            </div>
            <div class="settings-footer">
                <button id="saveSettingsBtn">保存</button>
            </div>
        `;
        document.body.appendChild(panel);
        settingsPanel = panel;
        
        // 绑定事件
        const closeBtn = panel.querySelector('#closeSettingsPanel');
        const fpsSelect = panel.querySelector('#fpsLimitSelect');
        const musicCheck = panel.querySelector('#bossMusicCheckbox');
        const saveBtn = panel.querySelector('#saveSettingsBtn');
        
        closeBtn.onclick = () => { panel.style.display = 'none'; };
        saveBtn.onclick = () => {
            const newLimit = parseInt(fpsSelect.value);
            const newMusic = musicCheck.checked;
            setFPSLimit(newLimit);
            setBossMusicEnabled(newMusic);
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
        const musicCheck = document.getElementById('bossMusicCheckbox');
        if (fpsSelect) fpsSelect.value = settings.fpsLimit;
        if (musicCheck) musicCheck.checked = settings.bossMusicEnabled;
        panel.style.display = 'block';
    }
    
    // 监听 Q 键（KeyQ）
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyQ') {
            e.preventDefault();
            openSettingsPanel();
        }
    });
    
    // 如果页面中有游戏按钮容器，则添加一个设置按钮（可选）
    function addSettingsButtonIfNeeded() {
        const container = document.getElementById('gameButtonsContainer');
        if (container && !document.getElementById('settingsBtn')) {
            const btn = document.createElement('button');
            btn.id = 'settingsBtn';
            btn.className = 'btn btn-settings';
            btn.textContent = '⚙️ 设置';
            btn.onclick = openSettingsPanel;
            container.appendChild(btn);
        }
    }
    
    function init() {
        loadSettings();
        addSettingsButtonIfNeeded();
        // 等待 Music 对象加载完成
        function waitForMusic() {
            if (typeof Music !== 'undefined') {
                if (!Music.setEnabled) {
                    Music._enabled = settings.bossMusicEnabled;
                    Music.setEnabled = function(enabled) {
                        this._enabled = enabled;
                        if (!enabled && this.isPlaying) this.stop();
                    };
                    const originalPlay = Music.play;
                    Music.play = function() {
                        if (this._enabled) originalPlay.call(this);
                    };
                    Music.isPlaying = false;
                    const originalStop = Music.stop;
                    Music.stop = function() {
                        originalStop.call(this);
                        this.isPlaying = false;
                    };
                }
                Music.setEnabled(settings.bossMusicEnabled);
            } else {
                setTimeout(waitForMusic, 100);
            }
        }
        waitForMusic();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();