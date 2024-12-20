const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

// 配置项
const CONFIG = {
    postsDir: './posts',
    indexFile: './posts/index.json',
    dateFormat: /^\d{4}-\d{2}-\d{2}/  // 匹配文件名中的日期格式
};

async function scanPosts() {
    try {
        // 尝试读取现有的 index.json
        let existingPosts = [];
        try {
            const existingContent = await fs.readFile(CONFIG.indexFile, 'utf8');
            existingPosts = JSON.parse(existingContent);
        } catch (error) {
            console.log('No existing index.json found or it\'s invalid, creating new one');
        }

        // 创建文件名到现有文章的映射
        const existingPostsMap = new Map(
            existingPosts.map(post => [post.file, post])
        );

        // 读取 posts 目录
        const files = await fs.readdir(CONFIG.postsDir);
        
        // 过滤出 markdown 文件
        const markdownFiles = files.filter(file => 
            file.endsWith('.md') && file !== 'about.md'
        );

        // 处理每个文件
        const posts = await Promise.all(markdownFiles.map(async file => {
            // 检查是否存在现有的文章配置
            const existingPost = existingPostsMap.get(file) || {};
            
            const filePath = path.join(CONFIG.postsDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            
            // 使用 gray-matter 解析文件头部的 YAML 元数据
            const { data, excerpt } = matter(content, { excerpt: true });
            
            // 从文件名获取日期
            const dateMatch = file.match(CONFIG.dateFormat);
            const date = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];
            
            // 从文件名获取标题（如果元数据中没有提供）
            const titleFromFile = file
                .replace(CONFIG.dateFormat, '')
                .replace(/\.md$/, '')
                .replace(/-/g, ' ')
                .trim();

            // 创建基础文章对象
            const post = {
                title: data.title || existingPost.title || titleFromFile,
                date: data.date || existingPost.date || date,
                file: file,
                excerpt: data.excerpt || existingPost.excerpt || excerpt || ''
            };

            // 只有当这些字段在 YAML 前端或现有配置中存在时才添加它们
            if (data.author || existingPost.author) {
                post.author = data.author || existingPost.author;
            }
            if (data.version || existingPost.version) {
                post.version = data.version || existingPost.version;
            }
            if (data.license || existingPost.license) {
                post.license = data.license || existingPost.license;
            }

            return post;
        }));

        // 按日期排序
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 写入 index.json，使用 4 个空格缩进以匹配现有格式
        await fs.writeFile(
            CONFIG.indexFile,
            JSON.stringify(posts, null, 4)
        );

        console.log(`Successfully updated index.json with ${posts.length} posts`);
        
    } catch (error) {
        console.error('Error scanning posts:', error);
        process.exit(1);
    }
}

// 执行扫描
scanPosts();