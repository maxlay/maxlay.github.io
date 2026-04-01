// ================= 账号详情弹窗模块 =================
const AccountModal = {
    currentAccount: null,
    open(accountName) {
        if (!accountName) return;
        
        // 添加延迟以确保事件不会被其他操作干扰
        setTimeout(() => {
            this.currentAccount = accountName;
            const filteredData = DataLoader.allData.filter(item => getAccountId(item) === accountName);
            if (filteredData.length === 0) { 
                alert("该账号下暂无视频数据。"); 
                return; 
            }
            
            filteredData.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            
            const nameEl = document.getElementById('modal-account-name');
            nameEl.innerHTML = `${accountName} <span class="modal-count">(${filteredData.length})</span>`;
            
            const listEl = document.getElementById('waterfall-list');
            listEl.innerHTML = '';
            
            filteredData.forEach(item => {
                const div = document.createElement('div');
                div.className = 'waterfall-item';
                const m = Math.floor((item.time||0)/60), s = (item.time||0)%60;
                const dateStr = item.posted_at || item.created_at || '';
                
                div.innerHTML = `
                    <div class="waterfall-thumb-container">
                        <img class="waterfall-thumb-img" src="${item.thumbnail}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x533?text=No+Image'">
                        <div class="waterfall-duration-badge">${m}:${s.toString().padStart(2,'0')}</div>
                        <div class="waterfall-play-overlay"><div class="play-icon">▶</div></div>
                    </div>
                    <div class="waterfall-info">
                        <div class="waterfall-date">📅 ${dateStr ? dateStr.substring(0, 10) : ''}</div>
                    </div>
                `;
                div.onclick = () => { 
                    if(item.url) window.open(item.url, '_blank'); 
                };
                listEl.appendChild(div);
            });
            
            this.updateButtons();
            document.getElementById('account-modal').classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // 确保弹窗可见
            document.getElementById('account-modal').style.zIndex = '99999';
        }, 50); // 50毫秒延迟确保事件处理完成
    },
    open(accountName) {
        if (!accountName) return;
        this.currentAccount = accountName;
        const filteredData = DataLoader.allData.filter(item => getAccountId(item) === accountName);
        if (filteredData.length === 0) { 
            alert("该账号下暂无视频数据。"); 
            return; 
        }
        
        filteredData.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        
        const nameEl = document.getElementById('modal-account-name');
        nameEl.innerHTML = `${accountName} <span class="modal-count">(${filteredData.length})</span>`;
        
        const listEl = document.getElementById('waterfall-list');
        listEl.innerHTML = '';
        
        filteredData.forEach(item => {
            const div = document.createElement('div');
            div.className = 'waterfall-item';
            const m = Math.floor((item.time||0)/60), s = (item.time||0)%60;
            const dateStr = item.posted_at || item.created_at || '';
            
            div.innerHTML = `
                <div class="waterfall-thumb-container">
                    <img class="waterfall-thumb-img" src="${item.thumbnail}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x533?text=No+Image'">
                    <div class="waterfall-duration-badge">${m}:${s.toString().padStart(2,'0')}</div>
                    <div class="waterfall-play-overlay"><div class="play-icon">▶</div></div>
                </div>
                <div class="waterfall-info">
                    <div class="waterfall-date">📅 ${dateStr ? dateStr.substring(0, 10) : ''}</div>
                </div>
            `;
            div.onclick = () => { 
                if(item.url) window.open(item.url, '_blank'); 
            };
            listEl.appendChild(div);
        });
        
        this.updateButtons();
        document.getElementById('account-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    close() {
        document.getElementById('account-modal').classList.remove('active');
        document.body.style.overflow = '';
        this.currentAccount = null;
    },
    
    isOpen() {
        return document.getElementById('account-modal').classList.contains('active');
    },
    
    updateButtons() {
        if (!this.currentAccount) return;
        
        const isFav = StorageManager.includes(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
        const isBin = StorageManager.includes(CONFIG.STORAGE_KEYS.RECYCLE_BIN, this.currentAccount);
        
        const btnFav = document.getElementById('btn-toggle-fav');
        const btnBin = document.getElementById('btn-toggle-bin');
        
        btnFav.className = `action-icon-btn ${isFav ? 'active-fav' : ''}`;
        btnFav.title = isFav ? "取消收藏" : "加入收藏";
        
        btnBin.className = `action-icon-btn ${isBin ? 'active-bin' : ''}`;
        btnBin.title = isBin ? "从回收站还原" : "加入回收站";
        
        if (isBin && isFav) {
            StorageManager.remove(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
            this.updateButtons();
        }
    },
    
    toggleFav() {
        if (!this.currentAccount) return;
        
        const isFav = StorageManager.includes(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
        if (isFav) {
            StorageManager.remove(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
        } else {
            StorageManager.remove(CONFIG.STORAGE_KEYS.RECYCLE_BIN, this.currentAccount);
            StorageManager.add(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
        }
        this.updateButtons();
    },
    
    toggleBin() {
        if (!this.currentAccount) return;
        
        const isBin = StorageManager.includes(CONFIG.STORAGE_KEYS.RECYCLE_BIN, this.currentAccount);
        if (isBin) {
            StorageManager.remove(CONFIG.STORAGE_KEYS.RECYCLE_BIN, this.currentAccount);
            alert(`已还原账号: ${this.currentAccount}`);
        } else {
            StorageManager.remove(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
            StorageManager.add(CONFIG.STORAGE_KEYS.RECYCLE_BIN, this.currentAccount);
            Renderer.renderPage(Renderer.currentDateKey); 
        }
        this.updateButtons();
    },
    
    initEvents() {
        document.getElementById('modal-close-btn').onclick = () => this.close();
        document.getElementById('btn-toggle-fav').onclick = () => this.toggleFav();
        document.getElementById('btn-toggle-bin').onclick = () => this.toggleBin();
        document.getElementById('account-modal').onclick = (e) => { 
            if(e.target.id === 'account-modal') this.close(); 
        };
    }
};

window.AccountModal = AccountModal;