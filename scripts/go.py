#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHub Actions 专用版本：
- 订阅拉取 + 清洗 + TCP 测速
- 结果直接覆盖写入 FlClashTest/Test.yaml
"""

import requests
import yaml
import base64
import asyncio
import socket
import time
import os
import re
import sys
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# ==================== 🔧 用户配置区域 ====================

# 【必填】填入您的订阅链接
MY_SUBSCRIPTIONS = [
    "https://wget.la/https://raw.githubusercontent.com/maxlay/maxlay.github.io/main/FlClashTest/Test.yaml"
]

# 【可选】公共节点池
PUBLIC_NODE_POOLS = [
    "https://wget.la/https://raw.githubusercontent.com/ssrsub/ssr/master/clash.yaml",
    "https://wget.la/https://github.com/PuddinCat/BestClash/blob/main/proxies.yaml",
    "https://wget.la/https://raw.githubusercontent.com/chengaopan/AutoMergePublicNodes/master/list.meta.yml",
    "https://wget.la/https://raw.githubusercontent.com/shaoyouvip/free/refs/heads/main/all.yaml",
    "https://wget.la/https://raw.githubusercontent.com/free18/v2ray/refs/heads/main/c.yaml",
    "https://wget.la/https://raw.githubusercontent.com/anaer/Sub/main/clash.yaml",
    "https://wget.la/https://raw.githubusercontent.com/zyzmzyz/free-nodes/master/Clash.yml",
    "https://wget.la/https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/clash.yml",
]

# --- 测速配置 ---
MAX_LATENCY_INIT = 300      # 最大延迟阈值 (ms)
CONCURRENT_PING = 200       # GitHub Actions 建议适当降低并发
PING_TIMEOUT = 0.8          # 单个 Ping 超时 (秒)
PING_COUNT = 5              # 每个节点测试次数

# --- 兼容性配置 ---
KEEP_XHTTP = False
TEST_URL = "https://www.gstatic.com/generate_204"

# 输出文件（相对仓库根目录，直接覆盖）
OUTPUT_FILE = "FlClashTest/Test.yaml"

# =======================================================================

def fetch_url(url):
    try:
        headers = {'User-Agent': 'ClashForWindows/0.20.0'}
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"   ⚠️  获取失败: {e}")
        return None

def decode_base64(content):
    try:
        missing_padding = len(content) % 4
        if missing_padding:
            content += '=' * (4 - missing_padding)
        decoded = base64.b64decode(content).decode('utf-8')
        if decoded.strip().startswith('proxies:') or decoded.strip().startswith('- name:') or decoded.strip().startswith('{'):
            return decoded
    except Exception:
        pass
    return content

def parse_proxies(content):
    if not content:
        return []
    content = content.strip()
    if content.startswith('ey') or content.startswith('cHJveGllcw') or '\n' not in content:
        content = decode_base64(content)
    try:
        data = yaml.safe_load(content)
    except Exception:
        return []
    if isinstance(data, dict) and isinstance(data.get('proxies'), list):
        return [p for p in data['proxies'] if isinstance(p, dict)]
    if isinstance(data, list):
        return [p for p in data if isinstance(p, dict)]
    return []


# ==================== 节点清洗 ====================

SUPPORTED_TYPES = {
    'ss', 'ssr', 'vmess', 'vless', 'trojan', 'hysteria', 'hysteria2',
    'tuic', 'socks5', 'http', 'anytls', 'wireguard'
}
VALID_FP = {
    'chrome', 'firefox', 'safari', 'ios', 'android', 'edge', '360', 'qq',
    'random', 'randomized'
}
JUNK_KEYS = ('security', 'sid', 'pbk', 'fp', 'headerType')
UUID_RE = re.compile(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
)
NEED_FIELDS = {
    'vless': ['uuid'], 'vmess': ['uuid'], 'trojan': ['password'],
    'ss': ['cipher', 'password'], 'hysteria2': ['password'],
}


def sanitize_proxy(p):
    if not isinstance(p, dict):
        return None
    p = dict(p)

    ptype = str(p.get('type', '')).lower()
    if ptype == 'hy2':
        ptype = 'hysteria2'
    if ptype not in SUPPORTED_TYPES:
        return None
    p['type'] = ptype

    server = p.get('server')
    if not server:
        return None
    p['server'] = str(server).strip()
    try:
        port = int(p.get('port'))
    except (TypeError, ValueError):
        return None
    if not 1 <= port <= 65535:
        return None
    p['port'] = port

    name = str(p.get('name') or f"{p['server']}:{port}")
    name = re.sub(r'[\r\n\t]+', ' ', name).strip()
    p['name'] = name or f"{p['server']}:{port}"

    p = {k: v for k, v in p.items() if v not in (None, '', {}, [])}

    for k in NEED_FIELDS.get(ptype, []):
        if k not in p:
            return None
    if ptype in ('vless', 'vmess') and not UUID_RE.match(str(p['uuid'])):
        return None
    if ptype == 'vmess':
        p.setdefault('alterId', 0)
        p.setdefault('cipher', 'auto')
    if ptype == 'vless' and p.get('encryption') in ('none', ''):
        p.pop('encryption', None)

    for k in ('password', 'uuid', 'cipher', 'username'):
        if k in p:
            p[k] = str(p[k])

    net = p.get('network')
    if net == 'xhttp' and not KEEP_XHTTP:
        return None
    if net == 'tcp':
        p.pop('network', None)

    fp = p.get('client-fingerprint')
    if fp is None and p.get('fp'):
        fp = p['fp']
    if fp is not None:
        fp = str(fp).lower()
        if fp in VALID_FP:
            p['client-fingerprint'] = fp
        else:
            p.pop('client-fingerprint', None)

    if str(p.get('security', '')).lower() == 'reality' or 'reality-opts' in p:
        ro = p.get('reality-opts')
        ro = dict(ro) if isinstance(ro, dict) else {}
        if p.get('pbk'):
            ro.setdefault('public-key', p['pbk'])
        if p.get('sid'):
            ro.setdefault('short-id', p['sid'])
        if not ro.get('public-key'):
            return None
        for k in ('public-key', 'short-id'):
            if k in ro:
                ro[k] = str(ro[k])
        p['reality-opts'] = ro
        p['tls'] = True

    for k in JUNK_KEYS:
        p.pop(k, None)

    if isinstance(p.get('alpn'), str):
        p['alpn'] = [x.strip() for x in p['alpn'].split(',') if x.strip()]

    return p


def sanitize_all(proxies):
    out, dropped = [], 0
    for p in proxies:
        sp = sanitize_proxy(p)
        if sp is None:
            dropped += 1
        else:
            out.append(sp)
    return out, dropped


def deduplicate(proxies):
    seen = set()
    unique = []
    for p in proxies:
        cred = p.get('uuid') or p.get('password') or p.get('username') or ''
        key = (p.get('type'), p.get('server'), p.get('port'), str(cred))
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique


def ping_tcp(host, port, timeout=2):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        start_time = time.time()
        result = sock.connect_ex((host, int(port)))
        end_time = time.time()
        sock.close()
        if result == 0:
            return (end_time - start_time) * 1000
        return None
    except Exception:
        return None


async def ping_node_async(loop, executor, idx, p):
    server = p.get('server')
    port = p.get('port')
    if not server or not port:
        return idx, None

    def do_ping():
        delays = []
        for _ in range(PING_COUNT):
            d = ping_tcp(server, port, PING_TIMEOUT)
            if d is not None:
                delays.append(d)
        if delays:
            return sum(delays) / len(delays)
        return None

    try:
        result = await loop.run_in_executor(executor, do_ping)
        if result is not None and 0 < result < MAX_LATENCY_INIT:
            return idx, result
        return idx, None
    except Exception:
        return idx, None


async def batch_ping(proxies):
    print(f"\n🚀 开始 TCP 端口测试 ({len(proxies)} 个节点)...")
    loop = asyncio.get_running_loop()
    executor = ThreadPoolExecutor(max_workers=CONCURRENT_PING)

    tasks = [ping_node_async(loop, executor, i, p) for i, p in enumerate(proxies)]

    valid = {}
    for n, coro in enumerate(asyncio.as_completed(tasks), 1):
        idx, delay = await coro
        if delay is not None:
            valid[idx] = delay
        if n % 100 == 0 or n == len(tasks):
            print(f"   进度：{n}/{len(tasks)} (当前有效：{len(valid)})")

    executor.shutdown(wait=False)

    result = sorted(
        ((proxies[i], d) for i, d in valid.items()),
        key=lambda x: x[1]
    )
    print(f"   ✅ TCP 测试完成。有效节点：{len(result)} 个")
    return result


def generate_config(results):
    if not results:
        return None

    final_proxies = []
    used_names = set()
    for p, latency in results:
        base = f"[{int(latency)}ms] {p['name']}"
        new_name = base
        n = 2
        while new_name in used_names:
            new_name = f"{base} #{n}"
            n += 1
        used_names.add(new_name)

        p_copy = dict(p)
        p_copy['name'] = new_name
        final_proxies.append(p_copy)

    names = [p['name'] for p in final_proxies]

    config = {
        'mixed-port': 7890,
        'allow-lan': True,
        'mode': 'rule',
        'log-level': 'info',
        'proxies': final_proxies,
        'proxy-groups': [
            {
                'name': '🚀 自动优选',
                'type': 'url-test',
                'proxies': names,
                'url': TEST_URL,
                'interval': 300,
                'tolerance': 50
            },
            {
                'name': '🌍 手动切换',
                'type': 'select',
                'proxies': ['🚀 自动优选'] + names + ['DIRECT']
            }
        ],
        'rules': ['MATCH,🌍 手动切换']
    }
    return config


def validate_config(config):
    names = [p['name'] for p in config['proxies']]
    assert len(names) == len(set(names)), "存在重复节点名"
    valid = set(names) | {g['name'] for g in config['proxy-groups']} | {'DIRECT', 'REJECT'}
    for g in config['proxy-groups']:
        for n in g['proxies']:
            assert n in valid, f"分组 {g['name']} 引用了不存在的节点: {n}"


def save_config(config):
    """直接覆盖写入 FlClashTest/Test.yaml"""
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        yaml.safe_dump(
            config, f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
            width=4096
        )
    print(f"✅ 已覆盖保存：{OUTPUT_FILE}")


def main():
    print("ℹ️  测速模式：纯 TCP 连接测试（GitHub Actions 环境）")
    print(f"⏰ 运行时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    all_proxies = []
    urls = MY_SUBSCRIPTIONS + PUBLIC_NODE_POOLS

    print("\n========================================")
    print("📥 正在获取订阅")
    print("========================================")

    print(f"\n🔹 私人订阅 ({len(MY_SUBSCRIPTIONS)} 个)")
    for idx, url in enumerate(MY_SUBSCRIPTIONS, 1):
        content = fetch_url(url)
        if content:
            subs = parse_proxies(content)
            all_proxies.extend(subs)
            print(f"   ✅ {idx}/{len(MY_SUBSCRIPTIONS)} | 获取节点：{len(subs)} 个")
        else:
            print(f"   ❌ {idx}/{len(MY_SUBSCRIPTIONS)} | 获取失败")

    print(f"\n🔹 公共订阅 ({len(PUBLIC_NODE_POOLS)} 个)")
    for idx, url in enumerate(PUBLIC_NODE_POOLS, 1):
        content = fetch_url(url)
        if content:
            subs = parse_proxies(content)
            all_proxies.extend(subs)
            print(f"   ✅ {idx}/{len(PUBLIC_NODE_POOLS)} | 获取节点：{len(subs)} 个")
        else:
            print(f"   ❌ {idx}/{len(PUBLIC_NODE_POOLS)} | 获取失败")

    if not all_proxies:
        print("\n❌ 未获取到任何节点，退出")
        sys.exit(1)

    print("\n========================================")
    print(f"🔄 原始节点：{len(all_proxies)} 个")
    clean_proxies, dropped = sanitize_all(all_proxies)
    print(f"🧹 清洗后：{len(clean_proxies)} 个（剔除 {dropped} 个）")
    unique_proxies = deduplicate(clean_proxies)
    print(f"🔄 去重后：{len(unique_proxies)} 个节点")
    print("========================================")

    async def run():
        ping_results = await batch_ping(unique_proxies)

        if not ping_results:
            print("\n❌ 没有延迟合格的节点")
            sys.exit(1)

        config = generate_config(ping_results)
        if config:
            validate_config(config)
            save_config(config)

            print(f"\n🎉 成功！共写入 {len(config['proxies'])} 个节点")
            print("🏆 延迟最低的 5 个节点:")
            for i, p in enumerate(config['proxies'][:5]):
                print(f"   {i+1}. {p['name']}")

    asyncio.run(run())


if __name__ == "__main__":
    try:
        import yaml, requests
    except ImportError:
        print("❌ 缺少依赖：pip install requests pyyaml")
        sys.exit(1)
    main()