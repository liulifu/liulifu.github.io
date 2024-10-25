# 处理ERP系统中CPU占用率高的问题案例分析

## 背景

在日常ERP系统的维护过程中，性能问题是不可避免的，特别是在用户并发量较大或数据查询复杂的情况下，可能会出现CPU占用率过高的情况，导致系统响应缓慢甚至出现卡顿。在一次维护过程中，我遇到了一个CPU占用率极高的问题，通过一系列分析和排查，最终定位到了问题根源并成功解决。

## 问题描述

该问题发生在一个生产环境的ERP系统中，Oracle数据库，用户反馈系统运行缓慢，界面加载和数据查询时间过长。我通过监控发现，某个Java应用程序的CPU占用率持续处于90%以上，严重影响了系统的正常运行。

## 分析过程

### 1. 初步诊断

第一步是通过 `top`命令检查系统中CPU的整体使用情况，并找出高占用率的进程。使用的命令如下：

```bash
top
```

在 `top`命令的输出中，关注以下几个参数：

- **PID**：进程ID
- **USER**：进程的所属用户
- **%CPU**：进程占用的CPU百分比
- **TIME+**：进程累计使用的CPU时间
- **COMMAND**：进程的启动命令

通过观察这些参数，我锁定了一个占用CPU过高的Java进程，其PID为1234。

### 2. 进一步分析Java线程

由于是Java系统，CPU占用高的情况很可能是由某个线程导致的。使用 `top -H`命令可以查看进程内部各线程的CPU使用情况：

```bash
top -H -p 1234
```

此时输出中可以看到不同线程的CPU使用情况，锁定占用CPU最多的线程后，记下其TID（线程ID）。假设TID为5678。

### 3. 导出Java堆栈信息

为了进一步分析Java线程的执行情况，使用 `jstack`命令导出Java进程的堆栈信息：

```bash
jstack 1234 > /path/to/jstack_output.txt
```

通过导出的堆栈文件，可以搜索线程ID，将其转换为十六进制格式，`printf`命令可用于转换：

```bash
printf "%x\n" 5678
```

假设转换结果为 `162e`，然后在堆栈文件中查找 `162e`，可以找到对应的Java线程堆栈信息。

### 4. 分析线程堆栈

通过堆栈信息，可以看到该线程正在执行某个数据库查询操作。通常，性能瓶颈可能是由于复杂的SQL查询导致的。此时，我通过堆栈信息找到了正在执行的SQL语句。

### 5. 进一步分析SQL语句

由于使用的是Oracle数据库，下一步是使用Oracle的性能分析工具进行进一步的SQL性能诊断。

首先，通过以下SQL语句在数据库中查询正在执行的SQL：

```sql
SELECT sql_text
FROM v$sql
WHERE sql_id = 'xxxxxxxx';
```

通过查询，可以定位到导致CPU占用率高的SQL语句。

### 6. 使用AWR报告和Explain Plan分析SQL

Oracle数据库提供了AWR报告，可以用来查看SQL的执行效率和耗时情况。通过生成AWR报告，我可以详细查看这个SQL执行的各种性能指标。同时，使用 `EXPLAIN PLAN`命令查看该SQL的执行计划，判断是否存在全表扫描、索引缺失等问题。

```sql
EXPLAIN PLAN FOR
SELECT ... -- 此处为具体的SQL语句
```

通过执行计划的分析，发现该SQL缺少适当的索引，导致查询性能较差。

## 问题解决

### 1. 创建索引

根据分析结果，我在相关表上创建了适当的索引，以提高查询效率。

```sql
CREATE INDEX idx_column_name ON table_name(column_name);
```

### 2. 优化SQL

除了创建索引，还对SQL语句进行了重写，减少了不必要的联表操作和全表扫描，进一步提升了性能。

### 3. 验证和监控

优化完成后，我再次运行 `top`命令检查CPU占用情况，CPU使用率显著下降，系统恢复正常。同时，持续监控该SQL的执行情况，确保问题不会再次发生。

通过以上的排查和优化，解决了ERP系统中CPU占用率过高的问题。这个过程展示了如何通过系统工具（如 `top`和 `jstack`）结合数据库分析工具（如AWR报告、EXPLAIN PLAN等）定位并解决性能瓶颈问题。系统维护中，遇到类似问题时，迅速定位和有效解决问题的能力至关重要。


# 扩展

## MySQL 数据库的解决方案

>
> 如果数据库使用的是MySQL，处理类似CPU占用率高的问题，解决步骤大体相似，但涉及的工具和方法会有所不同。下面是一个基于MySQL的处理流程：
>
> 1. 使用 `top`等系统监控工具识别问题进程。
> 2. 使用 `mysqladmin`或 `SHOW FULL PROCESSLIST`查看正在执行的查询。
> 3. 分析慢查询日志，找到长时间运行的查询。
> 4. 通过 `EXPLAIN`命令分析执行计划，发现未优化的SQL。
> 5. 通过创建索引或优化查询结构，提升SQL的性能，降低CPU使用率。
>
> ### 1. 初步诊断
>
> 首先，通过 `top`命令监控系统中的进程，找到占用CPU过高的进程，通常是MySQL的进程。与之前类似，使用 `top`或 `htop`工具锁定CPU占用高的进程PID。
>
> ```bash
> top
> ```
>
> 在 `top`命令输出中，找出高CPU占用的进程（例如MySQL进程），记录下其PID，假设PID为1234。
>
> ### 2. 进一步分析MySQL进程
>
> 使用 `mysqladmin`工具可以检查MySQL进程的运行状态，了解正在执行的查询和线程的运行情况：
>
> ```bash
> mysqladmin processlist
> ```
>
> 此命令可以显示当前正在运行的SQL查询，并列出每个查询的线程ID、状态、执行时间等信息。通过查看 `Command`列，可以识别是否有长时间运行的查询。
>
> ### 3. 查找耗费资源的SQL
>
> 进一步使用 `SHOW FULL PROCESSLIST`命令，查看当前运行的所有查询，并重点关注那些状态为“Sending data”或“Copying to tmp table”的查询，它们通常是导致CPU占用率高的原因之一：
>
> ```sql
> SHOW FULL PROCESSLIST;
> ```
>
> 此命令将返回所有正在执行的查询，关注 `Time`列和 `State`列中的长时间运行的查询。记录下占用时间长、可能导致性能问题的SQL查询。
>
> ### 4. 使用慢查询日志
>
> MySQL的慢查询日志是另一个强大的工具，可以帮助定位性能不佳的SQL查询。如果还没有启用慢查询日志，可以通过以下命令启用：
>
> ```sql
> SET GLOBAL slow_query_log = 'ON';
> SET GLOBAL long_query_time = 2; -- 记录超过2秒的查询
> ```
>
> 慢查询日志将记录所有超过指定时间的查询。可以通过以下命令查看慢查询日志的位置：
>
> ```sql
> SHOW VARIABLES LIKE 'slow_query_log_file';
> ```
>
> 通过分析慢查询日志，可以识别出哪些查询执行时间过长并可能需要优化。
>
> ### 5. 执行计划分析
>
> 使用 `EXPLAIN`命令查看长时间运行的SQL查询的执行计划，判断是否存在全表扫描、未使用索引等问题：
>
> ```sql
> EXPLAIN SELECT ... -- 问题SQL查询
> ```
>
> `EXPLAIN`输出将展示该SQL查询的执行计划，包括是否使用了索引、扫描了多少行等关键信息。如果查询没有使用索引，可能就是CPU占用率高的原因。
>
> ### 6. 索引优化
>
> 根据执行计划的结果，如果发现查询没有使用索引，可以通过为相关字段创建索引来优化查询。例如，如果某个查询在 `column_name`字段上频繁过滤或排序，可以创建索引：
>
> ```sql
> CREATE INDEX idx_column_name ON table_name(column_name);
> ```
>
> 添加适当的索引可以显著降低CPU使用率，提升查询性能。
>
> ### 7. 查询优化
>
> 除了添加索引，还可以通过重写SQL查询来优化性能。避免使用子查询，尽量使用JOIN查询来提高效率。另外，也可以调整MySQL的查询缓存设置或优化查询结构，减少不必要的计算。
>
> ### 8. 性能监控和验证
>
> 优化完索引和查询后，再次通过 `SHOW FULL PROCESSLIST`或 `mysqladmin processlist`查看当前的执行情况，确认CPU使用率是否下降。还可以通过 `top`命令验证整体系统的性能恢复情况。
>

## DB2 数据库的解决方案

> 在DB2数据库中，处理类似的CPU占用率高的问题，主要步骤与MySQL、Oracle类似，但会使用DB2的特定工具和命令。以下是处理此类问题的详细步骤：
>
> 1. 使用系统级工具（如 `top`）确认问题进程。
> 2. 使用 `LIST APPLICATIONS`和 `LIST ACTIVE QUERIES`查看当前运行的SQL语句。
> 3. 使用 `EXPLAIN`分析SQL的执行计划，识别性能瓶颈。
> 4. 通过创建索引和优化SQL语句来提高查询效率。
> 5. 使用DB2的锁定监控工具，解决潜在的锁定问题。
> 6. 通过DB2的快照工具和活动日志，进一步跟踪性能问题并优化。
>
> ### 1. 初步诊断
>
> 首先，仍然使用系统级工具如 `top`或 `htop`，锁定占用CPU过高的DB2进程。假设锁定的进程ID为1234。
>
> ```bash
> top
> ```
>
> 找到占用CPU最高的进程后，确认是DB2的进程，并记录下进程ID。
>
> ### 2. 使用DB2监控工具
>
> DB2提供了一些命令来查看当前会话的详细信息，最常用的是 `LIST APPLICATIONS`命令。可以使用以下命令来查看正在运行的SQL语句：
>
> ```bash
> db2 list applications show detail
> ```
>
> 这将列出所有当前正在运行的应用程序及其详细信息，包括应用程序句柄、连接的数据库、客户端信息等。通过此命令，可以识别那些运行时间长且消耗大量资源的会话。
>
> ### 3. 查看SQL语句
>
> 使用 `LIST APPLICATIONS`命令后，可以通过 `LIST ACTIVE QUERIES`进一步查看正在运行的SQL语句：
>
> ```bash
> db2 list active queries for application <application_handle>
> ```
>
> 这个命令会显示指定应用程序句柄下当前执行的SQL查询，并帮助识别哪些SQL语句可能是导致CPU占用率高的原因。
>
> ### 4. 使用快照监控工具
>
> DB2提供了快照（Snapshot）工具，用于更详细的系统性能监控。可以使用以下命令生成DB2数据库的快照，获取当前的性能状态，包括CPU的使用情况：
>
> ```bash
> db2 get snapshot for all on <database_name>
> ```
>
> 这将返回该数据库中当前活动的会话、语句执行、锁定等信息，并提供对CPU使用情况的详细统计。
>
> ### 5. 使用 `EXPLAIN`分析查询
>
> DB2与其他数据库类似，也提供 `EXPLAIN`命令来分析查询的执行计划，识别性能瓶颈。对于找到的SQL语句，使用 `EXPLAIN`命令查看其执行计划：
>
> ```sql
> EXPLAIN PLAN FOR <SQL语句>;
> ```
>
> 这将返回SQL的执行计划，包括是否使用索引、扫描表的行数等。如果发现查询在全表扫描或未使用索引，可能就是导致CPU使用率高的原因。
>
> ### 6. 索引优化
>
> 如果查询未使用索引，可以为相关字段创建索引来优化性能。例如，如果查询在某个字段上频繁执行过滤操作，可以创建索引：
>
> ```sql
> CREATE INDEX idx_column_name ON table_name(column_name);
> ```
>
> 创建索引后，查询的执行时间应该会大幅减少，CPU占用率也会下降。
>
> ### 7. 使用锁定监控工具
>
> CPU占用高的问题也可能是由于锁定问题引起的。DB2提供了锁定监控工具，使用以下命令可以查看当前会话是否存在锁定争用：
>
> ```bash
> db2 get snapshot for locks on <database_name>
> ```
>
> 如果发现某些查询由于锁定问题长时间等待，可能需要对应用程序或SQL语句进行优化，以减少锁定冲突。
>
> ### 8. 使用活动日志分析
>
> DB2还提供活动日志（Activity Log），可以帮助监控长时间运行的SQL查询。通过配置活动日志，你可以记录超过一定时间的SQL语句并进行分析：
>
> ```bash
> db2 "UPDATE MONITOR SWITCHES USING STATEMENT ON"
> db2 "GET SNAPSHOT FOR DYNAMIC SQL ON <database_name>"
> ```
>
> 这些工具将帮助你跟踪并分析长时间运行的SQL查询，并找到可能导致性能问题的语句。
>
> ### 9. 验证和监控
>
> 在优化索引和SQL查询后，使用 `LIST APPLICATIONS`、`EXPLAIN`等工具验证CPU使用率的下降。再次通过 `top`等系统级工具检查系统性能，确认CPU占用率是否恢复到正常水平。
>



## PostgreSQL的解决方案

>
> 如果数据库使用的是PostgreSQL，处理类似的CPU占用率高的问题也有一些特定的方法和工具。以下是详细的分析和解决流程：
>
> 1. 使用 `pg_stat_activity`和 `pg_stat_statements`查看当前活动的SQL查询。
> 2. 使用锁定查询排查工具查看锁定冲突。
> 3. 使用 `EXPLAIN ANALYZE`分析查询执行计划，优化SQL语句。
> 4. 创建索引并定期执行 `VACUUM`和 `ANALYZE`操作，维护数据库的统计信息。
> 5. 调整配置参数（如 `work_mem`和 `shared_buffers`）提升性能。
>
> ### 1. 初步诊断
>
> 首先，通过系统工具 `top`或 `htop`确认占用CPU过高的进程。找到PostgreSQL的进程，并记下进程ID。例如，进程ID为1234。
>
> ```bash
> top
> ```
>
> 锁定PostgreSQL的高CPU进程后，可以进一步查看哪些SQL查询正在导致资源占用。
>
> ### 2. 查看活动查询
>
> PostgreSQL中可以使用 `pg_stat_activity`视图查看当前正在运行的查询。通过查询此视图，可以找到占用CPU资源的长时间运行的查询。
>
> ```sql
> SELECT pid, usename, state, query, query_start
> FROM pg_stat_activity
> WHERE state = 'active'
> ORDER BY query_start;
> ```
>
> 这个查询会显示所有活动的SQL语句，按照执行时间从早到晚排序。`pid`是PostgreSQL内部的进程ID，可以根据这个ID进一步排查具体的SQL语句。
>
> ### 3. 查看锁定和阻塞
>
> CPU占用高的问题有时可能是由锁定问题引起的。可以通过以下SQL命令查看数据库中的锁定和阻塞情况：
>
> ```sql
> SELECT blocked_locks.pid AS blocked_pid,
>        blocked_activity.usename AS blocked_user,
>        blocking_locks.pid AS blocking_pid,
>        blocking_activity.usename AS blocking_user,
>        blocked_activity.query AS blocked_statement,
>        blocking_activity.query AS blocking_statement
> FROM pg_locks blocked_locks
> JOIN pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
> JOIN pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
>                               AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
>                               AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
>                               AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
>                               AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
>                               AND blocking_locks.pid != blocked_locks.pid
> JOIN pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
> WHERE NOT blocked_locks.granted;
> ```
>
> 这段SQL将返回所有正在发生的锁定和阻塞信息。可以查看哪个查询正在阻塞其他查询，并查看是否有未释放的锁导致了CPU占用问题。
>
> ### 4. 使用 `EXPLAIN ANALYZE`分析SQL性能
>
> 对于长时间运行的查询，使用 `EXPLAIN ANALYZE`命令查看其执行计划。这个命令不仅会给出SQL的执行计划，还会显示实际执行时间和步骤。
>
> ```sql
> EXPLAIN ANALYZE SELECT ... -- 问题SQL查询
> ```
>
> `EXPLAIN ANALYZE`的输出中会显示查询的各个阶段、扫描方式、是否使用索引等信息。如果查询执行计划显示存在全表扫描或者没有使用索引，可能是导致CPU占用高的原因。
>
> ### 5. 索引优化
>
> 在执行计划中，如果发现查询没有使用索引，可以为相关字段创建适当的索引以提高性能。例如，如果查询在某个列上频繁进行过滤或排序，可以创建索引：
>
> ```sql
> CREATE INDEX idx_column_name ON table_name(column_name);
> ```
>
> 通过索引优化，查询执行时间通常会减少，CPU使用率也会下降。
>
> ### 6. 配置参数调整
>
> 在PostgreSQL中，一些配置参数也会影响性能。以下是一些关键参数：
>
> - **work_mem**：用于调整查询时的内存使用量。对于复杂查询，适当增加 `work_mem`可以减少磁盘I/O，提高查询速度。
> - **shared_buffers**：设置共享内存缓存的大小，通常建议设置为物理内存的25%左右，以提高查询的缓存命中率。
> - **maintenance_work_mem**：用于维护操作（如 `VACUUM`）的内存分配，也可适当增大以减少CPU占用。
>
> 在 `postgresql.conf`中调整这些参数，保存并重启数据库服务后可以生效。
>
> ### 7. 使用 `pg_stat_statements`模块进行监控
>
> PostgreSQL的 `pg_stat_statements`模块可以记录所有SQL查询的执行统计信息，帮助找出频繁执行或耗时的查询。首先在PostgreSQL中启用该模块：
>
> 在 `postgresql.conf`中添加或启用以下配置项：
>
> ```conf
> shared_preload_libraries = 'pg_stat_statements'
> ```
>
> 然后重启PostgreSQL服务，并创建扩展：
>
> ```sql
> CREATE EXTENSION pg_stat_statements;
> ```
>
> 查询统计信息以查看那些高频或长时间执行的SQL语句：
>
> ```sql
> SELECT query, calls, total_time, rows
> FROM pg_stat_statements
> ORDER BY total_time DESC
> LIMIT 10;
> ```
>
> `pg_stat_statements`可以提供耗时最高的SQL查询，帮助快速定位性能瓶颈。
>
> ### 8. 使用自动化 `VACUUM`和 `ANALYZE`
>
> PostgreSQL的表和索引需要定期进行 `VACUUM`和 `ANALYZE`操作，以保证统计信息更新并防止膨胀。可以设置自动化的 `VACUUM`和 `ANALYZE`，也可以手动执行：
>
> ```sql
> VACUUM ANALYZE table_name;
> ```
>
> `ANALYZE`操作会更新查询优化器所需的统计信息，帮助执行计划选择最优的查询路径。
>
> ### 9. 验证和监控
>
> 完成优化操作后，再次使用 `pg_stat_activity`、`EXPLAIN ANALYZE`和系统级监控工具（如 `top`）验证CPU使用率是否降低。同时，可以将 `pg_stat_statements`作为持续监控的一部分，定期检查高耗时查询。
>
>

## SQL Server的解决方案

> 在SQL Server中处理类似的CPU占用率高的问题，需要使用SQL Server特有的工具和方法。以下是处理流程：
>
> 1. 使用 `sys.dm_exec_requests`和 `sp_whoisactive`查看当前正在执行的SQL语句及其CPU使用情况。
> 2. 使用SQL Server Profiler或 `Query Store`跟踪性能问题。
> 3. 使用 `EXPLAIN`计划或查看执行计划分析查询的性能瓶颈。
> 4. 创建适当的索引，优化查询执行计划。
> 5. 调整SQL Server的并行度和执行代价参数。
> 6. 定期进行索引维护和统计信息更新。
>
> ### 1. 初步诊断
>
> 首先，通过系统工具如 `Task Manager`或 `top`（如果是Linux环境）检查SQL Server进程的CPU使用情况。记录占用CPU过高的进程ID。
>
> 在Windows上可以通过 `Task Manager`找到SQL Server的进程 `sqlservr.exe`，记录下进程的PID。
>
> ### 2. 使用SQL Server 动态管理视图 (DMV)
>
> SQL Server提供了丰富的动态管理视图（DMV），可以用来查询当前的活动会话和查询。
>
> 使用以下查询查看当前正在执行的SQL语句：
>
> ```sql
> SELECT 
>     r.session_id,
>     r.status,
>     r.cpu_time,
>     r.total_elapsed_time,
>     t.text AS [SQL Text],
>     s.login_name,
>     s.host_name,
>     s.program_name
> FROM 
>     sys.dm_exec_requests r
> CROSS APPLY 
>     sys.dm_exec_sql_text(r.sql_handle) t
> JOIN 
>     sys.dm_exec_sessions s ON r.session_id = s.session_id
> ORDER BY 
>     r.cpu_time DESC;
> ```
>
> 这个查询会返回所有正在执行的SQL语句，并按照CPU使用时间排序，帮助你锁定那些消耗资源较多的查询。
>
> ### 3. 使用SQL Server Profiler
>
> SQL Server Profiler可以实时捕获数据库服务器上的SQL事件，包括每个查询的执行时间、CPU使用情况等。
>
> #### 步骤：
>
> 1. 打开SQL Server Management Studio (SSMS)，选择“工具” > “SQL Server Profiler”。
> 2. 在事件选择器中，选择“Performance”下的事件，如 `SQL:BatchCompleted`和 `SQL:StmtCompleted`，并勾选“显示CPU”和“显示执行时间”。
> 3. 启动跟踪后，捕获高CPU使用的查询。
>
> 通过SQL Server Profiler，你可以找到导致CPU高负载的查询并分析它们的执行情况。
>
> ### 4. 使用 `sp_whoisactive`查看活动查询
>
> `sp_whoisactive`是一个常用的存储过程，能够显示当前所有活动的会话，包括详细的SQL语句和资源使用情况。如果还未安装该存储过程，可以从官方SQL Server社区获取。
>
> 执行 `sp_whoisactive`存储过程，查看活动查询：
>
> ```sql
> EXEC sp_whoisactive;
> ```
>
> 此命令将列出当前所有活跃的会话，帮助你识别那些消耗大量CPU的查询。
>
> ### 5. 查看执行计划（Execution Plan）
>
> 在确定了可能导致CPU过高的SQL语句后，使用查询执行计划（Execution Plan）来分析查询的性能瓶颈。
>
> 在SSMS中运行查询，并查看其执行计划：
>
> ```sql
> SET SHOWPLAN_ALL ON;
> -- 查询语句
> SELECT ... ;
> SET SHOWPLAN_ALL OFF;
> ```
>
> 或者直接在SSMS中选择“包括实际执行计划”，在查询执行后可以查看详细的执行计划。
>
> 执行计划会显示SQL Server如何执行该查询，是否进行了全表扫描、索引扫描，或者存在其他性能问题。通过分析执行计划，可以确定是否需要对查询或索引进行优化。
>
> ### 6. 索引优化
>
> 在分析执行计划后，如果发现查询没有使用适当的索引，可以创建索引来提高查询性能。例如，如果某个查询在 `column_name`字段上执行频繁的过滤或排序操作，可以为其创建索引：
>
> ```sql
> CREATE INDEX idx_column_name ON table_name(column_name);
> ```
>
> 创建索引后，可以再次执行查询并查看执行计划，确认索引已被有效利用。
>
> ### 7. 使用 `sys.dm_exec_query_stats`分析高频查询
>
> `sys.dm_exec_query_stats`是SQL Server的动态管理视图，可以用来分析高频率和高CPU使用率的查询。
>
> 使用以下查询分析高CPU使用率的查询：
>
> ```sql
> SELECT 
>     TOP 10
>     qs.sql_handle,
>     qs.execution_count,
>     qs.total_worker_time AS CPUTime,
>     qs.total_elapsed_time AS TotalTime,
>     qs.total_logical_reads AS Reads,
>     qs.total_logical_writes AS Writes,
>     SUBSTRING(qt.text, (qs.statement_start_offset/2)+1,
>     ((CASE qs.statement_end_offset
>         WHEN -1 THEN DATALENGTH(qt.text)
>         ELSE qs.statement_end_offset
>         END - qs.statement_start_offset)/2)+1) AS QueryText
> FROM 
>     sys.dm_exec_query_stats qs
> CROSS APPLY 
>     sys.dm_exec_sql_text(qs.sql_handle) qt
> ORDER BY 
>     qs.total_worker_time DESC;
> ```
>
> 此查询会列出执行次数最多的SQL语句及其CPU使用情况，帮助你找到性能瓶颈。
>
> ### 8. 设置数据库的 `Query Store`
>
> SQL Server的 `Query Store`功能可以跟踪SQL查询的性能并自动捕获查询执行计划。启用 `Query Store`后，系统会记录查询的性能数据，便于后续分析和调优。
>
> 启用 `Query Store`：
>
> ```sql
> ALTER DATABASE [YourDatabase]
> SET QUERY_STORE = ON;
> ```
>
> 之后你可以通过SQL Server Management Studio的“查询存储”视图查看执行频率高、CPU消耗大的查询。
>
> ### 9. 配置和优化
>
> SQL Server中的一些配置参数也可能影响CPU的使用情况。以下是一些常见的优化方法：
>
> - **max degree of parallelism (MAXDOP)**：限制查询使用的并行度，以避免单个查询消耗过多CPU资源。可以通过以下命令设置：
>
> ```sql
> EXEC sp_configure 'max degree of parallelism', 4;  -- 例如设置为4
> RECONFIGURE;
> ```
>
> - **cost threshold for parallelism**：调整并行查询的代价阈值，使得只有代价较高的查询才使用并行处理。
>
> ```sql
> EXEC sp_configure 'cost threshold for parallelism', 50;  -- 例如设置为50
> RECONFIGURE;
> ```
>
> - **index maintenance**：定期进行索引的维护（重建或重组），保证查询能够高效使用索引。
>
> ```sql
> ALTER INDEX ALL ON table_name REBUILD;
> ```
>
> ### 10. 使用自动化维护计划
>
> 定期执行索引维护、更新统计信息和清理历史数据，可以有效减少CPU消耗。可以通过SQL Server Agent设置自动化维护计划，定期执行这些操作。