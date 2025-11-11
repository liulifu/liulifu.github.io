---
layout: post
title: "Oracle Data Guard 实战部署方案"
date: 2025-05-28
categories: dba
author: Lifu
---

# Oracle Data Guard 实战部署方案

适用读者：Oracle DBA、运维工程师、架构师
目标：提供 Oracle Data Guard 物理备库、逻辑备库的完整部署、配置、切换与故障处理方案。

---

## 1. Data Guard 架构概述

### 1.1 什么是 Data Guard
Oracle Data Guard 是 Oracle 数据库的高可用、灾难恢复和数据保护解决方案，通过维护一个或多个备库（Standby Database）来保护生产数据库（Primary Database）。

### 1.2 架构类型
| 类型 | 原理 | 延迟 | 用途 | 许可 |
|------|------|------|------|------|
| 物理备库 (Physical Standby) | Redo 应用 | 秒级 | 灾备、读写分离 | 标准版/企业版 |
| 逻辑备库 (Logical Standby) | SQL 应用 | 分钟级 | 报表、升级 | 仅企业版 |
| 快照备库 (Snapshot Standby) | 临时可写 | - | 测试、开发 | 企业版 |

### 1.3 保护模式
| 模式 | 数据丢失 | 性能影响 | 适用场景 |
|------|---------|---------|---------|
| Maximum Protection | 零丢失 | 高 | 金融、核心业务 |
| Maximum Availability | 零丢失（正常）| 中 | 推荐模式 |
| Maximum Performance | 可能丢失 | 低 | 一般业务 |

### 1.4 典型架构
```plaintext
┌─────────────────────────────────────────────────┐
│              应用服务器                          │
│         (通过 Service Name 连接)                 │
└─────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────┐        ┌───────▼──────┐
│ Primary DB   │        │ Standby DB   │
│ (主库)       │◄──────►│ (备库)       │
│ 192.168.1.10 │  Redo  │ 192.168.1.20 │
│ ORCL         │  传输   │ ORCL_STBY    │
└──────────────┘        └──────────────┘
     │                       │
     │ Archive              │ Archive
     ▼                       ▼
┌──────────────┐        ┌──────────────┐
│ Archive Dest │        │ Archive Dest │
└──────────────┘        └──────────────┘
```

---

## 2. 环境准备

### 2.1 硬件与网络要求
```plaintext
主库服务器：
- CPU: 16核+
- 内存: 64GB+
- 存储: 2TB+ (SSD/NVMe)
- 网络: 万兆网卡（10Gbps）

备库服务器：
- 配置与主库相同或略低
- 网络带宽充足（支持 Redo 传输）

网络要求：
- 主备之间延迟 < 10ms
- 带宽 > 1Gbps
- 专用网络（避免公网）
```

### 2.2 软件版本
```bash
# 主库和备库必须：
# - 相同的 Oracle 版本（如 19.3.0.0.0）
# - 相同的操作系统平台（Linux x86_64）
# - 相同的字符集

# 查看版本
sqlplus / as sysdba
SELECT * FROM v$version;

# 查看字符集
SELECT * FROM nls_database_parameters WHERE parameter = 'NLS_CHARACTERSET';
```

### 2.3 主机配置
```bash
# 主库：192.168.1.10 (orcl-primary)
# 备库：192.168.1.20 (orcl-standby)

# 配置 /etc/hosts（两台服务器）
cat >> /etc/hosts <<EOF
192.168.1.10 orcl-primary
192.168.1.20 orcl-standby
EOF

# 配置 SSH 互信（用于 RMAN 传输）
ssh-keygen -t rsa
ssh-copy-id oracle@orcl-standby
ssh-copy-id oracle@orcl-primary
```

---

## 3. 主库配置

### 3.1 启用归档模式
```sql
-- 检查归档模式
SELECT log_mode FROM v$database;

-- 如果是 NOARCHIVELOG，启用归档
SHUTDOWN IMMEDIATE;
STARTUP MOUNT;
ALTER DATABASE ARCHIVELOG;
ALTER DATABASE OPEN;

-- 验证
SELECT log_mode FROM v$database;
-- 输出：ARCHIVELOG
```

### 3.2 启用强制日志
```sql
-- 启用强制日志（确保所有操作都记录 Redo）
ALTER DATABASE FORCE LOGGING;

-- 验证
SELECT force_logging FROM v$database;
-- 输出：YES
```

### 3.3 配置 Standby Redo Log
```sql
-- 查看当前 Redo Log 配置
SELECT group#, bytes/1024/1024 AS size_mb, members FROM v$log;

-- 输出示例：
-- GROUP# | SIZE_MB | MEMBERS
-- 1      | 200     | 2
-- 2      | 200     | 2
-- 3      | 200     | 2

-- 创建 Standby Redo Log（数量 = Redo Log 组数 + 1）
ALTER DATABASE ADD STANDBY LOGFILE THREAD 1 
  GROUP 4 ('/u01/oradata/ORCL/standby_redo01.log') SIZE 200M;
ALTER DATABASE ADD STANDBY LOGFILE THREAD 1 
  GROUP 5 ('/u01/oradata/ORCL/standby_redo02.log') SIZE 200M;
ALTER DATABASE ADD STANDBY LOGFILE THREAD 1 
  GROUP 6 ('/u01/oradata/ORCL/standby_redo03.log') SIZE 200M;
ALTER DATABASE ADD STANDBY LOGFILE THREAD 1 
  GROUP 7 ('/u01/oradata/ORCL/standby_redo04.log') SIZE 200M;

-- 验证
SELECT group#, bytes/1024/1024 AS size_mb, status FROM v$standby_log;
```

### 3.4 配置初始化参数
```sql
-- 设置 DB_UNIQUE_NAME
ALTER SYSTEM SET db_unique_name='ORCL_PRIMARY' SCOPE=SPFILE;

-- 配置归档目录
ALTER SYSTEM SET log_archive_dest_1='LOCATION=/u01/archive/ORCL VALID_FOR=(ALL_LOGFILES,ALL_ROLES) DB_UNIQUE_NAME=ORCL_PRIMARY' SCOPE=BOTH;

-- 配置远程归档到备库
ALTER SYSTEM SET log_archive_dest_2='SERVICE=ORCL_STBY ASYNC VALID_FOR=(ONLINE_LOGFILES,PRIMARY_ROLE) DB_UNIQUE_NAME=ORCL_STBY' SCOPE=BOTH;

-- 配置归档格式
ALTER SYSTEM SET log_archive_format='%t_%s_%r.arc' SCOPE=SPFILE;

-- 配置归档目标状态
ALTER SYSTEM SET log_archive_dest_state_1=ENABLE SCOPE=BOTH;
ALTER SYSTEM SET log_archive_dest_state_2=ENABLE SCOPE=BOTH;

-- 配置 FAL（Fetch Archive Log）服务器
ALTER SYSTEM SET fal_server='ORCL_STBY' SCOPE=BOTH;
ALTER SYSTEM SET fal_client='ORCL_PRIMARY' SCOPE=BOTH;

-- 配置 Standby File Management
ALTER SYSTEM SET standby_file_management=AUTO SCOPE=BOTH;

-- 重启数据库使参数生效
SHUTDOWN IMMEDIATE;
STARTUP;
```

### 3.5 配置 TNS（主库）
```bash
# $ORACLE_HOME/network/admin/tnsnames.ora
cat >> $ORACLE_HOME/network/admin/tnsnames.ora <<EOF
ORCL_PRIMARY =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = orcl-primary)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = ORCL)
    )
  )

ORCL_STBY =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = orcl-standby)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = ORCL_STBY)
    )
  )
EOF

# 测试连接
tnsping ORCL_STBY
```

### 3.6 配置监听器（主库）
```bash
# $ORACLE_HOME/network/admin/listener.ora
cat > $ORACLE_HOME/network/admin/listener.ora <<EOF
LISTENER =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = orcl-primary)(PORT = 1521))
    )
  )

SID_LIST_LISTENER =
  (SID_LIST =
    (SID_DESC =
      (GLOBAL_DBNAME = ORCL)
      (ORACLE_HOME = /u01/app/oracle/product/19.3.0/dbhome_1)
      (SID_NAME = ORCL)
    )
  )
EOF

# 重启监听器
lsnrctl stop
lsnrctl start
lsnrctl status
```

---

## 4. 备库部署

### 4.1 使用 RMAN 创建备库
```bash
# 在备库服务器创建必要目录
mkdir -p /u01/oradata/ORCL_STBY
mkdir -p /u01/archive/ORCL_STBY
mkdir -p /u01/app/oracle/admin/ORCL_STBY/adump

# 创建密码文件（与主库相同）
scp oracle@orcl-primary:$ORACLE_HOME/dbs/orapwORCL $ORACLE_HOME/dbs/orapwORCL_STBY

# 创建初始化参数文件
cat > $ORACLE_HOME/dbs/initORCL_STBY.ora <<EOF
*.db_name='ORCL'
*.db_unique_name='ORCL_STBY'
*.db_file_name_convert='/u01/oradata/ORCL/','/u01/oradata/ORCL_STBY/'
*.log_file_name_convert='/u01/oradata/ORCL/','/u01/oradata/ORCL_STBY/'
*.log_archive_dest_1='LOCATION=/u01/archive/ORCL_STBY VALID_FOR=(ALL_LOGFILES,ALL_ROLES) DB_UNIQUE_NAME=ORCL_STBY'
*.log_archive_dest_2='SERVICE=ORCL_PRIMARY ASYNC VALID_FOR=(ONLINE_LOGFILES,PRIMARY_ROLE) DB_UNIQUE_NAME=ORCL_PRIMARY'
*.log_archive_format='%t_%s_%r.arc'
*.fal_server='ORCL_PRIMARY'
*.fal_client='ORCL_STBY'
*.standby_file_management=AUTO
EOF

# 启动备库到 NOMOUNT 状态
export ORACLE_SID=ORCL_STBY
sqlplus / as sysdba
STARTUP NOMOUNT PFILE='$ORACLE_HOME/dbs/initORCL_STBY.ora';
EXIT;
```

### 4.2 使用 RMAN DUPLICATE 创建备库
```bash
# 在备库服务器执行
rman TARGET sys/Oracle123#@ORCL_PRIMARY AUXILIARY sys/Oracle123#@ORCL_STBY

# RMAN 脚本
DUPLICATE TARGET DATABASE
  FOR STANDBY
  FROM ACTIVE DATABASE
  DORECOVER
  SPFILE
    SET db_unique_name='ORCL_STBY' COMMENT 'Standby DB'
    SET log_archive_dest_1='LOCATION=/u01/archive/ORCL_STBY VALID_FOR=(ALL_LOGFILES,ALL_ROLES) DB_UNIQUE_NAME=ORCL_STBY'
    SET log_archive_dest_2='SERVICE=ORCL_PRIMARY ASYNC VALID_FOR=(ONLINE_LOGFILES,PRIMARY_ROLE) DB_UNIQUE_NAME=ORCL_PRIMARY'
    SET fal_server='ORCL_PRIMARY'
    SET fal_client='ORCL_STBY'
  NOFILENAMECHECK;

EXIT;

# 该过程会：
# 1. 从主库复制数据文件
# 2. 创建控制文件
# 3. 应用归档日志
# 4. 创建 SPFILE
```

### 4.3 配置 TNS（备库）
```bash
# $ORACLE_HOME/network/admin/tnsnames.ora
cat >> $ORACLE_HOME/network/admin/tnsnames.ora <<EOF
ORCL_PRIMARY =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = orcl-primary)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = ORCL)
    )
  )

ORCL_STBY =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = orcl-standby)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = ORCL_STBY)
    )
  )
EOF
```

### 4.4 配置监听器（备库）
```bash
# $ORACLE_HOME/network/admin/listener.ora
cat > $ORACLE_HOME/network/admin/listener.ora <<EOF
LISTENER =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = orcl-standby)(PORT = 1521))
    )
  )

SID_LIST_LISTENER =
  (SID_LIST =
    (SID_DESC =
      (GLOBAL_DBNAME = ORCL_STBY)
      (ORACLE_HOME = /u01/app/oracle/product/19.3.0/dbhome_1)
      (SID_NAME = ORCL_STBY)
    )
  )
EOF

# 重启监听器
lsnrctl stop
lsnrctl start
```

---

## 5. 启动 Data Guard

### 5.1 启动备库 Redo 应用
```sql
-- 在备库执行
sqlplus / as sysdba

-- 启动到 MOUNT 状态
SHUTDOWN IMMEDIATE;
STARTUP MOUNT;

-- 启动 Redo 应用（实时应用）
ALTER DATABASE RECOVER MANAGED STANDBY DATABASE USING CURRENT LOGFILE DISCONNECT FROM SESSION;

-- 验证状态
SELECT database_role, open_mode FROM v$database;
-- 输出：
-- DATABASE_ROLE | OPEN_MODE
-- PHYSICAL STANDBY | MOUNTED
```

### 5.2 启用 Active Data Guard（可选，需企业版许可）
```sql
-- 在备库执行
ALTER DATABASE OPEN READ ONLY;
ALTER DATABASE RECOVER MANAGED STANDBY DATABASE USING CURRENT LOGFILE DISCONNECT FROM SESSION;

-- 验证
SELECT database_role, open_mode FROM v$database;
-- 输出：
-- DATABASE_ROLE | OPEN_MODE
-- PHYSICAL STANDBY | READ ONLY WITH APPLY
```

---

## 6. 监控与验证

### 6.1 检查归档传输
```sql
-- 主库：查看归档目标状态
SELECT dest_id, status, destination, error FROM v$archive_dest WHERE dest_id <= 2;

-- 输出示例：
-- DEST_ID | STATUS | DESTINATION           | ERROR
-- 1       | VALID  | /u01/archive/ORCL     | 
-- 2       | VALID  | ORCL_STBY             |

-- 主库：查看归档日志
SELECT sequence#, first_time, next_time, applied FROM v$archived_log 
WHERE dest_id = 2 
ORDER BY sequence# DESC 
FETCH FIRST 10 ROWS ONLY;
```

### 6.2 检查 Redo 应用延迟
```sql
-- 备库：查看应用延迟
SELECT name, value, unit, time_computed 
FROM v$dataguard_stats 
WHERE name IN ('transport lag', 'apply lag');

-- 输出示例：
-- NAME          | VALUE      | UNIT    | TIME_COMPUTED
-- transport lag | +00 00:00:02 | seconds | 2025-11-11 15:30:00
-- apply lag     | +00 00:00:05 | seconds | 2025-11-11 15:30:00

-- 备库：查看应用进度
SELECT process, status, thread#, sequence#, block#, blocks 
FROM v$managed_standby;
```

### 6.3 检查数据同步
```sql
-- 主库：查看当前 SCN
SELECT current_scn FROM v$database;

-- 备库：查看应用的 SCN
SELECT current_scn FROM v$database;

-- 对比两者差异（应该很小）
```

---

## 7. 切换操作

### 7.1 Switchover（计划内切换）
```sql
-- 步骤1：在主库验证可切换性
SELECT switchover_status FROM v$database;
-- 输出应为：TO STANDBY 或 SESSIONS ACTIVE

-- 如果是 SESSIONS ACTIVE，执行：
ALTER DATABASE COMMIT TO SWITCHOVER TO PHYSICAL STANDBY WITH SESSION SHUTDOWN;

-- 步骤2：在主库执行切换
ALTER DATABASE COMMIT TO SWITCHOVER TO PHYSICAL STANDBY;
SHUTDOWN IMMEDIATE;
STARTUP MOUNT;

-- 步骤3：在备库验证可切换性
SELECT switchover_status FROM v$database;
-- 输出应为：TO PRIMARY 或 SESSIONS ACTIVE

-- 步骤4：在备库执行切换
ALTER DATABASE COMMIT TO SWITCHOVER TO PRIMARY;
ALTER DATABASE OPEN;

-- 步骤5：在新备库（原主库）启动 Redo 应用
ALTER DATABASE RECOVER MANAGED STANDBY DATABASE USING CURRENT LOGFILE DISCONNECT FROM SESSION;

-- 验证角色
SELECT database_role FROM v$database;
```

### 7.2 Failover（故障切换）
```sql
-- 场景：主库故障，需要紧急切换到备库

-- 步骤1：在备库停止 Redo 应用
ALTER DATABASE RECOVER MANAGED STANDBY DATABASE CANCEL;

-- 步骤2：完成恢复（应用所有可用的归档日志）
ALTER DATABASE RECOVER MANAGED STANDBY DATABASE FINISH;

-- 步骤3：激活备库为主库
ALTER DATABASE ACTIVATE PHYSICAL STANDBY DATABASE;

-- 步骤4：打开数据库
ALTER DATABASE OPEN;

-- 步骤5：验证角色
SELECT database_role, open_mode FROM v$database;
-- 输出：
-- DATABASE_ROLE | OPEN_MODE
-- PRIMARY       | READ WRITE

-- 注意：Failover 后，原主库需要重新创建为备库
```

---

## 8. 故障处理

### 8.1 归档传输中断
```sql
-- 主库：检查归档目标状态
SELECT dest_id, status, error FROM v$archive_dest WHERE dest_id = 2;

-- 如果 STATUS = ERROR，查看错误信息
SELECT message FROM v$dataguard_status WHERE severity = 'Error';

-- 常见原因：
-- 1. 网络中断：检查网络连通性
-- 2. 备库磁盘满：清理归档日志
-- 3. TNS 配置错误：检查 tnsnames.ora

-- 解决后，重新启用归档目标
ALTER SYSTEM SET log_archive_dest_state_2=ENABLE;
```

### 8.2 Redo 应用延迟
```sql
-- 备库：检查应用延迟
SELECT name, value FROM v$dataguard_stats WHERE name = 'apply lag';

-- 如果延迟过大（> 1分钟），检查：
-- 1. 备库资源（CPU/IO）
SELECT * FROM v$session WHERE program LIKE '%MRP%';

-- 2. 应用速率
SELECT process, status, sequence# FROM v$managed_standby WHERE process LIKE 'MRP%';

-- 3. 重启 Redo 应用
ALTER DATABASE RECOVER MANAGED STANDBY DATABASE CANCEL;
ALTER DATABASE RECOVER MANAGED STANDBY DATABASE USING CURRENT LOGFILE DISCONNECT FROM SESSION;
```

### 8.3 归档日志缺失（GAP）
```sql
-- 备库：检查归档日志缺失
SELECT * FROM v$archive_gap;

-- 输出示例：
-- THREAD# | LOW_SEQUENCE# | HIGH_SEQUENCE#
-- 1       | 1234          | 1236

-- 手动从主库传输缺失的归档日志
-- 在主库执行：
ALTER SYSTEM ARCHIVE LOG CURRENT;
ALTER SYSTEM SWITCH LOGFILE;

-- 或手动复制归档文件
scp /u01/archive/ORCL/1_1234_*.arc oracle@orcl-standby:/u01/archive/ORCL_STBY/

-- 在备库注册归档日志
ALTER DATABASE REGISTER PHYSICAL LOGFILE '/u01/archive/ORCL_STBY/1_1234_*.arc';
```

---

## 9. Data Guard Broker（可选）

### 9.1 启用 Broker
```sql
-- 主库和备库都执行
ALTER SYSTEM SET dg_broker_start=TRUE SCOPE=BOTH;
```

### 9.2 配置 Broker
```bash
# 使用 DGMGRL 工具
dgmgrl sys/Oracle123#@ORCL_PRIMARY

# 创建配置
CREATE CONFIGURATION dg_config AS
  PRIMARY DATABASE IS ORCL_PRIMARY
  CONNECT IDENTIFIER IS ORCL_PRIMARY;

# 添加备库
ADD DATABASE ORCL_STBY AS
  CONNECT IDENTIFIER IS ORCL_STBY
  MAINTAINED AS PHYSICAL;

# 启用配置
ENABLE CONFIGURATION;

# 查看配置
SHOW CONFIGURATION;

# 输出示例：
# Configuration - dg_config
#   Protection Mode: MaxPerformance
#   Members:
#   ORCL_PRIMARY - Primary database
#   ORCL_STBY    - Physical standby database
# Fast-Start Failover: DISABLED
# Configuration Status: SUCCESS
```

### 9.3 使用 Broker 切换
```bash
# Switchover
SWITCHOVER TO ORCL_STBY;

# Failover
FAILOVER TO ORCL_STBY;

# 查看状态
SHOW DATABASE ORCL_PRIMARY;
SHOW DATABASE ORCL_STBY;
```

---

## 10. 性能优化

### 10.1 归档传输优化
```sql
-- 使用 ASYNC 模式（默认）
ALTER SYSTEM SET log_archive_dest_2='SERVICE=ORCL_STBY ASYNC VALID_FOR=(ONLINE_LOGFILES,PRIMARY_ROLE) DB_UNIQUE_NAME=ORCL_STBY';

-- 使用压缩传输（减少网络带宽）
ALTER SYSTEM SET log_archive_dest_2='SERVICE=ORCL_STBY ASYNC COMPRESSION=ENABLE VALID_FOR=(ONLINE_LOGFILES,PRIMARY_ROLE) DB_UNIQUE_NAME=ORCL_STBY';
```

### 10.2 Redo 应用优化
```sql
-- 启用并行恢复
ALTER DATABASE RECOVER MANAGED STANDBY DATABASE USING CURRENT LOGFILE DISCONNECT FROM SESSION PARALLEL 4;

-- 调整 SGA
ALTER SYSTEM SET sga_target=16G SCOPE=SPFILE;
```

---

## 11. 监控脚本

```bash
#!/bin/bash
# check_dataguard.sh

echo "=== Data Guard Status Check ==="

# 主库检查
echo "Primary Database:"
sqlplus -s / as sysdba <<EOF
SET PAGESIZE 0 FEEDBACK OFF
SELECT 'Role: ' || database_role FROM v$database;
SELECT 'Archive Dest 2: ' || status FROM v$archive_dest WHERE dest_id = 2;
SELECT 'Current Sequence: ' || MAX(sequence#) FROM v$archived_log WHERE dest_id = 1;
EXIT;
EOF

# 备库检查
echo "Standby Database:"
ssh oracle@orcl-standby "sqlplus -s / as sysdba" <<EOF
SET PAGESIZE 0 FEEDBACK OFF
SELECT 'Role: ' || database_role FROM v$database;
SELECT 'Open Mode: ' || open_mode FROM v$database;
SELECT 'Apply Lag: ' || value FROM v$dataguard_stats WHERE name = 'apply lag';
SELECT 'Applied Sequence: ' || MAX(sequence#) FROM v$archived_log WHERE applied = 'YES';
EXIT;
EOF
```

---

## 12. 最佳实践

1. **定期演练**：每季度进行 Switchover 演练
2. **监控告警**：应用延迟 > 1分钟告警
3. **归档管理**：定期清理归档日志，避免磁盘满
4. **网络优化**：使用专用网络，避免公网传输
5. **参数一致**：主备库参数尽量保持一致
6. **备份策略**：在备库执行 RMAN 备份，减轻主库压力
7. **文档记录**：记录所有配置和切换操作

---

**参考文档**：
- Oracle Data Guard Concepts and Administration (19c)
- Oracle Data Guard Broker (19c)
- MOS Note: Data Guard Best Practices (Doc ID 1454802.1)

