# Oracle 21c 等待事件处理方法

本指南总结 Oracle 21c 中常见等待事件（Wait Events）的识别、分析与处置流程，覆盖会话/系统维度的定位方法，以及典型事件（I/O、日志、锁竞争、并发、网络等）的处理要点。

提示：
- 等待事件按 Wait Class 归类：User I/O、System I/O、Commit、Concurrency、Application、Configuration、Network、Scheduler、Other 等
- 分析层次：会话（v$session）→ SQL（v$sql / v$sqlarea / v$sql_monitor）→ 等待（v$session / v$active_session_history）→ 资源（存储/日志/CPU/网络）
- 许可证：使用 AWR/ASH/ADDM 需 Diagnostics/Tuning Pack 许可

---

## 1. 快速排查流程（实用模板）
1) 判断是否“CPU 绑满还是等待为主”
```sql
-- 基线：CPU vs Wait（RAC 用 GV$）
SELECT stat_name, value FROM v$sys_time_model WHERE stat_name IN ('DB CPU','DB time');
```
- 若 DB CPU ≈ DB time：偏 CPU 侧；关注 SQL 执行计划、并行度、统计信息
- 若 DB CPU 远小于 DB time：偏等待侧；继续第 2 步

2) 按 Wait Class/事件分布聚合
```sql
-- 最近 10 分钟 ASH（需许可），快速看 Wait Class TOPN
SELECT wait_class, event, COUNT(*) samples
FROM   v$active_session_history
WHERE  sample_time > SYSTIMESTAMP - INTERVAL '10' MINUTE
GROUP  BY wait_class, event
ORDER  BY samples DESC FETCH FIRST 10 ROWS ONLY;

-- 无 ASH 时用系统累计
SELECT wait_class, SUM(time_waited)/100 AS seconds
FROM   v$system_event
WHERE  wait_class <> 'Idle'
GROUP  BY wait_class ORDER BY seconds DESC;
```

3) 下钻到会话/SQL
```sql
-- 正在等待的用户会话
SELECT sid, serial#, username, event, wait_class, blocking_session, sql_id
FROM   v$session
WHERE  type='USER' AND state='WAITING'
ORDER  BY logon_time;

-- 绑定 SQL 与执行统计
SELECT sql_id, plan_hash_value, executions, buffer_gets, disk_reads, elapsed_time
FROM   v$sqlarea WHERE sql_id = :sql_id;
```

4) 结合系统资源/存储日志验证（iostat/vmstat/redo/ASM/网络）

---

## 2. 常见等待事件与处理建议

### 2.1 User I/O / System I/O
- db file sequential read（随机读，索引访问常见）
  - 现象：大量单块读，延迟较高
  - 诊断：检查 I/O 延迟（存储监控），SQL 是否存在低效索引访问（选择性差/缺失索引）
  - 处理：优化索引设计、收集统计信息、减少不必要的随机访问；存储侧降低延迟
- db file scattered read（多块读，全表/全索引用）
  - 处理：确认是否预期的全表扫描；增加高选择性索引或分区裁剪；I/O 吞吐不足时考虑分条带/并行
- direct path read/write（直通 I/O，多见于大算子/并行/临时段）
  - 处理：增大 PGA（pga_aggregate_target）或启用自动内存管理，优化并行度；TEMP 表空间扩容与高速盘；减少临时数据产生

### 2.2 Commit / Redo
- log file sync（提交等待 LGWR 同步）
  - 现象：小事务频繁提交，等待红色日志落盘
  - 诊断：v$log、v$logfile、存储延迟；应用是否过度 commit
  - 处理：
    - 减少不必要的频繁提交（批量提交/合并事务）
    - 提升重做日志设备：更低时延磁盘/专用卷，合理大小（例如 1G~4G），成员多路径
    - 避免热点 LUN；确认无过度归档/远程传输阻塞

### 2.3 Concurrency / Latch / Buffer Busy
- buffer busy waits / read by other session
  - 现象：热点块竞争
  - 处理：分区/分表降低热点；使用反向索引（reverse key）缓解插入热点；减少热点序列（缓存更大/使用多序列）
- latch: cache buffers chains
  - 处理：减少热点块访问；检查不合理的全表扫描；增大 DB_CACHE_SIZE 仅在证据充分时考虑

### 2.4 锁竞争（Application/Concurrency）
- enq: TX - row lock contention（行级锁竞争）
  - 诊断：定位 blocker 与等待链
```sql
SELECT s1.sid blocker, s2.sid waiter, ob.owner, ob.object_name, l1.id1, l1.id2
FROM   v$lock l1 JOIN v$session s1 ON l1.sid=s1.sid AND l1.block=1
JOIN   v$lock l2 ON l2.id1=l1.id1 AND l2.id2=l1.id2 AND l2.block=0
JOIN   dba_objects ob ON ob.object_id=s2.row_wait_obj#
JOIN   v$session s2 ON s2.sid=l2.sid;
```
  - 处理：尽快释放事务（提交/回滚/结束会话）；为外键列补索引，减少表级锁；调整事务边界
- enq: TM - contention（DDL/外键相关）
  - 处理：错峰 DDL；为外键创建索引；减少全表锁的 DDL 操作

### 2.5 网络与配置
- SQL*Net break/reset / more data / TCP 相关等待
  - 处理：检查应用/中间件的批量提取大小（fetch size）、网络时延与丢包；服务器/客户端 Nagle/keepalive 配置

### 2.6 RAC 相关（如适用）
- gc buffer busy / gc cr request
  - 处理：减少跨实例热点访问（分区/服务亲和/序列本地缓存）；校验 interconnect 带宽与延迟

---

### 2.7 实战案例（精简模板）
- 案例 A：log file sync 偏高（Commit/Redo）
  1) 证据收集：AWR Top Events/Redo write time、v$log 切换频率、v$sysstat（redo size/redo writes）
  2) 诊断定位：应用是否频繁小事务提交；日志设备/卷是否高时延；归档是否阻塞
  3) 处理建议：
     - 应用侧合并提交/批量提交；合理批大小
     - 调整联机日志大小（常见 1G~4G）与成员/多路径，迁移至低时延卷
     - 归档/远程传输与联机日志 IO 通道分离，避免热点 LUN
- 案例 B：TX 行级锁竞争（enq: TX - row lock contention）
  1) 证据收集：阻塞链（v$lock/v$session 关联）、受影响对象（dba_objects）
  2) 诊断定位：缺失外键索引/长事务/同一热点行更新冲突
  3) 处理建议：
     - 及时提交/回滚；必要时 kill session（谨慎）
     - 为外键补索引，减少表级锁
     - 采用去热点策略（分区/分表/业务层打散），必要时使用 SKIP LOCKED 模式
- 案例 C：db file sequential read 偏高（随机读）
  1) 证据收集：TOP SQL（v$sqlarea 按 buffer_gets）、执行计划（DBMS_XPLAN）
  2) 诊断定位：选择性差/缺失索引/过期统计信息
  3) 处理建议：
     - 修正索引与统计信息；根据访问模式优化连接顺序/驱动表
     - 存储侧降低读延迟；业务侧缓存热点维表
- 案例 D（RAC）：gc buffer busy / gc cr request
  1) 证据收集：GV$ 维度等待分布，实例间热点段
  2) 处理建议：服务亲和/分区本地化/序列本地缓存；验证 interconnect 带宽/延迟


## 3. AWR/ASH/ADDM 工具化（可选，需许可）
```sql
-- 生成 AWR 报告（快照间）
@?/rdbms/admin/awrrpt.sql
-- 生成 ASH 报告（区间）
@?/rdbms/admin/ashrpt.sql
-- ADDM（基于 AWR 快照）
@?/rdbms/admin/addmrpt.sql
```

报告阅读要点：
- Top Events / SQL Ordered by Elapsed Time / I/O Stats by Function
- Segment Statistics（热点段）/ Instance Efficiency（缓存命中率参考）

---

## 4. 监控与基线建议
- 统一采集：关键等待分布、TOP SQL、Redo 产出、I/O 延迟、TEMP 使用、锁等待链
- 告警阈值：等待总量/类目突增、log file sync 超阈、db file sequential read 延迟、归档滞后
- 变更前后：以 AWR 为基线对比（时间、负载、SQL 模式一致）

---

## 5. 标准应急清单（模板）
1) 确认范围：单实例/所有实例、单 PDB/全库、单业务/全局
2) 定位类型：CPU vs Wait；Wait Class 分布
3) 抓热点：会话/SQL/对象（段/文件/表空间）
4) 临时缓解：降并发、暂停批处理、扩容资源（TEMP/UNDO/REDO/I/O）
5) 根因修复：索引与SQL、事务边界、参数/存储/网络优化
6) 复盘沉淀：脚本化、阈值化、面板化（Grafana/Exporter）

