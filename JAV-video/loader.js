// ================= 配置区域 =================
const BASE_FILENAME = 'data-part-';      // 文件名前缀
const FILE_EXTENSION = '.json';          // 文件扩展名
const TOTAL_PARTS = 10;                  // 文件总数 (0-9)
// ===========================================

async function loadVideoData() {
    const loadingMsg = document.getElementById('loading-msg');
    if (loadingMsg) loadingMsg.innerText = `正在加载数据 (0/${TOTAL_PARTS})...`;
    const allData = [];
    const promises = [];
    
    // 1. 创建所有加载任务
    for (let i = 0; i < TOTAL_PARTS; i++) {
        // 拼接完整的远程 URL
        const url = `https://cdn.jsdelivr.net/gh/maxlay/maxlay.github.io@main/JAV-video/${BASE_FILENAME}${i}${FILE_EXTENSION}`;
        
        console.log(`🔄 [Loader] Fetching: ${url}`); // 增加调试日志
        
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
                    <p style="font-size:12px; color:#666;">按 F12 查看控制台详细报错</p>
                </div>
            `;
        }
    }
}

// 自动启动加载
console.log('⚙️ [Loader] Module initialized, waiting for DOM...');
// 确保在登录后或页面加载完成后调用，具体取决于您的架构
// 如果是在 index.html 中直接调用，请保留下面的监听器，否则由 init.js 控制
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
         // 如果由 init.js 控制登录流程，这里可能不需要立即执行
         // 此处暂不自动执行，避免与 login 逻辑冲突，建议在 init.js 登录成功后调用
    });
}