# Oracle 21c 架构及关键组件

本文概览 Oracle 21c 的容器化数据库（CDB/PDB）架构、内存与进程、存储结构、恢复机制与诊断组件，配以常用检查命令，便于快速定位与日常巡检。

---

## 1. 容器数据库（CDB/PDB）
- 架构要点
  - CDB$ROOT + 多个 PDB；21c 缺省启用本地 UNDO（Local Undo）
  - 数据字典：CDB 级 + PDB 级；CDB_* 视图汇总各容器信息
  - 参数可分 CDB/PDB 两级设置（ALTER SYSTEM SCOPE=SPFILE / ALTER SYSTEM SET ... CONTAINER=CURRENT/ALL）
- 常用检查
```sql
-- 容器与状态
SELECT con_id, name, open_mode FROM v$containers ORDER BY con_id;
SHOW con_name; -- 当前容器

-- 跨容器查询（需容器数据权限）
SELECT con_id, username, account_status FROM cdb_users WHERE username='APP';
```

---

## 2. 内存结构（SGA/PGA/AMM）
- SGA：
  - Database Buffer Cache（数据块缓存）
  - Shared Pool（库缓存/数据字典缓存）
  - Large Pool（备份/并行）
  - Redo Log Buffer（重做日志缓冲）
  - In-Memory Column Store（可选，需许可）
- PGA：会话/进程私有内存（排序/哈希/游标等）
- 管理参数
```sql
-- 自动内存（AMM/ASMM）相关参数
SELECT name, value FROM v$parameter WHERE name IN (
  'memory_target','sga_target','pga_aggregate_target','inmemory_size');
```

---

## 3. 后台进程（典型）
- 关键进程
  - DBWn：缓冲写盘
  - LGWR：写重做日志
  - CKPT：检查点
  - SMON/PMON：系统/进程监控
  - ARCn：归档
  - MMON/MMNL：性能统计与 AWR 采集
  - LREG/VKTM：监听注册/时钟
  - RVWR：闪回日志
- 检查与统计
```sql
SELECT pname, program FROM v$process WHERE background='1' ORDER BY pname;
```

---

## 4. 物理存储结构
- 组成：数据文件（.dbf/+ASM）、控制文件（controlfile）、联机重做日志（redo）、临时文件（tempfile）、闪回恢复区（FRA，可选）
- 表空间类型：Smallfile / Bigfile；本地管理（LMT）与 ASSM 位图管理
- UNDO：21c 建议使用本地 UNDO，每个 PDB 可拥有独立 UNDO 表空间
- 常用检查
```sql
-- 数据文件/表空间
SELECT tablespace_name, file_id, file_name, bytes/1024/1024 mb FROM dba_data_files ORDER BY tablespace_name, file_id;
SELECT tablespace_name, contents, status FROM dba_tablespaces ORDER BY tablespace_name;

-- 重做与归档
SELECT group#, bytes/1024/1024 mb, status FROM v$log ORDER BY group#;
SELECT dest_name, status, target FROM v$archive_dest WHERE target IS NOT NULL;
```

---

## 5. 恢复与备份（FRA/RMAN/闪回）
- FRA（Fast Recovery Area）：集中管理归档/备份片/闪回日志
- RMAN：物理备份/恢复的标准工具
- 闪回技术：闪回查询/闪回表/闪回数据库（需开启日志）
- 常用检查
```sql
-- FRA 空间
SELECT name, space_limit/1024/1024 AS limit_mb, space_used/1024/1024 AS used_mb FROM v$recovery_file_dest;

-- 归档切换频率（近若干分钟）
SELECT COUNT(*) FROM v$archived_log WHERE completion_time > SYSDATE - 1/24/6; -- 10 分钟
```

---

## 6. 性能与诊断（AWR/ASH/ADR）
- AWR/ASH（需诊断包许可）：
  - AWR：历史快照，DBA_HIST_* 视图
  - ASH：活动会话采样，V$ACTIVE_SESSION_HISTORY
- ADR（Automatic Diagnostic Repository）：统一诊断仓库，包含 alert 日志/trace
- 常用检查
```sql
-- 最近热点等待（ASH 示例）
SELECT wait_class, event, COUNT(*) samples
FROM   v$active_session_history
WHERE  sample_time > SYSTIMESTAMP - INTERVAL '10' MINUTE
GROUP  BY wait_class, event ORDER BY samples DESC FETCH FIRST 10 ROWS ONLY;

-- ADR 基本路径（SQL*Plus）
SHOW parameter diagnostic_dest;
```

---

## 7. 高可用与扩展能力概览
- RAC：多实例共享存储扩展计算能力与高可用（GV$ 视图观察全局等待/缓存一致性）
- Data Guard：物理/逻辑备库容灾；可读备库（Active Data Guard，需许可）
- Sharding：分片扩展（特定场景）

---

## 8. 管理工具与常见基线
- 工具：SQL*Plus / SQLcl、RMAN、Data Pump、OEM Cloud Control/Express
- 基线建议：
  - 参数/实例/日志容量/表空间剩余/备份作业/告警日志每日采集
  - 关键业务 SQL 的执行计划与统计信息定期核对
  - 变更前后快照（AWR）与回滚预案

> 提示：以上检查 SQL 建议封装为巡检脚本，结合任务计划（crontab/Scheduler）与告警通道统一治理。
