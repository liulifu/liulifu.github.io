---
title: Personal Blog Github Actions Config
date: 2024-12-20
excerpt: A document
author: Lifu
version: v0.1.1
license: MIT
---

### Set Script 

#### 这个脚本的主要功能是:   

1. 扫描 posts 目录下的所有 markdown 文件
2. 解析每个文件的元数据(标题、日期等)
3. 自动生成或更新 index.json, 将脚本保存为 `scan-posts.js`



#### 这个脚本的特点：   

1. 自动扫描：自动读取所有 .md 文件
2. 智能提取：
   - 优先使用文件中的 YAML 元数据
   - 如果没有元数据，则从文件名提取信息
   - 自动处理日期和标题
3. 灵活配置：可以轻松修改配置项来适应不同需求
4. 保持原有功能：生成的 index.json 格式与原来完全兼容

我来帮您创建一个 GitHub Actions 工作流，它会在每次推送到仓库时自动扫描文章并更新 index.json。

### Set workflows   


要设置这个自动化工作流，您需要：

1. 在项目根目录创建以下目录结构：    

```
.github/
  workflows/
    update-posts.yml  # 将上面的 workflow 配置保存在这里
```

2. 确保 `scan-posts.js` 文件在项目根目录

工作流的工作方式：

1. 触发条件：
   - 当有推送到 main/master 分支
   - 且变更包含 markdown 文件时

2. 自动化步骤：
   - 检出代码
   - 设置 Node.js 环境
   - 安装必要的依赖
   - 运行扫描脚本
   - 如果 index.json 有变化，自动提交并推送

3. 安全特性：
   - 使用 GitHub Actions 内置的认证
   - 提交使用 bot 账户
   - 包含 `[skip ci]` 防止循环触发

4. 优化：
   - 使用 npm 缓存加速构建
   - 只在必要时触发（通过 paths 过滤）
   - 只在 index.json 改变时提交

要启用这个工作流：

1. 将这个配置文件放在正确的位置
2. 确保仓库的 Actions 功能已启用
3. 给 Actions 必要的权限：
   - 到仓库的 Settings > Actions > General
   - 在 "Workflow permissions" 部分
   - 选择 "Read and write permissions"

之后，每次您推送新的 markdown 文件时，GitHub Actions 就会自动运行并更新 index.json。您可以在仓库的 Actions 标签页查看运行状态和日志。
