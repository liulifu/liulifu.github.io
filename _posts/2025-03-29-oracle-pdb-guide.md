---
layout: post
title: "Oracle PDB 详细使用指南"
date: 2025-03-29
categories: dba
author: Lifu
---

# Oracle PDB 详细使用指南

## 目录
1. [概述](#1-概述)
2. [基础架构](#2-基础架构)
3. [安装和配置](#3-安装和配置)
4. [日常管理操作](#4-日常管理操作)
5. [高级特性](#5-高级特性)
6. [性能调优](#6-性能调优)
7. [故障排除](#7-故障排除)
8. [最佳实践](#8-最佳实践)

## 1. 概述

### 1.1 什么是 PDB
PDB (Pluggable Database) 是 Oracle 12c 及更高版本引入的多租户架构的核心组件。它是一个完全封装的数据库，包含自己的数据文件、数据字典和非公共对象。

### 1.2 优势
- 资源共享和优化
- 简化管理维护
- 灵活的部署选项
- 增强的安全性和隔离性
- 降低许可证成本

## 2. 基础架构

### 2.1 CDB 架构
CDB (Container Database) 包含以下组件：
- ROOT (CDB$ROOT)：存储 Oracle 提供的公共对象
- SEED (PDB$SEED)：用于创建新 PDB 的只读模板
- PDBs：一个或多个可插拔数据库

### 2.2 文件结构
```
ORACLE_BASE
├── admin
│   └── CDB
│       ├── adump
│       ├── bdump
│       ├── cdump
│       └── udump
├── oradata
│   └── CDB
│       ├── control01.ctl
│       ├── redo01.log
│       ├── system01.dbf
│       ├── temp01.dbf
│       └── users01.dbf
└── product
    └── 19.0.0
        └── dbhome_1
```

## 3. 安装和配置

### 3.1 先决条件
- Oracle Database 软件安装
- 足够的磁盘空间
- 适当的内存配置
- 操作系统要求

### 3.2 创建 CDB
```sql
CREATE DATABASE CDB
  USER SYS IDENTIFIED BY password
  USER SYSTEM IDENTIFIED BY password
  LOGFILE GROUP 1 ('/u01/app/oracle/oradata/cdb/redo01.log') SIZE 100M,
          GROUP 2 ('/u01/app/oracle/oradata/cdb/redo02.log') SIZE 100M
  MAXLOGFILES 5
  MAXLOGMEMBERS 5
  MAXLOGHISTORY 1
  MAXDATAFILES 100
  CHARACTER SET AL32UTF8
  NATIONAL CHARACTER SET AL16UTF16
  EXTENT MANAGEMENT LOCAL
  DATAFILE '/u01/app/oracle/oradata/cdb/system01.dbf'
    SIZE 700M REUSE AUTOEXTEND ON NEXT 10240K MAXSIZE UNLIMITED
  SYSAUX DATAFILE '/u01/app/oracle/oradata/cdb/sysaux01.dbf'
    SIZE 550M REUSE AUTOEXTEND ON NEXT 10240K MAXSIZE UNLIMITED
  DEFAULT TABLESPACE users
    DATAFILE '/u01/app/oracle/oradata/cdb/users01.dbf'
    SIZE 500M REUSE AUTOEXTEND ON MAXSIZE UNLIMITED
  DEFAULT TEMPORARY TABLESPACE temp
    TEMPFILE '/u01/app/oracle/oradata/cdb/temp01.dbf'
    SIZE 20M REUSE AUTOEXTEND ON NEXT 640K MAXSIZE UNLIMITED
  UNDO TABLESPACE undotbs1
    DATAFILE '/u01/app/oracle/oradata/cdb/undotbs01.dbf'
    SIZE 200M REUSE AUTOEXTEND ON NEXT 5120K MAXSIZE UNLIMITED
  ENABLE PLUGGABLE DATABASE
    SEED
    FILE_NAME_CONVERT = ('/u01/app/oracle/oradata/cdb/',
                        '/u01/app/oracle/oradata/pdbseed/')
    SYSTEM DATAFILES SIZE 125M AUTOEXTEND ON NEXT 10240K MAXSIZE UNLIMITED
    SYSAUX DATAFILES SIZE 100M;
```

### 3.3 创建 PDB
```sql
CREATE PLUGGABLE DATABASE pdb1
  ADMIN USER pdb_admin IDENTIFIED BY password
  ROLES = (CONNECT)
  DEFAULT TABLESPACE users
    DATAFILE '/u01/app/oracle/oradata/cdb/pdb1/users01.dbf'
    SIZE 250M AUTOEXTEND ON NEXT 1M MAXSIZE UNLIMITED
  FILE_NAME_CONVERT = ('/u01/app/oracle/oradata/pdbseed/',
                      '/u01/app/oracle/oradata/pdb1/');
```

## 4. 日常管理操作

### 4.1 基本操作
```sql
-- 查看所有 PDB
SELECT name, open_mode FROM v$pdbs;

-- 切换容器
ALTER SESSION SET CONTAINER = pdb1;

-- 启动 PDB
ALTER PLUGGABLE DATABASE pdb1 OPEN;

-- 关闭 PDB
ALTER PLUGGABLE DATABASE pdb1 CLOSE;

-- 重启 PDB
ALTER PLUGGABLE DATABASE pdb1 CLOSE IMMEDIATE;
ALTER PLUGGABLE DATABASE pdb1 OPEN;
```

### 4.2 用户管理
```sql
-- 创建用户
CREATE USER user1 IDENTIFIED BY password
  DEFAULT TABLESPACE users
  TEMPORARY TABLESPACE temp
  QUOTA UNLIMITED ON users;

-- 授权
GRANT CREATE SESSION TO user1;
GRANT CREATE TABLE TO user1;
GRANT CREATE VIEW TO user1;
```

### 4.3 备份与恢复
```sql
-- RMAN 备份
BACKUP PLUGGABLE DATABASE pdb1;

-- 导出导入
expdp system/password@pdb1 directory=dp_dir dumpfile=pdb1.dmp
impdp system/password@pdb2 directory=dp_dir dumpfile=pdb1.dmp
```

## 5. 高级特性

### 5.1 克隆 PDB
```sql
CREATE PLUGGABLE DATABASE pdb2 FROM pdb1
  FILE_NAME_CONVERT = ('/pdb1/', '/pdb2/');
```

### 5.2 重定位 PDB
```sql
-- 源 CDB
ALTER PLUGGABLE DATABASE pdb1 CLOSE;
ALTER PLUGGABLE DATABASE pdb1 
  UNPLUG INTO '/tmp/pdb1.xml';

-- 目标 CDB
CREATE PLUGGABLE DATABASE pdb1 
  USING '/tmp/pdb1.xml'
  NOCOPY;
```

### 5.3 资源管理
```sql
-- 创建资源计划
CREATE RESOURCE PLAN pdb_plan;

-- 添加指令
BEGIN
  DBMS_RESOURCE_MANAGER.CREATE_PLAN_DIRECTIVE(
    PLAN => 'pdb_plan',
    PLUGGABLE_DATABASE => 'pdb1',
    SHARES => 3);
END;
/
```

## 6. 性能调优

### 6.1 内存管理
```sql
-- 设置 PDB 的内存限制
ALTER SYSTEM SET SGA_TARGET = 4G SCOPE = BOTH;
ALTER SYSTEM SET PGA_AGGREGATE_TARGET = 1G SCOPE = BOTH;
```

### 6.2 性能监控
```sql
-- 查看等待事件
SELECT event, total_waits, time_waited
FROM v$system_event
ORDER BY time_waited DESC;

-- 查看 SQL 性能
SELECT sql_id, executions, elapsed_time/1000000 elapsed_seconds
FROM v$sql
ORDER BY elapsed_time DESC;
```

### 6.3 统计信息管理
```sql
-- 收集统计信息
EXEC DBMS_STATS.GATHER_SCHEMA_STATS('SCHEMA_NAME');
```

## 7. 故障排除

### 7.1 常见问题
1. PDB 无法打开
```sql
-- 检查告警日志
SELECT message_text
FROM v$diag_alert_ext
WHERE component_id = 'rdbms'
ORDER BY originating_timestamp DESC;

-- 检查数据文件状态
SELECT name, status FROM v$datafile;
```

2. 性能问题
```sql
-- 检查活动会话
SELECT sid, serial#, username, status
FROM v$session
WHERE type != 'BACKGROUND';

-- 检查锁等待
SELECT holding.sid holding_sid,
       waiting.sid waiting_sid,
       holding.username holding_user,
       waiting.username waiting_user
FROM v$lock l1
JOIN v$session holding ON l1.sid = holding.sid
JOIN v$lock l2 ON l1.id1 = l2.id1 AND l2.request > 0
JOIN v$session waiting ON l2.sid = waiting.sid
WHERE l1.block = 1;
```

## 8. 最佳实践

### 8.1 设计建议
1. PDB 命名规范
- 使用有意义的名称
- 包含环境标识（dev/test/prod）
- 避免特殊字符

2. 文件管理
- 使用 OMF（Oracle Managed Files）
- 规划足够的存储空间
- 实施适当的备份策略

### 8.2 安全建议
1. 访问控制
- 实施最小权限原则
- 定期审计用户权限
- 使用 profiles 限制资源使用

2. 网络安全
- 使用 SSL/TLS 加密
- 实施网络访问控制列表
- 监控异常访问

### 8.3 维护建议
1. 日常维护
- 定期收集统计信息
- 监控空间使用
- 检查告警日志

2. 性能优化
- 定期审查执行计划
- 维护索引
- 清理历史数据

3. 备份策略
- 实施增量备份
- 定期测试恢复
- 保留备份历史

### 8.4 监控清单
1. 基础监控
- CPU 使用率
- 内存使用情况
- I/O 性能
- 网络延迟

2. 数据库监控
- 表空间使用率
- 会话数量
- 锁等待
- SQL 响应时间

3. 业务监控
- 事务吞吐量
- 用户连接数
- 业务关键指标
- 响应时间 SLA

## 附录

### A. 常用命令速查
```sql
-- 切换容器
SHOW CON_NAME;
ALTER SESSION SET CONTAINER = pdb_name;

-- 创建 PDB
CREATE PLUGGABLE DATABASE pdb_name 
  ADMIN USER admin_user IDENTIFIED BY password;

-- PDB 生命周期管理
ALTER PLUGGABLE DATABASE pdb_name OPEN;
ALTER PLUGGABLE DATABASE pdb_name CLOSE;
DROP PLUGGABLE DATABASE pdb_name INCLUDING DATAFILES;

-- 状态查看
SELECT con_id, name, open_mode FROM v$pdbs;
SELECT instance_name, status FROM v$instance;
```

### B. 常用视图
1. 容器相关视图
- V$CONTAINERS
- V$PDBS
- CDB_USERS
- DBA_PDBS

2. 性能相关视图
- V$SYSSTAT
- V$SYSTEM_EVENT
- V$SESSION_WAIT
- V$SQL

3. 存储相关视图
- V$DATAFILE
- V$TEMPFILE
- V$CONTROLFILE
- V$LOGFILE

### C. 参考资料
- Oracle 官方文档
- Oracle Support 知识库
- Oracle 技术网络（OTN）
- Oracle 学习资源库
