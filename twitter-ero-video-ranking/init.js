// ================= 入口初始化模块 =================
function updateProgress(percent, text) {
    const bar = document.getElementById('progress-bar');
    const txt = document.getElementById('progress-text');
    const container = document.getElementById('progress-container');
    
    container.classList.add('active');
    bar.style.width = `${percent}%`;
    txt.innerText = `${text} (${percent}%)`;
}

function appInit() {
    const loadingEl = document.getElementById('loading-msg');
    loadingEl.style.display = 'block';
    loadingEl.innerText = "正在加载数据分片...";

    // 初始化各模块事件
    AccountModal.initEvents();
    ManagerModal.initEvents();

    DataLoader.load(updateProgress)
        .then(() => {
            if(DataLoader.sortedDates.length === 0) { 
                loadingEl.innerText = "无数据"; return; 
            }
            
            const newest = DataLoader.sortedDates[0];
            document.getElementById('stats-total').innerText = `共 ${DataLoader.allData.length.toLocaleString()} 视频`;
            const statsNewest = document.getElementById('stats-newest');
            statsNewest.style.display = 'inline-block';
            statsNewest.innerText = `✨ 最新 (${newest}) 更新 ${DataLoader.groupedData[newest].length} 部`;
            statsNewest.onclick = () => Renderer.renderPage(newest);

            const saved = localStorage.getItem('lastDate');
            const startKey = (saved && DataLoader.sortedDates.includes(saved)) ? saved : newest;

            loadingEl.style.display = 'none';
            document.getElementById('pagination').style.display = 'flex';
            document.getElementById('top-pagination').style.display = 'flex';
            document.getElementById('bottom-manager-buttons').style.display = 'flex';
            
            Renderer.initElements();
            Renderer.renderPage(startKey);
            Renderer.setupPagination();
            Renderer.setupShortcuts();
        })
        .catch(err => {
            loadingEl.innerHTML = `❌ 加载失败: ${err.message}<br><small>请检查网络或数据文件是否存在。</small>`;
            loadingEl.className = 'error';
        });
}

// 绑定全局初始化函数
window.appInit = appInit;

// 页面加载完成后检查密码
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('passwordInput').addEventListener('keypress', e => { 
        if(e.key==='Enter') checkPassword(document.getElementById('passwordInput').value); 
    });
    
    if (getCookie(CONFIG.COOKIE_NAME) === "true") {
        document.getElementById('login-overlay').style.display = 'none';
        setTimeout(appInit, 50);
    }
});