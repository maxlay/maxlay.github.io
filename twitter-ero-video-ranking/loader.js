// ================= 数据加载与分片处理模块 =================
const DataLoader = {
    allData: [],
    groupedData: {},
    sortedDates: [],

    async load(onProgress) {
        const urls = Array.from({ length: CONFIG.DATA_PARTS_COUNT }, (_, i) => 
            `${CONFIG.BASE_URL}data-part-${i}.json`
        );

        const fetchPromises = urls.map((url, index) => {
            return fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error(`分片 ${index + 1} 失败`);
                    const progress = Math.round(((index + 1) / CONFIG.DATA_PARTS_COUNT) * 90); // 留10%给排序
                    if(onProgress) onProgress(progress, `加载分片 ${index + 1}/${CONFIG.DATA_PARTS_COUNT}`);
                    return response.json();
                });
        });

        try {
            const chunks = await Promise.all(fetchPromises);
            if(onProgress) onProgress(90, '数据聚合中...');

            // 合并
            let merged = [].concat(...chunks);
            
            // 全局排序
            merged.sort((a, b) => {
                const dateA = new Date(a.created_at || a.posted_at || 0);
                const dateB = new Date(b.created_at || b.posted_at || 0);
                return dateB - dateA;
            });

            this.allData = merged;
            if(onProgress) onProgress(95, '正在索引日期...');

            // 过滤回收站并分组
            const recycleBin = StorageManager.get(CONFIG.STORAGE_KEYS.RECYCLE_BIN);
            this.groupedData = {};
            
            this.allData.forEach(item => {
                const accountId = getAccountId(item);
                if (recycleBin.includes(accountId)) return; 

                const k = formatDateKey(item.created_at);
                if(!this.groupedData[k]) this.groupedData[k] = [];
                this.groupedData[k].push(item);
            });

            this.sortedDates = Object.keys(this.groupedData).sort((a,b) => b.localeCompare(a));
            
            if(onProgress) onProgress(100, '完成');
            return true;

        } catch(e) {
            console.error("Load error:", e);
            throw e;
        }
    }
};

window.DataLoader = DataLoader;