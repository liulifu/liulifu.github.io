# 使用 Docker Desktop + Python 镜像 + VS Code + Remote Development (Dev Containers) 构建 Python 开发环境

本文档描述了如何使用 Docker Desktop、Python 官方镜像、VS Code 和 Remote Development (Dev Containers) 插件来构建一个完整的 Python 开发环境，并演示如何编写、运行 Python 代码。

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

## 2. 拉取 Python Docker 镜像

使用 Docker 官方的 `python` 镜像来作为开发环境。你可以通过以下命令来拉取镜像：

```bash
docker pull python:latest
```

拉取后，`python` 镜像将可以在你的本地 Docker 中使用。

## 3. 创建并运行 Docker 容器

使用以下命令创建并启动容器，同时将本地工作目录挂载到容器中，以便在容器中进行开发：

```bash
docker run -it -v ${PWD}:/workspace -w /workspace python:latest bash
```

- `-it`：启动交互模式。
- `-v ${PWD}:/workspace`：将本地工作目录挂载到容器的 `/workspace` 目录。
- `-w /workspace`：容器启动时的工作目录。
- `python:latest`：使用最新版本的 `python` 镜像。
- `bash`：进入容器的 Bash shell。

这条命令启动后，你将进入容器的 Bash 环境，可以在其中编写和运行 Python 代码。

## 4. 在 VS Code 中使用 Dev Containers 连接容器

### 4.1 使用 Dev Containers 插件连接容器

1. 在 VS Code 中按下 `F1` 或 `Ctrl+Shift+P`，调出命令面板。
2. 输入并选择 **Dev Containers: Attach to Running Container**。
3. VS Code 会列出所有正在运行的容器，选择你使用 `python` 镜像启动的容器。
4. 连接后，你将可以在 VS Code 中像平常一样编辑容器中的文件。

### 4.2 验证连接

成功连接容器后，VS Code 左下角会显示一个绿色的 "Dev Container" 标志，表示你正在容器环境中开发。

## 5. 编写、运行 Python 代码

### 5.1 创建一个测试文件

在容器中或在 VS Code 中，创建一个 Python 文件，例如 `hello.py`：

```python
print("Hello, Docker and VS Code!")
```

### 5.2 运行 Python 文件

在 VS Code 的终端中，使用 Python 来运行文件：

```bash
python hello.py
```

你应该会看到输出：

```bash
Hello, Docker and VS Code!
```

## 6. 使用 `docker-compose` 管理容器

为了简化容器管理，您可以创建一个 `docker-compose.yml` 文件，以便更方便地启动和管理容器。示例如下：

```yaml
version: "3"
services:
  python-dev:
    image: python:latest
    container_name: python_dev_container
    volumes:
      - ./mytest:/workspace
    working_dir: /workspace
    stdin_open: true
    tty: true
```

- 在项目目录下创建 `docker-compose.yml` 文件。
- 使用以下命令启动容器：

```bash
docker-compose up -d
```

该配置文件会自动挂载当前目录的 `./mytest` 文件夹到容器中的 `/workspace` 目录。

## 7. 将项目部署在宿主机并在容器中运行

你可以在宿主机上开发 Python 项目，并在容器中运行测试。通过挂载宿主机上的项目目录，所有的修改将自动反映在容器中，无需额外的复制或同步操作。
