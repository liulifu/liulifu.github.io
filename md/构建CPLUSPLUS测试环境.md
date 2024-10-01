# 使用 Docker Desktop + `gcc` 镜像 + VS Code + Remote Development (Dev Containers) 构建 C++ 测试环境

本文档描述了如何使用 Docker Desktop、`gcc` 官方镜像、VS Code 和 Remote Development (Dev Containers) 插件来构建一个完整的 C++ 测试环境，并演示如何编写、编译和运行 C++ 程序。

## 1. 环境准备

### 1.1 安装 Docker Desktop

确保你已经安装了 [Docker Desktop](https://www.docker.com/products/docker-desktop)。安装后，确保 Docker 正在运行，并可以通过命令行访问。

### 1.2 安装 VS Code

下载并安装 [VS Code](https://code.visualstudio.com/)，这是一个非常流行的跨平台编辑器。

### 1.3 安装 Remote Development 插件包

在 VS Code 中，安装 **Remote Development** 插件包。它包括：

- **Remote - SSH**
- **Remote - WSL**
- **Dev Containers**

#### 安装步骤：

1. 打开 VS Code，按下 `Ctrl+Shift+X` 打开扩展面板。
2. 在搜索栏中输入 **Remote Development**。
3. 找到由 Microsoft 发布的 **Remote Development**，点击安装。

> Dev Containers 是 Remote Development 插件包的一部分。

## 2. 拉取 `gcc` Docker 镜像

使用 Docker 官方的 `gcc` 镜像来作为 C++ 开发环境。你可以通过以下命令来拉取镜像：

```bash
docker pull gcc:latest
```

拉取后，`gcc` 镜像将可以在你的本地 Docker 中使用。

## 3. 创建并运行 Docker 容器

使用以下命令创建并启动容器，同时将本地工作目录挂载到容器中，以便在容器中进行开发：

```bash
docker run -it -v ${PWD}:/workspace -w /workspace gcc:latest bash
```

- `-it`：启动交互模式。
- `-v ${PWD}:/workspace`：将本地工作目录挂载到容器的 `/workspace` 目录。
- `-w /workspace`：容器启动时的工作目录。
- `gcc:latest`：使用最新版本的 `gcc` 镜像。
- `bash`：进入容器的 Bash shell。

这条命令启动后，你将进入容器的 Bash 环境，可以在其中编写和编译 C++ 代码。

## 4. 在 VS Code 中使用 Dev Containers 连接容器

### 4.1 使用 Dev Containers 插件连接容器

1. 在 VS Code 中按下 `F1` 或 `Ctrl+Shift+P`，调出命令面板。
2. 输入并选择 **Dev Containers: Attach to Running Container**。
3. VS Code 会列出所有正在运行的容器，选择你使用 `gcc` 镜像启动的容器。
4. 连接后，你将可以在 VS Code 中像平常一样编辑容器中的文件。

### 4.2 验证连接

成功连接容器后，VS Code 左下角会显示一个绿色的 "Dev Container" 标志，表示你正在容器环境中开发。

## 5. 编写、编译和运行 C++ 代码

### 5.1 创建一个测试文件

在容器中或在 VS Code 中，创建一个 C++ 文件，例如 `hello.cpp`：

```cpp
#include <iostream>

int main() {
    std::cout << "Hello, Docker and VS Code!" << std::endl;
    return 0;
}
```

### 5.2 编译 C++ 文件

在 VS Code 的终端中，使用 `g++` 来编译 C++ 文件：

```bash
g++ hello.cpp -o hello
```

### 5.3 运行编译后的程序

编译完成后，运行生成的可执行文件：

```bash
./hello
```

你应该会看到以下输出：

```bash
Hello, Docker and VS Code!
```

## 6. 创建 `devcontainer.json` 进行自动化配置

为了简化容器环境的连接和配置，你可以在项目目录中创建 `.devcontainer` 文件夹，并添加 `devcontainer.json` 文件：

```json
{
  "name": "GCC Development Container",
  "image": "gcc:latest",
  "workspaceFolder": "/workspace",
  "extensions": ["ms-vscode.cpptools"]
}
```

### 步骤：

1. 在项目根目录下创建 `.devcontainer` 文件夹。
2. 在 `.devcontainer` 文件夹中创建 `devcontainer.json` 文件，并粘贴上面的配置。
3. 下次打开该项目时，VS Code 会自动启动容器并连接。

## 7. 总结

通过 Docker、`gcc` 镜像和 VS Code 的 Remote Development 插件，你可以轻松构建一个隔离的 C++ 开发环境，避免了在本地系统中配置编译器和工具链的麻烦。这种方法对于跨平台开发和在不同环境中保持一致的开发环境非常有帮助。
