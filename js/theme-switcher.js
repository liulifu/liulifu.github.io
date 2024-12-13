// Theme definitions
const themes = {
    default: {
        name: 'Default',
        class: 'theme-default'
    },
    modern: {
        name: 'Modern',
        class: 'theme-modern'
    },
    minimal: {
        name: 'Minimal',
        class: 'theme-minimal'
    },
    dark: {
        name: 'Dark',
        class: 'theme-dark'
    },
    newspaper: {
        name: 'Newspaper',
        class: 'theme-newspaper'
    }
};

// Theme switcher functionality
const ThemeSwitcher = {
    currentTheme: 'default',

    init() {
        // Load saved theme
        const savedTheme = localStorage.getItem('blog-theme') || 'default';
        this.setTheme(savedTheme);
        
        // Create theme switcher UI
        this.createThemeSwitcher();
    },

    setTheme(themeName) {
        if (!themes[themeName]) return;
        
        // Remove all theme classes
        document.body.classList.remove(...Object.values(themes).map(t => t.class));
        
        // Add new theme class
        document.body.classList.add(themes[themeName].class);
        
        // Save theme preference
        localStorage.setItem('blog-theme', themeName);
        this.currentTheme = themeName;
    },

    createThemeSwitcher() {
        const switcher = document.createElement('div');
        switcher.className = 'theme-switcher';
        switcher.innerHTML = `
            <div class="theme-switcher-toggle">
                <span>Theme</span>
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M7 10l5 5 5-5z"/>
                </svg>
            </div>
            <div class="theme-switcher-dropdown">
                ${Object.entries(themes).map(([key, theme]) => `
                    <div class="theme-option" data-theme="${key}">
                        <span>${theme.name}</span>
                        <div class="theme-preview ${theme.class}"></div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add event listeners
        const toggle = switcher.querySelector('.theme-switcher-toggle');
        toggle.addEventListener('click', () => {
            switcher.classList.toggle('active');
        });

        // Theme option clicks
        const options = switcher.querySelectorAll('.theme-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.setTheme(theme);
                switcher.classList.remove('active');
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!switcher.contains(e.target)) {
                switcher.classList.remove('active');
            }
        });

        // Add to navigation
        const nav = document.querySelector('.nav-links');
        nav.appendChild(switcher);
    }
};
