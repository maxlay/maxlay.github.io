// ================= 账号详情弹窗模块 (已适配 vod_ 字段) =================

const AccountModal = {
    currentAccount: null,
    
    open(accountName) {
        if (!accountName) return;
        this.currentAccount = accountName;
        
        const allData = window.DataLoader ? window.DataLoader.allData : [];
        if (!allData.length) {
            alert("数据尚未加载完成");
            return;
        }

        // 筛选数据：匹配 feature_id 或 tweet_account 或 vod_name
        const filteredData = allData.filter(item => {
            const accountId = item.feature_id || item.tweet_account;
            return accountId === accountName;
        });

        if (filteredData.length === 0) { 
            alert("该账号下暂无视频数据。"); 
            return; 
        }

        // 排序
        filteredData.sort((a, b) => {
            const dateA = new Date(a.created_at || a.vod_time || 0);
            const dateB = new Date(b.created_at || b.vod_time || 0);
            return dateB - dateA;
        });

        // 更新标题
        const nameEl = document.getElementById('modal-account-name');
        if(nameEl) nameEl.innerHTML = `${accountName} <span class="modal-count">(${filteredData.length})</span>`;
        
        // 渲染列表到 waterfall-list
        const listEl = document.getElementById('waterfall-list');
        if (listEl) {
            listEl.innerHTML = '';
            filteredData.forEach(item => {
                const div = document.createElement('div');
                div.className = 'waterfall-item';
                // 适配字段
                const pic = item.vod_pic || item.thumbnail || '';
                const title = item.vod_name || '无标题';
                const playUrl = item.vod_play_url || item.url || '#';
                
                div.innerHTML = `
                    <div class="waterfall-thumb-container">
                        <img class="waterfall-thumb-img" src="${pic}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x533?text=No+Image'">
                        <div class="waterfall-play-overlay"><div class="play-icon">▶</div></div>
                    </div>
                    <div class="waterfall-info">
                        <div class="waterfall-date">${title}</div>
                    </div>
                `;
                div.onclick = () => { 
                    if (typeof openVideoPlayer === 'function' && playUrl !== '#') {
                        openVideoPlayer({ url: playUrl, title: title, poster: pic });
                    } else if (playUrl !== '#') {
                        window.open(playUrl, '_blank');
                    }
                };
                listEl.appendChild(div);
            });
        }

        this.updateButtons();
        
        const modal = document.getElementById('account-modal');
        if(modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    close() {
        const modal = document.getElementById('account-modal');
        if(modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        this.currentAccount = null;
    },

    updateButtons() {
        if (!this.currentAccount) return;
        const btnFav = document.getElementById('btn-toggle-fav');
        const btnBin = document.getElementById('btn-toggle-bin');
        
        if(!btnFav || !btnBin) return; 

        const isFav = StorageManager.includes(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
        const isBin = StorageManager.includes(CONFIG.STORAGE_KEYS.RECYCLE_BIN, this.currentAccount);
        
        btnFav.className = `action-icon-btn ${isFav ? 'active-fav' : ''}`;
        btnFav.title = isFav ? "取消收藏" : "加入收藏";
        btnFav.innerText = isFav ? '⭐' : '☆';
        
        btnBin.className = `action-icon-btn ${isBin ? 'active-bin' : ''}`;
        btnBin.title = isBin ? "从回收站还原" : "加入回收站";
        btnBin.innerText = isBin ? '🗑️' : '🚫';
        
        if (isBin && isFav) {
            StorageManager.remove(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
            this.updateButtons();
        }
    },

    toggleFav() {
        if (!this.currentAccount) return;
        const isFav = StorageManager.includes(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
        if (isFav) StorageManager.remove(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
        else {
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
            alert(`已还原账号：${this.currentAccount}`);
        } else {
            StorageManager.remove(CONFIG.STORAGE_KEYS.FAVORITES, this.currentAccount);
            StorageManager.add(CONFIG.STORAGE_KEYS.RECYCLE_BIN, this.currentAccount);
        }
        this.updateButtons();
    },

    initEvents() {
        const closeBtn = document.getElementById('modal-close-btn'); // 备用
        const closeBtnX = document.querySelector('#account-modal .modal-close');
        
        if(closeBtn) closeBtn.onclick = () => this.close();
        if(closeBtnX) closeBtnX.onclick = () => this.close();
        
        const btnFav = document.getElementById('btn-toggle-fav');
        if(btnFav) btnFav.onclick = (e) => { e.stopPropagation(); this.toggleFav(); };
        
        const btnBin = document.getElementById('btn-toggle-bin');
        if(btnBin) btnBin.onclick = (e) => { e.stopPropagation(); this.toggleBin(); };
        
        const modal = document.getElementById('account-modal');
        if(modal) modal.onclick = (e) => { if(e.target.id === 'account-modal') this.close(); };
    }
};

window.AccountModal = AccountModal;