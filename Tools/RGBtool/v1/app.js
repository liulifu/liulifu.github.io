document.addEventListener('DOMContentLoaded', function () {
    const rInput = document.getElementById('r');
    const gInput = document.getElementById('g');
    const bInput = document.getElementById('b');
    const hexInput = document.getElementById('hexColor');
    const colorDisplay = document.getElementById('colorDisplay');
    const updateButton = document.getElementById('updateColor');
    const applyHexButton = document.getElementById('applyHexColor');

    function updateColorDisplay(color) {
        colorDisplay.style.backgroundColor = color;
    }

    updateButton.addEventListener('click', function () {
        const r = rInput.value || 0;
        const g = gInput.value || 0;
        const b = bInput.value || 0;
        const rgbColor = `rgb(${r}, ${g}, ${b})`;
        updateColorDisplay(rgbColor);
    });

    applyHexButton.addEventListener('click', function () {
        const hexColor = hexInput.value;
        if (isValidHex(hexColor)) {
            updateColorDisplay(hexColor);
        } else {
            alert('请输入有效的16进制颜色代码');
        }
    });

    function isValidHex(hex) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
    }
});
