# Liu Lifu's Blog

这是我的个人博客，使用纯静态 HTML + JavaScript 实现，通过 showdown.js 解析 Markdown 文件。

## 目录结构

```
Resume/
├── index.html          # 主页
├── post.html          # 文章页面模板
├── categories.html    # 分类页面
├── styles.css         # 样式文件
├── posts.json         # 文章元数据
├── _posts/           # 存放所有 Markdown 文章
└── README.md         # 项目说明
```

## 如何添加新文章

1. 在 `_posts` 目录下创建新的 Markdown 文件
2. 在 `posts.json` 中添加文章的元数据信息
3. 提交并推送到 GitHub

## 技术栈

- HTML5
- CSS3
- JavaScript (ES6+)
- showdown.js (Markdown 解析)
