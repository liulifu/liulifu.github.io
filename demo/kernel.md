# Linux Kernel 运维：ERP 系统宿主机的核心管理

*liu lifu*

---



在ERP 系统的运行环境中，Linux 内核（Kernel）的稳定性和性能至关重要。ERP 系统通常涉及大量数据处理、实时事务和多用户并发，宿主机的内核管理直接关系到系统的可用性和性能表现。本文将介绍 Linux 内核运维中常见的操作、技巧，以及与 ERP 系统相关的实践经验。

## 1. Linux 内核与 ERP 系统的关系

ERP 系统是企业管理流程的核心平台，涵盖财务、生产、供应链等模块，需要宿主机提供高度可靠和稳定的支持。Linux 内核作为操作系统的核心部分，负责管理硬件资源、调度进程、管理内存等任务。ERP 系统的高负载、高并发环境对内核提出了以下要求：

- **稳定性**：系统长期运行，要求内核稳定可靠，避免频繁宕机或崩溃。
- **高性能**：支持高效的进程调度和内存管理，以确保 ERP 应用的响应速度。
- **可扩展性**：支持硬件和资源的动态扩展，包括内存、CPU、存储等。

## 2. 内核运维的常见操作

### 2.1 内核版本管理与升级

不同版本的 Linux 内核在性能优化、硬件支持和安全补丁上可能有显著差异。运维人员需要根据宿主机的实际需求选择合适的内核版本，尤其是在 ERP 系统的宿主机上，保持内核的安全性和稳定性尤为重要。

#### 常见操作：

- **查看内核版本**：

  ```
  uname -r
  ```

  使用此命令查看当前运行的内核版本，确保其与系统需求相符。
- **内核升级**：为了确保系统安全和性能优化，定期检查并升级内核是必要的。使用如下命令升级内核（以基于 RedHat/CentOS 系统为例）：

  ```
  yum update kernel
  ```

  升级后，建议重启系统以应用新的内核版本：

  ```
  reboot
  ```
- **内核回退**：升级后若发现兼容性问题，可能需要回退到之前的内核版本。可以通过 GRUB 引导菜单选择之前的内核启动，或通过命令行修改默认内核：

  ```
  grub2-set-default 0  # 设置为默认内核
  ```

### 2.2 内存管理优化

ERP 系统对内存资源的消耗非常大，因此内存管理是 Linux 内核运维中的重点。为了确保内存高效使用，可以通过调整内核参数和使用内存管理工具来优化。

#### 常见操作：

- **查看内存使用情况**：

  ```
  free -m
  ```

  使用此命令查看内存使用情况，包括物理内存和交换空间（Swap）。
- **调整交换空间（Swap）**：根据 ERP 系统的负载需求，动态调整 Swap 空间的大小或使用策略。通过修改 `/etc/sysctl.conf`文件中的 `vm.swappiness`参数，控制系统使用 Swap 的频率：

  ```
  vm.swappiness = 10  # 降低Swap使用频率
  ```

  然后通过以下命令使设置生效：

  ```
  sysctl -p
  ```
- **内存调优**：对于 ERP 系统的高内存需求，可以调整内核的缓存策略，如页缓存的大小、清理缓存的频率等。手动清理内存缓存可以使用以下命令：

  ```
  echo 3 > /proc/sys/vm/drop_caches
  ```

### 2.3 进程和负载管理

Linux 内核负责调度系统中的所有进程。在 ERP 系统中，可能会有数十甚至数百个并发进程，因此优化进程调度和控制系统负载是运维的关键任务。

#### 常见操作：

- **查看系统负载**：

  ```
  top
  htop
  ```

  使用这些工具可以实时查看 CPU、内存等资源的使用情况，分析系统瓶颈。
- **进程优先级调节**：通过调整进程的优先级（niceness 值），可以控制 ERP 系统中关键进程的执行优先级。例如：

  ```
  renice -n -5 -p <PID>
  ```

  该命令可以将指定进程的优先级提高。
- **调度策略调整**：根据系统的负载情况，选择合适的调度策略，如实时调度、批处理调度等。通过 `chrt`命令可以修改特定进程的调度策略：

  ```
  chrt -f -p 10 <PID>  # 设置为实时优先调度
  ```

### 2.4 I/O 性能调优

ERP 系统通常会涉及大量的数据读写操作，因此 I/O 性能的优化是保证系统响应速度的重要环节。内核中的 I/O 调度器可以帮助我们优化磁盘的读写性能。

#### 常见操作：

- **查看当前 I/O 调度器**：

  ```
  cat /sys/block/sda/queue/scheduler
  ```

  常见的调度器有 `noop`、`deadline` 和 `cfq`。`deadline` 通常适合于需要低延迟的应用场景。
- **修改 I/O 调度器**：

  ```
  echo deadline > /sys/block/sda/queue/scheduler
  ```

  可以根据 ERP 系统的负载特点，选择合适的调度器来优化性能。

### 2.5 内核参数调优

为了提高 ERP 宿主机的性能，可能需要对一些内核参数进行微调。这些参数通常涉及到网络堆栈、文件句柄限制、TCP 连接数量等。

#### 常见操作：

- **优化文件句柄数量**：ERP 系统可能会产生大量的文件句柄请求，通过以下方式可以增加文件句柄的最大数量：

  ```
  echo "fs.file-max = 100000" >> /etc/sysctl.conf
  sysctl -p
  ```
- **优化网络性能**：通过调节 TCP 堆栈的参数，可以提高系统的网络性能，尤其是在高并发的情况下：

  ```
  echo "net.core.somaxconn = 1024" >> /etc/sysctl.conf
  echo "net.ipv4.tcp_max_syn_backlog = 2048" >> /etc/sysctl.conf
  sysctl -p
  ```

## 3. Linux 内核运维中的最佳实践

### 3.1 定期内核更新与安全补丁

定期升级内核和应用安全补丁，特别是 ERP 系统这样的关键任务系统，保持内核和软件的最新状态可以有效防止漏洞攻击和性能问题。

```
#!/bin/bash
# 作者: lifu
# 时间: 2017年10月8日
# 脚本功能: 定期更新Linux内核和系统安全补丁，并自动清理旧内核版本

# 定义日志文件路径
LOG_FILE="/var/log/kernel_update.log"

# 记录脚本执行开始时间
echo "===== 开始执行内核更新和安全补丁脚本 $(date) =====" | tee -a $LOG_FILE

# 1. 查看当前内核版本并记录
echo "当前内核版本: $(uname -r)" | tee -a $LOG_FILE

# 2. 同步系统中的软件包库
echo "同步软件包库..." | tee -a $LOG_FILE
sudo yum check-update | tee -a $LOG_FILE

# 3. 更新系统的所有软件包（包括内核和安全补丁）
echo "开始更新系统软件包（包括内核和安全补丁）..." | tee -a $LOG_FILE
sudo yum update -y | tee -a $LOG_FILE

# 4. 检查是否有新的内核版本
echo "检查可用内核更新..." | tee -a $LOG_FILE
sudo yum list kernel | tee -a $LOG_FILE

# 5. 单独更新内核（如果需要只更新内核）
echo "单独更新内核..." | tee -a $LOG_FILE
sudo yum update -y kernel | tee -a $LOG_FILE

# 6. 重启系统以应用新内核
echo "重启系统以应用新的内核版本..." | tee -a $LOG_FILE
sudo reboot

# 7. 重启后验证新内核版本
# 注意：以下命令将在系统重启后手动运行
# echo "验证内核更新后的版本: $(uname -r)" | tee -a $LOG_FILE

# 8. 清理旧内核（保留当前内核和最新内核）
echo "清理旧的内核版本..." | tee -a $LOG_FILE
sudo package-cleanup --oldkernels --count=2 | tee -a $LOG_FILE

# 9. 记录脚本执行结束时间
echo "===== 内核更新和安全补丁脚本执行完毕 $(date) =====" | tee -a $LOG_FILE

```

### 3.2 配置内核参数自动备份

修改内核参数后，确保做好配置文件的备份，以便系统出现问题时能够快速恢复。

以 Oracle 数据库配置为例：

```
#!/bin/bash
# 作者: lifu
# 时间: 2017年5月2日
# 脚本功能: 配置与 Oracle 数据库相关的 Linux 内核参数，并自动备份现有配置文件

# 定义变量
SYSCTL_CONF="/etc/sysctl.conf"  # 内核参数配置文件路径
BACKUP_DIR="/etc/sysctl_backup" # 备份目录
LOG_FILE="/var/log/oracle_sysctl_config.log"  # 日志文件路径
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')  # 时间戳

# 1. 创建备份目录（如果不存在）
if [ ! -d "$BACKUP_DIR" ]; then
    echo "创建备份目录: $BACKUP_DIR" | tee -a $LOG_FILE
    mkdir -p $BACKUP_DIR
fi

# 2. 备份现有的 /etc/sysctl.conf 文件
echo "备份当前的内核配置文件..." | tee -a $LOG_FILE
cp $SYSCTL_CONF "$BACKUP_DIR/sysctl.conf_$TIMESTAMP"
echo "备份完成: $BACKUP_DIR/sysctl.conf_$TIMESTAMP" | tee -a $LOG_FILE

# 3. 配置 Oracle 数据库相关的内核参数
echo "配置 Oracle 数据库相关的内核参数..." | tee -a $LOG_FILE
cat >> $SYSCTL_CONF <<EOF

# Oracle 数据库相关内核参数配置 - 添加时间: $TIMESTAMP
fs.aio-max-nr = 1048576  # Oracle 建议的异步 I/O 设置
fs.file-max = 6815744    # Oracle 建议的文件句柄最大值
kernel.shmall = 2097152  # 共享内存段的总大小
kernel.shmmax = 8589934592  # 共享内存段的最大大小 (8GB)
kernel.shmmni = 4096     # 共享内存段的最大数量
kernel.sem = 250 32000 100 128  # 信号量参数设置 (信号量数量, 信号量总数, 单个信号量最大值, 信号量集最大数量)
net.ipv4.ip_local_port_range = 9000 65500  # 可使用的本地端口范围
net.core.rmem_default = 262144  # 默认的接收缓存大小
net.core.rmem_max = 4194304     # 最大的接收缓存大小
net.core.wmem_default = 262144  # 默认的发送缓存大小
net.core.wmem_max = 1048576     # 最大的发送缓存大小
EOF

echo "Oracle 内核参数配置完成。" | tee -a $LOG_FILE

# 4. 使新的内核参数立即生效
echo "应用新的内核参数..." | tee -a $LOG_FILE
sysctl -p | tee -a $LOG_FILE

# 5. 验证新内核参数是否已生效
echo "验证内核参数是否生效..." | tee -a $LOG_FILE
sysctl -a | grep -E 'fs.aio-max-nr|fs.file-max|kernel.shmall|kernel.shmmax|kernel.shmmni|kernel.sem|net.ipv4.ip_local_port_range|net.core.rmem_default|net.core.rmem_max|net.core.wmem_default|net.core.wmem_max' | tee -a $LOG_FILE

# 6. 脚本执行结束日志
echo "===== Oracle 内核参数配置脚本执行完毕 $(date) =====" | tee -a $LOG_FILE

```

### 3.3 性能监控与日志记录

定期监控系统的性能指标（如 CPU、内存、I/O、网络负载）并记录日志，有助于及时发现性能瓶颈和故障隐患。

```
#!/usr/bin/env python3
# 作者: lifu
# 时间: 2022年07月13日
# 脚本功能: 定期监控系统的 CPU、内存、I/O、网络负载，并将性能指标记录到日志中

import psutil
import time
import logging
from datetime import datetime

# 配置日志文件
LOG_FILE = "/var/log/system_performance.log"
logging.basicConfig(filename=LOG_FILE, level=logging.INFO, format='%(asctime)s - %(message)s')

# 监控间隔时间（秒）
INTERVAL = 10

def log_system_performance():
    """
    获取系统性能指标（CPU、内存、I/O、网络负载）并记录日志
    """
    # 获取 CPU 使用率
    cpu_usage = psutil.cpu_percent(interval=1)

    # 获取内存使用情况
    memory_info = psutil.virtual_memory()
    memory_usage = memory_info.percent

    # 获取 I/O 读写情况
    disk_io = psutil.disk_io_counters()
    disk_read = disk_io.read_bytes
    disk_write = disk_io.write_bytes

    # 获取网络负载情况
    net_io = psutil.net_io_counters()
    net_sent = net_io.bytes_sent
    net_recv = net_io.bytes_recv

    # 记录性能指标到日志
    logging.info(f"CPU 使用率: {cpu_usage}%")
    logging.info(f"内存使用率: {memory_usage}%")
    logging.info(f"磁盘读取: {disk_read / (1024 * 1024):.2f} MB")
    logging.info(f"磁盘写入: {disk_write / (1024 * 1024):.2f} MB")
    logging.info(f"网络发送: {net_sent / (1024 * 1024):.2f} MB")
    logging.info(f"网络接收: {net_recv / (1024 * 1024):.2f} MB")

if __name__ == "__main__":
    try:
        logging.info("===== 系统性能监控开始 =====")
        while True:
            log_system_performance()
            time.sleep(INTERVAL)
    except KeyboardInterrupt:
        logging.info("===== 系统性能监控结束 =====")
        print("系统性能监控已停止。")

```

脚本说明：

1. 日志记录 ：性能数据会定期记录到 `/var/log/system_performance.log` 文件中。
2. 监控间隔 ：使用 `INTERVAL` 变量设置监控的时间间隔（单位为秒），当前设置为每 10 秒记录一次系统性能数据。
3. 性能指标 ：

- CPU 使用率 ：通过 `psutil.cpu_percent()` 获取 CPU 使用情况。
- 内存使用情况 ：通过 `psutil.virtual_memory()` 获取内存使用率。
- I/O 读写 ：通过 `psutil.disk_io_counters()` 获取磁盘的读取和写入量。
- 网络负载 ：通过 `psutil.net_io_counters()` 获取网络的发送和接收数据量。

### 3.4 应用热修复技术

在不影响 ERP 系统正常运行的前提下，可以通过热补丁技术（如 kpatch、ksplice）对内核进行动态修复，避免系统停机。

```
#!/bin/bash
# 作者: lifu
# 时间: 2019年02月03日
# 脚本功能: 使用 kpatch 技术对内核进行动态修复，避免系统停机

# 日志文件路径
LOG_FILE="/var/log/kpatch_update.log"

# 记录脚本开始时间
echo "===== 开始应用 kpatch 热补丁 $(date) =====" | tee -a $LOG_FILE

# 1. 检查 kpatch 工具是否已安装
if ! command -v kpatch &> /dev/null; then
    echo "kpatch 工具未安装，正在安装..." | tee -a $LOG_FILE
    sudo yum install -y kpatch  # 适用于 RHEL/CentOS
    if [ $? -ne 0 ]; then
        echo "kpatch 安装失败，请检查软件源。" | tee -a $LOG_FILE
        exit 1
    fi
else
    echo "kpatch 工具已安装。" | tee -a $LOG_FILE
fi

# 2. 检查可用补丁
PATCH_DIR="/var/kpatch/patches"  # 假设补丁存储在该目录
if [ -d "$PATCH_DIR" ] && [ "$(ls -A $PATCH_DIR)" ]; then
    echo "检测到补丁目录: $PATCH_DIR" | tee -a $LOG_FILE
else
    echo "未找到可用的内核补丁，请将补丁文件放入 $PATCH_DIR 目录。" | tee -a $LOG_FILE
    exit 1
fi

# 3. 应用所有可用补丁
for patch in $PATCH_DIR/*.ko; do
    echo "正在应用补丁: $patch" | tee -a $LOG_FILE
    sudo kpatch load $patch
    if [ $? -eq 0 ]; then
        echo "补丁 $patch 应用成功。" | tee -a $LOG_FILE
    else
        echo "补丁 $patch 应用失败。" | tee -a $LOG_FILE
        exit 1
    fi
done

# 4. 验证已加载的补丁
echo "验证已加载的补丁..." | tee -a $LOG_FILE
kpatch list | tee -a $LOG_FILE

# 5. 脚本执行完成日志
echo "===== kpatch 热补丁应用完毕 $(date) =====" | tee -a $LOG_FILE

```
