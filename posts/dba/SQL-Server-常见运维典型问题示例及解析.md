# SQL Server 常见运维典型问题示例及解析

汇总生产环境中高频出现的典型问题、定位思路与解决建议，便于快速响应与知识沉淀。

## 1. 连接失败/超时
- 症状：应用超时、偶发断连
- 排查：
  - 网络与端口：`telnet <host> 1433` / 防火墙规则
  - 端点：SQL Browser、侦听器（AG）解析是否正确
  - 认证：AD/Kerberos/双机切换后的 SPN 是否正确
- 建议：固定连接字符串（含 MultiSubnetFailover）、启用连接重试

## 2. 锁与阻塞
- 症状：CPU 低但请求等待、响应慢
- 排查：
  - 等待统计：`sys.dm_os_wait_stats`
  - 活动会话：`sys.dm_exec_requests`、`sys.dm_tran_locks`
  - 语句文本：`sys.dm_exec_sql_text()`
- 示例：
```sql
SELECT r.session_id, r.status, r.wait_type, r.blocking_session_id,
       t.text
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.session_id <> @@SPID;
```
- 建议：合理事务粒度与隔离级别；热点表加索引/行版本控制（RCSI）

## 3. TempDB 压力
- 症状：写延迟高、空间暴涨
- 排查：文件数量、扩展次数、分配争用（PFS/SGAM）
- 建议：按 CPU 核数设定数据文件数量（上限 8～16）、预分配、启用 TF 1117/1118（旧版本）

## 4. 日志文件持续增长
- 排查：长事务/未备份日志；`log_reuse_wait_desc`
- 建议：及时日志备份；清理长事务；合理恢复模式

## 5. 性能回退/查询变慢
- 排查：执行计划变化、统计信息过期、参数嗅探
- 建议：更新统计信息；参数化策略；Plan Guide/Query Store 固定计划

## 6. 死锁
- 排查：扩展事件抓取 deadlock graph；定位冲突对象与顺序
- 建议：统一访问顺序；拆分事务；细化锁粒度

## 7. Agent 作业失败
- 排查：历史日志、代理账户权限、依赖网络/共享资源可用性
- 建议：失败告警、重试策略、将脚本纳入源码管理

## 8. 高可用相关
- AG 同步延迟：检查网络与事务日志吞吐；只读路由是否合理
- FCI 漂移：心跳网络与仲裁；存储可用性

## 9. 备份/还原问题
- 备份链中断、校验失败、压缩比异常
- 建议：`RESTORE VERIFYONLY`、隔离测试还原、定期演练

## 附：常用视图/DMV 速查
- 会话/请求：`sys.dm_exec_sessions`、`sys.dm_exec_requests`
- 等待：`sys.dm_os_wait_stats`
- IO：`sys.dm_io_virtual_file_stats`
- 索引：`sys.dm_db_index_usage_stats`、`sys.dm_db_index_physical_stats`



---

## 详细解决方案（逐项落地）

### 1. 连接失败/超时（Network/DNS/Kerberos）
- 诊断：
```powershell
Test-NetConnection server.contoso.com -Port 1433
Resolve-DnsName server.contoso.com
```
- 防火墙放通：
```powershell
netsh advfirewall firewall add rule name="SQL TCP 1433" dir=in action=allow protocol=TCP localport=1433
```
- Kerberos/SPN：
```powershell
setspn -L CONTOSO\svc_sql
setspn -S MSSQLSvc/server.contoso.com:1433 CONTOSO\svc_sql
klist purge -li 0x3e7   # 清系统 Kerberos 缓存（管理员）
```
- 连接字符串：在多子网 AG 使用 `MultiSubnetFailover=True`，并启用客户端重试。

### 2. 锁与阻塞（快速止血→根治）
- 快速定位阻塞链：
```sql
SELECT r.session_id, r.blocking_session_id, r.wait_type, t.text
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.session_id <> @@SPID AND (r.blocking_session_id <> 0 OR r.wait_type IS NOT NULL);
```
- 临时止血：与业务确认后 `KILL <spid>`（谨慎）。
- 根治：细化索引、拆分事务；如读多写少，开启行版本控制：
```sql
ALTER DATABASE [DB] SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
```

### 3. TempDB 压力
- 增加数据文件并预分配：
```sql
ALTER DATABASE tempdb ADD FILE (NAME=N'tempdev2', FILENAME='E:\\TempDB\\tempdb2.ndf', SIZE=8GB, FILEGROWTH=1024MB);
-- 按 CPU 核心数配置，通常上限 8~16 个文件
```
- 旧版本（<2016）可考虑 TF 1117/1118；新版本不必。

### 4. 事务日志持续增长
- 判断原因：
```sql
SELECT name, recovery_model_desc, log_reuse_wait_desc FROM sys.databases WHERE name=N'DB';
DBCC OPENTRAN('DB');
```
- 处理：
```sql
BACKUP LOG [DB] TO DISK='X:\\Backup\\DB_log.trn' WITH INIT, COMPRESSION;
-- 如空间紧急且非生产建议，谨慎收缩：
DBCC SHRINKFILE (N'DB_log', 2048);
```

### 5. 性能回退/查询变慢（计划回退）
- 更新统计信息：
```sql
EXEC sp_updatestats;
-- 关键表：UPDATE STATISTICS dbo.T WITH FULLSCAN;
```
- 启用并使用 Query Store 强制计划：
```sql
ALTER DATABASE [DB] SET QUERY_STORE = ON;
-- 在已确认的计划上执行强制：UI 或
-- EXEC sp_query_store_force_plan @query_id, @plan_id;
```

### 6. 死锁
- 启用扩展事件捕获：
```sql
CREATE EVENT SESSION [deadlock] ON SERVER
ADD EVENT sqlserver.xml_deadlock_report
ADD TARGET package0.event_file(SET filename=N'C:\\XEs\\deadlocks.xel');
ALTER EVENT SESSION [deadlock] ON SERVER STATE = START;
```
- 优化：统一对象访问顺序；必要时分库分表、降事务粒度。

### 7. Agent 作业失败
- 自检与重试：
```sql
EXEC msdb.dbo.sp_help_job @job_name=N'JobX';
EXEC msdb.dbo.sp_update_job @job_name=N'JobX', @retry_attempts=3, @retry_interval=5;
```
- 代理凭据/代理账户（需要最小权限并校验网络共享）。

### 8. 高可用（AG/FCI）
- AG 延迟定位：
```sql
SELECT DB_NAME(database_id) AS db, log_send_queue_size, redo_queue_size, synchronization_state_desc
FROM sys.dm_hadr_database_replica_states;
```
- 恢复数据移动：
```sql
ALTER DATABASE [DB1] SET HADR RESUME;
```
- FCI 漂移：
```powershell
Get-ClusterGroup "SQL Server (MSSQLSERVER)" | Move-ClusterGroup -Node NODE2
Get-ClusterLog -UseLocalTime -Destination C:\\ClusterLogs
```

### 9. 备份/还原问题
```sql
RESTORE VERIFYONLY FROM DISK='X:\\Backup\\DB_full.bak';
-- 在隔离环境验证还原链条与 STOPAT 恢复点
```
