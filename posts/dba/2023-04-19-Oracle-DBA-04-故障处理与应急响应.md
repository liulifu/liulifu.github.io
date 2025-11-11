# Oracle DBA 教学（04）故障处理与应急响应

目标：建立一套“快、准、稳”的 P1/P2 事件响应流程与实操清单，覆盖锁与资源竞争、性能劣化、数据库不可用、存储/网络故障等核心场景。

---

## 1. 值守响应与分级
- 事件分级：P1（业务中断/核心订单受阻）、P2（核心功能受影响）、P3（低优先级缺陷）。
- 响应时效：P1 5min 接单/15min 初判/30min 缓解；P2 15/30/60；明确升级链路与外部支援触发条件（供应商 SR/MOS/TAC）。
- 记录：统一工单，“时间线 + 决策 + 证据（AWR/日志/截图）”。

## 2. 常见故障场景与处置
### 2.1 数据库锁与阻塞
- 识别：
```sql
SELECT s1.sid blocker, s2.sid waiter, l1.type, l1.id1, l1.id2
FROM v$lock l1 JOIN v$session s1 ON l1.sid=s1.sid
JOIN v$lock l2 ON l1.id1=l2.id1 AND l1.id2=l2.id2 AND l1.block=1 AND l2.request>0
JOIN v$session s2 ON l2.sid=s2.sid;
```
- 处置：
  - 与业务确认，终止长事务/异常会话：`ALTER SYSTEM KILL SESSION 'sid,serial#' IMMEDIATE;`
  - 建立索引/改写 SQL/缩小批量；启用超时与锁等待告警。

### 2.2 性能突降（慢 SQL/等待飙升）
- 快照对比：AWR begin/end，关注 Top Events、SQL ordered by Elapsed/CPU、Load Profile。
- 快速缓解：
  - 通过 SQL Profile/Outline 暂时固定执行计划；
  - 降低并行度、关闭问题功能、回滚变更；
  - 扩容 TEMP/UNDO/内存，降低争用。
- 根因：统计信息异常、绑定变量窥探、计划演变、索引失效、热点块/段。

### 2.3 FRA/归档爆满导致不可写
```sql
-- 释放归档
RMAN> DELETE NOPROMPT ARCHIVELOG UNTIL TIME 'SYSDATE-1';
-- 临时扩容 FRA 或切换归档目录
ALTER SYSTEM SET db_recovery_file_dest_size = 800G SCOPE=BOTH;
```

### 2.4 控制文件/联机日志损坏
```sql
-- 控制文件
RMAN> RESTORE CONTROLFILE FROM AUTOBACKUP; ALTER DATABASE MOUNT; RECOVER DATABASE;
-- 多路复用 redo，必要时清理故障组并重建
ALTER DATABASE CLEAR UNARCHIVED LOGFILE GROUP 3;
```

### 2.5 Data Guard 延迟/中断
- 复核日志传输/应用；网络带宽与延迟；备用库磁盘/权限；告警日志错误码。
- 快速切换：必要时执行 switchover/failover，并同步回切计划。

## 3. 应急回退与变更冻结
- 建立“变更—灰度—回滚—验证”的 SOP；
- 应急回退优先级：执行计划回退 > 应用配置回退 > 数据库参数回退 > 版本/补丁回退；
- 回退验证：关键功能冒烟 + 指标回到基线 ±5%。

## 4. 取证与复盘
- 取证清单：告警日志、AWR/ASH 报告、系统日志、变更记录、监控时间线。
- 复盘模板：问题描述/影响范围/时间线/根因/修复/长期改进/责任人/验收；
- 产物沉淀：知识库文章、Playbook、巡检脚本、可观测性看板调整。

## 5. 常用 MOS 文档与工具
- ORA-600/7445 工具，Latch/Mutex 诊断，Segment Advisor/SQL Tuning Advisor；
- ADRCI 采集与压缩包：`adrci> show problem; show incident; ips create package;`；
- SR 升级术：问题摘要清晰、影响评估、已采取动作、附件齐全。

---
建议建设“演练日历”：按季度完成锁风暴、FRA 爆满、控制文件损坏、DG 切换等演练，并输出演练报告与改进项。
