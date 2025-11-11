# Werum PAS-X MES 系统日常运维手册

适用读者：MES 系统管理员、IT 运维工程师、应用支持工程师
目标：掌握 PAS-X MES 系统的日常运维操作，包括监控、备份、故障处理、性能优化，确保系统稳定运行。

---

## 1. 日常运维概述

### 1.1 运维职责
```plaintext
系统管理员职责：
□ 监控系统运行状态
□ 执行日常备份
□ 处理用户请求（账号、权限）
□ 故障排查与处理
□ 性能监控与优化
□ 补丁和更新管理
□ 审计日志审查
□ 文档维护
□ 变更管理
□ 灾难恢复演练
```

### 1.2 运维时间表
| 频率 | 任务 | 时间 |
|------|------|------|
| **每日** | 检查系统状态、备份验证、日志审查 | 09:00 |
| **每周** | 性能报告、磁盘空间检查、补丁检查 | 周一 09:00 |
| **每月** | 审计日志审查、用户权限审查、DR 测试 | 每月第一个周一 |
| **每季度** | 系统健康检查、容量规划、培训 | 每季度第一周 |
| **每年** | 年度审计、系统升级、合规审查 | 每年 Q1 |

---

## 2. 系统监控

### 2.1 监控 Tomcat 服务
```powershell
# 检查 Tomcat 服务状态
Get-Service -Name "Tomcat9"

# 输出示例：
# Status   Name               DisplayName
# ------   ----               -----------
# Running  Tomcat9            Apache Tomcat 9.0 Tomcat9

# 如果服务停止，启动服务
if ((Get-Service -Name "Tomcat9").Status -ne "Running") {
    Start-Service -Name "Tomcat9"
    Write-Host "Tomcat service started" -ForegroundColor Green
}

# 检查 Tomcat 进程
Get-Process -Name "tomcat*" | Select-Object Name, Id, CPU, WorkingSet

# 检查 Tomcat 端口
Test-NetConnection -ComputerName localhost -Port 8080
Test-NetConnection -ComputerName localhost -Port 8443
```

### 2.2 监控数据库连接
```sql
-- 连接到 Oracle 数据库
sqlplus pasx_owner/PasxOwner@2025@PASXDB

-- 检查数据库状态
SELECT status FROM v$instance;
-- 输出：OPEN

-- 检查当前会话数
SELECT COUNT(*) AS session_count FROM v$session WHERE username = 'PASX_OWNER';

-- 检查活动会话
SELECT sid, serial#, username, status, program, machine
FROM v$session
WHERE username = 'PASX_OWNER'
ORDER BY status;

-- 检查锁等待
SELECT s.sid, s.serial#, s.username, s.program, w.event, w.wait_time
FROM v$session s, v$session_wait w
WHERE s.sid = w.sid
AND s.username = 'PASX_OWNER'
AND w.wait_time > 0;

-- 检查表空间使用率
SELECT
    tablespace_name,
    ROUND(used_space * 8192 / 1024 / 1024 / 1024, 2) AS used_gb,
    ROUND(tablespace_size * 8192 / 1024 / 1024 / 1024, 2) AS total_gb,
    ROUND(used_percent, 2) AS used_percent
FROM dba_tablespace_usage_metrics
WHERE tablespace_name IN ('PASX_DATA', 'PASX_INDEX');
```

### 2.3 监控应用日志
```powershell
# 查看 Tomcat 日志
Get-Content -Path "C:\PAS-X\Tomcat\logs\catalina.$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50

# 查找错误日志
Select-String -Path "C:\PAS-X\Tomcat\logs\catalina.*.log" -Pattern "ERROR|SEVERE|Exception" | Select-Object -Last 20

# 查看 PAS-X 应用日志
Get-Content -Path "C:\PAS-X\Logs\pasx.log" -Tail 50 -Wait

# 查找特定错误
Select-String -Path "C:\PAS-X\Logs\pasx.log" -Pattern "OutOfMemoryError|SQLException|NullPointerException"
```

### 2.4 监控系统资源
```powershell
# CPU 使用率
Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 5

# 内存使用率
$os = Get-CimInstance Win32_OperatingSystem
$totalMemory = $os.TotalVisibleMemorySize / 1MB
$freeMemory = $os.FreePhysicalMemory / 1MB
$usedMemory = $totalMemory - $freeMemory
$memoryUsagePercent = [math]::Round(($usedMemory / $totalMemory) * 100, 2)
Write-Host "Memory Usage: $memoryUsagePercent% ($usedMemory GB / $totalMemory GB)"

# 磁盘空间
Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -gt 0} | Select-Object Name, @{Name="UsedGB";Expression={[math]::Round($_.Used/1GB,2)}}, @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}, @{Name="UsedPercent";Expression={[math]::Round(($_.Used/($_.Used+$_.Free))*100,2)}}

# 网络连接
Get-NetTCPConnection -State Established | Where-Object {$_.LocalPort -eq 8080 -or $_.LocalPort -eq 8443} | Measure-Object | Select-Object -ExpandProperty Count
```

### 2.5 监控脚本（自动化）
```powershell
# 保存为：C:\PAS-X\Scripts\Monitor-PASX.ps1

param(
    [string]$EmailTo = "it.admin@pharma.com",
    [string]$SmtpServer = "smtp.pharma.local"
)

$report = @()

# 检查 Tomcat 服务
$tomcatStatus = (Get-Service -Name "Tomcat9").Status
if ($tomcatStatus -ne "Running") {
    $report += "❌ Tomcat service is $tomcatStatus"
    Start-Service -Name "Tomcat9"
} else {
    $report += "✅ Tomcat service is running"
}

# 检查数据库连接
try {
    $conn = New-Object System.Data.OracleClient.OracleConnection("Data Source=PASXDB;User Id=pasx_owner;Password=PasxOwner@2025;")
    $conn.Open()
    $conn.Close()
    $report += "✅ Database connection successful"
} catch {
    $report += "❌ Database connection failed: $($_.Exception.Message)"
}

# 检查磁盘空间
$drives = Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -gt 0}
foreach ($drive in $drives) {
    $usedPercent = [math]::Round(($drive.Used/($drive.Used+$drive.Free))*100, 2)
    if ($usedPercent -gt 90) {
        $report += "⚠️  Drive $($drive.Name): $usedPercent% used (critical)"
    } elseif ($usedPercent -gt 80) {
        $report += "⚠️  Drive $($drive.Name): $usedPercent% used (warning)"
    } else {
        $report += "✅ Drive $($drive.Name): $usedPercent% used"
    }
}

# 检查内存使用
$os = Get-CimInstance Win32_OperatingSystem
$memoryUsagePercent = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 2)
if ($memoryUsagePercent -gt 90) {
    $report += "⚠️  Memory usage: $memoryUsagePercent% (critical)"
} else {
    $report += "✅ Memory usage: $memoryUsagePercent%"
}

# 发送报告
$body = $report -join "`n"
Send-MailMessage -From "pasx-monitor@pharma.com" -To $EmailTo -Subject "PAS-X Daily Health Check - $(Get-Date -Format 'yyyy-MM-dd')" -Body $body -SmtpServer $SmtpServer

# 输出到控制台
Write-Host $body
```

---

## 3. 备份管理

### 3.1 数据库备份
```powershell
# 保存为：C:\PAS-X\Scripts\Backup-Database.ps1

param(
    [string]$BackupPath = "E:\Backup\PAS-X\Database"
)

$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$BackupPath\PASXDB_$date.dmp"
$logFile = "$BackupPath\PASXDB_$date.log"

# 创建备份目录
if (!(Test-Path $BackupPath)) {
    New-Item -Path $BackupPath -ItemType Directory
}

# 使用 Data Pump 导出
$env:ORACLE_HOME = "C:\Oracle\product\19.0.0\dbhome_1"
$env:PATH = "$env:ORACLE_HOME\bin;$env:PATH"

$exportCmd = @"
expdp pasx_owner/PasxOwner@2025@PASXDB \
  directory=BACKUP_DIR \
  dumpfile=$backupFile \
  logfile=$logFile \
  schemas=pasx_owner \
  compression=all \
  parallel=4
"@

Invoke-Expression $exportCmd

# 验证备份
if (Test-Path $backupFile) {
    $fileSize = (Get-Item $backupFile).Length / 1GB
    Write-Host "✅ Backup completed: $backupFile ($([math]::Round($fileSize, 2)) GB)" -ForegroundColor Green

    # 删除 7 天前的备份
    Get-ChildItem -Path $BackupPath -Filter "*.dmp" | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item -Force
} else {
    Write-Host "❌ Backup failed" -ForegroundColor Red
}
```

### 3.2 应用备份
```powershell
# 保存为：C:\PAS-X\Scripts\Backup-Application.ps1

param(
    [string]$BackupPath = "E:\Backup\PAS-X\Application"
)

$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "$BackupPath\$date"

# 创建备份目录
New-Item -Path $backupDir -ItemType Directory

# 停止 Tomcat（可选，热备份可跳过）
# Stop-Service -Name "Tomcat9"

# 备份 Tomcat 配置
Copy-Item -Path "C:\PAS-X\Tomcat\conf" -Destination "$backupDir\Tomcat_conf" -Recurse

# 备份 PAS-X 应用
Copy-Item -Path "C:\PAS-X\Tomcat\webapps\pasx" -Destination "$backupDir\pasx_app" -Recurse

# 备份配置文件
Copy-Item -Path "C:\PAS-X\Config" -Destination "$backupDir\Config" -Recurse

# 备份日志（最近 7 天）
$logs = Get-ChildItem -Path "C:\PAS-X\Logs" | Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-7)}
Copy-Item -Path $logs -Destination "$backupDir\Logs" -Recurse

# 启动 Tomcat
# Start-Service -Name "Tomcat9"

# 压缩备份
Compress-Archive -Path $backupDir -DestinationPath "$backupDir.zip"
Remove-Item -Path $backupDir -Recurse -Force

Write-Host "✅ Application backup completed: $backupDir.zip" -ForegroundColor Green

# 删除 30 天前的备份
Get-ChildItem -Path $BackupPath -Filter "*.zip" | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item -Force
```

### 3.3 定时备份任务
```powershell
# 创建计划任务：每天凌晨 2 点备份数据库
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\PAS-X\Scripts\Backup-Database.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$principal = New-ScheduledTaskPrincipal -UserId "PHARMA\svc_pasx_app" -LogonType Password
Register-ScheduledTask -TaskName "PAS-X Database Backup" -Action $action -Trigger $trigger -Principal $principal -Description "Daily backup of PAS-X database"

# 创建计划任务：每周日凌晨 3 点备份应用
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\PAS-X\Scripts\Backup-Application.ps1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 3:00AM
Register-ScheduledTask -TaskName "PAS-X Application Backup" -Action $action -Trigger $trigger -Principal $principal -Description "Weekly backup of PAS-X application"
```

---

## 4. 用户管理

### 4.1 创建用户
```plaintext
步骤：
1. 登录 PAS-X：https://pasx-app01:8443/pasx
2. 导航：Administration > User Management > Users
3. 点击 "New User"
4. 填写用户信息：
   - Username: li.si
   - First Name: 四
   - Last Name: 李
   - Email: li.si@pharma.com
   - Department: 生产部
   - Initial Password: TempP@ssw0rd!
   - Force Password Change: Yes
5. 分配角色：Operator
6. 启用电子签名：Yes
7. 保存

验证：
- 使用新账号登录
- 系统提示修改密码
- 验证权限是否正确
```

### 4.2 重置密码
```plaintext
步骤：
1. 导航：Administration > User Management > Users
2. 搜索用户：li.si
3. 点击用户名
4. 点击 "Reset Password"
5. 设置临时密码：TempP@ssw0rd!
6. 勾选 "Force Password Change on Next Login"
7. 保存

通知用户：
- 发送邮件通知用户密码已重置
- 提供临时密码
- 提醒首次登录需修改密码
```

### 4.3 禁用/启用用户
```plaintext
禁用用户（离职）：
1. 导航：Administration > User Management > Users
2. 搜索用户
3. 点击用户名
4. 设置 Status: Inactive
5. 保存
6. 记录到变更日志

启用用户（返岗）：
1. 搜索用户
2. 设置 Status: Active
3. 保存
```

### 4.4 审查用户权限
```sql
-- 查询所有用户及其角色
SELECT
    u.username,
    u.first_name || ' ' || u.last_name AS full_name,
    u.email,
    u.department,
    r.role_name,
    u.status,
    u.last_login_date
FROM pasx_users u
LEFT JOIN pasx_user_roles ur ON u.user_id = ur.user_id
LEFT JOIN pasx_roles r ON ur.role_id = r.role_id
ORDER BY u.username;

-- 查询长期未登录的用户（90 天）
SELECT
    username,
    first_name || ' ' || last_name AS full_name,
    last_login_date,
    TRUNC(SYSDATE - last_login_date) AS days_since_login
FROM pasx_users
WHERE last_login_date < SYSDATE - 90
AND status = 'ACTIVE'
ORDER BY last_login_date;
```

---

## 5. 故障处理

### 5.1 Tomcat 无法启动
```plaintext
症状：
- Tomcat 服务启动失败
- 日志显示端口占用或内存不足

排查步骤：
1. 检查端口占用
   netstat -ano | findstr "8080"
   netstat -ano | findstr "8443"

2. 检查 Java 进程
   Get-Process -Name "java"

3. 检查内存
   Get-Counter '\Memory\Available MBytes'

4. 查看 Tomcat 日志
   Get-Content C:\PAS-X\Tomcat\logs\catalina.*.log -Tail 100

解决方案：
- 端口占用：杀死占用进程或修改 Tomcat 端口
- 内存不足：增加 JVM 内存（编辑 setenv.bat）
- 配置错误：检查 server.xml、context.xml
```

### 5.2 数据库连接失败
```plaintext
症状：
- 用户无法登录
- 日志显示 "SQLException: Connection refused"

排查步骤：
1. 检查数据库服务
   Get-Service -Name "OracleServicePASXDB"

2. 检查监听器
   lsnrctl status

3. 测试连接
   sqlplus pasx_owner/PasxOwner@2025@PASXDB

4. 检查网络
   Test-NetConnection -ComputerName PASX-DB01 -Port 1521

解决方案：
- 数据库服务停止：启动服务
- 监听器停止：lsnrctl start
- 网络问题：检查防火墙、DNS
- 密码错误：重置密码
```

### 5.3 应用响应缓慢
```plaintext
症状：
- 页面加载时间 > 10 秒
- 用户报告系统卡顿

排查步骤：
1. 检查 CPU 使用率
   Get-Counter '\Processor(_Total)\% Processor Time'

2. 检查内存使用
   Get-Counter '\Memory\Available MBytes'

3. 检查数据库会话
   SELECT COUNT(*) FROM v$session WHERE username = 'PASX_OWNER';

4. 检查慢查询
   SELECT sql_text, elapsed_time, executions
   FROM v$sql
   WHERE elapsed_time > 1000000
   ORDER BY elapsed_time DESC;

解决方案：
- CPU 高：重启 Tomcat、优化代码
- 内存不足：增加 JVM 内存、重启服务器
- 数据库慢：优化 SQL、添加索引、更新统计信息
- 会话过多：检查连接池配置
```

### 5.4 批次执行失败
```plaintext
症状：
- 批次状态显示 "Error"
- 操作员无法继续执行

排查步骤：
1. 查看批次日志
   导航：Production > Batch Execution > [Batch Number] > Logs

2. 查看错误信息
   检查错误代码和描述

3. 检查设备连接
   导航：Administration > Equipment > [Equipment Name] > Status

4. 检查审计日志
   导航：Administration > Audit Trail

解决方案：
- 设备离线：检查设备连接、重启设备
- 数据验证失败：检查输入数据、修改配方
- 权限不足：检查用户角色
- 系统错误：联系 Werum 技术支持
```

---

## 6. 性能优化

### 6.1 JVM 调优
```batch
REM 编辑 C:\PAS-X\Tomcat\bin\setenv.bat

@echo off

REM 堆内存设置（根据服务器内存调整）
set "JAVA_OPTS=-Xms8192m -Xmx16384m"

REM Metaspace 设置
set "JAVA_OPTS=%JAVA_OPTS% -XX:MetaspaceSize=512m -XX:MaxMetaspaceSize=1024m"

REM 垃圾回收器（G1GC，推荐用于大内存）
set "JAVA_OPTS=%JAVA_OPTS% -XX:+UseG1GC"
set "JAVA_OPTS=%JAVA_OPTS% -XX:MaxGCPauseMillis=200"
set "JAVA_OPTS=%JAVA_OPTS% -XX:ParallelGCThreads=8"

REM GC 日志
set "JAVA_OPTS=%JAVA_OPTS% -Xlog:gc*:file=C:/PAS-X/Logs/gc.log:time,uptime:filecount=5,filesize=10M"

REM 其他优化
set "JAVA_OPTS=%JAVA_OPTS% -Djava.awt.headless=true"
set "JAVA_OPTS=%JAVA_OPTS% -Dfile.encoding=UTF-8"
set "JAVA_OPTS=%JAVA_OPTS% -Duser.timezone=Asia/Shanghai"
set "JAVA_OPTS=%JAVA_OPTS% -server"
```

### 6.2 数据库优化
```sql
-- 更新统计信息
BEGIN
    DBMS_STATS.GATHER_SCHEMA_STATS(
        ownname => 'PASX_OWNER',
        estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
        method_opt => 'FOR ALL COLUMNS SIZE AUTO',
        degree => 4
    );
END;
/

-- 重建索引（碎片整理）
SELECT 'ALTER INDEX ' || index_name || ' REBUILD ONLINE;'
FROM user_indexes
WHERE tablespace_name IN ('PASX_DATA', 'PASX_INDEX');

-- 清理审计日志（保留 7 年）
DELETE FROM pasx_audit_log
WHERE audit_date < ADD_MONTHS(SYSDATE, -84);
COMMIT;

-- 分析表空间碎片
SELECT
    tablespace_name,
    ROUND(SUM(bytes)/1024/1024/1024, 2) AS total_gb,
    COUNT(*) AS fragment_count
FROM dba_free_space
GROUP BY tablespace_name
ORDER BY fragment_count DESC;
```

### 6.3 Tomcat 连接池优化
```xml
<!-- 编辑 C:\PAS-X\Tomcat\conf\context.xml -->

<Context>
    <Resource name="jdbc/PASXDB"
              auth="Container"
              type="javax.sql.DataSource"
              driverClassName="oracle.jdbc.OracleDriver"
              url="jdbc:oracle:thin:@PASX-DB01:1521:PASXDB"
              username="pasx_owner"
              password="PasxOwner@2025"

              <!-- 连接池大小 -->
              initialSize="20"
              maxTotal="100"
              maxIdle="50"
              minIdle="20"

              <!-- 超时设置 -->
              maxWaitMillis="10000"

              <!-- 连接验证 -->
              testOnBorrow="true"
              testWhileIdle="true"
              validationQuery="SELECT 1 FROM DUAL"
              validationQueryTimeout="5"

              <!-- 空闲连接回收 -->
              timeBetweenEvictionRunsMillis="30000"
              minEvictableIdleTimeMillis="60000"

              <!-- 连接泄漏检测 -->
              removeAbandonedOnBorrow="true"
              removeAbandonedTimeout="300"
              logAbandoned="true" />
</Context>
```

---

## 7. 审计与合规

### 7.1 审计日志审查
```sql
-- 查询最近 7 天的审计日志
SELECT
    audit_date,
    username,
    action_type,
    object_type,
    object_name,
    result,
    ip_address
FROM pasx_audit_log
WHERE audit_date >= SYSDATE - 7
ORDER BY audit_date DESC;

-- 查询失败的登录尝试
SELECT
    audit_date,
    username,
    ip_address,
    COUNT(*) AS failed_attempts
FROM pasx_audit_log
WHERE action_type = 'LOGIN'
AND result = 'FAILURE'
AND audit_date >= SYSDATE - 7
GROUP BY audit_date, username, ip_address
HAVING COUNT(*) > 3
ORDER BY failed_attempts DESC;

-- 查询配方修改记录
SELECT
    audit_date,
    username,
    action_type,
    object_name AS recipe_name,
    old_value,
    new_value
FROM pasx_audit_log
WHERE object_type = 'RECIPE'
AND action_type IN ('CREATE', 'MODIFY', 'DELETE')
ORDER BY audit_date DESC;

-- 导出审计日志（CSV）
SPOOL C:\PAS-X\Reports\audit_log.csv
SELECT
    TO_CHAR(audit_date, 'YYYY-MM-DD HH24:MI:SS') || ',' ||
    username || ',' ||
    action_type || ',' ||
    object_type || ',' ||
    object_name || ',' ||
    result
FROM pasx_audit_log
WHERE audit_date >= ADD_MONTHS(SYSDATE, -1);
SPOOL OFF
```

### 7.2 电子签名审查
```sql
-- 查询所有电子签名记录
SELECT
    s.signature_date,
    s.username,
    s.signature_meaning,
    s.signature_reason,
    b.batch_number,
    b.product_code
FROM pasx_signatures s
JOIN pasx_batches b ON s.batch_id = b.batch_id
WHERE s.signature_date >= SYSDATE - 30
ORDER BY s.signature_date DESC;

-- 查询缺失的电子签名
SELECT
    b.batch_number,
    b.product_code,
    b.status,
    b.start_date
FROM pasx_batches b
WHERE b.status = 'COMPLETED'
AND NOT EXISTS (
    SELECT 1 FROM pasx_signatures s
    WHERE s.batch_id = b.batch_id
    AND s.signature_meaning = 'APPROVED'
)
AND b.start_date >= SYSDATE - 30;
```

---

## 8. 补丁与更新

### 8.1 检查可用补丁
```plaintext
步骤：
1. 登录 Werum 客户门户
2. 导航：Downloads > PAS-X > Patches
3. 查看可用补丁列表
4. 下载补丁文件和发布说明
5. 阅读发布说明，确认适用性
```

### 8.2 安装补丁
```powershell
# 补丁安装流程

# 1. 备份系统
.\Backup-Database.ps1
.\Backup-Application.ps1

# 2. 停止 Tomcat
Stop-Service -Name "Tomcat9"

# 3. 解压补丁文件
Expand-Archive -Path "C:\Install\PAS-X_Patch_7.x.x.zip" -DestinationPath "C:\Install\PAS-X_Patch"

# 4. 运行数据库脚本（如有）
sqlplus pasx_owner/PasxOwner@2025@PASXDB @C:\Install\PAS-X_Patch\database\patch.sql

# 5. 替换应用文件
Copy-Item -Path "C:\Install\PAS-X_Patch\application\*" -Destination "C:\PAS-X\Tomcat\webapps\pasx\" -Recurse -Force

# 6. 启动 Tomcat
Start-Service -Name "Tomcat9"

# 7. 验证补丁
# 登录 PAS-X，检查版本号
# 导航：Administration > System Information > Version

# 8. 记录变更
# 更新变更日志，记录补丁版本、安装时间、安装人员
```

---

## 9. 灾难恢复

### 9.1 恢复数据库
```powershell
# 1. 停止 Tomcat
Stop-Service -Name "Tomcat9"

# 2. 使用 Data Pump 导入
$env:ORACLE_HOME = "C:\Oracle\product\19.0.0\dbhome_1"
$env:PATH = "$env:ORACLE_HOME\bin;$env:PATH"

impdp pasx_owner/PasxOwner@2025@PASXDB `
  directory=BACKUP_DIR `
  dumpfile=PASXDB_20251111.dmp `
  logfile=restore.log `
  schemas=pasx_owner `
  table_exists_action=replace

# 3. 验证数据
sqlplus pasx_owner/PasxOwner@2025@PASXDB
SELECT COUNT(*) FROM pasx_batches;

# 4. 启动 Tomcat
Start-Service -Name "Tomcat9"
```

### 9.2 恢复应用
```powershell
# 1. 停止 Tomcat
Stop-Service -Name "Tomcat9"

# 2. 解压备份
Expand-Archive -Path "E:\Backup\PAS-X\Application\20251111.zip" -DestinationPath "C:\Temp\Restore"

# 3. 恢复配置
Copy-Item -Path "C:\Temp\Restore\Tomcat_conf\*" -Destination "C:\PAS-X\Tomcat\conf\" -Recurse -Force

# 4. 恢复应用
Remove-Item -Path "C:\PAS-X\Tomcat\webapps\pasx" -Recurse -Force
Copy-Item -Path "C:\Temp\Restore\pasx_app" -Destination "C:\PAS-X\Tomcat\webapps\pasx" -Recurse

# 5. 恢复配置文件
Copy-Item -Path "C:\Temp\Restore\Config\*" -Destination "C:\PAS-X\Config\" -Recurse -Force

# 6. 启动 Tomcat
Start-Service -Name "Tomcat9"

# 7. 验证
# 访问 https://pasx-app01:8443/pasx
# 测试登录和核心功能
```

---

## 10. 最佳实践

1. **定期备份**：每天备份数据库，每周备份应用
2. **监控告警**：配置自动监控脚本，异常时发送邮件
3. **日志审查**：每周审查系统日志和审计日志
4. **性能监控**：每月生成性能报告，识别瓶颈
5. **补丁管理**：每季度检查并安装补丁
6. **用户培训**：定期培训用户和管理员
7. **文档维护**：及时更新运维文档和变更日志
8. **灾难演练**：每年至少一次 DR 演练
9. **容量规划**：监控系统增长，提前扩容
10. **合规审计**：定期审查系统合规性（21 CFR Part 11）

---

**参考资源**：
- Werum PAS-X 运维手册
- Oracle 数据库管理指南
- Apache Tomcat 调优指南
- GAMP 5 运维指南
