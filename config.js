// 站点配置
const siteConfig = {
    // 获取站点基础路径
    getBasePath: function() {
        // 因为部署在根目录，直接返回 '/'
        return '/';
    },

    // 构建完整 URL
    getUrl: function(path) {
        // 移除开头的斜杠以避免双斜杠
        return '/' + path.replace(/^\//, '');
    },

    // 加载文章内容
    async loadMarkdown(path) {
        try {
            // 确保路径以斜杠开头
            const fullPath = path.startsWith('/') ? path : '/' + path;
            const response = await fetch(fullPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Error loading markdown:', error);
            throw error;
        }
    },

    // 加载元数据
    async loadMetadata() {
        try {
            const response = await fetch('/metadata.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading metadata:', error);
            throw error;
        }
    }
};
