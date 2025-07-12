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
GIT_COMMIT_MESSAGE_TEMPLATE = "Auto-update blog: {action} {count} post(s)"

# Markdown 表格头(小写)到最终 JSON key 的映射
HEADER_MAP = {
    'title': 'title',         # 必需
    'date': 'date',           # 必需 (YYYY-MM-DD格式)
    'file': 'file',           # 必需 (markdown文件名)
    'excerpt': 'excerpt',     # 可选
    'author': 'author',       # 可选
    'version': 'version',     # 可选
    'license': 'license',     # 可选
}
REQUIRED_HEADERS = ['title', 'date', 'file'] # 必须存在的列
# --- ---

def scan_posts_directory() -> List[str]:
    """扫描posts目录，返回所有.md文件列表（排除特殊文件）"""
    print(f"Scanning posts directory: {POSTS_DIR}")

    if not POSTS_DIR.exists():
        print(f"Error: Posts directory not found: {POSTS_DIR}")
        return []

    md_files = []
    for file_path in POSTS_DIR.glob("*.md"):
        filename = file_path.name
        if filename not in EXCLUDED_FILES:
            md_files.append(filename)

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

    # 创建基本条目
    entry = {
        'title': title,
        'date': date,
        'file': filename,
        'author': DEFAULT_AUTHOR
    }

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
    """解析Markdown表格（保留原有逻辑，简化版）"""
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
        '<!-- 运行 python generate_index.py 来更新此文件 -->'
    ])

    return '\n'.join(lines)

def run_git_commands(action: str, count: int, git_enabled: bool = True) -> bool:
    """执行Git命令"""
    if not git_enabled:
        return True

    try:
        # 检查是否在Git仓库中
        result = subprocess.run(['git', 'status'],
                              capture_output=True, text=True, cwd=SCRIPT_DIR)
        if result.returncode != 0:
            print("Warning: Not in a Git repository, skipping Git operations.")
            return True

        # 先拉取远程更改以避免冲突
        print("🔄 Pulling latest changes from remote...")
        try:
            subprocess.run(['git', 'pull', 'origin', 'main'],
                          cwd=SCRIPT_DIR, check=True, capture_output=True)
            print("✅ Successfully pulled remote changes")
        except subprocess.CalledProcessError as e:
            print(f"⚠️  Pull failed, continuing with local changes: {e}")

        # 添加文件
        subprocess.run(['git', 'add', 'posts/index.md', 'posts/index.json'],
                      cwd=SCRIPT_DIR, check=True)

        # 检查是否有更改需要提交
        result = subprocess.run(['git', 'diff', '--cached', '--quiet'],
                              cwd=SCRIPT_DIR, capture_output=True)
        if result.returncode == 0:
            print("ℹ️  No changes to commit")
            return True

        # 提交
        commit_message = GIT_COMMIT_MESSAGE_TEMPLATE.format(action=action, count=count)
        subprocess.run(['git', 'commit', '-m', commit_message],
                      cwd=SCRIPT_DIR, check=True)

        # 推送，如果失败则尝试强制推送（谨慎使用）
        try:
            subprocess.run(['git', 'push', 'origin', 'main'], cwd=SCRIPT_DIR, check=True)
            print(f"✅ Git operations completed: {commit_message}")
        except subprocess.CalledProcessError:
            print("⚠️  Normal push failed, trying to pull and merge...")
            try:
                # 再次尝试拉取和合并
                subprocess.run(['git', 'pull', 'origin', 'main', '--no-edit'],
                              cwd=SCRIPT_DIR, check=True)
                subprocess.run(['git', 'push', 'origin', 'main'], cwd=SCRIPT_DIR, check=True)
                print(f"✅ Git operations completed after merge: {commit_message}")
            except subprocess.CalledProcessError as e:
                print(f"❌ Git push still failed: {e}")
                print("💡 Please manually run: git pull origin main && git push origin main")
                return False

        return True

    except subprocess.CalledProcessError as e:
        print(f"Warning: Git operation failed: {e}")
        print("💡 Please manually run: git pull origin main && git push origin main")
        return False
    except FileNotFoundError:
        print("Warning: Git not found, skipping Git operations.")
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

        # 保留现有的文章（排除已删除的文件）
        for post in existing_posts:
            if post['file'] in all_md_files:
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
        if new_files or missing_files:
            action = "added" if new_files else "updated"
            count = len(new_files) + len(missing_files)
            run_git_commands(action, count, git_enabled)

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

def generate_index():
    """原有的生成函数（保持向后兼容）"""
    print("⚠️  Using legacy mode. Consider using the new auto-generation feature.")
    auto_generate_index()

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Blog Index Generator')
    parser.add_argument('--legacy', action='store_true',
                       help='Use legacy mode (manual index.md editing)')
    parser.add_argument('--no-git', action='store_true',
                       help='Disable Git auto-commit and push')

    args = parser.parse_args()

    # 确定Git选项
    git_enabled = not args.no_git
    if args.no_git:
        print("Git operations disabled.")

    # 运行相应的函数
    if args.legacy:
        # 原有的手动模式
        try:
            print(f"Reading Markdown index from: {SOURCE_MD_FILE}")
            md_content = SOURCE_MD_FILE.read_text(encoding='utf-8')
            parsed_posts = parse_markdown_table(md_content)

            if parsed_posts is None:
                print("Error during table parsing.")
                sys.exit(1)

            sorted_posts = validate_and_sort_posts(parsed_posts)

            OUTPUT_JSON_FILE.write_text(
                json.dumps(sorted_posts, indent=4, ensure_ascii=False),
                encoding='utf-8'
            )

            print(f"Successfully generated {OUTPUT_JSON_FILE} with {len(sorted_posts)} entries.")

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
    else:
        # 新的自动模式
        auto_generate_index(git_enabled)