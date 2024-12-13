// Theme Manager Class
class ThemeManager {
    constructor() {
        this.themes = {
            default: {
                name: 'Default',
                icon: '🌟',
                colors: {
                    primary: '#4a90e2',
                    secondary: '#2c3e50',
                    background: '#ffffff',
                    text: '#333333',
                    link: '#4a90e2',
                    accent: '#e74c3c',
                    surface: '#f8f9fa',
                    border: '#dee2e6'
                }
            },
            modern: {
                name: 'Modern',
                icon: '💎',
                colors: {
                    primary: '#6c5ce7',
                    secondary: '#a8a8a8',
                    background: '#fafafa',
                    text: '#2d3436',
                    link: '#6c5ce7',
                    accent: '#00b894',
                    surface: '#ffffff',
                    border: '#edf2f7'
                }
            },
            tech: {
                name: 'Tech',
                icon: '💻',
                colors: {
                    primary: '#00ff00',
                    secondary: '#333333',
                    background: '#1a1a1a',
                    text: '#00ff00',
                    link: '#00ff00',
                    accent: '#ff00ff',
                    surface: '#2d2d2d',
                    border: '#404040'
                }
            },
            nature: {
                name: 'Nature',
                icon: '🌿',
                colors: {
                    primary: '#2ecc71',
                    secondary: '#27ae60',
                    background: '#f5f5f5',
                    text: '#2c3e50',
                    link: '#27ae60',
                    accent: '#f1c40f',
                    surface: '#ffffff',
                    border: '#a8e6cf'
                }
            },
            sunset: {
                name: 'Sunset',
                icon: '🌅',
                colors: {
                    primary: '#e67e22',
                    secondary: '#d35400',
                    background: '#fff5eb',
                    text: '#34495e',
                    link: '#e67e22',
                    accent: '#8e44ad',
                    surface: '#ffffff',
                    border: '#ffdab9'
                }
            },
            minimal: {
                name: 'Minimal',
                icon: '◽',
                colors: {
                    primary: '#000000',
                    secondary: '#666666',
                    background: '#ffffff',
                    text: '#333333',
                    link: '#000000',
                    accent: '#999999',
                    surface: '#fafafa',
                    border: '#eeeeee'
                }
            },
            ocean: {
                name: 'Ocean',
                icon: '🌊',
                colors: {
                    primary: '#3498db',
                    secondary: '#2980b9',
                    background: '#ecf0f1',
                    text: '#2c3e50',
                    link: '#3498db',
                    accent: '#1abc9c',
                    surface: '#ffffff',
                    border: '#bde6ff'
                }
            },
            vintage: {
                name: 'Vintage',
                icon: '📜',
                colors: {
                    primary: '#8b4513',
                    secondary: '#a0522d',
                    background: '#f4e4bc',
                    text: '#5d4037',
                    link: '#8b4513',
                    accent: '#cd853f',
                    surface: '#fff8dc',
                    border: '#deb887'
                }
            }
        };

        this.currentTheme = localStorage.getItem('blog-theme') || 'default';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.createThemeSwitcher();
        this.setupEventListeners();
    }

    applyTheme(themeName) {
        if (!this.themes[themeName]) return;

        const theme = this.themes[themeName];
        const root = document.documentElement;

        // Apply theme colors to CSS variables
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--${key}-color`, value);
        });

        // Update body classes
        document.body.className = `theme-${themeName}`;
        
        // Store theme preference
        localStorage.setItem('blog-theme', themeName);
        this.currentTheme = themeName;

        // Update theme switcher if it exists
        this.updateThemeSwitcherUI();
    }

    createThemeSwitcher() {
        const switcher = document.createElement('div');
        switcher.className = 'theme-switcher';
        switcher.innerHTML = this.getThemeSwitcherHTML();

        // Add to navigation
        const nav = document.querySelector('.nav-links');
        if (nav) nav.appendChild(switcher);
    }

    getThemeSwitcherHTML() {
        const currentTheme = this.themes[this.currentTheme];
        return `
            <div class="theme-switcher-toggle">
                <span>${currentTheme.icon} ${currentTheme.name}</span>
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M7 10l5 5 5-5z"/>
                </svg>
            </div>
            <div class="theme-switcher-dropdown">
                ${Object.entries(this.themes).map(([key, theme]) => `
                    <div class="theme-option" data-theme="${key}">
                        <span>${theme.icon} ${theme.name}</span>
                        <div class="theme-preview"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const switcher = document.querySelector('.theme-switcher');
            if (!switcher) return;

            const isClickInside = switcher.contains(e.target);
            const toggle = switcher.querySelector('.theme-switcher-toggle');
            const isToggleClick = toggle && toggle.contains(e.target);

            if (isToggleClick) {
                switcher.classList.toggle('active');
            } else if (!isClickInside) {
                switcher.classList.remove('active');
            }
        });

        document.addEventListener('click', (e) => {
            const option = e.target.closest('.theme-option');
            if (option) {
                const theme = option.dataset.theme;
                this.applyTheme(theme);
                document.querySelector('.theme-switcher').classList.remove('active');
            }
        });

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelector('.theme-switcher')?.classList.remove('active');
            }
        });
    }

    updateThemeSwitcherUI() {
        const toggle = document.querySelector('.theme-switcher-toggle span');
        if (toggle) {
            const theme = this.themes[this.currentTheme];
            toggle.innerHTML = `${theme.icon} ${theme.name}`;
        }
    }
}

// Initialize theme manager
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});
