// 站点配置
const siteConfig = {
    // 获取站点基础路径
    getBaseUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return '';
        }
        // 在 GitHub Pages 上使用完整的 origin
        return window.location.origin + '/';
    },

    // 获取完整路径
    getFullPath(path) {
        // 移除开头的斜杠以避免双斜杠
        path = path.replace(/^\//, '');
        return `${this.getBaseUrl()}${path}`;
    },

    // 加载文章内容
    async loadMarkdown(path) {
        try {
            const response = await fetch(this.getFullPath(path));
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
            const response = await fetch(this.getFullPath('metadata.json'));
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
