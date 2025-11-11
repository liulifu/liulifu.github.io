---
layout: post
title: "openGauss 数据库：入门与安装实践"
date: 2025-03-11
categories: dba
author: Lifu
---

# openGauss 数据库：入门与安装实践

适用读者：DBA、数据库初学者、应用开发与运维工程师
目标：完成 openGauss 单机/最小集群快速安装，掌握基础运维、备份恢复与常见问题处理。

---

## 1. openGauss 概述

- 类型：企业级开源关系型数据库，PostgreSQL 衍生，SQL 兼容度高
- 典型场景：政企核心系统、金融、运营商、制造业
- 主要特性：多核并行、向量化执行、内存表、安全审计、物化视图、兼容 Oracle/PostgreSQL 语法
- 生态：openGauss、openEuler、FusionInsight、GaussDB（商用）

---

## 2. 快速体验（Docker 单机）

依赖：Docker 20+，内存 ≥ 4GB，磁盘 ≥ 20GB

```bash
# 拉取镜像并启动（默认数据库 og，端口 5432）
docker run -d --name opengauss \
  -e GS_PASSWORD='Gauss@123' \
  -p 5432:5432 \
  enmotech/opengauss:5.0.0

# 使用 psql/gsql 连接
psql -h 127.0.0.1 -p 5432 -U gaussdb -d postgres  # 默认用户 gaussdb
# 密码：Gauss@123
```

---

## 3. 生产化安装（Linux 单机最小化）

推荐系统：openEuler 22.03/RedHat 8+/CentOS Stream 8，内存 ≥ 16GB，磁盘 ≥ 200GB

### 3.1 系统准备
```bash
# 1) 系统参数（只示例关键项）
cat >> /etc/sysctl.conf <<'EOF'
vm.swappiness=0
kernel.shmmax=68719476736
kernel.shmall=4294967296
fs.file-max=1000000
EOF
sysctl -p

cat >> /etc/security/limits.conf <<'EOF'
* soft nofile 1000000
* hard nofile 1000000
* soft nproc  131072
* hard nproc  131072
EOF

# 2) 创建运行用户
useradd -m -s /bin/bash omm
passwd omm
mkdir -p /opt/og
chown -R omm:omm /opt/og
```

### 3.2 安装包与目录
```bash
# 以 5.x 为例，将安装介质上传至 /opt/og
su - omm
mkdir ~/pkg && cd ~/pkg
# 将 openGauss-5.x.x-...tar.gz 与脚本包解压到 ~/pkg
```

### 3.3 单机部署（OM 工具）
```bash
# 生成单机配置（cluster_config.xml）
cat > ~/cluster_config.xml <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<ROOT>
  <CLUSTER>
    <PARAM name="cluster_name" value="og_one"/>
    <PARAM name="node_names" value="`hostname`"/>
    <PARAM name="back_ip1s" value="127.0.0.1"/>
    <PARAM name="gaussdb_app_path" value="/opt/og/app"/>
    <PARAM name="gaussdb_log_path" value="/opt/og/log"/>
    <PARAM name="tmp_mppdb_path" value="/opt/og/tmp"/>
    <PARAM name="gaussdb_tool_path" value="/opt/og/om"/>
    <PARAM name="cluster_type" value="single-inst"/>
  </CLUSTER>
  <DEVICELIST>
    <DEVICE sn="1">
      <PARAM name="name" value="`hostname`"/>
      <PARAM name="azName" value="AZ1"/>
      <PARAM name="azPriority" value="1"/>
      <PARAM name="backIp1" value="127.0.0.1"/>
      <PARAM name="sshIp1" value="127.0.0.1"/>
      <PARAM name="dataNum" value="1"/>
      <PARAM name="dataPortBase" value="5432"/>
      <PARAM name="dataNode1" value="/opt/og/data"/>
      <PARAM name="dataNode1_syncNum" value="0"/>
    </DEVICE>
  </DEVICELIST>
</ROOT>
XML

# 预安装、安装
source ~/pkg/om/gs_profile
gs_preinstall -U omm -G dbgrp -X ~/cluster_config.xml --skip-hostname-set -M fast
gs_install -X ~/cluster_config.xml --gsinit-parameter="--locale=en_US.UTF-8"

# 启停与状态
gs_om -t start
gs_om -t status
```

---

## 4. 基础使用

```bash
# 切换到数据库用户
su - omm
source /opt/og/app/bin/gs_profile

gsql -d postgres -p 5432 -r <<'SQL'
CREATE DATABASE demo;
\c demo
CREATE TABLE t1(id int primary key, name text);
INSERT INTO t1 VALUES (1,'hello'),(2,'openGauss');
SELECT * FROM t1;
SQL
```

---

## 5. 备份与恢复

```bash
# 逻辑备份
gs_dump -p 5432 -U omm -f /backup/demo.sql demo

# 逻辑恢复
gsql -d demo -p 5432 -f /backup/demo.sql

# 物理备份（示意：结合快照/LVM/文件系统快照）
# 停库 -> 快照 -> 启库，或使用增量备份工具链（企业版）
```

---

## 6. 安全与审计

- 口令策略：长度 ≥ 12、复杂度、90 天过期
- 最小权限：按角色授予，避免直接使用超级用户
- 审计：记录登录/DDL/安全变更，日志保留 ≥ 7 年
- 传输安全：配置 SSL/TLS，限制来源 IP

---

## 7. 常见问题

- 端口占用：确保 5432 未被占用（ss -lntp | grep 5432）
- “permission denied”：检查数据目录属主、权限（700）
- 编码/排序规则：安装时统一设置为 UTF-8，避免中文乱码
- 性能低：检查 shared_buffers、work_mem、并发、IO 子系统

---

## 8. 最佳实践

1) 生产与测试环境隔离；2) 参数走配置与变更审批；3) 备份 3-2-1 策略；4) 统一监控+告警；5) 基线性能测试与容量规划；6) 定期 VACUUM/ANALYZE；7) 合规与审计

---

参考：
- openGauss 官方文档 https://docs.opengauss.org/
- 社区镜像 https://hub.docker.com/r/enmotech/opengauss

