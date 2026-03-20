// ================= 核心常量与工具 =================
const CONFIG = {
    COOKIE_NAME: "x_video_auth_verified",
    
    // ⚠️ 关键配置：
    // 1. 代理：保留 wget.la
    // 2. 分支：main (如果报错请尝试改为 master)
    // 3. 文件夹：已修正为 JAV-video
    BASE_URL: 'https://wget.la/https://raw.githubusercontent.com/maxlay/maxlay.github.io/main/JAV-video/', 
    
    // ⚠️ 分片数量：4 (加载 data-part-0.json 到 data-part-3.json)
    DATA_PARTS_COUNT: 4,
    
    STORAGE_KEYS: {
        FAVORITES: 'user_favorites_v1',
        RECYCLE_BIN: 'user_recycle_bin_v1'
    }
};

// ================= 密码与 Cookie 逻辑 =================
function setPermanentCookie(name, value) {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 10);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Strict`;
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function checkPassword(input) {
    if (input === CONFIG.PASSWORD) {
        setPermanentCookie(CONFIG.COOKIE_NAME, "true");
        const loginOverlay = document.getElementById('login-overlay');
        if(loginOverlay) loginOverlay.style.display = 'none';
        
        // 尝试调用初始化函数
        if (window.appInit) window.appInit();
        else if (window.loadVideoData) window.loadVideoData();
        
        return true;
    } else {
        const err = document.getElementById('loginError');
        if(err) err.style.display = 'block';
        setTimeout(() => { 
            document.body.innerHTML = '<h1 style="color:red;text-align:center;margin-top:20%">⛔ 访问拒绝</h1>'; 
        }, 1500);
        return false;
    }
}

// ================= 本地存储管理模块 =================
const StorageManager = {
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },
    save(key, list) {
        try {
            localStorage.setItem(key, JSON.stringify(list));
            return true;
        } catch (e) { alert("保存失败，存储空间可能已满。"); return false; }
    },
    add(key, item) {
        const list = this.get(key);
        if (!list.includes(item)) {
            list.push(item);
            return this.save(key, list);
        }
        return false;
    },
    remove(key, item) {
        let list = this.get(key);
        const initialLen = list.length;
        list = list.filter(i => i !== item);
        if (list.length !== initialLen) {
            return this.save(key, list);
        }
        return false;
    },
    includes(key, item) {
        return this.get(key).includes(item);
    }
};

function getAccountId(item) {
    if (item.tweet_account) return item.tweet_account;
    return `ID:${item.id}`;
}

function formatDateKey(dateStr) {
    if (!dateStr) return "Unknown";
    return dateStr.length >= 10 ? dateStr.substring(0, 10) : "Unknown";
}

function formatNum(n) {
    if(!n) return '0';
    n = parseInt(n);
    return n >= 1000000 ? (n/1e6).toFixed(1)+'M' : (n>=1000 ? (n/1e3).toFixed(1)+'k' : n);
}

// 导出给其他模块使用
window.Core = { CONFIG, StorageManager, getAccountId, formatDateKey, formatNum, checkPassword };

// ================= 数据加载逻辑 (适配 4 个分片) =================
async function loadVideoData() {
    const loadingMsg = document.getElementById('loading-msg');
    if (loadingMsg) loadingMsg.innerText = `正在加载数据 (0/${CONFIG.DATA_PARTS_COUNT})...`;
    
    const allData = [];
    const promises = [];
    
    console.log(`🚀 [Loader] Starting load with BASE_URL: ${CONFIG.BASE_URL}`);

    for (let i = 0; i < CONFIG.DATA_PARTS_COUNT; i++) {
        // 拼接完整 URL: BASE_URL + data-part- + i + .json
        const url = `${CONFIG.BASE_URL}data-part-${i}.json`;
        
        console.log(`🔄 [Part ${i}] Fetching: ${url}`);
        
        const promise = fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: 文件 data-part-${i}.json 未找到`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`✅ [Part ${i}] Loaded successfully.`);
                return Array.isArray(data) ? data : [data];
            });
        
        promises.push(promise);
    }

    try {
        const results = await Promise.all(promises);
        results.forEach(partData => allData.push(...partData));
        
        console.log(`🎉 [Loader] All parts loaded. Total items: ${allData.length}`);
        
        if (loadingMsg) loadingMsg.style.display = 'none';
        
        // 延迟一点确保 DOM 渲染
        setTimeout(() => {
            if (window.Renderer && typeof window.Renderer.renderAll === 'function') {
                window.Renderer.renderAll(allData);
            } else {
                console.error('❌ Renderer module not found or renderAll method missing.');
                alert('渲染模块加载失败，请检查 console 日志。');
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ [Loader] Critical Failure:', error);
        if (loadingMsg) {
            loadingMsg.innerHTML = `
                <div style="color: #ff4444; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3>❌ 数据加载失败</h3>
                    <p><strong>错误信息:</strong> ${error.message}</p>
                    <p><strong>当前配置:</strong></p>
                    <ul style="text-align:left; font-size: 0.9em;">
                        <li>分片数量: ${CONFIG.DATA_PARTS_COUNT}</li>
                        <li>基础地址: <code>${CONFIG.BASE_URL}</code></li>
                    </ul>
                    <p>请确认 GitHub 仓库中 <code>JAV-video</code> 文件夹下是否存在 <code>data-part-0.json</code> 到 <code>data-part-3.json</code>。</p>
                    <p>如果文件夹名大小写不对（如 jav-video），或者分支是 master 而不是 main，也会报 404。</p>
                </div>
            `;
        }
    }
}