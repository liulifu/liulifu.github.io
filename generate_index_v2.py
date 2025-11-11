import json
import re
import os
import subprocess
from pathlib import Path
import datetime
import sys
from typing import List, Dict, Optional, Tuple

# --- 配置 ---
# 获取脚本所在的目录
SCRIPT_DIR = Path(__file__).parent.resolve()
# 输入和输出文件相对于脚本目录的路径
POSTS_DIR = SCRIPT_DIR / 'posts'
SOURCE_MD_FILE = POSTS_DIR / 'index.md'
OUTPUT_JSON_FILE = POSTS_DIR / 'index.json'

# 默认配置
DEFAULT_AUTHOR = "Lifu"
DEFAULT_LICENSE = "MIT"
DEFAULT_VERSION = "v0.1.0"

# 排除的文件（不作为博客文章处理）
EXCLUDED_FILES = {'index.md', 'about.md'}

# Git配置
GIT_ENABLED = True  # 是否启用Git自动提交推送

# Markdown 表格头(小写)到最终 JSON key 的映射
HEADER_MAP = {
    'title': 'title',         # 必需
    'date': 'date',           # 必需 (YYYY-MM-DD格式)
    'file': 'file',           # 必需 (markdown文件名)
    'excerpt': 'excerpt',     # 可选
    'author': 'author',       # 可选
    'version': 'version',     # 可选
    'license': 'license',     # 可选
    'category': 'category',   # 可选 (自动识别或手动指定)
}
REQUIRED_HEADERS = ['title', 'date', 'file'] # 必须存在的列

def scan_posts_directory() -> List[str]:
    """扫描posts目录，返回所有.md文件列表（包括子目录，排除特殊文件）"""
    print(f"Scanning posts directory: {POSTS_DIR}")

    if not POSTS_DIR.exists():
        print(f"Error: Posts directory not found: {POSTS_DIR}")
        return []

    md_files = []
    # 使用 **/*.md 递归扫描所有子目录
    for file_path in POSTS_DIR.glob("**/*.md"):
        filename = file_path.name
        if filename not in EXCLUDED_FILES:
            # 获取相对于posts目录的路径
            relative_path = file_path.relative_to(POSTS_DIR)
            # 使用正斜杠作为路径分隔符（适用于web）
            md_files.append(str(relative_path).replace('\\', '/'))

    print(f"Found {len(md_files)} markdown files: {md_files}")
    return sorted(md_files)

def extract_title_from_content(file_path: Path) -> Optional[str]:
    """从markdown文件内容中提取标题"""
    try:
        content = file_path.read_text(encoding='utf-8')
        lines = content.strip().split('\n')
        
        # 查找第一个 # 标题
        for line in lines[:10]:  # 只检查前10行
            line = line.strip()
            if line.startswith('# '):
                return line[2:].strip()
        
        # 如果没找到，尝试从文件名提取
        return extract_title_from_filename(file_path.name)
    except Exception as e:
        print(f"Warning: Could not read file {file_path}: {e}")
        return extract_title_from_filename(file_path.name)

def extract_title_from_filename(filename: str) -> str:
    """从文件名提取标题"""
    # 移除.md扩展名
    name = filename.replace('.md', '')
    
    # 如果是日期格式开头的文件名 (YYYY-MM-DD-title)
    date_pattern = r'^\d{4}-\d{2}-\d{2}-(.+)$'
    match = re.match(date_pattern, name)
    if match:
        return match.group(1).replace('-', ' ').replace('_', ' ')
    
    # 否则直接使用文件名
    return name.replace('-', ' ').replace('_', ' ')

def extract_date_from_filename(filename: str) -> Optional[str]:
    """从文件名提取日期"""
    # 查找 YYYY-MM-DD 格式的日期
    date_pattern = r'^(\d{4}-\d{2}-\d{2})'
    match = re.match(date_pattern, filename)
    if match:
        return match.group(1)
    return None

def get_file_creation_date(file_path: Path) -> str:
    """获取文件创建日期"""
    try:
        # 获取文件的修改时间
        timestamp = file_path.stat().st_mtime
        date = datetime.datetime.fromtimestamp(timestamp)
        return date.strftime('%Y-%m-%d')
    except Exception:
        # 如果获取失败，返回今天的日期
        return datetime.datetime.now().strftime('%Y-%m-%d')

def create_post_entry(filename: str) -> Dict[str, str]:
    """为新文件创建文章条目"""
    file_path = POSTS_DIR / filename

    # 提取标题
    title = extract_title_from_content(file_path)

    # 提取日期
    date = extract_date_from_filename(filename)
    if not date:
        date = get_file_creation_date(file_path)

    # 根据文件路径自动识别分类
    category = None
    if filename.startswith('biopharma/'):
        category = 'biopharma'
    elif filename.startswith('dba/'):
        category = 'dba'
    elif filename.startswith('csv/'):
        category = 'csv'
    elif filename.startswith('enterprise/'):
        category = 'enterprise'
    elif filename.startswith('notes/'):
        category = 'notes'

    # 创建基本条目
    entry = {
        'title': title,
        'date': date,
        'file': filename,
        'author': DEFAULT_AUTHOR
    }

    # 添加category字段（如果识别到）
    if category:
        entry['category'] = category

    print(f"Created entry for {filename}: {entry}")
    return entry

def parse_existing_index_md() -> List[Dict[str, str]]:
    """解析现有的index.md文件，返回已登记的文章列表"""
    if not SOURCE_MD_FILE.exists():
        print("No existing index.md found, will create new one.")
        return []
    
    try:
        content = SOURCE_MD_FILE.read_text(encoding='utf-8')
        posts = parse_markdown_table(content)
        return posts if posts else []
    except Exception as e:
        print(f"Error parsing existing index.md: {e}")
        return []

def parse_markdown_table(md_content: str) -> Optional[List[Dict[str, str]]]:
    """解析Markdown表格"""
    posts = []
    lines = md_content.strip().splitlines()
    headers = []
    header_indices = {}
    in_table_data = False

    for line_num, line in enumerate(lines):
        line = line.strip()
        if not line.startswith('|') or not line.endswith('|'):
            if in_table_data:
                break
            continue

        parts = [p.strip() for p in line.strip('|').split('|')]

        # 识别分隔行
        if headers and re.match(r'^[:\- ]+$', parts[0].replace(':', '')) and len(parts) == len(headers):
            missing_headers = [h for h in REQUIRED_HEADERS if h not in header_indices]
            if missing_headers:
                return None
            in_table_data = True
            continue

        # 识别表头行
        if not headers and not in_table_data:
            raw_headers = parts
            headers = [h.lower() for h in raw_headers]
            for i, h in enumerate(headers):
                if h:
                   header_indices[h] = i
            continue

        # 解析数据行
        if in_table_data and len(parts) == len(headers):
            row_data = {}
            is_valid_row = True

            # 检查必需字段
            for req_h in REQUIRED_HEADERS:
                header_index = header_indices.get(req_h)
                if header_index is None or header_index >= len(parts):
                    is_valid_row = False
                    break
                value = parts[header_index]
                if not value:
                    is_valid_row = False
                    break

            if not is_valid_row:
                continue

            # 填充数据
            for md_header_lower, json_key in HEADER_MAP.items():
                header_index = header_indices.get(md_header_lower)
                if header_index is not None and header_index < len(parts):
                    value = parts[header_index]
                    if value:
                        row_data[json_key] = value

            if all(key in row_data for key in REQUIRED_HEADERS):
                posts.append(row_data)

    return posts if in_table_data else None

def validate_and_sort_posts(posts: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """验证日期格式并按日期排序"""
    valid_posts = []
    print("Validating dates and preparing for sorting...")
    
    for post in posts:
        try:
            datetime.datetime.strptime(post['date'], '%Y-%m-%d')
            valid_posts.append(post)
        except (ValueError, KeyError) as e:
            print(f"Warning: Skipping post with invalid date: {post.get('file', 'N/A')} - {e}")

    # 按日期排序 (降序)
    valid_posts.sort(key=lambda p: datetime.datetime.strptime(p['date'], '%Y-%m-%d'), reverse=True)
    print(f"Sorting complete. {len(valid_posts)} posts remain after validation.")
    return valid_posts

def generate_markdown_table(posts: List[Dict[str, str]]) -> str:
    """生成Markdown表格内容"""
    # 表头
    headers = ['Title', 'Date', 'File', 'Excerpt', 'Author', 'Version', 'License']
    separator = [':-' + '-' * (len(h) - 2) + '-' for h in headers]
    
    lines = [
        '# Blog Post Index',
        '',
        '| ' + ' | '.join(headers) + ' |',
        '| ' + ' | '.join(separator) + ' |'
    ]
    
    # 数据行
    for post in posts:
        row = [
            post.get('title', ''),
            post.get('date', ''),
            post.get('file', ''),
            post.get('excerpt', ''),
            post.get('author', ''),
            post.get('version', ''),
            post.get('license', '')
        ]
        lines.append('| ' + ' | '.join(row) + ' |')
    
    # 添加注释
    lines.extend([
        '',
        '<!-- 自动生成的文件，请勿手动编辑 -->',
        '<!-- 运行 python generate_index_v2.py 来更新此文件 -->'
    ])
    
    return '\n'.join(lines)

def run_git_commands(git_enabled: bool = True) -> bool:
    """执行Git命令 - 按照用户要求的重试流程"""
    if not git_enabled:
        return True

    try:
        # 检查是否在Git仓库中
        result = subprocess.run(['git', 'status'],
                              capture_output=True, text=True, cwd=SCRIPT_DIR)
        if result.returncode != 0:
            print("Warning: Not in a Git repository, skipping Git operations.")
            return True

        print("🔄 Starting Git operations...")

        def execute_git_sequence():
            """执行Git三步操作：git add . -> git commit -> git push"""
            # 生成新的时间戳
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # 1. git add .
            print("📁 git add .")
            subprocess.run(['git', 'add', '.'], cwd=SCRIPT_DIR, check=True)
            print("✅ Add completed")
            
            # 2. git commit -m "时间戳"
            print(f"💾 git commit -m \"{timestamp}\"")
            subprocess.run(['git', 'commit', '-m', timestamp], cwd=SCRIPT_DIR, check=True)
            print("✅ Commit completed")
            
            # 3. git push origin main
            print("🚀 git push origin main")
            subprocess.run(['git', 'push', 'origin', 'main'], cwd=SCRIPT_DIR, check=True)
            print("✅ Push completed")
            
            return timestamp

        # 第一次尝试执行Git序列
        try:
            timestamp = execute_git_sequence()
            print(f"🎉 Git operations completed successfully! Commit: {timestamp}")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"⚠️  Git sequence failed: {e}")
            print("🔄 Executing git pull origin main...")
            
            # 如果失败，执行 git pull origin main
            subprocess.run(['git', 'pull', 'origin', 'main'], cwd=SCRIPT_DIR, check=True)
            print("✅ Pull completed")
            
            # 然后重新执行Git三步操作
            print("🔁 Retrying git sequence...")
            timestamp = execute_git_sequence()
            print(f"🎉 Git operations completed after retry! Commit: {timestamp}")
            return True

    except subprocess.CalledProcessError as e:
        print(f"❌ Git operation failed: {e}")
        print("💡 Please manually run the following commands:")
        print("   git add .")
        print(f"   git commit -m \"{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\"")
        print("   git push origin main")
        print("   # If push fails, run: git pull origin main")
        print("   # Then repeat the above 3 commands")
        return False
    except FileNotFoundError:
        print("❌ Git not found, please install Git first.")
        return False

def auto_generate_index(git_enabled: bool = True):
    """全自动生成索引的主函数"""
    print("🚀 Starting automatic blog index generation...")
    print("=" * 50)

    try:
        # 1. 扫描posts目录
        all_md_files = scan_posts_directory()
        if not all_md_files:
            print("No markdown files found in posts directory.")
            return

        # 2. 解析现有的index.md
        existing_posts = parse_existing_index_md()
        existing_files = {post['file'] for post in existing_posts}

        # 3. 找出新文件和需要更新的文件
        new_files = [f for f in all_md_files if f not in existing_files]
        missing_files = [post['file'] for post in existing_posts if post['file'] not in all_md_files]

        print(f"📊 Analysis:")
        print(f"  - Total MD files: {len(all_md_files)}")
        print(f"  - Existing entries: {len(existing_posts)}")
        print(f"  - New files: {len(new_files)} {new_files}")
        print(f"  - Missing files: {len(missing_files)} {missing_files}")

        # 4. 创建完整的文章列表
        all_posts = []

        # 保留现有的文章（排除已删除的文件），并自动添加 category 字段
        for post in existing_posts:
            if post['file'] in all_md_files:
                # 如果现有文章没有 category 字段，根据文件路径自动添加
                if 'category' not in post:
                    filename = post['file']
                    if filename.startswith('biopharma/'):
                        post['category'] = 'biopharma'
                    elif filename.startswith('dba/'):
                        post['category'] = 'dba'
                    elif filename.startswith('csv/'):
                        post['category'] = 'csv'
                    elif filename.startswith('enterprise/'):
                        post['category'] = 'enterprise'
                    elif filename.startswith('notes/'):
                        post['category'] = 'notes'
                all_posts.append(post)

        # 添加新文章
        for filename in new_files:
            new_post = create_post_entry(filename)
            all_posts.append(new_post)

        # 5. 验证和排序
        sorted_posts = validate_and_sort_posts(all_posts)

        # 6. 生成新的index.md
        new_md_content = generate_markdown_table(sorted_posts)
        SOURCE_MD_FILE.write_text(new_md_content, encoding='utf-8')
        print(f"✅ Updated {SOURCE_MD_FILE}")

        # 7. 生成index.json
        OUTPUT_JSON_FILE.write_text(
            json.dumps(sorted_posts, indent=4, ensure_ascii=False),
            encoding='utf-8'
        )
        print(f"✅ Updated {OUTPUT_JSON_FILE}")

        # 8. Git操作
        if new_files or missing_files or True:  # 总是执行Git操作以确保同步
            run_git_commands(git_enabled)

        print("=" * 50)
        print(f"🎉 Blog index generation completed successfully!")
        print(f"📝 Total posts: {len(sorted_posts)}")
        if new_files:
            print(f"🆕 New posts added: {', '.join(new_files)}")
        if missing_files:
            print(f"🗑️ Removed missing files: {', '.join(missing_files)}")

    except Exception as e:
        print(f"❌ Error during automatic generation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Blog Index Generator V2')
    parser.add_argument('--no-git', action='store_true',
                       help='Disable Git auto-commit and push')

    args = parser.parse_args()

    # 确定Git选项
    git_enabled = not args.no_git
    if args.no_git:
        print("Git operations disabled.")

    # 运行自动模式
    auto_generate_index(git_enabled)
