---
layout: post
title: "人大金仓 KingbaseES：入门与安装实践"
date: 2023-07-18
categories: dba
author: Lifu
---

# 人大金仓 KingbaseES：入门与安装实践

适用读者：DBA、行业信息化人员、替代评估人员
目标：完成 KingbaseES 安装、初始化、基础 SQL 与备份恢复。

---

## 1. KingbaseES 概述

- 类型：国产关系型数据库，PostgreSQL 深度兼容
- 端口：默认 54321；客户端：ksql；服务管理：kb_ctl
- 场景：政务、能源、运营商、金融

---

## 2. 安装（Linux 示例）

```bash
# 1) 安装
rpm -ivh kingbaseES-std-<version>.rpm

# 2) 初始化集簇（系统用户 kingbase）
useradd -m kingbase
su - kingbase
kb_ctl init -D /data/kingbase/data -U system -W 'System@123' --encoding=UTF8

# 3) 启动
authdir=/data/kingbase/data
kb_ctl start -D $authdir
kb_ctl status -D $authdir
```

---

## 3. 基础使用

```bash
ksql -h 127.0.0.1 -p 54321 -U system -W
```

```sql
-- 创建角色与数据库
CREATE ROLE demo LOGIN PASSWORD 'Demo@123';
CREATE DATABASE demo OWNER demo ENCODING 'UTF8';
\c demo demo
CREATE TABLE t1(id int primary key, name varchar(50));
INSERT INTO t1 VALUES (1,'hello'),(2,'kingbase');
SELECT * FROM t1;
```

---

## 4. 连接与权限

- pg_hba.conf 规则与 libpq 连接串与 PG 基本一致
- 建议仅开放内网、白名单控制，强密码策略，最小权限

```conf
# $DATA/pg_hba.conf 示例
host    all     all     192.168.10.0/24    md5
```

---

## 5. 备份与恢复

```bash
# 逻辑备份/恢复
kb_dump -h 127.0.0.1 -p 54321 -U demo -d demo -f /backup/demo.sql
kb_restore -h 127.0.0.1 -p 54321 -U demo -d demo /backup/demo.sql

# 物理备份（停库快照或专用工具）
kb_ctl stop -D /data/kingbase/data
# 文件系统快照 -> 复制 -> 启库
kb_ctl start -D /data/kingbase/data
```

---

## 6. 常见问题

- 端口冲突：54321 被占用，修改 postgresql.conf 中 port
- 权限不足：检查 pg_hba.conf 与用户权限
- 性能：shared_buffers、work_mem、checkpoint、autovacuum 参照 PG 调优

---

## 7. 最佳实践

1) 数据与 WAL 分盘；2) 备份 3-2-1；3) 监控（pg_stat、系统指标）；4) 变更审批；5) 定期 VACUUM/ANALYZE

---

参考：
- KingbaseES 文档 https://www.kingbase.com.cn

