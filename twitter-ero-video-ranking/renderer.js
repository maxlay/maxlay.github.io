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
        
        // 收藏夹置顶
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
                const card = document.createElement('div');
                card.className = 'card';
                
                const accountId = getAccountId(item);
                const m = Math.floor((item.time || 0) / 60);
                const s = (item.time || 0) % 60;
                const durationStr = `${m}:${s.toString().padStart(2, '0')}`;
                const favCount = item.favorite || 0;
                const formattedFav = formatNum(favCount);
                
                // 【修复】标题为空时不显示文字
                const titleText = item.title ? item.title : ''; 

                const authorHtml = `
                    <span class="meta-author" title="作者：${accountId}" onclick="event.preventDefault(); event.stopPropagation(); AccountModal.open('${accountId}')">
                        👤 ${accountId}
                    </span>
                `;

                card.innerHTML = `
                    <div class="thumb-container">
                        <img class="thumb-img" src="${item.thumbnail}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x533?text=No+Image'">
                        <div class="duration-badge">${durationStr}</div>
                        <div class="play-overlay"><div class="play-icon">▶</div></div>
                    </div>
                    <div class="info">
                        <div class="title">${titleText}</div>
                        <div class="meta">
                            ${authorHtml}
                            <span class="meta-fav-count" title="收藏人数">★ ${formattedFav}</span>
                            <button class="cast-btn" onclick="event.stopPropagation(); handleCast('${item.url}')">
                                投送
                            </button>
                        </div>
                    </div>
                `;

                card.onclick = (e) => {
                    if (e.target.closest('.cast-btn') || e.target.closest('.meta-author')) return;
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
            if(el) el.innerText = this.currentDateKey;
        });
        ['page-count', 'top-page-count'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerText = `${count} 部`;
        });

        const hasNew = idx > 0;
        const hasOld = idx < DataLoader.sortedDates.length - 1;

        [this.newerBtn, this.topNewerBtn].forEach(b => { if(b) b.disabled = !hasNew; });
        [this.olderBtn, this.topOlderBtn].forEach(b => { if(b) b.disabled = !hasOld; });

        const txtNew = hasNew ? `⬅ ${DataLoader.sortedDates[idx-1]} (${(DataLoader.groupedData[DataLoader.sortedDates[idx-1]]||[]).length})` : "已是最新";
        const txtOld = hasOld ? `${DataLoader.sortedDates[idx+1]} (${(DataLoader.groupedData[DataLoader.sortedDates[idx+1]]||[]).length}) ➡` : "已是最旧";
        
        [this.newerBtn, this.topNewerBtn].forEach(b => { if(b) b.innerText = txtNew; });
        [this.olderBtn, this.topOlderBtn].forEach(b => { if(b) b.innerText = txtOld; });
    },

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

        const commonConfig = {
            locale: "zh", dateFormat: "Y-m-d", defaultDate: this.currentDateKey, theme: "dark",
            disable: [date => {
                const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0');
                return !DataLoader.sortedDates.includes(`${y}-${m}-${d}`);
            }],
            onChange: (selectedDates, dateStr) => {
                if(dateStr && DataLoader.sortedDates.includes(dateStr)) { 
                    this.renderPage(dateStr); 
                    if(this.fpInstance) this.fpInstance.close(); 
                }
            },
            position: "auto", static: true, appendTo: document.body
        };

        if(this.fpInstance) this.fpInstance.destroy();
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
                if(typeof ManagerModal !== 'undefined' && ManagerModal.isOpen()) ManagerModal.close();
                else if(typeof AccountModal !== 'undefined' && AccountModal.isOpen()) AccountModal.close();
            }
        });
    }
};

window.Renderer = Renderer;

/**
 * 【增强版】投送处理函数
 * 地址：http://192.168.1.100:9978/action
 * 方法：POST
 * 类型：application/x-www-form-urlencoded
 */
async function handleCast(videoUrl) {
    // 默认 IP，可根据需要修改
    const DEFAULT_TV_IP = '192.168.1.100';
    let tvIp = localStorage.getItem('user_tv_ip');
    
    if (!tvIp) {
        tvIp = prompt("请输入电视盒子 IP:", DEFAULT_TV_IP);
        if (!tvIp) return;
        localStorage.setItem('user_tv_ip', tvIp);
    }

    const btn = event.target.closest('.cast-btn');
    if(!btn) return;
    
    const originalText = btn.innerHTML;
    const targetUrl = `http://${tvIp}:9978/action`;
    
    console.log(`[Cast Debug] 目标地址: ${targetUrl}`);
    console.log(`[Cast Debug] 视频链接: ${videoUrl}`);

    // UI 状态：发送中
    btn.innerHTML = '📡';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    const payload = { url: videoUrl, do: "push" };
    const jsonStr = JSON.stringify(payload);
    
    // 方案 A: 标准 form-urlencoded (data={json})
    const formData = `data=${encodeURIComponent(jsonStr)}`;

    try {
        console.log(`[Cast Debug] 尝试方案 A (form-data)...`);
        
        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        // 成功
        console.log(`[Cast Debug] 投送成功!`);
        btn.innerHTML = '✅';
        btn.style.color = '#4cd964';
        btn.style.borderColor = '#4cd964';
        setTimeout(() => resetBtn(btn, originalText), 2000);

    } catch (err) {
        console.error(`[Cast Debug] 方案 A 失败:`, err);
        
        // 智能诊断
        if (err.message.includes('Failed to fetch')) {
            alert(`❌ 连接失败 (Failed to fetch)\n\n可能原因：\n1. 电视 IP 错误 或 电视未开机。\n2. 电脑与电视不在同一 WiFi。\n3. 【重要】如果是 HTTPS 网页，请在浏览器地址栏允许“不安全内容 (Insecure Content)”。\n\n当前目标：${targetUrl}`);
            
            // 尝试打开新标签页测试连通性
            if(confirm("是否在新标签页打开该地址以测试连通性？")) {
                window.open(targetUrl, '_blank');
            }
        } else {
            // 尝试方案 B: 直接发送 JSON 字符串 (某些设备解析器比较特殊)
            console.log(`[Cast Debug] 尝试方案 B (raw-json)...`);
            try {
                const res2 = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, // 保持 Header 不变
                    body: jsonStr // 直接发送 JSON 字符串
                });
                if (res2.ok) {
                    console.log(`[Cast Debug] 方案 B 成功!`);
                    btn.innerHTML = '✅';
                    btn.style.color = '#4cd964';
                    setTimeout(() => resetBtn(btn, originalText), 2000);
                    return;
                }
            } catch (e2) {
                console.error(`[Cast Debug] 方案 B 也失败:`, e2);
            }
            alert(`❌ 投送失败: ${err.message}\n请检查电视端服务是否正常启动。`);
        }
        
        resetBtn(btn, originalText);
    }
}

function resetBtn(btn, text) {
    btn.innerHTML = text;
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.color = '';
    btn.style.borderColor = '';
}