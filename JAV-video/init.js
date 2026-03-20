// ================= init.js (登录认证模块 - 修复版 2.0) =================
console.log('🔒 [Init] Login module loaded (Fixed Version)');

const LOGIN_STORAGE_KEY = 'video_site_logged_in';

// 【修复】不要在脚本加载时获取密码，而是在验证时获取
function getPassword() {
    // 优先从 window.CONFIG 读取，如果失败则使用硬编码的备用密码
    const pwd = window.CONFIG && window.CONFIG.DEFAULT_PASSWORD 
        ? window.CONFIG.DEFAULT_PASSWORD 
        : '821025'; // 硬编码备用密码，确保一定能登录
    
    console.log('🔑 [Debug] Current password configured:', pwd);
    return pwd;
}

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
    // 统一获取元素
    const overlay = document.getElementById('login-overlay');
    const input = document.getElementById('password-input');
    const btn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('login-error');
    const app = document.getElementById('app'); 

    // 检查关键元素是否存在
    if (!overlay) {
        console.error('❌ [Init] 找不到 #login-overlay 元素，检查 index.html');
        alert('系统错误：找不到登录界面元素');
        return;
    }
    if (!input || !btn) {
        console.error('❌ [Init] 找不到输入框或按钮元素');
        return;
    }

    // 执行样式操作
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    
    if (app) {
        app.style.display = 'none';
        app.style.opacity = '0';
    }
    
    if (errorMsg) errorMsg.style.display = 'none';
    input.value = '';
    input.focus();

    // 【修复】使用动态获取的密码进行比较
    const handleLogin = () => {
        const inputPwd = input.value.trim();
        const correctPwd = getPassword(); // 动态获取
        
        console.log('🔑 [Attempt] Input:', inputPwd ? '***' : '(empty)');
        console.log('🔑 [Debug] Expected:', correctPwd);
        
        if (inputPwd === correctPwd) {
            console.log('✅ [Success] Password correct');
            localStorage.setItem(LOGIN_STORAGE_KEY, 'true');
            if (errorMsg) errorMsg.style.display = 'none';
            showApp();
        } else {
            console.warn('❌ [Fail] Password mismatch. Input:', inputPwd, 'Expected:', correctPwd);
            if (errorMsg) {
                errorMsg.innerText = '密码错误，请重试 (正确密码: ' + correctPwd + ')'; // 调试时显示密码，生产环境可删除
                errorMsg.style.display = 'block';
            }
            input.value = '';
            input.focus();
            
            // 错误动画
            const box = overlay.querySelector('.login-box');
            if(box) {
                box.animate([
                    { transform: 'translateX(0)' },
                    { transform: 'translateX(-10px)' },
                    { transform: 'translateX(10px)' },
                    { transform: 'translateX(0)' }
                ], { duration: 300 });
            }
        }
    };

    // 绑定事件（先移除旧事件避免重复绑定）
    btn.onclick = handleLogin;
    
    input.onkeydown = (e) => {
        if (e.key === 'Enter') handleLogin();
    };
}

function showApp() {
    const app = document.getElementById('app');
    const overlay = document.getElementById('login-overlay');
    
    // 1. 隐藏登录层
    if (overlay) {
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
    }
    
    // 2. 显示主应用
    if (app) {
        app.style.display = 'block';
        setTimeout(() => {
            app.style.opacity = '1';
        }, 50);
        
        console.log('✅ [Force] App container displayed.');
        
        // 3. 加载数据
        setTimeout(() => {
            if (typeof loadVideoData === 'function') {
                try {
                    console.log('🚀 Attempting to load data...');
                    loadVideoData();
                } catch (e) {
                    console.error('❌ Data loading crashed:', e);
                    const grid = document.getElementById('video-grid');
                    if(grid) grid.innerHTML = `<div style="color:red;text-align:center;">数据加载失败:<br>${e.message}</div>`;
                }
            } else {
                console.warn('⚠️ loadVideoData function not found. Waiting for loader.js...');
                // 如果 loader.js 还没加载完，等待一会儿再试
                setTimeout(() => {
                    if (typeof loadVideoData === 'function') {
                        loadVideoData();
                    } else {
                        alert('数据加载模块未找到，请刷新页面重试');
                    }
                }, 1000);
            }
        }, 100);
    } else {
        console.error('❌ Cannot find #app element!');
        alert('系统错误：找不到主应用容器 (#app)');
    }
}

function logout() {
    localStorage.removeItem(LOGIN_STORAGE_KEY);
    location.reload();
}

// 【新增】强制显示主界面（调试用，如果登录还是有问题，可以在控制台调用此函数）
window.forceLogin = function() {
    console.warn('⚠️ Force login triggered via console');
    localStorage.setItem(LOGIN_STORAGE_KEY, 'true');
    showApp();
};

// 【新增】清除登录状态
window.clearLogin = function() {
    localStorage.removeItem(LOGIN_STORAGE_KEY);
    console.log('✅ Login status cleared. Refresh page to see login screen.');
};

// 启动
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 [Init] DOM Ready, checking login...');
    console.log('🚀 [Debug] CONFIG loaded?', !!window.CONFIG);
    console.log('🚀 [Debug] PASSWORD source:', window.CONFIG ? 'core.js' : 'fallback');
    
    setTimeout(checkLogin, 100); // 稍微延迟确保所有脚本都就绪
});

// 暴露全局函数
window.logout = logout;