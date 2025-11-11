# Oracle DBA 教学（01）部署与架构设计

适用读者：初/中级 DBA、架构师、SRE
目标：基于 JD 的要求，给出一套从规划、安装到高可用架构设计的可落地指南，可直接用于生产实施与演练。

---

## 1. 规划与前置条件
- 版本选择：Oracle 19c 为长期支持版（LTS），生产首选；12c/21c 需结合兼容性评估。
- 平台与文件系统：RHEL/CentOS/OL；建议 ASM + OMF；归档模式开启（ARCHIVELOG）。
- 资源基线：CPU/内存/磁盘/网络冗余；时钟同步（NTP/Chrony）；主机名与 DNS 解析一致。
- 安全基线：最小权限账号、禁用 root 直登、SSH key、审计开启、补丁与漏洞基线。

## 2. 安装流程（单实例）
1) 创建安装用户与组（oracle、oinstall、dba）并配置 limits 与内核参数。
2) 安装数据库软件（GUI 或静默）。示例（静默）：

```bash
./runInstaller -silent \
  oracle.install.option=INSTALL_DB_SWONLY \
  UNIX_GROUP_NAME=oinstall \
  INVENTORY_LOCATION=/u01/app/oraInventory \
  ORACLE_HOME=/u01/app/oracle/product/19.3.0/dbhome_1 \
  ORACLE_BASE=/u01/app/oracle \
  oracle.install.db.ConfigureAsContainerDB=true \
  DECLINE_SECURITY_UPDATES=true
```

3) 建库（DBCA 静默示例）：
```bash
$ORACLE_HOME/bin/dbca -silent -createDatabase \
  -gdbname prodc -sid prodc -createAsContainerDatabase true \
  -numberOfPDBs 1 -pdbName pdb1 -pdbAdminPassword 'Strong#Pass1' \
  -sysPassword 'Strong#Sys1' -systemPassword 'Strong#Sys1' \
  -templateName General_Purpose.dbc -characterSet AL32UTF8 \
  -memoryMgmtType auto_sga -totalMemory 8192 \
  -redoLogFileSize 1024 -emConfiguration NONE
```

4) 基础检查：归档、闪回区、备份目录、监听配置、字符集、nls_lang、时区等。

## 3. 架构设计
### 3.1 表空间与数据文件
- SYSTEM/SYSAUX/UNDOTBS/TEMP 独立；业务表空间按模块或生命周期拆分；大对象单独表空间。
- 使用 OMF + ASM，减少手工路径管理；启用自动扩展，设置上限，定期容量评估。

### 3.2 逻辑结构与多租户
- CDB+PDB 架构：核心库做 CDB，按系统隔离至不同 PDB；利用 PDB 级克隆与刷新实现灰度与回归测试。
- 参数模板：CDB 层设置 SGA/PGA、并行、审计；PDB 层设置时区、资源组、连接限制。

### 3.3 高可用与灾备（RAC / Data Guard）
- RAC：同城多节点，无共享存储则采用 ASM + 多路径；注意 interconnect 与心跳网络冗余。
- Data Guard：异地只读/物理备库，RPO/RTO 由网络与保护模式决定（MAXPROTECT/AVAIL/PERFORMANCE）。
- 切换与演练：每季度进行 switchover 与 failover 演练并留存报告。

### 3.4 归档、闪回与日志
- 归档放独立磁盘组，设置 `DB_RECOVERY_FILE_DEST` 与配额；
- 打开 Flashback Database 以支撑快速回滚；
- REDO/UNDO 评估：高并发系统适当增大日志文件与组数，减少日志切换。

## 4. 升级与迁移路线
- 原地升级：DBUA 或 `catctl.pl`；版本跨越大时建议旁路迁移。
- 逻辑迁移：`expdp/impdp`、Transportable Tablespace；
- 物理迁移：`RMAN DUPLICATE`、备份还原 + 重做应用；
- 停机窗口优化：并行导入、分批迁移、双写/变更冻结、只读切换。

## 5. 验收与基线
- 健康检查：告警日志/无 invalid object/AWR 关键等待在基线范围内/`db_block_change_tracking` 打开等。
- 指标基线：CPU/内存/I/O/等待事件/事务吞吐/慢 SQL 前 20；保存为“上线基线”文档。
- 文档化：安装记录、参数清单、拓扑图、容量评估、回滚方案、联系人与应急表。

## 6. 最佳实践清单（Checklist）
- [ ] CDB+PDB 架构与资源配额完成
- [ ] 归档与闪回区启用且容量留有 7 天冗余
- [ ] 备份策略（全+增量+归档）与恢复演练通过
- [ ] 审计/密码策略/最小权限/密钥管理到位
- [ ] AWR/ASH 许可合规并开启采样/报告留存
- [ ] RAC/DG 设计评审与季度演练计划

---
参考：Oracle 19c 文档、MOS、最佳实践白皮书。
