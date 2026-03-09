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
                    return all_data 
        
        items = []
        
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            if 'data' in data:
                raw_items = data['data']
                if isinstance(raw_items, list):
                    items = raw_items
            elif 'items' in data:
                raw_items = data['items']
                if isinstance(raw_items, list):
                    items = raw_items
            elif 'list' in data:
                 raw_items = data['list']
                 if isinstance(raw_items, list):
                    items = raw_items
        
        if not items:
            print(f"第 {page} 页无数据或数据结构未知，停止抓取。")
            break
            
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

def should_include_video(item):
    """
    根据时间和收藏数判断视频是否应该被收录。
    假设 item['time'] 单位是秒。如果单位是分钟，请调整下方的阈值。
    """
    # 获取时间和收藏数，设置默认值为 0 以防字段缺失
    t = item.get('time', 0)
    fav = item.get('favorite', 0)
    
    # 确保数据类型正确 (防止字符串导致比较错误)
    try:
        t = float(t)
        fav = int(fav)
    except (ValueError, TypeError):
        return False

    # 规则实现 (时间单位：秒)
    # 1. time > 10 分钟 (600秒)
    if t > 600:
        return True
    
    # 2. 5 分钟 < time <= 10 分钟 (300 < t <= 600), favorite > 100
    if 300 < t <= 600:
        return fav > 150
    
    # 3. 3 分钟 < time <= 5 分钟 (180 < t <= 300), favorite > 1000
    if 180 < t <= 300:
        return fav > 300
    
    # 4. 1 分钟 < time <= 3 分钟 (60 < t <= 180), favorite > 10000
    if 60 < t <= 180:
        return fav > 450
    
    # 5. time <= 1 分钟 (t <= 60), favorite > 100000
    if t <= 60:
        return fav > 600
    
    return False

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
    
    # ================= 新增筛选步骤 =================
    print("正在根据时间和收藏数条件筛选视频...")
    original_count = len(valid_data)
    filtered_data = [item for item in valid_data if should_include_video(item)]
    filtered_count = len(filtered_data)
    
    print(f"筛选完成: 原始数据 {original_count} 条 -> 筛选后剩余 {filtered_count} 条 (移除了 {original_count - filtered_count} 条)")
    
    if filtered_count == 0:
        print("警告: 筛选后没有剩余任何数据，后续步骤将跳过。")
        return
    
    # 更新 valid_data 为筛选后的数据
    valid_data = filtered_data
    # ===========================================

    # 1. 排序：按 created_at 降序
    print("正在按 created_at 字段进行时间降序排序...")
    try:
        valid_data.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        if len(valid_data) > 0:
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
    os.makedirs(OUTPUT_ROOT_DIR, exist_ok=True)
    print(f"输出目录: {os.path.abspath(OUTPUT_ROOT_DIR)}")
    print(f"开始拆分 (每块 {CHUNK_SIZE} 条)...")
    
    files_created = 0
    current_total = len(processed_data)
    
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