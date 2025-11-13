# 服务器 RAID 配置实战：以 Dell PERC (perccli/storcli) 为例

本文以 Dell PERC 控制器为例（命令与 LSI/Broadcom 的 storcli/perccli 兼容），介绍从规划到落地的 RAID 配置与维护流程，覆盖创建虚拟盘、初始化、热备、故障更换与重建、策略调优等常见操作，附完整命令行样例。

---

## 1. 规划与命名

- 目标：
  - OS 盘：RAID1（2 块 SSD）
  - 数据盘：RAID10（4~8 块）
  - 热备：1 块 Global Hot Spare（可跨阵列）
- 命名：控制器 c0，机笼 e32（示例），插槽 sX，如 32:0 表示机笼 32 的 0 号槽位
- 策略：写缓存（WB）+ 读预读（RA）+ Direct IO；必要时启用磁盘高速缓存（需断电保护）

---

## 2. 工具准备

- Linux 下载：
```
# 任选其一（不同发行版路径可能不同）
wget https://…/perccli-linux.tar.gz && tar xzf perccli-linux.tar.gz
sudo cp perccli64 /usr/local/bin/perccli
# 或 storcli64
```
- 查看版本与控制器
```
perccli /c0 show
perccli show ctrl
```

---

## 3. 发现硬盘与外来配置
```
# 列出所有物理盘（enclosure:eId/slot:sId）
perccli /c0/eall/sall show

# 外来配置（Foreign）清理（小心数据！）
perccli /c0 /fall delete
```

---

## 4. 创建阵列与虚拟磁盘（VD）

### 4.1 OS：RAID1
```
# 以 e32 槽位 0 和 1 为例
a=32:0;b=32:1
perccli /c0 add vd r1 size=all drives=$a,$b name=OS wb ra direct
```

### 4.2 数据：RAID10
```
# 以 e32 槽位 2,3,4,5 为例（两两条带）
perccli /c0 add vd r10 size=all drives=32:2,32:3,32:4,32:5 name=DATA wb ra direct
```

### 4.3 设置热备（Global Hot Spare）
```
perccli /c0/e32/s7 set di=hotspare
```

### 4.4 策略与初始化
```
# 策略：写回/读预读/直写
a=OS; b=DATA
perccli /c0/vd all set wrcache=wb
perccli /c0/vd all set rdcache=ra
perccli /c0/vd all set direct=on

# 后台初始化（BGI）
perccli /c0/vd all start init
perccli /c0/vd all show init
```

---

## 5. 操作系统层面
```
# 查看块设备
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT
# GPT 分区并创建文件系统
parted /dev/sdb --script mklabel gpt mkpart primary ext4 0% 100%
mkfs.ext4 /dev/sdb1
# 挂载与持久化
mkdir -p /data && echo '/dev/sdb1 /data ext4 defaults 0 2' >> /etc/fstab && mount -a
```

---

## 6. 监控与健康检查
```
# 控制器/虚拟盘/物理盘健康
perccli /c0 show
perccli /c0/vall show
perccli /c0/eall/sall show

# 点亮/熄灭指示灯（定位盘位）
perccli /c0/e32/s5 start locate
perccli /c0/e32/s5 stop locate
```

---

## 7. 故障更换与重建（典型流程）

1) 标记故障盘并定位：
```
perccli /c0/e32/s5 show
perccli /c0/e32/s5 start locate
```
2) 物理更换磁盘（容量不小于原盘）
3) 控制器自动触发重建或手动指定：
```
perccli /c0/e32/s5 set rebuild
perccli /c0/vall show rebuild
```
4) 验证阵列状态恢复 Optimal

---

## 8. JBOD/直通与 HBA 模式（可选）
```
# 将物理盘设为 JBOD 供上层软件（如 ZFS/Ceph）直接使用
perccli /c0/e32/sall set jbod
# 或将控制器切换为 HBA IT 模式（视机型支持与固件而定）
```

---

## 9. 备份配置与导入导出
```
# 导出控制器配置（备份）
perccli /c0 show config > /root/perc_config_$(date +%F).txt
# 另可使用：perccli /c0/cv show all
```

---

## 10. 注意与最佳实践

- 写缓存策略：仅在具备 BBU/超级电容保护时启用写回（WB）
- 一致性校验：定期巡检（Consistency Check），在业务低峰执行
- 固件与驱动：保持 PERC 与磁盘固件在支持列表版本
- 监控：将 `perccli` 巡检结果纳入监控告警（Zabbix/Prometheus 自定义采集）
- 变更：创建/删除/清外来配置前务必确认磁盘与卷身份，避免误操作
