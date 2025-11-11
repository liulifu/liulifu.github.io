# Oracle RAC 集群部署与调优方案

适用读者：中高级 DBA、架构师、运维工程师
目标：提供 Oracle RAC（Real Application Clusters）从规划、部署到性能调优的完整方案，适用于高可用生产环境。

---

## 1. RAC 架构概述

### 1.1 核心组件
- **Clusterware (Grid Infrastructure)**：集群管理软件，负责节点管理、资源调度、故障切换
- **ASM (Automatic Storage Management)**：共享存储管理，提供数据文件、控制文件、日志文件的集群文件系统
- **Cache Fusion**：节点间内存数据块传输机制，通过私网（Interconnect）实现
- **Voting Disk & OCR**：投票磁盘（仲裁）和集群配置仓库

### 1.2 网络架构
- **Public Network**：客户端连接，SCAN（Single Client Access Name）提供负载均衡
- **Private Network (Interconnect)**：节点间心跳、Cache Fusion 数据传输，建议 10GbE 或更高
- **IPMI/iLO Network**：带外管理网络（可选）

---

## 2. 部署前规划

### 2.1 硬件与存储
```plaintext
最低配置（2节点）：
- CPU: 8核 x 2节点
- 内存: 32GB x 2节点
- 存储: 共享存储（SAN/NAS/iSCSI），至少 500GB
- 网络: 双网卡（Public + Private），建议冗余

推荐配置（生产环境）：
- CPU: 16核+ x 2-4节点
- 内存: 64GB+ x 节点数
- 存储: 光纤 SAN 或 NVMe 共享存储，RAID10
- 网络: 双 10GbE 私网（绑定），双 1GbE 公网
```

### 2.2 操作系统与内核参数
```bash
# RHEL/OL 7.x/8.x，关闭防火墙或配置规则
systemctl stop firewalld
systemctl disable firewalld

# 内核参数 /etc/sysctl.conf
kernel.shmmax = 68719476736
kernel.shmall = 16777216
kernel.shmmni = 4096
kernel.sem = 250 32000 100 128
fs.file-max = 6815744
net.ipv4.ip_local_port_range = 9000 65500
net.core.rmem_default = 262144
net.core.rmem_max = 4194304
net.core.wmem_default = 262144
net.core.wmem_max = 1048576

# 应用参数
sysctl -p

# 用户限制 /etc/security/limits.conf
oracle soft nproc 2047
oracle hard nproc 16384
oracle soft nofile 1024
oracle hard nofile 65536
oracle soft stack 10240
oracle hard stack 32768
```

### 2.3 共享存储配置
- **ASM 磁盘组**：
  - `+DATA`：数据文件、控制文件（Normal/High Redundancy）
  - `+FRA`：闪回区、归档日志（Normal Redundancy）
  - `+OCR`：OCR 和 Voting Disk（High Redundancy，至少3个磁盘）

- **多路径配置**（multipath）：
```bash
# /etc/multipath.conf 示例
defaults {
    user_friendly_names yes
    path_grouping_policy multibus
    failback immediate
}
multipaths {
    multipath {
        wwid 3600508b1001c1234567890abcdef
        alias asm_data01
    }
}
```

---

## 3. Grid Infrastructure 安装

### 3.1 安装前检查
```bash
# 在所有节点执行
# 1. 主机名解析（/etc/hosts）
192.168.1.101 rac1.example.com rac1
192.168.1.102 rac2.example.com rac2
192.168.1.103 rac1-priv.example.com rac1-priv
192.168.1.104 rac2-priv.example.com rac2-priv
192.168.1.105 rac1-vip.example.com rac1-vip
192.168.1.106 rac2-vip.example.com rac2-vip
192.168.1.110 rac-scan.example.com rac-scan

# 2. SSH 互信（grid 和 oracle 用户）
su - grid
ssh-keygen -t rsa
ssh-copy-id rac2

# 3. 时钟同步（所有节点）
systemctl enable chronyd
systemctl start chronyd
chronyc sources

# 4. ASM 磁盘权限
chown grid:asmadmin /dev/mapper/asm_*
chmod 660 /dev/mapper/asm_*
```

### 3.2 静默安装 Grid Infrastructure
```bash
# 在第一个节点执行
cd /u01/app/19.3.0/grid
./gridSetup.sh -silent -responseFile /tmp/grid_install.rsp

# grid_install.rsp 关键参数
oracle.install.option=CRS_CONFIG
INVENTORY_LOCATION=/u01/app/oraInventory
oracle.install.asm.OSDBA=asmdba
oracle.install.asm.OSOPER=asmoper
oracle.install.asm.OSASM=asmadmin
oracle.install.crs.config.ClusterConfiguration=STANDALONE
oracle.install.crs.config.configureAsExtendedCluster=false
oracle.install.crs.config.clusterName=rac-cluster
oracle.install.crs.config.gpnp.scanName=rac-scan.example.com
oracle.install.crs.config.gpnp.scanPort=1521
oracle.install.crs.config.ClusterConfiguration=STANDALONE
oracle.install.crs.config.configureGNS=false
oracle.install.crs.config.autoConfigureClusterNodeVIP=false
oracle.install.crs.config.clusterNodes=rac1:rac1-vip,rac2:rac2-vip
oracle.install.crs.config.networkInterfaceList=eth0:192.168.1.0:1,eth1:192.168.2.0:5
oracle.install.asm.configureGIMRDataDG=false
oracle.install.asm.storageOption=ASM
oracle.install.asmOnNAS.configureGIMRDataDG=false
oracle.install.asm.SYSASMPassword=Oracle123#
oracle.install.asm.diskGroup.name=OCR
oracle.install.asm.diskGroup.redundancy=EXTERNAL
oracle.install.asm.diskGroup.disks=/dev/mapper/asm_ocr01,/dev/mapper/asm_ocr02,/dev/mapper/asm_ocr03
oracle.install.asm.diskGroup.diskDiscoveryString=/dev/mapper/asm_*
```

### 3.3 验证 Grid Infrastructure
```bash
# 检查集群状态
crsctl check cluster -all
crsctl stat res -t

# 检查 ASM 实例
srvctl status asm
asmcmd lsdg

# 检查 SCAN 监听
srvctl status scan
srvctl status scan_listener
```

---

## 4. Oracle Database 安装（RAC）

### 4.1 安装数据库软件
```bash
# 在第一个节点执行
cd /u01/app/oracle/product/19.3.0/dbhome_1
./runInstaller -silent -responseFile /tmp/db_install.rsp

# db_install.rsp 关键参数
oracle.install.option=INSTALL_DB_SWONLY
UNIX_GROUP_NAME=oinstall
INVENTORY_LOCATION=/u01/app/oraInventory
ORACLE_HOME=/u01/app/oracle/product/19.3.0/dbhome_1
ORACLE_BASE=/u01/app/oracle
oracle.install.db.InstallEdition=EE
oracle.install.db.OSDBA_GROUP=dba
oracle.install.db.OSOPER_GROUP=oper
oracle.install.db.OSBACKUPDBA_GROUP=backupdba
oracle.install.db.OSDGDBA_GROUP=dgdba
oracle.install.db.OSKMDBA_GROUP=kmdba
oracle.install.db.OSRACDBA_GROUP=racdba
oracle.install.db.CLUSTER_NODES=rac1,rac2
```

### 4.2 创建 RAC 数据库
```bash
# 使用 DBCA 创建 RAC 数据库
dbca -silent -createDatabase \
  -templateName General_Purpose.dbc \
  -gdbname racdb -sid racdb \
  -responseFile NO_VALUE \
  -characterSet AL32UTF8 \
  -sysPassword Oracle123# \
  -systemPassword Oracle123# \
  -createAsContainerDatabase true \
  -numberOfPDBs 1 \
  -pdbName pdb1 \
  -pdbAdminPassword Oracle123# \
  -storageType ASM \
  -diskGroupName +DATA \
  -recoveryGroupName +FRA \
  -redoLogFileSize 1024 \
  -emConfiguration NONE \
  -nodelist rac1,rac2 \
  -memoryMgmtType AUTO_SGA \
  -totalMemory 16384

# 验证数据库
srvctl status database -d racdb
srvctl config database -d racdb
```

---

## 5. RAC 性能调优

### 5.1 Interconnect 优化
```sql
-- 检查 Interconnect 使用情况
SELECT inst_id, name, value 
FROM gv$parameter 
WHERE name = 'cluster_interconnects';

-- 检查 Cache Fusion 统计
SELECT * FROM gv$cr_block_server;
SELECT * FROM gv$current_block_server;

-- 检查全局缓存传输延迟
SELECT 
    inst_id,
    event,
    total_waits,
    time_waited,
    average_wait
FROM gv$system_event
WHERE event LIKE 'gc%'
ORDER BY time_waited DESC;
```

**优化建议**：
- 使用万兆或更高速网络作为 Interconnect
- 启用 Jumbo Frames（MTU 9000）
- 绑定多个网卡（bonding mode 4 - LACP）
- 隔离 Interconnect 流量到专用 VLAN

### 5.2 序列号缓存优化
```sql
-- RAC 环境下序列号竞争是常见问题
-- 增加序列缓存大小
ALTER SEQUENCE order_seq CACHE 1000;

-- 或使用 NOORDER 选项（如果不需要严格顺序）
CREATE SEQUENCE order_seq 
    START WITH 1 
    INCREMENT BY 1 
    CACHE 1000 
    NOORDER;
```

### 5.3 GCS/GES 资源调优
```sql
-- 检查 GCS 资源
SELECT * FROM gv$ges_resource WHERE resource_name LIKE '%YOUR_TABLE%';

-- 检查 GCS 锁等待
SELECT 
    inst_id,
    sid,
    event,
    p1text,
    p1,
    p2text,
    p2,
    wait_time,
    seconds_in_wait
FROM gv$session_wait
WHERE event LIKE 'gc%'
ORDER BY seconds_in_wait DESC;

-- 调整 _gc_policy_time（谨慎使用）
ALTER SYSTEM SET "_gc_policy_time"=0 SCOPE=SPFILE SID='*';
```

### 5.4 AWR 报告分析（RAC）
```sql
-- 生成 RAC AWR 报告
@?/rdbms/admin/awrgrpt.sql

-- 关注指标：
-- 1. Global Cache CR/Current Blocks Received
-- 2. GC Block Lost/Corrupt
-- 3. Interconnect Ping Time
-- 4. Cluster Wait Time
```

---

## 6. 高可用与故障切换

### 6.1 服务配置（负载均衡）
```bash
# 创建服务
srvctl add service -d racdb -s app_service \
  -preferred racdb1,racdb2 \
  -available racdb3 \
  -pdb pdb1 \
  -policy AUTOMATIC \
  -failovertype AUTO \
  -failovermethod BASIC \
  -notification TRUE \
  -clbgoal SHORT \
  -rlbgoal THROUGHPUT

# 启动服务
srvctl start service -d racdb -s app_service

# 检查服务状态
srvctl status service -d racdb -s app_service
```

### 6.2 TAF（Transparent Application Failover）配置
```plaintext
# tnsnames.ora 配置
RACDB_TAF = 
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = rac-scan)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = app_service)
      (FAILOVER_MODE =
        (TYPE = SELECT)
        (METHOD = BASIC)
        (RETRIES = 180)
        (DELAY = 5)
      )
    )
  )
```

### 6.3 Fast Application Notification (FAN)
```sql
-- 启用 FAN
ALTER SYSTEM SET event='10046 trace name context forever, level 12' SCOPE=SPFILE SID='*';

-- 应用端配置（JDBC）
jdbc:oracle:thin:@(DESCRIPTION=
  (ADDRESS=(PROTOCOL=TCP)(HOST=rac-scan)(PORT=1521))
  (CONNECT_DATA=(SERVICE_NAME=app_service))
  (ENABLE=BROKEN)
  (FAST_CONNECTION_FAILOVER=TRUE)
)
```

---

## 7. 日常维护

### 7.1 节点管理
```bash
# 停止节点
srvctl stop instance -d racdb -i racdb2

# 启动节点
srvctl start instance -d racdb -i racdb2

# 重定位服务
srvctl relocate service -d racdb -s app_service -oldinst racdb1 -newinst racdb2

# 检查集群健康
cluvfy comp healthcheck -collect cluster -bestpractice
```

### 7.2 补丁管理（OPatch）
```bash
# 检查补丁
opatchauto apply /u01/patches/34786990 -oh /u01/app/19.3.0/grid

# 回滚补丁
opatchauto rollback /u01/patches/34786990 -oh /u01/app/19.3.0/grid
```

### 7.3 备份策略
```bash
# RMAN 备份（RAC）
rman target /
CONFIGURE DEVICE TYPE DISK PARALLELISM 4;
CONFIGURE CONTROLFILE AUTOBACKUP ON;
CONFIGURE CONTROLFILE AUTOBACKUP FORMAT FOR DEVICE TYPE DISK TO '+FRA/%F';

BACKUP AS COMPRESSED BACKUPSET DATABASE PLUS ARCHIVELOG;
```

---

## 8. 故障排查

### 8.1 常见问题
| 问题 | 排查命令 | 解决方案 |
|------|----------|----------|
| 节点驱逐 | `crsctl check cluster -all` | 检查网络、存储、日志 |
| SCAN 监听异常 | `srvctl status scan_listener` | 重启 SCAN 监听 |
| ASM 磁盘组无法挂载 | `asmcmd lsdg` | 检查磁盘权限、多路径 |
| Cache Fusion 慢 | `SELECT * FROM gv$system_event WHERE event LIKE 'gc%'` | 优化 Interconnect |

### 8.2 日志位置
```bash
# Grid Infrastructure 日志
$GRID_HOME/log/<hostname>/alert<hostname>.log
$GRID_HOME/log/<hostname>/crsd/crsd.log

# 数据库告警日志
$ORACLE_BASE/diag/rdbms/racdb/racdb1/trace/alert_racdb1.log

# ASM 日志
$ORACLE_BASE/diag/asm/+asm/+ASM1/trace/alert_+ASM1.log
```

---

## 9. 最佳实践总结

1. **网络隔离**：Public、Private、IPMI 三网分离
2. **存储冗余**：OCR/Voting Disk 使用 High Redundancy，数据使用 Normal Redundancy
3. **服务设计**：按业务模块拆分服务，配置 TAF/FAN
4. **监控告警**：监控 GCS/GES 等待、Interconnect 延迟、节点健康
5. **定期演练**：故障切换、节点驱逐、补丁升级
6. **容量规划**：预留 30% CPU/内存/存储余量，支持节点故障后的负载

---

**参考文档**：
- Oracle RAC 19c Administration and Deployment Guide
- MOS Note: 1587357.1 (RAC Best Practices)
- Oracle Clusterware Administration Guide

