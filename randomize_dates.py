#!/usr/bin/env python3
"""
随机调整博客文章日期脚本
将 2025-11-11 的文章日期随机分散到 2023-01 至 2025-11 之间
同时更新文件名和 index.json
"""

import json
import random
import shutil
from pathlib import Path
from datetime import datetime, timedelta

# 配置
SCRIPT_DIR = Path(__file__).parent.resolve()
POSTS_DIR = SCRIPT_DIR / 'posts'
INDEX_JSON = POSTS_DIR / 'index.json'

# 日期范围：2023-01-01 到 2025-11-30
START_DATE = datetime(2023, 1, 1)
END_DATE = datetime(2025, 11, 30)

# 需要排除的文件（保持原日期）
EXCLUDE_FILES = {
    '2024-12-05-aliecs.md',
    '2024-12-05-一种文件加密设计.md',
    '2024-12-05-构建Python开发环境.md',
    '2025-07-12-更新博客自动脚本.md',
}


def generate_random_date():
    """生成一个随机日期（2023-01-01 到 2025-11-30）"""
    delta = END_DATE - START_DATE
    random_days = random.randint(0, delta.days)
    random_date = START_DATE + timedelta(days=random_days)
    return random_date.strftime('%Y-%m-%d')


def update_file_date_in_content(file_path, new_date):
    """更新 Markdown 文件内容中的日期（如果有的话）"""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # 尝试更新文件头部的日期字段（如果存在）
        # 常见格式：date: 2025-11-11 或 Date: 2025-11-11
        import re
        
        # 匹配 YAML front matter 中的日期
        pattern = r'(date:\s*)(\d{4}-\d{2}-\d{2})'
        if re.search(pattern, content, re.IGNORECASE):
            content = re.sub(pattern, rf'\g<1>{new_date}', content, flags=re.IGNORECASE)
            file_path.write_text(content, encoding='utf-8')
            return True
        
        return False
    except Exception as e:
        print(f"  ⚠️  Warning: Could not update content date in {file_path.name}: {e}")
        return False


def rename_file_with_new_date(old_path, new_date):
    """重命名文件，将文件名中的日期替换为新日期"""
    old_name = old_path.name
    
    # 检查文件名是否以日期开头（格式：YYYY-MM-DD-）
    if old_name.startswith('2025-11-11-'):
        new_name = old_name.replace('2025-11-11-', f'{new_date}-', 1)
        new_path = old_path.parent / new_name
        
        # 重命名文件
        old_path.rename(new_path)
        print(f"  📝 Renamed: {old_name} -> {new_name}")
        return new_path, new_name
    
    return old_path, old_name


def main():
    print("🚀 开始随机调整文章日期...")
    print("=" * 60)
    
    # 1. 读取 index.json
    if not INDEX_JSON.exists():
        print(f"❌ Error: {INDEX_JSON} not found!")
        return
    
    with open(INDEX_JSON, 'r', encoding='utf-8') as f:
        posts = json.load(f)
    
    print(f"📊 总共 {len(posts)} 篇文章")
    
    # 2. 统计需要更新的文章
    posts_to_update = [p for p in posts if p.get('date') == '2025-11-11']
    print(f"📅 需要更新日期的文章：{len(posts_to_update)} 篇")
    
    if len(posts_to_update) == 0:
        print("✅ 没有需要更新的文章！")
        return
    
    # 3. 为每篇文章生成随机日期
    updated_count = 0
    renamed_count = 0
    
    for post in posts:
        if post.get('date') != '2025-11-11':
            continue
        
        # 检查是否在排除列表中
        file_name = Path(post['file']).name
        if file_name in EXCLUDE_FILES:
            print(f"⏭️  跳过（排除列表）: {post['file']}")
            continue
        
        # 生成新日期
        new_date = generate_random_date()
        old_date = post['date']
        
        print(f"\n📄 处理: {post['file']}")
        print(f"  📅 旧日期: {old_date} -> 新日期: {new_date}")
        
        # 更新 JSON 中的日期
        post['date'] = new_date
        
        # 获取文件路径
        file_path = POSTS_DIR / post['file']
        
        if file_path.exists():
            # 更新文件内容中的日期
            update_file_date_in_content(file_path, new_date)
            
            # 重命名文件（如果文件名包含日期）
            new_path, new_name = rename_file_with_new_date(file_path, new_date)
            
            # 更新 JSON 中的文件路径
            if new_name != file_path.name:
                old_file = post['file']
                # 保留目录结构
                if '/' in old_file:
                    directory = old_file.rsplit('/', 1)[0]
                    post['file'] = f"{directory}/{new_name}"
                else:
                    post['file'] = new_name
                renamed_count += 1
            
            updated_count += 1
        else:
            print(f"  ⚠️  Warning: File not found: {file_path}")
    
    # 4. 按日期重新排序
    posts.sort(key=lambda p: datetime.strptime(p['date'], '%Y-%m-%d'), reverse=True)
    
    # 5. 保存更新后的 index.json
    with open(INDEX_JSON, 'w', encoding='utf-8') as f:
        json.dump(posts, f, indent=4, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print(f"✅ 完成！")
    print(f"📊 统计：")
    print(f"  - 更新日期：{updated_count} 篇")
    print(f"  - 重命名文件：{renamed_count} 个")
    print(f"  - 已保存到：{INDEX_JSON}")
    print("\n💡 提示：")
    print("  1. 请运行 'python generate_index_v2.py' 重新生成 index.md")
    print("  2. 然后提交并推送到 GitHub")


if __name__ == "__main__":
    main()

