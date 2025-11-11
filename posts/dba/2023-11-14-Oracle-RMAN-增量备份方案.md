# Oracle RMAN 增量备份方案

适用读者：Oracle DBA、运维工程师
目标：提供 Oracle RMAN 增量备份的完整方案，包括备份策略、恢复演练、性能优化与自动化脚本。

---

## 1. RMAN 备份概述

### 1.1 备份类型
| 备份类型 | 说明 | 备份内容 | 恢复速度 | 存储空间 |
|---------|------|---------|---------|---------|
| 完全备份 (Full) | 备份所有数据块 | 所有已使用的数据块 | 快 | 大 |
| 增量备份 Level 0 | 等同于完全备份 | 所有已使用的数据块 | 快 | 大 |
| 增量备份 Level 1 差异 | 备份自上次 Level 0 后的变更 | 变更的数据块 | 中 | 中 |
| 增量备份 Level 1 累积 | 备份自上次 Level 0 后的所有变更 | 所有变更的数据块 | 中 | 中 |
| 归档日志备份 | 备份归档日志 | 归档日志文件 | - | 小 |

### 1.2 备份策略对比
| 策略 | 备份频率 | 恢复时间 | 存储需求 | 适用场景 |
|------|---------|---------|---------|---------|
| 每日完全备份 | 每天 | 最快 | 最大 | 小型数据库（< 100GB） |
| 周完全 + 日增量 | 周日 Level 0，周一至周六 Level 1 | 中 | 中 | 中型数据库（100GB-1TB） |
| 月完全 + 周累积 + 日差异 | 月初 Level 0，每周累积，每日差异 | 慢 | 小 | 大型数据库（> 1TB） |

### 1.3 推荐策略（周完全 + 日增量差异）
```plaintext
周日：Level 0 增量备份（完全备份）
周一：Level 1 差异增量备份（自周日以来的变更）
周二：Level 1 差异增量备份（自周一以来的变更）
周三：Level 1 差异增量备份（自周二以来的变更）
周四：Level 1 差异增量备份（自周三以来的变更）
周五：Level 1 差异增量备份（自周四以来的变更）
周六：Level 1 差异增量备份（自周五以来的变更）

每天：归档日志备份（每小时或实时）

恢复场景：
- 周三故障：恢复 Level 0（周日）+ Level 1（周一）+ Level 1（周二）+ 归档日志
```

---

## 2. RMAN 配置

### 2.1 连接 RMAN
```bash
# 本地连接
rman target /

# 远程连接
rman target sys/Oracle123#@ORCL

# 连接到 Catalog（可选）
rman target sys/Oracle123#@ORCL catalog rman/Rman123#@RMANCAT
```

### 2.2 配置 RMAN 参数
```sql
-- 查看当前配置
SHOW ALL;

-- 配置备份保留策略（保留7天）
CONFIGURE RETENTION POLICY TO RECOVERY WINDOW OF 7 DAYS;

-- 配置默认设备类型（磁盘）
CONFIGURE DEFAULT DEVICE TYPE TO DISK;

-- 配置备份路径
CONFIGURE CHANNEL DEVICE TYPE DISK FORMAT '/u01/backup/rman/%U';

-- 配置并行度（4个通道）
CONFIGURE DEVICE TYPE DISK PARALLELISM 4;

-- 配置自动备份控制文件
CONFIGURE CONTROLFILE AUTOBACKUP ON;
CONFIGURE CONTROLFILE AUTOBACKUP FORMAT FOR DEVICE TYPE DISK TO '/u01/backup/rman/ctl_%F';

-- 配置备份优化（跳过未变更的只读文件）
CONFIGURE BACKUP OPTIMIZATION ON;

-- 配置压缩（节省空间）
CONFIGURE COMPRESSION ALGORITHM 'MEDIUM';

-- 配置归档日志删除策略
CONFIGURE ARCHIVELOG DELETION POLICY TO BACKED UP 1 TIMES TO DISK;

-- 配置快照控制文件位置
CONFIGURE SNAPSHOT CONTROLFILE NAME TO '/u01/backup/rman/snapcf_ORCL.f';
```

---

## 3. 备份脚本

### 3.1 Level 0 增量备份（周日）
```bash
#!/bin/bash
# rman_level0_backup.sh

export ORACLE_SID=ORCL
export ORACLE_HOME=/u01/app/oracle/product/19.3.0/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH

BACKUP_DIR=/u01/backup/rman
LOG_DIR=/u01/backup/logs
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mkdir -p $LOG_DIR

rman target / <<EOF > $LOG_DIR/level0_backup_$DATE.log
RUN {
  ALLOCATE CHANNEL ch1 DEVICE TYPE DISK FORMAT '$BACKUP_DIR/level0_%U';
  ALLOCATE CHANNEL ch2 DEVICE TYPE DISK FORMAT '$BACKUP_DIR/level0_%U';
  ALLOCATE CHANNEL ch3 DEVICE TYPE DISK FORMAT '$BACKUP_DIR/level0_%U';
  ALLOCATE CHANNEL ch4 DEVICE TYPE DISK FORMAT '$BACKUP_DIR/level0_%U';
  
  BACKUP INCREMENTAL LEVEL 0 
    DATABASE 
    TAG 'LEVEL0_BACKUP'
    PLUS ARCHIVELOG DELETE INPUT;
  
  BACKUP CURRENT CONTROLFILE FORMAT '$BACKUP_DIR/ctl_level0_%U';
  
  RELEASE CHANNEL ch1;
  RELEASE CHANNEL ch2;
  RELEASE CHANNEL ch3;
  RELEASE CHANNEL ch4;
}

DELETE NOPROMPT OBSOLETE;
DELETE NOPROMPT EXPIRED BACKUP;

CROSSCHECK BACKUP;
CROSSCHECK ARCHIVELOG ALL;

EXIT;
EOF

# 检查备份是否成功
if [ $? -eq 0 ]; then
    echo "Level 0 backup completed successfully at $DATE" | mail -s "RMAN Level 0 Backup Success" dba@example.com
else
    echo "Level 0 backup failed at $DATE" | mail -s "RMAN Level 0 Backup FAILED" dba@example.com
fi
```

### 3.2 Level 1 差异增量备份（周一至周六）
```bash
#!/bin/bash
# rman_level1_backup.sh

export ORACLE_SID=ORCL
export ORACLE_HOME=/u01/app/oracle/product/19.3.0/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH

BACKUP_DIR=/u01/backup/rman
LOG_DIR=/u01/backup/logs
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mkdir -p $LOG_DIR

rman target / <<EOF > $LOG_DIR/level1_backup_$DATE.log
RUN {
  ALLOCATE CHANNEL ch1 DEVICE TYPE DISK FORMAT '$BACKUP_DIR/level1_%U';
  ALLOCATE CHANNEL ch2 DEVICE TYPE DISK FORMAT '$BACKUP_DIR/level1_%U';
  ALLOCATE CHANNEL ch3 DEVICE TYPE DISK FORMAT '$BACKUP_DIR/level1_%U';
  ALLOCATE CHANNEL ch4 DEVICE TYPE DISK FORMAT '$BACKUP_DIR/level1_%U';
  
  BACKUP INCREMENTAL LEVEL 1 
    DATABASE 
    TAG 'LEVEL1_DIFFERENTIAL'
    PLUS ARCHIVELOG DELETE INPUT;
  
  BACKUP CURRENT CONTROLFILE FORMAT '$BACKUP_DIR/ctl_level1_%U';
  
  RELEASE CHANNEL ch1;
  RELEASE CHANNEL ch2;
  RELEASE CHANNEL ch3;
  RELEASE CHANNEL ch4;
}

DELETE NOPROMPT OBSOLETE;
DELETE NOPROMPT EXPIRED BACKUP;

CROSSCHECK BACKUP;
CROSSCHECK ARCHIVELOG ALL;

EXIT;
EOF

# 检查备份是否成功
if [ $? -eq 0 ]; then
    echo "Level 1 backup completed successfully at $DATE" | mail -s "RMAN Level 1 Backup Success" dba@example.com
else
    echo "Level 1 backup failed at $DATE" | mail -s "RMAN Level 1 Backup FAILED" dba@example.com
fi
```

### 3.3 归档日志备份（每小时）
```bash
#!/bin/bash
# rman_archivelog_backup.sh

export ORACLE_SID=ORCL
export ORACLE_HOME=/u01/app/oracle/product/19.3.0/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH

BACKUP_DIR=/u01/backup/rman
LOG_DIR=/u01/backup/logs
DATE=$(date +%Y%m%d_%H%M%S)

rman target / <<EOF > $LOG_DIR/archivelog_backup_$DATE.log
RUN {
  ALLOCATE CHANNEL ch1 DEVICE TYPE DISK FORMAT '$BACKUP_DIR/arch_%U';
  
  BACKUP ARCHIVELOG ALL DELETE INPUT;
  
  RELEASE CHANNEL ch1;
}

DELETE NOPROMPT OBSOLETE;
CROSSCHECK ARCHIVELOG ALL;

EXIT;
EOF
```

---

## 4. Crontab 定时任务

```bash
# 编辑 crontab
crontab -e

# 添加定时任务
# 周日凌晨2点：Level 0 备份
0 2 * * 0 /u01/scripts/rman_level0_backup.sh

# 周一至周六凌晨2点：Level 1 备份
0 2 * * 1-6 /u01/scripts/rman_level1_backup.sh

# 每小时：归档日志备份
0 * * * * /u01/scripts/rman_archivelog_backup.sh

# 每天凌晨4点：清理过期备份
0 4 * * * /u01/scripts/rman_cleanup.sh
```

---

## 5. 恢复操作

### 5.1 完全恢复（数据库完整）
```bash
# 场景：数据文件损坏，但控制文件和归档日志完整

rman target /

# 关闭数据库
SHUTDOWN IMMEDIATE;

# 启动到 MOUNT 状态
STARTUP MOUNT;

# 恢复数据库
RESTORE DATABASE;
RECOVER DATABASE;

# 打开数据库
ALTER DATABASE OPEN;

EXIT;
```

### 5.2 不完全恢复（恢复到指定时间点）
```bash
# 场景：误删除数据，需要恢复到删除前的时间点

rman target /

SHUTDOWN IMMEDIATE;
STARTUP MOUNT;

# 恢复到指定时间点
RUN {
  SET UNTIL TIME "TO_DATE('2025-11-11 14:30:00', 'YYYY-MM-DD HH24:MI:SS')";
  RESTORE DATABASE;
  RECOVER DATABASE;
}

# 以 RESETLOGS 方式打开数据库
ALTER DATABASE OPEN RESETLOGS;

EXIT;
```

### 5.3 恢复单个表空间
```bash
rman target /

# 表空间离线
SQL "ALTER TABLESPACE users OFFLINE IMMEDIATE";

# 恢复表空间
RESTORE TABLESPACE users;
RECOVER TABLESPACE users;

# 表空间上线
SQL "ALTER TABLESPACE users ONLINE";

EXIT;
```

### 5.4 恢复单个数据文件
```bash
rman target /

# 数据文件离线
SQL "ALTER DATABASE DATAFILE 4 OFFLINE";

# 恢复数据文件
RESTORE DATAFILE 4;
RECOVER DATAFILE 4;

# 数据文件上线
SQL "ALTER DATABASE DATAFILE 4 ONLINE";

EXIT;
```

### 5.5 恢复控制文件
```bash
# 场景：所有控制文件丢失

rman target /

# 启动到 NOMOUNT 状态
STARTUP NOMOUNT;

# 恢复控制文件（从自动备份）
RESTORE CONTROLFILE FROM AUTOBACKUP;

# 或从指定备份
# RESTORE CONTROLFILE FROM '/u01/backup/rman/ctl_c-123456789-20251111-00';

# 挂载数据库
ALTER DATABASE MOUNT;

# 恢复数据库
RESTORE DATABASE;
RECOVER DATABASE;

# 打开数据库
ALTER DATABASE OPEN RESETLOGS;

EXIT;
```

---

## 6. 验证与测试

### 6.1 验证备份
```bash
rman target /

# 验证所有备份
VALIDATE BACKUPSET ALL;

# 验证数据库
VALIDATE DATABASE;

# 验证特定备份集
VALIDATE BACKUPSET 123;

# 检查备份是否可恢复
RESTORE DATABASE VALIDATE;

EXIT;
```

### 6.2 列出备份
```bash
rman target /

# 列出所有备份
LIST BACKUP SUMMARY;

# 列出数据库备份
LIST BACKUP OF DATABASE;

# 列出归档日志备份
LIST BACKUP OF ARCHIVELOG ALL;

# 列出控制文件备份
LIST BACKUP OF CONTROLFILE;

# 列出过期备份
LIST EXPIRED BACKUP;

# 列出过时备份
LIST OBSOLETE;

EXIT;
```

### 6.3 查看备份详情
```bash
rman target /

# 查看备份集详情
LIST BACKUPSET 123;

# 查看备份片详情
LIST BACKUPPIECE '/u01/backup/rman/level0_abc123';

# 查看备份报告
REPORT SCHEMA;
REPORT NEED BACKUP;
REPORT OBSOLETE;

EXIT;
```

---

## 7. 性能优化

### 7.1 并行备份
```sql
-- 配置并行度
CONFIGURE DEVICE TYPE DISK PARALLELISM 8;

-- 或在备份时指定
RUN {
  ALLOCATE CHANNEL ch1 DEVICE TYPE DISK;
  ALLOCATE CHANNEL ch2 DEVICE TYPE DISK;
  ALLOCATE CHANNEL ch3 DEVICE TYPE DISK;
  ALLOCATE CHANNEL ch4 DEVICE TYPE DISK;
  
  BACKUP INCREMENTAL LEVEL 0 DATABASE;
  
  RELEASE CHANNEL ch1;
  RELEASE CHANNEL ch2;
  RELEASE CHANNEL ch3;
  RELEASE CHANNEL ch4;
}
```

### 7.2 压缩备份
```sql
-- 配置压缩算法
CONFIGURE COMPRESSION ALGORITHM 'MEDIUM';  -- LOW/MEDIUM/HIGH

-- 或在备份时指定
BACKUP AS COMPRESSED BACKUPSET 
  INCREMENTAL LEVEL 0 
  DATABASE;
```

### 7.3 备份优化
```sql
-- 启用备份优化（跳过未变更的只读文件）
CONFIGURE BACKUP OPTIMIZATION ON;

-- 使用块变更跟踪（Block Change Tracking）
-- 大幅提升增量备份速度

-- 启用 BCT
ALTER DATABASE ENABLE BLOCK CHANGE TRACKING 
  USING FILE '/u01/oradata/ORCL/block_change_tracking.f';

-- 验证 BCT 状态
SELECT status, filename FROM v$block_change_tracking;
```

### 7.4 备份到多个目标
```sql
RUN {
  ALLOCATE CHANNEL ch1 DEVICE TYPE DISK FORMAT '/backup1/rman/%U';
  ALLOCATE CHANNEL ch2 DEVICE TYPE DISK FORMAT '/backup2/rman/%U';
  
  BACKUP INCREMENTAL LEVEL 0 DATABASE;
  
  RELEASE CHANNEL ch1;
  RELEASE CHANNEL ch2;
}
```

---

## 8. 备份到磁带（可选）

### 8.1 配置磁带设备
```sql
-- 配置 SBT（System Backup to Tape）
CONFIGURE DEFAULT DEVICE TYPE TO SBT;

-- 配置 SBT 通道
CONFIGURE CHANNEL DEVICE TYPE SBT PARMS 'SBT_LIBRARY=/opt/omni/lib/libob2oracle8_64bit.so';

-- 配置并行度
CONFIGURE DEVICE TYPE SBT PARALLELISM 2;
```

### 8.2 备份到磁带
```sql
RUN {
  ALLOCATE CHANNEL ch1 DEVICE TYPE SBT;
  ALLOCATE CHANNEL ch2 DEVICE TYPE SBT;
  
  BACKUP INCREMENTAL LEVEL 0 DATABASE;
  
  RELEASE CHANNEL ch1;
  RELEASE CHANNEL ch2;
}
```

---

## 9. 监控与告警

### 9.1 监控备份状态
```sql
-- 查看最近的备份
SELECT 
    session_key,
    input_type,
    status,
    start_time,
    end_time,
    elapsed_seconds,
    input_bytes/1024/1024/1024 AS input_gb,
    output_bytes/1024/1024/1024 AS output_gb
FROM v$rman_backup_job_details
WHERE start_time > SYSDATE - 7
ORDER BY start_time DESC;

-- 查看备份进度
SELECT 
    sid,
    serial#,
    context,
    sofar,
    totalwork,
    ROUND(sofar/totalwork*100, 2) AS pct_complete,
    start_time,
    time_remaining
FROM v$session_longops
WHERE opname LIKE 'RMAN%'
  AND totalwork > 0;
```

### 9.2 告警脚本
```bash
#!/bin/bash
# check_rman_backup.sh

export ORACLE_SID=ORCL
export ORACLE_HOME=/u01/app/oracle/product/19.3.0/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH

# 检查最近24小时是否有成功的备份
BACKUP_COUNT=$(sqlplus -s / as sysdba <<EOF
SET PAGESIZE 0 FEEDBACK OFF VERIFY OFF HEADING OFF ECHO OFF
SELECT COUNT(*) 
FROM v\$rman_backup_job_details
WHERE status = 'COMPLETED'
  AND start_time > SYSDATE - 1;
EXIT;
EOF
)

if [ "$BACKUP_COUNT" -eq 0 ]; then
    echo "No successful RMAN backup in the last 24 hours!" | mail -s "RMAN Backup Alert" dba@example.com
fi

# 检查备份失败
FAILED_COUNT=$(sqlplus -s / as sysdba <<EOF
SET PAGESIZE 0 FEEDBACK OFF VERIFY OFF HEADING OFF ECHO OFF
SELECT COUNT(*) 
FROM v\$rman_backup_job_details
WHERE status = 'FAILED'
  AND start_time > SYSDATE - 1;
EXIT;
EOF
)

if [ "$FAILED_COUNT" -gt 0 ]; then
    echo "RMAN backup failed in the last 24 hours!" | mail -s "RMAN Backup FAILED" dba@example.com
fi
```

---

## 10. 清理过期备份

### 10.1 手动清理
```bash
rman target /

# 删除过时备份
DELETE NOPROMPT OBSOLETE;

# 删除过期备份
DELETE NOPROMPT EXPIRED BACKUP;

# 删除指定备份集
DELETE BACKUPSET 123;

# 删除归档日志（已备份）
DELETE ARCHIVELOG ALL BACKED UP 1 TIMES TO DISK;

# 删除7天前的归档日志
DELETE ARCHIVELOG UNTIL TIME 'SYSDATE-7';

EXIT;
```

### 10.2 自动清理脚本
```bash
#!/bin/bash
# rman_cleanup.sh

export ORACLE_SID=ORCL
export ORACLE_HOME=/u01/app/oracle/product/19.3.0/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH

LOG_DIR=/u01/backup/logs
DATE=$(date +%Y%m%d_%H%M%S)

rman target / <<EOF > $LOG_DIR/cleanup_$DATE.log
CROSSCHECK BACKUP;
CROSSCHECK ARCHIVELOG ALL;

DELETE NOPROMPT OBSOLETE;
DELETE NOPROMPT EXPIRED BACKUP;
DELETE NOPROMPT ARCHIVELOG ALL BACKED UP 2 TIMES TO DISK;

EXIT;
EOF
```

---

## 11. 恢复演练

### 11.1 定期演练计划
```plaintext
每月第一个周六：
1. 在测试环境恢复最新备份
2. 验证数据完整性
3. 测试不完全恢复（PITR）
4. 记录恢复时间（RTO）
5. 更新恢复文档
```

### 11.2 演练脚本
```bash
#!/bin/bash
# rman_restore_test.sh

export ORACLE_SID=TESTDB
export ORACLE_HOME=/u01/app/oracle/product/19.3.0/dbhome_1
export PATH=$ORACLE_HOME/bin:$PATH

echo "Starting RMAN restore test at $(date)"

rman target / <<EOF
SHUTDOWN IMMEDIATE;
STARTUP NOMOUNT;

# 恢复控制文件
RESTORE CONTROLFILE FROM '/u01/backup/rman/ctl_latest';

ALTER DATABASE MOUNT;

# 恢复数据库
RESTORE DATABASE;
RECOVER DATABASE;

# 打开数据库
ALTER DATABASE OPEN RESETLOGS;

EXIT;
EOF

# 验证数据
sqlplus / as sysdba <<EOF
SELECT COUNT(*) FROM dba_tables;
SELECT COUNT(*) FROM dba_users;
EXIT;
EOF

echo "RMAN restore test completed at $(date)"
```

---

## 12. 最佳实践

1. **定期测试恢复**：每月至少一次恢复演练
2. **异地备份**：将备份复制到异地存储
3. **监控告警**：备份失败立即告警
4. **保留策略**：根据业务需求设置合理的保留期
5. **压缩备份**：节省存储空间
6. **并行备份**：提高备份速度
7. **块变更跟踪**：启用 BCT 加速增量备份
8. **文档记录**：记录备份策略和恢复步骤
9. **权限管理**：限制备份文件访问权限
10. **定期清理**：自动清理过期备份

---

## 13. 故障排查

### 13.1 常见错误
```plaintext
错误1：RMAN-06059: expected archived log not found
  原因：归档日志缺失
  解决：检查归档日志路径，恢复缺失的归档日志

错误2：RMAN-03009: failure of backup command
  原因：磁盘空间不足
  解决：清理磁盘空间或更改备份路径

错误3：ORA-19870: error while restoring backup piece
  原因：备份文件损坏
  解决：使用其他备份或从异地恢复

错误4：RMAN-06023: no backup or copy of datafile found
  原因：备份不存在
  解决：检查备份策略，确保定期备份
```

### 13.2 查看 RMAN 日志
```bash
# 查看 RMAN 日志
tail -f $ORACLE_HOME/rdbms/log/rman_*.log

# 查看告警日志
tail -f $ORACLE_BASE/diag/rdbms/orcl/ORCL/trace/alert_ORCL.log
```

---

**参考文档**：
- Oracle Database Backup and Recovery User's Guide (19c)
- Oracle RMAN Best Practices (MOS Doc ID 388422.1)
- Oracle Database Backup and Recovery Reference (19c)

