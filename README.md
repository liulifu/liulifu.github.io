# Personal Blog

A static personal blog built with HTML, CSS, and JavaScript, designed to be hosted on GitHub Pages.

## 最近更新与成果（2025-11）

- CSV Tab 已启用
  - 新增静态资源：assets/csv/ 下 8 个 HTML（已完成全量脱敏）
  - 新增索引文章：posts/csv/2025-11-11-CSV-资料索引.md（方案 A：集中索引页）
  - 导航与路由：index.html 新增 CSV Tab；index.js 增加 csv 分类识别与 hash 路由（支持直接访问 #csv）
  - 外部依赖保留：Tailwind CDN、Font Awesome CDN
- Biopharma 专栏
  - 上线《实验室信息学架构》系列（01–06）位于 posts/biopharma/
- Notes 专栏
  - 五个项目复现与重构文档：fengbi、brandnew-0926、clock、pc_monitor、paddleocrproject（位于 posts/notes/）
  - 汇总与自动化：三项目汇总、博客自动化工作流程等
- 站点脚本
  - 完善 generate_index.py / generate_index_v2.py / publish.py，用于索引生成与快速发布

## 本地预览

在 liulifu.github.io 目录下启动一个本地静态服务器：

```bash
python -m http.server 8000
```

然后访问：
- http://localhost:8000/
- 直接进入 CSV Tab：http://localhost:8000/#csv

若遇到浏览器缓存导致页面未更新，请强制刷新或清空缓存。

## CSV 资料挂载与维护（方案 A）

- 新增文件：将新的 HTML 放入 assets/csv/
- 更新索引：编辑 posts/csv/2025-11-11-CSV-资料索引.md，按行添加链接，例如：
  - `[9.Some_File.html](../../assets/csv/9.Some_File.html)`
- 注意：CSV 页面依赖外部 CDN，若需离线/内网环境，可改为自托管（后续可选项）。

## 脱敏策略

- 邮箱统一替换为 `[REDACTED]@[REDACTED].com`
  - 正则：`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b`
- 公司关键词（大小写不敏感）：beigene、beigenecorp、beonemed → `[REDACTED]`
- 提交前可全仓扫描，确保无敏感信息泄漏。

## 目录补充

- assets/csv/           静态 CSV HTML 页面
- posts/csv/            CSV 索引页与文章
- posts/biopharma/      实验室信息学架构系列（01–06）

## 生成索引与发布

- 自动生成/更新索引：
  - `python generate_index.py`
  - 或 `python generate_index_v2.py`（包含更多自动化与 Git 流程）
- 快速发布：`python publish.py`（支持 `--no-git` 与 `--dry-run`）
- 手动 Git 流程：
  ```bash
  git add -A
  git commit -m "feat(csv): add CSV assets and index page; enable CSV tab; redact sensitive info"
  git pull --rebase
  git push origin main
  ```


## Features

- Clean, minimalist design inspired by the Monospace theme
- Markdown support for blog posts using showdown.js
- Responsive design that works on all devices
- Dark mode support
- Image and video support in blog posts
- Simple navigation between posts and pages

## Directory Structure

```
blog-root/
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


当你想要添加或更新博客文章时，遵循以下步骤：

1. **编写/编辑文章:**

    - 在 Obsidian 中，打开或创建你的 .md 文章文件，将其保存在 posts/ 目录下。

2. **更新 Markdown 索引 (posts/index.md):**

    - 在 Obsidian 中打开 posts/index.md 文件。

    - **在表格中添加一个新行**，填入新文章的 Title, Date (YYYY-MM-DD), File (文件名)，以及其他可选信息 (Excerpt, Author 等)。

    - 或者，如果你是修改现有文章的元数据（比如标题），直接编辑对应的行。

    - **仔细检查格式！** 确保日期格式正确，文件名无误，表格结构没有破坏。

    - 保存 posts/index.md 文件。

3. **运行 Python 脚本生成 JSON:**

    - **打开你的本地终端（命令行工具）。**

    - **切换到你的博客项目根目录** (your-blog-root/)。

    - **运行命令:** python generate_index.py (或者 python3 generate_index.py，取决于你的系统配置)。

    - 脚本会读取 posts/index.md，解析表格，然后覆盖写入 posts/index.json。

    - **观察终端输出:** 脚本会打印读取、解析和写入的过程信息。注意是否有任何 "Warning" 或 "Error" 信息。如果看到错误，根据提示检查 posts/index.md 的格式或脚本配置。

4. **提交和推送更改:**

    - 使用 Git 提交所有被修改的文件。这通常包括：

        - 你新创建或编辑的文章 .md 文件。

        - 你手动修改过的 posts/index.md 文件。

        - **由脚本自动更新的 posts/index.json 文件。**

    - **可以通过 Obsidian Git 插件操作：** Staged（暂存）所有更改 -> Commit（提交）-> Push（推送）。

    - **或者在终端操作：**

```
        git add .
        git commit -m "Add new blog post: [你的文章标题]" # 提交更改，写清楚提交信息
        git push origin main # 推送到 GitHub (你的分支名可能是 main 或 master)
```
## License

MIT License
