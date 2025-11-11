# Apache Doris（国产 OLAP）：入门与安装实践

适用读者：数仓工程师、DBA、数据分析平台工程师
目标：完成 Doris 最小集群安装，掌握基本建表、导入与查询。

---

## 1. Doris 概述

- 类型：MPP 分布式列式分析型数据库（国内开源，前身 Baidu Palo）
- 架构：FE（前端/元数据）+ BE（计算存储）+ Broker（导入）
- 适用：实时/交互式分析、明细查询、聚合报表、极速点查

---

## 2. 最小集群安装（单 FE + 单 BE）

环境：Linux x86_64，JDK 8/11，内存 ≥ 8GB

```bash
# 1) 下载与解压（以 2.0.x 为例）
wget https://downloads.apache.org/doris/2.0/2.0.7/apache-doris-2.0.7-bin-x64.tar.gz
mkdir -p /opt/doris && tar -xzf apache-doris-2.0.7-bin-x64.tar.gz -C /opt/doris
cd /opt/doris/apache-doris-2.0.7-bin-x64

# 2) 启动 FE
cd fe && sh bin/start_fe.sh --daemon
# 3) 启动 BE
cd ../be && sh bin/start_be.sh --daemon

# 4) 检查
jps | grep -E 'DorisFE|DorisBE'
# FE Web：http://<host>:8030 ； MySQL 协议：9030
```

---

## 3. 连接与建库建表

```bash
mysql -h127.0.0.1 -P9030 -uroot
```

```sql
CREATE DATABASE demo;
USE demo;

-- 明细模型（Duplicate Key）
CREATE TABLE dwd_user_log (
  user_id BIGINT,
  ts DATETIME,
  action VARCHAR(32)
) DUPLICATE KEY(user_id)
DISTRIBUTED BY HASH(user_id) BUCKETS 8
PROPERTIES ("replication_allocation" = "tag.location.default: 1");
```

---

## 4. 数据导入

```bash
# Stream Load（最简方式）
curl -u root: -H "label:demo_1" -H "column_separator:," \
  -T user_log.csv http://127.0.0.1:8030/api/demo/dwd_user_log/_stream_load
```

```sql
-- 查询
SELECT action, COUNT(*) FROM dwd_user_log GROUP BY action ORDER BY 2 DESC;
```

---

## 5. 分区与冷热分层（要点）

- 时间分区 + Hash 分桶；冷热分层（Storage Medium SSD/HDD）
- Rollup 物化索引；多副本容错

```sql
ALTER TABLE dwd_user_log 
ADD PARTITION p202511 VALUES LESS THAN ('2025-12-01');
```

---

## 6. 常见问题

- 启动失败：检查端口 8030/9030/8040/8041/9060，JDK 版本
- 导入报错：label 冲突、字段分隔、数据清洗
- 查询慢：分区裁剪、谓词下推、物化索引、并发度

---

## 7. 最佳实践

1) FE/BE 分离多副本；2) 远端对象存储冷数据；3) 数据模型正确选择（Aggregate/Unique/Duplicate）；4) 资源组与限流；5) 指标监控与告警

---

参考：
- Doris 文档 https://doris.apache.org
- StarRocks（同类国产 OLAP）https://starrocks.io

