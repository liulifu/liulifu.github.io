# AI 文章发布指南

本指南用于说明如何使用 AI 助手来发布和管理博客文章。

## 任务流程

1. **检查文章文件**
   - 扫描 `posts` 目录下的所有 `.md` 文件
   - 这些文件是博客内容的主要来源
   - 文件命名格式应为：`YYYY-MM-DD-title.md`

2. **更新元数据**
   - 根据 `posts` 目录中的 Markdown 文件更新 `metadata.json`
   - 为每个新的 Markdown 文件生成对应的元数据
   - 移除 `metadata.json` 中不存在对应 Markdown 文件的条目

3. **分析文章内容**
   - 读取每篇文章的内容
   - 提取标题、日期、分类等信息
   - 生成文章描述和标签

4. **更新元数据文件**
   - 将分析结果写入 `metadata.json`
   - 保持 `metadata.json` 与 `posts` 目录的同步

5. **提交更改**
   - 使用 Git 提交所有更改
   - 推送到 GitHub 以触发部署

## 注意事项

1. Markdown 文件是主要内容，`metadata.json` 应该适配它们
2. 保持文件命名的一致性
3. 确保所有路径使用正确的格式
4. 定期检查并清理过期的元数据

## 分类判断规则

根据文章内容特征判断分类：
- 包含代码块 (```) → 技术文档
- 包含步骤说明、教程字样 → 教程
- 其他技术相关内容 → 技术笔记
- 个人简历相关 → 简历

## 标签生成规则

从以下内容中提取标签：
- 文章中的技术名词
- 二级标题关键词
- 编程语言名称
- 框架或工具名称
- 核心概念词

## 错误处理

如果遇到以下情况，AI应该提醒用户：
- 文件名格式不符合 YYYY-MM-DD-标题.md
- 文章缺少一级标题
- 文章内容为空
- Git 操作失败

## 示例

输入：新文章 `2024-12-06-docker-guide.md`
```markdown
# Docker 入门指南

本文介绍 Docker 的基础概念和使用方法。

## 安装 Docker
...

## 基本命令
...
```

期望输出：更新 metadata.json
```json
{
    "2024-12-06-docker-guide.md": {
        "title": "Docker 入门指南",
        "date": "2024-12-06",
        "categories": ["教程"],
        "description": "本文介绍 Docker 的基础概念和使用方法。",
        "tags": ["Docker", "容器化", "教程", "入门"]
    }
}
```

注意：AI 应保持 metadata.json 中现有的其他文章记录不变，只添加新文章的信息。

## 文件结构

```
Resume/
├── index.html          # 主页显示所有文章
├── tags.html          # 标签页面用于浏览文章
├── styles.css         # 全局样式
├── metadata.json      # 文章和工具元数据
├── posts/            # 目录包含所有博客文章
│   └── *.md          # Markdown 文件用于博客文章
└── js/               # JavaScript 文件
```

## 发布新文章

### 1. 创建 Markdown 文件

在 `posts` 目录中创建一个新的 Markdown 文件。文件名应遵循以下格式：
`YYYY-MM-DD-title.md`

示例：`2024-01-01-introduction-to-ai.md`

### 2. 更新 metadata.json

在 `metadata.json` 中添加一个新的条目：

```json
{
  "posts": {
    "2024-01-01-introduction-to-ai.md": {
      "title": "Introduction to AI",
      "date": "January 1, 2024",
      "type": "article",
      "description": "A brief introduction to artificial intelligence",
      "categories": ["Tech Docs"],
      "tags": ["AI", "Machine Learning", "Introduction"]
    }
  }
}
```

必填字段：
- `title`：文章标题
- `date`：发布日期，格式为 "Month DD, YYYY"
- `type`：使用 "article" 表示博客文章
- `description`：文章简短描述
- `categories`：文章分类数组（当前支持："Tech Docs"、"DevOps"、"Resume"、"Others"）
- `tags`：相关标签数组

### 3. 添加工具

要添加工具而不是文章，请使用以下格式在 `metadata.json` 中：

```json
{
  "posts": {
    "my-ai-tool": {
      "title": "AI Tool Name",
      "date": "January 1, 2024",
      "type": "tool",
      "url": "https://tool-url.com",
      "description": "Description of the tool",
      "categories": ["Tools"],
      "tags": ["AI", "Tool"]
    }
  }
}
```

工具的额外字段：
- `type`：使用 "tool" 表示工具
- `url`：工具的访问 URL

## 内容指南

1. 写清晰、简洁的标题，准确反映内容
2. 包含相关标签以帮助用户找到内容
3. 提供有意义的描述，总结关键点
4. 使用适当的分类组织内容
5. 对于工具，确保 URL 可访问且功能正常

## 导航结构

- **主页**：显示所有文章和工具的时间顺序
- **标签页面**：
  - 左侧边栏显示所有可用标签
  - 主内容显示根据所选标签过滤的文章
  - 点击标签查看所有相关文章
- **关于**：关于博客和作者的信息

## 样式和格式

- 文章以卡片形式显示，包括标题、日期、描述和标签
- 标签可点击，链接到过滤视图
- 工具在新标签页中打开
- 文章支持完整的 Markdown 格式
- 支持代码块和语法高亮

## 最佳实践

1. **分类**：选择预定义的分类：
   - 技术文档：技术文档和教程
   - DevOps：DevOps 相关内容
   - 简历：简历和职业相关内容
   - 其他：通用内容
   - 工具：所有工具和实用程序

2. **标签**：
   - 尽可能使用现有标签
   - 只在必要时创建新标签
   - 保持标签简洁和相关
   - 使用正确的大小写

3. **描述**：
   - 保持描述在 160 个字符以内
   - 关注主要价值主张
   - 使用清晰、专业的语言

4. **内容**：
   - 使用正确的 Markdown 格式
   - 包含相关的代码示例
   - 添加图片以增强价值
   - 保持内容集中和结构良好

## 测试

发布前：
1. 验证 Markdown 文件渲染正确
2. 检查 metadata.json 是否为有效 JSON
3. 确保所有链接正常工作
4. 测试标签过滤功能
5. 验证移动设备响应性

## 支持

如有问题或疑问，请参阅存储库问题部分或联系维护者。
