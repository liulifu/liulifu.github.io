# 企业邮件系统部署与管理：Exchange Server

适用读者：企业 IT 管理员、邮件系统管理员
目标：部署 Exchange Server 2019，配置邮箱、邮件流、安全策略，实现企业级邮件服务。

---

## 1. Exchange Server 概述

### 1.1 什么是 Exchange Server
Microsoft Exchange Server 是企业级邮件和协作平台，提供：
- **电子邮件**：SMTP/POP3/IMAP 邮件服务
- **日历**：会议安排、资源预订
- **联系人**：全局地址列表（GAL）
- **任务**：任务管理
- **移动设备**：ActiveSync 同步
- **Web 访问**：Outlook Web App (OWA)

### 1.2 Exchange 版本对比
| 版本 | 发布时间 | 支持截止 | 主要特性 |
|------|---------|---------|---------|
| Exchange 2016 | 2015 | 2025-10-14 | 高可用性、云集成 |
| Exchange 2019 | 2018 | 2025-10-14 | 性能提升、安全增强 |
| Exchange Online | 持续更新 | - | 云端服务、无需维护 |

### 1.3 部署架构
```plaintext
┌─────────────────────────────────────────────────┐
│              互联网                              │
└─────────────────┬───────────────────────────────┘
                  │
         ┌────────▼────────┐
         │  邮件网关        │
         │  (Barracuda)    │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │  Exchange 2019  │
         │  (Mailbox Server)│
         │  10.10.40.20    │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐  ┌────▼─────┐  ┌───▼────┐
│ Outlook│  │ OWA      │  │ 移动设备│
│ 客户端  │  │ (Web)    │  │(ActiveSync)│
└────────┘  └──────────┘  └────────┘
```

---

## 2. 环境准备

### 2.1 硬件要求
| 组件 | 最低配置 | 推荐配置（500 邮箱） |
|------|---------|---------------------|
| CPU | 4 核 | 8 核 |
| 内存 | 8GB | 32GB |
| 磁盘 | 200GB | 1TB（SSD + HDD） |
| 网络 | 1Gbps | 1Gbps（双网卡） |

### 2.2 软件要求
```plaintext
操作系统：
- Windows Server 2019 Standard/Datacenter

前置组件：
- Active Directory（域功能级别 Windows Server 2012 R2+）
- .NET Framework 4.8
- Visual C++ Redistributable 2013
- IIS（Internet Information Services）
- Windows PowerShell 5.1

许可证：
- Exchange Server 2019 Standard/Enterprise
- Exchange Server CAL（客户端访问许可证）
```

### 2.3 网络规划
```plaintext
Exchange 服务器：
- 主机名：EXCH01
- FQDN：exch01.pharma.local
- IP 地址：10.10.40.20
- 子网掩码：255.255.255.0
- 网关：10.10.40.1
- DNS：10.10.40.10, 10.10.40.11

邮件域名：
- 内部域名：pharma.local
- 外部域名：pharma.com
- MX 记录：mail.pharma.com → 公网 IP

证书：
- 购买 SSL 证书（通配符证书）：*.pharma.com
- 或使用 Let's Encrypt 免费证书
```

---

## 3. 安装 Exchange Server 2019

### 3.1 准备 Active Directory
```powershell
# 在域控上执行

# 1. 扩展 AD Schema
.\Setup.exe /PrepareSchema /IAcceptExchangeServerLicenseTerms

# 2. 准备 AD
.\Setup.exe /PrepareAD /OrganizationName:"Pharma Corp" /IAcceptExchangeServerLicenseTerms

# 3. 准备域
.\Setup.exe /PrepareDomain /IAcceptExchangeServerLicenseTerms

# 或一步完成
.\Setup.exe /PrepareAD /OrganizationName:"Pharma Corp" /IAcceptExchangeServerLicenseTerms
```

### 3.2 安装前置组件
```powershell
# 在 Exchange 服务器上执行

# 1. 安装 .NET Framework 4.8
# 下载并安装：https://dotnet.microsoft.com/download/dotnet-framework/net48

# 2. 安装 Visual C++ Redistributable 2013
# 下载并安装：https://www.microsoft.com/en-us/download/details.aspx?id=40784

# 3. 安装 Windows 功能
Install-WindowsFeature Server-Media-Foundation, NET-Framework-45-Features, RPC-over-HTTP-proxy, RSAT-Clustering, RSAT-Clustering-CmdInterface, RSAT-Clustering-Mgmt, RSAT-Clustering-PowerShell, WAS-Process-Model, Web-Asp-Net45, Web-Basic-Auth, Web-Client-Auth, Web-Digest-Auth, Web-Dir-Browsing, Web-Dyn-Compression, Web-Http-Errors, Web-Http-Logging, Web-Http-Redirect, Web-Http-Tracing, Web-ISAPI-Ext, Web-ISAPI-Filter, Web-Lgcy-Mgmt-Console, Web-Metabase, Web-Mgmt-Console, Web-Mgmt-Service, Web-Net-Ext45, Web-Request-Monitor, Web-Server, Web-Stat-Compression, Web-Static-Content, Web-Windows-Auth, Web-WMI, Windows-Identity-Foundation, RSAT-ADDS

# 4. 安装 Unified Communications Managed API 4.0
# 下载并安装：https://www.microsoft.com/en-us/download/details.aspx?id=34992

# 5. 重启服务器
Restart-Computer
```

### 3.3 安装 Exchange Server
```powershell
# 挂载 Exchange 2019 ISO

# 方法 1：GUI 安装
# 运行 Setup.exe，按向导操作

# 方法 2：命令行安装（推荐）
E:\Setup.exe /Mode:Install /Role:Mailbox /IAcceptExchangeServerLicenseTerms /OrganizationName:"Pharma Corp"

# 安装过程约 30-60 分钟
# 安装完成后自动重启
```

### 3.4 验证安装
```powershell
# 检查 Exchange 服务
Get-Service MSExchange* | Select-Object Name, Status

# 输出示例：
# Name                           Status
# ----                           ------
# MSExchangeADTopology           Running
# MSExchangeDelivery             Running
# MSExchangeFrontEndTransport    Running
# MSExchangeHM                   Running
# MSExchangeIS                   Running
# MSExchangeMailboxAssistants    Running
# MSExchangeRepl                 Running
# MSExchangeRPC                  Running
# MSExchangeServiceHost          Running
# MSExchangeSubmission           Running
# MSExchangeThrottling           Running
# MSExchangeTransport            Running
# MSExchangeTransportLogSearch   Running

# 检查 Exchange 版本
Get-ExchangeServer | Format-List Name, Edition, AdminDisplayVersion

# 访问 EAC（Exchange 管理中心）
# https://exch01.pharma.local/ecp
# 使用域管理员账号登录
```

---

## 4. 配置 Exchange

### 4.1 配置虚拟目录
```powershell
# 配置外部 URL（用于外网访问）
$ExternalURL = "https://mail.pharma.com"

# OWA（Outlook Web App）
Set-OwaVirtualDirectory -Identity "EXCH01\owa (Default Web Site)" -ExternalUrl "$ExternalURL/owa" -InternalUrl "https://exch01.pharma.local/owa"

# ECP（Exchange 管理中心）
Set-EcpVirtualDirectory -Identity "EXCH01\ecp (Default Web Site)" -ExternalUrl "$ExternalURL/ecp" -InternalUrl "https://exch01.pharma.local/ecp"

# ActiveSync（移动设备）
Set-ActiveSyncVirtualDirectory -Identity "EXCH01\Microsoft-Server-ActiveSync (Default Web Site)" -ExternalUrl "$ExternalURL/Microsoft-Server-ActiveSync" -InternalUrl "https://exch01.pharma.local/Microsoft-Server-ActiveSync"

# EWS（Exchange Web Services）
Set-WebServicesVirtualDirectory -Identity "EXCH01\EWS (Default Web Site)" -ExternalUrl "$ExternalURL/EWS/Exchange.asmx" -InternalUrl "https://exch01.pharma.local/EWS/Exchange.asmx"

# OAB（离线通讯簿）
Set-OabVirtualDirectory -Identity "EXCH01\OAB (Default Web Site)" -ExternalUrl "$ExternalURL/OAB" -InternalUrl "https://exch01.pharma.local/OAB"

# MAPI/HTTP
Set-MapiVirtualDirectory -Identity "EXCH01\mapi (Default Web Site)" -ExternalUrl "$ExternalURL/mapi" -InternalUrl "https://exch01.pharma.local/mapi"

# Autodiscover
Set-ClientAccessService -Identity EXCH01 -AutoDiscoverServiceInternalUri "https://exch01.pharma.local/Autodiscover/Autodiscover.xml"
```

### 4.2 配置 SSL 证书
```powershell
# 方法 1：使用商业证书（推荐）
# 1. 生成证书请求（CSR）
$cert = New-ExchangeCertificate -GenerateRequest -SubjectName "CN=mail.pharma.com" -DomainName mail.pharma.com,autodiscover.pharma.com,exch01.pharma.local -PrivateKeyExportable $true
Set-Content -Path "C:\cert_request.csr" -Value $cert

# 2. 提交 CSR 到证书颁发机构（CA）
# 3. 下载证书文件（.cer 或 .crt）
# 4. 导入证书
Import-ExchangeCertificate -FileData ([System.IO.File]::ReadAllBytes("C:\mail_pharma_com.cer"))

# 5. 启用证书
Enable-ExchangeCertificate -Thumbprint "证书指纹" -Services IIS,SMTP

# 方法 2：使用自签名证书（测试环境）
New-ExchangeCertificate -SubjectName "CN=mail.pharma.com" -DomainName mail.pharma.com,autodiscover.pharma.com,exch01.pharma.local -Services IIS,SMTP -PrivateKeyExportable $true

# 查看证书
Get-ExchangeCertificate | Format-List Thumbprint, Subject, Services, NotAfter
```

### 4.3 配置接受域
```powershell
# 查看现有接受域
Get-AcceptedDomain

# 添加新的接受域
New-AcceptedDomain -Name "pharma.com" -DomainName "pharma.com" -DomainType Authoritative

# 设置默认接受域
Set-AcceptedDomain -Identity "pharma.com" -MakeDefault $true
```

### 4.4 配置电子邮件地址策略
```powershell
# 查看现有策略
Get-EmailAddressPolicy

# 创建新策略
New-EmailAddressPolicy -Name "Default Policy" -IncludedRecipients AllRecipients -EnabledPrimarySMTPAddressTemplate "SMTP:%g.%s@pharma.com"

# 应用策略
Update-EmailAddressPolicy -Identity "Default Policy"

# 策略模板说明：
# %g = 名（GivenName）
# %s = 姓（Surname）
# %m = 别名（Alias）
# 示例：张三 → zhang.san@pharma.com
```

---

## 5. 创建邮箱

### 5.1 创建用户邮箱
```powershell
# 为现有 AD 用户启用邮箱
Enable-Mailbox -Identity "zhang.san" -Database "Mailbox Database 01"

# 创建新用户并启用邮箱
New-Mailbox -Name "李四" -Alias "li.si" -UserPrincipalName "li.si@pharma.local" -SamAccountName "li.si" -FirstName "四" -LastName "李" -Password (ConvertTo-SecureString "P@ssw0rd123!" -AsPlainText -Force) -Database "Mailbox Database 01" -OrganizationalUnit "OU=Users,OU=Shanghai,DC=pharma,DC=local"

# 设置邮箱配额
Set-Mailbox -Identity "zhang.san" -IssueWarningQuota 45GB -ProhibitSendQuota 49GB -ProhibitSendReceiveQuota 50GB

# 设置邮箱语言和时区
Set-MailboxRegionalConfiguration -Identity "zhang.san" -Language zh-CN -TimeZone "China Standard Time"
```

### 5.2 创建共享邮箱
```powershell
# 创建共享邮箱（不需要许可证）
New-Mailbox -Name "IT Support" -Alias "it.support" -Shared -PrimarySmtpAddress "it.support@pharma.com" -Database "Mailbox Database 01"

# 授予用户访问权限
Add-MailboxPermission -Identity "it.support@pharma.com" -User "zhang.san" -AccessRights FullAccess -InheritanceType All

# 授予代发权限
Add-RecipientPermission -Identity "it.support@pharma.com" -Trustee "zhang.san" -AccessRights SendAs -Confirm:$false
```

### 5.3 创建会议室邮箱
```powershell
# 创建会议室邮箱
New-Mailbox -Name "会议室 A" -Alias "room.a" -Room -PrimarySmtpAddress "room.a@pharma.com" -Database "Mailbox Database 01"

# 配置会议室自动接受
Set-CalendarProcessing -Identity "room.a@pharma.com" -AutomateProcessing AutoAccept -DeleteSubject $false -AddOrganizerToSubject $false

# 设置会议室容量
Set-Mailbox -Identity "room.a@pharma.com" -ResourceCapacity 10
```

### 5.4 创建通讯组
```powershell
# 创建通讯组
New-DistributionGroup -Name "IT Team" -Alias "it.team" -PrimarySmtpAddress "it.team@pharma.com" -OrganizationalUnit "OU=Groups,OU=Shanghai,DC=pharma,DC=local"

# 添加成员
Add-DistributionGroupMember -Identity "it.team@pharma.com" -Member "zhang.san"
Add-DistributionGroupMember -Identity "it.team@pharma.com" -Member "li.si"

# 设置只允许内部发件人
Set-DistributionGroup -Identity "it.team@pharma.com" -RequireSenderAuthenticationEnabled $true
```

---

## 6. 配置邮件流

### 6.1 配置发送连接器
```powershell
# 创建发送连接器（通过邮件网关发送）
New-SendConnector -Name "Outbound to Internet" -Usage Internet -AddressSpaces "SMTP:*;1" -SourceTransportServers EXCH01 -SmartHosts "10.10.1.100" -SmartHostAuthMechanism None -DNSRoutingEnabled $false

# 或直接发送到互联网（需要公网 IP）
New-SendConnector -Name "Outbound to Internet" -Usage Internet -AddressSpaces "SMTP:*;1" -SourceTransportServers EXCH01 -DNSRoutingEnabled $true
```

### 6.2 配置接收连接器
```powershell
# 查看默认接收连接器
Get-ReceiveConnector

# 创建自定义接收连接器（接收来自应用服务器的邮件）
New-ReceiveConnector -Name "Relay from App Servers" -Usage Custom -Bindings 10.10.40.20:25 -RemoteIPRanges 10.10.30.0/24 -Server EXCH01 -PermissionGroups AnonymousUsers -AuthMechanism None

# 授予匿名中继权限
Get-ReceiveConnector "EXCH01\Relay from App Servers" | Add-ADPermission -User "NT AUTHORITY\ANONYMOUS LOGON" -ExtendedRights "Ms-Exch-SMTP-Accept-Any-Recipient"
```

### 6.3 配置邮件路由
```powershell
# 配置 MX 记录（在 DNS 服务器上）
# mail.pharma.com → 公网 IP（指向邮件网关）

# 配置 SPF 记录（防止邮件被标记为垃圾邮件）
# TXT 记录：pharma.com → "v=spf1 ip4:公网IP a:mail.pharma.com ~all"

# 配置 DKIM（域名密钥识别邮件）
# 在 Exchange 中启用 DKIM（需要 Exchange Online 或第三方工具）

# 配置 DMARC（域名消息认证报告和一致性）
# TXT 记录：_dmarc.pharma.com → "v=DMARC1; p=quarantine; rua=mailto:dmarc@pharma.com"
```

---

## 7. 安全配置

### 7.1 配置反垃圾邮件
```powershell
# 启用反垃圾邮件代理
& $env:ExchangeInstallPath\Scripts\Install-AntiSpamAgents.ps1
Restart-Service MSExchangeTransport

# 配置 SCL（垃圾邮件可信度级别）阈值
Set-OrganizationConfig -SCLJunkThreshold 4

# 配置内容过滤
Set-ContentFilterConfig -Enabled $true -SCLRejectEnabled $true -SCLRejectThreshold 7 -SCLDeleteEnabled $true -SCLDeleteThreshold 9

# 配置发件人过滤
Set-SenderFilterConfig -Enabled $true -BlankSenderBlockingEnabled $true

# 配置收件人过滤
Set-RecipientFilterConfig -Enabled $true -RecipientValidationEnabled $true
```

### 7.2 配置邮件大小限制
```powershell
# 全局限制（25MB）
Set-TransportConfig -MaxSendSize 25MB -MaxReceiveSize 25MB

# 邮箱限制
Set-Mailbox -Identity "zhang.san" -MaxSendSize 25MB -MaxReceiveSize 25MB

# 连接器限制
Set-SendConnector -Identity "Outbound to Internet" -MaxMessageSize 25MB
Set-ReceiveConnector -Identity "EXCH01\Default Frontend EXCH01" -MaxMessageSize 25MB
```

### 7.3 配置邮件保留策略
```powershell
# 创建保留标记（7 年保留）
New-RetentionPolicyTag -Name "7 Years Delete" -Type All -AgeLimitForRetention 2555 -RetentionAction DeleteAndAllowRecovery

# 创建保留策略
New-RetentionPolicy -Name "Default Retention Policy" -RetentionPolicyTagLinks "7 Years Delete"

# 应用到邮箱
Set-Mailbox -Identity "zhang.san" -RetentionPolicy "Default Retention Policy"

# 启用托管文件夹助理
Start-ManagedFolderAssistant -Identity "zhang.san"
```

### 7.4 配置审计日志
```powershell
# 启用邮箱审计
Set-Mailbox -Identity "zhang.san" -AuditEnabled $true -AuditLogAgeLimit 90 -AuditOwner Update,Move,MoveToDeletedItems,SoftDelete,HardDelete -AuditDelegate Update,Move,MoveToDeletedItems,SoftDelete,HardDelete,SendAs,SendOnBehalf -AuditAdmin Update,Move,MoveToDeletedItems,SoftDelete,HardDelete,SendAs,SendOnBehalf,Copy

# 批量启用
Get-Mailbox -ResultSize Unlimited | Set-Mailbox -AuditEnabled $true

# 查看审计日志
Search-MailboxAuditLog -Identity "zhang.san" -LogonTypes Admin,Delegate -ShowDetails -StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date)
```

---

## 8. 备份与恢复

### 8.1 备份策略
```powershell
# 使用 Windows Server Backup 备份 Exchange
# 1. 安装 Windows Server Backup
Install-WindowsFeature Windows-Server-Backup

# 2. 创建备份策略
$policy = New-WBPolicy
$target = New-WBBackupTarget -VolumePath E:
Add-WBBackupTarget -Policy $policy -Target $target
Add-WBSystemState -Policy $policy
Add-WBBareMetalRecovery -Policy $policy

# 3. 启动备份
Start-WBBackup -Policy $policy

# 或使用第三方备份软件（Veeam、Commvault）
```

### 8.2 恢复邮箱
```powershell
# 恢复已删除的邮箱（30 天内）
Get-MailboxDatabase | Get-MailboxStatistics | Where {$_.DisconnectReason -eq "SoftDeleted"}

# 连接已删除的邮箱到新用户
Connect-Mailbox -Identity "张三" -Database "Mailbox Database 01" -User "zhang.san"

# 或恢复到恢复数据库
New-MailboxRestoreRequest -SourceMailbox "张三" -SourceDatabase "Mailbox Database 01" -TargetMailbox "zhang.san"
```

---

## 9. 监控与维护

### 9.1 监控邮件队列
```powershell
# 查看邮件队列
Get-Queue

# 查看队列中的邮件
Get-Message -Queue "EXCH01\Submission"

# 重试队列
Retry-Queue -Identity "EXCH01\Submission"

# 删除队列中的邮件
Remove-Message -Identity "EXCH01\Submission\12345" -WithNDR $true
```

### 9.2 监控数据库
```powershell
# 查看数据库状态
Get-MailboxDatabase -Status | Select-Object Name, Mounted, DatabaseSize

# 查看数据库副本状态（DAG 环境）
Get-MailboxDatabaseCopyStatus

# 检查数据库健康状态
Test-MapiConnectivity -Database "Mailbox Database 01"
```

### 9.3 性能监控
```powershell
# 使用 Performance Monitor 监控关键指标：
# - MSExchange Database\I/O Database Reads Average Latency
# - MSExchange Database\I/O Database Writes Average Latency
# - Processor\% Processor Time
# - Memory\Available MBytes
# - Network Interface\Bytes Total/sec
```

---

## 10. 最佳实践

1. **高可用性**：部署 DAG（数据库可用性组）
2. **定期备份**：每天备份，异地存储
3. **监控告警**：邮件队列、数据库大小、服务状态
4. **安全加固**：启用 MFA、限制 OWA 访问
5. **补丁管理**：定期安装 Exchange CU（累积更新）
6. **容量规划**：监控邮箱增长，提前扩容
7. **文档化**：记录配置、变更、故障处理
8. **测试恢复**：定期测试备份恢复流程
9. **用户培训**：培训用户使用 OWA、移动设备
10. **合规审计**：启用审计日志，定期审查

---

**参考资源**：
- Microsoft Exchange Server 2019 官方文档
- Exchange Server 部署助手
- Exchange Team Blog

