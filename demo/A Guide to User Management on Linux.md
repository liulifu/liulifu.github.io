# A Guide to User Management on Linux

Linux, being a multi-user operating system, provides robust tools for managing users and their permissions. Understanding how to create, manage, and delete users is fundamental to administering any Linux system. In this post, we'll cover some general operations you can perform to manage users on Linux.

## 1. Adding a New User

To add a new user, you can use the `useradd` command. This command allows administrators to create a new user account. For example:

```bash
sudo useradd newuser
```

This will create a user named "newuser." However, this command doesn’t set a password. To set one, use:

```bash
sudo passwd newuser
```

You’ll be prompted to enter and confirm the new password.

## 2. Managing User Groups

Groups in Linux help you assign specific permissions to users. To add a user to a group, you can use the `usermod` command. For instance, to add "newuser" to the "sudo" group, which grants administrative privileges:

```bash
sudo usermod -aG sudo newuser
```

The `-aG` option ensures that the user is added to the group without being removed from any existing groups.

## 3. Deleting a User

To remove a user account, use the `userdel` command. For example, to delete the user "newuser":

```bash
sudo userdel newuser
```

If you want to delete the user's home directory as well:

```bash
sudo userdel -r newuser
```

This will remove both the user account and the associated home directory.

## 4. Locking and Unlocking User Accounts

There may be times when you need to temporarily disable a user account without deleting it. You can use the `passwd` command to lock or unlock a user account.

To lock an account:

```bash
sudo passwd -l newuser
```

To unlock the account:

```bash
sudo passwd -u newuser
```

## 5. Viewing User Information

If you need to see information about a specific user, you can check the `/etc/passwd` file:

```bash
cat /etc/passwd
```

Each line in this file contains information about a user, such as their username, user ID (UID), and home directory.

## 6. Switching Between Users

Once multiple users are set up on a Linux system, you may need to switch between them. To do this, use the `su` command followed by the username:

```bash
su - newuser
```

After entering the user’s password, you’ll be logged in as that user.

## 7.Scripts

### Demo-1 list locked user

This demo is a VBS script for Xshell. You can either switch the core shell commands or use it directly.

```
Option Explicit
Public username

Sub Main
    ''''''''''''''''''''''''''''''''
    ' 名称：查看被锁定的用户
    ' 版本：2014-5-19
    ' 作者：Liulifu
    ''''''''''''''''''''''''''''''''
    xsh.Screen.Synchronous = true
    ' 这是避免HISTORY记录EOF的设置，让HISTORY命令忽略空格，如果在命令前加一个空格，就会忽略掉整行命令
    ' 下面每一行命令，及这个export也添加了设置。查看History时最多会显示下面这个export
    xsh.Screen.Send " export HISTCONTROL=ignorespace"
    xsh.Screen.Send VbCr

    ' 查看有哪些用户已经被锁定了
    xsh.Screen.Send " echo '---------List Locked users ------------' "
    xsh.Screen.Send VbCr

    ' 所有用户
    xsh.Screen.Send " cat /etc/shadow | grep ! | awk -F ':' '{ print $1 ,$2}'"
    ' xsh.Screen.Send " ( awk -F':' '{print $1,$7}' /etc/passwd | grep '/bin/bash' | cut -d " & """ """ & " -f 1 && ps aux | sed 1d | cut -d " & """ """ & " -f 1 | sort | uniq ) | sort | uniq -d"
    xsh.Screen.Send VbCr
    xsh.Session.Sleep 1000
    xsh.Screen.Send " echo '--------- double ! means locked ------------' "
    xsh.Screen.Send VbCr

End Sub

' 原始命令
' cat /etc/shadow | grep ! | awk -F ':' '{ print $1 ,$2}'
' 锁定的用户在 /etc/shadow 中会显示 两个！！

' usermod -L username
' 或者使用  passwd -l username  效果是一样的

' 检查用户是否被锁
' passwd --status fufu
' fufu LK 2022-08-12 0 99999 7 -1 (Password locked.)
' 有些系统不会提示 (Password locked.)  这里用户名后带有 LK  或  *LK* 就是表示被锁

' passwd -u 解锁的用户如果没有设定密码，会被系统再次强行锁定，所以需要
' passwd -u -f username
' -f 强制解锁后，使用 passwd --status fufu 查看用户状态 是 fufu NP 2022-08-12 0 99999 7 -1 (Empty password.)
' NP 表示 没有密码
```

### Demo-2 nologin

```
awk -F':' '{print $1 ,$7}' /etc/passwd | grep -v '/sbin/nologin'
```

### Demo-3 PS user

```
ps aux | sed 1d | cut -d " & """ """ &  " -f 1 | sort | uniq
```

### Demo-4 All bash user

```
awk -F':' '{print $1,$7}' /etc/passwd | grep '/bin/bash' | cut -d " & """ """ & " -f 1
```

### Demo-5 All user

```
awk -F':' '{print $1}' /etc/passwd
```

### Demo-6 List expired users

```
cat /etc/shadow |  awk -F ':' '{ print $1 ,$8}' | grep 0
```

### Demo-7 unlock user

```
Option Explicit
Public username

Sub Main
    ''''''''''''''''''''''''''''''''
    ' 名称：解锁用户
    ' 版本：2014-5-19
    ' 作者：Liulifu
    ''''''''''''''''''''''''''''''''
    xsh.Screen.Synchronous = true
    ' 这是避免HISTORY记录EOF的设置，让HISTORY命令忽略空格，如果在命令前加一个空格，就会忽略掉整行命令
    ' 下面每一行命令，及这个export也添加了设置。查看History时最多会显示下面这个export
    xsh.Screen.Send " export HISTCONTROL=ignorespace"
    xsh.Screen.Send VbCr

    ' view locked users
    viewlockedusers


    ' 输入框
    ' Dim username
    username = xsh.Dialog.Prompt ("Please input the user who need to be disabled","username","",0)

    ' 输入框
    Dim retval
    retval = xsh.Dialog.MessageBox ("Are you sure ? ","Are you sure?",4)
    If retval=6 Then

        If username="root" Then
            xsh.Dialog.MsgBox("Can not disable root")
        Else
            ' 杀掉该用户所有进程
            xsh.Screen.Send " passwd -u -f " & username
            xsh.Screen.Send VbCr
            xsh.Session.Sleep 1000
            call userstatus(username)
            xsh.Dialog.MsgBox("User has been unlocked ! ")
            xsh.Screen.Send VbCr
        End If
    Else
        xsh.Screen.Send VbCr
    End If
End Sub

Sub userstatus(username)

    ' 确认用户状态
    xsh.Screen.Send " passwd --status " & username
    xsh.Screen.Send VbCr

End Sub

Sub viewlockedusers

    ' 查看有哪些用户已经被锁定了
    xsh.Screen.Send " echo '---------List Locked users ------------' "
    xsh.Screen.Send VbCr

    ' 所有用户
    xsh.Screen.Send " cat /etc/shadow | grep ! | awk -F ':' '{ print $1 ,$2}'"
    ' xsh.Screen.Send " ( awk -F':' '{print $1,$7}' /etc/passwd | grep '/bin/bash' | cut -d " & """ """ & " -f 1 && ps aux | sed 1d | cut -d " & """ """ & " -f 1 | sort | uniq ) | sort | uniq -d"
    xsh.Screen.Send VbCr
    xsh.Session.Sleep 1000
    xsh.Screen.Send " echo '--------- double ! means locked ------------' "
    xsh.Screen.Send VbCr

End Sub

' 原始命令
' cat /etc/shadow | grep ! | awk -F ':' '{ print $1 ,$2}'
' 锁定的用户在 /etc/shadow 中会显示 两个！！

' usermod -L username
' 或者使用  passwd -l username  效果是一样的

' 检查用户是否被锁
' passwd --status fufu
' fufu LK 2022-08-12 0 99999 7 -1 (Password locked.)
' 有些系统不会提示 (Password locked.)  这里用户名后带有 LK  或  *LK* 就是表示被锁

' passwd -u 解锁的用户如果没有设定密码，会被系统再次强行锁定，所以需要
' passwd -u -f username
' -f 强制解锁后，使用 passwd --status fufu 查看用户状态 是 fufu NP 2022-08-12 0 99999 7 -1 (Empty password.)
' NP 表示 没有密码


```

### **Demo-8 make user expired**

```
Sub Main
    ''''''''''''''''''''''''''''''''
    ' 名称：用户过期
    ' 版本：2014-5-19
    ' 作者：Liulifu
    ''''''''''''''''''''''''''''''''
    xsh.Screen.Synchronous = true
    ' 这是避免HISTORY记录EOF的设置，让HISTORY命令忽略空格，如果在命令前加一个空格，就会忽略掉整行命令
    ' 下面每一行命令，及这个export也添加了设置。查看History时最多会显示下面这个export
    xsh.Screen.Send " export HISTCONTROL=ignorespace"
    xsh.Screen.Send VbCr

    ' 检查已过期用户
    viewExpiredusers

    ' 输入框
    Dim username
    username = xsh.Dialog.Prompt ("Please input the user who need to be locked","username","",0)

    ' 输入框
    Dim retval
    retval = xsh.Dialog.MessageBox ("Are you sure ? ","Are you sure?",4)
    If retval=6 Then

        If username="root" Then
            xsh.Dialog.MsgBox("root can not be expired")
        Else
            ' 使用户过期
            xsh.Screen.Send " chage -E0 " & username
            xsh.Screen.Send VbCr
            xsh.Session.Sleep 1000
            ' 确认过期状态
            xsh.Screen.Send " chage -l " & username
            xsh.Screen.Send VbCr
            xsh.Dialog.MsgBox("User has been expired ! ")
            xsh.Screen.Send VbCr
        End If
    Else
        xsh.Screen.Send VbCr
    End If
End Sub

Sub viewExpiredusers

    ' 查看有哪些用户已经过期了
    xsh.Screen.Send " echo '---------List expired users ------------' "
    xsh.Screen.Send VbCr

    ' 所有用户
    xsh.Screen.Send " cat /etc/shadow |  awk -F ':' '{ print $1 ,$8}' | grep 0 "
    ' xsh.Screen.Send " ( awk -F':' '{print $1,$7}' /etc/passwd | grep '/bin/bash' | cut -d " & """ """ & " -f 1 && ps aux | sed 1d | cut -d " & """ """ & " -f 1 | sort | uniq ) | sort | uniq -d"
    xsh.Screen.Send VbCr
    xsh.Session.Sleep 1000
    xsh.Screen.Send " echo '--------- 8th is 0 means expired -------' "
    xsh.Screen.Send VbCr

End Sub



' 已过期用户
' 通过使用 /etc/shadow 中的第 8 个字段（使用“chage -E”）使帐户过期将阻止所有使用 PAM 对用户进行身份验证的访问方法。
' cat /etc/shadow |  awk -F ':' '{ print $1 ,$8}' | grep 0


' passwd -l 和 usermod -L 命令效率低下。这些命令不会禁止通过 SSH 公钥（或可能启用的其他 PAM 模块以外的pam_unix）进行身份验证。
' 此外，将 shell 更改为 /bin/false 或 /sbin/nologin 对我们来说并不令人满意，因为这只会影响交互式登录。
' 因此，要完全禁用用户帐户，您可以使用命令chage -E0。
```
