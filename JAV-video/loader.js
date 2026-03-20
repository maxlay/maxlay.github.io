async function loadVideoData() {
    const loadingMsg = document.getElementById('loading-msg');
    if (loadingMsg) loadingMsg.innerText = `正在加载数据 (0/${TOTAL_PARTS})...`;
    const allData = [];
    const promises = [];
    
    // 1. 创建所有加载任务
    for (let i = 0; i < TOTAL_PARTS; i++) {
        // 【已修改】拼接完整的远程 URL
        const url = `https://wget.la/https://raw.githubusercontent.com/maxlay/maxlay.github.io/main/JAV-video/${BASE_FILENAME}${i}${FILE_EXTENSION}`;
        
        const promise = fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`文件 ${url} 加载失败: HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`✅ [Part ${i}] Loaded: ${Array.isArray(data) ? data.length : 'Unknown'} items`);
                return Array.isArray(data) ? data : [data];
            })
            .catch(err => {
                console.error(`❌ [Part ${i}] Error:`, err);
                throw err; 
            });
        
        promises.push(promise);
    }
    try {
        // 2. 等待所有文件加载完成
        const results = await Promise.all(promises);
        
        // 3. 合并所有数据
        results.forEach(partData => {
            allData.push(...partData);
        });
        console.log(`🎉 [Loader] All parts loaded! Total items: ${allData.length}`);
        
        if (!window.Renderer) {
            throw new Error('Renderer 模块未找到，请检查 index.html 中的脚本顺序');
        }
        
        // 4. 渲染数据
        if (loadingMsg) loadingMsg.style.display = 'none';
        
        setTimeout(() => {
            window.Renderer.renderAll(allData);
        }, 100);
    } catch (error) {
        console.error('❌ [Loader] Critical Failure:', error);
        if (loadingMsg) {
            loadingMsg.innerHTML = `
                <div style="color: #ff4444; max-width: 600px; margin: 0 auto;">
                    <h3>❌ 数据加载失败</h3>
                    <p><strong>错误信息:</strong> ${error.message}</p>
                    <p>请检查网络连接或 GitHub 链接是否有效。</p>
                </div>
            `;
        }
    }
}