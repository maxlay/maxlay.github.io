// ================= 收藏与回收站管理模块 =================
const ManagerModal = {
    currentType: null,
    
    open(type) {
        this.currentType = type;
        const isFav = type === 'favorites';
        const key = isFav ? CONFIG.STORAGE_KEYS.FAVORITES : CONFIG.STORAGE_KEYS.RECYCLE_BIN;
        const title = isFav ? "⭐ 收藏夹管理" : "🗑️ 回收站管理";
        const emptyText = isFav ? "收藏夹为空" : "回收站为空";
        
        document.getElementById('manager-modal-title').innerText = title;
        document.getElementById('manager-search-input').value = '';
        document.getElementById('manager-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        this.renderList(key, emptyText);
    },
    
    close() {
        document.getElementById('manager-modal').classList.remove('active');
        document.body.style.overflow = '';
        this.currentType = null;
    },
    
    isOpen() {
        return document.getElementById('manager-modal').classList.contains('active');
    },
    
    renderList(key, emptyText) {
        const list = StorageManager.get(key);
        const term = document.getElementById('manager-search-input').value.toLowerCase();
        const container = document.getElementById('manager-list-content');
        container.innerHTML = '';
        
        const filtered = list.filter(name => name.toLowerCase().includes(term));
        
        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state">${list.length === 0 ? emptyText : '无匹配结果'}</div>`;
            return;
        }
        
        filtered.forEach(name => {
            const div = document.createElement('div');
            div.className = 'manager-item';
            
            const isRecycle = this.currentType === 'recycleBin';
            const actionBtn = isRecycle 
                ? `<button class="mgr-btn mgr-btn-edit" onclick="ManagerModal.restore('${name}')">还原</button>`
                : `<button class="mgr-btn mgr-btn-del" onclick="ManagerModal.remove('${name}', '${key}')">删除</button>`;
            
            div.innerHTML = `
                <div class="manager-item-info"><div class="manager-item-name">${name.startsWith('ID:') ? name : '@'+name}</div></div>
                <div class="manager-item-actions">${actionBtn}</div>
            `;
            container.appendChild(div);
        });
    },
    
    remove(name, key) {
        StorageManager.remove(key, name);
        this.renderList(key, key === CONFIG.STORAGE_KEYS.FAVORITES ? "收藏夹为空" : "回收站为空");
    },
    
    restore(name) {
        StorageManager.remove(CONFIG.STORAGE_KEYS.RECYCLE_BIN, name);
        alert(`已还原 ${name}`);
        this.renderList(CONFIG.STORAGE_KEYS.RECYCLE_BIN, "回收站为空");
    },
    
    initEvents() {
        document.getElementById('manager-modal-close').onclick = () => this.close();
        document.getElementById('manager-modal').onclick = (e) => { 
            if(e.target.id === 'manager-modal') this.close(); 
        };
        document.getElementById('manager-search-input').oninput = () => {
            if(this.currentType) {
                const key = this.currentType === 'favorites' ? CONFIG.STORAGE_KEYS.FAVORITES : CONFIG.STORAGE_KEYS.RECYCLE_BIN;
                this.renderList(key, this.currentType === 'favorites' ? "收藏夹为空" : "回收站为空");
            }
        };
        
        document.getElementById('btn-open-favorites').onclick = () => this.open('favorites');
        document.getElementById('btn-open-recycle').onclick = () => this.open('recycleBin');
    }
};

window.ManagerModal = ManagerModal;