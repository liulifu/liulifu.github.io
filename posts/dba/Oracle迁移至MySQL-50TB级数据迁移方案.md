# Oracle 迁移至 MySQL：50TB 级数据迁移方案

适用读者：DBA、架构师、项目经理
目标：提供超大规模（50TB+）Oracle 到 MySQL 数据迁移的完整方案，包括评估、架构设计、迁移实施、验证与优化。

---

## 1. 项目背景

### 1.1 迁移动机
- **成本优化**：Oracle License 费用高昂（50TB 数据约需数百万/年）
- **云原生**：MySQL 云服务成熟（AWS RDS/Aurora、阿里云 RDS）
- **开源生态**：社区活跃，工具丰富
- **业务需求**：微服务化改造，需要轻量级数据库

### 1.2 挑战与风险
| 挑战 | 影响 | 应对策略 |
|------|------|---------|
| 数据量巨大（50TB） | 迁移时间长 | 分批迁移、并行传输 |
| 业务停机时间 | 服务中断 | 双写、逻辑复制、灰度切换 |
| 数据一致性 | 数据丢失/重复 | 校验工具、回滚预案 |
| 性能差异 | 查询变慢 | 索引优化、分库分表 |
| SQL 兼容性 | 应用改造 | SQL 改写、兼容层 |
| 存储过程迁移 | 业务逻辑重写 | 逐个迁移、测试 |

---

## 2. 迁移前评估

### 2.1 数据库对象清单
```sql
-- Oracle 端统计
-- 表数量与数据量
SELECT 
    owner,
    COUNT(*) AS table_count,
    ROUND(SUM(bytes)/1024/1024/1024/1024, 2) AS size_tb
FROM dba_segments
WHERE segment_type = 'TABLE'
  AND owner NOT IN ('SYS', 'SYSTEM', 'SYSAUX')
GROUP BY owner
ORDER BY size_tb DESC;

-- 输出示例：
-- OWNER        | TABLE_COUNT | SIZE_TB
-- APP_SCHEMA   | 1200        | 35.6
-- LOG_SCHEMA   | 450         | 12.3
-- ARCHIVE_SCHEMA | 230       | 2.1

-- 索引统计
SELECT 
    owner,
    COUNT(*) AS index_count,
    ROUND(SUM(bytes)/1024/1024/1024, 2) AS size_gb
FROM dba_segments
WHERE segment_type LIKE 'INDEX%'
  AND owner NOT IN ('SYS', 'SYSTEM', 'SYSAUX')
GROUP BY owner;

-- 存储过程/函数/包
SELECT 
    owner,
    object_type,
    COUNT(*) AS object_count
FROM dba_objects
WHERE object_type IN ('PROCEDURE', 'FUNCTION', 'PACKAGE', 'TRIGGER')
  AND owner NOT IN ('SYS', 'SYSTEM', 'SYSAUX')
GROUP BY owner, object_type
ORDER BY owner, object_type;

-- 分区表统计
SELECT 
    table_owner,
    COUNT(DISTINCT table_name) AS partitioned_tables,
    COUNT(*) AS partition_count
FROM dba_tab_partitions
WHERE table_owner NOT IN ('SYS', 'SYSTEM', 'SYSAUX')
GROUP BY table_owner;
```

### 2.2 业务分析
```plaintext
数据分类：
1. 核心业务数据（热数据）：20TB
   - 订单表、用户表、交易表
   - 需要高可用、低延迟
   - 优先迁移

2. 日志/归档数据（温数据）：25TB
   - 操作日志、审计日志
   - 查询频率低
   - 可考虑归档到对象存储（S3/OSS）

3. 历史数据（冷数据）：5TB
   - 3年前的历史记录
   - 几乎不查询
   - 迁移到冷存储或不迁移
```

### 2.3 兼容性评估
```bash
# 使用 MySQL Migration Toolkit 评估
# 或使用 AWS SCT (Schema Conversion Tool)

# 生成评估报告
aws sct create-assessment-report \
  --source-endpoint oracle-source \
  --target-endpoint mysql-target \
  --output-file /tmp/assessment_report.pdf

# 报告包含：
# - 自动转换率（通常 70-85%）
# - 需要手动改写的对象列表
# - 预估工作量（人天）
# - 风险评估
```

---

## 3. 架构设计

### 3.1 目标架构
```plaintext
┌─────────────────────────────────────────────────────┐
│                   应用层（双写）                      │
│          Oracle (主) + MySQL (从) → MySQL (主)       │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼───────┐
│ MySQL Shard1 │ │MySQL Shard2 │ │MySQL Shard3 │
│   (核心业务)  │ │  (日志数据)  │ │  (归档数据)  │
│     15TB     │ │     20TB    │ │     10TB    │
└──────────────┘ └─────────────┘ └─────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                ┌───────▼────────┐
                │  ProxySQL      │
                │  (读写分离)     │
                └────────────────┘
```

### 3.2 分库分表策略
```sql
-- 按业务模块分库
database_order    -- 订单相关表
database_user     -- 用户相关表
database_product  -- 商品相关表
database_log      -- 日志相关表

-- 大表分表（按时间/ID）
-- 订单表按月分表
orders_202501
orders_202502
orders_202503
...

-- 或按 ID 范围分表（Hash）
orders_0  -- user_id % 16 = 0
orders_1  -- user_id % 16 = 1
...
orders_15 -- user_id % 16 = 15
```

### 3.3 硬件规划
```plaintext
MySQL 集群配置（3个分片）：

每个分片：
- 主库：64核 256GB 内存，20TB NVMe SSD（RAID 10）
- 从库1：64核 256GB 内存，20TB NVMe SSD
- 从库2：64核 256GB 内存，20TB NVMe SSD

网络：
- 万兆网卡（10Gbps）
- 专用迁移网络（避免影响生产）

存储：
- IOPS：50000+
- 吞吐量：2GB/s+
```

---

## 4. 迁移方案设计

### 4.1 迁移策略（分阶段）
```plaintext
阶段1：准备阶段（2周）
  - 安装 MySQL 集群（主从复制）
  - Schema 迁移（表、索引、约束）
  - 应用代码适配（SQL 改写）
  - 测试环境验证

阶段2：历史数据迁移（4周）
  - 冷数据迁移（3年前数据）
  - 温数据迁移（1-3年数据）
  - 数据校验

阶段3：增量同步（2周）
  - 使用 OGG/Debezium 实时同步
  - 热数据迁移
  - 双写验证

阶段4：灰度切换（1周）
  - 10% 流量切换到 MySQL
  - 50% 流量切换
  - 100% 流量切换
  - 监控告警

阶段5：稳定观察（2周）
  - 性能监控
  - 数据一致性校验
  - Oracle 保留作为备份
```

### 4.2 数据迁移工具选型
| 工具 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| AWS DMS | 云上迁移 | 自动化、支持增量 | 需要 AWS 环境 |
| Oracle GoldenGate | 实时同步 | 低延迟、双向同步 | License 费用高 |
| Debezium (CDC) | 开源方案 | 免费、灵活 | 配置复杂 |
| DataX (阿里) | 批量迁移 | 高性能、并行 | 仅全量 |
| Kettle/Talend | ETL 工具 | 可视化、转换灵活 | 性能一般 |
| 自研脚本 | 定制需求 | 完全可控 | 开发成本高 |

**推荐方案**：
- **全量迁移**：DataX（并行）+ 自研脚本
- **增量同步**：Oracle GoldenGate 或 Debezium

---

## 5. Schema 迁移

### 5.1 数据类型映射
| Oracle | MySQL | 说明 |
|--------|-------|------|
| NUMBER(p,s) | DECIMAL(p,s) | 精确数值 |
| NUMBER | DECIMAL(65,0) | 无精度 NUMBER |
| VARCHAR2(n) | VARCHAR(n) | 变长字符串 |
| CHAR(n) | CHAR(n) | 定长字符串 |
| DATE | DATETIME | Oracle DATE 包含时间 |
| TIMESTAMP | DATETIME(6) | 微秒精度 |
| CLOB | LONGTEXT | 大文本（4GB） |
| BLOB | LONGBLOB | 二进制（4GB） |
| RAW | VARBINARY | 二进制 |
| LONG | TEXT | 已废弃 |

### 5.2 自动化 Schema 转换
```bash
# 使用 AWS SCT 转换 Schema
aws sct convert-schema \
  --source-endpoint oracle-source \
  --target-endpoint mysql-target \
  --output-dir /tmp/converted_schema

# 或使用 MySQL Workbench Migration Wizard
# GUI 工具，支持可视化转换

# 生成的 MySQL DDL 示例
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount DECIMAL(15,2),
    status VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 5.3 分区表转换
```sql
-- Oracle 分区表
CREATE TABLE orders (
    order_id NUMBER,
    order_date DATE,
    ...
)
PARTITION BY RANGE (order_date) (
    PARTITION p202301 VALUES LESS THAN (TO_DATE('2023-02-01', 'YYYY-MM-DD')),
    PARTITION p202302 VALUES LESS THAN (TO_DATE('2023-03-01', 'YYYY-MM-DD')),
    ...
);

-- MySQL 分区表
CREATE TABLE orders (
    order_id BIGINT,
    order_date DATE,
    ...
)
PARTITION BY RANGE (TO_DAYS(order_date)) (
    PARTITION p202301 VALUES LESS THAN (TO_DAYS('2023-02-01')),
    PARTITION p202302 VALUES LESS THAN (TO_DAYS('2023-03-01')),
    ...
);
```

---

## 6. 数据迁移实施

### 6.1 使用 DataX 批量迁移
```json
// datax_job.json
{
    "job": {
        "setting": {
            "speed": {
                "channel": 32,
                "byte": 10485760
            }
        },
        "content": [
            {
                "reader": {
                    "name": "oraclereader",
                    "parameter": {
                        "username": "app_user",
                        "password": "Oracle123#",
                        "column": ["order_id", "user_id", "amount", "created_at"],
                        "connection": [
                            {
                                "table": ["orders"],
                                "jdbcUrl": ["jdbc:oracle:thin:@192.168.1.10:1521:ORCL"]
                            }
                        ],
                        "where": "created_at >= TO_DATE('2023-01-01', 'YYYY-MM-DD')"
                    }
                },
                "writer": {
                    "name": "mysqlwriter",
                    "parameter": {
                        "username": "root",
                        "password": "MySQL123#",
                        "column": ["order_id", "user_id", "amount", "created_at"],
                        "connection": [
                            {
                                "table": ["orders"],
                                "jdbcUrl": "jdbc:mysql://192.168.1.20:3306/mydb?useUnicode=true&characterEncoding=utf8"
                            }
                        ],
                        "writeMode": "insert"
                    }
                }
            }
        ]
    }
}
```

```bash
# 执行 DataX 任务
python datax.py datax_job.json

# 并行执行多个任务（按分区）
for i in {1..12}; do
    python datax.py datax_job_2023_${i}.json &
done
wait

# 监控进度
tail -f datax.log
```

### 6.2 使用 Oracle GoldenGate 增量同步
```bash
# 在 Oracle 端配置 GoldenGate Extract
GGSCI> ADD EXTRACT ext1, TRANLOG, BEGIN NOW
GGSCI> ADD EXTTRAIL /u01/ogg/dirdat/lt, EXTRACT ext1
GGSCI> EDIT PARAMS ext1

# ext1.prm
EXTRACT ext1
USERID ggadmin, PASSWORD Oracle123#
EXTTRAIL /u01/ogg/dirdat/lt
TABLE app_schema.orders;
TABLE app_schema.users;
TABLE app_schema.products;

# 启动 Extract
GGSCI> START EXTRACT ext1

# 在 MySQL 端配置 Replicat
GGSCI> ADD REPLICAT rep1, EXTTRAIL /u01/ogg/dirdat/lt
GGSCI> EDIT PARAMS rep1

# rep1.prm
REPLICAT rep1
TARGETDB mydb, USERID root, PASSWORD MySQL123#
MAP app_schema.orders, TARGET mydb.orders;
MAP app_schema.users, TARGET mydb.users;
MAP app_schema.products, TARGET mydb.products;

# 启动 Replicat
GGSCI> START REPLICAT rep1

# 监控同步状态
GGSCI> INFO ALL
GGSCI> STATS EXTRACT ext1
GGSCI> STATS REPLICAT rep1
```

### 6.3 分批迁移脚本
```python
#!/usr/bin/env python3
# migrate_batch.py

import cx_Oracle
import pymysql
from datetime import datetime, timedelta

# 配置
ORACLE_DSN = "192.168.1.10:1521/ORCL"
ORACLE_USER = "app_user"
ORACLE_PASS = "Oracle123#"

MYSQL_HOST = "192.168.1.20"
MYSQL_USER = "root"
MYSQL_PASS = "MySQL123#"
MYSQL_DB = "mydb"

BATCH_SIZE = 10000
TABLE_NAME = "orders"

def migrate_table_by_date_range(start_date, end_date):
    """按日期范围迁移数据"""
    oracle_conn = cx_Oracle.connect(ORACLE_USER, ORACLE_PASS, ORACLE_DSN)
    mysql_conn = pymysql.connect(host=MYSQL_HOST, user=MYSQL_USER, 
                                  password=MYSQL_PASS, database=MYSQL_DB)
    
    oracle_cursor = oracle_conn.cursor()
    mysql_cursor = mysql_conn.cursor()
    
    # 查询 Oracle 数据
    query = f"""
        SELECT order_id, user_id, amount, status, created_at
        FROM {TABLE_NAME}
        WHERE created_at >= :start_date AND created_at < :end_date
        ORDER BY order_id
    """
    
    oracle_cursor.execute(query, start_date=start_date, end_date=end_date)
    
    batch = []
    total_rows = 0
    
    while True:
        rows = oracle_cursor.fetchmany(BATCH_SIZE)
        if not rows:
            break
        
        # 批量插入 MySQL
        insert_sql = f"""
            INSERT INTO {TABLE_NAME} 
            (order_id, user_id, amount, status, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """
        mysql_cursor.executemany(insert_sql, rows)
        mysql_conn.commit()
        
        total_rows += len(rows)
        print(f"Migrated {total_rows} rows for {start_date} to {end_date}")
    
    oracle_cursor.close()
    mysql_cursor.close()
    oracle_conn.close()
    mysql_conn.close()
    
    print(f"Completed: {total_rows} rows migrated")

# 按月分批迁移
start_date = datetime(2020, 1, 1)
end_date = datetime(2025, 12, 1)

current_date = start_date
while current_date < end_date:
    next_date = current_date + timedelta(days=30)
    print(f"Migrating data from {current_date} to {next_date}")
    migrate_table_by_date_range(current_date, next_date)
    current_date = next_date
```

---

## 7. 数据一致性校验

### 7.1 行数校验
```bash
#!/bin/bash
# check_row_count.sh

TABLES="orders users products transactions"

for table in $TABLES; do
    echo "Checking table: $table"
    
    # Oracle 行数
    oracle_count=$(sqlplus -s app_user/Oracle123#@ORCL <<EOF
SET PAGESIZE 0 FEEDBACK OFF VERIFY OFF HEADING OFF ECHO OFF
SELECT COUNT(*) FROM $table;
EXIT;
EOF
)
    
    # MySQL 行数
    mysql_count=$(mysql -h192.168.1.20 -uroot -pMySQL123# -D mydb -N -e "SELECT COUNT(*) FROM $table")
    
    echo "Oracle: $oracle_count, MySQL: $mysql_count"
    
    if [ "$oracle_count" -eq "$mysql_count" ]; then
        echo "✅ $table: PASS"
    else
        echo "❌ $table: FAIL (diff: $((oracle_count - mysql_count)))"
    fi
done
```

### 7.2 数据校验（Checksum）
```sql
-- Oracle 端
SELECT 
    'orders' AS table_name,
    COUNT(*) AS row_count,
    SUM(ORA_HASH(order_id || user_id || amount)) AS checksum
FROM orders;

-- MySQL 端
SELECT 
    'orders' AS table_name,
    COUNT(*) AS row_count,
    SUM(CRC32(CONCAT(order_id, user_id, amount))) AS checksum
FROM orders;
```

### 7.3 使用 pt-table-checksum（Percona Toolkit）
```bash
# 需要在 Oracle 和 MySQL 之间建立数据桥接
# 或使用自定义脚本逐行对比

# 示例：对比关键字段
SELECT order_id, MD5(CONCAT(user_id, amount, status)) AS hash
FROM orders
ORDER BY order_id
LIMIT 1000;
```

---

## 8. 应用改造

### 8.1 SQL 改写
```sql
-- Oracle: DUAL 表
SELECT SYSDATE FROM DUAL;
-- MySQL
SELECT NOW();

-- Oracle: 序列
SELECT seq_order_id.NEXTVAL FROM DUAL;
-- MySQL: AUTO_INCREMENT
INSERT INTO orders (user_id, amount) VALUES (123, 99.99);
SELECT LAST_INSERT_ID();

-- Oracle: ROWNUM
SELECT * FROM orders WHERE ROWNUM <= 10;
-- MySQL: LIMIT
SELECT * FROM orders LIMIT 10;

-- Oracle: NVL
SELECT NVL(column_name, 'default') FROM table_name;
-- MySQL: IFNULL/COALESCE
SELECT IFNULL(column_name, 'default') FROM table_name;

-- Oracle: TO_DATE
SELECT * FROM orders WHERE created_at > TO_DATE('2025-01-01', 'YYYY-MM-DD');
-- MySQL: STR_TO_DATE
SELECT * FROM orders WHERE created_at > STR_TO_DATE('2025-01-01', '%Y-%m-%d');

-- Oracle: DECODE
SELECT DECODE(status, 1, 'Active', 2, 'Inactive', 'Unknown') FROM users;
-- MySQL: CASE
SELECT CASE status 
    WHEN 1 THEN 'Active' 
    WHEN 2 THEN 'Inactive' 
    ELSE 'Unknown' 
END FROM users;
```

### 8.2 连接池配置
```properties
# Oracle (HikariCP)
spring.datasource.url=jdbc:oracle:thin:@192.168.1.10:1521:ORCL
spring.datasource.driver-class-name=oracle.jdbc.OracleDriver

# MySQL (HikariCP)
spring.datasource.url=jdbc:mysql://192.168.1.20:3306/mydb?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.hikari.maximum-pool-size=50
spring.datasource.hikari.minimum-idle=10
```

---

## 9. 性能优化

### 9.1 MySQL 参数调优（50TB 数据）
```ini
[mysqld]
# 内存配置（256GB 服务器）
innodb_buffer_pool_size = 180G  # 70% 内存
innodb_log_file_size = 8G
innodb_log_buffer_size = 256M

# IO 优化
innodb_io_capacity = 20000
innodb_io_capacity_max = 40000
innodb_flush_method = O_DIRECT
innodb_flush_log_at_trx_commit = 2  # 性能优先

# 并发优化
innodb_thread_concurrency = 0
innodb_read_io_threads = 16
innodb_write_io_threads = 16
max_connections = 2000

# 表空间
innodb_file_per_table = 1
innodb_data_file_path = ibdata1:1G:autoextend
```

### 9.2 索引优化
```sql
-- 分析慢查询
SELECT 
    query_time,
    lock_time,
    rows_examined,
    sql_text
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 20;

-- 创建复合索引
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);

-- 删除未使用索引
SELECT 
    table_schema,
    table_name,
    index_name
FROM information_schema.statistics
WHERE table_schema = 'mydb'
  AND index_name NOT IN (
      SELECT DISTINCT index_name 
      FROM sys.schema_unused_indexes
  );
```

---

## 10. 切换与回滚

### 10.1 灰度切换方案
```plaintext
第1天：10% 流量切换
  - 配置 Nginx/HAProxy 路由规则
  - 监控 MySQL 性能
  - 对比 Oracle 和 MySQL 查询结果

第3天：30% 流量切换
  - 扩大切换范围
  - 持续监控

第7天：50% 流量切换
  - 一半流量验证

第10天：100% 流量切换
  - 全量切换
  - Oracle 保留7天作为备份
```

### 10.2 回滚预案
```bash
# 触发条件：
# - 数据不一致
# - 性能严重下降（> 50%）
# - 功能异常

# 回滚步骤：
1. 立即切换流量回 Oracle
2. 停止 MySQL 写入
3. 分析失败原因
4. 修复问题后重新切换
```

---

## 11. 监控与告警

```sql
-- MySQL 关键指标
SHOW GLOBAL STATUS LIKE 'Threads_connected';
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read_requests';
SHOW GLOBAL STATUS LIKE 'Slow_queries';

-- 复制延迟（如果使用主从）
SHOW SLAVE STATUS\G
```

---

## 12. 最佳实践总结

1. **分阶段迁移**：历史数据 → 增量同步 → 灰度切换
2. **并行传输**：利用 DataX 多通道并行
3. **数据校验**：行数 + Checksum 双重校验
4. **性能测试**：迁移前后性能对比
5. **回滚预案**：保留 Oracle 数据7-14天
6. **监控告警**：实时监控 MySQL 性能指标
7. **文档记录**：记录所有改动和配置

---

**参考工具**：
- AWS DMS: https://aws.amazon.com/dms/
- Oracle GoldenGate: https://www.oracle.com/goldengate/
- DataX: https://github.com/alibaba/DataX
- Debezium: https://debezium.io/

