# Werum PAS-X MES 系统部署安装手册

适用读者：MES 系统管理员、IT 基础架构工程师、验证工程师
目标：完成 Werum PAS-X MES 系统的标准化部署，从环境准备到系统上线，确保符合 GMP 合规要求。

---

## 1. Werum PAS-X 概述

### 1.1 什么是 PAS-X
Werum PAS-X 是全球领先的生物制药 MES（制造执行系统）解决方案，专为 GMP 环境设计：
- **电子批记录（EBR）**：无纸化生产记录
- **工艺管理**：配方管理、工艺参数控制
- **物料管理**：物料追踪、称量管理
- **设备集成**：与生产设备、SCADA、DCS 集成
- **合规性**：符合 FDA 21 CFR Part 11、EU Annex 11、GAMP 5

### 1.2 系统架构
```plaintext
┌─────────────────────────────────────────────────────────┐
│                    用户层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 操作员   │  │ 质量人员 │  │ 管理员   │              │
│  │ (车间)   │  │ (QA)     │  │ (IT)     │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
┌───────▼─────────────▼─────────────▼────────────────────┐
│              应用层（PAS-X Server）                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PAS-X Application Server (Tomcat/JBoss)        │  │
│  │  - Recipe Management（配方管理）                  │  │
│  │  - Batch Execution（批次执行）                    │  │
│  │  - Material Management（物料管理）                │  │
│  │  - Equipment Integration（设备集成）              │  │
│  │  - Reporting & Analytics（报表分析）              │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│              数据层（Database Server）                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Oracle Database 19c / SQL Server 2019          │  │
│  │  - 配方数据                                       │  │
│  │  - 批次数据                                       │  │
│  │  - 审计追踪                                       │  │
│  │  - 用户权限                                       │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│              集成层（Integration Layer）                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ SCADA    │  │ DCS      │  │ LIMS     │              │
│  │ (Siemens)│  │ (Emerson)│  │ (LabWare)│              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

### 1.3 部署模式
| 模式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **单服务器** | 测试/验证环境 | 简单、成本低 | 性能有限、无冗余 |
| **双服务器** | 小型生产环境（<50 用户） | 应用/数据库分离 | 单点故障风险 |
| **集群部署** | 大型生产环境（>50 用户） | 高可用、高性能 | 复杂、成本高 |

---

## 2. 环境准备

### 2.1 硬件要求

#### 应用服务器（PAS-X Server）
| 组件 | 最低配置 | 推荐配置（生产环境） |
|------|---------|---------------------|
| CPU | 4 核 | 8 核（Intel Xeon） |
| 内存 | 16GB | 32GB |
| 磁盘 | 500GB | 1TB SSD（RAID 10） |
| 网络 | 1Gbps | 1Gbps（双网卡） |

#### 数据库服务器（Oracle/SQL Server）
| 组件 | 最低配置 | 推荐配置（生产环境） |
|------|---------|---------------------|
| CPU | 8 核 | 16 核（Intel Xeon） |
| 内存 | 32GB | 64GB |
| 磁盘 | 1TB | 2TB SSD（RAID 10） |
| 网络 | 1Gbps | 10Gbps（双网卡） |

### 2.2 软件要求

#### 操作系统
```plaintext
支持的操作系统：
- Windows Server 2019 Standard/Datacenter
- Windows Server 2022 Standard/Datacenter
- Red Hat Enterprise Linux 8.x（可选）

推荐：Windows Server 2019 Datacenter
```

#### 数据库
```plaintext
支持的数据库：
- Oracle Database 19c Enterprise Edition
- Microsoft SQL Server 2019 Enterprise Edition

推荐：Oracle Database 19c（更好的性能和稳定性）
```

#### 应用服务器
```plaintext
支持的应用服务器：
- Apache Tomcat 9.x
- Red Hat JBoss EAP 7.x

推荐：Apache Tomcat 9.0.x（官方推荐）
```

#### Java 运行环境
```plaintext
要求：
- Oracle JDK 11 或 OpenJDK 11
- 64-bit 版本

推荐：Oracle JDK 11.0.x
```

### 2.3 网络规划
```plaintext
服务器配置：
┌─────────────────────────────────────────────────┐
│ PAS-X 应用服务器                                 │
│ - 主机名：PASX-APP01                             │
│ - IP 地址：10.10.50.20                          │
│ - 子网掩码：255.255.255.0                        │
│ - 网关：10.10.50.1                              │
│ - DNS：10.10.40.10, 10.10.40.11                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Oracle 数据库服务器                              │
│ - 主机名：PASX-DB01                              │
│ - IP 地址：10.10.50.21                          │
│ - 子网掩码：255.255.255.0                        │
│ - 网关：10.10.50.1                              │
│ - DNS：10.10.40.10, 10.10.40.11                 │
└─────────────────────────────────────────────────┘

端口规划：
- PAS-X Web 访问：8080（HTTP）、8443（HTTPS）
- Oracle 数据库：1521
- Oracle EM：5500
- Tomcat 管理：8005（Shutdown）、8009（AJP）
```

### 2.4 域账号准备
```powershell
# 在域控上创建服务账号

# PAS-X 应用服务账号
New-ADUser `
    -Name "svc_pasx_app" `
    -SamAccountName "svc_pasx_app" `
    -UserPrincipalName "svc_pasx_app@pharma.local" `
    -Path "OU=Service Accounts,OU=Shanghai,DC=pharma,DC=local" `
    -AccountPassword (ConvertTo-SecureString "ComplexP@ssw0rd!" -AsPlainText -Force) `
    -Enabled $true `
    -PasswordNeverExpires $true `
    -CannotChangePassword $true

# Oracle 数据库服务账号
New-ADUser `
    -Name "svc_oracle" `
    -SamAccountName "svc_oracle" `
    -UserPrincipalName "svc_oracle@pharma.local" `
    -Path "OU=Service Accounts,OU=Shanghai,DC=pharma,DC=local" `
    -AccountPassword (ConvertTo-SecureString "ComplexP@ssw0rd!" -AsPlainText -Force) `
    -Enabled $true `
    -PasswordNeverExpires $true `
    -CannotChangePassword $true

# 将服务账号添加到本地管理员组（在应用服务器上执行）
Add-LocalGroupMember -Group "Administrators" -Member "PHARMA\svc_pasx_app"
```

---

## 3. 安装 Oracle 数据库

### 3.1 安装 Oracle 19c
```powershell
# 在 PASX-DB01 上执行

# 1. 解压安装文件
Expand-Archive -Path "C:\Install\WINDOWS.X64_193000_db_home.zip" -DestinationPath "C:\Oracle\product\19.0.0\dbhome_1"

# 2. 运行安装程序
cd C:\Oracle\product\19.0.0\dbhome_1
.\setup.exe

# 安装选项：
# - 安装类型：服务器类
# - 数据库版本：Enterprise Edition
# - 安装位置：C:\Oracle\product\19.0.0\dbhome_1
# - 数据库配置：创建并配置数据库
# - 全局数据库名：PASXDB
# - SID：PASXDB
# - 字符集：AL32UTF8
# - 内存：自动（或手动设置 16GB）
# - 管理员密码：设置 SYS/SYSTEM 密码
```

### 3.2 创建 PAS-X 数据库用户
```sql
-- 使用 SQL*Plus 连接到数据库
sqlplus / as sysdba

-- 创建表空间
CREATE TABLESPACE PASX_DATA
DATAFILE 'C:\Oracle\oradata\PASXDB\pasx_data01.dbf' SIZE 10G
AUTOEXTEND ON NEXT 1G MAXSIZE 50G
EXTENT MANAGEMENT LOCAL
SEGMENT SPACE MANAGEMENT AUTO;

CREATE TABLESPACE PASX_INDEX
DATAFILE 'C:\Oracle\oradata\PASXDB\pasx_index01.dbf' SIZE 5G
AUTOEXTEND ON NEXT 1G MAXSIZE 20G
EXTENT MANAGEMENT LOCAL
SEGMENT SPACE MANAGEMENT AUTO;

-- 创建用户
CREATE USER pasx_owner IDENTIFIED BY "PasxOwner@2025"
DEFAULT TABLESPACE PASX_DATA
TEMPORARY TABLESPACE TEMP
QUOTA UNLIMITED ON PASX_DATA
QUOTA UNLIMITED ON PASX_INDEX;

-- 授予权限
GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE SYNONYM TO pasx_owner;
GRANT CREATE SESSION TO pasx_owner;
GRANT CREATE TABLE TO pasx_owner;
GRANT CREATE SEQUENCE TO pasx_owner;
GRANT CREATE TRIGGER TO pasx_owner;
GRANT CREATE PROCEDURE TO pasx_owner;

-- 验证用户
SELECT username, default_tablespace, temporary_tablespace 
FROM dba_users 
WHERE username = 'PASX_OWNER';
```

### 3.3 配置 Oracle 监听器
```bash
# 编辑 listener.ora
# 文件位置：C:\Oracle\product\19.0.0\dbhome_1\network\admin\listener.ora

LISTENER =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = PASX-DB01)(PORT = 1521))
    )
  )

SID_LIST_LISTENER =
  (SID_LIST =
    (SID_DESC =
      (GLOBAL_DBNAME = PASXDB)
      (ORACLE_HOME = C:\Oracle\product\19.0.0\dbhome_1)
      (SID_NAME = PASXDB)
    )
  )

# 重启监听器
lsnrctl stop
lsnrctl start
lsnrctl status
```

### 3.4 配置 TNS
```bash
# 编辑 tnsnames.ora
# 文件位置：C:\Oracle\product\19.0.0\dbhome_1\network\admin\tnsnames.ora

PASXDB =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = PASX-DB01)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = PASXDB)
    )
  )

# 测试连接
tnsping PASXDB
sqlplus pasx_owner/PasxOwner@2025@PASXDB
```

---

## 4. 安装 Java 和 Tomcat

### 4.1 安装 Oracle JDK 11
```powershell
# 在 PASX-APP01 上执行

# 1. 下载 Oracle JDK 11
# https://www.oracle.com/java/technologies/javase/jdk11-archive-downloads.html

# 2. 安装 JDK
Start-Process -FilePath "C:\Install\jdk-11.0.20_windows-x64_bin.exe" -ArgumentList "/s" -Wait

# 3. 设置环境变量
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-11.0.20", "Machine")
$path = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
[System.Environment]::SetEnvironmentVariable("Path", "$path;C:\Program Files\Java\jdk-11.0.20\bin", "Machine")

# 4. 验证安装
java -version
# 输出：java version "11.0.20" 2023-07-18 LTS
```

### 4.2 安装 Apache Tomcat 9
```powershell
# 1. 下载 Tomcat 9
# https://tomcat.apache.org/download-90.cgi
# 下载 64-bit Windows zip

# 2. 解压到安装目录
Expand-Archive -Path "C:\Install\apache-tomcat-9.0.80-windows-x64.zip" -DestinationPath "C:\PAS-X"
Rename-Item -Path "C:\PAS-X\apache-tomcat-9.0.80" -NewName "Tomcat"

# 3. 配置 Tomcat 环境变量
[System.Environment]::SetEnvironmentVariable("CATALINA_HOME", "C:\PAS-X\Tomcat", "Machine")
[System.Environment]::SetEnvironmentVariable("CATALINA_BASE", "C:\PAS-X\Tomcat", "Machine")

# 4. 配置 JVM 参数
# 编辑 C:\PAS-X\Tomcat\bin\setenv.bat（新建文件）
@echo off
set "JAVA_OPTS=-Xms4096m -Xmx8192m -XX:MetaspaceSize=512m -XX:MaxMetaspaceSize=1024m"
set "JAVA_OPTS=%JAVA_OPTS% -Djava.awt.headless=true"
set "JAVA_OPTS=%JAVA_OPTS% -Dfile.encoding=UTF-8"
set "JAVA_OPTS=%JAVA_OPTS% -Duser.timezone=Asia/Shanghai"

# 5. 安装 Tomcat 服务
cd C:\PAS-X\Tomcat\bin
.\service.bat install Tomcat9

# 6. 配置服务
# 打开 services.msc
# 找到 "Apache Tomcat 9.0 Tomcat9"
# 属性 > 登录 > 使用此账户：PHARMA\svc_pasx_app
# 启动类型：自动
```

### 4.3 配置 Tomcat
```xml
<!-- 编辑 C:\PAS-X\Tomcat\conf\server.xml -->

<!-- 修改 Connector 端口（可选） -->
<Connector port="8080" protocol="HTTP/1.1"
           connectionTimeout="20000"
           redirectPort="8443"
           maxThreads="200"
           minSpareThreads="10"
           enableLookups="false"
           acceptCount="100"
           URIEncoding="UTF-8" />

<!-- 添加 HTTPS Connector（生产环境必须） -->
<Connector port="8443" protocol="org.apache.coyote.http11.Http11NioProtocol"
           maxThreads="200" SSLEnabled="true"
           scheme="https" secure="true" clientAuth="false"
           sslProtocol="TLS"
           keystoreFile="C:/PAS-X/Tomcat/conf/pasx.jks"
           keystorePass="changeit" />
```

---

## 5. 安装 PAS-X 应用

### 5.1 准备安装文件
```powershell
# 1. 从 Werum 获取安装包
# - PAS-X_7.x_Installation.zip
# - PAS-X_7.x_Database_Scripts.zip
# - PAS-X_7.x_License.xml

# 2. 解压到临时目录
Expand-Archive -Path "C:\Install\PAS-X_7.x_Installation.zip" -DestinationPath "C:\Install\PAS-X"
```

### 5.2 运行数据库脚本
```sql
-- 使用 SQL*Plus 连接
sqlplus pasx_owner/PasxOwner@2025@PASXDB

-- 运行安装脚本
@C:\Install\PAS-X\Database\01_create_tables.sql
@C:\Install\PAS-X\Database\02_create_indexes.sql
@C:\Install\PAS-X\Database\03_create_sequences.sql
@C:\Install\PAS-X\Database\04_create_views.sql
@C:\Install\PAS-X\Database\05_insert_base_data.sql

-- 验证安装
SELECT table_name FROM user_tables ORDER BY table_name;
-- 应显示 PAS-X 核心表（约 200+ 张表）
```

### 5.3 部署 PAS-X WAR 文件
```powershell
# 1. 复制 WAR 文件到 Tomcat
Copy-Item -Path "C:\Install\PAS-X\Application\pasx.war" -Destination "C:\PAS-X\Tomcat\webapps\"

# 2. 配置数据库连接
# 编辑 C:\PAS-X\Tomcat\conf\context.xml
<Context>
    <Resource name="jdbc/PASXDB"
              auth="Container"
              type="javax.sql.DataSource"
              driverClassName="oracle.jdbc.OracleDriver"
              url="jdbc:oracle:thin:@PASX-DB01:1521:PASXDB"
              username="pasx_owner"
              password="PasxOwner@2025"
              maxTotal="100"
              maxIdle="30"
              maxWaitMillis="10000" />
</Context>

# 3. 复制 Oracle JDBC 驱动
Copy-Item -Path "C:\Install\ojdbc8.jar" -Destination "C:\PAS-X\Tomcat\lib\"

# 4. 配置 PAS-X 许可证
New-Item -Path "C:\PAS-X\Config" -ItemType Directory
Copy-Item -Path "C:\Install\PAS-X_License.xml" -Destination "C:\PAS-X\Config\license.xml"

# 5. 设置环境变量（PAS-X 配置路径）
[System.Environment]::SetEnvironmentVariable("PASX_CONFIG_DIR", "C:\PAS-X\Config", "Machine")
```

### 5.4 启动 Tomcat
```powershell
# 启动 Tomcat 服务
Start-Service Tomcat9

# 查看日志
Get-Content -Path "C:\PAS-X\Tomcat\logs\catalina.$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50 -Wait

# 等待应用部署完成（约 2-5 分钟）
# 日志中应显示：
# INFO: Deployment of web application archive [C:\PAS-X\Tomcat\webapps\pasx.war] has finished in [xxx] ms
```

---

## 6. 初始配置

### 6.1 首次登录
```plaintext
访问 PAS-X：
- URL：http://PASX-APP01:8080/pasx
- 或：https://PASX-APP01:8443/pasx（HTTPS）

默认管理员账号：
- 用户名：admin
- 密码：admin（首次登录后必须更改）

首次登录步骤：
1. 输入用户名和密码
2. 系统提示更改密码
3. 设置新密码（符合密码策略）
4. 进入系统主界面
```

### 6.2 配置系统参数
```plaintext
导航：Administration > System Configuration

关键参数：
1. 时区设置：Asia/Shanghai
2. 语言设置：中文（简体）/ English
3. 日期格式：yyyy-MM-dd
4. 时间格式：HH:mm:ss
5. 审计日志保留期：7 年（符合 GMP 要求）
6. 密码策略：
   - 最小长度：8 位
   - 复杂度：大小写字母 + 数字 + 特殊字符
   - 有效期：90 天
   - 历史密码：不能重复最近 5 次
```

### 6.3 创建用户和角色
```plaintext
导航：Administration > User Management

创建角色：
1. 操作员（Operator）
   - 权限：执行批次、查看配方、记录数据
2. 质量人员（QA）
   - 权限：审核批次、查看报表、电子签名
3. 工艺工程师（Process Engineer）
   - 权限：创建/修改配方、配置工艺参数
4. 系统管理员（System Admin）
   - 权限：系统配置、用户管理、审计日志

创建用户：
1. 用户名：zhang.san
2. 姓名：张三
3. 邮箱：zhang.san@pharma.com
4. 角色：操作员
5. 部门：生产部
6. 启用电子签名：是
```

### 6.4 配置电子签名
```plaintext
导航：Administration > Electronic Signature

配置项：
1. 启用电子签名：是
2. 签名类型：用户名 + 密码
3. 签名原因：必填
4. 签名时间戳：自动记录
5. 审计追踪：所有签名操作记录到审计日志

符合 21 CFR Part 11 要求：
- 唯一性：每个用户唯一的用户名和密码
- 不可否认性：签名与用户绑定，不可转让
- 完整性：签名数据加密存储
- 审计追踪：所有签名操作可追溯
```

---

## 7. 集成配置

### 7.1 与 LIMS 集成
```xml
<!-- 配置文件：C:\PAS-X\Config\integration\lims.xml -->
<integration>
    <system>
        <name>LabWare LIMS</name>
        <type>LIMS</type>
        <protocol>REST</protocol>
        <endpoint>https://lims.pharma.local/api</endpoint>
        <authentication>
            <type>OAuth2</type>
            <clientId>pasx_client</clientId>
            <clientSecret>encrypted_secret</clientSecret>
        </authentication>
    </system>
    <mapping>
        <field source="batch_number" target="sample_id" />
        <field source="product_code" target="material_code" />
    </mapping>
</integration>
```

### 7.2 与 SCADA/DCS 集成
```plaintext
支持的协议：
- OPC UA（推荐）
- OPC DA
- Modbus TCP
- Profinet

配置步骤：
1. 安装 OPC UA 客户端组件
2. 配置 OPC UA 服务器地址
3. 映射设备标签到 PAS-X 参数
4. 配置数据采集频率
5. 测试连接和数据读取
```

---

## 8. 验证与测试

### 8.1 安装确认（IQ）
```plaintext
验证项目：
□ 硬件配置符合规格
□ 操作系统版本正确
□ 数据库版本正确
□ Java 版本正确
□ Tomcat 版本正确
□ PAS-X 版本正确
□ 许可证有效
□ 网络连接正常
□ 防火墙规则配置
□ 备份策略配置
```

### 8.2 运行确认（OQ）
```plaintext
验证项目：
□ 用户登录/登出
□ 密码修改
□ 角色权限验证
□ 配方创建/修改
□ 批次执行
□ 电子签名
□ 审计追踪
□ 报表生成
□ 数据库连接
□ 集成接口测试
```

### 8.3 性能确认（PQ）
```plaintext
验证项目：
□ 并发用户测试（50 用户）
□ 批次执行性能
□ 报表生成速度
□ 数据库查询性能
□ 系统响应时间 < 3 秒
□ 数据备份/恢复
□ 故障切换测试
```

---

## 9. 备份与恢复

### 9.1 数据库备份
```sql
-- 使用 RMAN 备份 Oracle 数据库
RMAN> BACKUP DATABASE PLUS ARCHIVELOG;

-- 或使用 Data Pump 导出
expdp pasx_owner/PasxOwner@2025@PASXDB \
  directory=BACKUP_DIR \
  dumpfile=pasx_backup_%U.dmp \
  logfile=pasx_backup.log \
  full=y \
  compression=all
```

### 9.2 应用备份
```powershell
# 备份 Tomcat 配置和应用
$backupPath = "E:\Backup\PAS-X\$(Get-Date -Format 'yyyyMMdd')"
New-Item -Path $backupPath -ItemType Directory

# 备份 Tomcat
Copy-Item -Path "C:\PAS-X\Tomcat\conf" -Destination "$backupPath\Tomcat_conf" -Recurse
Copy-Item -Path "C:\PAS-X\Tomcat\webapps\pasx" -Destination "$backupPath\pasx_app" -Recurse

# 备份配置文件
Copy-Item -Path "C:\PAS-X\Config" -Destination "$backupPath\Config" -Recurse
```

---

## 10. 最佳实践

1. **环境隔离**：开发、测试、生产环境严格分离
2. **变更管理**：所有配置变更需经过审批和验证
3. **定期备份**：每天备份数据库，每周备份应用
4. **监控告警**：监控系统性能、数据库连接、磁盘空间
5. **补丁管理**：定期安装 PAS-X 补丁和安全更新
6. **审计日志**：定期审查审计日志，保留 7 年
7. **灾难恢复**：制定 DR 计划，定期演练
8. **文档化**：记录所有配置、变更、故障处理
9. **培训**：培训管理员和用户正确使用系统
10. **合规性**：确保符合 GMP、21 CFR Part 11、Annex 11

---

**参考资源**：
- Werum PAS-X 官方文档
- GAMP 5 指南
- FDA 21 CFR Part 11
- EU GMP Annex 11

