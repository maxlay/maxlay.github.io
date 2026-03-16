// ================= 管理面板模块 (modal-manager.js) =================
const ManagerModal = {
    modalEl: null,
    closeBtn: null,
    listEl: null,
    
    initElements() {
        this.modalEl = document.getElementById('manager-modal');
        this.closeBtn = document.getElementById('manager-modal-close');
        this.listEl = document.getElementById('recycle-list');
    },

    initEvents() {
        if (!this.modalEl) return;
        
        this.closeBtn?.addEventListener('click', () => this.close());
        this.modalEl.addEventListener('click', (e) => {
            if (e.target === this.modalEl) this.close();
        });
        
        // 绑定全局按钮事件 (如果存在)
        const openBtn = document.getElementById('open-manager-btn');
        if(openBtn) openBtn.onclick = () => this.open();
    },

    open() {
        if (!this.modalEl) return;
        this.renderList();
        this.modalEl.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    close() {
        if (!this.modalEl) return;
        this.modalEl.style.display = 'none';
        document.body.style.overflow = '';
    },

    isOpen() {
        return this.modalEl && this.modalEl.style.display === 'flex';
    },

    addRecycle(accountId) {
        if(!confirm(`确定要将账号 ${accountId} 移入回收站吗？\n该账号下的所有视频将被隐藏。`)) return;
        
        const key = CONFIG.STORAGE_KEYS.RECYCLE_BIN;
        let list = StorageManager.get(key) || [];
        if (!list.includes(accountId)) {
            list.push(accountId);
            StorageManager.set(key, list);
            alert('已移入回收站。请刷新页面或重新加载数据以生效。');
            this.close();
            if(AccountModal.isOpen()) AccountModal.close();
        }
    },

    removeRecycle(accountId) {
        const key = CONFIG.STORAGE_KEYS.RECYCLE_BIN;
        let list = StorageManager.get(key) || [];
        list = list.filter(id => id !== accountId);
        StorageManager.set(key, list);
        this.renderList(); // 刷新列表
        // 提示用户需要重新加载数据
        alert(`已恢复账号 ${accountId}。请点击“重新加载数据”按钮生效。`);
    },

    clearRecycle() {
        if(!confirm("确定要清空回收站吗？所有被隐藏的账号将恢复显示。")) return;
        StorageManager.set(CONFIG.STORAGE_KEYS.RECYCLE_BIN, []);
        this.renderList();
        alert("回收站已清空。请重新加载数据。");
    },

    renderList() {
        if (!this.listEl) return;
        const list = StorageManager.get(CONFIG.STORAGE_KEYS.RECYCLE_BIN) || [];
        
        if (list.length === 0) {
            this.listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">回收站为空</div>';
            return;
        }

        let html = '<ul style="list-style:none;padding:0;margin:0;">';
        list.forEach(id => {
            html += `
                <li style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #333;">
                    <span>👤 ${id}</span>
                    <button class="btn-sm" onclick="ManagerModal.removeRecycle('${id}')">恢复</button>
                </li>
            `;
        });
        html += '</ul>';
        html += `<div style="margin-top:20px;text-align:right;"><button class="btn-danger" onclick="ManagerModal.clearRecycle()">清空回收站</button></div>`;
        
        this.listEl.innerHTML = html;
    }
};
window.ManagerModal = ManagerModal;