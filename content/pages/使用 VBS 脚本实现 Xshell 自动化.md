# 使用 VBS 脚本实现 Xshell 自动化

Xshell 是一款非常强大的终端仿真工具，广泛应用于运维、开发等多个领域。通过它内置的脚本支持功能，我们可以使用 VBScript（VBS）来编写脚本，自动执行日常操作，大大提高了工作效率。本文将简要介绍如何利用 VBS 脚本实现 Xshell 的自动化操作。

为什么使用 VBS 脚本？

VBS 脚本具有简单易学、语法清晰的特点。结合 Xshell 内置的会话管理和命令发送功能，我们可以通过 VBS 来编写脚本，自动化处理登录、命令执行、日志记录等一系列任务。此外，Xshell 也支持其他脚本语言，如 Python，不过本文将以 VBS 为例，来展示如何实现常见的自动化任务。

常用 Xshell 脚本函数

Xshell 提供了一些强大的 API，用于管理会话、发送命令等。以下是几种常用的会话控制函数：

- **Open**
  - 参数：`lpszSession: LPCTSTR`
  - 返回值：`Void`
  - 描述：打开一个新的会话，参数可以是会话路径或者 URL。
- **Close**
  - 参数：`None`
  - 返回值：`Void`
  - 描述：关闭当前连接的会话。
- **Sleep**
  - 参数：`timeout: long`
  - 返回值：`Void`
  - 描述：让 Xshell 等待指定的时间（毫秒）。
- **LogFilePath**
  - 参数：`lpszNewFilePath: LPCTSTR`
  - 返回值：`Void`
  - 描述：设置日志文件的路径，便于记录会话的所有输出。

## 示例 1 标准

接下来，我们展示一个简单的 VBS 脚本示例，演示如何使用 Xshell 的自动化功能登录远程服务器并执行一条命令：

```vbscript
' Xshell VBS 自动化示例脚本
Set objXshell = CreateObject("Xshell.Application")

' 打开一个指定的会话
objXshell.Session.Open("C:\Users\Andrei\Documents\Sessions\MySession.xsh")

' 等待会话连接完成
objXshell.Session.Sleep 3000  ' 等待3秒

' 发送命令并执行
objXshell.Session.SendCommand "ls -l"
objXshell.Session.SendCommand vbCr  ' 发送回车

' 设置日志记录文件路径
objXshell.Session.LogFilePath "C:\Users\Andrei\Documents\XshellLogs\session.log"

' 关闭会话
objXshell.Session.Close
```

脚本说明：

1. **创建 Xshell 对象**：`Set objXshell = CreateObject("Xshell.Application")` 用于创建一个 Xshell 应用程序对象。
2. **打开会话**：`objXshell.Session.Open("...")` 用于打开指定的会话文件（.xsh 文件），可以提前创建好多个会话文件，方便不同环境下的使用。
3. **等待连接**：`objXshell.Session.Sleep 3000` 表示等待 3 秒，确保会话已经建立成功。
4. **发送命令**：`objXshell.Session.SendCommand "ls -l"` 发送一条命令到远程服务器。
5. **日志记录**：`objXshell.Session.LogFilePath` 指定一个日志文件，用于记录会话中的所有交互内容。
6. **关闭会话**：执行完所有任务后，调用 `objXshell.Session.Close` 来关闭会话。

通过使用 VBS 脚本，我们可以极大地提高 Xshell 的使用效率。无论是自动登录、批量发送命令，还是日志记录，Xshell 的脚本功能都为日常操作提供了便利。对于有大量服务器管理需求的用户来说，自动化是减少重复操作、提高工作效率的重要途径。

## 示例 2 使用 EOF

```



Option Explicit
Public interpreter
interpreter = "bash"
Public tempscriptchmod
tempscriptchmod = "755"

Sub Main
    ''''''''''''''''''''''''''''''''
    ' 名称：
    ' 版本：2015-11-4
    ' 作者：Liulifu
    '
    ' 说明：
    ' 这个脚本通过Xshell自动化执行Bash命令。它会创建一个临时的Bash脚本文件，
    ' 设置该脚本文件的执行权限，然后执行该脚本，最后删除这个临时脚本文件。
    '
    ' 步骤：
    ' 1. 设置Xshell屏幕同步模式，确保命令按顺序执行。
    ' 2. 通过设置HISTCONTROL环境变量，忽略历史记录中以空格开头的命令。
    ' 3. 创建一个临时Bash脚本文件，并将需要执行的命令写入其中。
    ' 4. 设置临时脚本文件的执行权限，执行该脚本，然后删除该脚本。
    ''''''''''''''''''''''''''''''''

    ''' 参数 '''
        xsh.Screen.Synchronous = true
        ' 这是避免HISTORY记录EOF的设置，让HISTORY命令忽略空格，如果在命令前加一个空格，就会忽略掉整行命令
        ' 下面每一行命令，及这个export也添加了设置。查看History时最多会显示下面这个export
        xsh.Screen.Send " export HISTCONTROL=ignorespace"
        xsh.Screen.Send VbCr

    ''' EOF '''
        ' EOF开始
            '创建临时脚本文件，注意此处是 > 符号，如果后面再添加需要改成 >>
            xsh.Screen.Send " cat << EOF "
            xsh.Screen.Send VbCr
            ' shebang 与上面的public interpreter相关联
            'xsh.Screen.Send " #!/usr/bin/env " & interpreter
            'xsh.Screen.Send VbCr

            xsh.Screen.Send " echo 'hello' "
            xsh.Screen.Send VbCr


        ' EOF结束
            '注意这个EOF前面不能留空格,如果留有空格可能需要使用<<-符号
            xsh.Screen.Send "EOF"
            xsh.Screen.Send VbCr
            xsh.Session.Sleep 1000

        ' EOF执行
            '权限与上面public tempscriptchmod 关联，& 执行 & 删除
            ' xsh.Screen.Send " chmod " & tempscriptchmod &" ./tempscript.sh && ./tempscript.sh && rm ./tempscript.sh"
            ' xsh.Screen.Send VbCr
            ' xsh.Session.Sleep 100


End Sub
```

## 示例 3 调用 API

```
Dim url
Dim xmlhttp
Dim response
Dim response_data

' 设置 API 的 URL
url = "https://api.example.com/v1/timestamp"

' 创建 XMLHTTP 对象并发送 HTTP 请求
Set xmlhttp = CreateObject("MSXML2.XMLHTTP")
xmlhttp.Open "GET", url, False
xmlhttp.send

' 处理响应
If xmlhttp.Status = 200 Then
    ' 将响应内容解析为 JSON 格式
    Set response_data = JsonConverter.ParseJson(xmlhttp.responseText)
    ' 获取时间戳字段
    timestamp = response_data("timestamp")
    ' 处理时间戳
    WScript.Echo "当前时间戳：" & timestamp
Else
    WScript.Echo "请求失败,HTTP 状态码为：" & xmlhttp.Status
End If

' 释放资源
Set xmlhttp = Nothing
Set response_data = Nothing

```

## 示例 4 消息框

```
Option Explicit
Sub Main
    ''''''''''''''''''''''''''''''''
    ' 名称：
    ' 版本：2015-11-4
    ' 作者：Liulifu
    ''''''''''''''''''''''''''''''''
    xsh.Screen.Synchronous = true
    ' 输入框
    Dim retval
    retval = xsh.Dialog.MessageBox ("Are you login as root? ","Are you root?",2)
    If retval=3 Then
    xsh.Screen.Send "echo Abort " & retval
    xsh.Screen.Send VbCr
    ElseIf retval=4 Then
    xsh.Screen.Send "echo Retry " & retval
    xsh.Screen.Send VbCr
    Else
    xsh.Screen.Send "echo Ignore " & retval
    xsh.Screen.Send VbCr
    End If

End Sub

' Cancel / TryAgain / Continue	2 / 10 / 11

Option Explicit
Sub Main
    ''''''''''''''''''''''''''''''''
    ' 名称：
    ' 版本：2015-11-4
    ' 作者：Liulifu
    ''''''''''''''''''''''''''''''''
    xsh.Screen.Synchronous = true
    ' 输入框
    Dim retval
    retval = xsh.Dialog.MessageBox ("Are you login as root? ","Are you root?",6)
    If retval=2 Then
    xsh.Screen.Send "echo Cancel " & retval
    xsh.Screen.Send VbCr
    ElseIf retval=10 Then
    xsh.Screen.Send "echo TryAgain " & retval
    xsh.Screen.Send VbCr
    Else
    xsh.Screen.Send "echo Continue " & retval
    xsh.Screen.Send VbCr
    End If

End Sub

```

## 示例 5 输入框

```
Option Explicit
Sub Main
    ''''''''''''''''''''''''''''''''
    ' 名称：
    ' 版本：2015-11-4
    ' 作者：Liulifu
    ''''''''''''''''''''''''''''''''
    xsh.Screen.Synchronous = true
    ' 输入框
    Dim isroot
    isroot = xsh.Dialog.Prompt ("Please input  ","Input","example: 100",0)
    xsh.Screen.Send "echo " &  isroot
    xsh.Screen.Send VbCr
    xsh.Session.Sleep 100

End Sub
```

## 示例 6 返回值

```
Option Explicit
Sub Main
    ''''''''''''''''''''''''''''''''
    ' 名称：
    ' 版本：2013-9-22
    ' 作者：Liulifu
    ''''''''''''''''''''''''''''''''
    xsh.Screen.Synchronous = true

    ' Step 1
            xsh.Screen.Send " cat << EOF "
            xsh.Screen.Send VbCr
            ' shebang 与上面的public interpreter相关联
            xsh.Screen.Send " first line "
            xsh.Screen.Send VbCr

            xsh.Screen.Send " second line"
            xsh.Screen.Send VbCr

            xsh.Screen.Send " third line"
            xsh.Screen.Send VbCr

            xsh.Screen.Send " forth line"
            xsh.Screen.Send VbCr

        ' EOF结束
            '注意这个EOF前面不能留空格,如果留有空格可能需要使用<<-符号
            xsh.Screen.Send "EOF"
            xsh.Screen.Send VbCr


    ' 用法1： 返回上一行的前3个字母
    Dim screenrow1,readline1
    ' 指定行，这里是当前行的上一行
    screenrow1 = xsh.Screen.CurrentRow - 1
    ' 注意这个不是从0开始，是从1开始的到第三个字母，以下这个会返回 for
    ' Get(long nBegRow, long nBegCol, long nEndRow, long nEndCol)
    ' Get(开始行，开始列，结束行，结束列)
    readline1 = xsh.Screen.Get(screenrow1, 1, screenrow1, 3)
    xsh.Screen.Send "echo " & readline1
    xsh.Screen.Send VbCr

    ' ' 用法2：返回前4行的内容
    ' Dim s1,s2,s3,s4,r1
    ' s1 = xsh.Screen.CurrentRow - 4
    ' s2 = xsh.Screen.CurrentRow - 3
    ' s3 = xsh.Screen.CurrentRow - 2
    ' s4 = xsh.Screen.CurrentRow - 1

    ' ' 注意这个不是从0开始，是从1开始的到第三个字母，以下这个会返回 for
    ' r1 = xsh.Screen.Get(s1,1,s4,5)
    ' xsh.Screen.Send "echo " & r1
    ' xsh.Screen.Send VbCr



End Sub
```
