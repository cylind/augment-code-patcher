# Augment Code Patcher - 自动补丁构建器

## 🚀 这是什么？

本项目是一个全自动化的 GitHub Actions 工作流，旨在解决 Augment Code VS Code 插件的隐私和数据收集问题。

它会自动执行以下任务：
1.  **下载最新版**的官方 Augment Code (`Augment.vscode-augment`) 插件。
2.  **应用补丁**：将一个强大的去风控脚本 (`v2.5-precise-interceptor.js`, 来源：https://linux.do/t/topic/844851) 注入到插件的核心逻辑中。
3.  **重新打包**成一个干净、打好补丁的 `.vsix` 文件。
4.  **自动发布**到本仓库的 [Releases](https://github.com/cylind/augment-code-patcher/releases) 页面，方便你随时下载使用。

从此，你无需再手动执行繁琐的解包、修改、打包流程，工作流会为你搞定一切！

## ✨ 如何使用

使用这个项目非常简单，你只需要从已经构建好的产出物中下载即可：

1.  **前往 Releases 页面**：点击本仓库主页右侧的 [**Releases**](https://github.com/cylind/augment-code-patcher/releases) 链接。
2.  **下载最新版补丁**: 找到顶部的最新版本（例如 `Patched Augment v0.524.1`），然后下载其附件中的 `.vsix` 文件（例如 `augment.vscode-augment-0.524.1-patched.vsix`）。
3.  **在 VS Code 中安装**:
    *   打开 VS Code，进入“扩展”侧边栏 (快捷键 `Ctrl+Shift+X`)。
    *   点击右上角的 `...` 更多操作菜单。
    *   选择 **“从 VSIX 安装... (Install from VSIX...)”**。
    *   选择你刚刚下载的 `.vsix` 文件。
4.  **完成！** 重启 VS Code 后即可享受一个更纯净、更安全的 Augment Code 体验。


## ⚙️ 工作原理 (The Magic Behind)

本项目通过一个 GitHub Actions 工作流 (`.github/workflows/build.yml`) 实现完全自动化。其核心步骤如下：

- **定时触发与手动触发**: 工作流可以每周自动运行以检查更新，也可以由你手动在 Actions 页面触发。
- **下载官方插件**: 使用 `curl` 命令从 VS Code Marketplace 的官方 API 下载最新的 `.vsix` 插件包。工作流已正确处理了服务器返回的 `gzip` 压缩，确保获取到原始的 Zip 格式文件。
- **解包与注入补丁**:
    1.  使用 `unzip` 命令解压下载的 `original.vsix` 文件。
    2.  定位到插件的核心脚本（位于 `unpacked_ext/extension/out/extension.js`）。
    3.  通过 `cat` 命令，将我们的去风控脚本 `v2.5-precise-interceptor.js` 的内容 **完整地添加到** 核心脚本的最前面。
- **重新安装依赖**: 工作流会进入插件目录，执行 `npm install` 以确保所有依赖都已正确安装。
- **重新打包**: 使用微软官方的 `vsce` 工具，将修改后的所有文件重新打包成一个全新的、带有版本号的 `.vsix` 文件。
- **创建 Release**: 最后，工作流会自动创建一个 GitHub Release，将打包好的 `.vsix` 文件作为附件上传，并附上清晰的版本说明。

## 🛡️ 关于补丁脚本 (`v2.5-precise-interceptor.js`)

本项目的核心是这个功能强大的拦截脚本（来源：https://linux.do/t/topic/844851 ），它能做到：

- ✅ **VSCode版本伪造**: 深度拦截 `vscode.version` 和 `env` 对象，伪造版本号、会话ID、机器ID等。
- ✅ **网络请求拦截**: 在应用层拦截 `fetch`, `XMLHttpRequest` 等，智能区分“代码索引”等核心功能和“遥测上报”等数据收集行为。
- ✅ **系统信息伪造**: 拦截操作系统、CPU架构、内核版本等信息的获取，并返回逼真的假数据。
- ✅ **数据收集拦截**: 精准拦截 Analytics、Segment 等数据分析服务的上报函数。
- ✅ **Git 信息保护**: 拦截 `git` 命令和用户信息的获取。

**安全声明**: 该脚本经过了详细的代码审查，**未发现任何后门、恶意行为或将你的信息发送给第三方的逻辑**。它的所有行为都与其声明的“去风控”目标一致，你可以放心使用。

## 🔍 验证安装

安装完成后，验证拦截器是否正常工作：

1. **打开开发者控制台**
   - 按 `Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (Mac)
   - 点击 "Console" 标签

2. **查看初始化日志**
   应该能看到类似以下的日志：
   ```
   [AugmentCode拦截器] 正在加载安全拦截器 v2.5 (精确拦截版)...
   [AugmentCode拦截器] 🚀 开始初始化 v2.5 精确拦截器...
   [AugmentCode拦截器] ✅ v2.5 精确拦截器初始化完成！
   ```

3. **测试基本功能**
   - 尝试使用 Augment 的代码补全功能
   - 检查是否有拦截日志出现

## ⚙️ 配置拦截器

### 基本配置

在开发者控制台中，您可以调整拦截器的行为：

```javascript
// 查看当前配置
console.log(INTERCEPTOR_CONFIG);

// 启用详细日志
INTERCEPTOR_CONFIG.network.logAllRequests = true;
INTERCEPTOR_CONFIG.network.logInterceptedRequests = true;
INTERCEPTOR_CONFIG.network.logAllowedRequests = true;

// 调整日志详细程度
INTERCEPTOR_CONFIG.network.requestLogLimit = 5000; // 增加日志字符限制
```

### 高级配置

```javascript
// 数据保护设置
INTERCEPTOR_CONFIG.dataProtection.enableAnalyticsBlocking = true;  // 阻止分析数据
INTERCEPTOR_CONFIG.dataProtection.enableGitProtection = true;      // 保护Git信息
INTERCEPTOR_CONFIG.dataProtection.enableSessionIdReplacement = true; // 替换会话ID

// 网络拦截设置
INTERCEPTOR_CONFIG.network.enableHttpInterception = true;   // HTTP拦截
INTERCEPTOR_CONFIG.network.enableFetchInterception = true;  // Fetch拦截
INTERCEPTOR_CONFIG.network.enableXhrInterception = true;    // XHR拦截
```

## 📊 监控拦截活动

### 查看实时日志

在控制台中监控拦截活动：

```javascript
// 查看拦截统计
PreciseEventReporterInterceptor.getInterceptionStats();

// 查看网络拦截统计
NetworkInterceptor.getInterceptionStats();

// 查看系统信息访问统计
console.log(INTERCEPTOR_CONFIG.systemAccessCount);
console.log(INTERCEPTOR_CONFIG.vscodeEnvAccessCount);
```

### 常见日志类型

- `🚫 拦截遥测端点` - 成功阻止了遥测数据发送
- `✅ 允许代码索引数据` - 允许了必要的代码功能
- `🎭 拦截 enableUpload() 调用` - 阻止了数据上传方法
- `🖥️ 已生成假系统信息` - 成功伪造了系统信息

## ⚠️ 免责声明

- 本项目提供的 `.vsix` 文件是基于官方插件修改的 **非官方构建版本**。
- 本项目仅用于技术学习和研究，旨在提高用户对个人数据和隐私的控制能力。
- 请自行承担使用本项目产出的插件可能带来的任何风险。