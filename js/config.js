// Configuration settings for the website
const config = {
    // Theme settings
    themes: {
        default: 'quantum',
        available: [
            {
                id: 'quantum',
                name: 'Quantum Dark',
                cssFile: '/css/themes/theme-quantum.css'
            },
            {
                id: 'cyberpunk',
                name: 'Cyberpunk Neon',
                cssFile: '/css/themes/theme-cyberpunk.css'
            },
            {
                id: 'steampunk',
                name: 'Steampunk Bronze',
                cssFile: '/css/themes/theme-steampunk.css'
            },
            {
                id: 'hologram',
                name: 'Hologram Future',
                cssFile: '/css/themes/theme-hologram.css'
            },
            {
                id: 'neoindustrial',
                name: 'Neo Industrial',
                cssFile: '/css/themes/theme-neoindustrial.css'
            }
        ]
    },

    // Site metadata
    site: {
        title: 'Personal Blog',
        description: 'A collection of thoughts and experiences',
        author: 'Your Name'
    },

    // Markdown settings
    markdown: {
        converter: {
            tables: true,
            simplifiedAutoLink: true,
            strikethrough: true,
            tasklists: true,
            ghCodeBlocks: true,
            emoji: true
        }
    },

    // Logging settings
    logging: {
        enabled: true,
        level: 'info' // 'debug', 'info', 'warn', 'error'
    }
};

// Theme management
const themeManager = {
    // Get current theme
    getCurrentTheme() {
        return localStorage.getItem('selectedTheme') || config.themes.default;
    },

    // Set theme
    setTheme(themeId) {
        const theme = config.themes.available.find(t => t.id === themeId);
        if (!theme) {
            console.error(`Theme ${themeId} not found`);
            return;
        }

        // Remove all theme stylesheets
        const existingThemeLinks = document.querySelectorAll('link[data-theme]');
        existingThemeLinks.forEach(link => link.remove());

        // Add new theme stylesheet
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = theme.cssFile;
        link.setAttribute('data-theme', theme.id);
        document.head.appendChild(link);

        // Store selection
        localStorage.setItem('selectedTheme', themeId);
        
        // Add theme class to body
        document.body.className = '';
        document.body.classList.add(`theme-${themeId}`);

        if (config.logging.enabled) {
            console.info(`Theme changed to: ${theme.name}`);
        }
    },

    // Initialize theme
    init() {
        const savedTheme = this.getCurrentTheme();
        this.setTheme(savedTheme);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
    
    if (config.logging.enabled) {
        console.info('Config and theme manager initialized');
    }
});
