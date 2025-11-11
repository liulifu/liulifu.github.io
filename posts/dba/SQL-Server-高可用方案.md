# SQL Server 高可用方案

本文提供在企业环境中部署 SQL Server 高可用（HA）的选型建议、参考架构与实施要点，覆盖可用性组（Always On AG）、故障转移群集实例（FCI）、日志传送与复制等常见方案。

## 适用场景与目标
- 金融/医药/制造等关键业务系统
- 目标：RPO≈0～5分钟、RTO≈1～30分钟（按业务分级）
- 满足合规与审计（如审计日志、变更记录）

## 架构选型对比（简要）
- Always On 可用性组（AG）
  - 优点：读写分离、多副本、无共享存储；粒度到数据库
  - 适用：企业版最佳；标准版支持基础可用性组（Basic AG）受限
- 故障转移群集实例（FCI）
  - 优点：实例级保护；应用透明；需要共享存储（或 S2D）
  - 适用：虚拟化+共享存储场景；对存储可靠性要求高
- 日志传送（Log Shipping）
  - 优点：实现简单、成本低；延迟可控
  - 局限：只读备库需恢复模式；切换需人工/脚本
- 事务复制（Transactional Replication）
  - 优点：细粒度到表；适合分发/报表
  - 局限：不能作为严格意义 HA；运维复杂度高

## 参考架构一：AG 跨可用区/机房（推荐）
- 主库：AG Primary（同步提交）
- 同城副本：Secondary（同步提交+自动故障转移）
- 异地灾备：Secondary（异步提交）
- 侦听器（Listener）：提供稳定的连接入口
- 读写分离：只读路由到副本

## 参考架构二：FCI + AG（混合）
- 底层用 FCI 提供实例级可用性，上层用 AG 提供跨站点多副本与读写分离
- 适用于已有共享存储/对实例级保护有强需求的环境

## 版本与许可要点
- 企业版：完整 AG 特性（多数据库、并行等）
- 标准版：Basic AG（单数据库、限制多）或使用 FCI
- 需核对 OS 与 SQL Server 版本兼容矩阵

## 网络与存储要求
- 同步提交副本：网络延迟建议 < 2ms
- 带宽规划：按业务峰值写入量×副本数预留
- 存储：建议独立数据/日志盘；启用写入缓存的持久化策略；开启即时文件初始化

## 部署步骤（AG 示例）
1. 环境准备：域控、DNS、主机名、时间同步、补丁
2. 安装 SQL Server 与最新 CU；启用必要功能（HADR）
3. 配置 Windows 故障转移群集（WSFC）
4. 新建可用性组与副本；设置同步/异步提交及首选项
5. 配置侦听器（Listener）与只读路由
6. 验证切换与回切，编写演练记录

## 监控与告警
- 可用性组健康：同步状态、队列延迟、自动/手动故障转移结果
- 资源：CPU/内存/IO/网络；TempDB/日志增长
- 备份：完整/差异/日志备份状态与链完整性

## 备份与恢复策略（与 HA 协同）
- 主库/辅库：根据可读性配置备份职责
- 恢复演练：季度/半年度，记录 RTO/RPO 实测数据

## 运维 Checklist（摘）
- [ ] 定期检查 AG 同步延迟与队列
- [ ] 核对备份是否可还原
- [ ] 更新与补丁分批次滚动实施
- [ ] 变更走 CAB/变更单留痕

## 参考
- Microsoft Docs：Always On availability groups, FCI, Log Shipping, Replication
- SQL Server Best Practices & Field Notes



## 命令行搭建示例（Always On AG）

> 以下为在 Windows/WSFC 环境中使用 PowerShell + T-SQL 的最简可复现脚本（请按实际主机名、IP、磁盘路径与账户替换）。

### 1) Windows 先决条件与 WSFC
```powershell
# 以管理员 PowerShell 运行（所有节点）
Install-WindowsFeature Failover-Clustering -IncludeManagementTools

# 验证并创建群集（任一节点执行）
Test-Cluster -Node NODE1,NODE2
New-Cluster -Name SQLCL -Node NODE1,NODE2 -StaticAddress 10.0.0.10 -NoStorage
Set-ClusterQuorum -NodeAndFileShareMajority "\\FS\Quorum"
```

### 2) 启用 AlwaysOn（各 SQL 实例）
```powershell
# 需安装 SqlServer PowerShell 模块（若未安装）
# Install-Module SqlServer -Force
Enable-SqlAlwaysOn -ServerInstance "NODE1" -Force
Enable-SqlAlwaysOn -ServerInstance "NODE2" -Force
Restart-Service MSSQLSERVER
```

### 3) 创建 HADR 端点（各副本执行）
```sql
USE master;
IF NOT EXISTS (SELECT 1 FROM sys.endpoints WHERE name = N'Hadr_endpoint')
BEGIN
    CREATE ENDPOINT [Hadr_endpoint] STATE=STARTED
    AS TCP (LISTENER_PORT = 5022)
    FOR DATA_MIRRORING (
        ROLE = ALL,
        ENCRYPTION = REQUIRED ALGORITHM AES,
        AUTHENTICATION = WINDOWS
    );
END
```

### 4) 创建可用性组（自动播种示例，主副本执行）
```sql
-- 前置：库应为 FULL 恢复模式，并做一次完整备份
ALTER DATABASE [DB1] SET RECOVERY FULL;
BACKUP DATABASE [DB1] TO DISK = N'\\\\backup\\DB1_full.bak' WITH INIT, COMPRESSION;

CREATE AVAILABILITY GROUP [AG1]
WITH (
    AUTOMATED_BACKUP_PREFERENCE = PRIMARY,
    DB_FAILOVER = ON,
    CLUSTER_TYPE = WSFC,
    AUTOMATIC_SEEDING = ON
)
FOR DATABASE [DB1]
REPLICA ON
    N'NODE1' WITH (
        ENDPOINT_URL = N'TCP://node1:5022',
        AVAILABILITY_MODE = SYNCHRONOUS_COMMIT,
        FAILOVER_MODE = AUTOMATIC,
        SEEDING_MODE = AUTOMATIC,
        SECONDARY_ROLE (ALLOW_CONNECTIONS = ALL)
    ),
    N'NODE2' WITH (
        ENDPOINT_URL = N'TCP://node2:5022',
        AVAILABILITY_MODE = SYNCHRONOUS_COMMIT,
        FAILOVER_MODE = AUTOMATIC,
        SEEDING_MODE = AUTOMATIC,
        SECONDARY_ROLE (ALLOW_CONNECTIONS = ALL)
    );
```

### 5) 加入可用性组与启动数据移动（次要副本）
```sql
ALTER AVAILABILITY GROUP [AG1] JOIN;
-- 自动播种将自动还原并开始同步；若手动播种，则：
-- RESTORE DATABASE [DB1] FROM DISK='...' WITH NORECOVERY;
-- ALTER DATABASE [DB1] SET HADR AVAILABILITY GROUP = [AG1];
```

### 6) 配置 Listener 与只读路由（主副本）
```sql
-- 监听器（示例使用单 IP）
ALTER AVAILABILITY GROUP [AG1]
ADD LISTENER N'AG1-LST'
( WITH IP ((N'10.0.0.11', N'255.255.255.0')), PORT=1433 );

-- 只读路由（根据环境调整 URL 与顺序）
ALTER AVAILABILITY GROUP [AG1]
MODIFY REPLICA ON N'NODE1'
WITH (PRIMARY_ROLE (READ_ONLY_ROUTING_LIST = (('NODE2'))));

ALTER AVAILABILITY GROUP [AG1]
MODIFY REPLICA ON N'NODE2'
WITH (READ_ONLY_ROUTING_URL = N'TCP://node2.contoso.com:1433');
```

### 7) 故障转移/回切演练
```sql
-- 在同步健康的次要副本上执行
ALTER AVAILABILITY GROUP [AG1] FAILOVER;
-- 验证后按需回切
```

---

## FCI（故障转移群集实例）简要命令
```powershell
# WSFC 已就绪后，准备共享磁盘（或 S2D）并分配给群集
Install-WindowsFeature Failover-Clustering -IncludeManagementTools
New-Cluster -Name SQL-FCI -Node NODE1,NODE2 -StaticAddress 10.0.0.20
# 安装 SQL FCI（在每个节点运行 setup，参数示例）
"C:\\Setup\\setup.exe" /QS /ACTION=InstallFailoverCluster /FEATURES=SQLENGINE ^
  /INSTANCENAME=MSSQLSERVER /FAILOVERCLUSTERNETWORKNAME="SQL-FCI" ^
  /SQLSVCACCOUNT="DOMAIN\\svc_sql" /SQLSVCPASSWORD="<password>"
# 为第二节点加节点
"C:\\Setup\\setup.exe" /QS /ACTION=AddNode /INSTANCENAME=MSSQLSERVER
```

---

## 日志传送（Log Shipping）最小脚本
```sql
-- 主库：注册日志传送（示例，按需调整路径与时间）
EXEC msdb.dbo.sp_add_log_shipping_primary_database
    @database = N'DB1',
    @backup_directory = N'\\\\backup\\DB1',
    @backup_share = N'\\\\backup\\DB1',
    @backup_job_name = N'LSBackup_DB1',
    @backup_retention_period = 4320, -- 3 天
    @backup_compression = 1;
-- 备库：注册来源与还原参数
EXEC msdb.dbo.sp_add_log_shipping_secondary_primary
    @primary_server = N'NODE1', @primary_database = N'DB1',
    @backup_source_directory = N'\\\\backup\\DB1';
EXEC msdb.dbo.sp_add_log_shipping_secondary_database
    @secondary_database = N'DB1',
    @restore_mode = 1,       -- 常开只读：STANDBY 模式
    @disconnect_users = 1;
```

## 事务复制（Transactional Replication）最小脚本
```sql
-- 发布端（发布库需启用发布）
EXEC sp_replicationdboption @dbname=N'DB1', @optname=N'publish', @value=true;
EXEC sp_addpublication @publication=N'pub_DB1', @status=N'active', @sync_method=N'concurrent';
EXEC sp_addpublication_snapshot @publication=N'pub_DB1';
EXEC sp_addarticle @publication=N'pub_DB1', @article=N'dbo.T1', @source_owner=N'dbo', @source_object=N'T1';
-- 订阅端
EXEC sp_addsubscription @publication=N'pub_DB1', @subscriber=N'NODE2', @destination_db=N'DB1', @subscription_type=N'Push';
```
