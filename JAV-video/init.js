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
    const app = document.getElementById('app');
    const loginScreen = document.getElementById('login-screen');
    
    if (loginScreen) loginScreen.style.display = 'none';
    
    if (app) {
        app.style.display = 'block';
        void app.offsetWidth; 
        app.style.opacity = '1';
        
        console.log('✅ [Init] App displayed');
        
        // 【必须存在】显式调用加载函数
        console.log('🚀 [Init] 手动触发数据加载...'); // 新增日志
        if (typeof loadVideoData === 'function') {
            loadVideoData(); 
        } else {
            console.error('❌ [Init] 致命错误：找不到 loadVideoData 函数！请检查 loader.js 是否已加载。');
        }
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