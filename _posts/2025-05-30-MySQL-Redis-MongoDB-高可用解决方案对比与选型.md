---
layout: post
title: "MySQL、Redis、MongoDB 高可用解决方案对比与选型指南"
date: 2025-05-30
categories: dba
author: Lifu
---

# MySQL、Redis、MongoDB 高可用解决方案对比与选型指南

**适用读者**：架构师、DBA、技术决策者  
**目标**：全面对比 MySQL、Redis、MongoDB 的主流高可用方案，分析优缺点，根据业务场景给出选型建议。

---

## 1. 概述

高可用（HA）是生产环境的核心需求，本文对比三大数据库的主流 HA 方案：

| 数据库 | 主流 HA 方案 | 核心指标 |
|--------|-------------|---------|
| MySQL | 主从复制、MHA、MGR、Orchestrator | RPO < 1s, RTO < 30s |
| Redis | Sentinel、Cluster、Keepalived | RPO < 1s, RTO < 5s |
| MongoDB | 副本集、分片集群 | RPO = 0, RTO < 10s |

---

## 2. MySQL 高可用方案

### 2.1 方案一：主从复制 + MHA（Master High Availability）

**架构**
```
┌─────────┐     异步复制      ┌─────────┐
│ Master  │ ───────────────> │ Slave1  │
└─────────┘                  └─────────┘
     │                            │
     │                       ┌─────────┐
     └──────────────────────>│ Slave2  │
                             └─────────┘
         ┌──────────┐
         │   MHA    │ (监控 + 自动故障转移)
         │ Manager  │
         └──────────┘
```

**优点**
- ✅ 成熟稳定，社区支持好
- ✅ 自动故障检测与切换（RTO < 30s）
- ✅ 支持半同步复制（减少数据丢失）
- ✅ 可配置多个从库（读写分离）

**缺点**
- ❌ 异步复制可能丢失数据（RPO > 0）
- ❌ 需要额外的 MHA Manager 节点
- ❌ 脑裂风险（需配合 VIP + 仲裁机制）
- ❌ 单点写入（主库压力大）

**适用场景**
- 中小型业务（QPS < 10000）
- 可容忍秒级数据丢失
- 读多写少场景（通过从库分担读压力）

**部署示例**
```bash
# 1) 配置主从复制
# Master (my.cnf)
[mysqld]
server-id=1
log_bin=/data/mysql/binlog/mysql-bin
binlog_format=ROW
gtid_mode=ON
enforce_gtid_consistency=ON

# Slave (my.cnf)
[mysqld]
server-id=2
relay_log=/data/mysql/relay-log
read_only=1
super_read_only=1

# 2) 在 Slave 上配置复制
CHANGE MASTER TO
  MASTER_HOST='192.168.1.10',
  MASTER_USER='repl',
  MASTER_PASSWORD='Repl@123',
  MASTER_AUTO_POSITION=1;
START SLAVE;

# 3) 安装 MHA
yum install -y mha4mysql-manager mha4mysql-node
# 配置 /etc/mha/app1.cnf（略）
masterha_manager --conf=/etc/mha/app1.cnf
```

---

### 2.2 方案二：MySQL Group Replication（MGR）

**架构**
```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Node1   │────>│ Node2   │────>│ Node3   │
│(Primary)│<────│(Secondary)<────│(Secondary)
└─────────┘     └─────────┘     └─────────┘
      ↑              ↑              ↑
      └──────────────┴──────────────┘
           Paxos 协议（多数派一致）
```

**优点**
- ✅ 原生支持（MySQL 5.7.17+）
- ✅ 强一致性（基于 Paxos，RPO = 0）
- ✅ 自动故障检测与切换（RTO < 10s）
- ✅ 支持多主模式（Multi-Primary）

**缺点**
- ❌ 性能开销大（写入需多数派确认）
- ❌ 网络延迟敏感（跨机房部署困难）
- ❌ 单主模式下仍是单点写入
- ❌ 配置复杂，调优难度高

**适用场景**
- 金融、支付等强一致性要求场景
- 同城多机房部署（延迟 < 5ms）
- 数据零丢失要求（RPO = 0）

**部署示例**
```sql
-- 在所有节点执行
SET SQL_LOG_BIN=0;
CREATE USER 'repl'@'%' IDENTIFIED BY 'Repl@123';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
GRANT BACKUP_ADMIN ON *.* TO 'repl'@'%';
SET SQL_LOG_BIN=1;

-- 配置 MGR
CHANGE MASTER TO MASTER_USER='repl', MASTER_PASSWORD='Repl@123' 
  FOR CHANNEL 'group_replication_recovery';

SET GLOBAL group_replication_bootstrap_group=ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group=OFF;
```

---

### 2.3 方案三：Orchestrator + ProxySQL

**架构**
```
┌──────────────┐
│  ProxySQL    │ (读写分离 + 连接池)
└──────────────┘
       │
   ┌───┴───┐
   ↓       ↓
┌─────┐ ┌─────┐ ┌─────┐
│Master│ │Slave1│ │Slave2│
└─────┘ └─────┘ └─────┘
   ↑       ↑       ↑
   └───────┴───────┘
    Orchestrator (拓扑管理 + 自动切换)
```

**优点**
- ✅ 可视化拓扑管理
- ✅ 自动故障恢复（RTO < 20s）
- ✅ 支持复杂拓扑（级联复制、延迟从库）
- ✅ ProxySQL 提供读写分离与连接池

**缺点**
- ❌ 组件较多，运维复杂度高
- ❌ 需要学习 Orchestrator 和 ProxySQL
- ❌ 异步复制仍可能丢数据

**适用场景**
- 大规模 MySQL 集群管理
- 需要灵活拓扑调整
- 读写分离 + 连接池需求

---

### 2.4 MySQL 方案对比总结

| 方案 | RPO | RTO | 复杂度 | 成本 | 推荐场景 |
|------|-----|-----|--------|------|---------|
| MHA | 秒级 | 30s | 中 | 低 | 中小型业务 |
| MGR | 0 | 10s | 高 | 中 | 金融/支付 |
| Orchestrator | 秒级 | 20s | 高 | 中 | 大规模集群 |

---

## 3. Redis 高可用方案

### 3.1 方案一：Redis Sentinel

**架构**
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│Sentinel1 │────>│Sentinel2 │────>│Sentinel3 │
└──────────┘     └──────────┘     └──────────┘
      │               │               │
      └───────────────┴───────────────┘
                      ↓
              ┌───────────────┐
              │  Redis Master │
              └───────────────┘
                      │
              ┌───────┴───────┐
              ↓               ↓
        ┌─────────┐     ┌─────────┐
        │ Slave1  │     │ Slave2  │
        └─────────┘     └─────────┘
```

**优点**
- ✅ 官方推荐方案
- ✅ 自动故障检测与切换（RTO < 5s）
- ✅ 配置简单，运维成本低
- ✅ 支持多个从节点（读写分离）

**缺点**
- ❌ 单主写入（无法水平扩展写能力）
- ❌ 客户端需支持 Sentinel 协议
- ❌ 脑裂可能导致数据丢失

**适用场景**
- 中小型缓存场景（QPS < 100000）
- 读多写少
- 数据量 < 单机内存容量

**部署示例**
```bash
# sentinel.conf
port 26379
sentinel monitor mymaster 192.168.1.10 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1

# 启动 Sentinel
redis-sentinel /etc/redis/sentinel.conf
```

---

### 3.2 方案二：Redis Cluster

**架构**
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│Master1  │  │Master2  │  │Master3  │
│Slot:    │  │Slot:    │  │Slot:    │
│0-5460   │  │5461-    │  │10923-   │
│         │  │10922    │  │16383    │
└─────────┘  └─────────┘  └─────────┘
     │            │            │
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Slave1  │  │ Slave2  │  │ Slave3  │
└─────────┘  └─────────┘  └─────────┘
```

**优点**
- ✅ 水平扩展（支持 1000+ 节点）
- ✅ 自动分片（16384 个 slot）
- ✅ 自动故障转移（RTO < 5s）
- ✅ 无中心化架构

**缺点**
- ❌ 不支持多键操作（跨 slot）
- ❌ 客户端需支持 Cluster 协议
- ❌ 运维复杂度高（扩缩容、数据迁移）
- ❌ 事务支持受限

**适用场景**
- 大规模缓存（数据量 > 单机内存）
- 高并发写入（QPS > 100000）
- 需要水平扩展

**部署示例**
```bash
# 创建集群（6 节点：3 主 3 从）
redis-cli --cluster create \
  192.168.1.10:6379 192.168.1.11:6379 192.168.1.12:6379 \
  192.168.1.13:6379 192.168.1.14:6379 192.168.1.15:6379 \
  --cluster-replicas 1
```

---

### 3.3 方案三：Keepalived + Redis 主从

**架构**
```
┌──────────────┐
│   VIP        │ (虚拟 IP，由 Keepalived 管理)
│ 192.168.1.100│
└──────────────┘
       │
   ┌───┴───┐
   ↓       ↓
┌─────────┐ ┌─────────┐
│ Master  │ │ Slave   │
│+Keepalived│+Keepalived│
└─────────┘ └─────────┘
```

**优点**
- ✅ 简单易用
- ✅ VIP 切换对应用透明
- ✅ 成本低

**缺点**
- ❌ 需手动提升从库为主库
- ❌ 脑裂风险高
- ❌ 不适合生产环境

**适用场景**
- 测试/开发环境
- 预算有限的小型项目

---

### 3.4 Redis 方案对比总结

| 方案 | 扩展性 | RTO | 复杂度 | 推荐场景 |
|------|--------|-----|--------|---------|
| Sentinel | 单主 | 5s | 低 | 中小型缓存 |
| Cluster | 水平扩展 | 5s | 高 | 大规模/高并发 |
| Keepalived | 单主 | 手动 | 低 | 测试环境 |

---

## 4. MongoDB 高可用方案

### 4.1 方案一：副本集（Replica Set）

**架构**
```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Primary │────>│Secondary│────>│Secondary│
└─────────┘     └─────────┘     └─────────┘
      ↑              ↑              ↑
      └──────────────┴──────────────┘
           选举协议（多数派）
```

**优点**
- ✅ 官方推荐，原生支持
- ✅ 自动故障转移（RTO < 10s）
- ✅ 强一致性（写关注 majority）
- ✅ 读写分离（可配置读偏好）

**缺点**
- ❌ 单主写入（无法水平扩展写能力）
- ❌ 数据量受限于单机存储

**适用场景**
- 中小型应用（数据量 < 2TB）
- 强一致性要求
- 读多写少

**部署示例**
```javascript
// 初始化副本集
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "192.168.1.10:27017" },
    { _id: 1, host: "192.168.1.11:27017" },
    { _id: 2, host: "192.168.1.12:27017" }
  ]
})

// 查看状态
rs.status()
```

---

### 4.2 方案二：分片集群（Sharded Cluster）

**架构**
```
┌──────────┐  ┌──────────┐
│ mongos   │  │ mongos   │ (路由)
└──────────┘  └──────────┘
       │           │
   ┌───┴───────────┴───┐
   ↓                   ↓
┌─────────────┐  ┌─────────────┐
│Config Server│  │Config Server│ (元数据)
│ Replica Set │  │ Replica Set │
└─────────────┘  └─────────────┘
       │
   ┌───┴───────────┐
   ↓               ↓
┌─────────┐  ┌─────────┐
│ Shard1  │  │ Shard2  │ (数据分片)
│ReplicaSet│ │ReplicaSet│
└─────────┘  └─────────┘
```

**优点**
- ✅ 水平扩展（数据 + 写入能力）
- ✅ 高可用（每个分片都是副本集）
- ✅ 支持海量数据（PB 级）

**缺点**
- ❌ 架构复杂，运维成本高
- ❌ 分片键选择不当影响性能
- ❌ 跨分片查询性能差

**适用场景**
- 大规模应用（数据量 > 2TB）
- 高并发写入
- 需要水平扩展

---

### 4.3 MongoDB 方案对比总结

| 方案 | 扩展性 | RTO | 复杂度 | 推荐场景 |
|------|--------|-----|--------|---------|
| 副本集 | 单主 | 10s | 低 | 中小型应用 |
| 分片集群 | 水平扩展 | 10s | 高 | 大规模/海量数据 |

---

## 5. 业务场景选型建议

### 5.1 电商场景

**需求**：高并发、读多写少、数据一致性要求高

**推荐方案**
- **MySQL**：MGR（订单/支付）+ MHA（商品/用户）
- **Redis**：Cluster（商品缓存、购物车）
- **MongoDB**：副本集（用户行为日志）

---

### 5.2 社交媒体

**需求**：海量数据、高并发写入、弱一致性可接受

**推荐方案**
- **MySQL**：MHA + 分库分表（用户关系）
- **Redis**：Cluster（热点数据、Feed 流）
- **MongoDB**：分片集群（帖子、评论）

---

### 5.3 金融支付

**需求**：强一致性、零数据丢失、高可用

**推荐方案**
- **MySQL**：MGR（交易核心）
- **Redis**：Sentinel（会话缓存）
- **MongoDB**：副本集 + majority 写关注（审计日志）

---

### 5.4 物联网（IoT）

**需求**：海量时序数据、高并发写入

**推荐方案**
- **MySQL**：MHA（设备元数据）
- **Redis**：Cluster（实时状态）
- **MongoDB**：分片集群（时序数据）

---

## 6. 最佳实践

1. **多活部署**：同城双活/两地三中心
2. **监控先行**：部署前配置完整监控告警
3. **定期演练**：每季度进行故障切换演练
4. **容量规划**：提前 6 个月预测资源需求
5. **备份策略**：3-2-1 原则（3 份副本、2 种介质、1 份异地）

---

## 7. 参考资料

- MySQL HA 方案：https://dev.mysql.com/doc/refman/8.0/en/replication.html
- Redis 高可用：https://redis.io/topics/sentinel
- MongoDB 副本集：https://www.mongodb.com/docs/manual/replication/

---

**作者**：架构团队  
**更新时间**：2025-11-11

