window.addEventListener("message", function (event) {
  if (event.data.action === "change-style") {
    changeStyle(event.data.styleName);
  }
});


// if (typeof(Storage) !== "undefined") {
//   // localStorage is available
//   // 继续操作 localStorage
//   localStorage.setItem("key", "value");
// } else {
//   // 提示用户 localStorage 不可用，或使用其他存储方案
//   console.warn("localStorage is not available.");
// }


// Initialize the selected style from localStorage or default to 'modern'
// const savedStyle = localStorage.getItem("preferredStyle") || "Old_book";
// document.getElementById("style-select").value = savedStyle;
// changeStyle(savedStyle);

function changeStyle(styleName) {
  const styles = {
    modern: document.getElementById("modern-style"),
    cyberpunk: document.getElementById("cyberpunk-style"),
    minimalist: document.getElementById("minimalist-style"),
    retro: document.getElementById("retro-style"),
    neon: document.getElementById("neon-style"),
    old_book: document.getElementById("old_book_style_resume"),
  };

  // 关闭所有样式
  Object.keys(styles).forEach((key) => {
    if (styles[key]) {
      styles[key].disabled = true;
    }
  });

  // 启用所选样式
  if (styles[styleName]) {
    styles[styleName].disabled = false;
  }
}
