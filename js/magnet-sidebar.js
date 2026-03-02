/**
 * Hexo NexT - 黑白灰随动流光 + 超宽屏
 * 特性：
 * 1. 按钮随页面滚动 (Absolute Position inside Container)
 * 2. 黑白灰单色流光
 * 3. 抖动蓄力 -> 慢速吸入
 */

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'hexo_mono_scroll_state';

  const container = document.querySelector('.container') || 
                    document.querySelector('.page-wrapper') || 
                    document.body;

  const btn = document.createElement('div');
  btn.className = 'magnet-sidebar-btn';
  btn.title = '收缩/展开侧边栏';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="11 17 6 12 11 7"></polyline>
      <polyline points="18 17 13 12 18 7"></polyline>
    </svg>
  `;
  
  // 添加到容器内部，这样它就是 absolute 相对于容器定位
  container.appendChild(btn);

  const getSidebar = () => document.querySelector('.sidebar');

  // 3. 注入样式
  const style = document.createElement('style');
  style.textContent = `
    /* 按钮基础样式 */
    .magnet-sidebar-btn {
      /* 【关键】使用 absolute 而非 fixed */
      position: absolute;
      top: 40px;
      left: 40px;
      width: 44px;
      height: 44px;
      background: #fff;
      border: 1px solid #e1e1e1;
      border-radius: 50%;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      cursor: pointer;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      transition: all 0.5s ease;
      overflow: hidden; 
    }
    
    /* 确保容器有 relative 定位，否则 absolute 会继续向上找 */
    .container, .page-wrapper {
      position: relative; 
    }

    .magnet-sidebar-btn:hover {
      transform: scale(1.05);
      border-color: #ccc;
    }
    
    /* 【核心】黑白灰流光背景层 */
    .magnet-sidebar-btn::before {
      content: '';
      position: absolute;
      top: -60%; left: -60%;
      width: 220%; height: 220%;
      /* 黑白灰渐变 */
      background: conic-gradient(
        from 0deg, 
        #ffffff, #cccccc, #666666, #000000, #333333, #ffffff
      );
      border-radius: 50%;
      opacity: 0;
      transition: opacity 0.5s ease;
      z-index: -1;
      filter: blur(10px); 
      animation: none;
    }

    /* 【核心】激活状态：纯黑 + 黑白流光 */
    .magnet-sidebar-btn.active {
      background: #000;
      border-color: #000;
      color: #fff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      transform: scale(1.1);
    }

    .magnet-sidebar-btn.active::before {
      opacity: 1;
      animation: mono-spin 4s linear infinite; 
    }

    @keyframes mono-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .magnet-sidebar-btn svg {
      transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
      z-index: 2;
    }
    .magnet-sidebar-btn.active svg {
      transform: rotate(180deg);
      transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
      transition-duration: 1.5s;
    }

    /* 抖动关键帧 */
    @keyframes shake-prepare {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-6px); }
      80% { transform: translateX(6px); }
    }
    .sidebar.shaking {
      animation: shake-prepare 0.6s ease-in-out;
    }

    @media (max-width: 991px) {
      .magnet-sidebar-btn { display: none !important; }
    }

    /* === 动画逻辑 (针对 NexT Gemini) === */
    @media (min-width: 992px) {
      
      .sidebar {
        transition: 
          transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275),
          opacity 0.6s ease,
          left 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275),
          top 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275),
          border-radius 0.3s ease;
      }
      
      .main-inner {
        transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), max-width 0.6s ease;
      }

      /* 吸入状态类 */
      .sidebar.sucking {
        left: 40px !important;
        top: 40px !important;
        margin-left: 0 !important;
        
        transform: scale(0.05) translate(-15px, -15px) !important;
        opacity: 0 !important;
        border-radius: 50% !important;
        pointer-events: none !important;
        
        transition: 
          transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94),
          opacity 1s ease-in,
          left 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94),
          top 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
      }
      
      .sidebar.sucking * {
        opacity: 0;
        transition: opacity 1s ease;
      }

      /* 超宽屏设置 */
      body.hexo-mono-scroll .main-inner {
        width: 1200px !important;
        max-width: 85% !important;
        transition: width 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), max-width 1.5s ease;
      }
    }
  `;
  document.head.appendChild(style);

  const body = document.body;
  const isSucked = localStorage.getItem(STORAGE_KEY) === 'sucked';

  if (isSucked) {
    const sb = getSidebar();
    if(sb) {
        sb.classList.add('sucking');
        body.classList.add('hexo-mono-scroll');
        btn.classList.add('active');
    }
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sidebar = getSidebar();
    if (!sidebar) return;

    const isCurrentlySucked = body.classList.contains('hexo-mono-scroll');

    if (isCurrentlySucked) {
      sidebar.classList.remove('sucking');
      body.classList.remove('hexo-mono-scroll');
      btn.classList.remove('active');
      localStorage.setItem(STORAGE_KEY, 'expanded');
    } else {
      sidebar.classList.add('shaking');
      sidebar.classList.remove('sucking');
      
      setTimeout(() => {
        sidebar.classList.remove('shaking');
        sidebar.classList.add('sucking');
        body.classList.add('hexo-mono-scroll');
        btn.classList.add('active');
        localStorage.setItem(STORAGE_KEY, 'sucked');
      }, 600);
    }
  });
});