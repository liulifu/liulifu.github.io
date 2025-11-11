---
layout: post
title: "Oracle GoldenGate 与 MySQL 数据交换方案"
date: 2025-08-19
categories: dba
author: Lifu
---

# Oracle GoldenGate 与 MySQL 数据交换方案

适用读者：DBA、数据工程师、架构师
目标：提供 Oracle 与 MySQL 之间使用 GoldenGate 进行双向数据同步的完整方案，包括异构数据库配置、类型映射、冲突处理。

---

## 1. 方案概述

### 1.1 应用场景
- **数据库迁移**：Oracle → MySQL（逐步迁移）
- **混合架构**：核心业务 Oracle，新业务 MySQL
- **数据集成**：Oracle 数据同步到 MySQL 数据仓库
- **双活架构**：Oracle ↔ MySQL 双向同步

### 1.2 架构图
```plaintext
┌─────────────────────────────────────────────────┐
│              Oracle 数据库                       │
│                                                 │
│  ┌──────────┐      ┌──────────┐                │
│  │ Extract  │─────►│Data Pump │                │
│  │ (OGG for │      │          │                │
│  │  Oracle) │      │          │                │
│  └──────────┘      └──────────┘                │
│       │                  │                      │
│       ▼                  ▼                      │
│  Local Trail        Remote Trail               │
└─────────────────────────────────────────────────┘
                        │
                        │ 网络传输
                        ▼
┌─────────────────────────────────────────────────┐
│              MySQL 数据库                        │
│                                                 │
│       ┌──────────┐                              │
│       │Replicat  │                              │
│       │ (OGG for │                              │
│       │  MySQL)  │                              │
│       └──────────┘                              │
│            │                                    │
│            ▼                                    │
│       目标表                                    │
└─────────────────────────────────────────────────┘

反向同步（MySQL → Oracle）：
  MySQL Extract → Oracle Replicat
```

### 1.3 挑战与解决方案
| 挑战 | 影响 | 解决方案 |
|------|------|---------|
| 数据类型差异 | 数据转换错误 | 类型映射、COLMAP |
| 字符集差异 | 乱码 | 统一使用 UTF8 |
| 序列/自增主键 | ID 冲突 | 使用 RANGE 分配 |
| 事务隔离级别 | 数据不一致 | 调整隔离级别 |
| DDL 复制 | Schema 不同步 | 手动同步或脚本 |

---

## 2. 环境准备

### 2.1 软件版本
```plaintext
Oracle 端：
- Oracle Database 19c
- Oracle GoldenGate 19.1 for Oracle

MySQL 端：
- MySQL 8.0
- Oracle GoldenGate 19.1 for MySQL
```

### 2.2 Oracle 端配置
```sql
-- 启用归档模式
ALTER DATABASE ARCHIVELOG;

-- 启用补充日志
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;

-- 为表启用主键补充日志
ALTER TABLE app_schema.orders ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;

-- 创建 GoldenGate 用户
CREATE USER ggadmin IDENTIFIED BY GG123#Admin;
GRANT CONNECT, RESOURCE, DBA TO ggadmin;
GRANT SELECT ANY DICTIONARY TO ggadmin;
GRANT FLASHBACK ANY TABLE TO ggadmin;
```

### 2.3 MySQL 端配置
```ini
# /etc/my.cnf
[mysqld]
# 启用 binlog
server-id = 1
log-bin = mysql-bin
binlog-format = ROW
binlog-row-image = FULL

# GoldenGate 需要
gtid-mode = ON
enforce-gtid-consistency = ON
log-slave-updates = ON

# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

```sql
-- 创建 GoldenGate 用户
CREATE USER 'ggadmin'@'%' IDENTIFIED BY 'GG123#Admin';
GRANT ALL PRIVILEGES ON *.* TO 'ggadmin'@'%';
FLUSH PRIVILEGES;

-- 创建目标 Schema
CREATE DATABASE app_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 3. GoldenGate 安装

### 3.1 Oracle 端安装
```bash
# 下载 Oracle GoldenGate for Oracle
mkdir -p /u01/ogg_oracle
cd /u01/ogg_oracle
unzip 191004_fbo_ggs_Linux_x64_Oracle_64bit.zip

# 创建子目录
./ggsci
GGSCI> CREATE SUBDIRS
GGSCI> EXIT

# 配置 Manager
GGSCI> EDIT PARAMS MGR
```

```plaintext
PORT 7809
DYNAMICPORTLIST 7810-7820
AUTORESTART EXTRACT *, RETRIES 5, WAITMINUTES 3
PURGEOLDEXTRACTS ./dirdat/*, USECHECKPOINTS, MINKEEPDAYS 7
```

```bash
GGSCI> START MGR
```

### 3.2 MySQL 端安装
```bash
# 下载 Oracle GoldenGate for MySQL
mkdir -p /u01/ogg_mysql
cd /u01/ogg_mysql
unzip 191004_fbo_ggs_Linux_x64_MySQL_64bit.zip

# 创建子目录
./ggsci
GGSCI> CREATE SUBDIRS
GGSCI> EXIT

# 配置 Manager
GGSCI> EDIT PARAMS MGR
```

```plaintext
PORT 7809
DYNAMICPORTLIST 7810-7820
AUTORESTART REPLICAT *, RETRIES 5, WAITMINUTES 3
PURGEOLDEXTRACTS ./dirdat/*, USECHECKPOINTS, MINKEEPDAYS 7
```

```bash
GGSCI> START MGR
```

---

## 4. Oracle → MySQL 单向同步

### 4.1 数据类型映射
| Oracle | MySQL | 说明 |
|--------|-------|------|
| NUMBER(p,s) | DECIMAL(p,s) | 精确数值 |
| NUMBER | DECIMAL(65,30) | 无精度 NUMBER |
| VARCHAR2(n) | VARCHAR(n) | 变长字符串 |
| CHAR(n) | CHAR(n) | 定长字符串 |
| DATE | DATETIME | Oracle DATE 包含时间 |
| TIMESTAMP | DATETIME(6) | 微秒精度 |
| CLOB | LONGTEXT | 大文本 |
| BLOB | LONGBLOB | 二进制 |
| RAW | VARBINARY | 二进制 |

### 4.2 创建目标表（MySQL）
```sql
-- Oracle 源表
CREATE TABLE app_schema.orders (
    order_id NUMBER PRIMARY KEY,
    user_id NUMBER NOT NULL,
    amount NUMBER(15,2),
    status VARCHAR2(20),
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    updated_at TIMESTAMP
);

-- MySQL 目标表
CREATE TABLE app_db.orders (
    order_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount DECIMAL(15,2),
    status VARCHAR(20),
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.3 配置 Oracle Extract
```bash
# Oracle 端 GGSCI
cd /u01/ogg_oracle
./ggsci

GGSCI> DBLOGIN USERID ggadmin, PASSWORD GG123#Admin
GGSCI> ADD TRANDATA app_schema.orders

GGSCI> ADD EXTRACT ext_ora, TRANLOG, BEGIN NOW
GGSCI> ADD EXTTRAIL ./dirdat/eo, EXTRACT ext_ora

GGSCI> EDIT PARAMS ext_ora
```

```plaintext
-- ext_ora.prm
EXTRACT ext_ora
USERID ggadmin, PASSWORD GG123#Admin
EXTTRAIL ./dirdat/eo
DISCARDFILE ./dirrpt/ext_ora.dsc, PURGE

TABLE app_schema.orders;
TABLE app_schema.users;
TABLE app_schema.products;
```

### 4.4 配置 Data Pump
```bash
GGSCI> ADD EXTRACT pump_ora, EXTTRAILSOURCE ./dirdat/eo
GGSCI> ADD RMTTRAIL ./dirdat/ro, EXTRACT pump_ora

GGSCI> EDIT PARAMS pump_ora
```

```plaintext
-- pump_ora.prm
EXTRACT pump_ora
RMTHOST mysql-server, MGRPORT 7809
RMTTRAIL ./dirdat/ro
PASSTHRU

TABLE app_schema.*;
```

### 4.5 配置 MySQL Replicat
```bash
# MySQL 端 GGSCI
cd /u01/ogg_mysql
./ggsci

GGSCI> DBLOGIN SOURCEDB app_db, USERID ggadmin, PASSWORD GG123#Admin
GGSCI> ADD CHECKPOINTTABLE ggadmin.checkpoint

GGSCI> ADD REPLICAT rep_mysql, EXTTRAIL ./dirdat/ro, CHECKPOINTTABLE ggadmin.checkpoint

GGSCI> EDIT PARAMS rep_mysql
```

```plaintext
-- rep_mysql.prm
REPLICAT rep_mysql
TARGETDB app_db, USERID ggadmin, PASSWORD GG123#Admin
DISCARDFILE ./dirrpt/rep_mysql.dsc, PURGE
HANDLECOLLISIONS

-- 类型映射
MAP app_schema.orders, TARGET app_db.orders, &
  COLMAP ( &
    order_id = order_id, &
    user_id = user_id, &
    amount = amount, &
    status = status, &
    created_at = created_at, &
    updated_at = updated_at &
  );

MAP app_schema.users, TARGET app_db.users;
MAP app_schema.products, TARGET app_db.products;
```

### 4.6 启动进程
```bash
# Oracle 端
GGSCI> START EXTRACT ext_ora
GGSCI> START EXTRACT pump_ora

# MySQL 端
GGSCI> START REPLICAT rep_mysql

# 验证
GGSCI> INFO ALL
GGSCI> STATS EXTRACT ext_ora
GGSCI> STATS REPLICAT rep_mysql
```

---

## 5. MySQL → Oracle 反向同步

### 5.1 配置 MySQL Extract
```bash
# MySQL 端 GGSCI
GGSCI> DBLOGIN SOURCEDB app_db, USERID ggadmin, PASSWORD GG123#Admin

GGSCI> ADD EXTRACT ext_mysql, TRANLOG, BEGIN NOW
GGSCI> ADD EXTTRAIL ./dirdat/em, EXTRACT ext_mysql

GGSCI> EDIT PARAMS ext_mysql
```

```plaintext
-- ext_mysql.prm
EXTRACT ext_mysql
SOURCEDB app_db, USERID ggadmin, PASSWORD GG123#Admin
EXTTRAIL ./dirdat/em
DISCARDFILE ./dirrpt/ext_mysql.dsc, PURGE

-- 排除 GoldenGate 自身的变更（避免循环）
TRANLOGOPTIONS EXCLUDEUSER ggadmin

TABLE app_db.orders;
TABLE app_db.users;
TABLE app_db.products;
```

### 5.2 配置 Data Pump
```bash
GGSCI> ADD EXTRACT pump_mysql, EXTTRAILSOURCE ./dirdat/em
GGSCI> ADD RMTTRAIL ./dirdat/rm, EXTRACT pump_mysql

GGSCI> EDIT PARAMS pump_mysql
```

```plaintext
-- pump_mysql.prm
EXTRACT pump_mysql
RMTHOST oracle-server, MGRPORT 7809
RMTTRAIL ./dirdat/rm
PASSTHRU

TABLE app_db.*;
```

### 5.3 配置 Oracle Replicat
```bash
# Oracle 端 GGSCI
GGSCI> DBLOGIN USERID ggadmin, PASSWORD GG123#Admin
GGSCI> ADD CHECKPOINTTABLE ggadmin.checkpoint

GGSCI> ADD REPLICAT rep_ora, EXTTRAIL ./dirdat/rm, CHECKPOINTTABLE ggadmin.checkpoint

GGSCI> EDIT PARAMS rep_ora
```

```plaintext
-- rep_ora.prm
REPLICAT rep_ora
USERID ggadmin, PASSWORD GG123#Admin
ASSUMETARGETDEFS
DISCARDFILE ./dirrpt/rep_ora.dsc, PURGE
HANDLECOLLISIONS

-- 类型映射
MAP app_db.orders, TARGET app_schema.orders, &
  COLMAP ( &
    order_id = order_id, &
    user_id = user_id, &
    amount = amount, &
    status = status, &
    created_at = created_at, &
    updated_at = updated_at &
  );

MAP app_db.users, TARGET app_schema.users;
MAP app_db.products, TARGET app_schema.products;
```

---

## 6. 双向同步配置

### 6.1 避免循环复制
```plaintext
-- Oracle Extract (ext_ora.prm)
EXTRACT ext_ora
USERID ggadmin, PASSWORD GG123#Admin
EXTTRAIL ./dirdat/eo
TRANLOGOPTIONS EXCLUDEUSER ggadmin  -- 排除 GG 用户的变更
TABLE app_schema.*;

-- MySQL Extract (ext_mysql.prm)
EXTRACT ext_mysql
SOURCEDB app_db, USERID ggadmin, PASSWORD GG123#Admin
EXTTRAIL ./dirdat/em
TRANLOGOPTIONS EXCLUDEUSER ggadmin  -- 排除 GG 用户的变更
TABLE app_db.*;
```

### 6.2 冲突检测与解决
```plaintext
-- Oracle Replicat (rep_ora.prm)
REPLICAT rep_ora
USERID ggadmin, PASSWORD GG123#Admin

-- 冲突处理策略
MAP app_db.orders, TARGET app_schema.orders, &
  RESOLVECONFLICT (UPDATEROWEXISTS, (DEFAULT, OVERWRITE)), &
  RESOLVECONFLICT (INSERTROWEXISTS, (DEFAULT, OVERWRITE)), &
  RESOLVECONFLICT (DELETEROWEXISTS, (DEFAULT, IGNORE));

-- MySQL Replicat (rep_mysql.prm)
REPLICAT rep_mysql
TARGETDB app_db, USERID ggadmin, PASSWORD GG123#Admin

-- 冲突处理策略
MAP app_schema.orders, TARGET app_db.orders, &
  RESOLVECONFLICT (UPDATEROWEXISTS, (DEFAULT, OVERWRITE)), &
  RESOLVECONFLICT (INSERTROWEXISTS, (DEFAULT, OVERWRITE)), &
  RESOLVECONFLICT (DELETEROWEXISTS, (DEFAULT, IGNORE));
```

### 6.3 主键范围分配（避免冲突）
```sql
-- Oracle 端：使用奇数 ID
CREATE SEQUENCE seq_order_id START WITH 1 INCREMENT BY 2;

-- MySQL 端：使用偶数 ID
ALTER TABLE app_db.orders AUTO_INCREMENT = 2;
SET @@auto_increment_increment = 2;
SET @@auto_increment_offset = 2;

-- 或使用 UUID
-- Oracle
CREATE TABLE orders (
    order_id VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
    ...
);

-- MySQL
CREATE TABLE orders (
    order_id CHAR(36) DEFAULT (UUID()) PRIMARY KEY,
    ...
);
```

---

## 7. 数据转换

### 7.1 日期格式转换
```plaintext
-- Oracle → MySQL (rep_mysql.prm)
MAP app_schema.orders, TARGET app_db.orders, &
  COLMAP ( &
    order_id = order_id, &
    created_at = @STREXT(created_at, 1, 19)  -- 截取到秒
  );

-- MySQL → Oracle (rep_ora.prm)
MAP app_db.orders, TARGET app_schema.orders, &
  COLMAP ( &
    order_id = order_id, &
    created_at = @DATE("YYYY-MM-DD HH24:MI:SS", created_at)
  );
```

### 7.2 字符集转换
```plaintext
-- rep_mysql.prm
REPLICAT rep_mysql
TARGETDB app_db, USERID ggadmin, PASSWORD GG123#Admin
CHARSET UTF8 TO UTF8

MAP app_schema.*, TARGET app_db.*;
```

### 7.3 字段映射与计算
```plaintext
-- rep_mysql.prm
MAP app_schema.orders, TARGET app_db.orders, &
  COLMAP ( &
    order_id = order_id, &
    user_id = user_id, &
    amount_usd = amount,  -- 原始金额
    amount_cny = amount * 6.5,  -- 汇率转换
    status_code = @IF(status = 'ACTIVE', 1, 0),  -- 状态转换
    full_name = @STRCAT(first_name, ' ', last_name)  -- 字符串拼接
  );
```

---

## 8. 初始化数据加载

### 8.1 使用 DataPump 初始化
```bash
# Oracle 导出
expdp ggadmin/GG123#Admin@ORCL DIRECTORY=DATA_PUMP_DIR DUMPFILE=init_load.dmp SCHEMAS=app_schema

# 转换为 MySQL 格式（手动或使用工具）
# 然后导入 MySQL
mysql -uggadmin -pGG123#Admin app_db < init_load.sql
```

### 8.2 使用 GoldenGate Initial Load
```bash
# Oracle 端
GGSCI> ADD EXTRACT init_ora, SOURCEISTABLE
GGSCI> EDIT PARAMS init_ora
```

```plaintext
-- init_ora.prm
EXTRACT init_ora
USERID ggadmin, PASSWORD GG123#Admin
RMTHOST mysql-server, MGRPORT 7809
RMTTASK REPLICAT, GROUP rep_init
TABLE app_schema.orders;
TABLE app_schema.users;
TABLE app_schema.products;
```

```bash
# MySQL 端
GGSCI> ADD REPLICAT rep_init, SPECIALRUN
GGSCI> EDIT PARAMS rep_init
```

```plaintext
-- rep_init.prm
REPLICAT rep_init
TARGETDB app_db, USERID ggadmin, PASSWORD GG123#Admin
MAP app_schema.*, TARGET app_db.*;
```

```bash
# 启动初始化加载
GGSCI> START EXTRACT init_ora
```

---

## 9. 监控与故障处理

### 9.1 监控延迟
```bash
# Oracle 端
GGSCI> LAG EXTRACT ext_ora
GGSCI> STATS EXTRACT ext_ora, TOTAL

# MySQL 端
GGSCI> LAG REPLICAT rep_mysql
GGSCI> STATS REPLICAT rep_mysql, TOTAL
```

### 9.2 常见错误处理
```plaintext
错误1：数据类型不匹配
  错误信息：OGG-00664 OCI Error converting column
  解决方案：使用 COLMAP 显式转换类型

错误2：主键冲突
  错误信息：OGG-00663 OCI Error: Unique constraint violated
  解决方案：启用 HANDLECOLLISIONS 或使用 RESOLVECONFLICT

错误3：字符集乱码
  错误信息：Invalid character
  解决方案：统一使用 UTF8，配置 CHARSET 参数

错误4：大字段截断
  错误信息：OGG-01163 Bad column length
  解决方案：调整目标表字段长度或使用 LOBMEMORY
```

### 9.3 查看错误日志
```bash
# Oracle 端
GGSCI> VIEW REPORT ext_ora
GGSCI> VIEW GGSEVT

# MySQL 端
GGSCI> VIEW REPORT rep_mysql
tail -f /u01/ogg_mysql/ggserr.log
```

---

## 10. 性能优化

### 10.1 批量应用（MySQL Replicat）
```plaintext
-- rep_mysql.prm
REPLICAT rep_mysql
TARGETDB app_db, USERID ggadmin, PASSWORD GG123#Admin

-- 批量应用
BATCHSQL
BATCHSQL BATCHTRANSOPS 1000
BATCHSQL BATCHSIZE 1000000

-- 禁用外键检查（提高性能）
DBOPTIONS DEFERREFCONST
```

### 10.2 并行复制
```plaintext
-- rep_mysql.prm
REPLICAT rep_mysql
TARGETDB app_db, USERID ggadmin, PASSWORD GG123#Admin

-- 并行应用（按表分组）
PARALLELREPLICAT 4
MAP app_schema.orders, TARGET app_db.orders, THREAD (1);
MAP app_schema.users, TARGET app_db.users, THREAD (2);
MAP app_schema.products, TARGET app_db.products, THREAD (3);
MAP app_schema.logs, TARGET app_db.logs, THREAD (4);
```

### 10.3 压缩传输
```plaintext
-- pump_ora.prm
EXTRACT pump_ora
RMTHOST mysql-server, MGRPORT 7809
RMTTRAIL ./dirdat/ro
PASSTHRU

-- 启用压缩
COMPRESSDELETES
COMPRESSUPDATES
```

---

## 11. 监控脚本

```bash
#!/bin/bash
# check_ogg_heterogeneous.sh

echo "=== Oracle → MySQL Sync Status ==="

# Oracle 端
echo "Oracle Extract:"
/u01/ogg_oracle/ggsci <<EOF
INFO EXTRACT ext_ora
LAG EXTRACT ext_ora
STATS EXTRACT ext_ora, TOTAL
EXIT
EOF

# MySQL 端
echo "MySQL Replicat:"
/u01/ogg_mysql/ggsci <<EOF
INFO REPLICAT rep_mysql
LAG REPLICAT rep_mysql
STATS REPLICAT rep_mysql, TOTAL
EXIT
EOF

echo "=== MySQL → Oracle Sync Status ==="

# MySQL 端
echo "MySQL Extract:"
/u01/ogg_mysql/ggsci <<EOF
INFO EXTRACT ext_mysql
LAG EXTRACT ext_mysql
EXIT
EOF

# Oracle 端
echo "Oracle Replicat:"
/u01/ogg_oracle/ggsci <<EOF
INFO REPLICAT rep_ora
LAG REPLICAT rep_ora
EXIT
EOF
```

---

## 12. 最佳实践

1. **类型映射**：明确定义所有字段的类型映射
2. **字符集统一**：使用 UTF8/UTF8MB4
3. **主键策略**：双向同步时使用范围分配或 UUID
4. **冲突处理**：定义明确的冲突解决策略
5. **监控告警**：延迟 > 5分钟告警
6. **测试验证**：生产部署前充分测试
7. **文档记录**：记录所有映射规则和配置

---

**参考文档**：
- Oracle GoldenGate for Heterogeneous Databases
- Oracle GoldenGate for MySQL Documentation
- Oracle to MySQL Migration Guide

