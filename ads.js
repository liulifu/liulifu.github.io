// 添加样式
var style = document.createElement('style');
style.innerHTML = `
  .floating-ad {
    position: fixed;
    width: 120px;
    height: 300px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    text-align: center;
    z-index: 9999;
  }
  .floating-ad.left {
    top: 50%;
    left: 0;
    transform: translateY(-50%);
  }
  .floating-ad.right {
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }
  .close-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    cursor: pointer;
    font-size: 20px;
    color: #fff;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 2px 6px;
    border-radius: 50%;
  }
  .floating-ad img {
    width: 100%;
    height: auto;
  }
`;
document.head.appendChild(style);

// 左侧浮动广告（带超级链接的图片）
var leftAd = document.createElement('div');
leftAd.className = 'floating-ad left';
leftAd.innerHTML = `
  <a href="https://example.com" target="_blank">
    <img src="https://via.placeholder.com/120x300.png?text=Left+Ad" alt="Left Ad">
  </a>
  <div class="close-btn">X</div>
`;
document.body.appendChild(leftAd);

// 右侧浮动广告（带超级链接的GIF动态图片）
var rightAd = document.createElement('div');
rightAd.className = 'floating-ad right';
rightAd.innerHTML = `
  <a href="https://example.com" target="_blank">
    <img src="https://media.giphy.com/media/3o7aD4OUqD8qk9wKUE/giphy.gif" alt="Right GIF Ad">
  </a>
  <div class="close-btn">X</div>
`;
document.body.appendChild(rightAd);

// 关闭广告的功能
document.querySelectorAll('.close-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    this.parentElement.style.display = 'none';
  });
});
