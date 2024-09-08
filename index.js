document.addEventListener('DOMContentLoaded', function() {
    const styleSelect = document.getElementById('style-select');
    const themeStyle = document.getElementById('theme-style');

    // Function to change the style
    function changeStyle(styleName) {
        themeStyle.href = `styles/${styleName}.css`;
        localStorage.setItem('preferredStyle', styleName);
    }

    // Set initial style based on localStorage or default to 'cyberpunk'
    const savedStyle = localStorage.getItem('preferredStyle') || 'modern';
    styleSelect.value = savedStyle;
    changeStyle(savedStyle);

    // Listen for changes in the select element
    styleSelect.addEventListener('change', function() {
        changeStyle(this.value);
    });

    // Back link functionality
    document.getElementById('back-link').addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/';
    });
});