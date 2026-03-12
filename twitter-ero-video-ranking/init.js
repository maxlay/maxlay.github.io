// ================= 入口初始化模块 (init.js) - 终极修复版 =================

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
 * 核心应用初始化函数
 */
function appInit() {
    const loadingEl = document.getElementById('loading-msg');
    if (!loadingEl) return;

    loadingEl.style.display = 'block';
    loadingEl.className = 'loading';
    loadingEl.innerText = "正在加载数据分片...";

    try {
        if (typeof AccountModal !== 'undefined' && AccountModal.initEvents) {
            AccountModal.initEvents();
        }
        if (typeof ManagerModal !== 'undefined' && ManagerModal.initEvents) {
            ManagerModal.initEvents();
        }

        if (typeof DataLoader === 'undefined' || !DataLoader.load) {
            throw new Error("数据加载模块 (DataLoader) 未找到");
        }

        DataLoader.load(updateProgress)
            .then(() => {
                if (!DataLoader.sortedDates || DataLoader.sortedDates.length === 0) { 
                    loadingEl.innerText = "⚠️ 无可用数据";
                    loadingEl.className = 'error';
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
                const mgrButtons = document.getElementById('bottom-manager-buttons');

                if(pagination) pagination.style.display = 'flex';
                if(topPagination) topPagination.style.display = 'flex';
                if(mgrButtons) mgrButtons.style.display = 'flex';
                
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
            });
            
    } catch (e) {
        console.error("初始化严重错误:", e);
        loadingEl.innerHTML = `❌ 系统错误: ${e.message}`;
        loadingEl.className = 'error';
    }
}

/**
 * 【核心修复】强制安全关闭弹窗
 * 解决：按 q 后页面无法滚动、无法点击的问题
 */
function forceCloseModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // 1. 隐藏主元素
    modal.style.display = 'none';
    
    // 2. 移除 active 类 (关键：这通常会控制 opacity 和 pointer-events)
    modal.classList.remove('active');
    
    // 3. 【关键】强制移除遮罩层的指针事件，防止它依然覆盖在页面上拦截点击
    modal.style.pointerEvents = 'none';
    
    // 4. 检查并隐藏内部可能存在的 overlay 子元素
    const innerOverlay = modal.querySelector('.modal-overlay');
    if (innerOverlay) {
        innerOverlay.style.display = 'none';
        innerOverlay.classList.remove('active');
        innerOverlay.style.pointerEvents = 'none';
    }

    // 5. 【关键】恢复 Body 滚动
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.height = '';

    // 6. 【关键】重置焦点到 body，防止焦点丢失或停留在隐藏元素上
    document.body.focus({ preventScroll: true });
    
    console.log(`Modal ${modalId} force closed. Body scroll restored.`);
}

/**
 * 【修复重点】全局键盘事件监听
 */
function setupGlobalKeyboardListener() {
    // 先移除可能存在的旧监听器，防止重复绑定
    document.removeEventListener('keydown', globalKeyHandler);
    
    function globalKeyHandler(event) {
        // 仅监听 'q' 或 'Q'
        if (event.key !== 'q' && event.key !== 'Q') return;

        // 如果焦点在输入框内，忽略按键
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return; 
        }

        let handled = false;

        // 1. 检查账号详情弹窗
        const accountModal = document.getElementById('account-modal');
        if (accountModal && (accountModal.style.display !== 'none' || accountModal.classList.contains('active'))) {
            // 优先尝试调用原有关闭函数，如果不行则强制关闭
            if (typeof closeAccountModal === 'function') {
                closeAccountModal();
            } else {
                forceCloseModal('account-modal');
            }
            handled = true;
        }

        // 2. 检查管理列表弹窗
        if (!handled) {
            const managerModal = document.getElementById('manager-modal');
            if (managerModal && (managerModal.style.display !== 'none' || managerModal.classList.contains('active'))) {
                if (typeof closeManagerModal === 'function') {
                    closeManagerModal();
                } else {
                    forceCloseModal('manager-modal');
                }
                handled = true;
            }
        }

        // 只阻止默认行为，不阻止冒泡
        if (handled) {
            event.preventDefault();
        }
    }

    document.addEventListener('keydown', globalKeyHandler);
}

// ================= 页面启动逻辑 =================

window.appInit = appInit;

document.addEventListener('DOMContentLoaded', () => {
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

    if (typeof getCookie === 'function' && getCookie(CONFIG.COOKIE_NAME) === "true") {
        document.getElementById('login-overlay').style.display = 'none';
        setTimeout(() => {
            appInit();
            setupGlobalKeyboardListener();
        }, 50);
    } else {
        setupGlobalKeyboardListener();
    }
});