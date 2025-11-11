# Oracle DBA 教学（03）数据安全与备份恢复（RMAN / 冷备 / 热备 / 灾备）

目标：建立“可恢复、可验证、可演练”的数据安全体系，满足零数据丢失（RPO≈0）与最短恢复时间（RTO）的业务目标。

---

## 1. 备份策略设计
- 目标值：
  - RPO：≤5分钟（归档+增量）；RTO：按关键业务分级（P1≤30min）。
- 备份层次：
  - 全备（周）+ 累积增量（天）+ 日志（实时）；
  - 控制文件/参数文件/密码文件；
  - 离线拷贝元数据（备份目录清单、校验摘要）。
- 存储：本地 + 远端（对象存储/NAS）+ 异地容灾；加密、分层生命周期、不可变存储（WORM）。

## 2. RMAN 基础套路
- 配置与校验
```sql
RMAN> CONFIGURE RETENTION POLICY TO RECOVERY WINDOW OF 14 DAYS;
RMAN> CONFIGURE CONTROLFILE AUTOBACKUP ON;
RMAN> CONFIGURE DEVICE TYPE DISK PARALLELISM 4;
RMAN> SHOW ALL;
```
- 例行备份（归档日志模式）
```sql
RUN {
  BACKUP AS COMPRESSED BACKUPSET INCREMENTAL LEVEL 0 DATABASE TAG 'WEEKLY_FULL';
  BACKUP ARCHIVELOG ALL NOT BACKED UP TAG 'ARCH';
  BACKUP CURRENT CONTROLFILE TAG 'CTRLFILE';
}
```
- 日常增量
```sql
RUN {
  RECOVER COPY OF DATABASE WITH TAG 'WEEKLY_FULL';
  BACKUP INCREMENTAL LEVEL 1 FOR RECOVER OF COPY WITH TAG 'WEEKLY_FULL' DATABASE;
  BACKUP ARCHIVELOG ALL NOT BACKED UP;
}
```
- 备份校验
```sql
RMAN> VALIDATE DATABASE;
RMAN> CROSSCHECK BACKUP; DELETE NOPROMPT EXPIRED BACKUP;
```

## 3. 恢复常见场景
- 误删单表（有回收站时）
```sql
FLASHBACK TABLE scott.emp TO BEFORE DROP;
```
- 误更新（有行移动/闪回数据归档）
```sql
FLASHBACK TABLE t TO TIMESTAMP (SYSTIMESTAMP - INTERVAL '5' MINUTE);
```
- 控制文件/数据文件损坏
```sql
RMAN> RESTORE CONTROLFILE FROM AUTOBACKUP; 
RMAN> ALTER DATABASE MOUNT; 
RMAN> RESTORE DATABASE; RECOVER DATABASE; 
RMAN> ALTER DATABASE OPEN RESETLOGS;
```
- 媒体故障（块损坏）
```sql
RMAN> BLOCKRECOVER DATAFILE 7 BLOCK 1234;
```

## 4. 冷备与热备要点
- 冷备（关库物理拷贝）：窗口大但风险低；适合首次“金像”备份或迁移前基线。
- 热备（联机 RMAN）：窗口小；配合归档与增量滚动；注意 FRA 空间与归档频率。

## 5. 加密、压缩与脱敏
- 备份加密：`CONFIGURE ENCRYPTION FOR DATABASE ON;` 使用钱包/主密钥管理；
- 压缩：`AS COMPRESSED BACKUPSET`；
- 脱敏：导出开发/测试数据前进行数据脱敏（字段打乱、哈希化、保型加密）。

## 6. 灾备（Data Guard）演练
- 保护模式：MAXIMUM AVAILABILITY（零/近零 RPO）与 MAXIMUM PERFORMANCE（低成本）。
- 关键检查清单：
  - 归档传输/应用延迟 < 60s；
  - 日志切换频率与网络带宽匹配；
  - 只读报表与备份在备库承载；
  - 每季度完成 switchover 与 failover 演练并留存报告。

## 7. 还原演练（建议每月）
- 选取最近一次全备 + 归档，
- 在独立测试环境完成还原，校验关键核对点：
  - 数据字典与对象数；
  - 业务关键表记录数；
  - 关键视图/存储过程可用；
  - 应用连接/读写验收。

## 8. 备份目录结构建议
```
/u02/backup/DBNAME/
  |- full/         # 周全备
  |- incr/         # 日增量
  |- arch/         # 归档
  |- ctrl/         # 控制文件
  |- logs/         # 备份日志
  |- manifest/     # 备份清单与校验
```

---
最佳实践：备份可还原才叫备份。建立“备份报告 + 恢复演练报告”的双闭环，接入季度审计。
