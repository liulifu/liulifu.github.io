# Personal Blog

A static personal blog built with HTML, CSS, and JavaScript, designed to be hosted on GitHub Pages.

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
