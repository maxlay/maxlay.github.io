// ================= 视频网格渲染与分页模块 =================
const Renderer = {
    currentDateKey: "",
    fpInstance: null,

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
        this.gridEl.innerHTML = '';
        let items = DataLoader.groupedData[dateKey] || [];
        
        // 收藏夹置顶
        const favorites = StorageManager.get(CONFIG.STORAGE_KEYS.FAVORITES);
        if (favorites.length > 0) {
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

        if(items.length === 0) {
            this.gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;">无数据</div>';
        } else {
            items.forEach(item => {
                const a = document.createElement('a');
                a.className = 'card'; a.href = item.url; a.target = '_blank';
                const accountId = getAccountId(item);
                const m = Math.floor((item.time||0)/60), s = (item.time||0)%60;
                const titleHtml = `<span class="account-link" onclick="event.preventDefault(); event.stopPropagation(); AccountModal.open('${accountId}')">${accountId}</span>`;

                a.innerHTML = `
                    <div class="thumb-container">
                        <img class="thumb-img" src="${item.thumbnail}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x533?text=No+Image'">
                        <div class="duration-badge">${m}:${s.toString().padStart(2,'0')}</div>
                        <div class="play-overlay"><div class="play-icon">▶</div></div>
                    </div>
                    <div class="info">
                        <div class="title">${titleHtml}</div>
                        <div class="meta">
                            <span>👁️ ${formatNum(item.pv)}</span>
                            <span>❤️ ${formatNum(item.favorite)}</span>
                        </div>
                    </div>`;
                this.gridEl.appendChild(a);
            });
        }
        this.updateUI();
        window.scrollTo({top: 0, behavior: 'smooth'});
    },

    updateUI() {
        const idx = DataLoader.sortedDates.indexOf(this.currentDateKey);
        if (idx === -1) return;
        const count = DataLoader.groupedData[this.currentDateKey].length;
        
        ['page-date', 'top-page-date'].forEach(id => document.getElementById(id).innerText = this.currentDateKey);
        ['page-count', 'top-page-count'].forEach(id => document.getElementById(id).innerText = `${count} 部`);

        const hasNew = idx > 0, hasOld = idx < DataLoader.sortedDates.length - 1;
        [this.newerBtn, this.topNewerBtn].forEach(b => b.disabled = !hasNew);
        [this.olderBtn, this.topOlderBtn].forEach(b => b.disabled = !hasOld);

        const txtNew = hasNew ? `⬅ ${DataLoader.sortedDates[idx-1]} (${DataLoader.groupedData[DataLoader.sortedDates[idx-1]].length})` : "已是最新";
        const txtOld = hasOld ? `${DataLoader.sortedDates[idx+1]} (${DataLoader.groupedData[DataLoader.sortedDates[idx+1]].length}) ➡` : "已是最旧";
        
        [this.newerBtn, this.topNewerBtn].forEach(b => b.innerText = txtNew);
        [this.olderBtn, this.topOlderBtn].forEach(b => b.innerText = txtOld);
    },

    setupPagination() {
        const goNew = () => { const i=DataLoader.sortedDates.indexOf(this.currentDateKey); if(i>0) this.renderPage(DataLoader.sortedDates[i-1]); };
        const goOld = () => { const i=DataLoader.sortedDates.indexOf(this.currentDateKey); if(i<DataLoader.sortedDates.length-1) this.renderPage(DataLoader.sortedDates[i+1]); };
        
        [this.newerBtn, this.topNewerBtn].forEach(b => b.onclick = goNew);
        [this.olderBtn, this.topOlderBtn].forEach(b => b.onclick = goOld);

        // Flatpickr 初始化
        const commonConfig = {
            locale: "zh", dateFormat: "Y-m-d", defaultDate: this.currentDateKey, theme: "dark",
            disable: [date => {
                const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0');
                return !DataLoader.sortedDates.includes(`${y}-${m}-${d}`);
            }],
            onChange: (selectedDates, dateStr) => {
                if(dateStr && DataLoader.sortedDates.includes(dateStr)) { this.renderPage(dateStr); if(this.fpInstance) this.fpInstance.close(); }
            },
            position: "auto", static: true, appendTo: document.body
        };

        if(this.fpInstance) this.fpInstance.destroy();
        const hiddenInput = document.createElement('input');
        hiddenInput.style.display = 'none';
        document.body.appendChild(hiddenInput);
        this.fpInstance = flatpickr(hiddenInput, commonConfig);

        this.topDateTrigger.onclick = (e) => {
            e.stopPropagation();
            if(this.fpInstance) { this.fpInstance.setDate(this.currentDateKey); this.fpInstance.open(); }
        };
    },
    
    setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (AccountModal.isOpen() || ManagerModal.isOpen() || (this.fpInstance && this.fpInstance.isOpen)) return;
            
            const idx = DataLoader.sortedDates.indexOf(this.currentDateKey);
            if (idx === -1) return;
            if (e.key === 'ArrowLeft' && idx > 0) this.renderPage(DataLoader.sortedDates[idx - 1]);
            else if (e.key === 'ArrowRight' && idx < DataLoader.sortedDates.length - 1) this.renderPage(DataLoader.sortedDates[idx + 1]);
            else if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
                if(ManagerModal.isOpen()) ManagerModal.close();
                else if(AccountModal.isOpen()) AccountModal.close();
            }
        });
    }
};

window.Renderer = Renderer;