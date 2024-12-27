# Azure AzCopy 详细使用指南

AzCopy 是 Microsoft Azure 提供的命令行工具，用于在本地文件系统和 Azure 存储服务之间复制、同步和传输数据。本指南将详细介绍 AzCopy 的安装、基本用法和一些常见示例，特别适合刚开始使用 Azure 存储服务的新手。

## 1. 安装

### Windows:

1. 访问 [AzCopy 官方下载页面](https://aka.ms/downloadazcopy-v10-windows)
2. 下载 ZIP 文件并解压到一个易于访问的目录，如 `C:\AzCopy`
3. 添加 AzCopy 到系统 PATH:
   - 右键点击"此电脑"，选择"属性"
   - 点击"高级系统设置"
   - 点击"环境变量"
   - 在"系统变量"部分，选择"Path"，然后点击"编辑"
   - 点击"新建"，添加 AzCopy 的路径（如 `C:\AzCopy`）
   - 点击"确定"保存所有更改

### macOS/Linux:

1. 打开终端
2. 运行以下命令：

   ```
   # 下载
   wget https://aka.ms/downloadazcopy-v10-linux

   # 解压
   tar -xvf downloadazcopy-v10-linux

   # 移动到 /usr/local/bin
   sudo cp ./azcopy_linux_amd64_*/azcopy /usr/local/bin/
   ```

安装完成后，打开新的命令行窗口，输入 `azcopy --version` 来验证安装是否成功。

## 2. AzCopy 可以操作的数据类型

AzCopy 主要用于操作以下 Azure 存储服务中的数据：

1. **Blob 存储**：用于存储大量非结构化数据，如文本或二进制数据。
2. **文件存储**：提供完全托管的云文件共享。
3. **表存储**：用于存储结构化数据。
4. **队列存储**：用于存储大量消息。
5. **Data Lake Storage Gen2**：用于大数据分析的分层存储。

在这个指南中，我们主要关注 Blob 存储，因为它是最常用的存储类型之一。

## 3. 什么是 Blob 存储？

Azure Blob 存储是 Microsoft 的对象存储解决方案，专为存储大量非结构化数据（如文本或二进制数据）而设计。它可以存储任何类型的文本或二进制数据，如文档、媒体文件或应用程序安装文件。

Blob 存储包含三种类型的资源：

- **存储账户**：提供唯一的命名空间来存储和访问 Azure 存储数据对象。
- **容器**：类似于文件夹，用于组织一组 blob。
- **Blob**：存储在容器中的实际文件。

## 4. 基本语法

AzCopy 的基本语法如下：

```
azcopy [command] [arguments] [flags]
```

## 5. 常用命令和实际示例

### 5.1 复制文件到 Blob 存储

语法：

```
azcopy copy [source] [destination] [flags]
```

实际示例：

```
azcopy copy "C:\Users\YourName\Documents\Project-X\data.csv" "https://mystorageaccount.blob.core.windows.net/mycontainer/data/data.csv?sv=2020-08-04&ss=b&srt=co&sp=rwdlacx&se=2023-12-31T00:00:00Z&st=2023-01-01T00:00:00Z&spr=https&sig=JgbYtrEtE6y1fqdsPm6vTLAH5L3Aaj7UapfSi7FPD7w%3D"
```

这个命令将本地的 `data.csv` 文件上传到 Azure Blob 存储的 `mycontainer` 容器中的 `data` 文件夹。

### 5.2 从 Blob 存储下载文件

语法：

```
azcopy copy [source] [destination] [flags]
```

实际示例：

```
azcopy copy "https://mystorageaccount.blob.core.windows.net/mycontainer/reports/annual_report_2022.pdf?sv=2020-08-04&ss=b&srt=co&sp=rwdlacx&se=2023-12-31T00:00:00Z&st=2023-01-01T00:00:00Z&spr=https&sig=JgbYtrEtE6y1fqdsPm6vTLAH5L3Aaj7UapfSi7FPD7w%3D" "D:\Downloads\annual_report_2022.pdf"
```

这个命令从 Azure Blob 存储下载 `annual_report_2022.pdf` 文件到本地的 `D:\Downloads` 目录。

### 5.3 在 Azure 存储账户之间复制

语法：

```
azcopy copy [source] [destination] [flags]
```

实际示例：

```
azcopy copy "https://sourceaccount.blob.core.windows.net/sourcecontainer/images/?sv=2020-08-04&ss=b&srt=co&sp=rwdlacx&se=2023-12-31T00:00:00Z&st=2023-01-01T00:00:00Z&spr=https&sig=JgbYtrEtE6y1fqdsPm6vTLAH5L3Aaj7UapfSi7FPD7w%3D" "https://destaccount.blob.core.windows.net/destcontainer/backup/images/?sv=2020-08-04&ss=b&srt=co&sp=rwdlacx&se=2023-12-31T00:00:00Z&st=2023-01-01T00:00:00Z&spr=https&sig=KhbYtrRtE7y2gqdsPm6vTLAH5L3Aaj7UapfSi7FPD7w%3D" --recursive
```

这个命令将 `sourceaccount` 存储账户中 `sourcecontainer` 容器的 `images` 文件夹复制到 `destaccount` 存储账户的 `destcontainer` 容器的 `backup/images` 文件夹。

### 5.4 同步目录

语法：

```
azcopy sync [source] [destination] [flags]
```

实际示例：

```
azcopy sync "C:\Users\YourName\Projects\WebApp" "https://mystorageaccount.blob.core.windows.net/mycontainer/webapp-files?sv=2020-08-04&ss=b&srt=co&sp=rwdlacx&se=2023-12-31T00:00:00Z&st=2023-01-01T00:00:00Z&spr=https&sig=JgbYtrEtE6y1fqdsPm6vTLAH5L3Aaj7UapfSi7FPD7w%3D" --recursive
```

这个命令将本地的 `WebApp` 目录与 Azure Blob 存储中的 `webapp-files` 文件夹同步。

## 6. 常用标志

- `--recursive`: 递归复制子目录
- `--overwrite`: 覆盖目标中的文件
- `--dry-run`: 模拟运行而不实际复制文件
- `--log-level`: 设置日志级别 (INFO, WARNING, ERROR)
- `--include-pattern`: 指定要包含的文件模式
- `--exclude-pattern`: 指定要排除的文件模式

示例：

```
azcopy copy "C:\Users\YourName\Documents" "https://mystorageaccount.blob.core.windows.net/mycontainer/backup?[SAS]" --recursive --include-pattern "*.docx;*.xlsx" --exclude-pattern "temp*;draft*"
```

这个命令会递归复制 Documents 文件夹中的所有 .docx 和 .xlsx 文件，但排除以 "temp" 或 "draft" 开头的文件。

## 7. 使用共享访问签名 (SAS)

共享访问签名（SAS）是一种安全方法，用于授予对存储账户中资源的有限访问权限。在使用 AzCopy 时，您需要在 URL 中包含 SAS 令牌。

如何获取 SAS：

1. 在 Azure 门户中打开您的存储账户
2. 在左侧菜单中，选择"共享访问签名"
3. 设置所需的权限和有效期
4. 点击"生成 SAS 和连接字符串"
5. 复制"Blob 服务 SAS URL"以在 AzCopy 命令中使用

示例：

```
azcopy copy "C:\Users\YourName\Documents\Project-Y\data.json" "https://mystorageaccount.blob.core.windows.net/mycontainer/project-y/data.json?sv=2020-08-04&ss=b&srt=co&sp=rwdlacx&se=2023-12-31T00:00:00Z&st=2023-01-01T00:00:00Z&spr=https&sig=JgbYtrEtE6y1fqdsPm6vTLAH5L3Aaj7UapfSi7FPD7w%3D"
```

## 8. 注意事项

- 始终使用最新版本的 AzCopy 以获得最佳性能和功能支持。
- 对于大型文件传输，考虑使用 `--cap-mbps` 标志来限制带宽使用。
- 使用 `--output-type` 标志来自定义输出格式，便于集成到其他脚本或工作流中。
- 在处理大量文件时，使用 `--from-to` 标志可以优化性能。
- 定期检查 [Azure 存储的服务级别协议（SLA）](https://azure.microsoft.com/zh-cn/support/legal/sla/storage/) 以了解性能和可用性保证。

## 9. 故障排除

如果您在使用 AzCopy 时遇到问题，可以尝试以下方法：

1. 检查网络连接
2. 验证 SAS 令牌的有效性和权限
3. 使用 `--log-level=DEBUG` 标志获取详细的日志信息
4. 查看 [AzCopy 官方文档](https://docs.microsoft.com/zh-cn/azure/storage/common/storage-use-azcopy-v10) 的故障排除部分
