class ThemeManager {
    constructor() {
        this.themes = {
            cyberpunk: {
                name: 'Cyberpunk Neon',
                class: 'theme-cyberpunk',
                icon: '🌟'
            },
            steampunk: {
                name: 'Steampunk Bronze',
                class: 'theme-steampunk',
                icon: '⚙️'
            },
            hologram: {
                name: 'Hologram Future',
                class: 'theme-hologram',
                icon: '🌌'
            },
            quantum: {
                name: 'Quantum Dark',
                class: 'theme-quantum',
                icon: '⚛️'
            },
            industrial: {
                name: 'Neo Industrial',
                class: 'theme-industrial',
                icon: '🏭'
            }
        };
        
        this.currentTheme = localStorage.getItem('website-theme') || 'cyberpunk';
        this.init();
    }

    init() {
        // Create theme selector
        this.createThemeSelector();
        
        // Apply saved theme
        this.applyTheme(this.currentTheme);
        
        // Add event listeners
        document.addEventListener('DOMContentLoaded', () => {
            this.applyTheme(this.currentTheme);
        });
    }

    createThemeSelector() {
        const nav = document.querySelector('.nav-links');
        if (!nav) return;

        const themeContainer = document.createElement('div');
        themeContainer.className = 'theme-selector';
        
        const select = document.createElement('select');
        select.className = 'theme-select';
        
        Object.entries(this.themes).forEach(([key, theme]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${theme.icon} ${theme.name}`;
            option.selected = key === this.currentTheme;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });
        
        themeContainer.appendChild(select);
        nav.appendChild(themeContainer);
    }

    applyTheme(themeName) {
        if (!this.themes[themeName]) return;
        
        // Remove all theme classes
        document.body.classList.remove(...Object.values(this.themes).map(t => t.class));
        
        // Add new theme class
        document.body.classList.add(this.themes[themeName].class);
        
        // Save theme preference
        localStorage.setItem('website-theme', themeName);
        this.currentTheme = themeName;
        
        // Dispatch theme change event
        const event = new CustomEvent('themechange', { detail: { theme: themeName } });
        document.dispatchEvent(event);
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();
