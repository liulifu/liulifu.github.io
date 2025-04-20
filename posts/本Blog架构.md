

## 使用 Obsidian 和 Python 管理静态博客索引

**目标：** 通过在 Obsidian 中维护一个 Markdown 文件 (`posts/index.md`) 来管理博客文章列表，并使用一个本地 Python 脚本自动将其转换为前端 JavaScript (`index.js`) 所需的 `posts/index.json` 文件。这样可以利用 Obsidian 的编辑和 Git 功能简化博客维护流程。

**核心流程：**

1.  在 Obsidian 中编辑文章 (`.md`) 和索引 (`posts/index.md`)。
2.  在本地运行 Python 脚本 (`generate_index.py`) 将 `posts/index.md` 转换为 `posts/index.json`。
3.  使用 Git (通过 Obsidian 插件或命令行) 提交并推送所有更改到 GitHub。

---

### 1. 先决条件

*   **Python 3:** 确保你的本地计算机安装了 Python 3。可以在终端运行 `python --version` 或 `python3 --version` 来检查。
*   **Obsidian:** 你正在使用的笔记软件。
*   **Git:** 版本控制系统，用于将更改推送到 GitHub。
*   **(可选) Obsidian Git 插件:** 方便在 Obsidian 内部进行 Git 操作。

---

### 2. 项目设置

1.  **目录结构:** 确保你的博客项目根目录大致如下：

    ```
    your-blog-root/
    ├── .git/              # Git 仓库目录 (可能隐藏)
    ├── posts/             # 存放博客文章和索引文件的目录
    │   ├── index.md       # 【新增】用 Markdown 表格维护的文章索引源文件
    │   ├── index.json     # 【自动生成】给前端使用的 JSON 索引文件
    │   ├── 2023-10-28-your-post.md
    │   └── ... (其他 .md 文章)
    ├── generate_index.py  # 【新增】Python 转换脚本
    ├── index.html         # 博客主页
    ├── index.js           # 前端 JavaScript
    ├── index.css          # 主要样式表
    ├── showdown.min.js    # Markdown 渲染库
    └── ... (其他资源文件如 reset.css, 图片等)
    ```

2.  **创建 Python 脚本 (`generate_index.py`)**

    在你的项目根目录 (`your-blog-root/`) 下创建一个名为 `generate_index.py` 的文件，并将以下 Python 代码复制进去：

    ```python
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

    ```

3.  **创建 Markdown 索引文件 (`posts/index.md`)**

    在 `posts/` 目录下创建一个名为 `index.md` 的文件。你需要按照以下**严格的 Markdown 表格格式**来维护你的文章列表：

    ```markdown
    # Blog Post Index

    | Title                      | Date       | File                             | Excerpt                                      | Author  | Version | License        |
    | :------------------------- | :--------- | :------------------------------- | :------------------------------------------- | :------ | :------ | :------------- |
    | 我的第一篇博客             | 2023-10-27 | 2023-10-27-my-first-post.md    | 这是我博客的第一篇文章，介绍博客的搭建过程。 | liulifu | v1.0    | CC BY-SA 4.0   |
    | 关于 Showdown.js 的使用    | 2023-10-26 | 2023-10-26-using-showdown.md   | 如何在静态页面中用 Showdown 渲染 Markdown。  |         |         | MIT            |
    | 新特性发布                 | 2023-10-28 | 2023-10-28-new-feature.md      | 博客添加了分页功能。                         | Lifu    | v0.1.1  |                |
    | 另一篇很棒的文章           | 2023-10-29 | 2023-10-29-another-great-post.md | 这只是一个占位符示例。                       |         |         |                |

    <!-- 可选的注释：确保表格格式正确！ -->
    <!-- 1. 第一行必须是表头，包含 Title, Date, File (大小写不敏感)。 -->
    <!-- 2. 第二行必须是分隔行 |:---|:---|... -->
    <!-- 3. 日期格式必须是 YYYY-MM-DD。 -->
    <!-- 4. File 必须是 posts/ 目录下对应的 Markdown 文件名。 -->
    <!-- 5. 可选字段 (Author, Version, License, Excerpt) 如果单元格留空，则不会出现在 JSON 中，前端将使用默认值。 -->
    ```

    **关键要求：**
    *   **表头行:** 必须存在，且包含至少 "Title", "Date", "File" 这几列（脚本不区分大小写）。列的顺序不重要，但名字需要匹配。
    *   **分隔行:** 表头行下面必须紧跟格式为 `| :--- | :--- | ... |` 的分隔行。冒号和短横线的数量不重要，但必须有 `|` 和 `-`。
    *   **数据行:** 每一行代表一篇文章。单元格内容用 `|` 分隔。
    *   **必需字段:** `Title`, `Date`, `File` 对应的单元格**不能为空**。
    *   **日期格式:** `Date` 列必须是 `YYYY-MM-DD` 格式，否则该行会被脚本忽略。
    *   **文件名:** `File` 列必须是 `posts/` 目录下实际的 Markdown 文件名。
    *   **可选字段:** `Excerpt`, `Author`, `Version`, `License` 等是可选的。如果对应的单元格为空，该字段将不会被包含在生成的 JSON 对象中，你的 `index.js` 应该能处理这种情况（使用默认值）。

---

### 3. 日常工作流

现在，当你想要添加或更新博客文章时，遵循以下步骤：

1.  **编写/编辑文章:**
    *   在 Obsidian 中，打开或创建你的 `.md` 文章文件，将其保存在 `posts/` 目录下。

2.  **更新 Markdown 索引 (`posts/index.md`):**
    *   在 Obsidian 中打开 `posts/index.md` 文件。
    *   **在表格中添加一个新行**，填入新文章的 `Title`, `Date` (YYYY-MM-DD), `File` (文件名)，以及其他可选信息 (`Excerpt`, `Author` 等)。
    *   或者，如果你是修改现有文章的元数据（比如标题），直接编辑对应的行。
    *   **仔细检查格式！** 确保日期格式正确，文件名无误，表格结构没有破坏。
    *   保存 `posts/index.md` 文件。

3.  **运行 Python 脚本生成 JSON:**
    *   **打开你的本地终端（命令行工具）。**
    *   **切换到你的博客项目根目录** (`your-blog-root/`)。
    *   **运行命令:** `python generate_index.py` (或者 `python3 generate_index.py`，取决于你的系统配置)。
    *   脚本会读取 `posts/index.md`，解析表格，然后覆盖写入 `posts/index.json`。
    *   **观察终端输出:** 脚本会打印读取、解析和写入的过程信息。注意是否有任何 "Warning" 或 "Error" 信息。如果看到错误，根据提示检查 `posts/index.md` 的格式或脚本配置。

4.  **提交和推送更改:**
    *   使用 Git 提交所有被修改的文件。这通常包括：
        *   你新创建或编辑的文章 `.md` 文件。
        *   你手动修改过的 `posts/index.md` 文件。
        *   **由脚本自动更新的 `posts/index.json` 文件。**
    *   **可以通过 Obsidian Git 插件操作：** Staged（暂存）所有更改 -> Commit（提交）-> Push（推送）。
    *   **或者在终端操作：**
        ```bash
        git add .  # 暂存所有更改 (或者指定具体文件 git add posts/index.md posts/index.json your-new-post.md ...)
        git commit -m "Add new blog post: [你的文章标题]" # 提交更改，写清楚提交信息
        git push origin main # 推送到 GitHub (你的分支名可能是 main 或 master)
        ```

5.  **检查线上博客:** 等待 GitHub Pages 更新（通常几秒到一分钟），然后访问你的 `liulifu.github.io` 博客，确认新文章列表和内容是否按预期显示。

---

### 4. (可选) 自定义和故障排除

*   **修改表头:** 如果你想在 `index.md` 中使用不同的表头名称（比如用 "文章标题" 代替 "Title"），你需要同时修改 `index.md` 中的表头**和** `generate_index.py` 脚本顶部的 `HEADER_MAP` 字典，保持两者对应。
*   **脚本未运行/报错:**
    *   确认 Python 3 已安装并能在终端中运行。
    *   确认你在项目**根目录**下运行脚本 (`python generate_index.py`)。
    *   确认 `posts/index.md` 文件存在且路径正确 (脚本会自动查找 `posts/` 子目录下的 `index.md`)。
    *   仔细阅读终端的错误信息，它通常会指出问题所在（比如文件找不到、表格格式错误、日期格式错误等）。
    *   检查 `posts/index.md` 的表格格式是否严格遵守了要求。
*   **JSON 文件未更新或内容为空:**
    *   检查脚本运行的输出，看是否有警告信息（比如找不到有效表格、所有行都因格式错误被跳过）。
    *   确认 `posts/index.md` 文件被正确保存了。
    *   检查脚本是否有写入 `posts/index.json` 的权限（通常在本地开发这不是问题）。
*   **文章列表在线上未更新:**
    *   确认你已经运行了 `python generate_index.py`。
    *   确认你已经 `git add`, `git commit`, **并且 `git push` 了 `posts/index.json` 文件**的最新版本。
    *   给 GitHub Pages 一点时间来部署更新。

---

这个方案结合了 Obsidian 的易用性和 Python 的自动化能力，应该能很好地满足你的需求。祝你博客写作愉快！