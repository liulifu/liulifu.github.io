import os
import shutil
from datetime import datetime

def ensure_dir(dir_path):
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)

def add_front_matter(content, title):
    # 默认front matter
    front_matter = f"""---
layout: post
title: "{title}"
date: {datetime.now().strftime('%Y-%m-%d')}
categories: [Uncategorized]
tags: []
---

"""
    # 如果内容已经有front matter，就不添加
    if content.startswith('---'):
        return content
    return front_matter + content

def move_posts():
    source_dir = 'content/posts'
    target_dir = '_posts'
    
    # 确保目标目录存在
    ensure_dir(target_dir)
    
    # 遍历源目录中的所有markdown文件
    for root, _, files in os.walk(source_dir):
        for file in files:
            if file.endswith('.md'):
                source_path = os.path.join(root, file)
                
                # 读取文件内容
                with open(source_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 添加front matter（如果需要）
                title = os.path.splitext(file)[0]
                content = add_front_matter(content, title)
                
                # 创建新的文件名（添加日期前缀）
                new_filename = datetime.now().strftime('%Y-%m-%d-') + file
                target_path = os.path.join(target_dir, new_filename)
                
                # 写入新文件
                with open(target_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f'Moved and processed: {file} -> {new_filename}')

if __name__ == '__main__':
    move_posts()
