document.addEventListener("DOMContentLoaded", function () {
  const articleList = document.getElementById("articleList");
  const searchInput = document.getElementById("searchInput");

  // 分页相关变量
  const articlesPerPage = 10; // 每页显示的文章数量
  let currentPage = 1; // 当前页码
  let articles = []; // 文章数据列表

  if (searchInput) {
    searchInput.value = "";

    function createArticleList(articlesToShow) {
      articleList.innerHTML = ""; // 清空列表
      articlesToShow.forEach((article) => {
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

    // 分页控制函数
    function paginate(articles, page) {
      const startIndex = (page - 1) * articlesPerPage;
      const endIndex = startIndex + articlesPerPage;
      const articlesToShow = articles.slice(startIndex, endIndex);
      createArticleList(articlesToShow);
      updatePagination();
    }

    // 更新分页按钮
    function updatePagination() {
      const pagination = document.getElementById("pagination");
      pagination.innerHTML = "";

      const totalPages = Math.ceil(articles.length / articlesPerPage);

      for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement("button");
        pageButton.textContent = i;
        if (i === currentPage) {
          pageButton.disabled = true;
        }
        pageButton.addEventListener("click", () => {
          currentPage = i;
          paginate(articles, currentPage);
        });
        pagination.appendChild(pageButton);
      }
    }

    // 从 JSON5 文件加载文章列表
    fetch("demo.json5")
      .then((response) => response.text())
      .then((text) => {
        const data = JSON5.parse(text);
        articles = data; // 存储文章数据
        paginate(articles, currentPage); // 显示第一页文章

        // 实现简单的搜索功能
        searchInput.addEventListener("input", function () {
          const query = searchInput.value.toLowerCase();
          const filteredArticles = articles.filter((article) =>
            article.title.toLowerCase().includes(query)
          );
          paginate(filteredArticles, 1); // 搜索时从第一页显示
        });
      })
      .catch((error) => {
        console.error("加载文章列表失败:", error);
      });
  } else {
    console.error("searchInput 元素不存在");
  }
});
