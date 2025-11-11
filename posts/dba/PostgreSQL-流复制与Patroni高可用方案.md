# PostgreSQL 流复制与 Patroni 高可用方案

适用读者：PostgreSQL DBA、运维工程师、架构师
目标：提供 PostgreSQL 流复制、逻辑复制、Patroni + etcd 高可用集群的完整部署与运维方案。

---

## 1. PostgreSQL 复制架构概述

### 1.1 复制类型
| 复制类型 | 原理 | 延迟 | 一致性 | 适用场景 |
|---------|------|------|--------|---------|
| 流复制（物理） | WAL 日志传输 | 低 | 强 | 高可用、读写分离 |
| 逻辑复制 | 逻辑解码 | 中 | 最终一致 | 跨版本、部分表复制 |
| 同步复制 | 同步提交 | 中 | 强 | 金融、核心业务 |
| 级联复制 | 多级传输 | 高 | 弱 | 跨地域灾备 |

### 1.2 高可用方案对比
| 方案 | 自动切换 | 复杂度 | 依赖 | 推荐度 |
|------|---------|--------|------|--------|
| Patroni + etcd | ✅ | 中 | etcd/Consul/ZK | ⭐⭐⭐⭐⭐ |
| repmgr | ✅ | 低 | 无 | ⭐⭐⭐⭐ |
| Pacemaker + Corosync | ✅ | 高 | Pacemaker | ⭐⭐⭐ |
| pgpool-II | ✅ | 中 | pgpool | ⭐⭐⭐ |

---

## 2. 流复制部署（一主两从）

### 2.1 环境准备
```bash
# 主库：192.168.1.10 (pg-master)
# 从库1：192.168.1.11 (pg-slave1)
# 从库2：192.168.1.12 (pg-slave2)

# PostgreSQL 15 安装（所有节点）
yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
yum install -y postgresql15-server postgresql15-contrib
/usr/pgsql-15/bin/postgresql-15-setup initdb
systemctl enable postgresql-15
systemctl start postgresql-15
```

### 2.2 主库配置
```bash
# /var/lib/pgsql/15/data/postgresql.conf
listen_addresses = '*'
port = 5432
max_connections = 200
shared_buffers = 4GB
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 1GB
hot_standby = on
archive_mode = on
archive_command = 'test ! -f /var/lib/pgsql/15/archive/%f && cp %p /var/lib/pgsql/15/archive/%f'
```

```bash
# /var/lib/pgsql/15/data/pg_hba.conf
# 允许复制连接
host    replication     replicator      192.168.1.0/24          scram-sha-256
host    all             all             192.168.1.0/24          scram-sha-256
```

```sql
-- 创建复制用户
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'Repl123#';

-- 创建复制槽（可选，推荐）
SELECT * FROM pg_create_physical_replication_slot('slave1_slot');
SELECT * FROM pg_create_physical_replication_slot('slave2_slot');

-- 重启 PostgreSQL
systemctl restart postgresql-15
```

### 2.3 从库配置（基础备份）
```bash
# 在从库节点执行
systemctl stop postgresql-15
rm -rf /var/lib/pgsql/15/data/*

# 使用 pg_basebackup 创建基础备份
pg_basebackup -h 192.168.1.10 -U replicator -D /var/lib/pgsql/15/data \
  -Fp -Xs -P -R -S slave1_slot

# -R 参数会自动创建 standby.signal 和配置 primary_conninfo

# 检查生成的配置
cat /var/lib/pgsql/15/data/postgresql.auto.conf
# primary_conninfo = 'host=192.168.1.10 port=5432 user=replicator password=Repl123#'
# primary_slot_name = 'slave1_slot'

# 启动从库
systemctl start postgresql-15
```

### 2.4 验证复制状态
```sql
-- 主库查看复制状态
SELECT 
    client_addr,
    state,
    sync_state,
    replay_lag,
    write_lag,
    flush_lag
FROM pg_stat_replication;

-- 输出示例：
-- client_addr   | state     | sync_state | replay_lag | write_lag | flush_lag
-- 192.168.1.11  | streaming | async      | 00:00:00   | 00:00:00  | 00:00:00
-- 192.168.1.12  | streaming | async      | 00:00:00   | 00:00:00  | 00:00:00

-- 从库查看复制延迟
SELECT 
    now() - pg_last_xact_replay_timestamp() AS replication_delay;
```

---

## 3. 同步复制配置

### 3.1 启用同步复制
```bash
# 主库 postgresql.conf
synchronous_commit = on
synchronous_standby_names = 'FIRST 1 (slave1_slot, slave2_slot)'
# FIRST 1: 至少1个从库确认
# ANY 1: 任意1个从库确认
# slave1_slot, slave2_slot: 优先级顺序
```

```sql
-- 重新加载配置
SELECT pg_reload_conf();

-- 验证同步状态
SELECT 
    application_name,
    sync_state,
    sync_priority
FROM pg_stat_replication;

-- sync_state: sync（同步）, potential（候选）, async（异步）
```

### 3.2 同步复制监控
```sql
-- 检查同步复制等待
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    sync_state,
    wait_event_type,
    wait_event
FROM pg_stat_replication
WHERE sync_state = 'sync';
```

---

## 4. Patroni 高可用集群部署

### 4.1 架构设计
```plaintext
┌─────────────────────────────────────────────────┐
│                   HAProxy (VIP)                 │
│              192.168.1.100:5000                 │
└─────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼───────┐
│ Patroni Node1│ │Patroni Node2│ │Patroni Node3│
│ PG Master    │ │ PG Replica  │ │ PG Replica  │
│ 192.168.1.10 │ │192.168.1.11 │ │192.168.1.12 │
└──────┬───────┘ └──────┬──────┘ └──────┬──────┘
       │                │               │
       └────────────────┼───────────────┘
                        │
                ┌───────▼────────┐
                │  etcd Cluster  │
                │  (3 nodes)     │
                └────────────────┘
```

### 4.2 安装 etcd 集群
```bash
# 在所有节点安装 etcd
yum install -y etcd

# 节点1配置 /etc/etcd/etcd.conf
ETCD_NAME=etcd1
ETCD_DATA_DIR="/var/lib/etcd/default.etcd"
ETCD_LISTEN_PEER_URLS="http://192.168.1.10:2380"
ETCD_LISTEN_CLIENT_URLS="http://192.168.1.10:2379,http://127.0.0.1:2379"
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://192.168.1.10:2380"
ETCD_ADVERTISE_CLIENT_URLS="http://192.168.1.10:2379"
ETCD_INITIAL_CLUSTER="etcd1=http://192.168.1.10:2380,etcd2=http://192.168.1.11:2380,etcd3=http://192.168.1.12:2380"
ETCD_INITIAL_CLUSTER_STATE="new"
ETCD_INITIAL_CLUSTER_TOKEN="etcd-cluster"

# 启动 etcd（所有节点）
systemctl enable etcd
systemctl start etcd

# 验证集群
etcdctl member list
etcdctl cluster-health
```

### 4.3 安装 Patroni
```bash
# 所有节点安装 Patroni
pip3 install patroni[etcd] psycopg2-binary

# 创建配置目录
mkdir -p /etc/patroni
```

### 4.4 Patroni 配置
```yaml
# /etc/patroni/patroni.yml (节点1 - Master)
scope: postgres-cluster
namespace: /db/
name: pg-node1

restapi:
  listen: 192.168.1.10:8008
  connect_address: 192.168.1.10:8008

etcd:
  hosts: 192.168.1.10:2379,192.168.1.11:2379,192.168.1.12:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        max_connections: 200
        shared_buffers: 4GB
        wal_level: replica
        hot_standby: on
        max_wal_senders: 10
        max_replication_slots: 10
        wal_keep_size: 1GB

  initdb:
    - encoding: UTF8
    - data-checksums

  pg_hba:
    - host replication replicator 192.168.1.0/24 scram-sha-256
    - host all all 192.168.1.0/24 scram-sha-256

  users:
    admin:
      password: Admin123#
      options:
        - createrole
        - createdb
    replicator:
      password: Repl123#
      options:
        - replication

postgresql:
  listen: 192.168.1.10:5432
  connect_address: 192.168.1.10:5432
  data_dir: /var/lib/pgsql/15/data
  bin_dir: /usr/pgsql-15/bin
  pgpass: /tmp/pgpass
  authentication:
    replication:
      username: replicator
      password: Repl123#
    superuser:
      username: postgres
      password: Postgres123#
  parameters:
    unix_socket_directories: '/var/run/postgresql'

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

### 4.5 启动 Patroni
```bash
# 创建 systemd 服务
cat > /etc/systemd/system/patroni.service <<EOF
[Unit]
Description=Patroni PostgreSQL HA
After=syslog.target network.target

[Service]
Type=simple
User=postgres
Group=postgres
ExecStart=/usr/local/bin/patroni /etc/patroni/patroni.yml
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=process
TimeoutSec=30
Restart=no

[Install]
WantedBy=multi-user.target
EOF

# 启动 Patroni（先启动节点1，再启动其他节点）
systemctl daemon-reload
systemctl enable patroni
systemctl start patroni

# 检查集群状态
patronictl -c /etc/patroni/patroni.yml list

# 输出示例：
# + Cluster: postgres-cluster (7123456789012345678) -----+----+-----------+
# | Member   | Host         | Role    | State   | TL | Lag in MB |
# +----------+--------------+---------+---------+----+-----------+
# | pg-node1 | 192.168.1.10 | Leader  | running |  1 |           |
# | pg-node2 | 192.168.1.11 | Replica | running |  1 |         0 |
# | pg-node3 | 192.168.1.12 | Replica | running |  1 |         0 |
# +----------+--------------+---------+---------+----+-----------+
```

---

## 5. HAProxy 负载均衡

### 5.1 安装 HAProxy
```bash
yum install -y haproxy
```

### 5.2 配置 HAProxy
```bash
# /etc/haproxy/haproxy.cfg
global
    maxconn 100

defaults
    log global
    mode tcp
    retries 2
    timeout client 30m
    timeout connect 4s
    timeout server 30m
    timeout check 5s

listen stats
    mode http
    bind *:7000
    stats enable
    stats uri /

listen postgres_write
    bind *:5000
    option httpchk
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server pg-node1 192.168.1.10:5432 maxconn 100 check port 8008
    server pg-node2 192.168.1.11:5432 maxconn 100 check port 8008
    server pg-node3 192.168.1.12:5432 maxconn 100 check port 8008

listen postgres_read
    bind *:5001
    option httpchk GET /replica
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server pg-node1 192.168.1.10:5432 maxconn 100 check port 8008
    server pg-node2 192.168.1.11:5432 maxconn 100 check port 8008
    server pg-node3 192.168.1.12:5432 maxconn 100 check port 8008
```

```bash
# 启动 HAProxy
systemctl enable haproxy
systemctl start haproxy

# 测试连接
psql -h 192.168.1.100 -p 5000 -U admin -d postgres  # 写入
psql -h 192.168.1.100 -p 5001 -U admin -d postgres  # 只读
```

---

## 6. 故障切换与管理

### 6.1 手动切换主库
```bash
# 查看当前集群状态
patronictl -c /etc/patroni/patroni.yml list

# 手动切换主库到 pg-node2
patronictl -c /etc/patroni/patroni.yml switchover --master pg-node1 --candidate pg-node2

# 计划内维护（暂停自动切换）
patronictl -c /etc/patroni/patroni.yml pause

# 恢复自动切换
patronictl -c /etc/patroni/patroni.yml resume
```

### 6.2 故障模拟与恢复
```bash
# 模拟主库故障
systemctl stop patroni  # 在主库节点执行

# Patroni 会自动：
# 1. 检测主库故障（TTL 超时）
# 2. 选举新主库（最小延迟的从库）
# 3. 提升新主库
# 4. 重新配置其他从库

# 恢复故障节点
systemctl start patroni
# Patroni 会自动将其加入为从库
```

### 6.3 监控 Patroni
```bash
# REST API 监控
curl http://192.168.1.10:8008/

# 输出示例：
# {"state":"running","postmaster_start_time":"2025-11-11 10:00:00","role":"master","server_version":150000,"cluster_unlocked":false,"xlog":{"location":67108864},"timeline":1,"database_system_identifier":"7123456789012345678","patroni":{"version":"3.0.2","scope":"postgres-cluster"}}

# 检查主库
curl http://192.168.1.10:8008/master
# HTTP 200: 是主库
# HTTP 503: 不是主库

# 检查从库
curl http://192.168.1.11:8008/replica
# HTTP 200: 是从库
# HTTP 503: 不是从库
```

---

## 7. 逻辑复制（跨版本/部分表）

### 7.1 发布端配置
```sql
-- PostgreSQL 14+ (发布端)
-- 修改 wal_level
ALTER SYSTEM SET wal_level = logical;
SELECT pg_reload_conf();

-- 创建发布
CREATE PUBLICATION my_publication FOR TABLE users, orders;

-- 或发布所有表
CREATE PUBLICATION all_tables FOR ALL TABLES;

-- 查看发布
SELECT * FROM pg_publication;
```

### 7.2 订阅端配置
```sql
-- PostgreSQL 14+ (订阅端)
-- 创建订阅
CREATE SUBSCRIPTION my_subscription
    CONNECTION 'host=192.168.1.10 port=5432 user=replicator password=Repl123# dbname=mydb'
    PUBLICATION my_publication;

-- 查看订阅状态
SELECT * FROM pg_stat_subscription;

-- 禁用/启用订阅
ALTER SUBSCRIPTION my_subscription DISABLE;
ALTER SUBSCRIPTION my_subscription ENABLE;
```

---

## 8. 性能优化

### 8.1 复制性能调优
```bash
# postgresql.conf
wal_compression = on
wal_buffers = 16MB
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9
```

### 8.2 监控复制延迟
```sql
-- 主库监控
SELECT 
    client_addr,
    application_name,
    state,
    sync_state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;

-- 从库监控
SELECT 
    pg_is_in_recovery() AS is_replica,
    pg_last_wal_receive_lsn() AS receive_lsn,
    pg_last_wal_replay_lsn() AS replay_lsn,
    pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) AS lag_bytes;
```

---

## 9. 最佳实践

1. **使用复制槽**：防止主库删除从库未接收的 WAL
2. **启用归档**：支持 PITR 和灾难恢复
3. **监控延迟**：复制延迟 > 10s 告警
4. **定期演练**：每季度进行故障切换演练
5. **备份策略**：
   - 主库：pg_basebackup + WAL 归档
   - 从库：可用于备份，减轻主库压力
6. **参数优化**：
   - `synchronous_commit = on`（金融业务）
   - `wal_keep_size = 1GB`
   - `max_wal_senders = 10`
7. **网络优化**：主从之间使用专用网络

---

**参考文档**：
- PostgreSQL 15 Replication Documentation
- Patroni Documentation
- etcd Documentation
- HAProxy Configuration Manual

