// ================= 数据加载与分片处理模块 (loader.js) =================
const DataLoader = {
    allData: [],
    groupedData: {},
    sortedDates: [],
    
    async load(onProgress) {
        // 安全检查：确保 CONFIG 已定义
        if (!window.CONFIG) {
            throw new Error("配置未加载，请确保 core.js 在 loader.js 之前引入");
        }

        const urls = Array.from({ length: CONFIG.DATA_PARTS_COUNT }, (_, i) => 
            `${CONFIG.BASE_URL}data-part-${i}.json`
        );
        
        const loadPromises = urls.map((url, index) => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'json';

                xhr.addEventListener('progress', (event) => {
                    if (event.lengthComputable && onProgress) {
                        const chunkProgress = event.loaded / event.total;
                        const totalProgress = ((index + chunkProgress) / CONFIG.DATA_PARTS_COUNT) * 90;
                        const percent = Math.round(totalProgress);
                        
                        const fileName = url.split('/').pop();
                        const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
                        const totalMB = (event.total / (1024 * 1024)).toFixed(1);
                        
                        onProgress(percent, `下载 ${fileName}: ${loadedMB}/${totalMB} MB`);
                    } else if (onProgress) {
                        const estimated = Math.round(((index + 0.5) / CONFIG.DATA_PARTS_COUNT) * 90);
                        onProgress(estimated, `加载分片 ${index + 1}/${CONFIG.DATA_PARTS_COUNT}...`);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.response);
                    } else {
                        reject(new Error(`分片 ${index + 1} HTTP 错误: ${xhr.status}`));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error(`分片 ${index + 1} 网络请求失败`)));
                xhr.addEventListener('timeout', () => reject(new Error(`分片 ${index + 1} 请求超时`)));

                xhr.timeout = 30000;
                xhr.send();
            });
        });

        try {
            if(onProgress) onProgress(5, '开始连接服务器...');
            
            const chunks = await Promise.all(loadPromises);
            
            if(onProgress) onProgress(90, '数据聚合与排序中...');
            
            let merged = [].concat(...chunks);
            
            merged.sort((a, b) => {
                const dateA = new Date(a.created_at || a.posted_at || 0);
                const dateB = new Date(b.created_at || b.posted_at || 0);
                return dateB - dateA;
            });
            this.allData = merged;
            
            if(onProgress) onProgress(95, '正在建立日期索引...');
            
            const recycleBin = StorageManager.get(CONFIG.STORAGE_KEYS.RECYCLE_BIN) || [];
            this.groupedData = {};
            
            this.allData.forEach(item => {
                const accountId = getAccountId(item);
                if (recycleBin.includes(accountId)) return; 
                
                const k = formatDateKey(item.created_at);
                if(!this.groupedData[k]) this.groupedData[k] = [];
                this.groupedData[k].push(item);
            });
            
            this.sortedDates = Object.keys(this.groupedData).sort((a,b) => b.localeCompare(a));
            
            if(onProgress) onProgress(100, '加载完成');
            return true;
        } catch(e) {
            console.error("Load error:", e);
            throw e;
        }
    }
};
window.DataLoader = DataLoader;