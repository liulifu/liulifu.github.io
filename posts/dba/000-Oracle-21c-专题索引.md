# Oracle 21c 专题索引

本页汇总 Oracle 21c DBA 常用知识与操作的专题入口，推荐阅读顺序与快速链接，便于培训、排障与变更执行。

---

## 推荐阅读顺序
1) 架构与关键组件（掌握 21c 架构全貌与诊断面）
2) 常见视图及用法（一线排障必备 SQL）
3) 数据文件增删与在线迁移（容量与存储变更）
4) 等待事件处理方法（性能与可用性问题定位）

---

## 快速链接
- 架构与关键组件：`dba/Oracle-21c-架构及关键组件.md`
- 常见视图及用法：`dba/Oracle-21c-常见视图及用法.md`
- 增加删除数据文件的方法：`dba/Oracle-21c-增加删除数据文件的方法.md`
- 等待事件处理方法：`dba/Oracle-21c-等待事件处理方法.md`

> 提示：本站前端按“文件名”排序，索引页已通过“000-”前缀置顶至 DBA 分类首位。

---

## 常用检查清单（随手查）
- 当前容器与 PDB 状态
  ```sql
  SHOW con_name; SELECT con_id, name, open_mode FROM v$containers ORDER BY con_id;
  ```
- 空间与数据文件
  ```sql
  SELECT tablespace_name, ROUND(SUM(bytes)/1024/1024) total_mb FROM dba_data_files GROUP BY tablespace_name;
  SELECT file_id, file_name, bytes/1024/1024 mb FROM dba_data_files ORDER BY file_id;
  ```
- 等待与会话热点
  ```sql
  SELECT wait_class, event, COUNT(*) samples FROM v$active_session_history
  WHERE sample_time > SYSTIMESTAMP - INTERVAL '10' MINUTE
  GROUP BY wait_class, event ORDER BY samples DESC FETCH FIRST 10 ROWS ONLY;
  ```

---

## 适用版本与注意
- 适用：Oracle Database 21c（CDB/PDB 架构，Local Undo，在线数据文件移动等特性）
- 许可：AWR/ASH/ADDM 等工具需 Diagnostics/Tuning Pack
- 生产变更：务必纳入审批、双人复核、预案/回滚、RMAN 验证与上线后监控

