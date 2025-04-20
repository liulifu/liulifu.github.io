import json
import re
from pathlib import Path
import datetime
import sys

# --- 配置 ---
# 获取脚本所在的目录
SCRIPT_DIR = Path(__file__).parent.resolve()
# 输入和输出文件相对于脚本目录的路径
SOURCE_MD_FILE = SCRIPT_DIR / 'posts' / 'index.md'
OUTPUT_JSON_FILE = SCRIPT_DIR / 'posts' / 'index.json'

# Markdown 表格头(小写)到最终 JSON key 的映射
# 确保这里的 key (值) 与你的 index.js 读取的字段名一致
HEADER_MAP = {
    'title': 'title',         # 必需
    'date': 'date',           # 必需 (YYYY-MM-DD格式)
    'file': 'file',           # 必需 (markdown文件名)
    'excerpt': 'excerpt',     # 可选
    'author': 'author',       # 可选
    'version': 'version',     # 可选
    'license': 'license',     # 可选
    # 你可以根据需要添加更多映射
}
REQUIRED_HEADERS = ['title', 'date', 'file'] # 必须存在的列
# --- ---

def parse_markdown_table(md_content):
    """
    从 Markdown 文本中解析第一个符合格式的表格。
    要求：
    - 标准 Markdown 表格语法 (| 分隔列, 第二行为分隔行 |:---|)
    - 表头必须包含 REQUIRED_HEADERS 中定义的列名 (大小写不敏感)。
    """
    posts = []
    lines = md_content.strip().splitlines() # 使用 splitlines 保留换行符差异
    headers = []
    header_indices = {} # 存储表头名(小写)到列索引的映射
    in_table_data = False # 标记是否在读取表格数据行

    print("Starting table parsing...")

    for line_num, line in enumerate(lines):
        line = line.strip()
        if not line.startswith('|') or not line.endswith('|'):
            # 如果已经开始解析数据行，遇到非表格行则停止
            if in_table_data:
                print(f"Stopped parsing table data at line {line_num + 1}.")
                break
            continue # 跳过非表格格式的行

        parts = [p.strip() for p in line.strip('|').split('|')]

        # 尝试识别分隔行 (必须在表头行之后)
        if headers and re.match(r'^[:\- ]+$', parts[0].replace(':', '')) and len(parts) == len(headers):
            # 检查是否所有必需的表头都已找到
            missing_headers = [h for h in REQUIRED_HEADERS if h not in header_indices]
            if missing_headers:
                print(f"Error: Table is missing required header(s): {', '.join(missing_headers)}. Headers found: {list(header_indices.keys())}")
                return None # 表头不完整，返回 None
            in_table_data = True
            print(f"Table separator found at line {line_num + 1}. Headers mapped: {header_indices}")
            continue

        # 尝试识别表头行 (必须是找到的第一行表格格式)
        if not headers and not in_table_data:
            raw_headers = parts
            headers = [h.lower() for h in raw_headers]
            # 建立表头名到索引的映射
            for i, h in enumerate(headers):
                if h: # 忽略空的表头单元格
                   header_indices[h] = i
            print(f"Potential header row found at line {line_num + 1}: {raw_headers}")
            continue # 继续寻找分隔行

        # 解析数据行 (必须在分隔行之后)
        if in_table_data and len(parts) == len(headers):
            row_data = {}
            is_valid_row = True

            # 提取必需字段的值
            required_values = {}
            for req_h in REQUIRED_HEADERS:
                header_index = header_indices.get(req_h)
                if header_index is None or header_index >= len(parts):
                    print(f"Warning: Skipping row at line {line_num + 1}. Cannot find index for required header '{req_h}'. Row data: {parts}")
                    is_valid_row = False
                    break
                value = parts[header_index]
                if not value:
                    print(f"Warning: Skipping row at line {line_num + 1}. Required field '{req_h}' is empty. Row data: {parts}")
                    is_valid_row = False
                    break
                required_values[req_h] = value

            if not is_valid_row:
                continue

            # 填充 JSON 对象，使用 HEADER_MAP
            for md_header_lower, json_key in HEADER_MAP.items():
                header_index = header_indices.get(md_header_lower)
                # 检查表头是否存在且索引有效
                if header_index is not None and header_index < len(parts):
                    value = parts[header_index]
                    if value: # 只有当单元格非空时才添加该字段
                        row_data[json_key] = value

            # 再次确认核心字段被正确填充 (理论上应该已经通过前面的检查)
            if all(key in row_data for key in REQUIRED_HEADERS):
                posts.append(row_data)
            else:
                 print(f"Warning: Skipping row at line {line_num + 1} due to processing issue. Data extracted: {row_data}. Original parts: {parts}")


    if not in_table_data:
         print("Error: Could not find a valid Markdown table structure (header + separator + data).")
         return None
    if not posts:
         print("Warning: Table found, but no valid data rows could be parsed.")

    print(f"Parsing finished. Found {len(posts)} valid post entries.")
    return posts

def validate_and_sort_posts(posts):
    """验证日期格式并按日期排序"""
    valid_posts = []
    print("Validating dates and preparing for sorting...")
    for post in posts:
        try:
            # 尝试解析日期，确保是 YYYY-MM-DD 格式
            datetime.datetime.strptime(post['date'], '%Y-%m-%d')
            valid_posts.append(post)
        except ValueError:
            print(f"Warning: Skipping post with invalid date format (expected YYYY-MM-DD): {post.get('file', 'N/A')} - Date: {post.get('date', 'N/A')}")
        except KeyError:
             print(f"Warning: Skipping post missing 'date' field: {post.get('file', 'N/A')}")


    # 按日期排序 (降序)
    valid_posts.sort(key=lambda p: datetime.datetime.strptime(p['date'], '%Y-%m-%d'), reverse=True)
    print(f"Sorting complete. {len(valid_posts)} posts remain after validation.")
    return valid_posts


def generate_index():
    """主函数：读取 MD，解析，排序，写入 JSON"""
    try:
        print(f"Attempting to read Markdown index from: {SOURCE_MD_FILE}")
        md_content = SOURCE_MD_FILE.read_text(encoding='utf-8')
        print("Markdown file read successfully.")

        parsed_posts = parse_markdown_table(md_content)

        if parsed_posts is None:
            print("Error during table parsing. Aborting JSON generation.")
            sys.exit(1) # 退出脚本，表示失败

        sorted_posts = validate_and_sort_posts(parsed_posts)

        print(f"Attempting to write {len(sorted_posts)} posts to JSON: {OUTPUT_JSON_FILE}")
        with open(OUTPUT_JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(sorted_posts, f, indent=4, ensure_ascii=False)

        print("-" * 30)
        print(f"Successfully generated {OUTPUT_JSON_FILE} with {len(sorted_posts)} entries.")
        print("-" * 30)

    except FileNotFoundError:
        print(f"Error: Source Markdown file not found at: {SOURCE_MD_FILE}")
        print("Please ensure 'posts/index.md' exists in the correct location.")
        sys.exit(1)
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")
        import traceback
        traceback.print_exc() # 打印详细的错误堆栈
        sys.exit(1)

if __name__ == "__main__":
    generate_index()