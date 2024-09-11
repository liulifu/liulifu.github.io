// 创建样式
var style = document.createElement('style');
style.innerHTML = `
  .tooltip-container {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }
  .tooltip-box {
    display: none;
    position: absolute;
    top: 25px;
    left: 0;
    background-color: #fff;
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 5px;
    width: 200px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 1000;
  }
  .tooltip-box a {
    color: #0073e6;
    text-decoration: none;
  }
  .tooltip-box a:hover {
    text-decoration: underline;
  }
`;
document.head.appendChild(style);

// 函数：创建带有解释和链接的弹窗
function createTooltip(term, explanation, url) {
  // 查找页面中所有的指定术语
  document.querySelectorAll(term).forEach(function (element) {
    // 为术语创建包含弹窗的容器
    var tooltipContainer = document.createElement('span');
    tooltipContainer.classList.add('tooltip-container');
    element.parentNode.insertBefore(tooltipContainer, element);
    tooltipContainer.appendChild(element);

    // 创建解释弹窗
    var tooltipBox = document.createElement('div');
    tooltipBox.classList.add('tooltip-box');
    tooltipBox.innerHTML = `
      <p>${explanation}</p>
      <a href="${url}" target="_blank">Learn More</a>
    `;
    tooltipContainer.appendChild(tooltipBox);

    // 定义定时器变量
    var timeoutId;

    // 鼠标悬浮到术语时，显示弹窗
    element.addEventListener('mouseover', function () {
      clearTimeout(timeoutId); // 清除延时隐藏的定时器
      tooltipBox.style.display = 'block';
    });

    // 鼠标移出术语时，启动延时隐藏弹窗
    element.addEventListener('mouseout', function () {
      timeoutId = setTimeout(function () {
        tooltipBox.style.display = 'none';
      }, 300); // 延时300毫秒隐藏弹窗
    });

    // 鼠标悬浮到弹窗上时，保持弹窗显示
    tooltipBox.addEventListener('mouseover', function () {
      clearTimeout(timeoutId); // 清除定时器
      tooltipBox.style.display = 'block';
    });

    // 鼠标移出弹窗时，延时隐藏弹窗
    tooltipBox.addEventListener('mouseout', function () {
      timeoutId = setTimeout(function () {
        tooltipBox.style.display = 'none';
      }, 300); // 延时300毫秒隐藏弹窗
    });
  });
}

// 使用示例：为指定的术语添加解释和链接

//  STEP 1， 在html页面中指定要解释的名词，格式如下
// <p>这是另一个句子，包含 <span class="special-term-csv">csv</span> 这个缩写。</p>
// 注意这个class要与下面的第0个参数一致，后续新增要保证次参数唯一

document.addEventListener('DOMContentLoaded', function () {

    //  STEP 2 新增下面这个行就行。
     createTooltip('.special-term-csv', 'Computerised system validation', 'https://en.wikipedia.org/wiki/Computerized_system_validation');

    // service now
     createTooltip('.special-term-sevnow', 'One platform for enterprise automation', 'https://www.servicenow.com/products/itsm.html');
     
    // special-term-wsl
     createTooltip('.special-term-wsl', 'Windows Subsystem for Linux', 'doc/WSL.md');

});
