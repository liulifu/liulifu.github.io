# fengbi PDF 工具套件：抽取/清洗/分割/偏移 复现与重构方案

更新时间：2025-11-11  作者：Lifu

---

## 概述
fengbi 是一组面向 PDF 目录抽取与文档分割的实用脚本集合，来源于《中国药典》等大体量 PDF 的工程实践，覆盖：
- 目录抽取与清洗：从 PDF 生成目录 JSON，清洗/去重，合并为全量 combined_catalog.json
- 驱动目录的批量分割：按目录标题→页码区间拆分整本 PDF
- 偏移分割：当“目录页码”和“PDF 实际页码”存在偏移时，按部设置 offset 后再分割
- 三部专用拆分：对已做过页码校准的“三部”PDF，直接按目录文本无偏移拆分
- GUI：提供简单 GUI 分割器（tkinter）

## 目录与组件
- pdf_content_extractor.py：目录文字抽取，生成 catalog_results.json
- pdf_catalog_cleaner.py：目录清洗/去重/合并，生成 cleaned_catalog.json、combined_catalog.json
- catalog_viewer.py：查看/搜索/统计/导出目录数据
- pdf_catalog_splitter.py：按 cleaned_catalog.json 批量分割
- pdf_catalog_splitter_with_offset.py：按 pianyi.txt 偏移分割
- pdf_sanbu_splitter.py：三部专用分割（无偏移，使用 yaodian/三部目录.txt）
- pdf_splitter_cli.py：通用 PDF 按页区间分割的 CLI
- pdf_splitter_gui.py：通用 PDF 分割 GUI
- 其它：bulk_mtime_set.py（批量统一 mtime）

## 环境与依赖（CPU）
```text
Python 3.8+
PyPDF2>=3.0.0
# GUI 需 tkinter（大多数官方 Python 自带）
```
安装：
```powershell
pip install -r requirements.txt
# 或：pip install PyPDF2
```

## 快速使用
- 目录抽取/清洗/查看
  - `python pdf_content_extractor.py`
  - `python pdf_catalog_cleaner.py`
  - `python catalog_viewer.py stats | list | search 关键词 | export`
- 目录驱动分割（无偏移）
  - `python pdf_catalog_splitter.py`
- 目录驱动分割（有偏移，读取 pianyi.txt）
  - `python pdf_catalog_splitter_with_offset.py`
- 三部专用分割（已打包好页码的 PDF）
  - `python pdf_sanbu_splitter.py`
- 通用 CLI 分割（按区间）
  - `python pdf_splitter_cli.py input.pdf -r "1-5,6-10,15-20" -o output_folder`
- GUI 分割
  - `python pdf_splitter_gui.py`（或 `pythonw.exe pdf_splitter_gui.py`）

## 数据与配置
- yaodian/三部目录.txt（带表头，制表符分隔）
  - 形如：`序号\t标题\t页码`，如 `14\t某标题\t57`
- pianyi.txt（每行“部名：偏移”）
  - 示例：
    - `中国药典一部：21`
    - `中国药典二部：2`
- 输出与中间文件
  - 目录 JSON：catalog_results.json、cleaned_catalog.json、combined_catalog.json
  - 分割结果：split_output_test/、split_sanbu_output/、split_sanbu_output_correct/

## 一键复现（示例）
```powershell
cd C:\Users\lifu.liu\OneDrive - [REDACTED]\PortableSoftwareDir\fengbi
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# 目录→清洗→查看
python pdf_content_extractor.py
python pdf_catalog_cleaner.py
python catalog_viewer.py stats
# 按目录分割（无偏移）
python pdf_catalog_splitter.py
```

## 重构建议（可选）
- 统一命令行入口（typer/click）：extract/clean/split/sanbu/offset/test
- 配置模型化（pydantic/dataclasses），支持 YAML/JSON 配置文件
- 统一日志（logging + 文件/控制台双通道）与编码（UTF-8）
- 针对大 PDF 的流式处理/并行策略；必要时引入 PyMuPDF 以加速
- 单元测试：目录解析/页码计算/偏移应用/文件命名规则

