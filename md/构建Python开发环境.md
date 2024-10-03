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

# Python 容器与 Docker Compose 配置指南

#### 1. 安装 Docker 和 Docker Compose

确保已经安装了 Docker 和 Docker Compose。如果还未安装，可以参考 [Docker 官方网站](https://www.docker.com/get-started) 进行安装。

#### 2. 创建 `Dockerfile`

首先，创建一个 `Dockerfile` 用于定义 Python 容器的构建流程。

```dockerfile
# 使用官方 Python 基础镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 复制当前目录的内容到容器的 /app 目录
COPY . /app

# 安装依赖
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# 暴露端口
EXPOSE 5000

# 运行应用
CMD ["python", "app.py"]
```

#### 3. 创建 `requirements.txt`

`requirements.txt` 文件记录项目所需的 Python 库。可以通过以下命令生成：

```bash
pip freeze > requirements.txt
```

该命令将当前 Python 环境中的所有依赖库导出到 `requirements.txt` 中。

#### 4. 创建 `docker-compose.yml`

`docker-compose.yml` 是 Docker Compose 的配置文件。它定义了服务、网络和卷等内容。创建以下内容的 `docker-compose.yml` 文件：

```yaml
version: "3"

services:
  app:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - .:/app
    environment:
      - PYTHONUNBUFFERED=1
    depends_on:
      - db

  db:
    image: postgres:13
    environment:
      POSTGRES_USER: exampleuser
      POSTGRES_PASSWORD: examplepass
      POSTGRES_DB: exampledb
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- `app` 服务使用 Dockerfile 来构建，并将项目目录映射到容器内的 `/app` 目录，确保在本地更改代码后，容器内的代码也会自动更新。
- `db` 服务使用 Postgres 数据库作为示例，并通过环境变量来设置数据库用户名、密码和数据库名。

#### 5. 使用 Docker Compose 构建和启动容器

在项目目录下，运行以下命令构建并启动服务：

```bash
docker-compose up --build
```

- `--build` 选项用于在启动容器之前重新构建镜像。
- 这将启动 `app` 和 `db` 两个容器，Python 应用会通过 5000 端口对外提供服务。

#### 6. 后续操作和依赖管理

在开发过程中，如果需要添加新的依赖库，可以通过以下命令安装新库：

```bash
pip install new-package
```

然后更新 `requirements.txt`：

```bash
pip freeze > requirements.txt
```

接着运行以下命令重新构建并启动容器：

```bash
docker-compose up --build
```

#### 7. 常用 Docker Compose 命令

- 启动服务（在后台运行）：

```bash
docker-compose up -d
```

- 停止服务：

```bash
docker-compose down
```

- 查看服务日志：

```bash
docker-compose logs
```

- 只重新构建应用服务：

```bash
docker-compose up --build app
```

- 进入正在运行的容器：

```bash
docker-compose exec app bash
```

---

# 如果只使用 Docker Compose

而不使用 Dockerfile，也可以通过 `docker-compose.yml` 文件直接配置服务，并在容器启动时安装 `requirements.txt` 中的依赖。虽然不使用 Dockerfile 有些限制，但这种方式仍然可行。

以下是如何在不使用 Dockerfile 的情况下，仅通过 `docker-compose.yml` 文件实现依赖安装的步骤：

### 1. 创建 `docker-compose.yml` 文件

你可以在 `docker-compose.yml` 文件中定义服务，并在启动时自动安装 `requirements.txt` 中的依赖。以下是一个简单的配置示例：

```yaml
version: "3"

services:
  app:
    image: python:3.9-slim # 直接使用官方 Python 镜像
    volumes:
      - .:/app # 将当前目录挂载到容器中的 /app 目录
    working_dir: /app # 设置工作目录为 /app
    command: bash -c "pip install --upgrade pip && pip install -r requirements.txt && python app.py"
    ports:
      - "5000:5000"
    environment:
      - PYTHONUNBUFFERED=1
```

### 2. 解释配置内容

- `image: python:3.9-slim`：使用官方的 Python 镜像，而不再需要单独的 Dockerfile。
- `volumes: - .:/app`：将本地项目目录挂载到容器的 `/app` 目录中，确保代码和依赖可以在容器中访问。
- `working_dir: /app`：设置容器的工作目录为 `/app`，即挂载的本地项目目录。
- `command: bash -c "pip install --upgrade pip && pip install -r requirements.txt && python app.py"`：容器启动时执行的命令，首先升级 `pip`，然后安装 `requirements.txt` 中的依赖，最后运行 `app.py`。
- `ports: - "5000:5000"`：将容器的 5000 端口映射到主机的 5000 端口，确保应用可以从外部访问。

### 3. 创建 `requirements.txt`

如之前提到的，生成 `requirements.txt` 文件：

```bash
pip freeze > requirements.txt
```

这将生成一个包含当前 Python 环境依赖的 `requirements.txt` 文件，确保在启动容器时，依赖能够被正确安装。

### 4. 启动容器

当 `docker-compose.yml` 和 `requirements.txt` 文件准备好后，可以使用以下命令启动容器：

```bash
docker-compose up
```

此命令会：

- 拉取官方的 `python:3.9-slim` 镜像。
- 挂载当前目录到容器中。
- 安装 `requirements.txt` 中的所有依赖。
- 运行 `app.py`。

### 5. 验证

启动完成后，应用应该可以通过本地的 `5000` 端口访问。你可以通过以下命令进入容器，检查已安装的依赖：

```bash
docker-compose exec app bash
```

进入容器后，运行以下命令查看已安装的库：

```bash
pip list
```

这将列出所有已经安装的 Python 库。

### 常用 Docker Compose 命令

- 启动服务：

```bash
docker-compose up
```

- 在后台运行服务：

```bash
docker-compose up -d
```

- 停止并删除容器：

```bash
docker-compose down
```

- 查看容器日志：

```bash
docker-compose logs
```

---

通过这种方式，你不需要编写 Dockerfile 就可以使用 Docker Compose 安装依赖并运行应用。所有依赖的安装都是通过 `docker-compose.yml` 中的 `command` 部分实现的。这样的方法适用于简单的项目配置，但对于复杂的项目，推荐使用 Dockerfile 来增加灵活性和可维护性。
