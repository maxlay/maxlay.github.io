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

        // 【新增步骤 1】过滤回收站内的作者视频
        const recycleBin = StorageManager.get(CONFIG.STORAGE_KEYS.RECYCLE_BIN);
        const recycleSet = new Set(recycleBin || []);
        
        if (recycleSet.size > 0) {
            items = items.filter(item => {
                const accountId = getAccountId(item);
                return !recycleSet.has(accountId);
            });
        }

        // 【新增步骤 2】应用复杂的自定义排序逻辑
        const favorites = StorageManager.get(CONFIG.STORAGE_KEYS.FAVORITES);
        const favSet = new Set(favorites || []);

        items.sort((a, b) => {
            const idA = getAccountId(a);
            const idB = getAccountId(b);
            const isFavA = favSet.has(idA);
            const isFavB = favSet.has(idB);
            
            const timeA = a.time || 0; // 秒
            const timeB = b.time || 0;
            
            const dateA = new Date(a.created_at || a.posted_at || 0).getTime();
            const dateB = new Date(b.created_at || b.posted_at || 0).getTime();

            // 1. 第一优先级：收藏 (收藏 > 非收藏)
            if (isFavA && !isFavB) return -1;
            if (!isFavA && isFavB) return 1;

            // 如果同为收藏或同为非收藏，进入内部细分排序
            if (isFavA && isFavB) {
                // 【规则 1】收藏组内：按作者字母顺序 A-Z
                return idA.localeCompare(idB);
            }

            // --- 非收藏组的细分逻辑 ---
            
            // 处理跨区间优先级：长 (>30) > 中 (5-30) > 短 (<5)
            const isLongA = timeA >= 1800;
            const isLongB = timeB >= 1800;
            const isMidA = timeA >= 300 && timeA < 1800;
            const isMidB = timeB >= 300 && timeB < 1800;
            const isShortA = timeA < 300;
            const isShortB = timeB < 300;

            // 如果区间不同，按 长->中->短 排序
            if (isLongA && !isLongB) return -1;
            if (!isLongA && isLongB) return 1;
            
            if (isMidA && !isMidB && !isLongA && !isLongB) return -1; // 都是非长视频时，中优于短
            if (!isMidA && isMidB && !isLongA && !isLongB) return 1;

            // 如果区间相同，执行区间内排序规则
            // 2. 【规则 2】30分钟以上：时长长的在前
            if (isLongA && isLongB) {
                return timeB - timeA; 
            }
            
            // 3. 【规则 3】5分钟 ~ 30分钟：按作者字母顺序 A-Z
            if (isMidA && isMidB) {
                 return idA.localeCompare(idB);
            }

            // 4. 【规则 4】5分钟以下：按发布时间倒序 (新的在前)
            if (isShortA && isShortB) {
                return dateB - dateA;
            }

            return 0;
        });

        if (items.length === 0) {
            this.gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#666;">该日期暂无视频数据 (或所有视频作者均在回收站)</div>';
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
        // 注意：这里的 count 显示的是过滤前的原始数据量，如果需要显示过滤后的数量，需重新计算
        // 为了性能，这里保持显示原始数据量，或者你可以改为从 DOM 计数，但通常原始数据量更有参考价值
        const count = (DataLoader.groupedData[this.currentDateKey] || []).length;
        
        ['page-date', 'top-page-date'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerText = this.currentDateKey;
        });
        // 更新显示数量为当前渲染的实际数量 (过滤后)
        const actualCount = this.gridEl.querySelectorAll('.card').length;
        ['page-count', 'top-page-count'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerText = `${actualCount} 部`;
        });

        const hasNew = idx > 0;
        const hasOld = idx < DataLoader.sortedDates.length - 1;
        [this.newerBtn, this.topNewerBtn].forEach(b => { if(b) b.disabled = !hasNew; });
        [this.olderBtn, this.topOlderBtn].forEach(b => { if(b) b.disabled = !hasOld; });
        
        // 按钮文字中的数量也建议显示实际可见数量，这里简化处理仍显示原始数据量，如需精确需遍历所有日期数据
        const txtNew = hasNew ? `⬅ ${DataLoader.sortedDates[idx-1]}` : "已是最新";
        const txtOld = hasOld ? `${DataLoader.sortedDates[idx+1]} ➡` : "已是最旧";
        
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