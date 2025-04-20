# Oracle SQL*Loader使用指南：将CSV文件导入Oracle数据库

## 目录
1. SQL*Loader简介
2. 安装SQL*Loader
3. 准备工作
4. 创建目标表
5. 创建控制文件
6. 准备数据文件
7. 执行数据导入
8. 日志文件分析
9. 常见问题处理
10. 最佳实践

## 1. SQL*Loader简介
SQL*Loader是Oracle提供的一个强大的数据导入工具，可以将各种格式的外部文件（包括CSV）高效地导入到Oracle数据库中。

## 2. 安装SQL*Loader
SQL*Loader通常随Oracle数据库客户端或服务器一起安装。

1. 下载Oracle客户端：
   - 访问Oracle官网下载对应版本的客户端软件
   - 选择适合您操作系统的版本

2. 安装步骤：
```bash
# Windows环境下安装
setup.exe /silent

# Linux环境下安装
./runInstaller -silent -responseFile /path/to/response/file
```

3. 验证安装：
```bash
sqlldr -help
```

## 3. 准备工作
在开始导入之前，需要准备以下内容：
- CSV数据文件
- 目标表结构
- 控制文件
- 足够的存储空间
- 适当的权限

确保Oracle环境变量已正确设置：
```bash
# Windows
set ORACLE_HOME=C:\app\oracle\product\19c\client_1
set PATH=%ORACLE_HOME%\bin;%PATH%

# Linux/Unix
export ORACLE_HOME=/u01/app/oracle/product/19c/db_1
export PATH=$ORACLE_HOME/bin:$PATH
```

## 4. 创建目标表
以下是一个示例表创建语句：

```sql
CREATE TABLE EMPLOYEES (
    EMP_ID NUMBER(6) PRIMARY KEY,
    FIRST_NAME VARCHAR2(50),
    LAST_NAME VARCHAR2(50),
    EMAIL VARCHAR2(100),
    HIRE_DATE DATE,
    SALARY NUMBER(10,2)
);
```

## 5. 创建控制文件
控制文件（如employee.ctl）定义了如何将CSV数据映射到数据库表：

```sql
LOAD DATA
INFILE 'employees.csv'
INTO TABLE EMPLOYEES
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
TRAILING NULLCOLS
(
    EMP_ID,
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    HIRE_DATE DATE "YYYY-MM-DD",
    SALARY
)
```

## 6. 准备数据文件
确保CSV文件格式正确，例如（employees.csv）：
```csv
101,John,Doe,john.doe@email.com,2023-01-15,75000
102,Jane,Smith,jane.smith@email.com,2023-02-01,80000
```

## 7. 执行数据导入
使用SQL*Loader命令行执行导入：

```bash
# 基本语法
sqlldr userid=username/password@database control=employee.ctl log=employee.log bad=employee.bad

# 带有额外参数的完整示例
sqlldr userid=hr/hr@ORCL \
control=employee.ctl \
log=employee.log \
bad=employee.bad \
discard=employee.dsc \
direct=true \
parallel=true \
errors=50
```

重要参数说明：
- userid: 数据库连接信息
- control: 控制文件路径
- log: 日志文件路径
- bad: 错误数据文件路径
- discard: 被丢弃的记录文件路径
- direct: 直接路径加载
- parallel: 并行加载
- errors: 允许的错误记录数

## 8. 日志文件分析
导入完成后，检查日志文件了解导入结果：

```bash
# 查看日志文件
cat employee.log

# 常见日志内容分析：
Total logical records skipped: 0
Total logical records read: 1000
Total logical records rejected: 0
Total logical records discarded: 0
```

## 9. 常见问题处理

### 数据格式问题
如果日期格式不匹配：
```sql
-- 在控制文件中指定正确的日期格式
HIRE_DATE DATE "YYYY-MM-DD HH24:MI:SS"
```

### 字符集问题
处理不同字符集：
```bash
# 在命令行中指定字符集
sqlldr userid=hr/hr@ORCL control=employee.ctl charset=AL32UTF8
```

### 性能优化
提升加载性能：
```bash
# 使用直接路径加载
sqlldr userid=hr/hr@ORCL control=employee.ctl direct=true

# 禁用索引
ALTER TABLE EMPLOYEES DROP INDEX emp_idx;
# 导入后重建索引
ALTER INDEX emp_idx REBUILD;
```

## 10. 最佳实践

1. 数据准备
   - 清理CSV文件中的特殊字符
   - 确保日期格式一致
   - 验证数字格式

2. 控制文件配置
```sql
LOAD DATA
CHARACTERSET AL32UTF8
INFILE 'employees.csv'
BADFILE 'employees.bad'
DISCARDFILE 'employees.dsc'
TRUNCATE
INTO TABLE EMPLOYEES
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
TRAILING NULLCOLS
(
    EMP_ID    "TRIM(:EMP_ID)",
    FIRST_NAME    "UPPER(TRIM(:FIRST_NAME))",
    LAST_NAME     "UPPER(TRIM(:LAST_NAME))",
    EMAIL         "LOWER(TRIM(:EMAIL))",
    HIRE_DATE,
    SALARY        "TO_NUMBER(TRIM(:SALARY),'999999.99')"
)
```

3. 监控脚本
创建监控脚本（monitor.sh）：
```bash
#!/bin/bash
LOG_FILE="employee.log"
THRESHOLD=1000

# 监控导入进度
while true; do
    LOADED_ROWS=$(grep "Total logical records read:" $LOG_FILE | tail -1 | awk '{print $5}')
    echo "已导入记录数: $LOADED_ROWS"
    sleep 10
done
```

4. 导入后验证
```sql
-- 验证记录数
SELECT COUNT(*) FROM EMPLOYEES;

-- 检查数据完整性
SELECT COUNT(*) 
FROM EMPLOYEES 
WHERE EMP_ID IS NULL 
   OR FIRST_NAME IS NULL 
   OR LAST_NAME IS NULL;

-- 检查日期格式
SELECT DISTINCT TO_CHAR(HIRE_DATE, 'YYYY-MM-DD') 
FROM EMPLOYEES 
ORDER BY 1;
```

