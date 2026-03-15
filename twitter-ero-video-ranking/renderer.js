/**
 * renderer.js
 * 负责视频卡片的渲染逻辑
 */

// 全局配置：默认电视 IP (用户首次使用后会被 localStorage 覆盖)
const DEFAULT_TV_IP = '192.168.1.100';

/**
 * 主渲染函数：将视频列表数据渲染到网格容器
 * @param {Array} videos - 视频数据数组
 * @param {HTMLElement} container - 目标容器 DOM 元素
 */
function renderVideos(videos, container) {
    if (!container) {
        console.error('容器未找到');
        return;
    }

    // 清空容器
    container.innerHTML = '';

    if (!videos || videos.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#666;">暂无视频数据</div>';
        return;
    }

    // 创建文档片段以提高性能
    const fragment = document.createDocumentFragment();

    videos.forEach(video => {
        const card = createVideoCard(video);
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

/**
 * 创建单个视频卡片
 * @param {Object} video - 单个视频数据对象
 * 期望结构: { id, title, cover, duration, author, fav_count, url }
 */
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'card';
    
    // 数据预处理
    const authorName = video.author || '未知作者';
    const favCount = video.fav_count !== undefined ? video.fav_count : 0;
    // 格式化收藏数：超过1000显示为 k (例: 1.2k)
    const formattedFav = favCount > 999 ? (favCount / 1000).toFixed(1) + 'k' : favCount;
    const videoUrl = video.url || '#';
    const coverUrl = video.cover || 'placeholder.jpg';
    const title = video.title || '无标题';
    const duration = video.duration || '00:00';

    // 构建 HTML 结构
    // 布局：底部 Meta 区域分为三部分：[作者] [收藏数] [投送按钮]
    card.innerHTML = `
        <div class="thumb-container">
            <img src="${coverUrl}" class="thumb-img" alt="${title}" loading="lazy">
            <div class="play-overlay">
                <div class="play-icon">▶</div>
            </div>
            <div class="duration-badge">${duration}</div>
        </div>
        <div class="info">
            <div class="title" title="${title}">${title}</div>
            
            <!-- 底部信息栏：作者 | 收藏 | 投送 -->
            <div class="meta">
                <!-- 1. 作者 (左侧) -->
                <span class="meta-author" title="作者：${authorName}">
                    👤 ${escapeHtml(authorName)}
                </span>

                <!-- 2. 收藏数量 (中间) -->
                <span class="meta-fav-count" title="收藏人数">
                    ★ ${formattedFav}
                </span>

                <!-- 3. 投送按钮 (右侧) -->
                <button class="cast-btn" onclick="event.stopPropagation(); handleCast('${videoUrl}')">
                    投送 📺
                </button>
            </div>
        </div>
    `;

    // 绑定卡片点击事件 (播放视频)
    card.onclick = (e) => {
        // 如果点击的是投送按钮，不触发播放
        if (e.target.closest('.cast-btn')) return;
        
        // 调用全局播放函数 (假设在 init.js 或 core.js 中定义)
        if (typeof openVideoPlayer === 'function') {
            openVideoPlayer(video);
        } else {
            console.warn('openVideoPlayer 函数未定义');
            alert('播放功能尚未初始化');
        }
    };

    return card;
}

/**
 * 处理投送逻辑
 * @param {string} url - 视频链接
 */
async function handleCast(url) {
    // 1. 获取电视 IP
    let tvIp = localStorage.getItem('user_tv_ip');
    
    if (!tvIp) {
        tvIp = prompt("首次使用，请输入电视盒子的 IP 地址:\n(例如: 192.168.1.100)", DEFAULT_TV_IP);
        if (!tvIp) return; // 用户取消
        
        // 简单校验 IP 格式
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(tvIp)) {
            alert("IP 地址格式不正确，请重试。");
            return;
        }
        
        localStorage.setItem('user_tv_ip', tvIp);
    }

    const btn = event.target;
    const originalContent = btn.innerHTML;
    
    // 2. 更新按钮状态
    btn.innerHTML = '⏳';
    btn.disabled = true;
    btn.style.opacity = '0.6';

    // 3. 构造请求
    const actionUrl = `http://${tvIp}:9978/action`;
    // 注意：XML 数据中的引号需要正确转义
    const postData = `<quark-table><table><tbody><tr><td>1234</td><td>{"url": "${url}", "do": "push"}</td></tr></tbody></table></quark-table>`;

    try {
        const response = await fetch(actionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: postData
        });

        if (response.ok) {
            // 成功
            btn.innerHTML = '✅';
            btn.style.color = '#4cd964';
            btn.style.borderColor = '#4cd964';
            
            setTimeout(() => resetButton(btn, originalContent), 2000);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('投送失败:', error);
        
        // 失败
        btn.innerHTML = '❌';
        btn.style.color = '#ff4444';
        btn.style.borderColor = '#ff4444';
        
        setTimeout(() => {
            resetButton(btn, originalContent);
            if(confirm(`投送失败：无法连接到 ${tvIp}\n是否重新设置 IP？`)) {
                localStorage.removeItem('user_tv_ip');
            }
        }, 2000);
    }
}

/**
 * 重置按钮状态
 */
function resetButton(btn, originalContent) {
    btn.innerHTML = originalContent;
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.color = '';
    btn.style.borderColor = '';
}

/**
 * 简单的 HTML 转义，防止 XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 导出函数供其他模块使用 (如果使用模块化)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderVideos, createVideoCard, handleCast };
}