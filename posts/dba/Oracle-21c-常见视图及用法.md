# Oracle 21c 常见视图及用法

面向 Oracle DBA 的 21c 常用数据字典与动态性能视图速查。涵盖对象/空间/会话/SQL/日志等典型场景的查询范式与实战示例。

提示与前提：
- CDB 架构：在 CDB$ROOT 与各 PDB 中相同视图的含义不同。跨容器使用 CDB_*/CONTAINER_DATA 设置，或在每个 PDB 内分别查询。
- 访问权限：DBA_* 需具备相应权限；V$*/GV$* 通常需要 SELECT ANY DICTIONARY 或 SELECT_CATALOG_ROLE。
- RAC 环境：使用 GV$* 跨实例汇总（含 INST_ID）。

---

## 1. 视图族谱速览
- USER_*：当前用户可见对象（不用 DBA 权限）
- ALL_*：当前用户可访问对象
- DBA_*：数据库级对象/元数据（需 DBA 权限）
- V$* / GV$*：动态性能视图（实例级/集群级）
- CDB_*：容器字典视图（CDB 架构）

---

## 2. 对象与分区
- 表/索引/约束/统计信息
```sql
-- 查找指定模式的大表（按段大小）
SELECT owner, segment_name, segment_type, bytes/1024/1024 AS mb
FROM   dba_segments
WHERE  owner = 'APP'
AND    segment_type = 'TABLE'
ORDER  BY bytes DESC FETCH FIRST 20 ROWS ONLY;

-- 表分区信息
SELECT table_owner, table_name, partition_name, high_value, num_rows
FROM   dba_tab_partitions
WHERE  table_owner = 'APP'
ORDER  BY table_name, partition_position;

-- 索引与可用性
SELECT owner, index_name, table_name, status, uniqueness
FROM   dba_indexes
WHERE  owner = 'APP' AND table_name = 'ORDERS';
```

---

## 3. 表空间与数据文件/剩余空间
```sql
-- 表空间使用率（小文件表空间）
SELECT df.tablespace_name,
       ROUND(SUM(df.bytes)/1024/1024) AS total_mb,
       ROUND(SUM(fs.bytes)/1024/1024) AS free_mb,
       ROUND( (SUM(df.bytes)-SUM(fs.bytes))*100 / NULLIF(SUM(df.bytes),0), 2) AS used_pct
FROM   dba_data_files df
LEFT JOIN (
  SELECT tablespace_name, SUM(bytes) bytes FROM dba_free_space GROUP BY tablespace_name
) fs ON df.tablespace_name = fs.tablespace_name
GROUP  BY df.tablespace_name
ORDER  BY used_pct DESC;

-- 数据文件明细（含自增）
SELECT file_id, file_name, tablespace_name,
       bytes/1024/1024 AS mb,
       autoextensible, increment_by
FROM   dba_data_files
ORDER  BY tablespace_name, file_id;

-- 临时表空间与 tempfile
SELECT file_id, file_name, tablespace_name, bytes/1024/1024 AS mb
FROM   dba_temp_files;
```

---

## 4. 会话/锁/阻塞
```sql
-- 当前会话与等待（会话级）
SELECT s.sid, s.serial#, s.username, s.status, s.machine,
       s.event, s.wait_class, s.seconds_in_wait
FROM   v$session s
WHERE  s.type = 'USER'
ORDER  BY s.seconds_in_wait DESC FETCH FIRST 30 ROWS ONLY;

-- 阻塞关系（找出 blocker 与被阻塞者）
SELECT /*+ RULE */
  s1.sid AS blocker_sid, s1.serial# AS blocker_serial, s1.username AS blocker_user,
  s2.sid AS waiter_sid,  s2.serial# AS waiter_serial,  s2.username  AS waiter_user,
  l1.type, l1.id1, l1.id2
FROM  v$lock l1
JOIN  v$session s1 ON s1.sid = l1.sid
JOIN  v$lock l2 ON l2.id1 = l1.id1 AND l2.id2 = l1.id2 AND l2.block = 0
JOIN  v$session s2 ON s2.sid = l2.sid
WHERE l1.block = 1;

-- 杀会话（谨慎）：
ALTER SYSTEM KILL SESSION 'sid,serial#' IMMEDIATE;  -- 单实例
-- RAC：可加 @inst_id：'sid,serial#,@inst_id'
```

---

## 5. SQL 热点与执行统计
```sql
-- TOP SQL（逻辑读）
SELECT sql_id, plan_hash_value, buffer_gets, executions, parsing_schema_name,
       substr(sql_text,1,80) AS sql_sample
FROM   v$sqlarea
WHERE  buffer_gets > 0
ORDER  BY buffer_gets DESC FETCH FIRST 20 ROWS ONLY;

-- 最近高耗资源 SQL（ASH，需诊断许可）
SELECT sql_id, session_state, wait_class,
       COUNT(*) AS samples
FROM   v$active_session_history
WHERE  sample_time > SYSTIMESTAMP - INTERVAL '10' MINUTE
GROUP  BY sql_id, session_state, wait_class
ORDER  BY samples DESC FETCH FIRST 20 ROWS ONLY;
```

---

## 6. 日志/归档/FRA 与数据库状态
```sql
-- 实例与数据库
SELECT instance_name, status, database_status FROM v$instance;
SELECT name, dbid, open_mode, cdb FROM v$database;

-- 联机重做日志
SELECT group#, thread#, bytes/1024/1024 AS mb, members, status
FROM   v$log ORDER BY group#;
SELECT group#, member FROM v$logfile ORDER BY group#, member;

-- 归档日志与 FRA 使用
SELECT dest_name, status, target, archived_seq# FROM v$archive_dest;
SELECT name, space_limit/1024/1024 AS limit_mb, space_used/1024/1024 AS used_mb
FROM   v$recovery_file_dest;
```

---

## 7. 参数与环境
```sql
-- 参数（模糊）
SELECT name, value FROM v$parameter WHERE LOWER(name) LIKE '%pga%';
SELECT name, display_value FROM v$parameter WHERE name IN ('db_block_size','compatible');

-- PDB 列表/当前容器
SELECT con_id, name, open_mode FROM v$containers ORDER BY con_id;
SHOW con_name;  -- SQL*Plus/SQLcl
```

---

## 8. 常用排障清单（按视图定位）
- 空间问题：dba_data_files, dba_free_space, dba_segments
- 索引问题：dba_indexes, dba_ind_columns, v$sql_plan
- 锁等待：v$session, v$lock, dba_waiters, dba_blockers（若有）
- 性能热点：v$sqlarea, v$active_session_history, v$sysstat
- 日志/FRA：v$log, v$logfile, v$archived_log, v$recovery_file_dest
- 容器/CDB：cdb_* 视图，v$containers

> 提示：在生产环境执行查询请附带限定条件（owner/schema/time range），避免全库扫描带来额外负载。
