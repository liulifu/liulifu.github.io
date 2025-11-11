# 数据库迁移方案：Oracle 到 PostgreSQL

适用读者：DBA、架构师、项目经理
目标：提供从 Oracle 迁移到 PostgreSQL 的完整方案，包括评估、迁移、验证、优化全流程。

---

## 1. 迁移背景与动机

### 1.1 为什么迁移到 PostgreSQL
- **成本优势**：开源免费，无 License 费用
- **功能完善**：支持 ACID、事务、存储过程、触发器、视图
- **生态丰富**：PostGIS（地理信息）、TimescaleDB（时序数据）、Citus（分布式）
- **社区活跃**：快速迭代，安全补丁及时
- **云原生**：AWS RDS、Azure Database、阿里云 RDS 等完善支持

### 1.2 迁移挑战
| 挑战 | 影响 | 解决方案 |
|------|------|---------|
| SQL 语法差异 | 应用改造 | 使用 Orafce 插件、改写 SQL |
| PL/SQL → PL/pgSQL | 存储过程改写 | 逐个迁移、测试 |
| 数据类型差异 | 数据转换 | 类型映射、ETL 工具 |
| 性能差异 | 查询慢 | 索引优化、参数调优 |
| 业务停机时间 | 服务中断 | 双写、逻辑复制、灰度切换 |

---

## 2. 迁移前评估

### 2.1 数据库对象清单
```sql
-- Oracle 端执行
-- 统计表数量
SELECT COUNT(*) FROM user_tables;

-- 统计索引数量
SELECT COUNT(*) FROM user_indexes;

-- 统计存储过程/函数
SELECT object_type, COUNT(*) 
FROM user_objects 
WHERE object_type IN ('PROCEDURE', 'FUNCTION', 'PACKAGE', 'TRIGGER')
GROUP BY object_type;

-- 统计视图
SELECT COUNT(*) FROM user_views;

-- 统计序列
SELECT COUNT(*) FROM user_sequences;

-- 统计数据量
SELECT 
    table_name,
    num_rows,
    blocks,
    avg_row_len
FROM user_tables
ORDER BY num_rows DESC;
```

### 2.2 兼容性评估
```bash
# 使用 ora2pg 进行评估
yum install -y ora2pg

# 配置 ora2pg.conf
cat > /etc/ora2pg/ora2pg.conf <<EOF
ORACLE_DSN  dbi:Oracle:host=192.168.1.10;sid=ORCL;port=1521
ORACLE_USER system
ORACLE_PWD  Oracle123#
SCHEMA      MYAPP
TYPE        TABLE,VIEW,SEQUENCE,FUNCTION,PROCEDURE,TRIGGER,PACKAGE
OUTPUT      /tmp/migration_report.html
EOF

# 生成评估报告
ora2pg -c /etc/ora2pg/ora2pg.conf -t SHOW_REPORT --estimate_cost > /tmp/migration_cost.txt

# 报告包含：
# - 迁移难度评分（1-5星）
# - 需要改写的对象列表
# - 预估工作量（人天）
```

### 2.3 应用依赖分析
```plaintext
检查清单：
□ JDBC/ODBC 驱动版本
□ ORM 框架（Hibernate/MyBatis）配置
□ 连接池配置（HikariCP/Druid）
□ SQL 方言（Oracle 特有函数）
□ 事务隔离级别
□ 字符集（Oracle: AL32UTF8 → PostgreSQL: UTF8）
□ 日期格式（TO_DATE → TO_TIMESTAMP）
```

---

## 3. 迁移方案设计

### 3.1 迁移策略选择
| 策略 | 停机时间 | 复杂度 | 适用场景 |
|------|---------|--------|---------|
| 停机迁移 | 长（数小时） | 低 | 非核心系统、可接受长时间停机 |
| 双写切换 | 短（分钟级） | 中 | 核心系统、需要验证 |
| 逻辑复制 | 极短（秒级） | 高 | 金融、电商等零停机要求 |
| 灰度迁移 | 无 | 高 | 大型系统、分模块迁移 |

### 3.2 推荐方案：双写 + 逻辑复制
```plaintext
阶段1：准备阶段（1-2周）
  - 安装 PostgreSQL 集群
  - 迁移 Schema（表、索引、序列）
  - 改写存储过程/函数
  - 应用代码适配

阶段2：数据同步（1周）
  - 全量数据迁移（ora2pg/AWS DMS）
  - 启动增量同步（GoldenGate/Debezium）
  - 数据一致性校验

阶段3：双写验证（1-2周）
  - 应用双写（Oracle + PostgreSQL）
  - 对比查询结果
  - 性能测试

阶段4：切换上线（1天）
  - 停止写入 Oracle
  - 最终数据同步
  - 切换应用到 PostgreSQL
  - 监控告警

阶段5：稳定观察（1周）
  - 性能监控
  - 错误日志分析
  - 回滚预案准备
```

---

## 4. Schema 迁移

### 4.1 使用 ora2pg 迁移 Schema
```bash
# 安装 ora2pg
cpan DBD::Oracle
cpan DBD::Pg
git clone https://github.com/darold/ora2pg.git
cd ora2pg
perl Makefile.PL
make && make install

# 配置 ora2pg.conf
cat > /etc/ora2pg/ora2pg.conf <<EOF
ORACLE_DSN  dbi:Oracle:host=192.168.1.10;sid=ORCL;port=1521
ORACLE_USER myapp
ORACLE_PWD  MyApp123#
SCHEMA      MYAPP

PG_DSN      dbi:Pg:dbname=myapp;host=192.168.1.20;port=5432
PG_USER     postgres
PG_PWD      Postgres123#

TYPE        TABLE
OUTPUT      /tmp/schema.sql
OUTPUT_DIR  /tmp/migration

# 数据类型映射
DATA_TYPE   NUMBER:numeric
DATA_TYPE   VARCHAR2:varchar
DATA_TYPE   DATE:timestamp
DATA_TYPE   CLOB:text
DATA_TYPE   BLOB:bytea

# 排除系统表
EXCLUDE     SYS_%,TEMP_%
EOF

# 导出 Schema
ora2pg -c /etc/ora2pg/ora2pg.conf -t TABLE -o tables.sql
ora2pg -c /etc/ora2pg/ora2pg.conf -t INDEX -o indexes.sql
ora2pg -c /etc/ora2pg/ora2pg.conf -t SEQUENCE -o sequences.sql
ora2pg -c /etc/ora2pg/ora2pg.conf -t VIEW -o views.sql
ora2pg -c /etc/ora2pg/ora2pg.conf -t TRIGGER -o triggers.sql
ora2pg -c /etc/ora2pg/ora2pg.conf -t FUNCTION -o functions.sql
ora2pg -c /etc/ora2pg/ora2pg.conf -t PROCEDURE -o procedures.sql

# 导入到 PostgreSQL
psql -h 192.168.1.20 -U postgres -d myapp -f /tmp/migration/tables.sql
psql -h 192.168.1.20 -U postgres -d myapp -f /tmp/migration/indexes.sql
psql -h 192.168.1.20 -U postgres -d myapp -f /tmp/migration/sequences.sql
```

### 4.2 数据类型映射
| Oracle | PostgreSQL | 说明 |
|--------|-----------|------|
| NUMBER | numeric/integer | 根据精度选择 |
| VARCHAR2(n) | varchar(n) | 直接映射 |
| CHAR(n) | char(n) | 直接映射 |
| DATE | timestamp | Oracle DATE 包含时间 |
| TIMESTAMP | timestamp | 直接映射 |
| CLOB | text | 大文本 |
| BLOB | bytea | 二进制数据 |
| RAW | bytea | 二进制数据 |
| LONG | text | 已废弃，转为 text |

### 4.3 常见 SQL 改写
```sql
-- Oracle: DUAL 表
SELECT SYSDATE FROM DUAL;
-- PostgreSQL: 无需 DUAL
SELECT CURRENT_TIMESTAMP;

-- Oracle: 序列
SELECT seq_order_id.NEXTVAL FROM DUAL;
-- PostgreSQL
SELECT nextval('seq_order_id');

-- Oracle: 字符串拼接
SELECT 'Hello' || ' ' || 'World' FROM DUAL;
-- PostgreSQL: 相同
SELECT 'Hello' || ' ' || 'World';

-- Oracle: NVL
SELECT NVL(column_name, 'default') FROM table_name;
-- PostgreSQL: COALESCE
SELECT COALESCE(column_name, 'default') FROM table_name;

-- Oracle: DECODE
SELECT DECODE(status, 1, 'Active', 2, 'Inactive', 'Unknown') FROM users;
-- PostgreSQL: CASE
SELECT CASE status 
    WHEN 1 THEN 'Active' 
    WHEN 2 THEN 'Inactive' 
    ELSE 'Unknown' 
END FROM users;

-- Oracle: ROWNUM
SELECT * FROM users WHERE ROWNUM <= 10;
-- PostgreSQL: LIMIT
SELECT * FROM users LIMIT 10;

-- Oracle: (+) 外连接
SELECT a.*, b.* FROM a, b WHERE a.id = b.id(+);
-- PostgreSQL: LEFT JOIN
SELECT a.*, b.* FROM a LEFT JOIN b ON a.id = b.id;
```

---

## 5. 数据迁移

### 5.1 全量数据迁移（ora2pg）
```bash
# 配置 ora2pg.conf
TYPE        COPY
OUTPUT      /tmp/data.sql

# 导出数据
ora2pg -c /etc/ora2pg/ora2pg.conf -t COPY -o data.sql

# 导入数据
psql -h 192.168.1.20 -U postgres -d myapp -f /tmp/migration/data.sql

# 或使用并行导入
ora2pg -c /etc/ora2pg/ora2pg.conf -t COPY -j 4 -o data.sql
```

### 5.2 使用 AWS DMS（Database Migration Service）
```plaintext
优势：
- 支持增量同步
- 自动类型转换
- 可视化监控
- 支持多种数据库

步骤：
1. 创建复制实例（Replication Instance）
2. 创建源端点（Oracle）
3. 创建目标端点（PostgreSQL）
4. 创建迁移任务
   - Full Load（全量）
   - Full Load + CDC（全量 + 增量）
5. 启动任务并监控
```

### 5.3 使用 Debezium（CDC）
```yaml
# Debezium Oracle Connector 配置
name: oracle-connector
config:
  connector.class: io.debezium.connector.oracle.OracleConnector
  database.hostname: 192.168.1.10
  database.port: 1521
  database.user: c##dbzuser
  database.password: Oracle123#
  database.dbname: ORCL
  database.server.name: oracle-server
  table.include.list: MYAPP.USERS,MYAPP.ORDERS
  database.history.kafka.bootstrap.servers: kafka:9092
  database.history.kafka.topic: schema-changes.myapp
```

---

## 6. 存储过程/函数迁移

### 6.1 PL/SQL → PL/pgSQL 改写
```sql
-- Oracle PL/SQL
CREATE OR REPLACE PROCEDURE update_user_status(
    p_user_id IN NUMBER,
    p_status IN VARCHAR2
) AS
BEGIN
    UPDATE users 
    SET status = p_status, updated_at = SYSDATE
    WHERE user_id = p_user_id;
    
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/

-- PostgreSQL PL/pgSQL
CREATE OR REPLACE FUNCTION update_user_status(
    p_user_id INTEGER,
    p_status VARCHAR
) RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET status = p_status, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
    
    -- PostgreSQL 自动管理事务，无需显式 COMMIT
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$ LANGUAGE plpgsql;
```

### 6.2 使用 Orafce 插件（兼容层）
```sql
-- 安装 Orafce（提供 Oracle 兼容函数）
CREATE EXTENSION orafce;

-- 支持的 Oracle 函数：
-- SYSDATE, TRUNC, TO_CHAR, TO_DATE, NVL, DECODE, SUBSTR, INSTR 等

-- 示例
SELECT SYSDATE FROM DUAL;  -- 在 PostgreSQL 中可用
SELECT NVL(column_name, 'default') FROM table_name;  -- 可用
```

---

## 7. 应用改造

### 7.1 JDBC 驱动替换
```xml
<!-- Maven pom.xml -->
<!-- 移除 Oracle 驱动 -->
<!--
<dependency>
    <groupId>com.oracle.database.jdbc</groupId>
    <artifactId>ojdbc8</artifactId>
    <version>19.3.0.0</version>
</dependency>
-->

<!-- 添加 PostgreSQL 驱动 -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <version>42.6.0</version>
</dependency>
```

### 7.2 连接字符串修改
```properties
# Oracle
spring.datasource.url=jdbc:oracle:thin:@192.168.1.10:1521:ORCL
spring.datasource.driver-class-name=oracle.jdbc.OracleDriver

# PostgreSQL
spring.datasource.url=jdbc:postgresql://192.168.1.20:5432/myapp
spring.datasource.driver-class-name=org.postgresql.Driver
```

### 7.3 Hibernate 方言配置
```properties
# Oracle
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.Oracle12cDialect

# PostgreSQL
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

---

## 8. 数据一致性校验

### 8.1 行数校验
```sql
-- Oracle
SELECT table_name, num_rows FROM user_tables ORDER BY table_name;

-- PostgreSQL
SELECT 
    schemaname,
    tablename,
    n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY tablename;
```

### 8.2 数据校验（Checksum）
```bash
# 使用 pt-table-checksum（需适配 PostgreSQL）
# 或自定义脚本

# Oracle
SELECT table_name, COUNT(*), SUM(ORA_HASH(column1 || column2)) AS checksum
FROM table_name
GROUP BY table_name;

# PostgreSQL
SELECT 'table_name', COUNT(*), SUM(hashtext(column1::text || column2::text)) AS checksum
FROM table_name;
```

### 8.3 使用 AWS DMS 数据验证
```plaintext
AWS DMS 提供内置数据验证：
- 行数对比
- 列值对比
- 自动生成差异报告
```

---

## 9. 性能优化

### 9.1 索引优化
```sql
-- 检查缺失索引
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### 9.2 参数调优
```bash
# postgresql.conf
shared_buffers = 8GB  # 25% 内存
effective_cache_size = 24GB  # 75% 内存
maintenance_work_mem = 2GB
work_mem = 64MB
max_connections = 200
random_page_cost = 1.1  # SSD
effective_io_concurrency = 200
```

### 9.3 VACUUM 与 ANALYZE
```sql
-- 定期 VACUUM
VACUUM ANALYZE users;

-- 自动 VACUUM 配置
ALTER TABLE users SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE users SET (autovacuum_analyze_scale_factor = 0.05);
```

---

## 10. 切换与回滚

### 10.1 切换步骤
```plaintext
1. 停止应用写入（维护模式）
2. 等待增量同步完成
3. 最终数据校验
4. 修改应用配置（数据库连接）
5. 重启应用
6. 验证功能
7. 监控性能
8. 宣布切换成功
```

### 10.2 回滚预案
```plaintext
触发条件：
- 数据不一致
- 性能严重下降
- 功能异常

回滚步骤：
1. 停止应用
2. 恢复 Oracle 连接配置
3. 重启应用
4. 验证功能
5. 分析失败原因
```

---

## 11. 监控与告警

### 11.1 关键指标
```sql
-- 连接数
SELECT count(*) FROM pg_stat_activity;

-- 慢查询
SELECT 
    pid,
    now() - query_start AS duration,
    query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;

-- 锁等待
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

---

## 12. 最佳实践总结

1. **充分评估**：使用 ora2pg 评估迁移成本
2. **分阶段迁移**：先非核心系统，再核心系统
3. **双写验证**：确保数据一致性
4. **性能测试**：迁移前后性能对比
5. **回滚预案**：准备快速回滚方案
6. **监控告警**：实时监控关键指标
7. **文档记录**：记录所有改动和配置

---

**参考工具**：
- ora2pg: https://ora2pg.darold.net/
- AWS DMS: https://aws.amazon.com/dms/
- Debezium: https://debezium.io/
- Orafce: https://github.com/orafce/orafce

