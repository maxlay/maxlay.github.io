// ================= 核心模块：配置、存储与工具 (core.js) =================

// 1. 全局配置 (替代 config.js)
window.CONFIG = {
    BASE_URL: './',              // 数据文件所在目录
    DATA_PARTS_COUNT: 5,         // 数据分片数量 (data-part-0.json 到 data-part-4.json)
    STORAGE_KEYS: {
        FAVORITES: 'video_calendar_favorites',
        RECYCLE_BIN: 'video_calendar_recycle'
    },
    COOKIE_NAME: 'auth_status'
};

// 2. 存储管理模块 (替代 storage-manager.js)
const StorageManager = {
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Storage read error:', e);
            return null;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage write error:', e);
            return false;
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }
};
window.StorageManager = StorageManager;

// 3. 通用工具函数 (替代 utils.js)

/**
 * 获取账号 ID (兼容多种字段名)
 */
function getAccountId(item) {
    if (!item) return 'Unknown';
    return item.author_id || item.account_id || item.uid || item.user_id || item.nickname || '未知账号';
}

/**
 * 格式化时间戳为 YYYY-MM-DD
 */
function formatDateKey(timestamp) {
    if (!timestamp) return '未知日期';
    // 支持秒级或毫秒级时间戳
    const ts = timestamp > 10000000000 ? timestamp : timestamp * 1000;
    const d = new Date(ts);
    
    if (isNaN(d.getTime())) return '无效日期';
    
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * 数字格式化 (1200 -> 1.2k, 12000 -> 1.2w)
 */
function formatNum(num) {
    if (num === null || num === undefined) return '0';
    const n = Number(num);
    if (isNaN(n)) return '0';
    if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿';
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
}

/**
 * 安全地打开视频播放器
 */
function openVideoPlayer(item) {
    if (!item || !item.url) {
        alert('该视频没有有效的播放链接');
        return;
    }
    
    // 优先使用自定义播放器 (如果 renderer.js 或其他地方定义了 playVideo)
    if (typeof window.playVideo === 'function') {
        window.playVideo(item);
        return;
    }
    
    // 默认行为：新标签页打开
    window.open(item.url, '_blank');
}

/**
 * Cookie 操作辅助 (用于自动登录检查)
 */
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

// 导出到全局窗口对象
window.getAccountId = getAccountId;
window.formatDateKey = formatDateKey;
window.formatNum = formatNum;
window.openVideoPlayer = openVideoPlayer;
window.getCookie = getCookie;
window.setCookie = setCookie;