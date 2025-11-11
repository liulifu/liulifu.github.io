---
layout: post
title: "MySQL、Redis、MongoDB 日常运维手册"
date: 2024-03-08
categories: dba
author: Lifu
---

# MySQL、Redis、MongoDB 日常运维手册

**适用读者**：DBA、运维工程师、后端开发  
**目标**：掌握 MySQL、Redis、MongoDB 三大主流数据库的日常运维技能，包括安装配置、备份恢复、性能优化、监控告警、问题诊断与变更实施。

---

## 1. 概述

本手册覆盖企业级环境中最常用的三种数据存储技术：
- **MySQL**：关系型数据库，OLTP 核心
- **Redis**：内存键值存储，缓存与消息队列
- **MongoDB**：文档型 NoSQL，灵活 schema

---

## 2. MySQL 日常运维

### 2.1 安装与配置

**安装（CentOS/RHEL 8）**
```bash
# 1) 安装 MySQL 8.0
yum install -y mysql-server
systemctl enable mysqld && systemctl start mysqld

# 2) 获取初始密码并修改
grep 'temporary password' /var/log/mysqld.log
mysql -uroot -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewPass@123';
```

**核心配置（/etc/my.cnf）**
```ini
[mysqld]
# 基础配置
port=3306
datadir=/data/mysql
socket=/var/lib/mysql/mysql.sock

# 性能优化
innodb_buffer_pool_size=8G          # 物理内存的 60-70%
innodb_log_file_size=1G
innodb_flush_log_at_trx_commit=2    # 性能与安全平衡
max_connections=500
thread_cache_size=100

# 慢查询
slow_query_log=1
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=2

# 二进制日志（备份与复制）
log_bin=/data/mysql/binlog/mysql-bin
binlog_format=ROW
expire_logs_days=7
```

### 2.2 备份与恢复

**逻辑备份（mysqldump）**
```bash
# 全库备份
mysqldump -uroot -p --all-databases --single-transaction \
  --master-data=2 --flush-logs > /backup/full_$(date +%F).sql

# 单库备份
mysqldump -uroot -p --databases mydb --single-transaction \
  > /backup/mydb_$(date +%F).sql

# 恢复
mysql -uroot -p < /backup/full_2025-11-11.sql
```

**物理备份（Percona XtraBackup）**
```bash
# 全量备份
xtrabackup --backup --target-dir=/backup/full_$(date +%F) \
  --user=root --password='xxx'

# 增量备份
xtrabackup --backup --target-dir=/backup/inc_$(date +%F) \
  --incremental-basedir=/backup/full_2025-11-10 --user=root --password='xxx'

# 恢复准备
xtrabackup --prepare --target-dir=/backup/full_2025-11-11
xtrabackup --copy-back --target-dir=/backup/full_2025-11-11
chown -R mysql:mysql /data/mysql
```

### 2.3 性能优化与 SQL 调优

**慢查询分析**
```bash
# 使用 pt-query-digest 分析慢日志
pt-query-digest /var/log/mysql/slow.log > slow_report.txt
```

**SQL 优化步骤**
```sql
-- 1) 查看执行计划
EXPLAIN SELECT * FROM orders WHERE user_id=123 AND status='paid';

-- 2) 添加索引
CREATE INDEX idx_user_status ON orders(user_id, status);

-- 3) 分析表统计信息
ANALYZE TABLE orders;

-- 4) 优化查询（避免 SELECT *，使用覆盖索引）
SELECT order_id, amount FROM orders WHERE user_id=123 AND status='paid';
```

**关键指标监控**
```sql
-- 连接数
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';

-- 缓冲池命中率
SHOW STATUS LIKE 'Innodb_buffer_pool_read%';

-- 锁等待
SHOW ENGINE INNODB STATUS\G
SELECT * FROM information_schema.INNODB_TRX;
```

### 2.4 监控告警

**Prometheus + mysqld_exporter**
```bash
# 安装 mysqld_exporter
wget https://github.com/prometheus/mysqld_exporter/releases/download/v0.15.0/mysqld_exporter-0.15.0.linux-amd64.tar.gz
tar -xzf mysqld_exporter-0.15.0.linux-amd64.tar.gz
cd mysqld_exporter-0.15.0.linux-amd64

# 创建监控用户
mysql -uroot -p -e "CREATE USER 'exporter'@'localhost' IDENTIFIED BY 'Exp@123';"
mysql -uroot -p -e "GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'localhost';"

# 启动 exporter
export DATA_SOURCE_NAME='exporter:Exp@123@(localhost:3306)/'
./mysqld_exporter &
```

**告警规则（Prometheus）**
```yaml
groups:
- name: mysql_alerts
  rules:
  - alert: MySQLDown
    expr: mysql_up == 0
    for: 1m
    annotations:
      summary: "MySQL instance {{ $labels.instance }} is down"
  
  - alert: MySQLSlowQueries
    expr: rate(mysql_global_status_slow_queries[5m]) > 10
    for: 5m
    annotations:
      summary: "High slow query rate on {{ $labels.instance }}"
```

### 2.5 问题诊断

**常见问题**
```bash
# 1) 连接数耗尽
SHOW PROCESSLIST;
KILL <thread_id>;

# 2) 锁等待超时
SELECT * FROM information_schema.INNODB_LOCK_WAITS;

# 3) 主从延迟
SHOW SLAVE STATUS\G
# 查看 Seconds_Behind_Master

# 4) 磁盘空间不足
du -sh /data/mysql/*
PURGE BINARY LOGS BEFORE '2025-11-01';
```

### 2.6 变更实施

**DDL 变更（使用 pt-online-schema-change）**
```bash
# 在线添加索引（避免锁表）
pt-online-schema-change --alter "ADD INDEX idx_email (email)" \
  D=mydb,t=users --execute --user=root --password='xxx'
```

---

## 3. Redis 日常运维

### 3.1 安装与配置

**安装（编译安装）**
```bash
wget https://download.redis.io/releases/redis-7.2.3.tar.gz
tar -xzf redis-7.2.3.tar.gz && cd redis-7.2.3
make && make install

# 配置文件
cp redis.conf /etc/redis/redis.conf
```

**核心配置（/etc/redis/redis.conf）**
```conf
# 网络
bind 0.0.0.0
port 6379
protected-mode yes
requirepass "Redis@123"

# 持久化
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# 内存管理
maxmemory 4gb
maxmemory-policy allkeys-lru

# 慢日志
slowlog-log-slower-than 10000
slowlog-max-len 128
```

### 3.2 备份与恢复

**RDB 快照备份**
```bash
# 手动触发
redis-cli -a 'Redis@123' BGSAVE

# 备份文件
cp /var/lib/redis/dump.rdb /backup/dump_$(date +%F).rdb

# 恢复：停止 Redis，替换 dump.rdb，重启
```

**AOF 备份**
```bash
# 备份 AOF 文件
cp /var/lib/redis/appendonly.aof /backup/aof_$(date +%F).aof

# 重写 AOF（压缩）
redis-cli -a 'Redis@123' BGREWRITEAOF
```

### 3.3 性能优化

**关键指标监控**
```bash
# 实时监控
redis-cli -a 'Redis@123' --stat

# 慢查询
redis-cli -a 'Redis@123' SLOWLOG GET 10

# 内存分析
redis-cli -a 'Redis@123' INFO memory
redis-cli -a 'Redis@123' --bigkeys
```

**优化建议**
- 避免使用 KEYS 命令（使用 SCAN）
- 控制单个 key 大小（< 10MB）
- 使用 Pipeline 批量操作
- 合理设置过期时间

### 3.4 监控告警

**redis_exporter + Prometheus**
```bash
# 启动 redis_exporter
docker run -d --name redis_exporter -p 9121:9121 \
  oliver006/redis_exporter --redis.addr=redis://localhost:6379 \
  --redis.password='Redis@123'
```

### 3.5 问题诊断

**常见问题**
```bash
# 1) 内存溢出
redis-cli -a 'Redis@123' INFO memory | grep used_memory_human
redis-cli -a 'Redis@123' --bigkeys

# 2) 连接数过多
redis-cli -a 'Redis@123' INFO clients

# 3) 持久化阻塞
redis-cli -a 'Redis@123' INFO persistence
```

---

## 4. MongoDB 日常运维

### 4.1 安装与配置

**安装（RHEL 8）**
```bash
# 添加 MongoDB 仓库
cat > /etc/yum.repos.d/mongodb-org-7.0.repo <<'EOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

yum install -y mongodb-org
systemctl enable mongod && systemctl start mongod
```

**核心配置（/etc/mongod.conf）**
```yaml
storage:
  dbPath: /data/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8

net:
  port: 27017
  bindIp: 0.0.0.0

security:
  authorization: enabled

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
```

### 4.2 备份与恢复

**mongodump/mongorestore**
```bash
# 全库备份
mongodump --uri="mongodb://admin:Pass@123@localhost:27017" \
  --out=/backup/mongo_$(date +%F)

# 单库备份
mongodump --uri="mongodb://admin:Pass@123@localhost:27017" \
  --db=mydb --out=/backup/mydb_$(date +%F)

# 恢复
mongorestore --uri="mongodb://admin:Pass@123@localhost:27017" \
  /backup/mongo_2025-11-11
```

### 4.3 性能优化

**索引优化**
```javascript
// 查看慢查询
db.system.profile.find().sort({ts:-1}).limit(10)

// 创建索引
db.users.createIndex({email: 1}, {unique: true})
db.orders.createIndex({user_id: 1, created_at: -1})

// 分析查询计划
db.orders.find({user_id: 123}).explain("executionStats")
```

**关键指标**
```javascript
// 连接数
db.serverStatus().connections

// 操作统计
db.serverStatus().opcounters

// 锁等待
db.currentOp({"waitingForLock": true})
```

### 4.4 监控告警

**mongodb_exporter**
```bash
docker run -d -p 9216:9216 \
  percona/mongodb_exporter:0.40 \
  --mongodb.uri=mongodb://admin:Pass@123@localhost:27017
```

### 4.5 问题诊断

**常见问题**
```bash
# 1) 连接数过多
mongo --eval "db.serverStatus().connections"

# 2) 慢查询
mongo --eval "db.setProfilingLevel(2)"
mongo --eval "db.system.profile.find().sort({ts:-1}).limit(10)"

# 3) 磁盘空间
du -sh /data/mongodb/*
db.runCommand({compact: 'collection_name'})
```

---

## 5. 变更管理最佳实践

### 5.1 变更流程

1. **变更申请**：填写变更单（目的、影响范围、回滚方案）
2. **评审**：DBA + 开发 + 运维评审
3. **测试环境验证**：完整测试变更脚本
4. **生产执行**：选择低峰期，准备回滚脚本
5. **验证**：检查数据一致性、性能指标
6. **归档**：记录变更日志

### 5.2 变更检查清单

- [ ] 备份已完成
- [ ] 回滚脚本已准备
- [ ] 影响范围已评估
- [ ] 监控告警已配置
- [ ] 应用连接池配置已检查
- [ ] 变更窗口已通知相关方

---

## 6. 最佳实践总结

### 6.1 通用原则

1. **备份 3-2-1 策略**：3 份副本，2 种介质，1 份异地
2. **监控先行**：部署前配置监控告警
3. **容量规划**：提前 3-6 个月预测资源需求
4. **权限最小化**：按需授权，定期审计
5. **文档化**：记录架构、配置、变更历史

### 6.2 性能优化

- **MySQL**：索引优化、查询改写、分库分表
- **Redis**：合理使用数据结构、Pipeline、集群分片
- **MongoDB**：索引策略、分片键设计、读写分离

### 6.3 高可用

- **MySQL**：主从复制 + MHA/Orchestrator
- **Redis**：Sentinel/Cluster
- **MongoDB**：副本集 + 分片集群

---

## 7. 参考资料

- MySQL 官方文档：https://dev.mysql.com/doc/
- Redis 官方文档：https://redis.io/documentation
- MongoDB 官方文档：https://www.mongodb.com/docs/
- Percona Toolkit：https://www.percona.com/software/database-tools/percona-toolkit
- Prometheus 监控：https://prometheus.io/docs/

---

**作者**：DBA 团队  
**更新时间**：2025-11-11

