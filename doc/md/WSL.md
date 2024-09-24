**Windows Subsystem for Linux**

简称  **WSL** 。

*WSL 是什么？*

*WSL 是一种在 Windows 上运行 Linux 二进制文件的兼容层。它允许你在 Windows 系统上直接运行 Linux 应用，而无需虚拟机。这使得开发者可以在 Windows 环境下方便地使用 Linux 的开发工具、命令行工具和应用程序。*

*WSL 的主要功能：*

* *运行 Linux 应用： 可以直接在 Windows 上运行各种 Linux 应用程序，包括常用的命令行工具、开发环境、服务器软件等。*
* *使用 Linux 命令行： 提供一个类似于 Linux 的命令行界面，可以执行常见的 Linux 命令。*
* *访问 Windows 文件系统： 可以直接访问 Windows 的文件系统，方便在 Linux 和 Windows 之间共享文件。*

*WSL 的优势：*

* *方便快捷： 无需安装虚拟机，直接在 Windows 上运行 Linux 应用。*
* *兼容性好： 支持多种 Linux 发行版，如 Ubuntu、Debian 等。*
* *性能优异： 性能接近原生 Linux 系统。*

*WSL 的应用场景：*

* *开发者： 在 Windows 上进行跨平台开发，使用 Linux 工具和库。*
* *系统管理员： 在 Windows 环境下管理 Linux 服务器。*
* *学习 Linux： 在 Windows 上学习 Linux 系统。*



---



# 查看状态及常用命令

在 Windows 上使用 WSL 时，你可以通过以下步骤来查看当前已安装的 Ubuntu 版本和它是否占用宿主机的资源（CPU、内存等）。

### 查看

1. **查看已安装的 WSL 发行版**

你可以使用 `wsl` 命令来查看当前系统上已经安装的所有 Linux 发行版，包括 Ubuntu：

```bash
wsl --list --verbose
```

输出示例如下：

```
  NAME                   STATE           VERSION
* Ubuntu                 Running         2
  Debian                 Stopped         2
```

- `NAME` 列显示已安装的发行版名称。
- `STATE` 列显示当前状态（`Running` 表示正在运行，`Stopped` 表示没有运行）。
- `VERSION` 列显示是 WSL 1 还是 WSL 2。

2. 查看 WSL 是否占用宿主机资源

WSL 2 是基于轻量虚拟机运行的，所以它确实会使用宿主机的资源（CPU、内存等）。你可以通过 任务管理器 和 命令行工具 查看 WSL 对系统资源的占用情况。

2.1 通过任务管理器查看资源占用

1. 打开任务管理器：

   - 右键单击任务栏，选择 任务管理器，或者使用快捷键 `Ctrl + Shift + Esc` 打开任务管理器。
2. 查找 WSL 的相关进程：

   - 在任务管理器中，切换到 进程 标签，找到名为 Vmmem 或 VmmemWSL 的进程。
   - 该进程表示 WSL 2 虚拟机的资源使用情况。你可以看到它占用的 CPU 和内存资源。
3. 查看详细的 WSL 资源使用情况：

   - 如果你运行了多个 WSL 发行版，`Vmmem` 进程会合并所有正在运行的 WSL 实例的资源占用。

2.2 通过命令行查看资源占用

你可以通过 PowerShell 或 命令提示符 来查看正在运行的 WSL 实例的 CPU 和内存使用情况。

1. 打开 PowerShell 或 Windows Terminal，输入以下命令查看系统上所有进程的资源使用情况：

   ```bash
   wsl --status
   ```

   输出类似如下：

   ```
   Default Distribution: Ubuntu
   Default Version: 2
   WSL 2 uses a lightweight virtual machine with a complete Linux kernel.
   ```

   这个命令会告诉你当前默认的 WSL 发行版和 WSL 的版本。如果你想进一步查看 WSL 的 CPU 和内存占用，你可以继续通过 `top` 或 `htop` 工具在 Linux 实例中进行监控。
2. 在 WSL 内部使用 `top` 命令查看资源占用：

   - 在 Ubuntu WSL 中运行以下命令查看资源使用情况：

     ```bash
     top
     ```
   - 这将显示 WSL 内部的进程及其占用的 CPU、内存等。

   如果需要 `htop`（更友好的系统监控工具），你可以在 WSL 中安装它：

   ```bash
   sudo apt-get install htop
   ```

   然后运行：

   ```bash
   htop
   ```

   `htop` 提供了更直观的界面来查看系统资源使用情况，包括 CPU、内存、进程等。

**3. 控制 WSL 占用的资源**

WSL 2 会动态分配内存和 CPU，但你可以通过配置文件限制 WSL 使用的最大内存和 CPU 资源。

3.1 创建 WSL 配置文件

你可以通过配置 `.wslconfig` 文件来限制 WSL 的资源使用：

1. 在 Windows 用户主目录下（`C:\Users\<YourUsername>`）创建一个名为 `.wslconfig` 的文件。
2. 在 `.wslconfig` 中添加以下内容来限制 CPU 和内存的使用：

   ```ini
   [wsl2]
   memory=4GB   # 限制最大使用4GB内存
   processors=2 # 限制最多使用2个CPU核心
   ```
3. 保存文件后，重新启动 WSL 实例：

   ```bash
   wsl --shutdown
   ```

   然后重新启动 WSL，这些配置将生效。

### 打开

要重新启动已经关闭的 Ubuntu 实例，你可以通过以下方法启动：

1. 使用 `wsl` 命令启动 Ubuntu

直接通过 `wsl` 命令启动 Ubuntu：

```bash
wsl -d Ubuntu
```

这个命令将启动名为 `Ubuntu` 的 WSL 实例。如果你安装了多个 WSL 发行版，可以通过指定发行版名称来启动特定的实例。

2. 通过 Windows 搜索启动

你也可以通过 **Windows 搜索** 打开 Ubuntu：

1. 按 **Win 键** 或点击 **开始菜单**。
2. 搜索 "Ubuntu"，你会看到已安装的 Ubuntu 应用，点击即可启动 Ubuntu 实例。
3. 使用 `wsl` 启动默认发行版

如果 Ubuntu 是默认的 WSL 发行版，你可以直接运行 `wsl` 命令来启动：

```bash
wsl
```

这将启动你的默认 WSL 实例（在这种情况下是 Ubuntu）。

4. 设置默认启动

如果你希望 Ubuntu 成为默认的 WSL 发行版，可以通过以下命令设置：

```bash
wsl --set-default Ubuntu
```

这样以后你只需输入 `wsl` 命令即可启动 Ubuntu 实例。

启动后，你就可以继续在 Ubuntu 中运行命令和操作了。如果有其他问题，随时联系我！

### 关闭

要关闭运行中的 Ubuntu（或任何正在运行的 WSL 发行版），可以通过以下几种方式进行操作：

1. 使用 `wsl --terminate` 命令

你可以通过 `wsl --terminate` 命令来关闭特定的 WSL 发行版（如 Ubuntu）：

```bash
wsl --terminate Ubuntu
```

这样会立即停止运行中的 Ubuntu 实例。

2. 使用 `wsl --shutdown` 命令

如果你想关闭 **所有正在运行的 WSL 实例**，包括 Docker 和其他 Linux 发行版，可以使用以下命令：

```bash
wsl --shutdown
```

该命令将会停止所有的 WSL 2 虚拟机和 WSL 服务，适用于需要彻底停止 WSL 的情况。

3. 通过任务管理器关闭 WSL

你也可以通过 **任务管理器** 手动终止 WSL 实例：

1. 打开 **任务管理器**（`Ctrl + Shift + Esc`）。
2. 在 **进程** 标签下，找到名为 **Vmmem** 或 **VmmemWSL** 的进程，它是 WSL 2 使用的虚拟机进程。
3. 右键点击该进程，选择 **结束任务**。这将会停止所有正在运行的 WSL 实例。
4. 检查状态

关闭后，你可以使用以下命令检查 Ubuntu 是否已经停止：

```bash
wsl --list --verbose
```

如果 `STATE` 显示为 `Stopped`，则说明 Ubuntu 已成功关闭。

如果有其他疑问，随时可以继续咨询！

### 删除

要删除已经安装的 **Ubuntu** WSL 发行版，你可以通过以下步骤来进行操作：

1. 使用 `wsl --unregister` 删除 Ubuntu

`wsl --unregister` 命令可以彻底删除 Ubuntu 发行版，包括所有相关的文件和数据。这个操作是不可逆的，请确保你不再需要保留数据。

删除命令：

```bash
wsl --unregister Ubuntu
```

- `Ubuntu` 是你的 WSL 发行版的名称，可以用 `wsl --list --verbose` 来确认你要删除的发行版名称。

验证删除：

删除完成后，你可以通过以下命令验证 Ubuntu 是否已被成功删除：

```bash
wsl --list --verbose
```

如果没有列出 `Ubuntu`，说明它已被成功删除。

2. 检查文件是否被清理

当你使用 `wsl --unregister` 删除 Ubuntu 时，WSL 将会清理与该发行版相关的所有文件和数据。如果你希望确保其文件被删除，你可以检查以下路径：

1. 打开 **文件资源管理器**。
2. 在地址栏中输入：

   ```bash
   \\wsl$
   ```
3. 确认 Ubuntu 的文件夹是否已从该目录中移除。如果它已经不再存在，说明它已彻底删除。
4. 重新安装 Ubuntu（可选）

如果你想在未来重新安装 Ubuntu，可以通过 **Microsoft Store** 或手动下载和导入的方式重新安装。

- 通过 **Microsoft Store** 安装：
  - 打开 Microsoft Store，搜索 "Ubuntu"，然后点击 **安装** 即可。

这样你就可以完全删除并管理你的 WSL 发行版了。如果有其他问题，欢迎继续讨论！

### 新建

在 Windows 11 上，你可以通过 WSL 创建、复制或安装多个 Linux 发行版（如 **Ubuntu** 或 **Debian**）。以下是如何操作的详细步骤：

**1. 复制当前的 Ubuntu 环境**

如果你想复制现有的 Ubuntu 发行版，你可以通过导出当前的 WSL 发行版并将其导入为一个新实例。

1.1 导出当前的 Ubuntu 发行版

1. 首先，打开 **Windows Terminal** 或 **PowerShell**，并运行以下命令导出当前的 Ubuntu 发行版为一个 `.tar` 文件：

   ```bash
   wsl --export Ubuntu C:\path\to\ubuntu_backup.tar
   ```

   - `C:\path\to\ubuntu_backup.tar` 是你保存 `.tar` 文件的路径，你可以根据需要修改路径。

1.2 导入为新实例

1. 选择你要将 Ubuntu 实例导入的路径，并运行以下命令来导入新的 Ubuntu 发行版：

   ```bash
   wsl --import UbuntuCopy C:\path\to\new_ubuntu_instance C:\path\to\ubuntu_backup.tar
   ```

   - `UbuntuCopy` 是新实例的名称。
   - `C:\path\to\new_ubuntu_instance` 是你想放置新实例的路径。
   - `C:\path\to\ubuntu_backup.tar` 是你导出的 `.tar` 文件的路径。
2. 导入完成后，你可以通过以下命令启动新复制的 Ubuntu 实例：

   ```bash
   wsl -d UbuntuCopy
   ```

1.3 验证新实例

你可以通过以下命令列出所有 WSL 实例，确认新的实例已经成功导入：

```bash
wsl --list --verbose
```

2. **在 WSL 中安装 Debian**

WSL 支持安装多个 Linux 发行版，比如 **Debian**。你可以通过 Windows 的 **Microsoft Store** 直接安装，也可以手动安装。

2.1 通过 Microsoft Store 安装 Debian

1. 打开 **Microsoft Store**。
2. 搜索 “**Debian**”，然后点击安装。
3. 安装完成后，点击 **启动**，你将进入 Debian 终端，首次运行时会提示你设置用户名和密码。

   安装完成后，你可以在 Windows 终端中通过以下命令启动 Debian：

   ```bash
   wsl -d Debian
   ```

2.2 手动安装 Debian

如果你不想通过 Microsoft Store 安装，也可以手动下载 Debian 的 rootfs，并通过 WSL 导入。

1. **下载 Debian 的 rootfs**：
   你可以从官方的 Debian 网站下载 rootfs。下面是下载和导入步骤：

   - 访问 [Debian rootfs 下载页面](https://wiki.debian.org/Downloads)。
   - 下载你需要的版本（例如 `debian-bullseye.tar.gz`）。
2. **导入 Debian rootfs**：

   在下载文件后，使用 `wsl --import` 命令导入 Debian：

   ```bash
   wsl --import Debian C:\path\to\debian_instance C:\path\to\debian-bullseye.tar.gz
   ```

   - `Debian` 是新实例的名称。
   - `C:\path\to\debian_instance` 是你要存放新 Debian 实例的路径。
   - `C:\path\to\debian-bullseye.tar.gz` 是下载的 Debian rootfs 文件的路径。
3. 导入完成后，通过以下命令启动 Debian 实例：

   ```bash
   wsl -d Debian
   ```
4. **管理 WSL 发行版**

你可以使用以下常用命令来管理你的 WSL 发行版：

- **列出所有 WSL 发行版**：

  ```bash
  wsl --list --verbose
  ```

  这会显示你所有安装的发行版以及它们的状态和版本（WSL 1 或 WSL 2）。
- **设置默认 WSL 发行版**：

  如果你想将某个发行版设为默认运行的发行版，可以使用以下命令：

  ```bash
  wsl --set-default <发行版名称>
  ```

  例如：

  ```bash
  wsl --set-default Debian
  ```
- **更改发行版的版本**（WSL 1 或 WSL 2）：

  如果你想将某个发行版从 WSL 1 更改为 WSL 2 或反之，可以使用以下命令：

  ```bash
  wsl --set-version <发行版名称> <版本号>
  ```

  例如：

  ```bash
  wsl --set-version Debian 2
  ```
- **删除 WSL 发行版**：

  如果你不再需要某个发行版，可以通过以下命令删除它：

  ```bash
  wsl --unregister <发行版名称>
  ```

---

通过这些步骤，你可以轻松地复制当前的 Ubuntu 环境或安装新的 Debian 发行版，并在 Windows 上同时运行多个 Linux 实例。如果你在操作中遇到任何问题，欢迎随时向我咨询！

### 导入导出

在 Windows 上的 WSL 中，你可以通过 `wsl` 命令轻松导出和导入 Ubuntu 或其他 Linux 发行版。导出操作会生成一个包含整个发行版文件系统的 `.tar` 文件，而导入操作允许你将该 `.tar` 文件恢复为新的 WSL 实例。以下是详细步骤：

1. 导出 Ubuntu 实例

导出操作会将 Ubuntu 的整个文件系统打包为一个 `.tar` 文件，方便备份或迁移。

导出命令：

```bash
wsl --export Ubuntu C:\path\to\ubuntu_backup.tar
```

- `Ubuntu`：这是你要导出的 WSL 发行版的名称（可以用 `wsl --list --verbose` 来确认）。
- `C:\path\to\ubuntu_backup.tar`：这是导出 `.tar` 文件的保存路径，确保路径是你有写权限的地方（例如 `C:\Users\YourName\Documents\ubuntu_backup.tar`）。

执行此命令后，你将得到一个包含 Ubuntu 文件系统的 `ubuntu_backup.tar` 文件。

导出后文件大小：

- `.tar` 文件的大小取决于你的 Ubuntu 实例的文件系统使用情况，导出后它包含所有安装的应用、配置和数据文件。

2. 导入 Ubuntu 实例

你可以将导出的 `.tar` 文件导入为一个新的 WSL 实例。这对于迁移、恢复或在不同计算机上部署相同环境非常有用。

导入命令：

```bash
wsl --import NewUbuntu C:\path\to\new_ubuntu_instance C:\path\to\ubuntu_backup.tar
```

- `NewUbuntu`：这是导入后的新实例的名称，你可以自由命名。
- `C:\path\to\new_ubuntu_instance`：这是新实例的存储路径，可以是任意你有权限写入的文件夹。
- `C:\path\to\ubuntu_backup.tar`：这是之前导出的 `.tar` 文件的路径。

导入完成后，你可以使用新实例的名称来启动它：

```bash
wsl -d NewUbuntu
```

设置导入后的实例为默认：

如果你希望让这个新导入的实例成为默认实例，可以使用以下命令：

```bash
wsl --set-default NewUbuntu
```

3. 检查和管理导入后的实例

导入后，你可以使用以下命令检查 WSL 中的发行版：

```bash
wsl --list --verbose
```

这将列出所有已经安装的 WSL 实例，包括你导入的实例。你可以根据需要启动、停止或删除它们。

总结

- **导出 Ubuntu**：`wsl --export Ubuntu C:\path\to\ubuntu_backup.tar`。
- **导入 Ubuntu**：`wsl --import NewUbuntu C:\path\to\new_ubuntu_instance C:\path\to\ubuntu_backup.tar`。
- **启动导入的实例**：`wsl -d NewUbuntu`。

通过这些操作，你可以轻松地导出、备份和导入你的 Ubuntu WSL 实例。如果有其他问题或需要进一步说明，随时可以向我咨询！

# TIP

## 如何找到已经安装的ubuntu

在 **Windows 11** 上安装了 **WSL** 和 **Ubuntu** 后，你可以通过以下步骤来打开和使用它：

查看

> **wsl --list --verbose**

### 打开 WSL 和 Ubuntu

1. **使用 Windows 搜索**：

   - 按 **Win 键** 或点击 **开始菜单**，在搜索栏中输入 "Ubuntu"。
   - 你会看到已经安装的 Ubuntu 应用，点击打开。
2. **通过命令行启动 WSL**：

   - 你也可以按 **Win + X**，选择 **Windows Terminal** 或 **命令提示符**，然后输入以下命令来启动 WSL 和 Ubuntu：
     ```bash
     wsl
     ```
   - 这个命令会默认启动安装的 Ubuntu 发行版。
3. **直接启动 Ubuntu**：

   - 如果你安装了多个 Linux 发行版，你可以直接通过命令启动特定的版本：
     ```bash
     wsl -d Ubuntu
     ```
4. **设置默认的 WSL 发行版**：

   - 如果你想将 Ubuntu 设置为默认的 WSL 发行版，你可以运行以下命令：
     ```bash
     wsl --set-default Ubuntu
     ```

### 找到 WSL 和 Ubuntu 的文件

在 Windows 11 中，你可以通过 Windows 文件资源管理器访问 WSL 的文件系统：

1. 打开文件资源管理器。
2. 在地址栏中输入：

   ```bash
   \\wsl$
   ```

   然后按回车。你会看到已经安装的 WSL 发行版，点击 "Ubuntu" 即可访问 Ubuntu 的文件系统。
3. 你可以在这里看到 Ubuntu 内的文件夹和文件，类似于你在 Linux 下的 `/home`、`/usr` 目录等。

### 在 Ubuntu 中使用 OpenResty

1. **启动 Ubuntu 终端后**，你可以使用之前提供的命令来安装和管理 OpenResty。
2. 如果你已经安装了 OpenResty，可以通过以下命令启动它：

   ```bash
   sudo /usr/local/openresty/nginx/sbin/nginx
   ```
3. 启动后，在 Windows 的浏览器中访问 `http://localhost`，你将看到 OpenResty 的输出页面。

### 常见问题

1. **检查 WSL 状态**：

   - 如果 Ubuntu 终端没有正确启动，你可以检查 WSL 的状态：
     ```bash
     wsl --list --verbose
     ```
   - 这将显示已安装的 WSL 发行版及其当前状态。如果你发现 Ubuntu 没有启动，可以通过 `wsl --set-default-version 2` 确保使用的是 WSL 2。
2. **重启 WSL**：

   - 如果遇到问题，可以重启 WSL：

     ```bash
     wsl --shutdown
     ```

     然后再次启动 Ubuntu。

通过以上步骤，你可以在 Windows 11 上轻松打开和管理 Ubuntu WSL 环境。如果有其他问题或需要进一步的帮助，欢迎继续讨论！

# Q&A

## 为什么 `wsl` 能查询到 Docker

是的，从 `wsl --list --verbose` 的结果可以看出，Docker 在 Windows 11 上实际上是通过 WSL 2 运行的。这意味着 **Docker Desktop** 和你的 **Ubuntu** 实例在本质上都运行在 WSL 2 环境中。

### 为什么 `wsl` 能查询到 Docker

在 Windows 10 和 Windows 11 中，Docker Desktop 使用 WSL 2 作为其默认的虚拟化引擎。Docker 通过 WSL 2 提供了更高的性能和更好的与 Windows 系统的集成。因此，当你安装了 Docker Desktop 时，它会创建两个 WSL 2 发行版：

1. **docker-desktop**：这是 Docker 的核心服务运行的地方，包含所有与 Docker 相关的系统文件。
2. **docker-desktop-data**：这是 Docker 存储容器、镜像和卷等数据的地方。

这些 Docker 实例和你安装的 Ubuntu 一样，都是运行在 WSL 2 上的轻量虚拟机。你可以像管理普通 WSL 发行版一样，通过 `wsl` 命令管理和查看它们。

### Docker 和 Ubuntu 在 WSL 上的本质相同之处

- **运行环境**：Docker 和 Ubuntu 都运行在 WSL 2 的虚拟化技术上，使用了 Windows 提供的 Linux 内核，允许它们直接访问硬件资源（如 CPU 和内存），并与 Windows 系统进行紧密集成。
- **共享资源**：它们在本质上都可以访问宿主机的 CPU、内存、文件系统等资源。通过 WSL 2 的虚拟机机制，Docker 和 Ubuntu 可以以轻量级的方式共享这些资源，而不会像传统的虚拟机那样占用太多性能。
- **集成性**：Docker Desktop 使用 WSL 2 来运行它的 Linux 容器，而你可以使用同样的 WSL 2 环境运行 Linux 发行版，如 Ubuntu。因此，Docker 和 WSL 中的 Linux 发行版可以很好地协同工作。

### 总结

- `wsl` 命令能够查询到 Docker 的信息，因为 Docker Desktop 在 Windows 上是通过 WSL 2 运行的。
- Docker 和你刚刚安装的 Ubuntu 都是在 WSL 2 环境下运行，它们共享相同的虚拟化技术和资源管理机制。

如果你有进一步的问题，或者想了解更多 Docker 和 WSL 的集成细节，欢迎继续讨论！
