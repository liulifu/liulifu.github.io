// 站点配置
const siteConfig = {
    // 基础路径，如果部署在子目录则需要修改
    baseUrl: '',

    // 获取完整路径
    getFullPath(path) {
        // 移除开头的斜杠以避免双斜杠
        path = path.replace(/^\//, '');
        return `${this.baseUrl}${path}`;
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
