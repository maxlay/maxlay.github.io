// ================= 视频网格渲染与分页模块 =================
const Renderer = {
    currentDateKey: "",
    fpInstance: null,
    gridEl: null,
    loadingEl: null,
    statsTotalEl: null,
    statsNewestEl: null,
    newerBtn: null,
    olderBtn: null,
    topNewerBtn: null,
    topOlderBtn: null,
    topDateTrigger: null,

    initElements() {
        this.gridEl = document.getElementById('video-grid');
        this.loadingEl = document.getElementById('loading-msg');
        this.statsTotalEl = document.getElementById('stats-total');
        this.statsNewestEl = document.getElementById('stats-newest');
        this.newerBtn = document.getElementById('newer-btn');
        this.olderBtn = document.getElementById('older-btn');
        this.topNewerBtn = document.getElementById('top-newer-btn');
        this.topOlderBtn = document.getElementById('top-older-btn');
        this.topDateTrigger = document.getElementById('top-date-trigger');
    },

    renderPage(dateKey) {
        this.currentDateKey = dateKey;
        localStorage.setItem('lastDate', dateKey);
        
        if (!this.gridEl) return;
        this.gridEl.innerHTML = '';
        
        let items = DataLoader.groupedData[dateKey] || [];
        
        // 收藏夹置顶
        const favorites = StorageManager.get(CONFIG.STORAGE_KEYS.FAVORITES);
        if (favorites && favorites.length > 0) {
            items.sort((a, b) => {
                const idA = getAccountId(a);
                const idB = getAccountId(b);
                const aFav = favorites.includes(idA);
                const bFav = favorites.includes(idB);
                if (aFav && !bFav) return -1;
                if (!aFav && bFav) return 1;
                return 0;
            });
        }

        if (items.length === 0) {
            this.gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#666;">该日期暂无视频数据</div>';
        } else {
            const fragment = document.createDocumentFragment();
            
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'card';
                
                const accountId = getAccountId(item);
                const m = Math.floor((item.time || 0) / 60);
                const s = (item.time || 0) % 60;
                const durationStr = `${m}:${s.toString().padStart(2, '0')}`;
                const favCount = item.favorite || 0;
                const formattedFav = formatNum(favCount);
                
                // 【修复】标题为空时不显示文字
                const titleText = item.title ? item.title : ''; 

                const authorHtml = `
                    <span class="meta-author" title="作者：${accountId}" onclick="event.preventDefault(); event.stopPropagation(); AccountModal.open('${accountId}')">
                        👤 ${accountId}
                    </span>
                `;

                card.innerHTML = `
                    <div class="thumb-container">
                        <img class="thumb-img" src="${item.thumbnail}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x533?text=No+Image'">
                        <div class="duration-badge">${durationStr}</div>
                        <div class="play-overlay"><div class="play-icon">▶</div></div>
                    </div>
                    <div class="info">
                        <div class="title">${titleText}</div>
                        <div class="meta">
                            ${authorHtml}
                            <span class="meta-fav-count" title="收藏人数">★ ${formattedFav}</span>
                            <button class="cast-btn" onclick="event.stopPropagation(); handleCast('${item.url}')">
                                投送
                            </button>
                        </div>
                    </div>
                `;

                card.onclick = (e) => {
                    if (e.target.closest('.cast-btn') || e.target.closest('.meta-author')) return;
                    if (typeof openVideoPlayer === 'function') {
                        openVideoPlayer(item);
                    } else {
                        window.open(item.url, '_blank');
                    }
                };

                fragment.appendChild(card);
            });
            this.gridEl.appendChild(fragment);
        }
        
        this.updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateUI() {
        const idx = DataLoader.sortedDates.indexOf(this.currentDateKey);
        if (idx === -1) return;
        const count = (DataLoader.groupedData[this.currentDateKey] || []).length;
        
        ['page-date', 'top-page-date'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerText = this.currentDateKey;
        });
        ['page-count', 'top-page-count'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerText = `${count} 部`;
        });

        const hasNew = idx > 0;
        const hasOld = idx < DataLoader.sortedDates.length - 1;

        [this.newerBtn, this.topNewerBtn].forEach(b => { if(b) b.disabled = !hasNew; });
        [this.olderBtn, this.topOlderBtn].forEach(b => { if(b) b.disabled = !hasOld; });

        const txtNew = hasNew ? `⬅ ${DataLoader.sortedDates[idx-1]} (${(DataLoader.groupedData[DataLoader.sortedDates[idx-1]]||[]).length})` : "已是最新";
        const txtOld = hasOld ? `${DataLoader.sortedDates[idx+1]} (${(DataLoader.groupedData[DataLoader.sortedDates[idx+1]]||[]).length}) ➡` : "已是最旧";
        
        [this.newerBtn, this.topNewerBtn].forEach(b => { if(b) b.innerText = txtNew; });
        [this.olderBtn, this.topOlderBtn].forEach(b => { if(b) b.innerText = txtOld; });
    },

    setupPagination() {
        const goNew = () => { 
            const i = DataLoader.sortedDates.indexOf(this.currentDateKey); 
            if(i > 0) this.renderPage(DataLoader.sortedDates[i-1]); 
        };
        const goOld = () => { 
            const i = DataLoader.sortedDates.indexOf(this.currentDateKey); 
            if(i < DataLoader.sortedDates.length - 1) this.renderPage(DataLoader.sortedDates[i+1]); 
        };
        
        [this.newerBtn, this.topNewerBtn].forEach(b => { if(b) b.onclick = goNew; });
        [this.olderBtn, this.topOlderBtn].forEach(b => { if(b) b.onclick = goOld; });

        const commonConfig = {
            locale: "zh", dateFormat: "Y-m-d", defaultDate: this.currentDateKey, theme: "dark",
            disable: [date => {
                const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0');
                return !DataLoader.sortedDates.includes(`${y}-${m}-${d}`);
            }],
            onChange: (selectedDates, dateStr) => {
                if(dateStr && DataLoader.sortedDates.includes(dateStr)) { 
                    this.renderPage(dateStr); 
                    if(this.fpInstance) this.fpInstance.close(); 
                }
            },
            position: "auto", static: true, appendTo: document.body
        };

        if(this.fpInstance) this.fpInstance.destroy();
        let hiddenInput = document.getElementById('fp-hidden-input');
        if(!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.id = 'fp-hidden-input';
            hiddenInput.style.display = 'none';
            document.body.appendChild(hiddenInput);
        }
        this.fpInstance = flatpickr(hiddenInput, commonConfig);

        if(this.topDateTrigger) {
            this.topDateTrigger.onclick = (e) => {
                e.stopPropagation();
                if(this.fpInstance) { 
                    this.fpInstance.setDate(this.currentDateKey); 
                    this.fpInstance.open(); 
                }
            };
        }
    },
    
    setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (typeof AccountModal !== 'undefined' && AccountModal.isOpen()) return;
            if (typeof ManagerModal !== 'undefined' && ManagerModal.isOpen()) return;
            if (this.fpInstance && this.fpInstance.isOpen) return;
            
            const idx = DataLoader.sortedDates.indexOf(this.currentDateKey);
            if (idx === -1) return;
            
            if (e.key === 'ArrowLeft' && idx > 0) this.renderPage(DataLoader.sortedDates[idx - 1]);
            else if (e.key === 'ArrowRight' && idx < DataLoader.sortedDates.length - 1) this.renderPage(DataLoader.sortedDates[idx + 1]);
            else if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
                if(typeof ManagerModal !== 'undefined' && ManagerModal.isOpen()) ManagerModal.close();
                else if(typeof AccountModal !== 'undefined' && AccountModal.isOpen()) AccountModal.close();
            }
        });
    }
};

window.Renderer = Renderer;

/**
 * 【智能通用版】投送处理函数
 * 策略：
 * 1. 优先尝试 AirPlay (仅限 Safari/iOS/macOS)
 * 2. 若环境不支持 AirPlay (Android/Windows)，自动复制链接并提示用户
 * 
 * 目标：让用户在任何设备上点击都有反馈，尽可能实现投屏。
 */
async function handleCast(videoUrl) {
    const btn = event.target.closest('.cast-btn');
    if(!btn) return;
    
    const originalText = btn.innerHTML;
    
    // UI 状态：正在尝试...
    btn.innerHTML = '📡';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    let success = false;

    // --- 尝试 1: AirPlay (Safari 专属) ---
    // 检查浏览器是否支持 AirPlay API (只有 Safari 支持)
    if (typeof HTMLMediaElement !== 'undefined' && 
        HTMLMediaElement.prototype.webkitShowPlaybackTargetPicker) {
        
        try {
            // 创建一个隐藏的 video 元素作为 AirPlay 的载体
            const tempVideo = document.createElement('video');
            tempVideo.src = videoUrl;
            tempVideo.style.display = 'none';
            tempVideo.setAttribute('playsinline', 'true'); // iOS 必要属性
            document.body.appendChild(tempVideo);

            // 等待元数据加载（确保播放器就绪）
            await new Promise((resolve, reject) => {
                if (tempVideo.readyState >= 1) {
                    resolve();
                } else {
                    tempVideo.onloadedmetadata = resolve;
                    tempVideo.onerror = resolve; // 防止加载失败卡死
                    setTimeout(() => resolve(), 2000); // 超时保护
                }
            });

            // 调用原生 AirPlay 选择器
            if (tempVideo.webkitShowPlaybackTargetPicker) {
                tempVideo.webkitShowPlaybackTargetPicker();
                btn.innerHTML = '✅ AirPlay';
                btn.style.color = '#4cd964';
                success = true;
                
                // 延迟清理临时元素，防止选择器刚弹出就消失
                setTimeout(() => {
                    if(document.body.contains(tempVideo)) {
                        document.body.removeChild(tempVideo);
                    }
                }, 3000);
            } else {
                throw new Error("API 不可用");
            }
        } catch (err) {
            console.log("AirPlay 尝试失败:", err);
            // 失败后不立即 alert，而是落入下方的通用方案
        }
    }

    // --- 尝试 2: 如果 AirPlay 不可用 (Android/Windows)，执行通用方案 ---
    if (!success) {
        // 在非 Apple 设备上，Web 端无法直接控制电视播放（除非电视支持 Chromecast 且网页集成 SDK）
        // 最通用的“投屏”方式是：复制链接 -> 用户在电视播放器中粘贴
        
        try {
            await navigator.clipboard.writeText(videoUrl);
            
            // 提示用户
            const msg = "✅ 链接已复制！\n\n当前设备/浏览器不支持 AirPlay 协议。\n请打开电视上的播放器 (如 Kodi, VLC, 当贝播放器, Apple TV 客户端)，选择【网络播放/URL 播放】，然后粘贴链接。";
            alert(msg);
            
            btn.innerHTML = '📋 已复制';
            btn.style.color = '#4cd964';
            success = true;
        } catch (err) {
            // 剪贴板 API 失败（如非 HTTPS 环境），降级为 prompt
            const fallback = prompt("无法自动复制，请手动复制以下链接并在电视上播放:", videoUrl);
            if(fallback !== null) success = true;
        }
    }

    // 恢复按钮状态
    setTimeout(() => {
        if(success && btn.innerHTML.includes('✅')) {
            // 保持成功状态几秒
            setTimeout(() => resetBtn(btn, originalText), 2000);
        } else {
            resetBtn(btn, originalText);
        }
    }, success ? 0 : 1000);
}

function resetBtn(btn, text) {
    if(btn) {
        btn.innerHTML = text;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.color = '';
        btn.style.borderColor = '';
    }
}