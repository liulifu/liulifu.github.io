// Initialize showdown converter
const converter = new showdown.Converter();
converter.setOption('tables', true);
converter.setOption('strikethrough', true);
converter.setOption('tasklists', true);

// Logging utility
const log = {
    info: (msg) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
    error: (msg) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`)
};

class BlogManager {
    constructor() {
        // Initialize properties
        this.postsListElement = document.getElementById('posts-list');
        this.postContentElement = document.getElementById('post-content');
        this.currentPage = 'home';
        this.posts = [];
        this.currentPageNum = 1;
        this.postsPerPage = 20;
        
        // 检测设备类型
        this.isMobile = this.checkIfMobile();
        
        // 根据设备类型调整设置
        if (this.isMobile) {
            this.postsPerPage = 10; // 移动设备显示更少的文章
            log.info('Mobile device detected');
        } else {
            log.info('Desktop device detected');
        }
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Load initial content
        this.loadHomePage();
        
        log.info('Blog Manager initialized');
    }

    checkIfMobile() {
        // 方法1: 使用 matchMedia 检查是否是移动设备
        const mobileMediaQuery = window.matchMedia('(max-width: 768px), (hover: none)');
        
        // 方法2: 检查是否支持触摸
        const hasTouchScreen = (
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0)
        );
        
        // 方法3: 检查 User Agent（作为补充）
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod'];
        const isMobileUserAgent = mobileKeywords.some(keyword => userAgent.includes(keyword));
        
        // 综合判断
        const isMobile = mobileMediaQuery.matches || hasTouchScreen || isMobileUserAgent;
        
        // 切换样式表
        this.switchStylesheet(isMobile);
        
        // 添加窗口大小变化监听
        mobileMediaQuery.addListener((e) => {
            this.isMobile = e.matches;
            this.switchStylesheet(this.isMobile);
            log.info(`Device type changed: ${this.isMobile ? 'Mobile' : 'Desktop'}`);
        });
        
        return isMobile;
    }

    switchStylesheet(isMobile) {
        // 动态加载对应的样式表
        const head = document.head;
        let desktopCss = head.querySelector('link[href="index.css"]');
        let mobileCss = head.querySelector('link[href="mobile.css"]');

        // 如果样式表不存在，创建它们
        if (!desktopCss) {
            desktopCss = document.createElement('link');
            desktopCss.rel = 'stylesheet';
            desktopCss.href = 'index.css';
            head.appendChild(desktopCss);
        }

        if (!mobileCss) {
            mobileCss = document.createElement('link');
            mobileCss.rel = 'stylesheet';
            mobileCss.href = 'mobile.css';
            head.appendChild(mobileCss);
        }

        // 切换样式表
        if (isMobile) {
            desktopCss.disabled = true;
            mobileCss.disabled = false;
            log.info('Switched to mobile stylesheet');
        } else {
            desktopCss.disabled = false;
            mobileCss.disabled = true;
            log.info('Switched to desktop stylesheet');
        }
    }
    
    initializeEventListeners() {
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Add back button functionality
        window.addEventListener('popstate', () => {
            const page = window.location.hash.slice(1) || 'home';
            this.navigateToPage(page, false);
        });
    }
    
    async navigateToPage(page, pushState = true) {
        log.info(`Navigating to page: ${page}`);
        this.currentPage = page;
        
        // Update active nav link
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        if (pushState) {
            window.history.pushState(null, '', `#${page}`);
        }
        
        if (page === 'home') {
            await this.loadHomePage();
        } else if (page === 'about') {
            await this.loadAboutPage();
        }
    }
    
    async loadHomePage() {
        try {
            const response = await fetch('posts/index.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.posts = await response.json();
            
            this.postsListElement.style.display = 'block';
            this.postContentElement.style.display = 'none';
            
            // Sort posts by date
            this.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Display current page
            this.displayCurrentPage();
            
            log.info('Home page loaded successfully');
        } catch (error) {
            log.error(`Error loading posts: ${error.message}`);
            this.postsListElement.innerHTML = '<p>Error loading posts. Please try again later.</p>';
        }
    }
    
    displayCurrentPage() {
        // Calculate pagination
        const totalPages = Math.ceil(this.posts.length / this.postsPerPage);
        const startIndex = (this.currentPageNum - 1) * this.postsPerPage;
        const endIndex = Math.min(startIndex + this.postsPerPage, this.posts.length);
        const currentPosts = this.posts.slice(startIndex, endIndex);
        
        // Create posts list
        const postsList = document.createElement('ul');
        currentPosts.forEach(post => {
            const li = document.createElement('li');
            li.innerHTML = `<a class="post-link" data-post="${post.file}">${post.title}</a>`;
            postsList.appendChild(li);
        });
        
        // Create pagination controls
        const pagination = document.createElement('div');
        pagination.className = 'pagination';
        pagination.innerHTML = `
            <button ${this.currentPageNum === 1 ? 'disabled' : ''} onclick="window.blog.prevPage()">Previous</button>
            <span class="page-info">Page ${this.currentPageNum} of ${totalPages}</span>
            <button ${this.currentPageNum === totalPages ? 'disabled' : ''} onclick="window.blog.nextPage()">Next</button>
        `;
        
        // Update DOM
        this.postsListElement.innerHTML = '';
        this.postsListElement.appendChild(postsList);
        this.postsListElement.appendChild(pagination);
        
        // Add click handlers to post titles
        document.querySelectorAll('.post-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadPost(e.target.dataset.post);
            });
        });
        
        log.info(`Displayed page ${this.currentPageNum} of ${totalPages}`);
    }
    
    prevPage() {
        if (this.currentPageNum > 1) {
            this.currentPageNum--;
            this.displayCurrentPage();
            log.info(`Navigated to previous page: ${this.currentPageNum}`);
        }
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.posts.length / this.postsPerPage);
        if (this.currentPageNum < totalPages) {
            this.currentPageNum++;
            this.displayCurrentPage();
            log.info(`Navigated to next page: ${this.currentPageNum}`);
        }
    }
    
    async loadPost(postFile) {
        try {
            // First, get the post metadata from index.json
            const indexResponse = await fetch('posts/index.json');
            if (!indexResponse.ok) throw new Error(`HTTP error! status: ${indexResponse.status}`);
            const posts = await indexResponse.json();
            const postMeta = posts.find(p => p.file === postFile);
            
            // Fetch the post content
            const response = await fetch(`posts/${postFile}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const content = await response.text();
            
            // Show post content and hide posts list
            this.postsListElement.style.display = 'none';
            this.postContentElement.style.display = 'block';
            
            // Convert content based on file type
            let htmlContent;
            if (postFile.toLowerCase().endsWith('.html')) {
                // For HTML files, extract the body content and fix CSS paths
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                
                // Remove the original style tag
                const styleTag = tempDiv.querySelector('style');
                if (styleTag) {
                    styleTag.remove();
                }
                
                // Get only the body content
                const bodyContent = tempDiv.querySelector('body').innerHTML;
                htmlContent = bodyContent;
                log.info(`Loaded HTML post: ${postFile}`);
            } else {
                // For MD files, convert using showdown
                htmlContent = converter.makeHtml(content);
                log.info(`Converted MD post: ${postFile}`);
            }
            
            // Update the post content with the table header
            const title = postMeta ? postMeta.title : postFile.replace(/^\d{4}-\d{2}-\d{2}-(.+)\.(md|html)$/, '$1');
            const date = postMeta ? postMeta.date : postFile.slice(0, 10);
            
            this.postContentElement.innerHTML = `
                <table class="header">
                    <tbody>
                        <tr>
                            <td colspan="2" rowspan="2" class="width-auto">
                                <h1 class="title">${title}</h1>
                                <span class="subtitle">${postMeta ? postMeta.excerpt : ''}</span>
                            </td>
                            <th>Version</th>
                            <td class="width-min">v0.1.1</td>
                        </tr>
                        <tr>
                            <th>Updated</th>
                            <td class="width-min">
                                <time style="white-space: pre;">${new Date(date).toISOString().split('T')[0]}</time>
                            </td>
                        </tr>
                        <tr>
                            <th class="width-min">Author</th>
                            <td class="width-auto">Lifu</td>
                            <th class="width-min">License</th>
                            <td>MIT</td>
                        </tr>
                    </tbody>
                </table>
                <div class="article-content">
                    ${htmlContent}
                </div>
                <div class="back-link-container" style="margin-top: 2rem;">
                    <a href="#" onclick="window.blog.navigateToPage('home'); return false;">← Back to Posts</a>
                </div>
            `;
            
            // Process any media in the post
            this.processMedia();
            
            // Update URL
            window.history.pushState(null, '', `#post/${postFile}`);
            
            log.info(`Post loaded successfully: ${postFile}`);
        } catch (error) {
            log.error(`Error loading post: ${error.message}`);
            this.postContentElement.innerHTML = '<p>Error loading post. Please try again later.</p>';
        }
    }
    
    processMedia() {
        // Make images responsive
        this.postContentElement.querySelectorAll('img').forEach(img => {
            img.classList.add('responsive');
            img.addEventListener('error', () => {
                log.error(`Failed to load image: ${img.src}`);
            });
        });
        
        // Make videos responsive
        this.postContentElement.querySelectorAll('video').forEach(video => {
            video.classList.add('responsive');
            video.controls = true;
            video.addEventListener('error', () => {
                log.error(`Failed to load video: ${video.src}`);
            });
        });
    }
    
    async loadAboutPage() {
        try {
            const response = await fetch('posts/about.md');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const markdown = await response.text();
            
            this.postsListElement.style.display = 'none';
            this.postContentElement.style.display = 'block';
            
            // Create about page with header table
            const headerTable = `
                <table class="header">
                    <tbody>
                        <tr>
                            <td colspan="2" rowspan="2" class="width-auto">
                                <h1 class="title">ABOUT</h1>
                                <span class="subtitle">A minimalist design exploration</span>
                            </td>
                            <th>Version</th>
                            <td class="width-min">v0.1.1</td>
                        </tr>
                        <tr>
                            <th>Updated</th>
                            <td class="width-min">
                                <time style="white-space: pre;">${new Date().toISOString().split('T')[0]}</time>
                            </td>
                        </tr>
                        <tr>
                            <th class="width-min">Author</th>
                            <td class="width-auto">Lifu</td>
                            <th class="width-min">License</th>
                            <td>MIT</td>
                        </tr>
                    </tbody>
                </table>
                <div class="article-content">
                    ${converter.makeHtml(markdown)}
                </div>
            `;
            
            this.postContentElement.innerHTML = headerTable;
            
            log.info('About page loaded successfully');
        } catch (error) {
            log.error(`Error loading about page: ${error.message}`);
            this.postContentElement.innerHTML = '<p>Error loading about page. Please try again later.</p>';
        }
    }
}

// Initialize blog when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.blog = new BlogManager();
});
