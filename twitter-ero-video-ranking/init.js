// ================= 入口初始化模块 (init.js) =================

function updateProgress(percent, text) {
    const bar = document.getElementById('progress-bar');
    const txt = document.getElementById('progress-text');
    const container = document.getElementById('progress-container');
    const toast = document.getElementById('loading-toast');
    
    if (!container || !bar || !txt) return;
    
    container.classList.add('active');
    container.classList.remove('error', 'success');
    
    bar.style.width = `${percent}%`;
    txt.innerText = `${percent}%`;
    
    if (toast) {
        toast.innerText = text;
        toast.classList.add('visible');
        if (percent >= 100) {
            setTimeout(() => {
                toast.classList.remove('visible');
                container.classList.add('success'); 
            }, 800);
        }
    }
}

function showErrorToast(msg) {
    const toast = document.getElementById('loading-toast');
    if(toast) {
        toast.innerText = msg;
        toast.style.backgroundColor = 'rgba(255, 68, 68, 0.95)';
        toast.style.borderColor = 'rgba(255, 68, 68, 0.5)';
        toast.classList.add('visible');
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                toast.style.backgroundColor = '';
                toast.style.borderColor = '';
            }, 300);
        }, 6000);
    }
}

function appInit() {
    const loadingEl = document.getElementById('loading-msg');
    if (!loadingEl) return;
    
    loadingEl.style.display = 'block';
    loadingEl.className = 'loading';
    loadingEl.innerText = "正在连接服务器...";
    
    try {
        // 初始化模态框
        if (typeof AccountModal !== 'undefined') AccountModal.initElements();
        if (typeof ManagerModal !== 'undefined') ManagerModal.initElements();
        if (typeof AccountModal !== 'undefined' && AccountModal.initEvents) AccountModal.initEvents();
        if (typeof ManagerModal !== 'undefined' && ManagerModal.initEvents) ManagerModal.initEvents();
        
        if (typeof DataLoader === 'undefined' || !DataLoader.load) {
            throw new Error("数据加载模块未找到");
        }
        
        DataLoader.load(updateProgress)
            .then(() => {
                if (!DataLoader.sortedDates || DataLoader.sortedDates.length === 0) { 
                    loadingEl.innerText = "⚠️ 无可用数据";
                    loadingEl.className = 'error';
                    showErrorToast("未找到任何视频数据");
                    return; 
                }
                
                const newest = DataLoader.sortedDates[0];
                
                const statsTotal = document.getElementById('stats-total');
                if(statsTotal) statsTotal.innerText = `共 ${DataLoader.allData.length.toLocaleString()} 视频`;
                
                const statsNewest = document.getElementById('stats-newest');
                if(statsNewest) {
                    statsNewest.style.display = 'inline-block';
                    statsNewest.innerText = `✨ 最新 (${newest}) 更新 ${DataLoader.groupedData[newest].length} 部`;
                    statsNewest.onclick = () => {
                        if(typeof Renderer !== 'undefined') Renderer.renderPage(newest);
                    };
                }
                
                const saved = localStorage.getItem('lastDate');
                const startKey = (saved && DataLoader.sortedDates.includes(saved)) ? saved : newest;
                
                loadingEl.style.display = 'none';
                
                const pagination = document.getElementById('pagination');
                const topPagination = document.getElementById('top-pagination');
                if(pagination) pagination.style.display = 'flex';
                if(topPagination) topPagination.style.display = 'flex';
                
                if (typeof Renderer !== 'undefined') {
                    Renderer.initElements();
                    Renderer.renderPage(startKey);
                    Renderer.setupPagination();
                    Renderer.setupShortcuts();
                }
            })
            .catch(err => {
                console.error("数据加载错误:", err);
                loadingEl.innerHTML = `❌ 加载失败: ${err.message}`;
                loadingEl.className = 'error';
                const container = document.getElementById('progress-container');
                if(container) {
                    container.classList.add('error');
                    container.classList.add('active');
                }
                showErrorToast(`加载失败: ${err.message}`);
            });
            
    } catch (e) {
        console.error("初始化严重错误:", e);
        loadingEl.innerHTML = `❌ 系统错误: ${e.message}`;
        loadingEl.className = 'error';
        showErrorToast(`系统错误: ${e.message}`);
    }
}

function setupGlobalKeyboardListener() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'Escape') {
            if (typeof AccountModal !== 'undefined' && AccountModal.isOpen()) AccountModal.close();
            if (typeof ManagerModal !== 'undefined' && ManagerModal.isOpen()) ManagerModal.close();
        }
    });
}

// 简单的密码验证逻辑 (如果没有后端，这里仅作演示)
// 您可以在 HTML 中设置 data-password 属性或在 JS 中硬编码
const SITE_PASSWORD = "821025"; // 请在此处修改您的密码，或从 HTML 属性读取

function checkPassword(inputPwd) {
    if (inputPwd === SITE_PASSWORD) {
        setCookie(CONFIG.COOKIE_NAME, "true", 7); // 记住登录状态7天
        document.getElementById('login-overlay').style.display = 'none';
        appInit();
        setupGlobalKeyboardListener();
    } else {
        alert("密码错误！");
        const input = document.getElementById('passwordInput');
        if(input) {
            input.value = '';
            input.focus();
        }
    }
}
window.checkPassword = checkPassword;

document.addEventListener('DOMContentLoaded', () => {
    const pwdInput = document.getElementById('passwordInput');
    const loginOverlay = document.getElementById('login-overlay');
    
    if (pwdInput) {
        pwdInput.addEventListener('keypress', e => { 
            if(e.key === 'Enter') checkPassword(pwdInput.value);
        });
        pwdInput.focus();
    }
    
    const authCookie = getCookie(CONFIG.COOKIE_NAME);
    
    if (authCookie === "true") {
        if(loginOverlay) loginOverlay.style.display = 'none';
        setTimeout(() => {
            appInit();
            setupGlobalKeyboardListener();
        }, 50);
    } else {
        setupGlobalKeyboardListener();
    }
});

window.appInit = appInit;
window.setupGlobalKeyboardListener = setupGlobalKeyboardListener;
window.showErrorToast = showErrorToast;