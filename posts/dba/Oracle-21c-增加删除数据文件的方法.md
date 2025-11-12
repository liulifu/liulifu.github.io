# Oracle 21c 增加删除数据文件的方法

本文总结 Oracle 21c 在小文件（Smallfile）与大文件（Bigfile）表空间下的数据文件/临时文件增删、移动与调整大小的规范做法与风控要点。

前提与注意：
- 权限：需 SYSDBA 或具备 ALTER DATABASE / ALTER TABLESPACE 权限
- CDB/PDB：在目标 PDB 内操作其本地表空间与数据文件；CDB$ROOT 仅管理 CDB 级文件
- OMF（Oracle Managed Files）：启用后可省略文件全路径，由数据库自动放置
- ASM 与 RAC：数据文件路径为 +DATA/+FRA 等磁盘组；确保所有实例均可见

---

## 1. 增加数据文件（持久表空间）
```sql
-- 情形 A：手工文件路径（文件系统）
ALTER TABLESPACE users ADD DATAFILE '/u01/oradata/ORCL/users02.dbf' SIZE 1G AUTOEXTEND ON NEXT 100M MAXSIZE 30G;

-- 情形 B：启用 OMF（推荐生产）
ALTER SYSTEM SET db_create_file_dest = '/u01/oradata/ORCL' SCOPE=BOTH;
ALTER TABLESPACE users ADD DATAFILE SIZE 1G AUTOEXTEND ON NEXT 128M;

-- ASM
ALTER TABLESPACE users ADD DATAFILE '+DATA' SIZE 1G AUTOEXTEND ON;
```

校验：
```sql
SELECT file_id, file_name, bytes/1024/1024 AS mb, autoextensible
FROM   dba_data_files
WHERE  tablespace_name = 'USERS'
ORDER  BY file_id;
```

---

## 2. 增加临时文件（临时表空间 TEMP）
```sql
-- 新增 tempfile（可多文件并行分摊 I/O）
ALTER TABLESPACE temp ADD TEMPFILE '/u01/oradata/ORCL/temp02.dbf' SIZE 8G AUTOEXTEND ON NEXT 1G;

-- OMF/ASM 场景
ALTER TABLESPACE temp ADD TEMPFILE SIZE 8G;        -- OMF
ALTER TABLESPACE temp ADD TEMPFILE '+DATA' SIZE 8G; -- ASM
```

校验：
```sql
SELECT file_id, file_name, bytes/1024/1024 AS mb
FROM   dba_temp_files
ORDER  BY file_id;
```

---

## 3. 调整大小与扩展策略
```sql
-- 关闭/开启自增长
ALTER DATABASE DATAFILE '/u01/oradata/ORCL/users01.dbf' AUTOEXTEND OFF;
ALTER DATABASE DATAFILE '/u01/oradata/ORCL/users01.dbf' AUTOEXTEND ON NEXT 128M MAXSIZE UNLIMITED;

-- 直接调整大小（收缩需确保高水位线之下无段/区）
ALTER DATABASE DATAFILE '/u01/oradata/ORCL/users01.dbf' RESIZE 10G;

-- 临时文件调整大小
ALTER DATABASE TEMPFILE '/u01/oradata/ORCL/temp01.dbf' RESIZE 16G;
```

辅助检查：
```sql
-- 表空间剩余与碎片概览（Smallfile）
SELECT df.tablespace_name,
       ROUND(SUM(df.bytes)/1024/1024) AS total_mb,
       ROUND(SUM(fs.bytes)/1024/1024) AS free_mb,
       ROUND((SUM(df.bytes)-SUM(fs.bytes))*100/NULLIF(SUM(df.bytes),0),2) AS used_pct
FROM   dba_data_files df
LEFT JOIN (SELECT tablespace_name, SUM(bytes) bytes FROM dba_free_space GROUP BY tablespace_name) fs
       ON df.tablespace_name = fs.tablespace_name
GROUP  BY df.tablespace_name
ORDER  BY used_pct DESC;
```

---

## 4. 在线移动数据文件（不下线对象，12c+，21c 推荐）
```sql
-- 文件系统到新路径
ALTER DATABASE MOVE DATAFILE '/u01/oradata/ORCL/users01.dbf' TO '/u02/oradata/ORCL/users01.dbf';

-- ASM 磁盘组间移动
ALTER DATABASE MOVE DATAFILE '+DATA/ORCL/DATAFILE/users01.256.11111111' TO '+DATA2';

-- 可选：KEEP/REUSE 选项（按需要保留旧文件或重用目标文件）
```

校验：
```sql
SELECT file_name FROM dba_data_files WHERE file_id = 1;  -- 确认路径已更新
```

---

## 5. 删除数据文件（仅空文件、小文件表空间适用）
注意：
- SYSTEM/SYSAUX/UNDO/临时表空间不可如此删除
- 仅当文件无任何段（dba_extents 中无记录）且非包含段头/位图等关键元数据时可删除

步骤：
```sql
-- 1) 确认文件为空
SELECT COUNT(*) AS extents
FROM   dba_extents
WHERE  file_id = :FILE_ID;    -- 应为 0

-- 2) 设置表空间只读（有助于稳定性，可选）
ALTER TABLESPACE users READ ONLY;   -- 可选

-- 3) 删除数据文件（Smallfile 表空间）
ALTER TABLESPACE users DROP DATAFILE '/u01/oradata/ORCL/users02.dbf';

-- 4) 恢复读写
ALTER TABLESPACE users READ WRITE;  -- 可选
```

临时文件删除：
```sql
ALTER TABLESPACE temp DROP TEMPFILE '/u01/oradata/ORCL/temp02.dbf';
-- 或：ALTER DATABASE TEMPFILE '/u01/oradata/ORCL/temp02.dbf' DROP;
```

---

## 6. 常见问题与风控
- 无法 RESIZE：高水位线限制。迁移/重组至新文件，再 DROP 旧文件可行
- DROP DATAFILE 报错：文件非空或包含段头。可新建表空间迁移对象（ALTER TABLE ... MOVE / SHRINK / ONLINE MOVE）
- OMF 环境路径管理：优先设置 db_create_file_dest / db_create_online_log_dest_n
- RAC/ASM：确保目标路径/磁盘组对所有实例可见；在线移动期间避免 DDL
- 备份：任何文件级操作前后务必 RMAN 备份与交叉校验

---

## 7. 典型变更模板（建议）
```sql
-- A) 紧急扩容（OMF）
ALTER SYSTEM SET db_create_file_dest = '+DATA' SCOPE=BOTH;
ALTER TABLESPACE APP_DATA ADD DATAFILE SIZE 8G AUTOEXTEND ON NEXT 1G MAXSIZE 128G;

-- B) 迁移至新存储（在线移动）
ALTER DATABASE MOVE DATAFILE '+DATA/ORCL/DATAFILE/app_data01.256.111' TO '+DATA2';

-- C) 临时表空间扩容
ALTER TABLESPACE TEMP ADD TEMPFILE SIZE 32G;
```

> 提示：生产环境建议将上述步骤沉淀为标准变更脚本，并纳入审批/回滚预案（含校验 SQL 与监控）。
