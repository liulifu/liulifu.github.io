# Ansible 企业实战方案：中型企业从安装到策略落地（含命令）

本文以“中型企业 IT 运维”为场景，虚拟构建一套典型的业务与网络拓扑，演示如何用 Ansible 从 0 到 1 完成安装、分层规划、基础配置、网络与安全、应用发布与监控接入，面向初学者提供实际可复用的命令与清单样例。

---

## 1. 场景与拓扑（虚拟企业）

- 总部（HQ）与一处机房（DC），两环境（prod/dev），一跳堡垒机（bastion）
- 业务：Nginx Web 前端、Java 应用、PostgreSQL 数据库、Redis、对象存储网关
- 网络与 VLAN（示例）
  - 管理网 10.10.0.0/24（bastion/跳板与 Ansible 控制端）
  - 生产区 10.10.10.0/24，开发区 10.10.20.0/24
  - 数据库区 10.10.30.0/24，存储/备份区 10.10.40.0/24

ASCII 拓扑（简化）：

```
Laptop -> VPN -> Bastion(10.10.0.10) -> { prod, dev }
                                   \-> DB(10.10.30.x)
                                     -> Web/App(10.10.10.x / 20.x)
```

---

## 2. 安装与基础准备

### 2.1 安装 Ansible（建议虚拟环境）

- Ubuntu/Debian
```
sudo apt update && sudo apt install -y python3-venv python3-pip
python3 -m venv ~/.venvs/ansible && source ~/.venvs/ansible/bin/activate
pip install --upgrade pip && pip install ansible==9.* ansible-lint
ansible --version
```
- RHEL/CentOS/Rocky
```
sudo dnf install -y python3 python3-pip
python3 -m venv ~/.venvs/ansible && source ~/.venvs/ansible/bin/activate
pip install --upgrade pip && pip install ansible==9.*
```

### 2.2 目录结构（推荐）
```
enterprise-ansible/
├─ ansible.cfg
├─ inventories/
│  ├─ prod/hosts.ini
│  └─ dev/hosts.ini
├─ group_vars/{all,prod,dev}.yml
├─ host_vars/
├─ roles/
│  ├─ base_hardening/{tasks,templates,files}
│  ├─ linux_network/{tasks,templates}
│  ├─ web_nginx/{tasks,templates}
│  ├─ db_postgresql/{tasks,templates}
│  └─ exporters_node/{tasks,templates}
└─ site.yml
```

### 2.3 ansible.cfg（示例）
```
[defaults]
inventory = inventories/prod/hosts.ini
forks = 20
timeout = 30
host_key_checking = False
interpreter_python = auto_silent
retry_files_enabled = False
stdout_callback = yaml
```

### 2.4 SSH 与提权
```
# ~/.ssh/config（跳板）
Host bastion
  HostName 10.10.0.10
  User ops
Host 10.10.*.*
  ProxyJump bastion

# 目标机提供 sudo 权限（免密码或限命令）
```

---

## 3. 清单（Inventory）与分组

inventories/prod/hosts.ini：
```
[web]
web01 ansible_host=10.10.10.11 env=prod
web02 ansible_host=10.10.10.12 env=prod

[app]
app01 ansible_host=10.10.10.21 env=prod

[db]
db01 ansible_host=10.10.30.31 env=prod pg_role=primary

[all:vars]
ansible_user=ops
ansible_become=true
```

group_vars/all.yml（基础参数）：
```
ntp_servers: [time1.aliyun.com, time2.aliyun.com]
timezone: Asia/Shanghai
ssh_allow_groups: [ops]
firewall_allowed:
  - { port: 22, proto: tcp }
  - { port: 80, proto: tcp }
  - { port: 443, proto: tcp }
```

group_vars/prod.yml（生产偏好）：
```
packages_common: [vim, curl, htop, chrony]
```

---

## 4. 角色与任务（示例）

### 4.1 基线加固：roles/base_hardening/tasks/main.yml
```
- name: 设置时区
  community.general.timezone:
    name: "{{ timezone }}"

- name: 安装基础包
  ansible.builtin.package:
    name: "{{ packages_common }}"
    state: present

- name: 启用并配置 chrony
  ansible.builtin.service:
    name: chronyd
    state: started
    enabled: true

- name: 加固 sshd
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^#?PasswordAuthentication'
    line: 'PasswordAuthentication no'
    backup: yes
  notify: Restart sshd

- name: 配置防火墙（以 firewalld 为例）
  ansible.posix.firewalld:
    port: "{{ item.port }}/{{ item.proto }}"
    permanent: true
    immediate: true
    state: enabled
  loop: "{{ firewall_allowed }}"

- name: 收集资产（facts）到文件
  ansible.builtin.copy:
    content: "{{ ansible_facts | to_nice_yaml }}\n"
    dest: "/var/tmp/facts_{{ inventory_hostname }}.yml"
```
handlers/main.yml：
```
- name: Restart sshd
  ansible.builtin.service:
    name: sshd
    state: restarted
```

### 4.2 网络配置：roles/linux_network/tasks/main.yml（示例）
- Ubuntu(Netplan) 创建 VLAN 接口 vlan10：
```
- name: 渲染 netplan
  ansible.builtin.template:
    src: netplan.yaml.j2
    dest: /etc/netplan/01-netcfg.yaml
  notify: Apply netplan
```
handlers：
```
- name: Apply netplan
  ansible.builtin.command: netplan apply
```
- RHEL 使用 nmcli（示例 ad-hoc）
```
ansible all -m community.general.nmcli -a \
"conn_name=vlan10 ifname=eth0.10 type=vlan vlandev=eth0 vlan_id=10 ip4=10.10.10.11/24 gw4=10.10.10.1 state=present"
```

### 4.3 Web 与数据库（示例）
roles/web_nginx/tasks/main.yml：
```
- name: 安装并启用 Nginx
  ansible.builtin.package:
    name: nginx
    state: present
- ansible.builtin.service:
    name: nginx
    state: started
    enabled: true
- name: 部署站点模板
  ansible.builtin.template:
    src: default.conf.j2
    dest: /etc/nginx/conf.d/default.conf
  notify: Reload nginx
```
handlers：
```
- name: Reload nginx
  ansible.builtin.service:
    name: nginx
    state: reloaded
```
roles/db_postgresql/tasks/main.yml（安装、初始化略）

### 4.4 导出器（监控接入）
roles/exporters_node/tasks/main.yml：
```
- name: 下载并安装 node_exporter
  ansible.builtin.unarchive:
    src: https://github.com/prometheus/node_exporter/releases/download/v1.8.1/node_exporter-1.8.1.linux-amd64.tar.gz
    dest: /opt/
    remote_src: yes
- name: 配置 systemd
  ansible.builtin.copy:
    dest: /etc/systemd/system/node_exporter.service
    content: |
      [Unit]
      Description=Node Exporter
      [Service]
      ExecStart=/opt/node_exporter-1.8.1.linux-amd64/node_exporter
      [Install]
      WantedBy=multi-user.target
- name: 启动并启用
  ansible.builtin.systemd:
    name: node_exporter
    state: started
    enabled: true
```

---

## 5. Playbook 汇总与执行

site.yml：
```
- hosts: all
  roles:
    - base_hardening
    - linux_network
    - exporters_node

- hosts: web
  roles:
    - web_nginx

- hosts: db
  roles:
    - db_postgresql
```
执行：
```
# 先做连通性与提权检查
ansible all -m ping
ansible all -m command -a 'id'

# 正式执行（以 prod 库存为例）
ANSIBLE_CONFIG=./ansible.cfg ansible-playbook -i inventories/prod/hosts.ini site.yml -t base_hardening
```

---

## 6. 常用 ad-hoc 命令与技巧

```
# 推送文件/模板
a nsible all -m copy -a "src=./file dest=/tmp/file mode=0644"
ansible web -m template -a "src=nginx.j2 dest=/etc/nginx/nginx.conf"

# 用户与密钥
ansible all -m user -a "name=deploy shell=/bin/bash state=present"
ansible all -m authorized_key -a "user=deploy key='{{ lookup('file','~/.ssh/id_rsa.pub') }}'"

# 包与服务
ansible all -m package -a "name=htop state=present"
ansible web -m service -a "name=nginx state=restarted"
```

- 机密使用 ansible-vault：
```
ansible-vault create group_vars/prod/vault.yml
# 在任务中通过 vars_files 引用，或使用 vars: vault_xxx
```

---

## 7. 策略落地与最佳实践

- 分层：inventory(环境) → group_vars(域) → role（职责） → playbook（编排）
- 变更安全：--check、--diff、分批滚动、蓝绿/金丝雀
- 审计：集中 facts、生成 CMDB（ansible-cmdb）、日志留痕
- 与监控联动：部署 exporter、接入 Alertmanager/Grafana
- 与备份联动：执行前后 Hook 与 NetBackup 备份/恢复脚本

---

## 8. 常见坑

- Python 与系统 Python 冲突：使用 venv 隔离
- SSH 跳板链路：ProxyJump，或 ansible_ssh_common_args=-o ProxyCommand
- 防火墙/SELinux：以模块管理，不手动改配置
- 幂等性：优先使用模块（package/service/template），避免裸 command/shell

