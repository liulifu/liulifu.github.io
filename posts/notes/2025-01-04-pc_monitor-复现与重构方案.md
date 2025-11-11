# pc_monitor 复现与重构方案

更新时间：2025-11-11  作者：Lifu

---

## 概述
pc_monitor 是一套 Windows 电脑监控系统：电源/系统/网络监控，电源拔出自动拍照，详细日志与 HTML 报告，GUI 与系统托盘，完整配置管理与开机自启动。本文给出可复现与重构路径。

## 功能要点（来自 README）
- 电源监控：交流/电池、充放电、拔出事件、低电量告警
- 自动拍照：相机延迟/质量/格式可配，保存到目录
- 系统监控：开关机、运行时长、CPU/内存/磁盘
- 网络监控：DNS 连通性
- 日志系统：多级别、按大小滚动
- 报告生成：每日 HTML，含 24h 事件与截图/照片
- GUI 与托盘：仪表盘/日志/照片/设置、最小化到托盘、通知
- 配置管理：config.json 全量配置，支持自启动

## 目录与模块（来自 README）
```
pc_monitor/
├── main.py                 # 入口
├── config.json             # 配置
├── requirements.txt        # 依赖
├── config_manager.py       # 配置管理
├── logger.py               # 日志
├── power_monitor.py        # 电源
├── system_monitor.py       # 系统
├── camera_capture.py       # 相机
├── report_generator.py     # 报告
├── gui.py                  # GUI
└── autostart.py            # 自启动
```

## 环境与依赖
```powershell
cd C:\Users\lifu.liu\code\cmd\pc_monitor
pip install -r requirements.txt
```
- 首次运行需允许相机权限

## 运行与验证
```powershell
python main.py
```
- 仪表盘：电源/CPU/内存/时长/最近事件
- 事件日志：按时间顺序刷新
- 照片：captures/ 目录与 GUI 列表
- 报告：手动按钮或定时到 reports/
- 托盘：关闭窗口→到托盘；双击恢复；右键菜单退出

## 配置要点（config.json）
- general：auto_start、minimize_to_tray、start_minimized
- monitoring：enable_power_monitor/enable_camera_capture/enable_network_monitor/enable_system_events、camera_delay_seconds
- camera：camera_index、image_quality、image_format、save_path
- logging：log_level、log_path、max_log_size_mb、backup_count
- report：enable_daily_report、report_time、report_path、report_format、include_screenshots
- notifications：enable_tray_notifications、show_power_change/show_network_change/show_system_events

## 重构/复现计划（建议里程碑）
- M1 事件主线与最小监控（1-2 天）
  - 搭建事件总线+统一日志；电源/系统/网络最小闭环；相机拍照流水线
  - 默认配置/向后兼容；GUI 状态与日志视图
- M2 报告与托盘（1-2 天）
  - HTML 报告模板/生成；托盘交互/系统通知；日志滚动策略
- M3 健壮性与生态（1-2 天）
  - 相机占用与异常恢复；自启动与权限提示；单测与端到端验收脚本

## 验收清单
- 电源拔出触发拍照；低电量告警可见
- 报告按时/按需生成，含图片与统计
- 日志滚动与大小限制生效
- GUI/托盘交互与通知可靠

## 一键复现（示例）
```powershell
cd C:\Users\lifu.liu\code\cmd\pc_monitor
pip install -r requirements.txt
python main.py
```



## 依赖与版本（精确）
```text
PyQt6>=6.6.0
opencv-python>=4.8.0
psutil>=5.9.0
Pillow>=10.0.0
pywin32>=306
wmi>=1.5.0
```

## 配置文件（当前默认/示例：config.json）
```json
{
    "general": {
        "app_name": "PC Monitor",
        "version": "1.0.0",
        "auto_start": false,
        "minimize_to_tray": true,
        "start_minimized": false
    },
    "monitoring": {
        "enable_power_monitor": true,
        "enable_camera_capture": true,
        "enable_network_monitor": true,
        "enable_system_events": true,
        "camera_delay_seconds": 3,
        "capture_mode": "video"
    },
    "camera": {
        "camera_index": 0,
        "image_quality": 95,
        "image_format": "jpg",
        "save_path": "captures",
        "use_windows_camera": false,
        "warmup_frames": 15,
        "warmup_delay": 3
    },
    "video": {
        "video_save_path": "videos",
        "video_duration_seconds": 20,
        "video_fps": 30,
        "video_codec": "mp4v",
        "video_quality": 95
    },
    "logging": {
        "log_level": "INFO",
        "log_path": "logs",
        "max_log_size_mb": 10,
        "backup_count": 5
    },
    "report": {
        "enable_daily_report": true,
        "report_time": "12:00",
        "report_path": "reports",
        "report_format": "html",
        "include_screenshots": true
    },
    "notifications": {
        "enable_tray_notifications": true,
        "show_power_change": true,
        "show_network_change": true,
        "show_system_events": true
    }
}
```

- 配置文件路径：项目根目录下的 `config.json`
- 常用参数建议：
  - camera_delay_seconds：默认 3 秒预热，低光环境可增大
  - image_quality：95；image_format：jpg；save_path：captures
  - video_duration_seconds：20；video_fps：30；video_codec：mp4v
  - report_time：12:00；report_format：html；include_screenshots：true
  - log_level：INFO；max_log_size_mb：10；backup_count：5
  - enable_* 开关：均可按需关闭以降低资源占用
