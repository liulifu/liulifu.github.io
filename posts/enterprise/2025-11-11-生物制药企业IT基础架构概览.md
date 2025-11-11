# 生物制药企业 IT 基础架构概览

适用读者：企业 IT 管理员、系统架构师、IT 新人
目标：全面了解生物制药企业的 IT 基础架构，包括核心服务、网络架构、安全合规要求。

---

## 1. 生物制药企业 IT 特点

### 1.1 行业特殊性
生物制药企业的 IT 基础架构与一般企业有显著差异：

| 特点 | 说明 | IT 影响 |
|------|------|---------|
| **高度合规** | FDA 21 CFR Part 11、EU Annex 11、GxP | 系统验证、审计追踪、电子签名 |
| **数据完整性** | ALCOA+ 原则 | 数据不可篡改、完整备份 |
| **实验室系统** | LIMS、ELN、CDS、SDMS | 专业软件集成 |
| **混合环境** | Windows + Linux + 专用设备 | 多平台管理 |
| **长期保存** | 数据保留 25 年+ | 归档系统、介质迁移 |
| **安全隔离** | 生产网络隔离 | 网络分段、防火墙 |

### 1.2 IT 组织架构
```plaintext
IT 总监
├── 基础架构团队
│   ├── 网络工程师
│   ├── 系统管理员（Windows/Linux）
│   └── 桌面支持工程师
├── 应用支持团队
│   ├── LIMS 管理员
│   ├── ERP 管理员（SAP/Oracle）
│   └── 办公软件支持
├── 信息安全团队
│   ├── 安全工程师
│   ├── 合规专员
│   └── 数据保护专员
└── 验证与合规团队
    ├── CSV 工程师
    ├── 验证工程师
    └── 审计专员
```

---

## 2. 核心 IT 服务

### 2.1 身份认证与目录服务
| 服务 | 用途 | 部署方式 |
|------|------|---------|
| **Active Directory (AD)** | 用户账号、组策略、权限管理 | 主域控 + 备域控（至少2台） |
| **Azure AD / Entra ID** | 云服务集成、SSO | 混合部署 |
| **LDAP** | Linux 系统认证 | 与 AD 集成 |
| **MFA（多因素认证）** | 增强安全性 | Duo、Azure MFA |

**典型部署**：
- 主域控：Windows Server 2022，物理机或虚拟机
- 备域控：异地机房，灾备
- 域功能级别：Windows Server 2016 或更高
- 域名示例：`pharma.local` 或 `corp.pharma.com`

### 2.2 邮件系统
| 服务 | 用途 | 部署方式 |
|------|------|---------|
| **Exchange Server** | 企业邮件、日历、联系人 | 本地部署（2019/2022） |
| **Microsoft 365 (Exchange Online)** | 云邮件服务 | 混合部署或纯云 |
| **邮件网关** | 反垃圾邮件、病毒过滤 | Barracuda、Proofpoint |
| **邮件归档** | 合规归档、eDiscovery | Mimecast、Veritas |

**典型部署**：
- Exchange Server 2019（本地）+ Exchange Online（云）
- 邮箱大小：50GB - 100GB/用户
- 归档策略：所有邮件保留 7 年

### 2.3 文件服务
| 服务 | 用途 | 部署方式 |
|------|------|---------|
| **Windows File Server** | 部门共享文件夹 | Windows Server 2022 + DFS |
| **SharePoint** | 文档管理、协作 | SharePoint Server 或 Online |
| **网络存储 (NAS)** | 大容量存储 | NetApp、Dell EMC、Synology |
| **对象存储** | 归档、备份 | MinIO、AWS S3 |

**典型部署**：
- 文件服务器：2 台（主备），RAID 10，100TB+
- DFS 命名空间：`\\pharma.local\shares`
- 权限管理：基于 AD 组

### 2.4 打印服务
| 服务 | 用途 | 部署方式 |
|------|------|---------|
| **Print Server** | 集中管理打印机 | Windows Server 2022 |
| **打印审计** | 跟踪打印记录 | PaperCut、PrinterLogic |
| **安全打印** | 刷卡取件 | 集成 AD 认证 |

### 2.5 远程访问
| 服务 | 用途 | 部署方式 |
|------|------|---------|
| **VPN** | 远程办公 | Cisco AnyConnect、Palo Alto GlobalProtect |
| **Remote Desktop Gateway** | 远程桌面访问 | Windows Server 2022 |
| **Citrix / VMware Horizon** | 虚拟桌面（VDI） | 适用于合规环境 |
| **Jump Server** | 堡垒机 | 生产环境访问 |

### 2.6 备份与灾备
| 服务 | 用途 | 部署方式 |
|------|------|---------|
| **Veeam Backup** | 虚拟机备份 | 备份服务器 + 存储 |
| **Windows Server Backup** | 物理服务器备份 | 本地 + 异地 |
| **数据库备份** | SQL Server、Oracle | RMAN、SQL Agent |
| **异地灾备** | 灾难恢复 | 异地机房或云 |

**备份策略**：
- 每日增量备份
- 每周完全备份
- 保留期：30 天（本地）+ 7 年（归档）

---

## 3. 网络架构

### 3.1 网络分段
```plaintext
┌─────────────────────────────────────────────────┐
│              互联网                              │
└─────────────────┬───────────────────────────────┘
                  │
         ┌────────▼────────┐
         │  防火墙 (Palo Alto) │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐  ┌────▼─────┐  ┌───▼────┐
│ DMZ    │  │ 办公网络  │  │ 生产网络│
│ (邮件网关)│  │ (VLAN 10)│  │ (VLAN 20)│
└────────┘  └──────────┘  └────────┘
                  │             │
         ┌────────┼─────────────┼────────┐
         │        │             │        │
    ┌────▼───┐ ┌─▼──────┐ ┌───▼────┐ ┌─▼──────┐
    │ 管理网络│ │ 访客网络│ │ 实验室网│ │ 服务器网│
    │(VLAN 99)│ │(VLAN 50)│ │(VLAN 30)│ │(VLAN 40)│
    └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 3.2 VLAN 划分
| VLAN ID | 网段 | 用途 | 安全级别 |
|---------|------|------|---------|
| VLAN 10 | 10.10.10.0/24 | 办公网络（员工电脑） | 中 |
| VLAN 20 | 10.10.20.0/24 | 生产网络（GxP 系统） | 高 |
| VLAN 30 | 10.10.30.0/24 | 实验室网络（LIMS、仪器） | 高 |
| VLAN 40 | 10.10.40.0/24 | 服务器网络（AD、Exchange） | 高 |
| VLAN 50 | 10.10.50.0/24 | 访客网络（WiFi） | 低 |
| VLAN 99 | 10.10.99.0/24 | 管理网络（交换机、防火墙） | 最高 |

### 3.3 防火墙规则示例
```plaintext
# 办公网络 → 互联网：允许 HTTP/HTTPS
VLAN 10 → Internet: Allow TCP 80, 443

# 办公网络 → 服务器网络：允许 AD、Exchange
VLAN 10 → VLAN 40: Allow TCP 389, 636, 88, 445, 25, 587

# 生产网络 → 互联网：拒绝（隔离）
VLAN 20 → Internet: Deny All

# 实验室网络 → 服务器网络：允许 LIMS 数据库
VLAN 30 → VLAN 40: Allow TCP 1521 (Oracle), 1433 (SQL Server)

# 访客网络 → 内网：拒绝
VLAN 50 → VLAN 10/20/30/40: Deny All
```

---

## 4. 实验室专用系统

### 4.1 LIMS（实验室信息管理系统）
- **用途**：样品管理、检测流程、结果记录
- **常用软件**：LabWare、Thermo SampleManager、Waters NuGenesis
- **部署**：Windows Server + SQL Server/Oracle
- **合规要求**：21 CFR Part 11 验证、审计追踪

### 4.2 ELN（电子实验记录本）
- **用途**：实验记录、电子签名、协作
- **常用软件**：Benchling、PerkinElmer E-Notebook、BIOVIA Notebook
- **部署**：云端或本地
- **合规要求**：数据完整性、电子签名

### 4.3 CDS（色谱数据系统）
- **用途**：仪器数据采集、分析
- **常用软件**：Empower (Waters)、ChemStation (Agilent)、Chromeleon (Thermo)
- **部署**：Windows 工作站 + 文件服务器
- **合规要求**：审计追踪、数据备份

### 4.4 SDMS（科学数据管理系统）
- **用途**：集中存储仪器数据
- **常用软件**：Waters NuGenesis SDMS、Thermo Core SDMS
- **部署**：Windows Server + SQL Server
- **合规要求**：长期归档、数据迁移

---

## 5. 企业应用系统

### 5.1 ERP（企业资源计划）
- **常用软件**：SAP、Oracle EBS、Microsoft Dynamics
- **模块**：财务、采购、库存、生产、质量
- **部署**：本地或云（SAP S/4HANA Cloud）
- **集成**：与 LIMS、MES 集成

### 5.2 MES（制造执行系统）
- **用途**：生产过程管理、批次记录
- **常用软件**：Siemens Opcenter、Rockwell FactoryTalk、Werum PAS-X
- **部署**：生产网络（VLAN 20）
- **合规要求**：电子批记录（eBR）、21 CFR Part 11

### 5.3 QMS（质量管理系统）
- **用途**：偏差管理、变更控制、CAPA
- **常用软件**：Veeva Vault QMS、MasterControl、TrackWise
- **部署**：云端或本地
- **合规要求**：审计追踪、电子签名

### 5.4 DMS（文档管理系统）
- **用途**：SOP、验证文档、培训记录
- **常用软件**：Veeva Vault、MasterControl、SharePoint
- **部署**：云端或本地
- **合规要求**：版本控制、访问权限

---

## 6. 安全与合规

### 6.1 访问控制
```plaintext
最小权限原则：
- 用户只能访问工作所需的系统和数据
- 使用 AD 组管理权限
- 定期审查权限（每季度）

示例 AD 组结构：
├── GG_LIMS_Users（LIMS 普通用户）
├── GG_LIMS_Admins（LIMS 管理员）
├── GG_FileServer_RD_Read（研发部门只读）
├── GG_FileServer_RD_Write（研发部门读写）
├── GG_Production_Operators（生产操作员）
└── GG_QA_Reviewers（质量审核员）
```

### 6.2 审计与日志
| 系统 | 审计内容 | 保留期 |
|------|---------|--------|
| Active Directory | 登录、权限变更 | 7 年 |
| LIMS | 数据修改、电子签名 | 25 年+ |
| 文件服务器 | 文件访问、修改、删除 | 7 年 |
| 防火墙 | 网络流量、入侵检测 | 1 年 |
| Exchange | 邮件发送、接收 | 7 年 |

### 6.3 数据备份与恢复
```plaintext
备份策略：
- RTO（恢复时间目标）：4 小时
- RPO（恢复点目标）：1 小时

备份方案：
1. 虚拟机：Veeam 每日增量备份
2. 数据库：每小时事务日志备份
3. 文件服务器：每日增量备份
4. 异地备份：每周同步到异地机房
5. 云备份：关键数据备份到 Azure/AWS
```

### 6.4 灾难恢复演练
```plaintext
演练频率：每年 2 次

演练场景：
1. 主域控故障 → 切换到备域控
2. Exchange 服务器故障 → 从备份恢复
3. 文件服务器故障 → 从 DFS 副本恢复
4. 机房断电 → 切换到异地机房
5. 勒索软件攻击 → 隔离、恢复备份

演练记录：
- 恢复时间
- 数据丢失量
- 改进措施
```

---

## 7. 终端设备管理

### 7.1 标准配置
| 设备类型 | 配置 | 用途 |
|---------|------|------|
| **办公笔记本** | Dell Latitude / HP EliteBook, 16GB RAM, 512GB SSD | 日常办公 |
| **工程师工作站** | Dell Precision / HP ZBook, 32GB RAM, 1TB SSD | 开发、数据分析 |
| **实验室工作站** | 固定配置，Windows 10 LTSC | 仪器控制 |
| **生产终端** | 瘦客户端 + Citrix VDI | 生产环境 |

### 7.2 设备管理工具
- **SCCM / Intune**：软件分发、补丁管理
- **MDM（移动设备管理）**：手机、平板管理
- **资产管理**：ServiceNow、Lansweeper

### 7.3 标准软件包
```plaintext
基础软件：
- Windows 10/11 Enterprise
- Microsoft Office 365
- Adobe Acrobat Reader
- 7-Zip
- Chrome / Edge

安全软件：
- 防病毒：Symantec Endpoint Protection / CrowdStrike
- VPN 客户端：Cisco AnyConnect
- 加密软件：BitLocker

专业软件（按部门）：
- 研发：ChemDraw、GraphPad Prism、Python
- 质量：Minitab、JMP
- IT：PuTTY、WinSCP、Remote Desktop Manager
```

---

## 8. 合规与验证

### 8.1 计算机系统验证（CSV）
生物制药企业的 GxP 系统必须经过验证：

```plaintext
验证生命周期：
1. 规划（Validation Plan）
2. 需求分析（URS - User Requirements Specification）
3. 风险评估（Risk Assessment）
4. 设计确认（DQ - Design Qualification）
5. 安装确认（IQ - Installation Qualification）
6. 运行确认（OQ - Operational Qualification）
7. 性能确认（PQ - Performance Qualification）
8. 验证报告（Validation Report）
9. 定期审查（Periodic Review）

验证范围：
- LIMS、ELN、CDS、SDMS
- MES、ERP（GxP 模块）
- 文档管理系统
- 电子签名系统
```

### 8.2 变更控制
```plaintext
变更流程：
1. 提交变更请求（Change Request）
2. 影响评估（Impact Assessment）
3. 审批（QA、IT、业务部门）
4. 测试（Test Environment）
5. 实施（Production Environment）
6. 验证（Post-Change Validation）
7. 关闭（Change Closure）

示例：
- Windows 补丁：每月第二个周二（Patch Tuesday）
- LIMS 升级：需要完整的 IQ/OQ/PQ
- 网络变更：需要回滚计划
```

---

## 9. IT 服务管理

### 9.1 服务台（Service Desk）
- **工具**：ServiceNow、Jira Service Management、Freshservice
- **SLA**：
  - P1（系统宕机）：15 分钟响应，4 小时解决
  - P2（功能受限）：1 小时响应，8 小时解决
  - P3（一般问题）：4 小时响应，2 天解决
  - P4（咨询）：1 天响应，5 天解决

### 9.2 常见工单类型
| 类型 | 占比 | 示例 |
|------|------|------|
| 密码重置 | 30% | 忘记密码、账号锁定 |
| 软件安装 | 20% | 安装 Office、专业软件 |
| 硬件故障 | 15% | 电脑无法启动、打印机故障 |
| 网络问题 | 10% | 无法连接 WiFi、VPN 故障 |
| 权限申请 | 10% | 文件夹访问、系统权限 |
| 新员工入职 | 10% | 创建账号、配置电脑 |
| 其他 | 5% | 咨询、培训 |

### 9.3 知识库
```plaintext
常见问题文档：
- 如何连接 VPN
- 如何映射网络驱动器
- 如何设置 Outlook 邮箱
- 如何申请文件夹权限
- 如何重置密码
- 如何安装打印机

操作手册：
- 新员工 IT 入职指南
- LIMS 用户手册
- 远程办公指南
- 数据备份与恢复流程
```

---

## 10. 成本与预算

### 10.1 典型 IT 预算（500 人企业）
| 项目 | 年度预算（万元） | 占比 |
|------|----------------|------|
| 人员成本 | 300 | 40% |
| 硬件采购（服务器、电脑、网络设备） | 150 | 20% |
| 软件许可（Office 365、LIMS、ERP） | 120 | 16% |
| 云服务（Azure、AWS） | 60 | 8% |
| 网络与安全（防火墙、VPN、防病毒） | 45 | 6% |
| 维保与支持（厂商服务） | 45 | 6% |
| 培训与认证 | 15 | 2% |
| 其他（差旅、办公） | 15 | 2% |
| **总计** | **750** | **100%** |

### 10.2 设备更换周期
- **笔记本电脑**：3-4 年
- **台式机**：4-5 年
- **服务器**：5-7 年
- **网络设备**：7-10 年
- **存储设备**：5-7 年

---

## 11. 最佳实践

1. **文档化**：所有系统配置、网络拓扑、操作流程都要文档化
2. **标准化**：统一硬件型号、软件版本、配置模板
3. **自动化**：使用脚本、GPO、SCCM 自动化部署和管理
4. **监控告警**：实时监控服务器、网络、应用状态
5. **定期审查**：每季度审查权限、备份、安全策略
6. **培训**：定期培训 IT 团队和最终用户
7. **供应商管理**：维护良好的供应商关系，确保及时支持
8. **灾备演练**：每年至少 2 次灾难恢复演练
9. **合规优先**：所有变更必须符合 GxP 要求
10. **用户体验**：平衡安全性与易用性

---

## 12. 未来趋势

### 12.1 云化
- **混合云**：本地 + Azure/AWS
- **SaaS 应用**：Veeva、Benchling 等云端 LIMS/ELN
- **云备份**：异地灾备

### 12.2 自动化与 AI
- **RPA**：自动化重复性任务
- **AI 运维**：智能告警、故障预测
- **自助服务**：用户自助重置密码、申请权限

### 12.3 零信任安全
- **MFA**：所有系统强制多因素认证
- **微分段**：更细粒度的网络隔离
- **持续验证**：动态权限管理

---

**参考资源**：
- FDA 21 CFR Part 11 Guidance
- GAMP 5（Good Automated Manufacturing Practice）
- ISPE Baseline Guides
- Microsoft IT Showcase
- NIST Cybersecurity Framework

