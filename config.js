// 站点配置
const siteConfig = {
    // 获取站点基础路径
    getBasePath: function() {
        // 从当前页面 URL 中提取基础路径
        const path = window.location.pathname;
        // 如果是根路径，返回 '/'
        if (path === '/' || path.endsWith('/index.html')) {
            return '/';
        }
        // 如果是 GitHub Pages 项目站点，返回项目名称作为基础路径
        const match = path.match(/\/([^\/]+)\.github\.io\//);
        if (match) {
            return `/${match[1]}.github.io/`;
        }
        // 默认返回当前路径的目录部分
        return path.substring(0, path.lastIndexOf('/') + 1);
    },

    // 构建完整 URL
    getUrl: function(path) {
        const basePath = this.getBasePath();
        // 如果路径已经以基础路径开头，直接返回
        if (path.startsWith(basePath)) {
            return path;
        }
        // 否则拼接基础路径和给定路径
        return basePath + path.replace(/^\//, '');
    },

    // 加载文章内容
    async loadMarkdown(path) {
        try {
            const response = await fetch(this.getUrl(path));
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
            const response = await fetch(this.getUrl('metadata.json'));
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
