---
layout: post
title: "paddleocrproject 复现与重构方案"
date: 2025-09-05
categories: notes
author: Lifu
---

# paddleocrproject 复现与重构方案

更新时间：2025-11-11  作者：Lifu

---

## 概述
paddleocrproject 提供 PDF→TXT/JSON 的批处理能力，支持 CLI 与 GUI 面板、可暂停的队列执行、速度/质量报告，针对 Windows/CPU 环境做了“无黑窗口”优化（统一使用 pythonw.exe + CREATE_NO_WINDOW）。

## 目录与组件（来自仓库）
- 顶层脚本：restart_gui.py、check_status.py、start_gui.py、start_worker.py
- 核心/CLI：ocr_app（init/enqueue/run-worker/status/report/ocr-one）
- 脚本：scripts/gui_panel.py、run_batches.py、queue_monitor.py、sample_ocr.py、small_batch_test.py
- 存储：state/queue.db、state/pause.flag
- 输出：outputs/pocr_txt、outputs/runs/…
- 日志：logs/worker、logs/runner、logs/monitor、logs/failed
- 报告：reports/*.md
- 测试：tests/test_layout_order.py（双栏排序单测全过）

## 环境与依赖（CPU）
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -U paddlepaddle paddleocr pymupdf
python -c "import fitz; from paddleocr import PaddleOCR; print('OK')"
```

## 快速使用
- 启动 GUI：`python restart_gui.py`
- 查看状态：`python check_status.py`
- 启动 Worker：`python start_worker.py`

## CLI 常用命令（ocr_app）
```powershell
.\.venv\Scripts\python -m ocr_app.cli init
.\.venv\Scripts\python -m ocr_app.cli ocr-one --pdf "yaodian_2bu/示例.pdf" --zoom 1.6 --header-ratio 0.06 --footer-ratio 0.08
.\.venv\Scripts\python -m ocr_app.cli enqueue --dir yaodian_2bu --limit 200 --dedup
.\.venv\Scripts\python -m ocr_app.cli run-worker --max-jobs 200 --zoom 1.6 --header-ratio 0.06 --footer-ratio 0.08 --job-timeout 240
.\.venv\Scripts\python -m ocr_app.cli report --out reports/queue_speed_report.md --fold-by-name
```

## 关键实现要点
- GUI 面板：500ms 计数刷新 + 2s 日志聚合；打开目录/帮助菜单
- 队列模型：SQLite queue.db；state/pause.flag 可暂停；run_batches 自动分批
- OCR 策略：PaddleOCR mobile + PyMuPDF 渲染；页眉过滤（header_ratio）、页脚捕获（footer_ratio→JSON）
- 日志：控制台 INFO + 文件 DEBUG（utf-8-sig，PowerShell 5 兼容）

## 重构/复现计划（建议里程碑）
- M1 最小流水线（1-3 天）
  - ocr-one + 目录初始化 + 基础日志；生成 txt 与 page-footers JSON
- M2 队列与面板（1-2 天）
  - enqueue/run-worker/status/report；GUI 面板、黑窗口优化与进程管理
- M3 工程化（1-2 天）
  - run_batches 挂机全库；Tail/查询优化；异常恢复与告警（可选）

## 验收清单
- 20 个 PDF 小批量跑通，生成报告与 JSON（页码/页脚）
- 队列 200 任务流畅运行，GUI 指标刷新无阻塞
- 日志编码正确（无中文乱码）

## 一键复现（示例）
```powershell
cd C:\Users\lifu.liu\code\paddleocrproject
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -U paddlepaddle paddleocr pymupdf
python restart_gui.py
python start_worker.py
```



## 依赖与版本（精确）
```text
# Core OCR stack
paddlepaddle
paddleocr
pymupdf

# GUI (optional)
PyQt6
```

## 推荐参数与默认值
- 基础放大：`--zoom 1.6`
- 页眉过滤：`--header-ratio 0.06`
- 页脚捕获：`--footer-ratio 0.08` → 生成 page-footers JSON
- 任务超时：`--job-timeout 240`
- 单批最大任务：`--max-jobs 200`
