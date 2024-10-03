### 使用 Python 脚本自动分类横向或竖向的照片

#### 1. 项目介绍

该 Python 脚本的目的是根据照片的方向（横向或竖向）将它们自动分类到不同的子目录中。脚本使用 `Pillow` 库来获取图片的宽度和高度，并根据宽高比将照片移动到对应的文件夹中。

#### 2. 环境准备

##### 2.1 安装 Python

在开始之前，请确保你已经安装了 Python 3.x。如果没有安装，可以从 [Python 官方网站](https://www.python.org/downloads/)下载并安装。

##### 2.2 安装 `Pillow` 库

`Pillow` 是一个非常流行的图像处理库，用于加载、处理和保存图像。我们将使用它来检查每张照片的宽度和高度。

1. 打开命令行工具（Windows 上可以使用 CMD，macOS 和 Linux 使用终端）。
2. 运行以下命令安装 `Pillow` 库：

```bash
pip install pillow
```

如果你在中国大陆，网络环境可能会导致安装速度较慢。可以考虑使用镜像安装：

```bash
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple pillow
```

##### 2.3 准备目录

你需要准备一个包含照片的目录，并准备两个子目录，一个用于保存横向照片，另一个用于保存竖向照片。

- `source_directory`：放置所有照片的原始目录。
- `horizontal_directory`：放置横向拍摄照片的子目录。
- `vertical_directory`：放置竖向拍摄照片的子目录。

#### 3. 脚本细节说明

```python
import os
from PIL import Image

# 定义原始目录和目标子目录
source_directory = "path/to/your/source_directory"       # 替换为你的源照片目录路径
horizontal_directory = "path/to/your/horizontal_directory"  # 替换为存放横拍照片的目录路径
vertical_directory = "path/to/your/vertical_directory"      # 替换为存放竖拍照片的目录路径

# 如果目标子目录不存在，创建它们
os.makedirs(horizontal_directory, exist_ok=True)
os.makedirs(vertical_directory, exist_ok=True)

# 遍历目录中的所有文件
for filename in os.listdir(source_directory):
    # 检查文件是否为图片格式（这里只列出了一些常见的格式）
    if filename.lower().endswith(('png', 'jpg', 'jpeg', 'bmp', 'gif')):
        filepath = os.path.join(source_directory, filename)  # 获取文件的完整路径
        with Image.open(filepath) as img:  # 打开图片文件
            width, height = img.size       # 获取图片的宽度和高度
            # 如果宽度大于高度，表示是横向拍摄
            if width > height:
                os.rename(filepath, os.path.join(horizontal_directory, filename))  # 移动到横拍目录
            # 否则表示是竖向拍摄
            else:
                os.rename(filepath, os.path.join(vertical_directory, filename))    # 移动到竖拍目录

print("照片分类完成！")
```

##### 3.1 脚本工作原理

- 首先，脚本通过 `os.listdir` 函数遍历源目录中的所有文件。
- 脚本检查每个文件的扩展名是否为常见图片格式（如 `png`, `jpg`, `jpeg` 等）。
- 然后，使用 `Pillow` 库中的 `Image.open` 函数打开每张图片，并获取其宽度和高度。
- 如果图片的宽度大于高度，则表示它是横向照片，移动到 `horizontal_directory`。
- 如果高度大于宽度，则表示它是竖向照片，移动到 `vertical_directory`。

##### 3.2 关键模块解释

- **os 模块**：用于处理文件和目录操作，主要用于遍历目录、创建子目录以及移动文件。

  - `os.listdir()`：列出目录中的所有文件。
  - `os.makedirs()`：如果子目录不存在，创建它。
  - `os.rename()`：用于移动文件。

- **Pillow 库**：

  - `Image.open()`：用于打开图像文件。
  - `img.size`：获取图像的尺寸，返回 `(width, height)`，即宽度和高度。

#### 4. 如何运行脚本

##### 4.1 编辑脚本

1. 打开任意文本编辑器（比如 VS Code、Sublime Text、Notepad++ 等）或使用 Python 自带的 `IDLE` 编辑器。
2. 将上面的 Python 代码复制到一个新的文件中。
3. 将文件保存为 `photo_sorter.py` 或其他你喜欢的名称。

##### 4.2 修改目录路径

在脚本中，将以下几行的路径修改为你实际的目录路径：

```python
source_directory = "path/to/your/source_directory"
horizontal_directory = "path/to/your/horizontal_directory"
vertical_directory = "path/to/your/vertical_directory"
```

例如：

```python
source_directory = "C:/Users/Andrei/Photos"
horizontal_directory = "C:/Users/Andrei/Photos/Horizontal"
vertical_directory = "C:/Users/Andrei/Photos/Vertical"
```

##### 4.3 运行脚本

1. 打开命令行或终端。
2. 使用 `cd` 命令进入包含脚本的目录，例如：
   ```bash
   cd path/to/your/script_directory
   ```
3. 运行脚本：
   ```bash
   python photo_sorter.py
   ```

如果一切配置正确，程序将自动将横拍照片和竖拍照片分别移动到指定的目录中。

#### 5. 常见问题

- **`Pillow` 安装失败**：如果安装过程中遇到网络问题，请使用国内镜像源（如 `清华源`）加快安装速度。
- **照片没有分类**：确保照片格式正确，脚本目前支持 `png`, `jpg`, `jpeg`, `bmp`, `gif` 格式。如果你的照片是其他格式，请在 `endswith()` 中添加相应的扩展名。
- **照片无法打开**：检查图片是否损坏，或者格式是否兼容 `Pillow`。

#### 6. 结论

通过这个脚本，你可以轻松地根据照片的方向将它们分类并自动移动到不同的目录中。希望这份文档能够帮助你理解脚本的工作原理并顺利运行它！

如果有任何问题或需要进一步的功能扩展，请随时告诉我。
