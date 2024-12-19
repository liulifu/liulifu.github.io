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
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Load initial content
        this.loadHomePage();
        
        log.info('Blog Manager initialized');
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
            
            // Find the current post's metadata
            const postMeta = posts.find(p => p.file === postFile);
            if (!postMeta) throw new Error(`Post metadata not found for: ${postFile}`);
            
            // Get the post content
            const response = await fetch(`posts/${postFile}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const markdown = await response.text();
            
            this.postsListElement.style.display = 'none';
            this.postContentElement.style.display = 'block';
            
            // Extract title and format it properly
            const title = postFile
                .replace(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/, '$1')
                .replace(/-/g, ' ')
                .toUpperCase();
            
            // Create article header table
            const headerTable = `
                <table class="header">
                    <tbody>
                        <tr>
                            <td colspan="2" rowspan="2" class="width-auto">
                                <h1 class="title">${title}</h1>
                                <span class="subtitle">${postMeta.excerpt}</span>
                            </td>
                            <th>Version</th>
                            <td class="width-min">v0.1.1</td>
                        </tr>
                        <tr>
                            <th>Updated</th>
                            <td class="width-min">
                                <time style="white-space: pre;">${new Date(postFile.slice(0, 10)).toISOString().split('T')[0]}</time>
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
            
            // Process images and videos
            this.processMedia();
            
            // Update URL
            window.history.pushState(null, '', `#post/${postFile}`);
            
            log.info(`Post loaded successfully: ${postFile}`);
        } catch (error) {
            log.error(`Error loading post ${postFile}: ${error.message}`);
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
