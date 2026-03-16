// ================= 入口初始化模块 (init.js) - 基于 DOCTYPE.txt 逻辑修复版 =================

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
 * 【核心修复】基于原文件逻辑的关闭函数
 * 严格复刻 DOCTYPE.txt 中的行为：仅移除 class，依靠 CSS 处理 pointer-events
 * 但必须显式恢复 body 滚动，这是原文件可能隐式处理但分离后需要显式调用的
 */
function safeCloseModal(modalElement) {
    if (!modalElement) return;

    // 1. 移除 active 类 (触发 CSS transition 和 pointer-events: none)
    modalElement.classList.remove('active');
    
    // 2. 【关键】显式恢复 Body 滚动
    // 原文件可能在打开时设置了 body.style.overflow = 'hidden'，关闭时必须清除
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    
    // 3. 重置焦点，防止焦点丢失导致键盘事件异常
    // 将焦点移回 body，确保下一次按键能被全局监听器捕获
    document.body.focus({ preventScroll: true });
    
    console.log("Modal closed:", modalElement.id);
}

/**
 * 【核心修复】全局键盘事件监听 (严格复刻原文件逻辑)
 */
function setupGlobalKeyboardListener() {
    // 先移除可能存在的旧监听器
    document.removeEventListener('keydown', globalKeyHandler);
    
    function globalKeyHandler(e) {
        // 如果焦点在输入框内，忽略按键 (防止打字时触发)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // 【关键】实时检查类名，不依赖外部变量，确保状态绝对同步
        // 这与原文件逻辑一致：直接查询 DOM 状态
        const isAccountModalOpen = document.getElementById('account-modal').classList.contains('active');
        const isManagerModalOpen = document.getElementById('manager-modal').classList.contains('active');
        
        // 检查日历是否打开 (如果有 flatpickr 实例)
        let isCalendarOpen = false;
        if (window.fpInstance && window.fpInstance.isOpen) {
            isCalendarOpen = true;
        }

        // 处理关闭快捷键 (q, Q, Escape)
        if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
            // 优先级：先关管理弹窗，再关账号弹窗 (与原文件逻辑一致)
            if (isManagerModalOpen) {
                e.preventDefault(); // 阻止默认行为
                if (typeof closeManagerModal === 'function') {
                    closeManagerModal();
                } else {
                    // 降级处理：直接调用安全关闭
                    safeCloseModal(document.getElementById('manager-modal'));
                }
                return; // 【关键】直接返回，不再执行后续任何逻辑
            }
            
            if (isAccountModalOpen) {
                e.preventDefault();
                if (typeof closeAccountModal === 'function') {
                    closeAccountModal();
                } else {
                    // 降级处理
                    safeCloseModal(document.getElementById('account-modal'));
                }
                return; // 【关键】直接返回
            }
        }

        // 【关键】如果任意弹窗或日历打开，禁止翻页快捷键
        // 这一步必须在翻页逻辑之前，且必须基于实时状态
        if (isAccountModalOpen || isManagerModalOpen || isCalendarOpen) {
            return;
        }

        // --- 以下为翻页逻辑 (仅在无弹窗时执行) ---
        const newerBtn = document.getElementById('newer-btn');
        const olderBtn = document.getElementById('older-btn');
        
        // 模拟原文件的翻页逻辑
        if (e.key === 'ArrowLeft' && newerBtn && !newerBtn.disabled) {
            newerBtn.click();
        } else if (e.key === 'ArrowRight' && olderBtn && !olderBtn.disabled) {
            olderBtn.click();
        }
    }

    // 绑定监听器
    document.addEventListener('keydown', globalKeyHandler);
}

// ================= 页面启动逻辑 =================

window.appInit = appInit;
window.setupGlobalKeyboardListener = setupGlobalKeyboardListener; // 导出供外部调用

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

    // 2. 检查登录状态并初始化
    if (typeof getCookie === 'function' && getCookie(CONFIG.COOKIE_NAME) === "true") {
        document.getElementById('login-overlay').style.display = 'none';
        setTimeout(() => {
            appInit();
            setupGlobalKeyboardListener();
        }, 50);
    } else {
        // 即使未登录也绑定键盘监听 (以防密码框之外的操作)
        setupGlobalKeyboardListener();
    }
});