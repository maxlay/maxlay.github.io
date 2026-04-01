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

    // --- 新增：已看记录辅助函数 ---
    getWatchedIds() {
        try {
            const data = localStorage.getItem('watched_videos_v1');
            return data ? new Set(JSON.parse(data)) : new Set();
        } catch (e) {
            return new Set();
        }
    },
    saveWatchedId(videoId) {
        const set = this.getWatchedIds();
        if (!set.has(videoId)) {
            set.add(videoId);
            try {
                localStorage.setItem('watched_videos_v1', JSON.stringify([...set]));
                return true;
            } catch (e) {
                console.error("存储已看记录失败:", e);
                return false;
            }
        }
        return false;
    },

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
// 在renderer.js的renderPage方法中找到作者HTML构建部分

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
            const timeA = a.time || 0;
            const timeB = b.time || 0;
            const dateA = new Date(a.created_at || a.posted_at || 0).getTime();
            const dateB = new Date(b.created_at || b.posted_at || 0).getTime();

            // 1. 第一优先级：收藏
            if (isFavA && !isFavB) return -1;
            if (!isFavA && isFavB) return 1;

            if (isFavA && isFavB) {
                return idA.localeCompare(idB);
            }

            // --- 非收藏组的细分逻辑 ---
            const isLongA = timeA >= 1800;
            const isLongB = timeB >= 1800;
            const isMidA = timeA >= 300 && timeA < 1800;
            const isMidB = timeB >= 300 && timeB < 1800;
            const isShortA = timeA < 300;
            const isShortB = timeB < 300;

            if (isLongA && !isLongB) return -1;
            if (!isLongA && isLongB) return 1;
            if (isMidA && !isMidB && !isLongA && !isLongB) return -1;
            if (!isMidA && isMidB && !isLongA && !isLongB) return 1;

            // 区间内排序
            if (isLongA && isLongB) {
                return timeB - timeA; // 长视频按时间长->短
            }
            if (isMidA && isMidB) {
                return idA.localeCompare(idB); // 中视频按作者
            }
            if (isShortA && isShortB) {
                return dateB - dateA; // 短视频按时间新->旧
            }
            return 0;
        });

        if (items.length === 0) {
            this.gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#666;">该日期暂无视频数据 (或所有视频作者均在回收站)</div>';
        } else {
            const fragment = document.createDocumentFragment();
            // --- 【核心修改】获取当前已看列表 ---
            const watchedSet = this.getWatchedIds();

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'card';

                // --- 1. 生成唯一 Video ID ---
                // 优先使用 item.id，如果没有则对 URL 做简单哈希或直接截取
                const videoId = item.id ? String(item.id) : 
                               (item.url ? btoa(item.url.substring(0, 50)) : 'unknown');

                // --- 2. 检查是否已看 ---
                const isWatched = watchedSet.has(videoId);

                // --- 3. 构建 HTML 结构 (增加了 overlay-container 和 watched-overlay) ---
                const m = Math.floor((item.time || 0) / 60);
                const s = (item.time || 0) % 60;
                const durationStr = `${m}:${s.toString().padStart(2, '0')}`;
                const favCount = item.favorite || 0;
                const formattedFav = formatNum(favCount);
                const titleText = item.title ? item.title : '';
                const accountId = getAccountId(item);
                const safeUrl = item.url.replace(/'/g, "\\'");

                const authorHtml = ` 
                    <span class="meta-author" title="作者：${accountId}" 
                          onclick="event.preventDefault(); event.stopPropagation(); AccountModal.open('${accountId}')"> 
                        👤 ${accountId} 
                    </span> 
                `;
                const favCountHtml = ` 
                    <span class="meta-fav-count" title="点击复制链接" style="cursor: pointer;" 
                          onclick="event.preventDefault(); event.stopPropagation(); navigator.clipboard.writeText('${safeUrl}').catch(err=>{});"> 
                        ★ ${formattedFav} 
                    </span> 
                `;

                card.innerHTML = `
                    <!-- 包裹层，用于定位遮罩 -->
                    <div class="overlay-container">
                        <div class="thumb-container">
                            <img class="thumb-img" src="${item.thumbnail}" loading="lazy" 
                                 onerror="this.src='https://via.placeholder.com/300x533?text=No+Image'">
                            <div class="duration-badge">${durationStr}</div>
                            <div class="play-overlay"><div class="play-icon">▶</div></div>
                        </div>
                        <!-- 已看遮罩 -->
                        <div class="watched-overlay ${isWatched ? 'active' : ''}">
                            <div class="watched-badge">✅ 已看</div>
                        </div>
                    </div>
                    <div class="info">
                        <div class="title">${titleText}</div>
                        <div class="meta"> 
                            ${authorHtml} 
                            ${favCountHtml} 
                        </div>
                    </div>
                `;

                // --- 4. 绑定点击事件 (点击时标记为已看) ---
                card.onclick = (e) => {
                    // 阻止代理事件（如作者名、收藏数点击）
                    if (e.target.closest('.meta-author') || e.target.closest('.meta-fav-count')) return;

                    // 【标记逻辑】如果尚未标记，则写入
                    if (!watchedSet.has(videoId)) {
                        this.saveWatchedId(videoId);
                        // 优化体验：立即修改当前 DOM 状态，无需刷新
                        const overlay = card.querySelector('.watched-overlay');
                        if (overlay) {
                            overlay.classList.add('active');
                        }
                    }

                    // 执行原有的播放逻辑
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
            if (el) el.innerText = this.currentDateKey;
        });

        const actualCount = this.gridEl.querySelectorAll('.card').length;
        ['page-count', 'top-page-count'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = `${actualCount} 部`;
        });

        const hasNew = idx > 0;
        const hasOld = idx < DataLoader.sortedDates.length - 1;
        [this.newerBtn, this.topNewerBtn].forEach(b => {
            if (b) b.disabled = !hasNew;
        });
        [this.olderBtn, this.topOlderBtn].forEach(b => {
            if (b) b.disabled = !hasOld;
        });

        const txtNew = hasNew ? `⬅ ${DataLoader.sortedDates[idx - 1]}` : "已是最新";
        const txtOld = hasOld ? `${DataLoader.sortedDates[idx + 1]} ➡` : "已是最旧";
        [this.newerBtn, this.topNewerBtn].forEach(b => {
            if (b) b.innerText = txtNew;
        });
        [this.olderBtn, this.topOlderBtn].forEach(b => {
            if (b) b.innerText = txtOld;
        });
    },

    setupPagination() {
        const goNew = () => {
            const i = DataLoader.sortedDates.indexOf(this.currentDateKey);
            if (i > 0) this.renderPage(DataLoader.sortedDates[i - 1]);
        };
        const goOld = () => {
            const i = DataLoader.sortedDates.indexOf(this.currentDateKey);
            if (i < DataLoader.sortedDates.length - 1) this.renderPage(DataLoader.sortedDates[i + 1]);
        };

        [this.newerBtn, this.topNewerBtn].forEach(b => {
            if (b) b.onclick = goNew;
        });
        [this.olderBtn, this.topOlderBtn].forEach(b => {
            if (b) b.onclick = goOld;
        });

        const commonConfig = {
            locale: "zh",
            dateFormat: "Y-m-d",
            defaultDate: this.currentDateKey,
            theme: "dark",
            disable: [date => {
                const y = date.getFullYear(),
                    m = String(date.getMonth() + 1).padStart(2, '0'),
                    d = String(date.getDate()).padStart(2, '0');
                return !DataLoader.sortedDates.includes(`${y}-${m}-${d}`);
            }],
            onChange: (selectedDates, dateStr) => {
                if (dateStr && DataLoader.sortedDates.includes(dateStr)) {
                    this.renderPage(dateStr);
                    if (this.fpInstance) this.fpInstance.close();
                }
            },
            position: "auto",
            static: true,
            appendTo: document.body
        };

        if (this.fpInstance) this.fpInstance.destroy();
        let hiddenInput = document.getElementById('fp-hidden-input');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.id = 'fp-hidden-input';
            hiddenInput.style.display = 'none';
            document.body.appendChild(hiddenInput);
        }
        this.fpInstance = flatpickr(hiddenInput, commonConfig);

        if (this.topDateTrigger) {
            this.topDateTrigger.onclick = (e) => {
                e.stopPropagation();
                if (this.fpInstance) {
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
                if (typeof ManagerModal !== 'undefined' && ManagerModal.isOpen()) ManagerModal.close();
                else if (typeof AccountModal !== 'undefined' && AccountModal.isOpen()) AccountModal.close();
            }
        });
    }
};

window.Renderer = Renderer;