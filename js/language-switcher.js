// Language Switcher
class LanguageSwitcher {
    constructor() {
        this.currentLang = localStorage.getItem('blog-language') || 'zh';
        this.init();
    }

    init() {
        this.createLanguageSwitcher();
        this.updateLinks();
    }

    createLanguageSwitcher() {
        const switcher = document.createElement('div');
        switcher.className = 'language-switcher';
        switcher.innerHTML = `
            <select class="lang-select" aria-label="Select Language">
                <option value="zh" ${this.currentLang === 'zh' ? 'selected' : ''}>中文</option>
                <option value="en" ${this.currentLang === 'en' ? 'selected' : ''}>English</option>
            </select>
        `;

        // Add to navigation
        const nav = document.querySelector('.nav-links');
        if (nav) {
            nav.appendChild(switcher);
        }

        // Add event listener
        const select = switcher.querySelector('.lang-select');
        select.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });
    }

    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('blog-language', lang);
        this.updateLinks();
        
        // Update HTML lang attribute
        document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
        
        // Refresh content if needed
        if (window.loadPosts) {
            window.loadPosts();
        }
    }

    updateLinks() {
        // Update About link
        const aboutLink = document.querySelector('a[href*="2024-12-05-about"]');
        if (aboutLink) {
            const suffix = this.currentLang === 'en' ? '-en.md' : '.md';
            aboutLink.href = `post.html?post=2024-12-05-about${suffix}`;
        }
    }
}

// Initialize language switcher
document.addEventListener('DOMContentLoaded', () => {
    window.languageSwitcher = new LanguageSwitcher();
});
