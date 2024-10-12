document.addEventListener("DOMContentLoaded", function () {
  const articleList = document.getElementById("articleList");
  const searchInput = document.getElementById("searchInput");

  if (searchInput) {
    // 设置输入框默认值为空
    searchInput.value = "";

    // 创建文章列表
    function createArticleList(articles) {
      articleList.innerHTML = ""; // 清空列表
      articles.forEach((article) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `demo_md.html?file=${article.file}`;
        a.textContent = article.title;

        const dateSpan = document.createElement("span");
        dateSpan.textContent = ` (${article.date})`; // 显示文章日期
        dateSpan.classList.add("article-date");

        li.appendChild(a);
        li.appendChild(dateSpan);
        articleList.appendChild(li);
      });
    }

    // 从 JSON5 文件加载文章列表
    fetch("demo.json5")
      .then((response) => response.text()) // 获取 JSON5 文件文本内容
      .then((text) => {
        const data = JSON5.parse(text); // 使用 JSON5 解析器解析 JSON5 数据
        createArticleList(data); // 动态生成文章列表

        // 实现简单的搜索功能
        searchInput.addEventListener("input", function () {
          const query = searchInput.value.toLowerCase();
          const filteredArticles = data.filter((article) =>
            article.title.toLowerCase().includes(query)
          );
          createArticleList(filteredArticles);
        });
      })
      .catch((error) => {
        console.error("加载文章列表失败:", error);
      });
  } else {
    console.error("searchInput 元素不存在");
  }
});
