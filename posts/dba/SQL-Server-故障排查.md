# SQL Server 故障排查

提供一份“先标准化操作、后专项深入”的排错流程，覆盖连接、资源、查询、存储以及高可用组件。

## 一、分类与优先级
- P1：全站不可用/数据损坏/RPO 风险
- P2：核心功能不可用/大面积性能下降
- P3：局部影响/单租户问题

## 二、通用排查流程
1. 现象确认：谁/何时/范围/近因
2. 快速止血：读写切换、限流、回滚变更
3. 指标收集：CPU/内存/IO/网络、连接数、等待类型
4. 划分边界：应用/网络/数据库/存储
5. 复盘与预防：根因、改进项、文档

## 三、关键指标与工具
- 等待类型：`sys.dm_os_wait_stats`
- 热点请求：`sys.dm_exec_requests` + `sys.dm_exec_sql_text`
- 资源统计：PerfMon 计数器、sp_Blitz 系列
- 计划与回退：Query Store、强制计划

## 四、典型场景
### 1. 连接不上/频繁超时
- 检查 DNS/Listener 解析；端口/防火墙；SPN/Kerberos
- 连接字符串：`MultiSubnetFailover=True`（AG 多子网）

### 2. CPU 飙高
- 抓热点 SQL、查看执行计划；统计信息与索引策略；参数嗅探

### 3. IO 延迟高/日志打满
- `sys.dm_io_virtual_file_stats`、存储告警；长事务与批量写入窗口

### 4. TempDB 争用
- 多文件、预分配、文件放置与盘型

### 5. AG 同步延迟/自动切换失败
- 网络与带宽、日志生成速率、只读路由配置；WSFC 仲裁与心跳

## 五、应急清单（示例）
- [ ] 准备“只读降级/切换”预案与演练记录
- [ ] 关键 DMV/脚本一键收集包
- [ ] 备份/还原链路与演练计划
- [ ] 变更回滚预案

## 附录：采集脚本示例
```sql
-- 等待统计 Top N
SELECT TOP 20 * FROM sys.dm_os_wait_stats ORDER BY wait_time_ms DESC;

-- 活动请求与语句
SELECT r.session_id, r.status, r.wait_type, t.text
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.session_id <> @@SPID;
```



---

## 操作手册（可直接执行/按需修改）

### 通用一键采集（应急首选）
```sql
-- CPU/等待/阻塞/会话/IO 关键信息
SELECT TOP 20 * FROM sys.dm_os_wait_stats ORDER BY wait_time_ms DESC;
SELECT r.session_id, r.status, r.wait_type, r.blocking_session_id, t.text
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.session_id <> @@SPID;
SELECT DB_NAME(database_id) AS db, io_stall_read_ms, io_stall_write_ms
FROM sys.dm_io_virtual_file_stats(NULL, NULL);
```

## 典型故障案例与处理

### 案例 1：错误 9002（事务日志已满）
- 现象：数据库可读但无法写入；日志文件急剧增长
- 判断：
```sql
SELECT name, recovery_model_desc, log_reuse_wait_desc FROM sys.databases WHERE name=N'DB';
DBCC OPENTRAN('DB');
```
- 处理步骤：
```sql
-- 1) 释放空间或扩容磁盘
-- 2) 备份事务日志（FULL/BULK_LOGGED 模式）
BACKUP LOG [DB] TO DISK='X:\\Backup\\DB_log_9002.trn' WITH INIT, COMPRESSION;
-- 3) 缓解：谨慎收缩
DBCC SHRINKFILE (N'DB_log', 2048);
-- 4) 无法备份且紧急：临时 SIMPLE（谨慎），后尽快改回 FULL 并做完整备份
ALTER DATABASE [DB] SET RECOVERY SIMPLE;
DBCC SHRINKFILE (N'DB_log', 1024);
ALTER DATABASE [DB] SET RECOVERY FULL;
BACKUP DATABASE [DB] TO DISK='X:\\Backup\\DB_full_afterSimple.bak' WITH INIT, COMPRESSION;
```

### 案例 2：无法登录（SSPI/Kerberos 失败）
- 现象：The target principal name is incorrect / Cannot generate SSPI context
- 处理：
```powershell
setspn -L CONTOSO\svc_sql
setspn -S MSSQLSvc/sql.contoso.com:1433 CONTOSO\svc_sql
klist purge -li 0x3e7
Restart-Service MSSQLSERVER
```
- 应用侧可临时改用 `TrustServerCertificate=True`（仅短期应急）。

### 案例 3：AG 同步卡住/数据移动暂停
- 判断：
```sql
SELECT DB_NAME(database_id) db, synchronization_state_desc, log_send_queue_size, redo_queue_size, is_suspended
FROM sys.dm_hadr_database_replica_states;
```
- 处理：
```sql
ALTER AVAILABILITY GROUP [AG1] MODIFY REPLICA ON N'NODE1' WITH (AVAILABILITY_MODE = ASYNCHRONOUS_COMMIT);
ALTER DATABASE [DB1] SET HADR RESUME;
```

### 案例 4：DBCC CHECKDB 报错（页损坏/一致性问题）
- 优先恢复：
```sql
RESTORE DATABASE [DB] FROM DISK='X:\\Backup\\DB_full.bak' WITH NORECOVERY;
RESTORE LOG [DB] FROM DISK='X:\\Backup\\DB_log.trn' WITH RECOVERY;
```
- 无可用备份（最后手段）：
```sql
ALTER DATABASE [DB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DBCC CHECKDB('DB', REPAIR_REBUILD);
-- 仍失败且确认可接受数据丢失风险：
-- DBCC CHECKDB('DB', REPAIR_ALLOW_DATA_LOSS);
ALTER DATABASE [DB] SET MULTI_USER;
```

### 案例 5：磁盘打满（含 TempDB）
- 处理：
```sql
-- 移动 TempDB 到新盘（需重启服务生效）
USE master;
ALTER DATABASE tempdb MODIFY FILE (NAME=N'tempdev', FILENAME='F:\\TempDB\\tempdb.mdf');
ALTER DATABASE tempdb MODIFY FILE (NAME=N'templog', FILENAME='F:\\TempDB\\templog.ldf');
-- 切换错误日志文件（不释放磁盘，但切换到新文件）
EXEC sp_cycle_errorlog;
```
- 释放空间：迁移备份目录、清理历史备份/转储、压缩与归档。

## 小结
- 先止血再根因；所有变更纳入变更单与演练记录；关键动作前后做快照/备份。
