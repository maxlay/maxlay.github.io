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
                            <button class="cast-btn" onclick="event.stopPropagation(); handleCast('${item.url}', '${item.title || '视频'}')">
                                投屏
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
 * 【终极系统级投屏版】
 * 策略：
 * 1. 尝试 Presentation API (标准投屏)
 * 2. 尝试 Web Share API (唤起小米/苹果系统投屏菜单)
 * 3. 降级：复制链接
 */
async function handleCast(videoUrl, videoTitle) {
    const btn = event.target.closest('.cast-btn');
    if(!btn) return;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '📡';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    let success = false;

    // --- 尝试 1: Presentation API (W3C 标准，部分安卓浏览器支持) ---
    if (navigator.presentation && navigator.presentation.defaultRequest) {
        try {
            const request = navigator.presentation.defaultRequest;
            request.urls = [videoUrl]; // 某些实现需要 URL
            // 注意：此 API 在很多移动端浏览器上实现不完整，可能无反应
            const connection = await request.start();
            console.log("Presentation connected:", connection);
            btn.innerHTML = '✅ 投屏中';
            btn.style.color = '#4cd964';
            success = true;
        } catch (e) {
            console.log("Presentation API 不可用或失败", e);
        }
    }

    // --- 尝试 2: Web Share API (最推荐！唤起小米/苹果系统级菜单) ---
    if (!success && navigator.share) {
        try {
            console.log("尝试唤起系统分享菜单...");
            await navigator.share({
                title: videoTitle || '视频投送',
                text: '点击下方链接在电视上播放',
                url: videoUrl
            });
            // 用户完成分享动作后
            btn.innerHTML = '✅ 已发送';
            btn.style.color = '#4cd964';
            success = true;
            
            // 针对小米用户的特别提示
            setTimeout(() => {
                alert("💡 操作指引：\n\n1. 在弹出的系统菜单中，寻找【投屏】、【小米视频】、【多屏互动】或【AirPlay】图标。\n2. 点击后选择您的【小米电视】。\n3. 如果菜单中没有投屏选项，请选择【微信/QQ】发送给‘文件传输助手’，然后在电视端打开。");
                resetBtn(btn, originalText);
            }, 800);
            
            return; // 成功则直接返回
        } catch (err) {
            console.log("用户取消分享或不支持 Share API", err);
            // 不立即失败，继续向下执行
        }
    }

    // --- 尝试 3: 针对小米电视的特殊方案 (如果以上都失败) ---
    if (!success) {
        // 生成一个简易的播放页二维码逻辑太复杂，这里直接采用最稳妥的“复制链接 + 强提示”
        try {
            await navigator.clipboard.writeText(videoUrl);
            
            // 检测是否为小米/Redmi 设备
            const isXiaomi = /Mi|Xiaomi|Redmi|POCO/.test(navigator.userAgent);
            const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent);
            
            let tipMsg = "✅ 链接已复制！\n\n";
            
            if (isXiaomi) {
                tipMsg += "📺 【小米电视专属操作】\n" +
                          "方法 A (推荐): 在电视主页打开【手机投屏】App，选择【链接投屏】，粘贴即可。\n" +
                          "方法 B: 打开电视上的【OK 影视】或【高清播放器】，选择【网络播放】，粘贴链接。\n" +
                          "方法 C: 重新点击按钮，在弹出的系统菜单中寻找【投屏】图标。";
            } else if (isMac) {
                tipMsg += "🍎 【Mac 专属操作】\n" +
                          "1. 确保电视已开启 AirPlay (设置 -> 通用 -> AirPlay)。\n" +
                          "2. 重新点击按钮，在分享菜单中选择【隔空播放】。\n" +
                          "3. 或者在电视上打开浏览器，访问此页面直接播放。";
            } else {
                tipMsg += "请在电视上打开播放器 (Kodi/VLC/当贝)，选择【网络播放】并粘贴链接。";
            }
            
            alert(tipMsg);
            
            btn.innerHTML = '📋 已复制';
            btn.style.color = '#faad14';
            success = true;
        } catch (e) {
            const fallback = prompt("无法自动复制，请手动复制:", videoUrl);
            if (fallback !== null) {
                btn.innerHTML = '📋 已复制';
                btn.style.color = '#faad14';
                success = true;
            }
        }
        
        setTimeout(() => resetBtn(btn, originalText), 4000);
    }
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