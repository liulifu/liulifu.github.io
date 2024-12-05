# AutoHotKey 开发示例

## 一、需求说明

1. **密码管理**：

   - 本地已记录的密码（上百台计算机的密码）。
   - 每日更新的密码（有效期为 6 小时）。
   - 程序需要能够存储和更新密码，并能够提醒用户每日更新的密码到期时间。

2. **密码获取与填充**：

   - 如果是本地已有的密码，通过选择或快捷方式快速调用密码，避免手动复制黏贴。
   - 如果是每日更新的密码，手动从网页获取后，将其输入到程序中，该程序在接下来的 RDP 登录过程中应快速提供此密码。

3. **快捷键功能**：

   - 你希望使用快捷键（如 F3）在 RDP 远程桌面中直接将密码自动贴入输入框中，这要求 AutoHotkey 自动检测当前选定的计算机并填充对应的密码。

4. **提醒功能**：

   - 针对每日更新的密码，程序应该提供一个有效期提醒功能，确保你在密码过期前能及时更新。

### 结构划分

- **密码存储与更新模块**：

  - 本地记录的计算机及其密码（周期性变更）。
  - 每日更新的密码，带有过期提醒。

- **密码快速调用与填充模块**：

  - 通过选择或识别当前远程管理的计算机，并通过快捷键如 F3 快速黏贴密码。

- **密码到期提醒模块**：

  - 针对每日更新的密码，提供过期提醒功能。

### 自动化流程

1. 启动 AutoHotkey 脚本并初始化密码管理。
2. 如果需要管理的计算机在本地已有记录，选定它后，按下快捷键（如 F3）自动将密码黏贴到 RDP 窗口的密码框中。
3. 如果需要每日更新的密码，手动从网页获取密码，输入到脚本中，同时启动 6 小时倒计时提醒，提示密码即将过期。
4. 脚本监控每个 RDP 连接，确保在需要时能快速提供密码，避免手动复制黏贴的繁琐。

## 二、在 AutoHotkey 2.0 版本实现方法

我们将重点放在 **密码管理**、**快捷键填充** 和 **密码到期提醒** 三大核心功能。接下来，我将介绍每个模块的实现方法：

### 1. **密码存储与更新模块**

你可以使用 AutoHotkey 的 `IniRead`和 `IniWrite`功能来管理本地存储的密码，或者选择简单的文件系统来保存密码。每日更新的密码可以用一个内存变量存储，并配合定时器进行过期提醒。

#### 示例代码：

```ahk
; AutoHotkey 2.0 示例代码

; 存储本地密码的文件 (可以是INI文件或其他格式)
passwordFile := "passwords.ini"  ; 假设密码存储在ini文件中

; 函数：从密码文件中读取密码
GetPassword(computerName) {
    return IniRead(passwordFile, computerName, "Password", "")
}

; 函数：更新密码
UpdatePassword(computerName, newPassword) {
    IniWrite(newPassword, passwordFile, computerName, "Password")
}
```

### 2. **快捷键功能（F3 自动填充密码）**

你可以使用 `F3`作为快捷键，调用 AutoHotkey 的 `Send`命令将密码自动填入 RDP 的密码框。首先需要确定当前操作的远程计算机是哪个，然后根据计算机名称从密码文件中获取对应密码。

#### 示例代码：

```ahk
; F3快捷键：填充密码
F3:: {
    ; 假设你手动选择或通过某种方式确定了正在操作的计算机名
    computerName := GetSelectedComputerName() ; 此函数需要根据你的需求实现
    if !computerName {
        MsgBox "未选择计算机"
        return
    }

    ; 获取计算机的密码
    password := GetPassword(computerName)

    if !password {
        MsgBox "未找到密码"
        return
    }

    ; 在当前窗口中粘贴密码
    Send(password)
}
```

### 3. **每日密码更新与到期提醒**

对于每日更新的密码，可以将其存储在内存中，并设置一个定时器，每隔一定时间（例如每小时）检查密码是否到期。如果密码即将过期，程序可以弹出一个提醒窗口。

#### 示例代码：

```ahk
; 变量：存储每日密码和过期时间
dailyPassword := ""
dailyPasswordExpiry := 0  ; 过期时间的时间戳

; 函数：更新每日密码
UpdateDailyPassword(newPassword, validityHours := 6) {
    global dailyPassword, dailyPasswordExpiry
    dailyPassword := newPassword
    dailyPasswordExpiry := A_TickCount + (validityHours * 3600000)  ; 将6小时转换为毫秒
}

; 定时器：每小时检查密码是否即将过期
SetTimer(CheckDailyPasswordExpiry, 3600000) ; 每小时检查一次

CheckDailyPasswordExpiry() {
    global dailyPasswordExpiry
    if (dailyPasswordExpiry - A_TickCount) < 1800000 {  ; 如果密码剩余时间少于30分钟
        MsgBox "每日密码即将过期，请及时更新！"
    }
}

; F4快捷键：使用每日密码
F4:: {
    if dailyPassword = ""
    {
        MsgBox "未设置每日密码"
        return
    }

    ; 自动填充每日密码
    Send(dailyPassword)
}
```

### 4. **整合所有模块**

你可以整合以上模块来满足你的所有需求。通过脚本设置自动提醒、快捷键管理、读取和更新密码，整个流程将会变得高效流畅。完整代码可以是以下样式：

#### 完整示例代码：

```ahk
; AutoHotkey 2.0 完整示例代码

; 本地密码存储文件
passwordFile := "passwords.ini"

; 变量：每日密码和过期时间
dailyPassword := ""
dailyPasswordExpiry := 0

; F3快捷键：填充本地存储的密码
F3:: {
    computerName := GetSelectedComputerName()
    if !computerName {
        MsgBox "未选择计算机"
        return
    }

    password := GetPassword(computerName)
    if !password {
        MsgBox "未找到密码"
        return
    }

    Send(password)
}

; F4快捷键：使用每日密码
F4:: {
    if dailyPassword = ""
    {
        MsgBox "未设置每日密码"
        return
    }

    Send(dailyPassword)
}

; 定时器：检查每日密码是否快要过期
SetTimer(CheckDailyPasswordExpiry, 3600000)

CheckDailyPasswordExpiry() {
    global dailyPasswordExpiry
    if (dailyPasswordExpiry - A_TickCount) < 1800000 {  ; 如果密码即将过期
        MsgBox "每日密码即将过期，请及时更新！"
    }
}

; 函数：从ini文件读取密码
GetPassword(computerName) {
    return IniRead(passwordFile, computerName, "Password", "")
}

; 函数：更新ini文件中的密码
UpdatePassword(computerName, newPassword) {
    IniWrite(newPassword, passwordFile, computerName, "Password")
}

; 函数：更新每日密码
UpdateDailyPassword(newPassword, validityHours := 6) {
    global dailyPassword, dailyPasswordExpiry
    dailyPassword := newPassword
    dailyPasswordExpiry := A_TickCount + (validityHours * 3600000)
}
```

### 需求总结：

- **本地存储密码**：通过文件或内存管理计算机密码。
- **快捷键填充**：F3、F4 快捷键分别用于本地密码和每日密码的自动填充。
- **到期提醒**：定时器检查每日密码的过期时间，并及时提醒。

## 三、部署方法

要部署并运行上面的 AutoHotkey 2.0 脚本，你可以按照以下步骤操作：

### 步骤 1：安装 AutoHotkey 2.0

1. **下载 AutoHotkey 2.0**：

   - 访问 [AutoHotkey 官方网站](https://www.autohotkey.com/)，在下载页面选择 **AutoHotkey v2.0** 并安装到你的计算机上。

2. **安装过程**：

   - 双击下载的安装包，按照提示进行安装，确保选择了 **v2.0** 版本。
   - 安装完成后，你可以通过右键菜单使用 AutoHotkey 脚本。

### 步骤 2：创建 AutoHotkey 脚本文件

1. **新建一个脚本文件**：

   - 右键单击桌面或任意文件夹的空白处，选择 **新建 > AutoHotkey Script**。确保文件后缀是 `.ahk`。
   - 命名这个文件，例如 `PasswordManager.ahk`。

2. **编辑脚本**：

   - 右键点击刚创建的 `.ahk` 文件，选择 **编辑**。
   - 将我提供的 AutoHotkey 2.0 脚本代码粘贴到文件中，然后保存。

### 步骤 3：设置密码存储文件

1. **创建 `passwords.ini` 文件**：

   - 脚本中的密码存储使用了一个 `.ini` 文件，你可以在脚本所在的同一目录下创建一个 `passwords.ini` 文件。这个文件的结构是这样的：

   ```ini
   [Computer1]
   Password=YourStrongPassword1

   [Computer2]
   Password=YourStrongPassword2
   ```

   - 每个 `[ComputerName]` 对应一台远程管理的计算机，`Password` 是存储的密码。

2. **配置密码文件路径**：

   - 如果你希望将密码文件存放在其他位置（比如加密存储盘），可以在脚本中修改 `passwordFile` 变量，指定新的路径。

   ```ahk
   passwordFile := "C:\path\to\your\passwords.ini"
   ```

### 步骤 4：运行脚本

1. **启动脚本**：

   - 双击 `.ahk` 文件运行脚本，启动后你将在系统托盘中看到 AutoHotkey 的图标，表示脚本正在运行。

2. **测试快捷键**：

   - 打开你的 RDP 远程桌面窗口，选定计算机，按下 `F3`，看是否能自动填入正确的密码。
   - 对于每日更新的密码，按 `F4` 测试是否能将每日密码填入。

### 步骤 5：设置每日密码并检测到期

1. **每日密码更新**：

   - 当你从网页获取了每日更新的密码后，你可以通过调用 `UpdateDailyPassword` 函数来更新每日密码（可以在脚本中手动更新或通过弹窗输入）。
   - 脚本会自动在后台运行，每小时检测一次每日密码的到期情况，并提醒你更新密码。

   如果你想让每日密码通过界面输入，可以在脚本中添加一个弹窗输入机制，例如：

   ```ahk
   F5:: {
       newPassword := InputBox("请输入新的每日密码")
       UpdateDailyPassword(newPassword)
   }
   ```

### 步骤 6：脚本的持续运行

1. **自动启动**：

   - 如果你希望脚本在开机时自动运行，可以将 `.ahk` 脚本文件放入 Windows 的启动文件夹中。按下 `Win + R`，输入 `shell:startup`，将脚本的快捷方式拖入此文件夹中。

2. **保持脚本更新**：

   - 随着计算机网络和密码需求的变化，你可以随时编辑 `.ahk` 文件，更新脚本内容。

### 补充说明：

- 可以对脚本做进一步的调整，例如根据实际的远程桌面需求，自动获取当前正在操作的计算机名称（这可以通过某些窗口识别函数实现）。
- 对于存储的 `.ini` 文件和每日密码更新功能，你可以根据企业的安全规范进一步加密或添加身份验证功能，确保密码安全性。
