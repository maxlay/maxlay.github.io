// ================= 入口初始化模块 (init.js) - 验证与加载并行版 =================

/**
 * 全局数据加载 Promise
 * 页面加载后立即启动，与登录验证并行执行
 */
window.dataLoadPromise = null;
window.dataLoadCompleted = false;

/**
 * 更新进度条 UI
 */
function updateProgress(percent, text) {
    const bar = document.getElementById('progress-bar');
    const txt = document.getElementById('progress-text');
    const container = document.getElementById('progress-container');
    
    if (!container || !bar || !txt) return;

    container.classList.add('active');
    bar.style.width = `${percent}%`;
    txt.innerText = `${text} (${percent}%)`;
}

/**
 * 启动后台数据加载（与验证并行）
 */
function startBackgroundLoading() {
    // 避免重复启动
    if (window.dataLoadPromise) return window.dataLoadPromise;
    
    const loadingEl = document.getElementById('loading-msg');
    if (loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.className = 'loading';
        loadingEl.innerText = "后台加载数据中...";
    }

    window.dataLoadPromise = new Promise((resolve, reject) => {
        try {
            if (typeof DataLoader === 'undefined' || !DataLoader.load) {
                throw new Error("数据加载模块 (DataLoader) 未找到");
            }

            DataLoader.load(updateProgress)
                .then(() => {
                    window.dataLoadCompleted = true;
                    console.log('[DataLoader] 数据加载完成');
                    resolve(true);
                })
                .catch(err => {
                    console.error("数据加载错误:", err);
                    if (loadingEl) {
                        loadingEl.innerHTML = `❌ 加载失败: ${err.message}`;
                        loadingEl.className = 'error';
                    }
                    reject(err);
                });
        } catch (e) {
            console.error("初始化严重错误:", e);
            if (loadingEl) {
                loadingEl.innerHTML = `❌ 系统错误: ${e.message}`;
                loadingEl.className = 'error';
            }
            reject(e);
        }
    });
    
    return window.dataLoadPromise;
}

/**
 * 核心应用初始化函数（渲染界面）
 * 等待数据加载完成后执行
 */
async function appInit() {
    const loadingEl = document.getElementById('loading-msg');
    
    // 确保数据加载已完成
    if (!window.dataLoadCompleted) {
        if (loadingEl) loadingEl.innerText = "数据加载中，请稍候...";
        try {
            await window.dataLoadPromise;
        } catch (e) {
            return; // 加载失败，不继续执行
        }
    }

    // 初始化各模块事件
    if (typeof AccountModal !== 'undefined' && AccountModal.initEvents) {
        AccountModal.initEvents();
    }
    if (typeof ManagerModal !== 'undefined' && ManagerModal.initEvents) {
        ManagerModal.initEvents();
    }

    if (!DataLoader.sortedDates || DataLoader.sortedDates.length === 0) { 
        if (loadingEl) {
            loadingEl.innerText = "⚠️ 无可用数据";
            loadingEl.className = 'error';
        }
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

    if(loadingEl) loadingEl.style.display = 'none';
    
    const pagination = document.getElementById('pagination');
    const topPagination = document.getElementById('top-pagination');
    const mgrButtons = document.getElementById('bottom-manager-buttons');

    if(pagination) pagination.style.display = 'flex';
    if(topPagination) topPagination.style.display = 'flex';
    if(mgrButtons) mgrButtons.style.display = 'flex';
    
    // 同步顶部按钮显示
    const topMgrButtons = document.getElementById('top-manager-buttons');
    if(topMgrButtons) topMgrButtons.style.display = 'flex';
    
    if (typeof Renderer !== 'undefined') {
        Renderer.initElements();
        Renderer.renderPage(startKey);
        Renderer.setupPagination();
        Renderer.setupShortcuts();
    }
}

/**
 * 密码验证成功后的回调（支持秒开）
 */
async function onAuthSuccess() {
    // 隐藏登录遮罩
    document.getElementById('login-overlay').style.display = 'none';
    
    // 等待数据加载完成（如果还没完成）
    // 如果已完成，会立即继续，实现"秒开"效果
    await appInit();
}

/**
 * 【核心修复】基于原文件逻辑的关闭函数
 */
function safeCloseModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('active');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.focus({ preventScroll: true });
    console.log("Modal closed:", modalElement.id);
}

/**
 * 【核心修复】全局键盘事件监听
 */
function setupGlobalKeyboardListener() {
    document.removeEventListener('keydown', globalKeyHandler);
    
    function globalKeyHandler(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const isAccountModalOpen = document.getElementById('account-modal').classList.contains('active');
        const isManagerModalOpen = document.getElementById('manager-modal').classList.contains('active');
        
        let isCalendarOpen = false;
        if (window.fpInstance && window.fpInstance.isOpen) {
            isCalendarOpen = true;
        }

        if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
            if (isManagerModalOpen) {
                e.preventDefault();
                if (typeof closeManagerModal === 'function') {
                    closeManagerModal();
                } else {
                    safeCloseModal(document.getElementById('manager-modal'));
                }
                return;
            }
            
            if (isAccountModalOpen) {
                e.preventDefault();
                if (typeof closeAccountModal === 'function') {
                    closeAccountModal();
                } else {
                    safeCloseModal(document.getElementById('account-modal'));
                }
                return;
            }
        }

        if (isAccountModalOpen || isManagerModalOpen || isCalendarOpen) {
            return;
        }

        const newerBtn = document.getElementById('newer-btn');
        const olderBtn = document.getElementById('older-btn');
        
        if (e.key === 'ArrowLeft' && newerBtn && !newerBtn.disabled) {
            newerBtn.click();
        } else if (e.key === 'ArrowRight' && olderBtn && !olderBtn.disabled) {
            olderBtn.click();
        }
    }

    document.addEventListener('keydown', globalKeyHandler);
}

// ================= 页面启动逻辑 =================

window.appInit = appInit;
window.onAuthSuccess = onAuthSuccess;
window.setupGlobalKeyboardListener = setupGlobalKeyboardListener;

document.addEventListener('DOMContentLoaded', () => {
    // 1. 【关键】立即启动后台数据加载（与验证并行）
    startBackgroundLoading();
    
    // 2. 绑定密码框回车事件
    const pwdInput = document.getElementById('passwordInput');
    if (pwdInput) {
        pwdInput.addEventListener('keypress', e => { 
            if(e.key === 'Enter') {
                if (typeof checkPassword === 'function') {
                    checkPassword(pwdInput.value);
                }
            }
        });
        pwdInput.focus();
    }

    // 3. 检查登录状态
    if (typeof getCookie === 'function' && getCookie(CONFIG.COOKIE_NAME) === "true") {
        // 已登录：隐藏遮罩，等待数据加载完成后渲染
        document.getElementById('login-overlay').style.display = 'none';
        onAuthSuccess();
    } else {
        // 未登录：显示登录遮罩，数据在后台继续加载
        // 用户输入密码的同时，数据正在下载
    }
    
    // 4. 绑定全局键盘监听
    setupGlobalKeyboardListener();
});