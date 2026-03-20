#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地 Web 调试服务器
- 以脚本执行目录为根目录
- 监听 80 端口
- 支持静态文件访问
"""
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

def main():
    # 获取脚本执行的目录（当前工作目录）
    server_directory = os.getcwd()
    print(f"=== 本地 Web 调试服务器 ===")
    print(f"服务根目录: {server_directory}")
    print(f"访问地址: http://localhost")
    print(f"停止服务: Ctrl + C")
    print("===========================\n")

    # 切换工作目录到脚本执行目录（确保以该目录为根提供文件）
    os.chdir(server_directory)

    # 配置服务器参数
    server_address = ('', 80)  # 空字符串表示监听所有网卡，80 端口
    
    # 创建请求处理器（支持常见的 Web 文件 MIME 类型）
    class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):
        # 自定义日志格式，只打印关键信息
        def log_message(self, format, *args):
            print(f"[{self.log_date_time_string()}] {args[0]}")

    try:
        # 创建并启动服务器
        httpd = HTTPServer(server_address, CustomHTTPRequestHandler)
        httpd.serve_forever()
    except PermissionError:
        print("\n错误：80 端口需要管理员/root 权限！")
        print("解决方案：")
        print("1. Linux/Mac: 使用 sudo 运行脚本 (sudo python3 脚本名.py)")
        print("2. Windows: 以管理员身份运行命令提示符/PowerShell 后执行脚本")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n服务器已停止")
        sys.exit(0)
    except Exception as e:
        print(f"\n服务器启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # 检查 Python 版本（兼容 3.x 所有版本）
    if sys.version_info < (3, 0):
        print("错误：需要 Python 3.x 版本运行此脚本")
        sys.exit(1)
    
    main()