document.addEventListener('DOMContentLoaded', function() {
    const styleSelect = document.getElementById('style-select');
    const cyberpunkStyle = document.getElementById('cyberpunk-style');
    const modernStyle = document.getElementById('modern-style');

    // Function to change the style
    function changeStyle(styleName) {
        if (styleName === 'cyberpunk') {
            cyberpunkStyle.disabled = false;
            modernStyle.disabled = true;
        } else if (styleName === 'modern') {
            cyberpunkStyle.disabled = true;
            modernStyle.disabled = false;
        }
        localStorage.setItem('preferredStyle', styleName);
    }

    // Set initial style based on localStorage or default to 'modern'
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