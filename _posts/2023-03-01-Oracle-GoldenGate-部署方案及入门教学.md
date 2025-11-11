---
layout: post
title: "Oracle GoldenGate 部署方案及入门教学"
date: 2023-03-01
categories: dba
author: Lifu
---

# Oracle GoldenGate 部署方案及入门教学

适用读者：Oracle DBA、数据工程师、架构师
目标：提供 Oracle GoldenGate (OGG) 的完整部署、配置、监控与故障处理方案，涵盖单向复制、双向复制、异构数据库同步。

---

## 1. GoldenGate 概述

### 1.1 什么是 GoldenGate
Oracle GoldenGate 是一款实时数据集成和复制软件，支持：
- **实时数据捕获**：基于日志的 CDC（Change Data Capture）
- **异构复制**：Oracle ↔ MySQL/PostgreSQL/SQL Server
- **双向复制**：支持多主复制
- **数据转换**：支持字段映射、过滤、转换

### 1.2 核心组件
| 组件 | 功能 | 部署位置 |
|------|------|---------|
| Extract | 从源数据库捕获变更 | 源端 |
| Data Pump | 传输 Trail 文件到目标端 | 源端 |
| Replicat | 应用变更到目标数据库 | 目标端 |
| Trail File | 存储变更数据的文件 | 源端/目标端 |
| Manager | 管理进程、端口、日志 | 源端/目标端 |

### 1.3 架构图
```plaintext
┌─────────────────────────────────────────────────┐
│              源数据库 (Oracle)                   │
│                                                 │
│  ┌──────────┐      ┌──────────┐                │
│  │ Extract  │─────►│Data Pump │                │
│  │ (捕获)   │      │ (传输)   │                │
│  └──────────┘      └──────────┘                │
│       │                  │                      │
│       ▼                  ▼                      │
│  Local Trail        Remote Trail               │
│  (/u01/ogg/dirdat)  (传输到目标端)              │
└─────────────────────────────────────────────────┘
                        │
                        │ 网络传输
                        ▼
┌─────────────────────────────────────────────────┐
│              目标数据库 (Oracle/MySQL)           │
│                                                 │
│       ┌──────────┐                              │
│       │Replicat  │                              │
│       │ (应用)   │                              │
│       └──────────┘                              │
│            │                                    │
│            ▼                                    │
│       目标表                                    │
└─────────────────────────────────────────────────┘
```

### 1.4 应用场景
- **数据库迁移**：Oracle → MySQL/PostgreSQL
- **灾备同步**：实时数据复制到异地
- **读写分离**：主库写入，从库查询
- **数据集成**：多个数据源汇总到数据仓库
- **双活架构**：双向复制，多地写入

---

## 2. 环境准备

### 2.1 硬件与软件要求
```plaintext
源端服务器：
- CPU: 8核+
- 内存: 16GB+
- 磁盘: 500GB+（存储 Trail 文件）
- 网络: 千兆网卡

目标端服务器：
- 配置与源端相同

软件版本：
- Oracle GoldenGate 19.1+ (for Oracle)
- Oracle GoldenGate 19.1+ (for MySQL/PostgreSQL)
- Oracle Database 11g+
- MySQL 5.7+ / PostgreSQL 10+
```

### 2.2 数据库准备（Oracle 源端）
```sql
-- 启用归档模式
SELECT log_mode FROM v$database;
-- 如果是 NOARCHIVELOG：
SHUTDOWN IMMEDIATE;
STARTUP MOUNT;
ALTER DATABASE ARCHIVELOG;
ALTER DATABASE OPEN;

-- 启用补充日志（Supplemental Logging）
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;

-- 为表启用主键补充日志
ALTER TABLE schema_name.table_name ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;

-- 或为整个 Schema 启用
BEGIN
  FOR rec IN (SELECT table_name FROM dba_tables WHERE owner = 'APP_SCHEMA') LOOP
    EXECUTE IMMEDIATE 'ALTER TABLE APP_SCHEMA.' || rec.table_name || ' ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS';
  END LOOP;
END;
/

-- 验证补充日志
SELECT supplemental_log_data_min, supplemental_log_data_pk 
FROM v$database;
-- 输出：YES, YES
```

### 2.3 创建 GoldenGate 用户
```sql
-- 源端 Oracle
CREATE USER ggadmin IDENTIFIED BY GG123#Admin;
GRANT CONNECT, RESOURCE TO ggadmin;
GRANT SELECT ANY DICTIONARY TO ggadmin;
GRANT SELECT ANY TABLE TO ggadmin;
GRANT FLASHBACK ANY TABLE TO ggadmin;
GRANT EXECUTE ON DBMS_FLASHBACK TO ggadmin;
GRANT UNLIMITED TABLESPACE TO ggadmin;

-- 授予 DBA 权限（生产环境可细化）
GRANT DBA TO ggadmin;

-- 目标端 Oracle
CREATE USER ggadmin IDENTIFIED BY GG123#Admin;
GRANT CONNECT, RESOURCE, DBA TO ggadmin;
```

---

## 3. GoldenGate 安装

### 3.1 下载与解压
```bash
# 下载 Oracle GoldenGate for Oracle
# https://www.oracle.com/middleware/technologies/goldengate-downloads.html

# 解压到安装目录
mkdir -p /u01/ogg
cd /u01/ogg
unzip 191004_fbo_ggs_Linux_x64_Oracle_64bit.zip

# 设置环境变量
cat >> ~/.bash_profile <<EOF
export OGG_HOME=/u01/ogg
export PATH=\$OGG_HOME:\$PATH
export LD_LIBRARY_PATH=\$ORACLE_HOME/lib:\$LD_LIBRARY_PATH
EOF

source ~/.bash_profile
```

### 3.2 创建子目录
```bash
cd $OGG_HOME
./ggsci

GGSCI> CREATE SUBDIRS

# 创建的目录：
# dirprm/  - 参数文件
# dirdat/  - Trail 文件
# dirchk/  - Checkpoint 文件
# dirtmp/  - 临时文件
# dirpcs/  - 进程状态文件
# dirrpt/  - 报告文件
# dirdef/  - 数据定义文件

GGSCI> EXIT
```

### 3.3 配置 Manager
```bash
cd $OGG_HOME
./ggsci

GGSCI> EDIT PARAMS MGR

# 添加以下内容
PORT 7809
DYNAMICPORTLIST 7810-7820
AUTORESTART EXTRACT *, RETRIES 5, WAITMINUTES 3
PURGEOLDEXTRACTS ./dirdat/*, USECHECKPOINTS, MINKEEPDAYS 7
LAGREPORTHOURS 1
LAGINFOMINUTES 30
LAGCRITICALMINUTES 45

# 保存并退出

# 启动 Manager
GGSCI> START MGR
GGSCI> INFO MGR

# 输出：
# Manager is running (IP port orcl-source.7809, Process ID 12345).
```

---

## 4. 配置 Extract（源端）

### 4.1 添加 Trandata
```bash
GGSCI> DBLOGIN USERID ggadmin, PASSWORD GG123#Admin

# 为表启用事务数据捕获
GGSCI> ADD TRANDATA APP_SCHEMA.ORDERS
GGSCI> ADD TRANDATA APP_SCHEMA.USERS
GGSCI> ADD TRANDATA APP_SCHEMA.PRODUCTS

# 或为整个 Schema 启用
GGSCI> ADD SCHEMATRANDATA APP_SCHEMA

# 验证
GGSCI> INFO TRANDATA APP_SCHEMA.ORDERS
```

### 4.2 创建 Extract 进程
```bash
GGSCI> ADD EXTRACT ext1, TRANLOG, BEGIN NOW
GGSCI> ADD EXTTRAIL ./dirdat/lt, EXTRACT ext1

# 编辑 Extract 参数
GGSCI> EDIT PARAMS ext1
```

```plaintext
-- ext1.prm
EXTRACT ext1
USERID ggadmin, PASSWORD GG123#Admin
EXTTRAIL ./dirdat/lt
DISCARDFILE ./dirrpt/ext1.dsc, PURGE
WARNLONGTRANS 2H, CHECKINTERVAL 30M

-- 捕获的表
TABLE APP_SCHEMA.ORDERS;
TABLE APP_SCHEMA.USERS;
TABLE APP_SCHEMA.PRODUCTS;

-- 过滤条件（可选）
-- TABLE APP_SCHEMA.ORDERS, WHERE (status = 'ACTIVE');

-- 字段映射（可选）
-- TABLE APP_SCHEMA.ORDERS, COLSEXCEPT (internal_notes);
```

### 4.3 创建 Data Pump（可选，用于远程传输）
```bash
GGSCI> ADD EXTRACT pump1, EXTTRAILSOURCE ./dirdat/lt
GGSCI> ADD RMTTRAIL ./dirdat/rt, EXTRACT pump1

# 编辑 Data Pump 参数
GGSCI> EDIT PARAMS pump1
```

```plaintext
-- pump1.prm
EXTRACT pump1
USERID ggadmin, PASSWORD GG123#Admin
RMTHOST orcl-target, MGRPORT 7809
RMTTRAIL ./dirdat/rt
PASSTHRU

-- 传输的表
TABLE APP_SCHEMA.*;
```

---

## 5. 配置 Replicat（目标端）

### 5.1 创建 Checkpoint 表
```bash
# 在目标端 GGSCI
GGSCI> DBLOGIN USERID ggadmin, PASSWORD GG123#Admin
GGSCI> ADD CHECKPOINTTABLE ggadmin.checkpoint

# 验证
SELECT * FROM ggadmin.checkpoint;
```

### 5.2 创建 Replicat 进程
```bash
GGSCI> ADD REPLICAT rep1, EXTTRAIL ./dirdat/rt, CHECKPOINTTABLE ggadmin.checkpoint

# 编辑 Replicat 参数
GGSCI> EDIT PARAMS rep1
```

```plaintext
-- rep1.prm
REPLICAT rep1
ASSUMETARGETDEFS
USERID ggadmin, PASSWORD GG123#Admin
DISCARDFILE ./dirrpt/rep1.dsc, PURGE
HANDLECOLLISIONS

-- 目标表映射
MAP APP_SCHEMA.ORDERS, TARGET APP_SCHEMA.ORDERS;
MAP APP_SCHEMA.USERS, TARGET APP_SCHEMA.USERS;
MAP APP_SCHEMA.PRODUCTS, TARGET APP_SCHEMA.PRODUCTS;

-- 字段映射（可选）
-- MAP APP_SCHEMA.ORDERS, TARGET APP_SCHEMA.ORDERS, &
--   COLMAP (order_id = order_id, &
--           user_id = user_id, &
--           amount = amount * 1.1);  -- 转换示例

-- 过滤条件（可选）
-- MAP APP_SCHEMA.ORDERS, TARGET APP_SCHEMA.ORDERS, &
--   WHERE (status = 'COMPLETED');
```

---

## 6. 初始化数据加载

### 6.1 使用 RMAN 或 DataPump 初始化
```bash
# 方法1：使用 DataPump 导出/导入
# 源端导出
expdp ggadmin/GG123#Admin@ORCL DIRECTORY=DATA_PUMP_DIR DUMPFILE=init_load.dmp SCHEMAS=APP_SCHEMA

# 目标端导入
impdp ggadmin/GG123#Admin@ORCL_TARGET DIRECTORY=DATA_PUMP_DIR DUMPFILE=init_load.dmp SCHEMAS=APP_SCHEMA

# 方法2：使用 GoldenGate Initial Load
GGSCI> ADD EXTRACT init1, SOURCEISTABLE
GGSCI> EDIT PARAMS init1
```

```plaintext
-- init1.prm
EXTRACT init1
USERID ggadmin, PASSWORD GG123#Admin
RMTHOST orcl-target, MGRPORT 7809
RMTTASK REPLICAT, GROUP rep_init
TABLE APP_SCHEMA.ORDERS;
TABLE APP_SCHEMA.USERS;
TABLE APP_SCHEMA.PRODUCTS;
```

```bash
# 目标端创建 Initial Load Replicat
GGSCI> ADD REPLICAT rep_init, SPECIALRUN
GGSCI> EDIT PARAMS rep_init
```

```plaintext
-- rep_init.prm
REPLICAT rep_init
ASSUMETARGETDEFS
USERID ggadmin, PASSWORD GG123#Admin
MAP APP_SCHEMA.*, TARGET APP_SCHEMA.*;
```

---

## 7. 启动与监控

### 7.1 启动进程
```bash
# 源端
GGSCI> START EXTRACT ext1
GGSCI> START EXTRACT pump1

# 目标端
GGSCI> START REPLICAT rep1

# 查看所有进程状态
GGSCI> INFO ALL

# 输出示例：
# Program     Status      Group       Lag at Chkpt  Time Since Chkpt
# MANAGER     RUNNING
# EXTRACT     RUNNING     EXT1        00:00:03      00:00:02
# EXTRACT     RUNNING     PUMP1       00:00:00      00:00:01
# REPLICAT    RUNNING     REP1        00:00:05      00:00:03
```

### 7.2 监控延迟
```bash
GGSCI> STATS EXTRACT ext1

# 输出示例：
# Sending STATS request to EXTRACT EXT1 ...
# Start of Statistics at 2025-11-11 15:30:00.
# Output to ./dirdat/lt:
# Extracting from APP_SCHEMA.ORDERS to APP_SCHEMA.ORDERS:
# *** Total statistics since 2025-11-11 10:00:00 ***
#         Total inserts                      12345
#         Total updates                       6789
#         Total deletes                        123
#         Total discards                         0
#         Total operations                   19257

GGSCI> STATS REPLICAT rep1

# 查看详细延迟
GGSCI> LAG EXTRACT ext1
GGSCI> LAG REPLICAT rep1
```

### 7.3 查看报告
```bash
# 查看 Extract 报告
GGSCI> VIEW REPORT ext1

# 查看 Replicat 报告
GGSCI> VIEW REPORT rep1

# 查看错误
GGSCI> VIEW GGSEVT
```

---

## 8. 高级配置

### 8.1 双向复制（Bidirectional Replication）
```plaintext
-- 站点A Extract (ext_a)
EXTRACT ext_a
USERID ggadmin, PASSWORD GG123#Admin
EXTTRAIL ./dirdat/la
TRANLOGOPTIONS EXCLUDEUSER ggadmin  -- 排除 GG 自身的变更
TABLE APP_SCHEMA.*;

-- 站点A Replicat (rep_a)
REPLICAT rep_a
USERID ggadmin, PASSWORD GG123#Admin
ASSUMETARGETDEFS
MAP APP_SCHEMA.*, TARGET APP_SCHEMA.*;

-- 站点B 配置类似，注意：
-- 1. 使用不同的 GGSCI 用户或标记
-- 2. 启用冲突检测和解决
```

### 8.2 冲突检测与解决
```plaintext
-- rep1.prm
REPLICAT rep1
USERID ggadmin, PASSWORD GG123#Admin

-- 冲突处理策略
HANDLECOLLISIONS  -- 自动处理冲突（覆盖）

-- 或使用 CDR (Conflict Detection and Resolution)
MAP APP_SCHEMA.ORDERS, TARGET APP_SCHEMA.ORDERS, &
  RESOLVECONFLICT (UPDATEROWEXISTS, (DEFAULT, OVERWRITE)), &
  RESOLVECONFLICT (INSERTROWEXISTS, (DEFAULT, OVERWRITE)), &
  RESOLVECONFLICT (DELETEROWEXISTS, (DEFAULT, IGNORE));
```

### 8.3 数据转换
```plaintext
-- rep1.prm
REPLICAT rep1
USERID ggadmin, PASSWORD GG123#Admin

-- 字段映射与转换
MAP APP_SCHEMA.ORDERS, TARGET APP_SCHEMA.ORDERS_NEW, &
  COLMAP ( &
    order_id = order_id, &
    user_id = user_id, &
    amount_usd = amount * 6.5,  -- 汇率转换
    created_date = @STREXT(created_at, 1, 10),  -- 提取日期
    status_code = @IF(status = 'ACTIVE', 1, 0)  -- 条件转换
  );

-- 过滤行
MAP APP_SCHEMA.ORDERS, TARGET APP_SCHEMA.ORDERS, &
  WHERE (amount > 100 AND status = 'COMPLETED');
```

### 8.4 DDL 复制
```bash
# 源端启用 DDL 复制
GGSCI> DBLOGIN USERID ggadmin, PASSWORD GG123#Admin
GGSCI> ADD TRANDATA APP_SCHEMA.*, ALLCOLS

# 编辑 Extract 参数
GGSCI> EDIT PARAMS ext1
```

```plaintext
-- ext1.prm
EXTRACT ext1
USERID ggadmin, PASSWORD GG123#Admin
EXTTRAIL ./dirdat/lt
DDL INCLUDE MAPPED OBJNAME APP_SCHEMA.*
TABLE APP_SCHEMA.*;
```

```plaintext
-- rep1.prm
REPLICAT rep1
USERID ggadmin, PASSWORD GG123#Admin
ASSUMETARGETDEFS
DDL INCLUDE MAPPED OBJNAME APP_SCHEMA.*
MAP APP_SCHEMA.*, TARGET APP_SCHEMA.*;
```

---

## 9. 故障处理

### 9.1 Extract 进程 ABENDED
```bash
# 查看错误
GGSCI> VIEW REPORT ext1

# 常见原因：
# 1. 归档日志缺失
# 2. 补充日志未启用
# 3. 权限不足

# 解决后重启
GGSCI> START EXTRACT ext1

# 如果需要从特定 SCN 开始
GGSCI> START EXTRACT ext1, ATCSN 12345678
```

### 9.2 Replicat 进程 ABENDED
```bash
# 查看错误
GGSCI> VIEW REPORT rep1

# 常见原因：
# 1. 主键冲突
# 2. 目标表不存在
# 3. 数据类型不匹配

# 跳过错误记录
GGSCI> ALTER REPLICAT rep1, EXTSEQNO 123, EXTRBA 456789

# 或启用 HANDLECOLLISIONS
GGSCI> EDIT PARAMS rep1
# 添加：HANDLECOLLISIONS

GGSCI> START REPLICAT rep1
```

### 9.3 延迟过大
```bash
# 检查延迟
GGSCI> LAG REPLICAT rep1

# 原因分析：
# 1. 目标数据库性能瓶颈
# 2. 网络带宽不足
# 3. Replicat 单线程处理

# 解决方案：
# 1. 启用并行 Replicat
GGSCI> EDIT PARAMS rep1
# 添加：
# PARALLELREPLICAT 4
# MAP APP_SCHEMA.*, TARGET APP_SCHEMA.*, THREAD (1);
# MAP APP_SCHEMA.*, TARGET APP_SCHEMA.*, THREAD (2);
# MAP APP_SCHEMA.*, TARGET APP_SCHEMA.*, THREAD (3);
# MAP APP_SCHEMA.*, TARGET APP_SCHEMA.*, THREAD (4);

# 2. 优化目标数据库索引
# 3. 增加网络带宽
```

### 9.4 Trail 文件清理
```bash
# 手动清理
GGSCI> DELETE EXTRACT ext1, EXTTRAIL ./dirdat/lt*

# 自动清理（在 MGR 参数中配置）
PURGEOLDEXTRACTS ./dirdat/*, USECHECKPOINTS, MINKEEPDAYS 7
```

---

## 10. 监控脚本

```bash
#!/bin/bash
# check_ogg.sh

echo "=== GoldenGate Status Check ==="

$OGG_HOME/ggsci <<EOF
INFO ALL
LAG EXTRACT ext1
LAG REPLICAT rep1
STATS EXTRACT ext1, TOTAL
STATS REPLICAT rep1, TOTAL
EXIT
EOF

# 检查 Manager 进程
if ps -ef | grep -v grep | grep mgr > /dev/null; then
    echo "✅ Manager is running"
else
    echo "❌ Manager is NOT running"
fi

# 检查 Trail 文件大小
echo "Trail file sizes:"
du -sh $OGG_HOME/dirdat/*
```

---

## 11. 性能优化

### 11.1 Extract 优化
```plaintext
-- ext1.prm
EXTRACT ext1
USERID ggadmin, PASSWORD GG123#Admin
EXTTRAIL ./dirdat/lt

-- 批量提交
GROUPTRANSOPS 10000

-- 压缩 Trail 文件
COMPRESSDELETES
COMPRESSUPDATES

-- 并行读取
TRANLOGOPTIONS PARALLELISM 4
```

### 11.2 Replicat 优化
```plaintext
-- rep1.prm
REPLICAT rep1
USERID ggadmin, PASSWORD GG123#Admin

-- 批量应用
BATCHSQL
BATCHSQL BATCHTRANSOPS 1000

-- 禁用触发器（提高性能）
DBOPTIONS SUPPRESSTRIGGERS

-- 并行应用
PARALLELREPLICAT 4
```

---

## 12. 最佳实践

1. **监控告警**：延迟 > 5分钟告警
2. **定期清理**：Trail 文件保留7天
3. **备份参数**：定期备份 dirprm/ 目录
4. **测试验证**：生产部署前在测试环境验证
5. **文档记录**：记录所有配置和变更
6. **权限最小化**：生产环境细化 GG 用户权限
7. **网络优化**：使用专用网络，避免公网传输

---

**参考文档**：
- Oracle GoldenGate 19c Documentation
- Oracle GoldenGate Best Practices (MOS Doc ID 1321696.1)
- Oracle GoldenGate Troubleshooting Guide

