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

    // 初始化 DOM 元素引用
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

    /**
     * 渲染指定日期的视频页面
     * @param {string} dateKey - 日期字符串 (YYYY-MM-DD)
     */
    renderPage(dateKey) {
        this.currentDateKey = dateKey;
        localStorage.setItem('lastDate', dateKey);
        
        if (!this.gridEl) return;
        this.gridEl.innerHTML = '';
        
        let items = DataLoader.groupedData[dateKey] || [];
        
        // 收藏夹置顶逻辑 (保持原有逻辑)
        const favorites = StorageManager.get(CONFIG.STORAGE_KEYS.FAVORITES);
        if (favorites && favorites.length > 0) {
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

        if (items.length === 0) {
            this.gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#666;">该日期暂无视频数据</div>';
        } else {
            const fragment = document.createDocumentFragment();
            
            items.forEach(item => {
                const card = document.createElement('div'); // 改为 div，通过 JS 控制跳转，避免新标签页打开
                card.className = 'card';
                
                const accountId = getAccountId(item);
                const m = Math.floor((item.time || 0) / 60);
                const s = (item.time || 0) % 60;
                const durationStr = `${m}:${s.toString().padStart(2, '0')}`;
                
                // 格式化收藏数
                const favCount = item.favorite || 0;
                const formattedFav = formatNum(favCount);

                // 构建作者链接 HTML (保持原有 onclick 逻辑)
                const authorHtml = `
                    <span class="meta-author" title="作者：${accountId}" onclick="event.preventDefault(); event.stopPropagation(); AccountModal.open('${accountId}')">
                        👤 ${accountId}
                    </span>
                `;

                // 构建卡片内部 HTML
                // 布局：[作者] [收藏数] [投送按钮]
                card.innerHTML = `
                    <div class="thumb-container">
                        <img class="thumb-img" src="${item.thumbnail}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x533?text=No+Image'">
                        <div class="duration-badge">${durationStr}</div>
                        <div class="play-overlay"><div class="play-icon">▶</div></div>
                    </div>
                    <div class="info">
                        <div class="title">${item.title || '无标题'}</div>
                        <div class="meta">
                            ${authorHtml}
                            <span class="meta-fav-count" title="收藏人数">★ ${formattedFav}</span>
                            <button class="cast-btn" onclick="event.stopPropagation(); handleCast('${item.url}')">
                                投送 📺
                            </button>
                        </div>
                    </div>
                `;

                // 绑定卡片点击事件 (播放视频)
                card.onclick = (e) => {
                    // 如果点击的是投送按钮或作者链接，不触发播放
                    if (e.target.closest('.cast-btn') || e.target.closest('.meta-author')) return;
                    
                    // 调用全局播放函数 (假设在 init.js 中定义)
                    if (typeof openVideoPlayer === 'function') {
                        openVideoPlayer(item);
                    } else {
                        // 降级处理：如果没定义播放器，则直接打开链接
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

    /**
     * 更新分页按钮状态和统计信息
     */
    updateUI() {
        const idx = DataLoader.sortedDates.indexOf(this.currentDateKey);
        if (idx === -1) return;
        
        const count = (DataLoader.groupedData[this.currentDateKey] || []).length;
        
        // 更新日期和数量显示
        ['page-date', 'top-page-date'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerText = this.currentDateKey;
        });
        ['page-count', 'top-page-count'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerText = `${count} 部`;
        });

        const hasNew = idx > 0;
        const hasOld = idx < DataLoader.sortedDates.length - 1;

        // 更新按钮禁用状态
        [this.newerBtn, this.topNewerBtn].forEach(b => { if(b) b.disabled = !hasNew; });
        [this.olderBtn, this.topOlderBtn].forEach(b => { if(b) b.disabled = !hasOld; });

        // 更新按钮文本
        const txtNew = hasNew ? `⬅ ${DataLoader.sortedDates[idx-1]} (${(DataLoader.groupedData[DataLoader.sortedDates[idx-1]]||[]).length})` : "已是最新";
        const txtOld = hasOld ? `${DataLoader.sortedDates[idx+1]} (${(DataLoader.groupedData[DataLoader.sortedDates[idx+1]]||[]).length}) ➡` : "已是最旧";
        
        [this.newerBtn, this.topNewerBtn].forEach(b => { if(b) b.innerText = txtNew; });
        [this.olderBtn, this.topOlderBtn].forEach(b => { if(b) b.innerText = txtOld; });
    },

    /**
     * 设置分页控件事件
     */
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

        // Flatpickr 初始化配置
        const commonConfig = {
            locale: "zh", 
            dateFormat: "Y-m-d", 
            defaultDate: this.currentDateKey, 
            theme: "dark",
            disable: [date => {
                const y = date.getFullYear(), 
                      m = String(date.getMonth()+1).padStart(2,'0'), 
                      d = String(date.getDate()).padStart(2,'0');
                return !DataLoader.sortedDates.includes(`${y}-${m}-${d}`);
            }],
            onChange: (selectedDates, dateStr) => {
                if(dateStr && DataLoader.sortedDates.includes(dateStr)) { 
                    this.renderPage(dateStr); 
                    if(this.fpInstance) this.fpInstance.close(); 
                }
            },
            position: "auto", 
            static: true, 
            appendTo: document.body
        };

        if(this.fpInstance) this.fpInstance.destroy();
        
        // 创建隐藏输入框供 flatpickr 使用
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
    
    /**
     * 设置键盘快捷键
     */
    setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 忽略输入框内的按键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            // 忽略弹窗打开时的按键
            if (typeof AccountModal !== 'undefined' && AccountModal.isOpen()) return;
            if (typeof ManagerModal !== 'undefined' && ManagerModal.isOpen()) return;
            if (this.fpInstance && this.fpInstance.isOpen) return;
            
            const idx = DataLoader.sortedDates.indexOf(this.currentDateKey);
            if (idx === -1) return;
            
            if (e.key === 'ArrowLeft' && idx > 0) {
                this.renderPage(DataLoader.sortedDates[idx - 1]);
            } else if (e.key === 'ArrowRight' && idx < DataLoader.sortedDates.length - 1) {
                this.renderPage(DataLoader.sortedDates[idx + 1]);
            } else if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
                if(typeof ManagerModal !== 'undefined' && ManagerModal.isOpen()) ManagerModal.close();
                else if(typeof AccountModal !== 'undefined' && AccountModal.isOpen()) AccountModal.close();
            }
        });
    }
};

// 挂载到全局
window.Renderer = Renderer;

/**
 * 全局投送处理函数 (供 HTML onclick 调用)
 * 逻辑与之前提供的一致，但适配当前上下文
 */
async function handleCast(videoUrl) {
    const DEFAULT_TV_IP = '192.168.1.100';
    let tvIp = localStorage.getItem('user_tv_ip');
    
    if (!tvIp) {
        tvIp = prompt("首次使用，请输入电视盒子的 IP 地址:\n(例如: 192.168.1.100)", DEFAULT_TV_IP);
        if (!tvIp) return;
        
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(tvIp)) {
            alert("IP 地址格式不正确，请重试。");
            return;
        }
        localStorage.setItem('user_tv_ip', tvIp);
    }

    const btn = event.target.closest('.cast-btn');
    if(!btn) return;
    
    const originalContent = btn.innerHTML;
    
    // 状态：发送中
    btn.innerHTML = '⏳';
    btn.disabled = true;
    btn.style.opacity = '0.6';

    const actionUrl = `http://${tvIp}:9978/action`;
    const postData = `<quark-table><table><tbody><tr><td>1234</td><td>{"url": "${videoUrl}", "do": "push"}</td></tr></tbody></table></quark-table>`;

    try {
        const response = await fetch(actionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: postData
        });

        if (response.ok) {
            btn.innerHTML = '✅';
            btn.style.color = '#4cd964';
            btn.style.borderColor = '#4cd964';
            setTimeout(() => resetCastButton(btn, originalContent), 2000);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('投送失败:', error);
        btn.innerHTML = '❌';
        btn.style.color = '#ff4444';
        btn.style.borderColor = '#ff4444';
        
        setTimeout(() => {
            resetCastButton(btn, originalContent);
            if(confirm(`投送失败：无法连接到 ${tvIp}\n是否重新设置 IP？`)) {
                localStorage.removeItem('user_tv_ip');
            }
        }, 2000);
    }
}

function resetCastButton(btn, originalContent) {
    btn.innerHTML = originalContent;
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.color = '';
    btn.style.borderColor = '';
}