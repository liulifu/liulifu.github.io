# 企业备份与容灾：Veritas NetBackup + Data Domain + Quantum 实战

本文简介企业级备份/容灾体系，基于 Veritas NetBackup（NBU）为核心调度，集成 Dell EMC Data Domain（DD Boost/OST）作为磁盘归档池，并引入 Quantum Scalar 磁带库用于长期离线归档，给出关键概念、部署步骤与命令示例。

---

## 1. 架构与角色

- NBU Master Server：目录/策略/调度/元数据（EMM）
- NBU Media Server：数据传输与存储管理（连接 DD 与磁带）
- Clients：业务主机（数据库/文件/虚拟化）
- 存储：
  - Data Domain：作为 OST 存储服务器（DD Boost），高去重吞吐
  - Quantum Scalar（或 DXi）：作为磁带机器人（TLD），长期保留与离线
- 建议：
  - 使用 SLP（Storage Lifecycle Policy）实现“先落 DD→周期性复制到带库”
  - 备份网与业务网分离，使用并行流提升吞吐

---

## 2. 安装与前置

- 端口：确保 PBX(1556)、vnetd(13724)、bpcd(13782) 等连通
- 安装 NBU Master/Media（略，参考官方指南）；配置域名解析与时间同步
- 在 Media Server 安装 OST 插件（DD Boost 插件）：
```
# 以 RHEL 为例
rpm -ivh VRTSdd*.rpm    # 从 Veritas 下载匹配版本
nbdevquery -liststs     # 验证 OST 框架可用
```

---

## 3. 配置 Data Domain（DD Boost）

在 Data Domain CLI：
```
# 登录
essh sysadmin@<dd-ip>
# 启用 ddboost 并创建用户
ddboost enable
user add <nbu-user> role admin password ****
# 创建存储单元（可按业务划分）
ddboost storage-unit create su_nbu_prod user <nbu-user>
# （可选）启用分布式分段与压缩
ddboost option set distributed-segment yes
```

在 NetBackup 侧（Master/Media）：
```
# 注册 Data Domain 为存储服务器（Storage Server）
nbdevconfig -creatests -storage_server <dd-fqdn> -stype DataDomain -stype_options server=<dd-fqdn>,mode=advanced
# 创建磁盘池（Disk Pool）
nbdevconfig -createdp -stype DataDomain -storage_server <dd-fqdn> -dp DD_DP_Prod -sts su_nbu_prod
# 创建存储单元（Storage Unit）
brmservers -addmedia <media-fqdn>
nbstlutil list -U
```
或使用 Java GUI：Media and Device Management → Configure Disk Storage Servers（OST）。

---

## 4. 配置 Quantum 磁带库（Scalar）

```
# 识别机器人与驱动器（示例命令，因 HBA/OS 而异）
sg_map -i | egrep -i 'changer|tape'
# 在 NBU 中添加机器人与驱动器
tpconfig -add -robot_type tld -robot_number 0 -robothost <media-fqdn> -tsdpath /dev/sgX
# 发现驱动器并生成设备数据库
vmupdate -rt tld -rn 0 -rh <master-fqdn> -rescan
# 库盘位条目更新
townet -standalone
```
建议在库侧启用条码与分区，清洁盘位配置；将清洁任务交由 NBU 管理。

---

## 5. 策略与 SLP（示例）

- 策略：文件系统全量/增量、数据库热备、虚拟化代理（vSphere/Hyper-V）
- 示例：文件备份策略（CLI）
```
# 新建策略
echo "NEW" | bpplnew FS_Prod -v -M <master>
# 选择备份客户端
bpclient -add -client <client1> -no_hostname_alias
# 备份路径
bpplinclude FS_Prod -add /var/www
bpplinclude FS_Prod -add /etc
# 调度：周日全量、工作日增量
bpplsched FS_Prod -add Full -st FULL -freq 604800 -maxmpx 4 -residence Any
bpplsched FS_Prod -add Incr -st INCR -freq 86400 -maxmpx 4 -residence Any
```
- SLP：
```
# 创建 SLP：落盘到 DD，7 天后复制到带库、保留 12 个月
nbstl FS2Tape -add_version
nbstl FS2Tape -add_primary_operation Backup -storage DD_STU -retention 1w
nbstl FS2Tape -add_secondary_operation Duplication -storage TAPE_STU -retention 12m -start_window 22:00-06:00
nbstl FS2Tape -active 1
```

---

## 6. 验证与排错

```
# 连通性与证书
bptestbpcd -client <client>
bptestnetconn -host <media-fqdn>

# 作业状态
tphoenix -status | head
bpdbjobs -summary

# OST 存储
nbdevquery -liststs -U
nbdevquery -listdv -stype DataDomain -U

# 日志与错误
bperror -problems -hours 4
```

---

## 7. 最佳实践

- 备份网：独立 VLAN 与万兆链路；启用并发数据流（多数据流）
- 客户端与策略：按业务与 RPO/RTO 分层；数据库使用原厂代理/在线热备
- 去重与加密：在 DD 侧开启压缩/加密；在 NBU 中设置客户端/传输加密
- SLP：合理窗口，避免带库/网络拥塞；定期做恢复演练
- 监控：NBU 作业告警、DD 容量告警、带库介质健康（清洁/寿命）
