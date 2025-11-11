#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将现有博客迁移到 Jekyll 格式
"""

import json
import re
import shutil
from pathlib import Path
from datetime import datetime

# 配置
POSTS_DIR = Path(__file__).parent / 'posts'
JEKYLL_POSTS_DIR = Path(__file__).parent / '_posts'
INDEX_JSON = POSTS_DIR / 'index.json'

def create_jekyll_front_matter(post):
    """
    创建 Jekyll YAML Front Matter
    """
    title = post.get('title', 'Untitled')
    date = post.get('date', datetime.now().strftime('%Y-%m-%d'))
    category = post.get('category', 'notes')
    author = post.get('author', 'Lifu')
    
    front_matter = f"""---
layout: post
title: "{title}"
date: {date}
categories: {category}
author: {author}
---

"""
    return front_matter

def get_jekyll_filename(post):
    """
    生成 Jekyll 文件名格式: YYYY-MM-DD-title.md
    """
    date = post.get('date', datetime.now().strftime('%Y-%m-%d'))
    title = post.get('title', 'untitled')
    
    # 清理标题，移除特殊字符
    clean_title = re.sub(r'[^\w\s-]', '', title)
    clean_title = re.sub(r'[\s]+', '-', clean_title)
    clean_title = clean_title[:50]  # 限制长度
    
    # 如果标题是中文，使用原文件名
    original_file = post.get('file', '')
    if original_file:
        # 提取原文件名（不含路径和扩展名）
        original_name = Path(original_file).stem
        # 如果原文件名不是以日期开头，使用它
        if not re.match(r'^\d{4}-\d{2}-\d{2}', original_name):
            clean_title = original_name
    
    filename = f"{date}-{clean_title}.md"
    return filename

def migrate_post(post):
    """
    迁移单篇文章到 Jekyll 格式
    """
    original_file = post.get('file', '')
    if not original_file:
        print(f"⚠️  跳过：文章没有文件路径")
        return False
    
    original_path = POSTS_DIR / original_file
    if not original_path.exists():
        print(f"⚠️  跳过：文件不存在 - {original_file}")
        return False
    
    # 读取原文件内容
    try:
        content = original_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ 读取失败：{original_file} - {e}")
        return False
    
    # 检查是否已有 Front Matter
    if content.startswith('---'):
        print(f"⏭️  跳过：已有 Front Matter - {original_file}")
        # 直接复制到 _posts 目录
        jekyll_filename = get_jekyll_filename(post)
        jekyll_path = JEKYLL_POSTS_DIR / jekyll_filename
        try:
            shutil.copy2(original_path, jekyll_path)
            print(f"✅ 复制：{original_file} -> {jekyll_filename}")
            return True
        except Exception as e:
            print(f"❌ 复制失败：{e}")
            return False
    
    # 创建 Front Matter
    front_matter = create_jekyll_front_matter(post)
    
    # 合并 Front Matter 和原内容
    new_content = front_matter + content
    
    # 生成 Jekyll 文件名
    jekyll_filename = get_jekyll_filename(post)
    jekyll_path = JEKYLL_POSTS_DIR / jekyll_filename
    
    # 写入新文件
    try:
        jekyll_path.write_text(new_content, encoding='utf-8')
        print(f"✅ 转换：{original_file} -> {jekyll_filename}")
        return True
    except Exception as e:
        print(f"❌ 写入失败：{jekyll_filename} - {e}")
        return False

def main():
    print("🚀 开始迁移到 Jekyll...")
    print("=" * 80)
    
    # 创建 _posts 目录
    JEKYLL_POSTS_DIR.mkdir(exist_ok=True)
    print(f"📁 创建目录：{JEKYLL_POSTS_DIR}")
    
    # 读取 index.json
    if not INDEX_JSON.exists():
        print(f"❌ 错误：找不到 {INDEX_JSON}")
        return
    
    with open(INDEX_JSON, 'r', encoding='utf-8') as f:
        posts = json.load(f)
    
    print(f"📊 总共 {len(posts)} 篇文章")
    print("=" * 80)
    
    # 迁移每篇文章
    success_count = 0
    for i, post in enumerate(posts, 1):
        print(f"\n[{i}/{len(posts)}] ", end='')
        if migrate_post(post):
            success_count += 1
    
    print("\n" + "=" * 80)
    print(f"✅ 完成！")
    print(f"📊 统计：")
    print(f"  - 成功迁移：{success_count} 篇")
    print(f"  - 失败/跳过：{len(posts) - success_count} 篇")
    print(f"  - 输出目录：{JEKYLL_POSTS_DIR}")
    print()
    print("💡 下一步：")
    print("  1. 检查 _posts 目录中的文章")
    print("  2. 运行 'bundle install' 安装依赖（需要 Ruby）")
    print("  3. 运行 'bundle exec jekyll serve' 本地预览")
    print("  4. 提交并推送到 GitHub")

if __name__ == '__main__':
    main()

