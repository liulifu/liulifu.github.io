#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
删除文章文件名中的日期前缀
"""

import json
import re
from pathlib import Path

# 配置
POSTS_DIR = Path(__file__).parent / 'posts'
INDEX_JSON = POSTS_DIR / 'index.json'

def remove_date_prefix_from_filename(filename):
    """
    从文件名中删除日期前缀 (YYYY-MM-DD-)
    例如: 2023-04-05-fengbi-复现与重构方案.md -> fengbi-复现与重构方案.md
    """
    # 匹配日期前缀模式: YYYY-MM-DD-
    pattern = r'^\d{4}-\d{2}-\d{2}-'
    return re.sub(pattern, '', filename)

def main():
    print("🚀 开始删除文件名中的日期前缀...")
    print("=" * 80)
    
    # 1. 读取 index.json
    with open(INDEX_JSON, 'r', encoding='utf-8') as f:
        posts = json.load(f)
    
    print(f"📊 总共 {len(posts)} 篇文章")
    
    renamed_count = 0
    updated_posts = []
    
    # 2. 遍历所有文章
    for post in posts:
        old_file = post['file']
        old_path = POSTS_DIR / old_file
        
        # 检查文件是否存在
        if not old_path.exists():
            print(f"⚠️  文件不存在，跳过: {old_file}")
            updated_posts.append(post)
            continue
        
        # 获取目录和文件名
        if '/' in old_file:
            directory, filename = old_file.rsplit('/', 1)
        else:
            directory = ''
            filename = old_file
        
        # 删除日期前缀
        new_filename = remove_date_prefix_from_filename(filename)
        
        # 如果文件名没有变化，跳过
        if new_filename == filename:
            updated_posts.append(post)
            continue
        
        # 构建新的文件路径
        if directory:
            new_file = f"{directory}/{new_filename}"
        else:
            new_file = new_filename
        
        new_path = POSTS_DIR / new_file
        
        # 重命名文件
        try:
            old_path.rename(new_path)
            print(f"✅ {old_file}")
            print(f"   -> {new_file}")
            renamed_count += 1
            
            # 更新 post 中的文件路径
            post['file'] = new_file
            updated_posts.append(post)
            
        except Exception as e:
            print(f"❌ 重命名失败: {old_file}")
            print(f"   错误: {e}")
            updated_posts.append(post)
    
    # 3. 保存更新后的 index.json
    with open(INDEX_JSON, 'w', encoding='utf-8') as f:
        json.dump(updated_posts, f, ensure_ascii=False, indent=4)
    
    print("=" * 80)
    print(f"✅ 完成！")
    print(f"📊 统计：")
    print(f"  - 重命名文件：{renamed_count} 个")
    print(f"  - 已保存到：{INDEX_JSON}")
    print()
    print("💡 提示：")
    print("  1. 请运行 'python generate_index_v2.py' 重新生成 index.md")
    print("  2. 然后提交并推送到 GitHub")

if __name__ == '__main__':
    main()

