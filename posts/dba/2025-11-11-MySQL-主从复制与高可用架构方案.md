# MySQL 主从复制与高可用架构方案

适用读者：MySQL DBA、运维工程师、架构师
目标：提供 MySQL 主从复制、半同步复制、MGR、MHA 等高可用方案的完整实施指南。

---

## 1. MySQL 复制架构概述

### 1.1 复制类型对比
| 复制类型 | 延迟 | 数据一致性 | 复杂度 | 适用场景 |
|---------|------|-----------|--------|---------|
| 异步复制 | 低 | 弱 | 低 | 读写分离、报表查询 |
| 半同步复制 | 中 | 强 | 中 | 金融、电商核心业务 |
| 组复制 (MGR) | 中 | 强（多数派） | 高 | 分布式高可用 |
| 同步复制 (Galera) | 高 | 强 | 高 | 强一致性要求 |

### 1.2 架构选型建议
- **一主多从**：读多写少，读写分离，成本低
- **双主互备**：快速故障切换，需防止脑裂
- **MHA/MMM**：自动故障切换，适合传统主从
- **MGR (MySQL Group Replication)**：原生多主，强一致性
- **ProxySQL + 主从**：智能读写分离，连接池

---

## 2. 传统主从复制部署

### 2.1 环境准备
```bash
# 主库：192.168.1.10 (master)
# 从库1：192.168.1.11 (slave1)
# 从库2：192.168.1.12 (slave2)

# MySQL 8.0 安装（所有节点）
yum install -y mysql-community-server-8.0.35
systemctl enable mysqld
systemctl start mysqld

# 获取临时密码
grep 'temporary password' /var/log/mysqld.log
mysql -uroot -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewPass123#';
```

### 2.2 主库配置
```ini
# /etc/my.cnf (主库)
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW
gtid-mode = ON
enforce-gtid-consistency = ON
log-slave-updates = ON
binlog-do-db = myapp_db
binlog-ignore-db = mysql,information_schema,performance_schema

# 二进制日志保留时间（7天）
binlog_expire_logs_seconds = 604800

# 半同步复制插件（可选）
plugin-load = "rpl_semi_sync_master=semisync_master.so"
rpl_semi_sync_master_enabled = 1
rpl_semi_sync_master_timeout = 1000

# 性能优化
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
```

```sql
-- 重启 MySQL
systemctl restart mysqld

-- 创建复制用户
CREATE USER 'repl'@'192.168.1.%' IDENTIFIED WITH mysql_native_password BY 'Repl123#';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'192.168.1.%';
FLUSH PRIVILEGES;

-- 查看主库状态
SHOW MASTER STATUS;
-- 记录 File 和 Position（如果使用 GTID 则不需要）
```

### 2.3 从库配置
```ini
# /etc/my.cnf (从库)
[mysqld]
server-id = 2  # 每个从库唯一
log-bin = mysql-bin
binlog-format = ROW
gtid-mode = ON
enforce-gtid-consistency = ON
log-slave-updates = ON
read-only = 1
super-read-only = 1

# 半同步复制插件（可选）
plugin-load = "rpl_semi_sync_slave=semisync_slave.so"
rpl_semi_sync_slave_enabled = 1

# 中继日志
relay-log = relay-bin
relay-log-recovery = 1
```

```sql
-- 重启 MySQL
systemctl restart mysqld

-- 配置主从复制（基于 GTID）
CHANGE MASTER TO
  MASTER_HOST='192.168.1.10',
  MASTER_USER='repl',
  MASTER_PASSWORD='Repl123#',
  MASTER_AUTO_POSITION=1;

-- 启动复制
START SLAVE;

-- 检查复制状态
SHOW SLAVE STATUS\G

-- 关键指标：
-- Slave_IO_Running: Yes
-- Slave_SQL_Running: Yes
-- Seconds_Behind_Master: 0
-- Last_IO_Error: (空)
-- Last_SQL_Error: (空)
```

### 2.4 数据初始化（已有数据）
```bash
# 在主库备份
mysqldump -uroot -p --single-transaction --master-data=2 \
  --triggers --routines --events --all-databases > /tmp/master_backup.sql

# 传输到从库
scp /tmp/master_backup.sql root@192.168.1.11:/tmp/

# 在从库导入
mysql -uroot -p < /tmp/master_backup.sql

# 配置复制（从备份文件中获取 GTID 或 binlog 位置）
grep "CHANGE MASTER TO" /tmp/master_backup.sql
```

---

## 3. 半同步复制配置

### 3.1 启用半同步
```sql
-- 主库
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_master_timeout = 1000; -- 1秒超时

-- 从库
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';
SET GLOBAL rpl_semi_sync_slave_enabled = 1;
STOP SLAVE IO_THREAD;
START SLAVE IO_THREAD;

-- 验证半同步状态
SHOW STATUS LIKE 'Rpl_semi_sync%';
-- Rpl_semi_sync_master_status: ON
-- Rpl_semi_sync_master_clients: 2
```

### 3.2 监控半同步
```sql
-- 主库监控
SELECT 
    VARIABLE_NAME, 
    VARIABLE_VALUE 
FROM performance_schema.global_status 
WHERE VARIABLE_NAME LIKE 'Rpl_semi_sync%';

-- 关键指标：
-- Rpl_semi_sync_master_yes_tx: 半同步成功事务数
-- Rpl_semi_sync_master_no_tx: 降级为异步的事务数
```

---

## 4. MySQL Group Replication (MGR)

### 4.1 MGR 架构
- **单主模式**：一个主节点写入，其他节点只读
- **多主模式**：所有节点可写，自动冲突检测

### 4.2 MGR 部署（单主模式）
```ini
# /etc/my.cnf (所有节点)
[mysqld]
server-id = 1  # 每个节点唯一
gtid-mode = ON
enforce-gtid-consistency = ON
binlog-checksum = NONE
log-slave-updates = ON
log-bin = mysql-bin
binlog-format = ROW
master-info-repository = TABLE
relay-log-info-repository = TABLE

# MGR 配置
plugin-load-add = 'group_replication.so'
group_replication_group_name = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
group_replication_start_on_boot = OFF
group_replication_local_address = "192.168.1.10:33061"
group_replication_group_seeds = "192.168.1.10:33061,192.168.1.11:33061,192.168.1.12:33061"
group_replication_bootstrap_group = OFF
group_replication_single_primary_mode = ON
group_replication_enforce_update_everywhere_checks = OFF
```

```sql
-- 在第一个节点（引导节点）
SET GLOBAL group_replication_bootstrap_group=ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group=OFF;

-- 在其他节点
START GROUP_REPLICATION;

-- 检查 MGR 状态
SELECT * FROM performance_schema.replication_group_members;

-- 输出示例：
-- MEMBER_ID | MEMBER_HOST | MEMBER_PORT | MEMBER_STATE | MEMBER_ROLE
-- uuid1     | 192.168.1.10| 3306        | ONLINE       | PRIMARY
-- uuid2     | 192.168.1.11| 3306        | ONLINE       | SECONDARY
-- uuid3     | 192.168.1.12| 3306        | ONLINE       | SECONDARY
```

### 4.3 MGR 故障切换
```sql
-- 主节点故障后，自动选举新主
-- 查看当前主节点
SELECT 
    MEMBER_HOST, 
    MEMBER_ROLE 
FROM performance_schema.replication_group_members 
WHERE MEMBER_ROLE='PRIMARY';

-- 手动切换主节点（多主模式）
SELECT group_replication_set_as_primary('member_uuid');
```

---

## 5. MHA (Master High Availability) 部署

### 5.1 MHA 架构
- **MHA Manager**：监控主库，执行故障切换
- **MHA Node**：安装在所有 MySQL 节点，执行切换脚本

### 5.2 安装 MHA
```bash
# 所有节点安装 MHA Node
yum install -y perl-DBD-MySQL
rpm -ivh mha4mysql-node-0.58-0.el7.centos.noarch.rpm

# Manager 节点安装 MHA Manager
yum install -y perl-Config-Tiny perl-Log-Dispatch perl-Parallel-ForkManager
rpm -ivh mha4mysql-manager-0.58-0.el7.centos.noarch.rpm
```

### 5.3 MHA 配置
```ini
# /etc/mha/app1.cnf (Manager 节点)
[server default]
manager_workdir=/var/log/mha/app1
manager_log=/var/log/mha/app1/manager.log
remote_workdir=/var/log/mha/app1
ssh_user=root
repl_user=repl
repl_password=Repl123#
ping_interval=3
master_ip_failover_script=/usr/local/bin/master_ip_failover
shutdown_script=/usr/local/bin/power_manager
report_script=/usr/local/bin/send_report

[server1]
hostname=192.168.1.10
port=3306
candidate_master=1
check_repl_delay=0

[server2]
hostname=192.168.1.11
port=3306
candidate_master=1
check_repl_delay=0

[server3]
hostname=192.168.1.12
port=3306
no_master=1
```

### 5.4 VIP 切换脚本
```bash
# /usr/local/bin/master_ip_failover
#!/usr/bin/env perl
use strict;
use warnings FATAL => 'all';

my $vip = '192.168.1.100/24';
my $key = '1';
my $ssh_start_vip = "/sbin/ip addr add $vip dev eth0 label eth0:$key";
my $ssh_stop_vip = "/sbin/ip addr del $vip dev eth0 label eth0:$key";

# 省略完整脚本，参考 MHA 官方文档
```

### 5.5 启动 MHA
```bash
# 检查 SSH 连通性
masterha_check_ssh --conf=/etc/mha/app1.cnf

# 检查复制状态
masterha_check_repl --conf=/etc/mha/app1.cnf

# 启动 MHA Manager
nohup masterha_manager --conf=/etc/mha/app1.cnf > /var/log/mha/app1/manager.log 2>&1 &

# 检查 MHA 状态
masterha_check_status --conf=/etc/mha/app1.cnf
```

---

## 6. ProxySQL 读写分离

### 6.1 安装 ProxySQL
```bash
yum install -y proxysql
systemctl enable proxysql
systemctl start proxysql

# 登录 ProxySQL 管理端口
mysql -uadmin -padmin -h127.0.0.1 -P6032
```

### 6.2 配置后端服务器
```sql
-- 添加 MySQL 服务器
INSERT INTO mysql_servers(hostgroup_id, hostname, port) 
VALUES (1, '192.168.1.10', 3306);  -- 主库（写）

INSERT INTO mysql_servers(hostgroup_id, hostname, port) 
VALUES (2, '192.168.1.11', 3306);  -- 从库1（读）

INSERT INTO mysql_servers(hostgroup_id, hostname, port) 
VALUES (2, '192.168.1.12', 3306);  -- 从库2（读）

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
```

### 6.3 配置用户和路由规则
```sql
-- 添加应用用户
INSERT INTO mysql_users(username, password, default_hostgroup) 
VALUES ('appuser', 'AppPass123#', 1);

LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL USERS TO DISK;

-- 配置读写分离规则
INSERT INTO mysql_query_rules(rule_id, active, match_pattern, destination_hostgroup, apply)
VALUES (1, 1, '^SELECT.*FOR UPDATE$', 1, 1);  -- SELECT FOR UPDATE 走主库

INSERT INTO mysql_query_rules(rule_id, active, match_pattern, destination_hostgroup, apply)
VALUES (2, 1, '^SELECT', 2, 1);  -- 普通 SELECT 走从库

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

### 6.4 应用连接
```bash
# 应用连接 ProxySQL（端口 6033）
mysql -uappuser -pAppPass123# -h192.168.1.100 -P6033

# 测试读写分离
SELECT @@hostname;  -- 应返回从库主机名
BEGIN; SELECT * FROM users WHERE id=1 FOR UPDATE; COMMIT;  -- 应走主库
```

---

## 7. 监控与告警

### 7.1 复制延迟监控
```sql
-- 从库执行
SHOW SLAVE STATUS\G

-- 关键指标：
-- Seconds_Behind_Master: 延迟秒数
-- Slave_IO_Running: IO 线程状态
-- Slave_SQL_Running: SQL 线程状态

-- 使用 pt-heartbeat（Percona Toolkit）
pt-heartbeat --update --database test --table heartbeat --create-table -h192.168.1.10
pt-heartbeat --monitor --database test --table heartbeat -h192.168.1.11
```

### 7.2 Prometheus + Grafana 监控
```bash
# 安装 mysqld_exporter
wget https://github.com/prometheus/mysqld_exporter/releases/download/v0.15.0/mysqld_exporter-0.15.0.linux-amd64.tar.gz
tar -xzf mysqld_exporter-0.15.0.linux-amd64.tar.gz
cd mysqld_exporter-0.15.0.linux-amd64

# 创建监控用户
CREATE USER 'exporter'@'localhost' IDENTIFIED BY 'Exporter123#';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'localhost';

# 启动 exporter
export DATA_SOURCE_NAME='exporter:Exporter123#@(localhost:3306)/'
./mysqld_exporter &

# Prometheus 配置
# prometheus.yml
scrape_configs:
  - job_name: 'mysql'
    static_configs:
      - targets: ['192.168.1.10:9104', '192.168.1.11:9104', '192.168.1.12:9104']
```

---

## 8. 故障处理

### 8.1 主从复制中断
```sql
-- 检查错误
SHOW SLAVE STATUS\G
-- Last_SQL_Error: Error 'Duplicate entry...'

-- 跳过错误（谨慎使用）
STOP SLAVE;
SET GLOBAL SQL_SLAVE_SKIP_COUNTER = 1;
START SLAVE;

-- 或使用 GTID 跳过
STOP SLAVE;
SET GTID_NEXT='uuid:transaction_id';
BEGIN; COMMIT;
SET GTID_NEXT='AUTOMATIC';
START SLAVE;
```

### 8.2 主库宕机切换
```bash
# 使用 MHA 自动切换
# MHA 会自动：
# 1. 检测主库故障
# 2. 选择最新的从库作为新主
# 3. 应用差异日志
# 4. 切换 VIP
# 5. 重新配置其他从库

# 手动切换（无 MHA）
# 1. 在最新的从库上执行
STOP SLAVE;
RESET SLAVE ALL;

# 2. 配置 VIP
ip addr add 192.168.1.100/24 dev eth0

# 3. 设置为可写
SET GLOBAL read_only=0;
SET GLOBAL super_read_only=0;

# 4. 其他从库指向新主
CHANGE MASTER TO MASTER_HOST='192.168.1.11', MASTER_AUTO_POSITION=1;
START SLAVE;
```

---

## 9. 最佳实践

1. **GTID 模式**：简化故障切换，推荐生产环境启用
2. **半同步复制**：金融、电商等核心业务必须启用
3. **监控告警**：复制延迟 > 10s 告警，IO/SQL 线程异常立即告警
4. **定期演练**：每季度进行主从切换演练
5. **备份策略**：主库全量备份 + binlog 备份，从库可用于备份
6. **参数优化**：
   - `sync_binlog=1`
   - `innodb_flush_log_at_trx_commit=1`
   - `binlog_expire_logs_seconds=604800`（7天）
7. **网络优化**：主从之间使用专用网络，避免公网传输

---

**参考文档**：
- MySQL 8.0 Replication Manual
- MHA for MySQL Documentation
- ProxySQL Documentation
- Percona Toolkit Documentation

