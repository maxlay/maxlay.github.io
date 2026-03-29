// ================= 核心常量与工具 =================
const CONFIG = {
    PASSWORD: "821025",
    COOKIE_NAME: "x_video_auth_verified",
    // 修改这里：强制指定远程基础地址，末尾必须带 /
    //BASE_URL: './', 
    //BASE_URL: 'https://ghproxy.net/https://raw.githubusercontent.com/maxlay/maxlay.github.io/main/twitter-ero-video-ranking/', 
    BASE_URL: 'https://ghproxy.net/https://raw.githubusercontent.com/maxlay/maxlay.github.io/main/twitter-ero-video-ranking/', 
    //BASE_URL: window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1), // 自动获取当前目录
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


async function checkPassword(input) {
    if (input === CONFIG.PASSWORD) {
        setPermanentCookie(CONFIG.COOKIE_NAME, "true");
        
        // 【关键】调用 onAuthSuccess 处理后续逻辑
        // 数据已在后台加载中，如果已完成则秒开
        if (typeof onAuthSuccess === 'function') {
            await onAuthSuccess();
        } else {
            // 降级处理：直接隐藏遮罩
            document.getElementById('login-overlay').style.display = 'none';
            if (typeof appInit === 'function') await appInit();
        }
        return true;
    } else {
        const err = document.getElementById('loginError');
        err.style.display = 'block';
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