// ========== 游戏跳转逻辑（依赖 auth.js 的全局状态） ==========
// 等待 DOM 和 auth.js 初始化完成
document.addEventListener('DOMContentLoaded', () => {
    const newGameBtn = document.getElementById('newGameBtn');
    const loadGameBtn = document.getElementById('loadGameBtn');
    const fileInput = document.getElementById('fileInput');

    // 新游戏：跳转到黑屋地图
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            // 黑屋地图的相对路径：../Black room/Black room.html
            window.location.href = '../Black room/Black room.html';
        });
    }

    // 加载旧存档：选择文件 -> 存入 localStorage -> 跳转到监狱地图（并传递参数）
    if (loadGameBtn && fileInput) {
        loadGameBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const saveData = JSON.parse(ev.target.result);
                    // 将存档存入 localStorage（监狱地图会读取）
                    localStorage.setItem('prison_save', JSON.stringify(saveData));
                    // 跳转到监狱地图，并带上参数 load=1
                    window.location.href = '../prison/prison.html?load=1';
                } catch (err) {
                    alert('存档文件无效，请选择正确的 JSON 存档');
                }
            };
            reader.readAsText(file);
            // 清空 input，以便下次选择同一文件时也能触发 change
            fileInput.value = '';
        });
    }
});