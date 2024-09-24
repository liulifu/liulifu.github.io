为了能在浏览器中看到Markdown的效果，使用一个页面通过一个[Showdown.js](https://github.com/showdownjs/showdown)库，对md纯文本格式进行渲染。



styles 目录 和Index.js 是为了添加样式


方式一：

1、新增内容的时候，先将Md文件放在当前目录，再创建一个同名的html文件，内容复制已经有的。

2、修改文件中的fetch，指向新创建的md文件


方式二是，创建一个md目录，然后将所有的md文件都放进去，使用一个md.html文件作为路由

'doc/md.html?file=md/PythonDataCleaning.md'

使用传参的方式进行访问

```
  <script>
    function getQueryVariable(variable) {
      var query = window.location.search.substring(1);
      var vars = query.split("&");
      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] === variable) {
          return pair[1];
        }
      }
      return null;
    }

    // 获取 URL 中的 'file' 参数值
    var file = getQueryVariable('file');
  
    if (file) {
      // 动态加载指定的 Markdown 文件
      fetch(file)
        .then(response => response.text())
        .then(text => {
          var converter = new showdown.Converter();
          document.getElementById('content').innerHTML = converter.makeHtml(text);
        })
        .catch(error => {
          document.getElementById('content').innerHTML = "<p>Error loading file.</p>";
        });
    } else {
      document.getElementById('content').innerHTML = "<p>No file specified.</p>";
    }
  </script>
```




要将 Markdown 文件正确渲染为 HTML，有以下几种方法可以尝试：

### 1. **将 Markdown 转换为 HTML**

可以在本地先将 Markdown 文件转换为 HTML，然后上传至 GitHub Pages。这里推荐使用以下工具：

- **Jekyll**: GitHub Pages 默认支持 Jekyll，可以直接将 `.md` 文件放在 Jekyll 的项目目录中，GitHub Pages 会自动渲染。
- **Markdown to HTML 转换器**: 可以使用命令行工具，比如 `pandoc`，将 `.md` 文件转换为 `.html` 文件，再上传到 GitHub Pages。

例如，使用 `pandoc` 转换：

```bash
pandoc yourfile.md -o yourfile.html
```

然后将转换后的 HTML 文件上传到 GitHub Pages 上，这样浏览器就会显示正确的样式。

### 2. **使用 Jekyll 配置**

1. 在项目根目录中创建一个 `_config.yml` 文件（如果没有的话），确保 GitHub Pages 能够自动处理 Markdown 文件。
2. 将 `.md` 文件放入 `_posts` 文件夹或项目的根目录。
3. GitHub Pages 将会自动渲染这些文件为 HTML。

### 3. **手动使用 GitHub Pages 提供的 Markdown 支持**

如果你不打算使用 Jekyll，也可以手动创建一个 `index.html`，然后在 HTML 文件中使用 JavaScript 来加载并解析你的 `.md` 文件。例如，你可以使用 [Showdown.js](https://github.com/showdownjs/showdown) 这样的库来解析 Markdown。

示例：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Example</title>
  <script src="https://cdn.jsdelivr.net/npm/showdown@1.9.1/dist/showdown.min.js"></script>
</head>
<body>
  <div id="content"></div>
  <script>
    fetch('yourfile.md')
      .then(response => response.text())
      .then(text => {
        var converter = new showdown.Converter();
        document.getElementById('content').innerHTML = converter.makeHtml(text);
      });
  </script>
</body>
</html>
```
