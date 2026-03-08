import requests
import json
import os
import time

# ================= 配置区域 =================
PROXIES = None

BASE_API_URL = "https://twitter-ero-video-ranking.com/api/media"
BASE_PARAMS = {
    "range": "all",
    "per_page": 10000,
    "category": "",
    "ids": "",
    "isAnimeOnly": "0",
    "sort": "favorite"
}

HEADERS_LIST = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "referer": "https://twitter-ero-video-ranking.com/zh-CN/all",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
}

# 【修改点 1】输出地址：改为相对路径
# 这样在 GitHub Actions (Linux) 和本地 (Mac/Win) 都能通用
# 文件将被保存在项目根目录下的 twitter-ero-video-ranking 文件夹中
OUTPUT_ROOT_DIR = 'twitter-ero-video-ranking'

CHUNK_SIZE = 100000

OLD_URL_PREFIX = "https://pbs.twimg.com/"
NEW_URL_PREFIX = "https://images.weserv.nl/?url=https://pbs.twimg.com/"

def fetch_all_data():
    """分页抓取所有数据"""
    all_data = []
    page = 1
    max_retries = 3
    
    print("开始从 API 抓取数据...")
    
    while True:
        params = BASE_PARAMS.copy()
        params['page'] = page
        
        success = False
        for attempt in range(max_retries):
            try:
                # 显式传入 proxies=None，确保不使用任何系统默认代理
                response = requests.get(
                    BASE_API_URL, 
                    params=params, 
                    headers=HEADERS_LIST, 
                    proxies=PROXIES, 
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                success = True
                break
            except Exception as e:
                print(f"尝试第 {attempt+1} 次抓取第 {page} 页时出错: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2)
                else:
                    return all_data # 失败则返回已抓取的部分
        
        # --- 数据提取与清洗逻辑 ---
        items = []
        
        # 情况1: 直接返回列表
        if isinstance(data, list):
            items = data
        # 情况2: 返回字典，数据在 'data' 键中
        elif isinstance(data, dict):
            if 'data' in data:
                raw_items = data['data']
                if isinstance(raw_items, list):
                    items = raw_items
            elif 'items' in data:
                raw_items = data['items']
                if isinstance(raw_items, list):
                    items = raw_items
            elif 'list' in data: # 某些 API 用 list
                 raw_items = data['list']
                 if isinstance(raw_items, list):
                    items = raw_items
        
        if not items:
            print(f"第 {page} 页无数据或数据结构未知，停止抓取。")
            break
            
        # 【关键修复】检查列表中的元素是否为字符串，如果是则尝试解析
        cleaned_items = []
        for item in items:
            if isinstance(item, dict):
                cleaned_items.append(item)
            elif isinstance(item, str):
                try:
                    parsed_item = json.loads(item)
                    cleaned_items.append(parsed_item)
                except json.JSONDecodeError:
                    print(f"警告: 发现无法解析的字符串数据项，已跳过: {item[:50]}...")
            else:
                print(f"警告: 发现未知数据类型 {type(item)}，已跳过。")
        
        if not cleaned_items:
            print(f"第 {page} 页清洗后无有效数据，停止。")
            break

        all_data.extend(cleaned_items)
        print(f"已抓取第 {page} 页，累计 {len(all_data)} 条有效数据...")
        
        if len(cleaned_items) < BASE_PARAMS['per_page']:
            break
            
        page += 1
        time.sleep(0.5)
            
    return all_data

def process_and_split_data(data):
    """排序、替换 URL 并拆分写入文件"""
    
    if not data:
        print("没有数据可处理。")
        return

    total = len(data)
    print(f"\n数据加载完成，共 {total} 条记录。")

    # 再次确认数据类型
    valid_data = [x for x in data if isinstance(x, dict)]
    if len(valid_data) != total:
        print(f"警告: 原始数据中有 {total - len(valid_data)} 条非字典数据已被过滤。")
    
    # 1. 排序：按 created_at 降序
    print("正在按 created_at 字段进行时间降序排序...")
    try:
        valid_data.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        if total > 0:
            print(f"排序完成。最新时间: {valid_data[0].get('created_at')}, 最旧时间: {valid_data[-1].get('created_at')}")
    except Exception as e:
        print(f"排序失败: {e}")
        return

    # 2. 替换 URL
    print("正在替换图片 URL...")
    json_str = json.dumps(valid_data, ensure_ascii=False)
    modified_json_str = json_str.replace(OLD_URL_PREFIX, NEW_URL_PREFIX)
    processed_data = json.loads(modified_json_str)
    print("URL 替换完成。")

    # 3. 写入文件
    # exist_ok=True 确保如果目录不存在会自动创建
    os.makedirs(OUTPUT_ROOT_DIR, exist_ok=True)
    print(f"输出目录: {os.path.abspath(OUTPUT_ROOT_DIR)}")
    print(f"开始拆分 (每块 {CHUNK_SIZE} 条)...")
    
    files_created = 0
    current_total = len(processed_data)
    
    # 如果目录里有旧文件，可以选择先清理（可选，这里为了简单保留，因为文件名是固定的）
    # 如果需要覆盖旧的分片文件，直接写入即可
    
    for i in range(0, current_total, CHUNK_SIZE):
        chunk = processed_data[i:i+CHUNK_SIZE]
        filename = f'data-part-{i//CHUNK_SIZE}.json'
        full_path = os.path.join(OUTPUT_ROOT_DIR, filename)
        
        with open(full_path, 'w', encoding='utf-8') as out:
            json.dump(chunk, out, ensure_ascii=False)
        
        files_created += 1
        print(f"已生成: {filename} ({len(chunk)} 条)")

    print("\n=== 完成! ===")

if __name__ == "__main__":
    raw_data = fetch_all_data()
    if raw_data:
        process_and_split_data(raw_data)
    else:
        print("未获取到数据。")