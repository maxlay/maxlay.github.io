// ================= 账号详情弹窗模块 (modal-account.js) =================
const AccountModal = {
    modalEl: null,
    closeBtn: null,
    contentEl: null,
    videoGridEl: null,
    currentAccount: '',

    initElements() {
        this.modalEl = document.getElementById('account-modal');
        this.closeBtn = document.getElementById('account-modal-close');
        this.contentEl = document.getElementById('account-modal-content');
        this.videoGridEl = document.getElementById('account-modal-videos');
    },

    initEvents() {
        if (!this.modalEl) return;
        
        this.closeBtn?.addEventListener('click', () => this.close());
        
        // 点击背景关闭
        this.modalEl.addEventListener('click', (e) => {
            if (e.target === this.modalEl) this.close();
        });
    },

    open(accountId) {
        if (!this.modalEl) {
            alert("弹窗组件未初始化");
            return;
        }
        
        this.currentAccount = accountId;
        this.renderContent(accountId);
        
        this.modalEl.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    },

    close() {
        if (!this.modalEl) return;
        this.modalEl.style.display = 'none';
        document.body.style.overflow = ''; // 恢复滚动
        this.currentAccount = '';
    },

    isOpen() {
        return this.modalEl && this.modalEl.style.display === 'flex';
    },

    renderContent(accountId) {
        if (!this.contentEl) return;

        const videos = DataLoader.allData.filter(item => getAccountId(item) === accountId);
        const count = videos.length;
        
        // 简单的统计
        const totalFav = videos.reduce((sum, item) => sum + (item.favorite || 0), 0);
        const formattedFav = formatNum(totalFav);

        this.contentEl.innerHTML = `
            <div class="modal-header">
                <h2>👤 ${accountId}</h2>
                <button id="account-modal-close" class="close-btn">×</button>
            </div>
            <div class="modal-stats">
                <span>视频数: <strong>${count}</strong></span>
                <span>总收藏: <strong>${formattedFav}</strong></span>
                <button class="btn-sm" onclick="ManagerModal.addRecycle('${accountId}')">移入回收站</button>
            </div>
            <div id="account-modal-videos" class="modal-grid"></div>
        `;

        // 重新绑定关闭事件（因为innerHTML重写了header）
        document.getElementById('account-modal-close')?.addEventListener('click', () => this.close());

        // 渲染该账号的视频列表（简化版，复用卡片样式）
        const grid = document.getElementById('account-modal-videos');
        if (videos.length === 0) {
            grid.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">暂无视频</div>';
            return;
        }

        videos.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            const m = Math.floor((item.time || 0) / 60);
            const s = (item.time || 0) % 60;
            card.innerHTML = `
                <div class="thumb-container">
                    <img class="thumb-img" src="${item.thumbnail}" loading="lazy">
                    <div class="duration-badge">${m}:${s.toString().padStart(2, '0')}</div>
                </div>
                <div class="info">
                    <div class="title">${item.title || '无标题'}</div>
                    <div class="meta">
                        <span>★ ${formatNum(item.favorite || 0)}</span>
                    </div>
                </div>
            `;
            card.onclick = () => {
                if (typeof openVideoPlayer === 'function') openVideoPlayer(item);
                else window.open(item.url, '_blank');
            };
            grid.appendChild(card);
        });
    }
};
window.AccountModal = AccountModal;