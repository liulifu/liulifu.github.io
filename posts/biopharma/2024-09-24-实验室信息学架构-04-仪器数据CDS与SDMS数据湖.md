# 实验室信息学架构（04）仪器数据、CDS 与 SDMS、数据湖

> 仪器是数据的源头：如何稳定采集、标准化元数据、长期可用与可再分析，是本篇重点。

## 1. 数据来源与采集模式
- 控制软件直出（CDS/控制软件导出）：结果与报告文件
- 原始通道/谱图：需保留原始、处理、报告多层级
- 适配器：文件夹监听、驱动/SDK、网络协议（如 OPC-UA、SiLA2）

## 2. SDMS 的职责
- 落地：将原始文件按策略写入受控存储（不可篡改策略+指纹）
- 元数据：文件名规范、伴随 JSON/CSV 清单、目录层级编码
- 清单与溯源：样本/方法/批次/设备/时间等键，建立链接回 LIMS/LES
- 生命周期：保留/归档/冻结/销毁策略与审批

## 3. 元数据与命名示例
```text
/<domain>/<year>/<project>/<instrument>/<method>@v3/
  S-2025-000123_ASSAY_Run001/
    raw/  (厂商原始)
    proc/ (处理结果)
    rpt/  (报告与签名)
    manifest.json  (元数据与指纹)
```

manifest.json 片段：
```json
{
  "sample": "S-2025-000123",
  "method": "HPLC-ASSAY@v3",
  "instrument": "HPLC-01",
  "run": 1,
  "hash": {"raw": "sha256:...", "rpt": "sha256:..."},
  "created_at": "2025-11-11T10:20:00Z"
}
```

## 4. 数据湖/湖仓与再分析
- 原始与处理分层、冷热分层
- 结构化/半结构化（Parquet/Delta/Iceberg）
- 标签与权限：样本/项目/敏感级别标签贯穿
- 再分析：重处理管线、可追溯环境镜像（容器化/Notebook）

## 5. 标准与互操作
- 格式与模型：AnIML、Allotrope、mzML、nmrML 等
- 接口与协议：SiLA2、OPC-UA、REST/Webhook、消息队列

## 6. 质量与安全
- 防篡改与只读保留策略
- 指纹与完整性校验（hash/签名）
- 审计与访问控制日志

—— 系列第 04 篇，下一篇：合规与验证（21 CFR Part 11 / Annex 11、CSV/CSA）。
