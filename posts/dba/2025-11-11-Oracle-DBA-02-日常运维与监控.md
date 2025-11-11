# Oracle DBA 教学（02）日常运维与性能监控

目标：建立“可观测、可预警、可回溯”的日常运维体系，满足 7x24 稳定运行的 JD 要求。

---

## 1. 监控面板与阈值
- 主机：CPU/内存/磁盘/网络/时钟同步。
- 数据库：会话数、锁等待、日志切换、归档空间、PGA/SGA 命中率、库缓存、Parse、Top SQL、I/O 热点。
- 阈值：按业务 SLA 设置多级阈值（告警/严重/致命），联动告警渠道（邮件/IM/短信/电话）。

## 2. 内置工具与视图
- AWR/ASH：定时快照、基线、对比报告。
- OEM/Cloud Control：统一监控与告警。
- 动态视图：`v$session`、`v$sql`、`v$active_session_history`、`v$system_event`、`v$sysstat`、`dba_hist_*`。

## 3. 常用巡检脚本
1) 活跃会话与等待
```sql
SELECT sid, serial#, username, event, wait_class, state, p1text, p1 FROM v$session WHERE status='ACTIVE' AND username IS NOT NULL;
```
2) Top SQL（CPU/逻辑读）
```sql
SELECT * FROM (
  SELECT sql_id, parsing_schema_name, executions, elapsed_time/1e6 elapsed_s, cpu_time/1e6 cpu_s, buffer_gets
  FROM v$sql
  WHERE executions>0
  ORDER BY cpu_time DESC
) WHERE ROWNUM<=20;
```
3) 表空间容量
```sql
SELECT tablespace_name, total_mb, free_mb, ROUND((1-free_mb/total_mb)*100,2) used_pct FROM (
  SELECT t.name tablespace_name,
         ROUND(SUM(d.bytes)/1024/1024) total_mb,
         ROUND(SUM(CASE WHEN f.bytes IS NULL THEN 0 ELSE f.bytes END)/1024/1024) free_mb
  FROM v$tablespace t
  JOIN v$datafile d ON t.ts#=d.ts#
  LEFT JOIN (
    SELECT tablespace_name, SUM(bytes) bytes FROM dba_free_space GROUP BY tablespace_name
  ) f ON t.name=f.tablespace_name
  GROUP BY t.name
);
```
4) 归档使用率
```sql
SELECT name, percent_space_used, percent_space_reclaimable FROM v$recovery_area_usage;
```

## 4. 告警与自愈
- 告警源：OEM 事件、表空间使用率、RJ 日志频繁切换、归档爆满、等待事件飙升、连接失败次数、备份失败。
- 自愈动作：
  - 表空间阈值触发自动扩容（前提：设置上限并审计）。
  - 归档爆满触发 RMAN 归档删除策略执行。
  - 会话风暴触发连接池限流/阻断异常来源。

## 5. 7x24 稳定运行保障
- 变更窗口与冻结期管理；变更前后基线对比；灰度与回滚预案。
- 容量管理：以峰值 1.5~2 倍规划，可用区/多机房冗余。
- 运行周报：关键指标趋势、慢 SQL 列表、事件总结、风险与改进计划。

## 6. AWR/ASH 实战
- 采样与报告
```sql
-- AWR 对比
SELECT * FROM TABLE(dbms_workload_repository.awr_report_html(dbid, inst_num, begin_snap, end_snap));
-- ASH 报告
@$ORACLE_HOME/rdbms/admin/ashrpt.sql
```
- 关注：Top Events、Top SQL、SQL Elapsed vs Executions、I/O Profile、Instance Efficiency、Latch/Mutex、PGA/Temp 使用。

## 7. 值班手册（样例）
- 值班流：监控→识别→分级→确认→处置→恢复→复盘。
- MTTD/MTTR 指标；P1/P2/P3 工单响应与升级链路。
- 应急联系人清单与协同（应用/中间件/网络/存储/供应商）。

---
以上脚本可作为巡检与应急排查的“起步版”，根据业务特性扩展。
