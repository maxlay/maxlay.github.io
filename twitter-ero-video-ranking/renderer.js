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

    // 初始化 DOM 元素引用
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

    /**
     * 渲染指定日期的视频页面
     * @param {string} dateKey - 日期字符串 (YYYY-MM-DD)
     */
    renderPage(dateKey) {
        this.currentDateKey = dateKey;
        localStorage.setItem('lastDate', dateKey);
        
        if (!this.gridEl) return;
        this.gridEl.innerHTML = '';
        
        let items = DataLoader.groupedData[dateKey] || [];
        
        // 收藏夹置顶逻辑
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
                
                // 格式化收藏数
                const favCount = item.favorite || 0;
                const formattedFav = formatNum(favCount);

                // 【修复点 1】处理标题：如果没有标题，则显示空字符串，不显示“无标题”
                const titleText = item.title ? item.title : ''; 

                // 构建作者链接 HTML
                const authorHtml = `
                    <span class="meta-author" title="作者：${accountId}" onclick="event.preventDefault(); event.stopPropagation(); AccountModal.open('${accountId}')">
                        👤 ${accountId}
                    </span>
                `;

                // 构建卡片内部 HTML
                card.innerHTML = `
                    <div class="thumb-container">
                        <img class="thumb-img" src="${item.thumbnail}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x533?text=No+Image'">
                        <div class="duration-badge">${durationStr}</div>
                        <div class="play-overlay"><div class="play-icon">▶</div></div>
                    </div>
                    <div class="info">
                        <!-- 标题区域，可能为空 -->
                        <div class="title">${titleText}</div>
                        <div class="meta">
                            ${authorHtml}
                            <span class="meta-fav-count" title="收藏人数">★ ${formattedFav}</span>
                            <button class="cast-btn" onclick="event.stopPropagation(); handleCast('${item.url}')">
                                投送 📺
                            </button>
                        </div>
                    </div>
                `;

                // 绑定卡片点击事件
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

    /**
     * 更新分页按钮状态和统计信息
     */
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

    /**
     * 设置分页控件事件
     */
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
            locale: "zh", 
            dateFormat: "Y-m-d", 
            defaultDate: this.currentDateKey, 
            theme: "dark",
            disable: [date => {
                const y = date.getFullYear(), 
                      m = String(date.getMonth()+1).padStart(2,'0'), 
                      d = String(date.getDate()).padStart(2,'0');
                return !DataLoader.sortedDates.includes(`${y}-${m}-${d}`);
            }],
            onChange: (selectedDates, dateStr) => {
                if(dateStr && DataLoader.sortedDates.includes(dateStr)) { 
                    this.renderPage(dateStr); 
                    if(this.fpInstance) this.fpInstance.close(); 
                }
            },
            position: "auto", 
            static: true, 
            appendTo: document.body
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
    
    /**
     * 设置键盘快捷键
     */
    setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (typeof AccountModal !== 'undefined' && AccountModal.isOpen()) return;
            if (typeof ManagerModal !== 'undefined' && ManagerModal.isOpen()) return;
            if (this.fpInstance && this.fpInstance.isOpen) return;
            
            const idx = DataLoader.sortedDates.indexOf(this.currentDateKey);
            if (idx === -1) return;
            
            if (e.key === 'ArrowLeft' && idx > 0) {
                this.renderPage(DataLoader.sortedDates[idx - 1]);
            } else if (e.key === 'ArrowRight' && idx < DataLoader.sortedDates.length - 1) {
                this.renderPage(DataLoader.sortedDates[idx + 1]);
            } else if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
                if(typeof ManagerModal !== 'undefined' && ManagerModal.isOpen()) ManagerModal.close();
                else if(typeof AccountModal !== 'undefined' && AccountModal.isOpen()) AccountModal.close();
            }
        });
    }
};

window.Renderer = Renderer;

/**
 * 【修复点 2】全局投送处理函数
 * 严格按照要求：POST, application/x-www-form-urlencoded, Body 为 JSON 格式数据
 */
async function handleCast(videoUrl) {
    const DEFAULT_TV_IP = '192.168.1.100';
    let tvIp = localStorage.getItem('user_tv_ip');
    
    if (!tvIp) {
        tvIp = prompt("首次使用，请输入电视盒子的 IP 地址:\n(例如: 192.168.1.100)", DEFAULT_TV_IP);
        if (!tvIp) return;
        
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(tvIp)) {
            alert("IP 地址格式不正确，请重试。");
            return;
        }
        localStorage.setItem('user_tv_ip', tvIp);
    }

    const btn = event.target.closest('.cast-btn');
    if(!btn) return;
    
    const originalContent = btn.innerHTML;
    
    // 状态：发送中
    btn.innerHTML = '⏳';
    btn.disabled = true;
    btn.style.opacity = '0.6';

    const actionUrl = `http://${tvIp}:9978/action`;
    
    // 构造请求体
    // 需求：Content-Type: application/x-www-form-urlencoded
    // 需求：Body: { "url": "...", "do": "push" }
    // 在 x-www-form-urlencoded 中，这通常意味着发送一个名为 data 的参数，或者整个 body 就是 json 字符串
    // 尝试方案 A: 直接发送 JSON 字符串作为 Body (很多嵌入式设备这样处理，尽管 Header 是 form)
    // 尝试方案 B: 发送 data=JSON_STRING (标准 form 做法)
    // 这里采用最可能的方案：将 JSON 对象转换为字符串，作为 form 的 value，或者直接发送字符串
    // 鉴于很多此类接口实际上是解析 Body 字符串，我们构造一个标准的 form 字符串：data={"url":"...","do":"push"}
    
    const payloadObj = { url: videoUrl, do: "push" };
    const jsonString = JSON.stringify(payloadObj);
    
    // 构造 form-urlencoded 格式: data={...}
    // 注意：如果电视端极其严格，可能需要 key 为 'data' 或其他，这里假设 key 为 'data' 或者直接是 json 串
    // 如果之前的代码是完全没生效，可能是因为 Body 格式不对。
    // 这里我们尝试两种常见的嵌入式接收模式：
    // 模式 1: Body = "data=" + encodeURIComponent(jsonString)
    // 模式 2: Body = jsonString (此时 Header 应为 application/json，但既然指定了 form，我们优先试模式 1)
    
    // 修正：根据您提供的 "请求体：{...}"，这很可能意味着 Body 内容本身就是这个 JSON 结构。
    // 但如果 Header 强制是 application/x-www-form-urlencoded，服务器可能在寻找 key=value。
    // 让我们尝试最通用的方式：将 JSON 字符串赋值给一个键，通常这类接口键名可能是 'data', 'params', 或 'body'。
    // 如果不确定键名，有些接口直接接受 raw json string 即使 header 是 form。
    // 为了保险，我们发送：data=<json_string>
    const formData = `data=${encodeURIComponent(jsonString)}`;

    try {
        const response = await fetch(actionUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded' 
            },
            body: formData 
        });

        if (response.ok) {
            btn.innerHTML = '✅';
            btn.style.color = '#4cd964';
            btn.style.borderColor = '#4cd964';
            setTimeout(() => resetCastButton(btn, originalContent), 2000);
        } else {
            // 如果 400 或 500，尝试备用方案：直接发送 JSON 字符串（不带 key=）
            console.warn(`第一次尝试失败 (Status ${response.status})，尝试备用方案...`);
            
            const retryResponse = await fetch(actionUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded' // 保持 Header 不变
                },
                body: jsonString // 备用：直接发送 JSON 字符串
            });

            if (retryResponse.ok) {
                 btn.innerHTML = '✅';
                 btn.style.color = '#4cd964';
                 btn.style.borderColor = '#4cd964';
            } else {
                 throw new Error(`HTTP ${retryResponse.status}`);
            }
        }
    } catch (error) {
        console.error('投送失败:', error);
        btn.innerHTML = '❌';
        btn.style.color = '#ff4444';
        btn.style.borderColor = '#ff4444';
        
        setTimeout(() => {
            resetCastButton(btn, originalContent);
            // 仅在连续失败时提示重置 IP
            if(confirm(`投送失败：无法连接到 ${tvIp}\n错误信息：${error.message}\n是否重新设置 IP？`)) {
                localStorage.removeItem('user_tv_ip');
            }
        }, 2000);
    }
}

function resetCastButton(btn, originalContent) {
    btn.innerHTML = originalContent;
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.color = '';
    btn.style.borderColor = '';
}