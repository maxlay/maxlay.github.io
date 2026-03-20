// ================= 收藏与回收站管理模块 =================

const ManagerModal = {
    currentMode: 'favorites', // 'favorites' or 'recycle'
    
    open(mode) {
        this.currentMode = mode;
        const modal = document.getElementById('manager-modal');
        const titleEl = document.getElementById('manager-modal-title');
        const listEl = document.getElementById('manager-list-content');
        
        if (!modal || !titleEl || !listEl) {
            console.error('❌ ManagerModal: 缺少必要的 DOM 元素 (manager-modal, manager-modal-title, manager-list-content)');
            alert('系统错误：管理弹窗组件缺失，请检查 index.html');
            return;
        }

        titleEl.innerText = mode === 'favorites' ? '⭐ 我的收藏' : '🗑️ 回收站';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        this.renderList();
    },

    close() {
        const modal = document.getElementById('manager-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        this.currentMode = null;
    },

    renderList() {
        const listEl = document.getElementById('manager-list-content');
        if (!listEl) return;

        const key = this.currentMode === 'favorites' ? CONFIG.STORAGE_KEYS.FAVORITES : CONFIG.STORAGE_KEYS.RECYCLE_BIN;
        const accounts = StorageManager.get(key);
        
        if (accounts.length === 0) {
            listEl.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">暂无数据</div>';
            return;
        }

        listEl.innerHTML = '';
        accounts.forEach(acc => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:10px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;';
            div.innerHTML = `
                <span>${acc}</span>
                <button class="btn-sm" style="background:#d9534f; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px;">移除</button>
            `;
            div.querySelector('button').onclick = () => {
                StorageManager.remove(key, acc);
                this.renderList();
                // 如果当前在账号详情页，刷新按钮状态
                if (window.AccountModal && window.AccountModal.currentAccount === acc) {
                    window.AccountModal.updateButtons();
                }
            };
            listEl.appendChild(div);
        });
    },

    initEvents() {
        const closeBtn = document.getElementById('manager-modal-close');
        if (closeBtn) closeBtn.onclick = () => this.close();
        
        const modal = document.getElementById('manager-modal');
        if (modal) modal.onclick = (e) => { if(e.target.id === 'manager-modal') this.close(); };

        // 绑定全局触发按钮 (如果 HTML 中有)
        const btnFav = document.getElementById('btn-open-favorites');
        if (btnFav) btnFav.onclick = () => this.open('favorites');
        
        const btnRec = document.getElementById('btn-open-recycle');
        if (btnRec) btnRec.onclick = () => this.open('recycle');
    }
};

window.ManagerModal = ManagerModal;