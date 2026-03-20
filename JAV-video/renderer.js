// ================= renderer.js (修复版) =================
const Renderer = {
    allData: [],
    filteredData: [],
    currentPage: 1,
    // 【修复1】使用 window.CONFIG 或默认值，避免 CONFIG 未定义错误
    pageSize: (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.PAGE_SIZE) ? window.CONFIG.PAGE_SIZE : 20,
    totalPages: 1,
    elements: {},
    currentQuery: '',

    initElements() {
        this.elements = {
            grid: document.getElementById('video-grid'),
            prevBtn: document.getElementById('prev-page-btn'),
            nextBtn: document.getElementById('next-page-btn'),
            pageNumsContainer: document.getElementById('pagination-numbers'),
            // 【修复2】使用 querySelector 匹配 class，因为 HTML 中是 class="stats-main"
            stats: document.querySelector('.stats-main') || document.getElementById('stats-total')
        
        
        };
        
        console.log('✅ [Renderer] Elements initialized:', {
            grid: !!this.elements.grid,
            prevBtn: !!this.elements.prevBtn,
            nextBtn: !!this.elements.nextBtn,
            stats: !!this.elements.stats
        });
    },

    renderAll(data) {
        console.log('🎨 [Renderer] renderAll called with', data.length, 'items');
        
        if (!data || data.length === 0) {
            console.error('❌ [Renderer] No data provided');
            return;
        }
        
        this.allData = data;
        this.filteredData = data;
        this.initElements();
        
        // 检查必要元素是否存在
        if (!this.elements.grid) {
            console.error('❌ [Renderer] Critical: video-grid element not found!');
            alert('系统错误：找不到视频网格容器 (#video-grid)');
            return;
        }

        // 恢复状态
        const savedState = this.loadState();
        if (savedState) {
            this.currentQuery = savedState.query || '';
            this.currentPage = savedState.page || 1;
            const input = document.getElementById('feature-search-input') || document.getElementById('search-input');
            if (input) input.value = this.currentQuery;
            
            if (this.currentQuery) {
                // 如果有搜索词，先过滤
                this.filteredData = this.allData.filter(item => {
                    const q = this.currentQuery.toLowerCase();
                    const fId = (item.feature_id || '').toLowerCase();
                    const title = (item.vod_name || item.title || '').toLowerCase();
                    const vId = (item.vod_id || '').toLowerCase();
                    return fId.includes(q) || title.includes(q) || vId.includes(q);
                });
            }
            // 修正页码越界
            const maxP = Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
            if (this.currentPage > maxP) this.currentPage = maxP;
        }

        this.totalPages = Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
        
        if (this.elements.stats) {
            this.elements.stats.innerText = `共 ${data.length.toLocaleString()} 部视频`;
        }
        
        this.renderPage();
        this.renderPaginationControls();
        this.setupEvents();
        
        console.log('✅ [Renderer] Initialization complete. Pages:', this.totalPages);
    },

    loadState() {
        try {
            const d = localStorage.getItem('video_app_state');
            return d ? JSON.parse(d) : null;
        } catch (e) { return null; }
    },

    saveState() {
        const state = { page: this.currentPage, query: this.currentQuery, timestamp: Date.now() };
        localStorage.setItem('video_app_state', JSON.stringify(state));
    },

    renderPage() {
        if (!this.elements.grid) return;
        
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this.filteredData.slice(start, end);
        
        console.log(`🎨 [Renderer] Rendering page ${this.currentPage}, items ${start}-${end}`);
        
        this.elements.grid.innerHTML = '';

        if (pageData.length === 0) {
            this.elements.grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">未找到相关视频</div>';
            return;
        }

        const frag = document.createDocumentFragment();
        pageData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'video-card';
            const id = item.feature_id || item.vod_id || item.id || '';
            
            // 检查已看（使用全局函数）
            if (typeof isWatched === 'function' && isWatched(id)) {
                card.classList.add('watched');
            }

            const poster = item.vod_pic || item.thumbnail || '';
            const title = item.vod_name || item.title || '未知标题';
            const url = item.vod_play_url || item.url || '#';
            const fId = item.feature_id || item.vod_id || '';

            card.innerHTML = `
                <div class="watched-badge">✅ 已看</div>
                <div class="card-poster">
                    <img src="${poster}" loading="lazy" onerror="this.src='https://via.placeholder.com/320x180?text=No+Image'">
                    <div class="play-overlay">▶</div>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${title}</h3>
                    ${fId ? `<span class="card-feature-id">${fId}</span>` : ''}
                </div>
            `;
            
            card.onclick = () => {
                if (url && url !== '#') {
                    // 调用 index.html 中定义的全局函数
                    if (typeof openPlayer === 'function') {
                        openPlayer(url, title, id, poster);
                    } else {
                        window.open(url, '_blank');
                    }
                }
            };
            frag.appendChild(card);
        });
        this.elements.grid.appendChild(frag);
    },

    renderPaginationControls() {
        const container = this.elements.pageNumsContainer;
        if (!container) return;
        container.innerHTML = '';
        const total = this.totalPages;
        const current = this.currentPage;
        const isMobile = window.innerWidth <= 768;
        const range = isMobile ? 1 : 5;

        const createBtn = (page, active, disabled, text) => {
            const btn = document.createElement('button');
            btn.className = `page-num-btn ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`;
            btn.innerText = text !== null ? text : page;
            if (!disabled && !active) {
                btn.onclick = () => {
                    this.currentPage = page;
                    this.renderPage();
                    this.renderPaginationControls();
                    this.updateNavButtons();
                    this.saveState();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
            } else if (active) {
                setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 0);
            }
            return btn;
        };

        if (total <= (range * 2 + 3)) {
            for (let i = 1; i <= total; i++) container.appendChild(createBtn(i, i === current, false, null));
        } else {
            container.appendChild(createBtn(1, current === 1, false, null));
            let start = Math.max(2, current - range);
            let end = Math.min(total - 1, current + range);
            if (current <= range + 2) { start = 2; end = Math.min(total - 1, range * 2 + 1); }
            if (current >= total - range - 1) { start = Math.max(2, total - range * 2 - 1); end = total - 1; }

            if (start > 2) {
                const s = document.createElement('span'); s.innerText = '...'; s.style.color='#888'; s.style.display='flex'; s.style.alignItems='center'; container.appendChild(s);
            }
            for (let i = start; i <= end; i++) container.appendChild(createBtn(i, i === current, false, null));
            if (end < total - 1) {
                const s = document.createElement('span'); s.innerText = '...'; s.style.color='#888'; s.style.display='flex'; s.style.alignItems='center'; container.appendChild(s);
            }
            container.appendChild(createBtn(total, current === total, false, null));
        }
        this.updateNavButtons();
    },

    updateNavButtons() {
        if (this.elements.prevBtn) this.elements.prevBtn.disabled = this.currentPage <= 1;
        if (this.elements.nextBtn) this.elements.nextBtn.disabled = this.currentPage >= this.totalPages;
    },

    setupEvents() {
        // 翻页按钮事件
        if (this.elements.prevBtn) {
            this.elements.prevBtn.onclick = () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderPage();
                    this.renderPaginationControls();
                    this.saveState();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            };
        }
        if (this.elements.nextBtn) {
            this.elements.nextBtn.onclick = () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.renderPage();
                    this.renderPaginationControls();
                    this.saveState();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            };
        }
    }
};

window.Renderer = Renderer;
console.log('✅ Renderer module loaded');