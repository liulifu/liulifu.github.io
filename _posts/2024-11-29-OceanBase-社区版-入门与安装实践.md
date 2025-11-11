---
layout: post
title: "OceanBase 社区版：入门与安装实践"
date: 2024-11-29
categories: dba
author: Lifu
---

# OceanBase 社区版：入门与安装实践

适用读者：DBA、分布式数据库初学者、应用开发
目标：使用 OBD 快速部署 OceanBase CE 最小集群，掌握连接、基础运维与常见问题处理。

---

## 1. OceanBase 概述

- 类型：分布式事务型数据库（NewSQL），MySQL/Oracle 双协议兼容
- 特性：高可用、多副本强一致、弹性扩缩容、跨机房容灾
- 典型场景：金融核心、交易、账务、用户画像

---

## 2. 快速部署（obd 最小集群）

环境：Linux x86_64，内存 ≥ 16GB，磁盘 ≥ 200GB，关闭透明大页、NUMA

```bash
# 1) 安装 obd
yum install -y yum-utils
yum-config-manager --add-repo https://mirrors.aliyun.com/oceanbase/OceanBase.repo
yum install -y obd obclient

# 2) 生成最小拓扑
yum install -y wget && mkdir -p ~/ob && cd ~/ob
obd cluster template -t mini -o obmini.yaml

# 3) 部署并启动
oh=`hostname -I | awk '{print $1}'`
# 如需修改监听与数据目录，编辑 obmini.yaml 后执行：
obd cluster deploy obmini -c obmini.yaml
obd cluster start obmini
obd cluster display obmini
```

---

## 3. 连接与基本操作

```bash
# 连接到 MySQL 兼容接口（默认 2881）
obclient -h127.0.0.1 -P2881 -uroot@sys -p -Doceanbase
# 初始密码为空，首次登录后设置：
ALTER USER root IDENTIFIED BY 'Root@123';

# 创建 MySQL 租户与业务库
CREATE RESOURCE UNIT unit1 MAX_CPU 2, MEMORY_SIZE '4G';
CREATE RESOURCE POOL pool1 UNIT='unit1', UNIT_NUM=1, ZONE_LIST=('zone1');
CREATE TENANT IF NOT EXISTS t_mysql CHARSET='utf8mb4' COLLATE='utf8mb4_bin' 
  REPLICA_NUM=1 ZONE_LIST=('zone1') PRIMARY_ZONE='zone1' 
  RESOURCE_POOL_LIST=('pool1');

# 切换到租户
oBclient -h127.0.0.1 -P2881 -uroot@t_mysql -p -Doceanbase
CREATE DATABASE demo;
USE demo;
CREATE TABLE t1(id bigint primary key, name varchar(50));
INSERT INTO t1 VALUES (1,'hello'),(2,'oceanbase');
SELECT * FROM t1;
```

---

## 4. 运维常用

```bash
# 查询租户、资源
SHOW TENANT;
SHOW RESOURCE POOL;
SHOW PARAMETERS LIKE 'memstore_limit_percentage';

# 查看系统租户视图（登录 sys 租户）
SELECT * FROM oceanbase.__all_server;
SELECT * FROM oceanbase.__all_virtual_table;
```

---

## 5. 备份与高可用

- 副本策略：最小 1 副本（测试）、建议生产 >= 3 副本
- 备份：日志归档 + 数据备份（对象存储/共享存储），按租户维度
- 容灾：同城双活/两地三中心，通过多 Zone + 复制拓扑实现

---

## 6. 常见问题

- 启动失败：检查内存配置（memstore、系统预留）、磁盘空间、端口占用（2881/2882）
- 连接报错 4012：租户未激活或 root 没有密码；切换 sys 租户检查
- SQL 兼容：启用 MySQL/Oracle 模式的租户与语法细节

---

## 7. 最佳实践

1) 资源隔离（租户级/资源池）；2) 3 副本高可用；3) 参数变更审批；4) 监控与告警（CPU、IO、LS 日志）；5) 压测与容量规划；6) 备份演练；7) 升级灰度

---

参考：
- OceanBase CE 文档 https://open.oceanbase.com
- OBD 工具 https://github.com/oceanbase/obd

