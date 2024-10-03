# 一、使用 Python 脚本自动分类横向或竖向的照片

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

# 二、打包成 EXE

要将 Python 脚本打包成 `.exe` 程序，并在命令行中通过参数调用，你可以使用 `argparse` 来处理命令行参数，使用 `shutil` 来复制文件，并使用 `PyInstaller` 打包成可执行文件。以下是详细步骤：

### 1. 脚本编写

我们先改进你的 Python 脚本，支持命令行参数，并将照片进行分类复制到新目录中，保持源目录的照片不变。

```python
import os
import shutil
import argparse
from PIL import Image

# 定义处理命令行参数的函数
def parse_arguments():
    parser = argparse.ArgumentParser(description="根据照片方向将照片分类到不同目录")
    parser.add_argument('-a', '--all', required=True, help="源照片目录路径")
    parser.add_argument('-h', '--horizontal', required=True, help="横向照片存放目录路径")
    parser.add_argument('-v', '--vertical', required=True, help="竖向照片存放目录路径")
    return parser.parse_args()

# 分类和复制照片的函数
def classify_and_copy_photos(source_directory, horizontal_directory, vertical_directory):
    # 如果目标子目录不存在，创建它们
    os.makedirs(horizontal_directory, exist_ok=True)
    os.makedirs(vertical_directory, exist_ok=True)

    # 遍历源目录中的所有文件
    for filename in os.listdir(source_directory):
        if filename.lower().endswith(('png', 'jpg', 'jpeg', 'bmp', 'gif')):
            filepath = os.path.join(source_directory, filename)
            with Image.open(filepath) as img:
                width, height = img.size
                # 如果宽度大于高度，表示是横向拍摄
                if width > height:
                    shutil.copy(filepath, os.path.join(horizontal_directory, filename))
                # 否则表示是竖向拍摄
                else:
                    shutil.copy(filepath, os.path.join(vertical_directory, filename))

    print("照片分类完成！")

if __name__ == "__main__":
    args = parse_arguments()
    classify_and_copy_photos(args.all, args.horizontal, args.vertical)
```

#### 脚本功能说明

1. 使用 `argparse` 解析命令行参数：

   - `-a`：源照片目录。
   - `-h`：横向照片目录。
   - `-v`：竖向照片目录。

2. 使用 `shutil.copy()` 将照片复制到目标目录，保持源目录的照片不变。
3. 自动创建指定的目录（如果不存在）。

### 2. 打包成 `.exe` 文件

#### 2.1 安装 `PyInstaller`

首先你需要安装 `PyInstaller`，它是一个非常常用的 Python 程序打包工具，能够将所有依赖项（如 `Pillow`）打包到 `.exe` 文件中。

在命令行中运行以下命令安装 `PyInstaller`：

```bash
pip install pyinstaller
```

#### 2.2 使用 `PyInstaller` 打包

在安装 `PyInstaller` 后，可以使用以下命令打包脚本。确保在脚本文件所在目录中运行此命令：

```bash
pyinstaller --onefile --add-data "path_to_PIL_directory;PIL" photo_sorter.py
```

- `--onefile`：打包成单个 `.exe` 文件。
- `--add-data "path_to_PIL_directory;PIL"`：将 `Pillow` 库包含在可执行文件中。`path_to_PIL_directory` 是你的 `Pillow` 库所在的路径。通常可以在 Python 库目录中找到。

生成的 `.exe` 文件将保存在 `dist` 目录下。

#### 2.3 运行 `.exe` 文件

打包完成后，使用 CMD 命令行调用生成的 `.exe` 文件。例如：

```bash
demo.exe -a "C:/Users/Andrei/Photos" -h "C:/Users/Andrei/Photos/Horizontal" -v "C:/Users/Andrei/Photos/Vertical"
```

此命令将分类并复制照片到指定的目录中。

### 3. 文档说明

#### 3.1 环境准备

1. **Python**：确保系统中安装了 Python 3.x。
2. **依赖库**：使用以下命令安装所需库：
   ```bash
   pip install pillow pyinstaller
   ```

#### 3.2 脚本使用说明

1. **调用方式**：使用 `demo.exe`，通过命令行参数提供源照片目录和目标目录：

   - `-a`：源照片目录路径。
   - `-h`：横向照片存放目录路径。
   - `-v`：竖向照片存放目录路径。

2. **举例**：

   ```bash
   demo.exe -a "C:/Photos" -h "C:/Photos/Horizontal" -v "C:/Photos/Vertical"
   ```

   这会将 `C:/Photos` 目录下的照片分类复制到 `Horizontal` 和 `Vertical` 目录中，源目录照片不会被修改。

#### 3.3 打包 `.exe`

- 使用 `PyInstaller` 将 Python 脚本打包为 `.exe` 可执行文件。
- 打包命令：`pyinstaller --onefile --add-data "path_to_PIL_directory;PIL" photo_sorter.py`。

#### 3.4 常见问题

1. **找不到 `Pillow` 库**：确保使用 `--add-data` 参数将 `Pillow` 库包含在 `.exe` 文件中。
2. **文件无法复制**：检查文件权限和目录是否正确，确保脚本对源目录和目标目录具有读写权限。

# 三、增加 GUI

使用 `tkinter` 来创建一个简单的图形用户界面（GUI），它是 Python 标准库自带的图形界面库，不需要额外安装。我们将为你设计一个简单的界面，包含选择源目录和目标目录的按钮，以及一个“执行”按钮来启动照片分类。

### 1. GUI 设计

我们将在界面中使用以下控件：

- **Label**：显示说明文字。
- **Button**：选择目录和执行操作。
- **Entry**：显示用户选择的目录路径。
- **`tkinter.filedialog.askdirectory`**：用于让用户选择目录。
- **`shutil.copy()`**：进行照片分类和复制。

### 2. 代码实现

```python
import os
import shutil
from tkinter import Tk, Label, Button, Entry, filedialog, messagebox
from PIL import Image

# 分类和复制照片的函数
def classify_and_copy_photos(source_directory, horizontal_directory, vertical_directory):
    os.makedirs(horizontal_directory, exist_ok=True)
    os.makedirs(vertical_directory, exist_ok=True)

    for filename in os.listdir(source_directory):
        if filename.lower().endswith(('png', 'jpg', 'jpeg', 'bmp', 'gif')):
            filepath = os.path.join(source_directory, filename)
            with Image.open(filepath) as img:
                width, height = img.size
                if width > height:
                    shutil.copy(filepath, os.path.join(horizontal_directory, filename))
                else:
                    shutil.copy(filepath, os.path.join(vertical_directory, filename))

    messagebox.showinfo("完成", "照片分类完成！")

# 选择源目录
def select_source_directory():
    directory = filedialog.askdirectory()
    source_entry.delete(0, 'end')  # 清空当前输入框内容
    source_entry.insert(0, directory)  # 插入选定的目录路径

# 选择横向照片目录
def select_horizontal_directory():
    directory = filedialog.askdirectory()
    horizontal_entry.delete(0, 'end')
    horizontal_entry.insert(0, directory)

# 选择竖向照片目录
def select_vertical_directory():
    directory = filedialog.askdirectory()
    vertical_entry.delete(0, 'end')
    vertical_entry.insert(0, directory)

# 执行分类操作
def execute():
    source_directory = source_entry.get()
    horizontal_directory = horizontal_entry.get()
    vertical_directory = vertical_entry.get()

    if not source_directory or not horizontal_directory or not vertical_directory:
        messagebox.showerror("错误", "请完整填写所有目录路径！")
        return

    classify_and_copy_phphotos(source_directory, horizontal_directory, vertical_directory)

# 创建主窗口
root = Tk()
root.title("照片分类工具")

# 源目录选择
Label(root, text="源照片目录:").grid(row=0, column=0, padx=10, pady=5)
source_entry = Entry(root, width=50)
source_entry.grid(row=0, column=1, padx=10, pady=5)
Button(root, text="选择", command=select_source_directory).grid(row=0, column=2, padx=10, pady=5)

# 横向照片目录选择
Label(root, text="横向照片目录:").grid(row=1, column=0, padx=10, pady=5)
horizontal_entry = Entry(root, width=50)
horizontal_entry.grid(row=1, column=1, padx=10, pady=5)
Button(root, text="选择", command=select_horizontal_directory).grid(row=1, column=2, padx=10, pady=5)

# 竖向照片目录选择
Label(root, text="竖向照片目录:").grid(row=2, column=0, padx=10, pady=5)
vertical_entry = Entry(root, width=50)
vertical_entry.grid(row=2, column=1, padx=10, pady=5)
Button(root, text="选择", command=select_vertical_directory).grid(row=2, column=2, padx=10, pady=5)

# 执行按钮
Button(root, text="执行分类", command=execute).grid(row=3, column=1, padx=10, pady=20)

# 启动主窗口循环
root.mainloop()
```

### 3. 详细说明

#### 3.1 功能说明

- **图形界面布局**：

  - 三个目录选择项：源照片目录、横向照片目录、竖向照片目录。
  - 每个目录选择项都配有 `Entry` 组件用于显示选定的目录路径，用户可以通过点击“选择”按钮调用 `filedialog.askdirectory()` 选择目录。
  - 执行按钮负责触发分类逻辑，将照片按宽高比分类到指定目录。

- **逻辑流程**：

  1. 用户点击选择按钮，弹出目录选择窗口。
  2. 用户选择相应目录后，路径会自动填入对应的文本框中。
  3. 点击“执行分类”按钮后，程序会根据指定的目录进行照片的分类和复制操作。
  4. 任务完成后，会弹出消息框通知用户。

#### 3.2 依赖库

这个程序依赖 `Pillow` 和 `tkinter`，其中 `tkinter` 是 Python 自带的，不需要额外安装，`Pillow` 需要使用以下命令安装：

```bash
pip install pillow
```

#### 3.3 如何打包成 `.exe` 文件

和之前一样，我们使用 `PyInstaller` 将脚本打包为可执行文件：

1. 安装 `PyInstaller`：

   ```bash
   pip install pyinstaller
   ```

2. 打包命令：

   ```bash
   pyinstaller --onefile --windowed --add-data "path_to_PIL_directory;PIL" photo_sorter_gui.py
   ```

- `--onefile`：将所有内容打包成单个 `.exe` 文件。
- `--windowed`：不显示命令行窗口，适用于 GUI 程序。
- `--add-data`：将 `Pillow` 库包含在可执行文件中。

生成的 `.exe` 文件将放在 `dist` 文件夹下。

### 4. 用户指南

#### 4.1 启动程序

双击生成的 `.exe` 文件，程序将以图形界面启动。

#### 4.2 使用说明

1. 点击“选择”按钮，为源目录、横向照片目录和竖向照片目录分别选择文件夹。
2. 选好目录后，点击“执行分类”按钮，程序将开始分类并复制照片。
3. 分类完成后，弹出通知窗口。

#### 4.3 常见问题

- **未选择目录**：如果没有为所有目录选择路径，程序会弹出错误提示，要求用户填写所有路径。
- **打包后运行异常**：如果打包后的 `.exe` 文件在运行时出现问题，可能是某些依赖项未正确包含在内，请确保使用正确的 `--add-data` 参数。

# 如果觉得以上办法还是麻烦怎么办？

这个问题问的好啊 ，

那你就不得不用 windows 来解决这个问题了，
