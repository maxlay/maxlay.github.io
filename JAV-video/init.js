// ================= init.js (登录认证模块) =================
console.log('🔒 [Init] Login module loaded');

const LOGIN_STORAGE_KEY = 'video_site_logged_in';
const DEFAULT_PASSWORD = '821025'; // <--- 在这里修改您的密码

function checkLogin() {
    const isLoggedIn = localStorage.getItem(LOGIN_STORAGE_KEY) === 'true';
    console.log('🔒 [Check] Login status:', isLoggedIn);

    if (isLoggedIn) {
        showApp();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    const overlay = document.getElementById('login-overlay');
    const input = document.getElementById('password-input');
    const btn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('login-error');
    const app = document.getElementById('app-container');

    if (!overlay || !input || !btn) {
        console.error('❌ [Init] Login elements not found!');
        // 如果找不到元素，直接显示应用（防止死锁）
        showApp();
        return;
    }

    // 显示遮罩，隐藏应用
    overlay.style.display = 'flex';
    app.style.display = 'none';
    app.style.opacity = '0';
    errorMsg.style.display = 'none';
    input.value = '';
    input.focus();

    // 绑定点击事件
    const handleLogin = () => {
        const pwd = input.value.trim();
        console.log('🔑 [Attempt] Password entered:', pwd ? '***' : '(empty)');

        if (pwd === DEFAULT_PASSWORD) {
            console.log('✅ [Success] Password correct');
            localStorage.setItem(LOGIN_STORAGE_KEY, 'true');
            errorMsg.style.display = 'none';
            showApp();
        } else {
            console.warn('❌ [Fail] Password incorrect');
            errorMsg.style.display = 'block';
            input.value = '';
            input.focus();
            // 简单动画提示错误
            overlay.querySelector('.login-box').animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' }
            ], { duration: 300 });
        }
    };

    // 移除旧监听器避免重复绑定（简单处理：直接重新赋值）
    btn.onclick = handleLogin;
    input.onkeydown = (e) => {
        if (e.key === 'Enter') handleLogin();
    };
}

function showApp() {
    const app = document.getElementById('app'); // 注意：原代码可能是 'app-container' 或 'app'，请根据 HTML 实际 ID 确认
    const loginScreen = document.getElementById('login-screen'); // 确认 ID 是否为 login-screen
    
    // 1. 强制隐藏登录层
    if (loginScreen) {
        loginScreen.style.display = 'none'; 
        loginScreen.style.opacity = '0';
    }
    
    // 2. 强制显示主应用层
    if (app) {
        app.style.display = 'block';
        app.style.opacity = '1';
        console.log('✅ [Force] App container displayed.');
        
        // 3. 尝试加载数据，但加上超时保护或 try-catch
        setTimeout(() => {
            if (typeof loadVideoData === 'function') {
                try {
                    console.log('🚀 Attempting to load data...');
                    loadVideoData();
                } catch (e) {
                    console.error('❌ Data loading crashed:', e);
                    alert('数据加载失败，请检查网络连接或数据文件是否存在。\n错误信息:' + e.message);
                }
            } else {
                console.warn('⚠️ loadVideoData function not found. Showing empty grid.');
                // 可选：在这里手动初始化一个空网格，防止白屏
                const grid = document.getElementById('video-grid');
                if(grid) grid.innerHTML = '<div style="padding:20px;text-align:center;">等待数据加载... (若长期显示此项，请检查 loader.js)</div>';
            }
        }, 100); // 稍微延迟，确保 UI 先渲染出来
    } else {
        console.error('❌ Cannot find #app element! Check your index.html');
    }
}

function logout() {
    localStorage.removeItem(LOGIN_STORAGE_KEY);
    location.reload();
}

// 启动检查
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 [Init] DOM Ready, checking login...');
    // 稍微延迟确保 HTML 元素已存在
    setTimeout(checkLogin, 100);
});

// 暴露 logout 函数到全局，以便需要在其他地方退出时调用
window.logout = logout;