
document.addEventListener('DOMContentLoaded', function() {
    const styleSelect = document.getElementById('style-select');
    const themeStyle = document.getElementById('theme-style');

    styleSelect.addEventListener('change', function() {
        themeStyle.href = `styles/${this.value}.css`;
    });

    document.getElementById('back-link').addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/';
    });
});