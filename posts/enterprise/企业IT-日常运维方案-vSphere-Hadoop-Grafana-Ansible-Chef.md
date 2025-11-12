# 企业 IT 日常运维方案：vSphere / Hadoop / Grafana / Ansible / Chef

本文面向企业 IT/运维工程师，覆盖 vSphere、Hadoop、Grafana、Ansible、Chef 的日常使用方案。包含：基础命令速查、常见运维操作、实用示例与最佳实践。可直接用于排障、日常巡检与标准化运维。

---

## vSphere（vCenter/ESXi）

适用对象：虚拟化平台日常管理（主机/集群/数据存储/虚拟机）。推荐在运维主机安装 VMware PowerCLI（Windows/PowerShell）或使用 govc（跨平台 CLI）。

- 常用环境变量（govc）
```bash
# Linux/macOS
export GOVC_URL="https://vcenter.example.com"
export GOVC_USERNAME="administrator@vsphere.local"
export GOVC_PASSWORD="******"
export GOVC_INSECURE=1    # 如为自签名证书

# Windows PowerShell
$env:GOVC_URL = "https://vcenter.example.com"
$env:GOVC_USERNAME = "administrator@vsphere.local"
$env:GOVC_PASSWORD = "******"
$env:GOVC_INSECURE = "1"
```

- 资源查看与检索（govc）
```bash
# 数据中心/集群/主机/存储/网络
govc datacenter.info
govc cluster.info
govc host.info
govc datastore.info
govc ls /dc1/network

# 查找 VM
govc find / -type m -name '*app*'
# VM 基本信息
govc vm.info -json myvm | jq '.'
```

- 虚机生命周期（govc）
```bash
# 从模板克隆
govc vm.clone -vm "tmpl-ubuntu-22" -on=true \
  -ds "datastore1" -net "VM Network" \
  -folder "/DC1/vm/APP" -pool "/DC1/host/Cluster/Resources/Prod" \
  "app-web-01"

# 调整配置（CPU/Mem/网卡）
govc vm.change -vm app-web-01 -c 4 -m 8192
govc device.ls -vm app-web-01

# 电源与工具
govc vm.power -on  app-web-01
govc vm.power -off app-web-01
govc vm.tools -vm app-web-01
```

- 快照与迁移（govc）
```bash
# 快照
govc snapshot.create -vm app-web-01 before-patch
govc snapshot.tree   -vm app-web-01
govc snapshot.revert -vm app-web-01 -s before-patch
govc snapshot.remove -vm app-web-01 -s before-patch

# Storage vMotion / vMotion（需许可与资源）
# 迁移到其他数据存储
govc vm.migrate -vm app-web-01 -ds datastore2
# 迁移到其他主机（同集群）
govc vm.migrate -vm app-web-01 -host esxi02.local
```

- 主机维护与数据存储（govc）
```bash
# 进入/退出维护模式
govc host.maintenance.enter -host esxi01.local
govc host.maintenance.exit  -host esxi01.local

# 数据存储空间与文件
govc datastore.info -json datastore1 | jq '.'
govc datastore.ls -ds datastore1
```

- PowerCLI 常见操作（Windows PowerShell）
```powershell
Import-Module VMware.PowerCLI
Connect-VIServer -Server vcenter.example.com -User administrator@vsphere.local -Password ******

# 查找/开关机/克隆
Get-VM -Name *app* | Select Name,PowerState
Stop-VM -VM app-web-01 -Confirm:$false
Start-VM -VM app-web-01
New-VM -Name app-web-02 -VMHost esxi02 -Template tmpl-ubuntu-22 -Datastore datastore1

# 快照
New-Snapshot -VM app-web-01 -Name before-patch
Get-Snapshot -VM app-web-01 | Remove-Snapshot -Confirm:$false
```

- 常见运维场景
  - 批量补丁前创建快照、完成后删除快照
  - VM 扩容（vCPU/内存/磁盘）与在线热添加校验
  - vMotion/Storage vMotion 减少停机迁移
  - ESXi 维护模式配合 DRS 自动迁移
  - 定期清理僵尸快照与未挂载 ISO

---

## Hadoop（HDFS/YARN）

- HDFS 基本命令
```bash
# 目录与空间
hdfs dfs -ls -h /data
hdfs dfs -du -h /data/project
hdfs dfs -count -q /data/project

# 读写与权限
hdfs dfs -mkdir -p /data/project/input
hdfs dfs -put file.csv /data/project/input/
hdfs dfs -get /data/project/output/part-00000 ./result.txt
hdfs dfs -rm -r -skipTrash /data/tmp/*
hdfs dfs -chmod -R 750 /data/project
hdfs dfs -chown -R app:app /data/project

# 健康与状态
hdfs dfsadmin -report
hdfs fsck / -files -blocks -locations | head -n 50
hdfs dfsadmin -safemode get|enter|leave
```

- YARN/MapReduce
```bash
# 应用/队列/节点
yarn application -list
yarn application -status application_1731234567890_0010
yarn node -list

# 日志
yarn logs -applicationId application_1731234567890_0010 | less
```

- 集群管理（按部署方式）
```bash
# 基于脚本（Apache 原生）
start-dfs.sh && start-yarn.sh
stop-yarn.sh && stop-dfs.sh

# 基于 systemd（视发行版服务名）
sudo systemctl status hadoop-hdfs-namenode
sudo systemctl restart hadoop-hdfs-namenode
sudo systemctl restart hadoop-yarn-resourcemanager
```

- 常见运维场景
  - 扩容 DataNode：在 workers/slaves 增加主机 → 启动 DataNode → hdfs dfsadmin -report 校验
  - 下线 DataNode：配置 exclude 文件 → hdfs dfsadmin -refreshNodes → 等待迁移完成
  - 负载均衡：`hdfs balancer -threshold 10`
  - NN HA 切换：`hdfs haadmin -getServiceState nn1` / `hdfs haadmin -failover nn1 nn2`
  - 清理小文件与合并输出（使用 DistCp / Hive / Spark 侧合并）
  - 定期容量巡检、Top N 占用：
```bash
hdfs dfs -du -h / | sort -hr | head -n 20
```

---

## Grafana（监控与告警）

- 常见路径与服务
```bash
# 配置/数据/服务
/etc/grafana/grafana.ini
/etc/grafana/provisioning/{datasources,dashboards}
/var/lib/grafana/grafana.db  # 默认 SQLite
sudo systemctl restart grafana-server
```

- 插件与管理
```bash
# 插件
sudo grafana-cli plugins ls
sudo grafana-cli plugins install grafana-piechart-panel
sudo systemctl restart grafana-server

# 管理员密码（环境变量或 ini）
# grafana.ini: [security] admin_user, admin_password
```

- 通过 API 创建 Prometheus 数据源
```bash
curl -X POST http://admin:admin@localhost:3000/api/datasources \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Prometheus",
    "type":"prometheus",
    "url":"http://prometheus:9090",
    "access":"proxy",
    "isDefault":true
  }'
```

- 通过 API 备份/导入仪表盘
```bash
# 导出
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
  http://localhost:3000/api/dashboards/uid/abcd1234 | jq '.dashboard' > dash.json

# 导入
curl -X POST -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"dashboard":'"$(cat dash.json)"',"overwrite":true}' \
  http://localhost:3000/api/dashboards/db
```

- 迁移到 MySQL/PostgreSQL（可选）
```ini
# grafana.ini
[database]
;type = mysql
;host = 127.0.0.1:3306
;name = grafana
;user = grafana
;password = ******
```

- 常见运维场景
  - 首次接入：通过 Provisioning 编写数据源/仪表盘 YAML，随服务自动加载
  - 备份恢复：备份 grafana.db 或切换外部数据库；导出/导入 Dashboard JSON
  - 告警：统一在 Alerting 配置联系点（Webhook/Email/DingTalk），并在面板上定义规则

---

## Ansible（自动化运维）

- Inventory 与连通性
```ini
# inventory.ini
[web]
web01 ansible_host=10.0.0.11 ansible_user=ubuntu
web02 ansible_host=10.0.0.12 ansible_user=ubuntu

[db]
db01 ansible_host=10.0.1.10 ansible_user=postgres
```
```bash
ansible -i inventory.ini all -m ping
ansible-inventory -i inventory.ini --graph
```

- 常用 ad-hoc 操作
```bash
# 包/服务/文件
ansible web -i inventory.ini -b -m apt -a "name=nginx state=present update_cache=yes"
ansible web -i inventory.ini -b -m service -a "name=nginx state=restarted"
ansible web -i inventory.ini -b -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf backup=yes"
```

- Playbook 示例
```yaml
# site.yml
- hosts: web
  become: true
  tasks:
    - name: Install and start nginx
      apt:
        name: nginx
        state: present
        update_cache: yes
    - name: Deploy config
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        backup: yes
      notify: restart nginx
  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
```
```bash
ansible-playbook -i inventory.ini site.yml --check --diff
ansible-playbook -i inventory.ini site.yml --limit web01 -t deploy
```

- Vault 与 Galaxy
```bash
# 机密加密
ansible-vault create secrets.yml
ansible-vault view   secrets.yml

# 角色管理
ansible-galaxy init role_web
ansible-galaxy install geerlingguy.nginx
```

- 常见运维场景
  - 批量修复：用 ad-hoc 快速执行一次性命令（如调整时区/内核参数）
  - 标准化：Playbook + Roles 按环境分层（group_vars/host_vars）
  - 变更安全：--check 预演、--diff 查看差异，分批（--limit）执行

---

## Chef（配置管理）

- 基础命令
```bash
# Workstation 初始化
chef --version
knife configure

# 引导节点（SSH）
knife bootstrap 10.0.0.21 -N web01 -x ubuntu --ssh-password ****** --sudo

# 节点与 Cookbooks
knife node list
knife cookbook create myapp -o cookbooks
knife cookbook upload myapp
```

- Recipe 示例（myapp/recipes/default.rb）
```ruby
package 'nginx' do
  action :install
end

service 'nginx' do
  action [:enable, :start]
end

cookbook_file '/usr/share/nginx/html/index.html' do
  source 'index.html'
  owner 'root'
  group 'root'
  mode '0644'
end
```

- Policyfile（推荐替代环境+角色的依赖锁定）
```ruby
# Policyfile.rb
name 'myapp'
default_source :supermarket
run_list 'myapp::default'
cookbook 'myapp', path: './cookbooks/myapp'
```
```bash
chef install
chef export . ./policy_export
```

- 常见运维场景
  - 批量变更：更新 cookbook → `knife cookbook upload` → 节点 `chef-client` 周期拉取
  - 分层治理：Policyfile/环境分支；数据包（data bag）存放密钥与配置
  - 巡检与修复：`ohai` 采集事实；`chef-client -o 'recipe[myapp::fix]'` 指定一次性修复

---

## 备注与建议
- 统一凭据与敏感信息管理（Vault/KMS/Secret Manager），避免明文出现在脚本中
- 灰度与分批：从 1 台 → 10% → 50% → 全量，配合监控与回滚
- 将关键操作沉淀为标准作业脚本与 Playbook/Cookbook，纳入 CI
- 建立变更前后“基线快照”（vSphere 快照 / HDFS 状态 / Grafana Dashboard 导出）以便快速回滚

