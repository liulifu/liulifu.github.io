# Lifu's Tech Blog - Jekyll 版本

基于 Jekyll 的技术博客，托管在 GitHub Pages。

## 🚀 特性

- ✅ **完全自动化** - 写完文章推送即可，GitHub Pages 自动构建
- ✅ **零维护** - 无需手动维护 JSON 索引文件
- ✅ **分类管理** - 支持多个分类（DBA、DevOps、Biopharma、Enterprise、Notes、CSV）
- ✅ **响应式设计** - 适配 PC 和移动端
- ✅ **SEO 优化** - 自动生成 sitemap 和 RSS feed
- ✅ **分页支持** - 每页显示 20 篇文章

## 📝 如何添加新文章

### 1. 创建文章文件

在 `_posts/` 目录下创建新的 Markdown 文件，文件名格式：

```
YYYY-MM-DD-title.md
```

例如：
```
2024-03-15-mysql-ha-solution.md
```

### 2. 添加 Front Matter

在文件开头添加 YAML Front Matter：

```yaml
---
layout: post
title: "MySQL 高可用解决方案"
date: 2024-03-15
categories: dba
author: Lifu
---
```

### 3. 编写内容

使用 Markdown 格式编写文章内容。

### 4. 推送到 GitHub

```bash
git add _posts/2024-03-15-mysql-ha-solution.md
git commit -m "Add new post: MySQL HA Solution"
git push origin main
```

GitHub Pages 会自动构建并部署！

## 🔧 本地开发

### 安装依赖

需要先安装 Ruby 和 Bundler：

```bash
# 安装依赖
bundle install
```

### 本地预览

```bash
# 启动本地服务器
bundle exec jekyll serve

# 访问 http://localhost:4000
```

## 📊 分类说明

- **DBA** - 数据库管理与运维
- **DevOps** - Kubernetes 与容器化技术
- **Biopharma** - 生物制药信息化
- **Enterprise** - 企业 IT 基础架构管理
- **Notes** - 技术笔记与项目复现
- **CSV** - 计算机系统验证

## 🌐 访问博客

https://liulifu.github.io/

---

© 2024 Lifu. All rights reserved.

