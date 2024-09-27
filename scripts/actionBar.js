// 动态调整 iframe 高度的函数
function resizeIframe() {
  var iframe = document.getElementById("contentFrame");
  iframe.onload = function () {
    adjustIframeHeight(); // 初次加载时调整高度
    startDynamicHeightCheck(); // 开启动态高度检查

    // 检查当前 iframe 页面
    checkIframeContent(iframe.src);
  };
}

// 调整 iframe 高度的函数
function adjustIframeHeight() {
  var iframe = document.getElementById("contentFrame");
  var iframeHeight = iframe.contentWindow.document.body.scrollHeight;
  iframe.style.height = iframeHeight + "px"; // 设置 iframe 高度
}

// 定时器：每秒检查一次 iframe 高度
function startDynamicHeightCheck() {
  setInterval(() => {
    adjustIframeHeight(); // 每秒动态调整 iframe 高度
  }, 1000); // 每秒检查一次
}

// 检查 iframe 内容的函数
function checkIframeContent(page) {
  if (page.includes("articles.html")) {
    document.getElementById("actionBar").style.display = "block"; // 显示动作条
  } else {
    document.getElementById("actionBar").style.display = "none"; // 隐藏动作条
  }
}

// 监听导航点击事件，切换 iframe 内容
document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", function (event) {
    event.preventDefault(); // 阻止默认链接跳转行为
    const page = this.getAttribute("data-page"); // 获取 data-page 属性的值
    document.getElementById("contentFrame").src = page; // 动态更换 iframe 的 src
    checkIframeContent(page); // 检查新页面是否为 articles.html
  });
});

// 页面加载时初始化调整 iframe 高度
window.onload = resizeIframe;

// 平滑滚动到顶部
document.getElementById("scrollTopBtn").addEventListener("click", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
