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
        // 读取 posts 目录
        const files = await fs.readdir(CONFIG.postsDir);
        
        // 过滤出 markdown 文件
        const markdownFiles = files.filter(file => 
            file.endsWith('.md') && file !== 'about.md'
        );

        // 处理每个文件
        const posts = await Promise.all(markdownFiles.map(async file => {
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

            return {
                title: data.title || titleFromFile,
                date: data.date || date,
                file: file,
                excerpt: data.excerpt || excerpt || '',
                author: data.author || 'Lifu',
                version: data.version || 'v0.1.1',
                license: data.license || 'MIT'
            };
        }));

        // 按日期排序
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 写入 index.json
        await fs.writeFile(
            CONFIG.indexFile,
            JSON.stringify({ posts }, null, 2)
        );

        console.log(`Successfully updated index.json with ${posts.length} posts`);
        
    } catch (error) {
        console.error('Error scanning posts:', error);
        process.exit(1);
    }
}

// 执行扫描
scanPosts();