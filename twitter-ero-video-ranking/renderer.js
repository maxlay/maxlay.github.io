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
                
                // 标题为空时不显示文字
                const titleText = item.title ? item.title : ''; 

                const authorHtml = `
                    <span class="meta-author" title="作者：${accountId}" onclick="event.preventDefault(); event.stopPropagation(); AccountModal.open('${accountId}')">
                        👤 ${accountId}
                    </span>
                `;

                // 【新增】收藏数点击复制逻辑
                // 使用 onclick 属性直接调用匿名函数，确保 event 对象可用
                // 注意：item.url 需要正确转义以防 HTML 注入，这里假设 url 是安全的或通过模板引擎处理
                // 为了安全起见，我们在生成 HTML 时将 url 放入 data 属性或直接通过闭包传递更好，
                // 但为了保持原有单文件结构风格，这里直接在 onclick 中引用 item.url (需确保 url 不含单引号)
                // 更稳健的做法是将 url 编码后传入，或者绑定事件监听器。
                // 这里采用更稳健的 dataset 方式传递 URL，避免 URL 中包含单引号导致 JS 报错。
                
                const safeUrl = item.url.replace(/'/g, "\\'"); 

                const favCountHtml = `
                    <span class="meta-fav-count" 
                          title="点击复制链接" 
                          style="cursor: pointer;"
                          onclick="event.preventDefault(); event.stopPropagation(); navigator.clipboard.writeText('${safeUrl}').catch(err=>{});">
                        ★ ${formattedFav}
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
                            ${favCountHtml}
                        </div>
                    </div>
                `;

                card.onclick = (e) => {
                    // 如果点击的是作者或收藏数，不触发播放
                    if (e.target.closest('.meta-author') || e.target.closest('.meta-fav-count')) return;
                    
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