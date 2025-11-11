# 实验室信息学架构（02）LIMS 与主数据治理

> 本文聚焦样本到结果的“主链路”与 LIMS 数据模型/流程设计，并给出实体与状态机示例。

## 1. 关键实体（建议最小集合）
- Project/Study：项目/研究
- Sample：样本（层级：父样本→子样本/分装 Aliquot）
- Container：容器/板位（条码/位置）
- Method/Procedure：分析方法/流程（版本化）
- Test：检测项（与方法/参数绑定）
- Specification：规格/判定规则（版本化）
- Instrument：仪器/通道/方法模板
- Result：结果（原始/计算/复核状态）
- User/Role：人员与权限

## 2. 典型流程与状态机
- 接收/登录（Accession）→ 分配/排程 → 采集/制备 → 执行（Run）→ 初审 → 复核/放行
- 状态机示例：Created → Received → InProgress → PendingReview → Approved/Rejected → Archived
- CoC（Chain of Custody）：记录样本在每一步的责任人/时间/地点

## 3. 数据模型示例（片段）
```json
{
  "sample": {
    "id": "S-2025-000123",
    "parent_id": null,
    "project": "P-CMC-001",
    "container": "TUBE-000789",
    "method": "HPLC-ASSAY@v3",
    "tests": ["ASSAY", "ID", "IMPURITY"],
    "status": "InProgress"
  },
  "result": {
    "test": "ASSAY",
    "value": 99.3,
    "unit": "%",
    "calc": {"type": "mean", "n": 3},
    "spec": {"lower": 97.0, "upper": 103.0},
    "review": {"by": "analystA", "time": "2025-11-11T10:20:00Z"}
  }
}
```

## 4. 主数据治理（MDM 要点）
- 命名与编码：样本、方法、规格、设备、位置、批次，统一编码规则与校验。
- 变更与版本：方法与规格必须版本化，旧批记录可追溯。
- 共享字典：单位、矩阵、分析通道、原因码，集中维护。
- 批处理与模板：批记录模板与参数化执行（方法参数/设备参数/耗材批号）。

## 5. 合规要点（LIMS 视角）
- 审计追踪：创建/修改/删除均记录“谁/何时/何因/前后值”。
- 电子签名：签核链定义，双签/复核策略可配置。
- 记录保留：结果、原始数据指纹（哈希）、附件与清单受控。
- 权限最小化：角色-权限矩阵，分区 GxP 与非 GxP 环境。

## 6. 与周边系统的边界
- 与 ELN：方法定义与参数下发
- 与 LES：方法执行与步骤数据回传
- 与 SDMS：原始数据/报告落地与链接
- 与 QMS：偏差/变更/培训对接
- 与 MES：放行与状态同步

## 7. 实施清单（最小可用）
- 样本/方法/规格主数据上线、编码规则与校验、首批方法模板、结果回写与复核闭环、仪器/SDMS 连接一条链路、报表与看板 1-2 个。

—— 系列第 02 篇，下一篇：ELN、方法数字化与 LES。
