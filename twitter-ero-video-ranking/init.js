// ================= 入口初始化模块 (init.js) =================

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
    loadingEl.className = 'loading'; // 重置为加载样式
    loadingEl.innerText = "正在加载数据分片...";

    try {
        // 初始化各模块事件 (增加安全检查)
        if (typeof AccountModal !== 'undefined' && AccountModal.initEvents) {
            AccountModal.initEvents();
        }
        if (typeof ManagerModal !== 'undefined' && ManagerModal.initEvents) {
            ManagerModal.initEvents();
        }

        // 开始加载数据
        if (typeof DataLoader === 'undefined' || !DataLoader.load) {
            throw new Error("数据加载模块 (DataLoader) 未找到");
        }

        DataLoader.load(updateProgress)
            .then(() => {
                // 检查是否有数据
                if (!DataLoader.sortedDates || DataLoader.sortedDates.length === 0) { 
                    loadingEl.innerText = "⚠️ 无可用数据 (data-part-*.json 为空或不存在)";
                    loadingEl.className = 'error';
                    return; 
                }
                
                const newest = DataLoader.sortedDates[0];
                
                // 更新顶部统计
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

                // 恢复上次浏览日期
                const saved = localStorage.getItem('lastDate');
                const startKey = (saved && DataLoader.sortedDates.includes(saved)) ? saved : newest;

                // 隐藏加载提示，显示主界面
                loadingEl.style.display = 'none';
                
                const pagination = document.getElementById('pagination');
                const topPagination = document.getElementById('top-pagination');
                const mgrButtons = document.getElementById('bottom-manager-buttons');

                if(pagination) pagination.style.display = 'flex';
                if(topPagination) topPagination.style.display = 'flex';
                if(mgrButtons) mgrButtons.style.display = 'flex';
                
                // 初始化渲染器
                if (typeof Renderer !== 'undefined') {
                    Renderer.initElements();
                    Renderer.renderPage(startKey);
                    Renderer.setupPagination();
                    Renderer.setupShortcuts();
                } else {
                    console.error("渲染模块 (Renderer) 未找到");
                }
            })
            .catch(err => {
                console.error("数据加载错误:", err);
                loadingEl.innerHTML = `❌ 加载失败: ${err.message}<br><small>请检查 Network 面板中 data-part-*.json 是否 404 或被拦截。</small>`;
                loadingEl.className = 'error';
            });
            
    } catch (e) {
        console.error("初始化过程发生严重错误:", e);
        loadingEl.innerHTML = `❌ 系统错误: ${e.message}`;
        loadingEl.className = 'error';
    }
}

/**
 * 【修复重点】全局键盘事件监听 (修复 q 键关闭弹窗失效)
 */
function setupGlobalKeyboardListener() {
    document.addEventListener('keydown', function(event) {
        // 仅监听 'q' 或 'Q'
        if (event.key !== 'q' && event.key !== 'Q') return;

        // 【关键】如果焦点在输入框内，忽略按键 (防止输入密码/搜索时误关)
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return; 
        }

        let handled = false;

        // 1. 尝试关闭账号详情弹窗
        const accountModal = document.getElementById('account-modal');
        if (accountModal && accountModal.style.display !== 'none' && !accountModal.classList.contains('hidden')) {
            if (typeof closeAccountModal === 'function') {
                closeAccountModal();
            } else {
                accountModal.style.display = 'none';
            }
            handled = true;
        }

        // 2. 尝试关闭管理列表弹窗 (收藏夹/回收站)
        if (!handled) {
            const managerModal = document.getElementById('manager-modal');
            if (managerModal && managerModal.style.display !== 'none' && !managerModal.classList.contains('hidden')) {
                if (typeof closeManagerModal === 'function') {
                    closeManagerModal();
                } else {
                    managerModal.style.display = 'none';
                }
                handled = true;
            }
        }

        // 如果成功处理了按键，阻止默认行为
        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    });
}

// ================= 页面启动逻辑 =================

// 将 appInit 暴露到全局 window 对象，方便其他模块调用
window.appInit = appInit;

document.addEventListener('DOMContentLoaded', () => {
    // 1. 绑定密码框回车事件
    const pwdInput = document.getElementById('passwordInput');
    if (pwdInput) {
        pwdInput.addEventListener('keypress', e => { 
            if(e.key === 'Enter') {
                // 假设 checkPassword 是全局函数 (通常在 index.html 的内联脚本或单独文件中)
                if (typeof checkPassword === 'function') {
                    checkPassword(pwdInput.value);
                } else {
                    console.warn("checkPassword 函数未定义");
                }
            }
        });
        // 自动聚焦
        pwdInput.focus();
    }

    // 2. 检查登录状态
    // 假设 getCookie 是全局工具函数
    if (typeof getCookie === 'function' && getCookie(CONFIG.COOKIE_NAME) === "true") {
        document.getElementById('login-overlay').style.display = 'none';
        // 延迟一点点执行，确保其他 DOM 元素已就绪
        setTimeout(() => {
            appInit();
            setupGlobalKeyboardListener(); // 【重要】注册键盘监听
        }, 50);
    } else {
        // 如果未登录，确保键盘监听也注册了 (以防用户在登录前按 q 虽然没弹窗，但为了逻辑完整)
        setupGlobalKeyboardListener();
    }
});