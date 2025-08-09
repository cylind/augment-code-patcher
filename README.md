# 🛡️ Augment Code Extension 拦截器

> 指纹浏览器级别的隐私保护解决方案

## 🚀 项目简介

本项目提供了一个全自动化的 GitHub Actions 工作流，旨在解决 Augment Code VS Code 插件的隐私和数据收集问题。

### 🎯 功能特性

- ✅ **40+硬件数据点完全伪造** - CPU、内存、主板、BIOS序列号等
- ✅ **智能网络策略** - 分层决策，精准拦截遥测数据
- ✅ **SystemInformation库拦截** - 40+方法模拟
- ✅ **硬件配置模板系统** - Intel/AMD桌面、笔记本真实模板
- ✅ **文件系统隐私保护** - inode、SSH密钥拦截
- ✅ **身份信息一致性保证** - 持久化假身份，避免随机变化

### 🔄 自动化构建流程

工作流会自动执行以下任务：
1. **下载最新版**的官方 Augment Code (`Augment.vscode-augment`) 插件
2. **应用补丁**：将拦截器 (`augment-interceptor.js`) 注入到插件核心逻辑中
3. **重新打包**成一个干净、打好补丁的 `.vsix` 文件
4. **自动发布**到本仓库的 [Releases](https://github.com/cylind/augment-code-patcher/releases) 页面

##  快速开始

### 方法1：下载预构建版本（推荐）

1. **前往 Releases 页面**：点击本仓库主页右侧的 [**Releases**](https://github.com/cylind/augment-code-patcher/releases) 链接
2. **下载最新版补丁**: 找到顶部的最新版本，下载 `.vsix` 文件
3. **在 VS Code 中安装**:
   - 打开 VS Code，进入"扩展"侧边栏 (`Ctrl+Shift+X`)
   - 点击右上角的 `...` 更多操作菜单
   - 选择 **"从 VSIX 安装... (Install from VSIX...)"**
   - 选择你刚刚下载的 `.vsix` 文件
4. **完成！** 重启 VS Code 后即可享受隐私保护

### 方法2：手动安装拦截器

#### 步骤1: 找到Augment Code插件目录

**Windows:**
```
C:\Users\{你的用户名}\.vscode\extensions\augment.vscode-augment-*\
```

**macOS/Linux:**
```
~/.vscode/extensions/augment.vscode-augment-*/
```

#### 步骤2: 复制拦截器文件

将 `augment-interceptor.js` 复制到插件目录中。

#### 步骤3: 注入拦截器代码

找到插件的主入口文件（通常是 `out/extension.js`），在文件**最开头**添加：

```javascript
try {
    require('./augment-interceptor.js');
    console.log('✅ Augment Code 拦截器已启动');
} catch (error) {
    console.error('❌ 拦截器加载失败:', error.message);
}
```

#### 步骤4: 重启VSCode

重启VSCode后，应该看到拦截器启动信息：

```
🚀 正在加载 Augment Code Extension 拦截器 v3.6...
✅ 拦截器初始化完成
🛡️ Augment Code Extension 拦截器 v3.6
状态: running
身份ID: 6beca83f...
硬件模板: intel_desktop
主机名: DESKTOP-2e872b50
用户名: user-2e81352d
🚀 隐私保护功能已激活！
```

## 🔍 验证安装

### 查看拦截器日志

重启VSCode后，按 `Ctrl+Shift+I` 打开开发者工具，在Console中查看是否有拦截器启动日志：

```
[Extension Host] 🚀 正在加载 Augment Code Extension 拦截器 v3.6...
[Extension Host] ✅ 拦截器初始化完成
[Extension Host] 🛡️ Augment Code Extension 拦截器 v3.6
```

### 观察拦截日志

使用Augment Code功能时，应该能看到拦截日志：

```
[Extension Host] ✅ [网络拦截] POST https://api.augmentcode.com/... - 必要功能已放行
[Extension Host] 🚫 [网络拦截] POST https://api.segment.io/... - 遥测数据已拦截
[Extension Host] 🔄 [OS拦截] hostname() 调用已拦截 - 伪造: DESKTOP-abc123
```

## 🔄 重置身份

### 简单重置方法

拦截器的身份配置保存在文件中，删除配置文件即可重置身份：

**配置文件位置：**
- Windows: `C:\Users\{用户名}\.augment-interceptor\identity-profile.json`
- macOS/Linux: `~/.augment-interceptor/identity-profile.json`

**重置步骤：**
1. 关闭VSCode
2. 删除配置文件
3. 重启VSCode（将自动生成新身份）

**快速重置命令：**
```bash
# Windows
del "C:\Users\%USERNAME%\.augment-interceptor\identity-profile.json"

# macOS/Linux
rm ~/.augment-interceptor/identity-profile.json
```

## 🔧 工作原理

### 硬件模板系统

拦截器会自动选择以下硬件模板之一：

1. **Intel桌面** - i7-10700K + 16GB + ASUS PRIME Z490-A
2. **AMD桌面** - Ryzen 7 5800X + 32GB + ASUS ROG STRIX B550-F
3. **Intel笔记本** - i7-1165G7 + 16GB + ThinkPad X1 Carbon

### 智能网络策略

- **INTERCEPT** - 完全拦截遥测数据（Segment.io、Analytics等）
- **REPLACE_IDENTITY** - 替换身份信息后放行（认证、设备验证等）
- **ALLOW** - 直接放行（必要功能、API调用等）

### 身份一致性保证

- 身份信息持久化保存在配置文件中
- 每次启动使用相同的假身份，避免随机变化
- 所有硬件信息逻辑一致，无法通过交叉验证识别

## ⚠️ 注意事项

### 重要提醒

1. **插件更新** - Augment Code插件更新时需要重新注入拦截器代码
2. **配置文件** - 身份配置保存在 `~/.augment-interceptor/identity-profile.json`
3. **重置身份** - 删除配置文件即可重置身份

### 故障排除

**拦截器未启动：**
- 检查文件路径是否正确
- 确保在插件代码最开头加载
- 查看VSCode开发者控制台的错误信息

**身份重置：**
- 删除配置文件：`~/.augment-interceptor/identity-profile.json`
- 重启VSCode自动生成新身份

**功能验证：**
- 查看开发者控制台中的拦截日志
- 观察网络请求是否被正确分类处理

## 🎉 享受安全的编程体验！

安装完成后，你可以：

- ✅ 安全使用Augment Code的所有功能
- ✅ 完全保护个人隐私和系统信息  
- ✅ 享受指纹浏览器级别的隐私保护
- ✅ 避免账号封禁和身份追踪

拦截器会自动工作，无需额外配置。如有问题，请查看开发者控制台的详细日志信息。

## ⚠️ 免责声明

- 本项目提供的 `.vsix` 文件是基于官方插件修改的 **非官方构建版本**
- 本项目仅用于技术学习和研究，旨在提高用户对个人数据和隐私的控制能力
- 请自行承担使用本项目产出的插件可能带来的任何风险
