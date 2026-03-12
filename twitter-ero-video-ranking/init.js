// ================= 入口初始化模块 (init.js) - 修复版 =================

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
        // 初始化各模块事件
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
 * 【核心修复】安全的弹窗关闭辅助函数
 * 确保彻底清理遮罩层、恢复滚动、重置焦点
 */
function safeCloseModal(modalElement) {
    if (!modalElement) return;

    // 1. 隐藏主容器
    modalElement.style.display = 'none';
    
    // 2. 移除 active 类 (关键：这通常会移除遮罩层的 opacity 和 pointer-events)
    modalElement.classList.remove('active');
    
    // 3. 如果存在内部的 overlay 子元素，也强制隐藏
    const overlay = modalElement.querySelector('.modal-overlay-inner') || modalElement;
    overlay.style.pointerEvents = 'none'; // 防止残留遮挡

    // 4. 恢复 body 滚动 (防止背景被锁定)
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';

    // 5. 将焦点移回主体内容，防止焦点丢失导致键盘事件异常
    // 尝试聚焦到第一个可点击的视频卡片或主容器
    const firstCard = document.querySelector('.card');
    if (firstCard) {
        firstCard.focus({ preventScroll: true });
    } else {
        document.body.focus({ preventScroll: true });
    }
    
    console.log("Modal safely closed:", modalElement.id);
}

/**
 * 【修复重点】全局键盘事件监听 (修复 q 键导致页面无响应)
 */
function setupGlobalKeyboardListener() {
    // 先移除可能存在的旧监听器，防止重复绑定
    document.removeEventListener('keydown', globalKeyHandler);
    
    function globalKeyHandler(event) {
        // 仅监听 'q' 或 'Q'
        if (event.key !== 'q' && event.key !== 'Q') return;

        // 【关键】如果焦点在输入框内，忽略按键
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return; 
        }

        let handled = false;

        // 1. 检查并关闭账号详情弹窗
        const accountModal = document.getElementById('account-modal');
        // 判断条件：元素存在 AND (显示不为none OR 拥有active类)
        if (accountModal && (accountModal.style.display !== 'none' || accountModal.classList.contains('active'))) {
            // 优先调用模块自带的关闭函数（如果有），否则使用安全关闭函数
            if (typeof closeAccountModal === 'function') {
                closeAccountModal();
            } else {
                safeCloseModal(accountModal);
            }
            handled = true;
        }

        // 2. 检查并关闭管理列表弹窗 (收藏夹/回收站)
        if (!handled) {
            const managerModal = document.getElementById('manager-modal');
            if (managerModal && (managerModal.style.display !== 'none' || managerModal.classList.contains('active'))) {
                if (typeof closeManagerModal === 'function') {
                    closeManagerModal();
                } else {
                    safeCloseModal(managerModal);
                }
                handled = true;
            }
        }

        // 【重要修改】只阻止默认行为，不要阻止冒泡 (stopPropagation)，除非确实需要
        // 这里我们只阻止浏览器的默认搜索行为等，不干扰其他点击
        if (handled) {
            event.preventDefault(); 
            // 注意：这里故意没有调用 event.stopPropagation() 
            // 以防止阻断后续可能需要的 UI 更新或事件传递
        }
    }

    document.addEventListener('keydown', globalKeyHandler);
}

// ================= 页面启动逻辑 =================

window.appInit = appInit;

document.addEventListener('DOMContentLoaded', () => {
    // 1. 绑定密码框回车事件
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

    // 2. 检查登录状态
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