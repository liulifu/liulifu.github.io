// Function to change the style
function changeStyle(styleName) {
  const styles = {
    modern: document.getElementById("modern-style"),
    cyberpunk: document.getElementById("cyberpunk-style"),
    minimalist: document.getElementById("minimalist-style"),
    retro: document.getElementById("retro-style"),
    neon: document.getElementById("neon-style"),
    old_book: document.getElementById("old_book_style_resume"), // Add the old_book style
  };

  // Disable all styles
  Object.keys(styles).forEach((key) => {
    if (styles[key]) {
      styles[key].disabled = true;
    }
  });

  // Enable the selected style
  if (styles[styleName]) {
    styles[styleName].disabled = false;
  }

  // Save the selected style in localStorage
  localStorage.setItem("preferredStyle", styleName);
}

// Initialize the selected style from localStorage or default to 'modern'
const savedStyle = localStorage.getItem("preferredStyle") || "modern";
document.getElementById("style-select").value = savedStyle;
changeStyle(savedStyle);

// Listen for changes in the style select dropdown
document.getElementById("style-select").addEventListener("change", function () {
  changeStyle(this.value);
});

// // 回到顶部的功能
// document.getElementById('back-to-top').addEventListener('click', function(event) {
//     event.preventDefault(); // 防止默认跳转行为
//     window.scrollTo({
//       top: 0,
//       behavior: 'smooth'  // 平滑滚动到顶部
//     });
//   });

//   document.addEventListener('DOMContentLoaded', function() {
//     document.getElementById('back-to-top').addEventListener('click', function(event) {
//       event.preventDefault(); // 防止默认跳转行为
//       window.scrollTo({
//         top: 0,
//         behavior: 'smooth'  // 平滑滚动到顶部
//       });
//     });
//   });