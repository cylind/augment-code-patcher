/**
 * Augment Code Extension 安全拦截器 v2.5
 *
 * 
 * 主要功能：
 * ✅ VSCode版本伪造 - 深度拦截vscode.version和env对象
 * ✅ 网络请求拦截 - HTTP/HTTPS/Fetch/XMLHttpRequest
 * ✅ 会话ID管理 - 自动生成和替换会话标识
 * ✅ 系统信息伪造 - 操作系统、架构、内核版本
 * ✅ 数据收集拦截 - Analytics、Segment等数据收集服务
 * ✅ Git信息保护 - 拦截Git命令和用户信息
 * ✅ JSON数据清理 - 智能清理敏感数据
 * 🔍 被放行请求监控 - 记录未被拦截的网络请求（调试功能）
 * ✅ 动态配置支持 - 运行时调整各项设置
 *
 * 调试功能使用说明：
 * - 设置 INTERCEPTOR_CONFIG.network.logAllRequests = true 启用所有请求详细监控
 * - 设置 INTERCEPTOR_CONFIG.network.logInterceptedRequests = true 启用被拦截请求监控
 * - 设置 INTERCEPTOR_CONFIG.network.logAllowedRequests = true 启用被放行请求监控
 * - 设置 INTERCEPTOR_CONFIG.network.requestLogLimit = 2000 控制请求包详细日志字符限制
 * - 查看控制台中的详细请求日志，包含完整的请求头、请求体和拦截原因
 *
 * v2.5 新特性：
 * - 🎯 精确的enableUpload()方法拦截
 * - 🔍 智能数据分类机制（代码索引 vs 遥测数据）
 * - 🛡️ 更安全的Analytics拦截策略
 * - 📊 细粒度的Event Reporter控制
 * - ⚡ 优化的JSON拦截逻辑
 * - 🔧 增强的白名单保护机制
 * - 📝 基于深度分析的改进实现
 *
 * 构建时间: 2025-07-30
 */

(function() {
    'use strict';

    // ==================== 1. 配置和常量 ====================

    // 日志去重机制
    const loggedMessages = new Set();

    /**
     * 智能日志函数 - 相同类型的日志只打印一次
     * @param {string} message - 日志消息
     * @param {string} type - 日志类型（用于去重）
     */
    function logOnce(message, type = null) {
        const logKey = type || message;
        if (!loggedMessages.has(logKey)) {
            loggedMessages.add(logKey);
            console.log(`[AugmentCode拦截器] ${message}`);
        }
    }

    const INTERCEPTOR_CONFIG = {
        version: 'v2.5',
        buildTime: new Date().toISOString(),
        debugMode: true,

        // VSCode版本配置
        vscode: {
            versions: [
                '1.96.0', 
                '1.96.1',
                '1.96.2',
                '1.96.3',
                '1.96.4',
                '1.97.0',
                '1.97.1',
                '1.97.2',
                '1.98.0',
                '1.98.1',
                '1.98.2',
                '1.99.0',
                '1.99.1',
                '1.99.2',
                '1.99.3',
                '1.100.0',
                '1.100.1',
                '1.100.2',
                '1.100.3',
                '1.101.0',
                '1.101.1',
                '1.101.2',
                '1.102.0',
                '1.102.1',
                '1.102.2',
                '1.102.3'
            ],
            fixedVersion: null,
            uriScheme: 'vscode'
        },

        // 系统信息配置
        system: null, // 将在初始化时动态生成

        // 系统信息访问计数器
        systemAccessCount: {
            platform: 0,
            arch: 0,
            hostname: 0,
            type: 0,
            release: 0,
            version: 0
        },

        // VSCode环境变量访问计数器
        vscodeEnvAccessCount: {
            uriScheme: 0,
            sessionId: 0,
            machineId: 0,
            isTelemetryEnabled: 0,
            language: 0,
            other: 0
        },
        
        // 网络拦截配置
        network: {
            enableHttpInterception: true,
            enableFetchInterception: true,
            enableXhrInterception: true,
            logInterceptions: true,
            // 被放行请求监控
            logAllowedRequests: false,  // 是否记录被放行的请求
            allowedRequestLogLimit: 1000,  // 整个原始请求包字符限制
            // 所有端点请求包打印
            logAllRequests: false,      // 是否记录所有请求（包括拦截和放行的）
            logInterceptedRequests: false,  // 是否记录被拦截的请求
            requestLogLimit: 2000      // 请求包详细日志字符限制
        },
        
        // 数据保护配置
        dataProtection: {
            enableAnalyticsBlocking: true,
            enableJsonCleaning: false, // 暂时禁用JSON拦截功能
            enableGitProtection: true,
            enableSessionIdReplacement: true,
            // 精确控制
            enablePreciseEventReporterControl: true,
            enableSmartDataClassification: true,
            enableEnhancedWhitelist: true,
            enableApiServerErrorReportInterception: true,
            enableSystemApiInterception: true,
            enableGitCommandInterception: true,
            enableVSCodeInterception: true
        }
    };

    // v2.5改进：更精确的拦截模式分类
    const TELEMETRY_PATTERNS = [
        "report-feature-vector",    // 特征向量报告
        "record-session-events",    // 会话事件记录
        "report-error",            // 错误报告
        "client-metrics",          // 客户端指标
        "record-request-events",   // 请求事件记录
        "record-user-events",      // 用户操作事件
        "record-preference-sample", // 用户偏好数据
        "chat-feedback",           // 反馈
        "completion-feedback",     // 反馈
        "next-edit-feedback",      // 反馈
        "analytics",               // 分析数据
        "telemetry",              // 遥测数据
        "tracking",               // 跟踪数据
        "metrics",                // 指标数据
        "usage",                  // 使用数据
        "stats",                  // 统计数据
        "event",                  // 事件数据
        "collect",                // 收集数据
        "gather",                 // 聚集数据
        "submit",                 // 提交数据
        "track",                  // 跟踪数据
        "monitor",                // 监控数据
        "observe",                // 观察数据
        "subscription-info"       // 订阅信息
    ];

    // 精确遥测端点模式（高优先级拦截）
    const PRECISE_TELEMETRY_ENDPOINTS = [
        "/record-session-events",      // 会话事件记录端点
        "/report-feature-vector",      // 特征向量报告端点
        "/record-request-events",      // 请求事件记录端点
        "/record-user-events",         // 用户操作事件端点
        "/record-preference-sample",   // 用户偏好数据端点
        "/client-metrics",             // 客户端指标端点
        "/chat-feedback",              // 聊天反馈端点
        "/completion-feedback",        // 代码补全反馈端点
        "/next-edit-feedback",         // 下一步编辑反馈端点
        "/analytics",                  // 分析数据端点
        "/telemetry",                  // 遥测数据端点
        "/tracking",                   // 跟踪数据端点
        "/metrics",                    // 指标数据端点
        "/usage",                      // 使用数据端点
        "/stats",                      // 统计数据端点
        "/subscription-info",          // 订阅信息端点
        "segment.io",                  // Segment分析服务
        "api.segment.io"               // Segment API端点
    ];

    // 必要端点白名单（最高优先级保护）
    const ESSENTIAL_ENDPOINTS = [
        "batch-upload",           // 代码库索引上传
        "memorize",              // 记忆功能
        "completion",            // 代码补全
        "chat-stream",           // 聊天流
        //"subscription-info",     // 订阅信息
        "get-models",           // 获取模型列表
        "token",                // 令牌相关
        "codebase-retrieval",   // 代码库检索
        "agents/",              // AI代理相关
        "remote-agents",        // 远程AI代理相关（修复list-stream错误）
        "list-stream",          // 流式列表API（远程代理概览）
        "augment-api",          // Augment API
        "augment-backend",      // Augment后端
        "workspace-context",    // 工作区上下文
        "symbol-index",         // 符号索引
        "blob-upload",          // 文件上传
        "codebase-upload",      // 代码库上传
        "file-sync",             // 文件同步
        "is-user-configured",   // 远程agent配置检查
        "list-repos"             // 远程agent仓库列表
    ];

    // 代码索引相关模式（白名单）
    const CODE_INDEXING_PATTERNS = [
        "batch-upload",           // 代码库索引核心功能
        "codebase-retrieval",     // 代码库检索
        "file-sync",              // 文件同步
        "workspace-context",      // 工作区上下文
        "symbol-index",           // 符号索引
        "blob-upload",            // 文件上传
        "codebase-upload",        // 代码库上传
        "agents/",                // AI代理相关
        "augment-api",            // Augment API
        "augment-backend"         // Augment后端
    ];

    // Event Reporter类型定义
    const EVENT_REPORTER_TYPES = [
        '_clientMetricsReporter',
        '_extensionEventReporter', 
        '_toolUseRequestEventReporter',
        '_nextEditSessionEventReporter',
        '_completionAcceptanceReporter',
        '_codeEditReporter',
        '_nextEditResolutionReporter',
        '_onboardingSessionEventReporter',
        '_completionTimelineReporter',
        '_featureVectorReporter'
    ];

    // 增强的拦截模式
    const enhancedBlockedPatterns = [
        // OAuth2认证相关
        //"oauth2", "oauth", "authorization_code", "client_credentials",
        //"token_endpoint", "auth_endpoint", "refresh_token",
        //"jwt", "bearer", "access_token",

        // Ask模式数据收集
        //"ask_mode", "question_data", "user_query", "conversation_data",

        // Bug报告功能
        "bug_report", "error_report", "crash_report", "diagnostic_data",

        // MCP工具数据传输
        //"mcp_data", "stripe_data", "sentry_data", "redis_data",

        // Segment.io 数据分析拦截
        "segment.io", "api.segment.io", "/v1/batch", "segment",
        "writeKey", "analytics.track", "analytics.identify",

        // 增强的身份追踪
        "user_id", "session_id", "anonymous_id", "device_id",
        "fingerprint", "tenant_id", "client_id"
    ];

    const INTERCEPT_PATTERNS = [...TELEMETRY_PATTERNS, ...enhancedBlockedPatterns];

    console.log(`[AugmentCode拦截器] 正在加载安全拦截器 ${INTERCEPTOR_CONFIG.version} (精确拦截版)...`);
    console.log(`[AugmentCode拦截器] 构建时间: ${INTERCEPTOR_CONFIG.buildTime}`);
    console.log(`[AugmentCode拦截器] 运行环境: VSCode 扩展上下文`);
    console.log(`[AugmentCode拦截器] 调试模式: ${INTERCEPTOR_CONFIG.debugMode ? '已启用' : '已禁用'}`);
    console.log(`[AugmentCode拦截器] 必要端点保护: ${ESSENTIAL_ENDPOINTS.length} 个端点`);

    // ==================== 1.5. 系统信息生成器 ====================

    /**
     * 生成逼真的假系统信息
     */
    const SystemInfoGenerator = {
        /**
         * 生成完整的假系统信息（平台感知版）
         */
        generateFakeSystemInfo() {
            // 获取真实平台信息用于生成对应的假信息
            const realPlatform = process.platform;
            const realArch = process.arch;

            log(`🔍 检测到真实平台: ${realPlatform}/${realArch}`);

            const baseInfo = {
                // 平台感知的系统信息
                platform: this.generatePlatformSpecificInfo(realPlatform),
                arch: this.generateArchSpecificInfo(realPlatform, realArch),
                hostname: this.generateHostname(),
                type: this.generateOSTypeForPlatform(realPlatform),
                version: this.generateOSVersionForPlatform(realPlatform),

                // VSCode相关
                vscodeVersion: this.generateVSCodeVersion(),
                machineId: this.generateMachineId()
            };

            // 根据平台添加特定的标识符
            if (realPlatform === 'darwin') {
                baseInfo.macUUID = this.generateMacUUID();
                baseInfo.macSerial = this.generateMacSerial();
                baseInfo.macBoardId = this.generateMacBoardId();
                baseInfo.macModel = this.generateMacModel();
                log(`🍎 生成macOS特定信息`);
            } else if (realPlatform === 'win32') {
                baseInfo.winGuid = this.generateWindowsGuid();
                baseInfo.winProductId = this.generateWindowsProductId();
                baseInfo.winSerial = this.generateWindowsSerial();
                log(`🪟 生成Windows特定信息`);
            } else {
                // Linux或其他平台
                baseInfo.linuxMachineId = this.generateLinuxMachineId();
                log(`🐧 生成Linux特定信息`);
            }

            return baseInfo;
        },

        /**
         * 生成Mac UUID
         */
        generateMacUUID() {
            return [8,4,4,4,12].map(len =>
                Array.from({length: len}, () =>
                    "0123456789ABCDEF"[Math.floor(Math.random() * 16)]
                ).join("")
            ).join("-");
        },

        /**
         * 生成Mac序列号（支持M系列处理器，使用真实前缀）
         */
        generateMacSerial() {
            // 获取真实架构来决定序列号格式
            const realArch = process.arch;

            // M系列处理器使用不同的序列号前缀
            const prefixes = realArch === 'arm64' ? [
                // M系列处理器序列号前缀
                'C02',  // 通用前缀
                'F4H',  // M1 MacBook Air
                'F86',  // M1 MacBook Pro
                'G8V',  // M1 iMac
                'H7J',  // M1 Pro MacBook Pro
                'J1G',  // M1 Max MacBook Pro
                'K2H',  // M2 MacBook Air
                'L3M',  // M2 MacBook Pro
                'M9N',  // M2 Pro MacBook Pro
                'N5P',  // M2 Max MacBook Pro
                'P7Q',  // M3 MacBook Air
                'Q8R',  // M3 MacBook Pro
                'R9S'   // M3 Pro/Max MacBook Pro
            ] : [
                // Intel处理器序列号前缀
                'C02',  // 通用前缀
                'C17',  // Intel MacBook Pro
                'C07',  // Intel MacBook Air
                'F5K',  // Intel iMac
                'G5K'   // Intel Mac Pro
            ];

            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];

            // 修复：确保生成正确的12字符长度序列号 (3字符前缀 + 9字符随机)
            // 使用更明确的字符集和长度控制
            const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            let suffix = "";
            for (let i = 0; i < 9; i++) {
                suffix += chars[Math.floor(Math.random() * chars.length)];
            }

            const serial = prefix + suffix;

            // 验证长度确保为12位
            if (serial.length !== 12) {
                console.warn(`⚠️ Mac序列号长度异常: ${serial} (长度: ${serial.length})`);
                // 如果长度不对，重新生成一个标准的12位序列号
                return 'C02' + Array.from({length: 9}, () =>
                    chars[Math.floor(Math.random() * chars.length)]
                ).join("");
            }

            return serial;
        },

        /**
         * 生成Windows GUID
         */
        generateWindowsGuid() {
            return "{" + [8,4,4,4,12].map(len =>
                Array.from({length: len}, () =>
                    "0123456789ABCDEF"[Math.floor(Math.random() * 16)]
                ).join("")
            ).join("-") + "}";
        },

        /**
         * 生成VSCode machineId格式（64位十六进制字符串）
         */
        generateMachineId() {
            return Array.from({length: 64}, () =>
                "0123456789abcdef"[Math.floor(Math.random() * 16)]
            ).join("");
        },

        /**
         * 生成Windows产品ID
         * 格式: 00330-91125-35784-AA503 (20个字符，全数字+固定AA)
         * 基于真实Windows ProductId格式
         */
        generateWindowsProductId() {
            // 第一组：5位数字 (产品相关编号)
            const firstGroup = Array.from({length: 5}, () =>
                "0123456789"[Math.floor(Math.random() * 10)]
            ).join("");

            // 第二组：5位数字 (随机序列号)
            const secondGroup = Array.from({length: 5}, () =>
                "0123456789"[Math.floor(Math.random() * 10)]
            ).join("");

            // 第三组：5位数字 (随机序列号)
            const thirdGroup = Array.from({length: 5}, () =>
                "0123456789"[Math.floor(Math.random() * 10)]
            ).join("");

            // 第四组：AA + 3位数字 (AA似乎是固定的)
            const fourthGroup = "AA" + Array.from({length: 3}, () =>
                "0123456789"[Math.floor(Math.random() * 10)]
            ).join("");

            return `${firstGroup}-${secondGroup}-${thirdGroup}-${fourthGroup}`;
        },

        /**
         * 生成平台特定信息（平台感知）
         * @param {string} realPlatform - 真实平台
         */
        generatePlatformSpecificInfo(realPlatform) {
            // 返回与真实平台相同的平台类型，但可能是假的具体版本
            return realPlatform;
        },

        /**
         * 生成架构特定信息（平台感知）
         * @param {string} realPlatform - 真实平台
         * @param {string} realArch - 真实架构
         */
        generateArchSpecificInfo(realPlatform, realArch) {
            // 保持真实架构类型以确保兼容性
            return realArch;
        },

        /**
         * 生成平台信息（已弃用，保留向后兼容）
         */
        generatePlatform() {
            const platforms = ['darwin', 'win32', 'linux'];
            return platforms[Math.floor(Math.random() * platforms.length)];
        },

        /**
         * 生成架构信息（已弃用，保留向后兼容）
         */
        generateArch() {
            const archs = ['x64', 'arm64'];
            return archs[Math.floor(Math.random() * archs.length)];
        },

        /**
         * 生成主机名（v2.5增强版 - 多样化格式）
         */
        generateHostname() {
            const prefixes = [
                'desktop', 'laptop', 'workstation', 'dev', 'user', 'admin', 'test',
                'build', 'server', 'client', 'node', 'host', 'machine', 'system',
                'office', 'home', 'work', 'studio', 'lab', 'prod', 'staging'
            ];
            const suffixes = [
                'pc', 'machine', 'host', 'system', 'box', 'rig', 'station',
                'node', 'device', 'unit', 'terminal', 'computer', 'workstation'
            ];
            const brands = [
                'dell', 'hp', 'lenovo', 'asus', 'acer', 'msi', 'apple', 'surface',
                'thinkpad', 'pavilion', 'inspiron', 'latitude', 'precision'
            ];
            const adjectives = [
                'fast', 'quick', 'smart', 'pro', 'elite', 'ultra', 'max', 'plus',
                'prime', 'core', 'edge', 'zen', 'nova', 'apex', 'flux', 'sync'
            ];

            // 生成多种主机名格式
            const formats = [
                // 传统格式：prefix-suffix-number (30%)
                () => {
                    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
                    const number = Math.floor(Math.random() * 999) + 1;
                    return `${prefix}-${suffix}-${number}`;
                },

                // 品牌格式：brand-model-number (20%)
                () => {
                    const brand = brands[Math.floor(Math.random() * brands.length)];
                    const model = adjectives[Math.floor(Math.random() * adjectives.length)];
                    const number = Math.floor(Math.random() * 9999) + 1000;
                    return `${brand}-${model}-${number}`;
                },

                // 下划线格式：prefix_suffix_number (15%)
                () => {
                    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
                    const number = Math.floor(Math.random() * 999) + 1;
                    return `${prefix}_${suffix}_${number}`;
                },

                // 简单格式：prefix + number (15%)
                () => {
                    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                    const number = Math.floor(Math.random() * 99) + 1;
                    return `${prefix}${number}`;
                },

                // 混合格式：adjective-prefix-number (10%)
                () => {
                    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
                    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                    const number = Math.floor(Math.random() * 999) + 1;
                    return `${adjective}-${prefix}-${number}`;
                },

                // 大写格式：PREFIX-NUMBER (5%)
                () => {
                    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                    const number = Math.floor(Math.random() * 9999) + 1000;
                    return `${prefix.toUpperCase()}-${number}`;
                },

                // 域名风格：prefix.suffix.local (3%)
                () => {
                    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
                    return `${prefix}.${suffix}.local`;
                },

                // 无分隔符格式：prefixnumber (2%)
                () => {
                    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                    const number = Math.floor(Math.random() * 999) + 1;
                    return `${prefix}${number}`;
                }
            ];

            // 按权重随机选择格式
            const weights = [30, 20, 15, 15, 10, 5, 3, 2]; // 对应上面8种格式的权重
            const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
            let random = Math.floor(Math.random() * totalWeight);

            let selectedIndex = 0;
            for (let i = 0; i < weights.length; i++) {
                random -= weights[i];
                if (random < 0) {
                    selectedIndex = i;
                    break;
                }
            }

            return formats[selectedIndex]();
        },

        /**
         * 生成平台特定的OS类型
         * @param {string} realPlatform - 真实平台
         */
        generateOSTypeForPlatform(realPlatform) {
            switch (realPlatform) {
                case 'darwin':
                    return 'Darwin';
                case 'win32':
                    return 'Windows_NT';
                case 'linux':
                    return 'Linux';
                default:
                    return 'Linux';
            }
        },

        /**
         * 生成平台特定的OS版本（支持M系列架构感知）
         * @param {string} realPlatform - 真实平台
         */
        generateOSVersionForPlatform(realPlatform) {
            switch (realPlatform) {
                case 'darwin':
                    // 获取真实架构来决定版本范围
                    const realArch = process.arch;

                    if (realArch === 'arm64') {
                        // M系列处理器支持的macOS版本 (Darwin kernel versions)
                        const mSeriesVersions = [
                            // macOS Big Sur (M1支持开始)
                            '20.6.0',  // macOS 11.6 Big Sur

                            // macOS Monterey (M1 Pro/Max支持)
                            '21.1.0',  // macOS 12.1 Monterey
                            '21.2.0',  // macOS 12.2 Monterey
                            '21.3.0',  // macOS 12.3 Monterey
                            '21.4.0',  // macOS 12.4 Monterey
                            '21.5.0',  // macOS 12.5 Monterey
                            '21.6.0',  // macOS 12.6 Monterey

                            // macOS Ventura (M2支持)
                            '22.1.0',  // macOS 13.1 Ventura
                            '22.2.0',  // macOS 13.2 Ventura
                            '22.3.0',  // macOS 13.3 Ventura
                            '22.4.0',  // macOS 13.4 Ventura
                            '22.5.0',  // macOS 13.5 Ventura
                            '22.6.0',  // macOS 13.6 Ventura

                            // macOS Sonoma (M3支持)
                            '23.0.0',  // macOS 14.0 Sonoma
                            '23.1.0',  // macOS 14.1 Sonoma
                            '23.2.0',  // macOS 14.2 Sonoma
                            '23.3.0',  // macOS 14.3 Sonoma
                            '23.4.0',  // macOS 14.4 Sonoma
                            '23.5.0',  // macOS 14.5 Sonoma
                            '23.6.0',  // macOS 14.6 Sonoma

                            // macOS Sequoia (M4支持)
                            '24.0.0',  // macOS 15.0 Sequoia
                            '24.1.0',  // macOS 15.1 Sequoia
                            '24.2.0'   // macOS 15.2 Sequoia
                        ];
                        return mSeriesVersions[Math.floor(Math.random() * mSeriesVersions.length)];
                    } else {
                        // Intel处理器支持的macOS版本 (包含更早的版本)
                        const intelVersions = [
                            // macOS Catalina (Intel支持)
                            '19.6.0',  // macOS 10.15.7 Catalina

                            // macOS Big Sur (Intel支持)
                            '20.1.0',  // macOS 11.1 Big Sur
                            '20.2.0',  // macOS 11.2 Big Sur
                            '20.3.0',  // macOS 11.3 Big Sur
                            '20.4.0',  // macOS 11.4 Big Sur
                            '20.5.0',  // macOS 11.5 Big Sur
                            '20.6.0',  // macOS 11.6 Big Sur

                            // macOS Monterey (Intel支持)
                            '21.1.0',  // macOS 12.1 Monterey
                            '21.2.0',  // macOS 12.2 Monterey
                            '21.3.0',  // macOS 12.3 Monterey
                            '21.4.0',  // macOS 12.4 Monterey
                            '21.5.0',  // macOS 12.5 Monterey
                            '21.6.0',  // macOS 12.6 Monterey

                            // macOS Ventura (Intel支持)
                            '22.1.0',  // macOS 13.1 Ventura
                            '22.2.0',  // macOS 13.2 Ventura
                            '22.3.0',  // macOS 13.3 Ventura
                            '22.4.0',  // macOS 13.4 Ventura
                            '22.5.0',  // macOS 13.5 Ventura
                            '22.6.0',  // macOS 13.6 Ventura

                            // macOS Sonoma (Intel支持)
                            '23.0.0',  // macOS 14.0 Sonoma
                            '23.1.0',  // macOS 14.1 Sonoma
                            '23.2.0',  // macOS 14.2 Sonoma
                            '23.3.0',  // macOS 14.3 Sonoma
                            '23.4.0',  // macOS 14.4 Sonoma
                            '23.5.0',  // macOS 14.5 Sonoma
                            '23.6.0'   // macOS 14.6 Sonoma (Intel最后支持版本)
                        ];
                        return intelVersions[Math.floor(Math.random() * intelVersions.length)];
                    }

                case 'win32':
                    // Windows版本
                    const winVersions = [
                        '10.0.19041',  // Windows 10 20H1
                        '10.0.19042',  // Windows 10 20H2
                        '10.0.19043',  // Windows 10 21H1
                        '10.0.19044',  // Windows 10 21H2
                        '10.0.22000',  // Windows 11 21H2
                        '10.0.22621',  // Windows 11 22H2
                        '10.0.22631'   // Windows 11 23H2
                    ];
                    return winVersions[Math.floor(Math.random() * winVersions.length)];

                case 'linux':
                default:
                    // Linux内核版本
                    const linuxVersions = [
                        '5.15.0',
                        '5.19.0',
                        '6.1.0',
                        '6.2.0',
                        '6.5.0',
                        '6.8.0'
                    ];
                    return linuxVersions[Math.floor(Math.random() * linuxVersions.length)];
            }
        },

        /**
         * 生成操作系统类型（已弃用，保留向后兼容）
         */
        generateOSType() {
            const types = ['Darwin', 'Windows_NT', 'Linux'];
            return types[Math.floor(Math.random() * types.length)];
        },

        /**
         * 生成操作系统版本（已弃用，保留向后兼容）
         */
        generateOSVersion() {
            const versions = [
                '22.6.0', '23.1.0', '23.2.0', '23.3.0', '23.4.0',
                '10.0.22621', '10.0.22631', '6.2.0', '6.5.0'
            ];
            return versions[Math.floor(Math.random() * versions.length)];
        },

        /**
         * 生成VSCode版本
         */
        generateVSCodeVersion() {
            return INTERCEPTOR_CONFIG.vscode.versions[
                Math.floor(Math.random() * INTERCEPTOR_CONFIG.vscode.versions.length)
            ];
        },

        /**
         * 生成假的macOS主板ID（随机16位十六进制）
         */
        generateMacBoardId() {
            // 生成完全随机的16位十六进制主板ID
            // 格式: Mac-XXXXXXXXXXXXXXXX (16位十六进制)
            const randomHex = Array.from({length: 16}, () =>
                "0123456789ABCDEF"[Math.floor(16 * Math.random())]
            ).join("");

            return `Mac-${randomHex}`;
        },

        /**
         * 生成假的Mac型号（基于真实架构）
         */
        generateMacModel() {
            // 获取真实架构来决定型号
            const realArch = process.arch;

            // 根据架构选择合适的Mac型号
            const models = realArch === 'arm64' ? [
                // M系列Mac型号
                'MacBookAir10,1',    // M1 MacBook Air
                'MacBookPro17,1',    // M1 MacBook Pro 13"
                'MacBookPro18,1',    // M1 Pro MacBook Pro 14"
                'MacBookPro18,2',    // M1 Pro MacBook Pro 16"
                'MacBookPro18,3',    // M1 Max MacBook Pro 14"
                'MacBookPro18,4',    // M1 Max MacBook Pro 16"
                'MacBookAir15,2',    // M2 MacBook Air
                'MacBookPro19,1',    // M2 MacBook Pro 13"
                'MacBookPro19,3',    // M2 Pro MacBook Pro 14"
                'MacBookPro19,4',    // M2 Pro MacBook Pro 16"
                'MacBookPro20,1',    // M2 Max MacBook Pro 14"
                'MacBookPro20,2',    // M2 Max MacBook Pro 16"
                'iMac21,1',          // M1 iMac 24"
                'iMac21,2',          // M1 iMac 24"
                'Macmini9,1',        // M1 Mac mini
                'MacStudio10,1',     // M1 Max Mac Studio
                'MacStudio10,2'      // M1 Ultra Mac Studio
            ] : [
                // Intel Mac型号
                'MacBookPro15,1',    // Intel MacBook Pro 15" 2018-2019
                'MacBookPro15,2',    // Intel MacBook Pro 13" 2018-2019
                'MacBookPro15,3',    // Intel MacBook Pro 15" 2019
                'MacBookPro15,4',    // Intel MacBook Pro 13" 2019
                'MacBookPro16,1',    // Intel MacBook Pro 16" 2019-2020
                'MacBookPro16,2',    // Intel MacBook Pro 13" 2020
                'MacBookPro16,3',    // Intel MacBook Pro 13" 2020
                'MacBookPro16,4',    // Intel MacBook Pro 16" 2020
                'MacBookAir8,1',     // Intel MacBook Air 2018
                'MacBookAir8,2',     // Intel MacBook Air 2019
                'MacBookAir9,1',     // Intel MacBook Air 2020
                'iMac19,1',          // Intel iMac 27" 2019
                'iMac19,2',          // Intel iMac 21.5" 2019
                'iMac20,1',          // Intel iMac 27" 2020
                'iMac20,2',          // Intel iMac 27" 2020
                'Macmini8,1',        // Intel Mac mini 2018
                'iMacPro1,1'         // Intel iMac Pro 2017
            ];

            const selectedModel = models[Math.floor(Math.random() * models.length)];
            log(`🎯 生成Mac型号: ${selectedModel} (架构: ${realArch})`);
            return selectedModel;
        },

        /**
         * 生成假的Windows序列号
         * 格式: 8位字符 (如: PF5X3L1C)，支持8位和10位两种格式
         */
        generateWindowsSerial() {
            const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            // 随机选择8位或10位格式 (8位更常见)
            const length = Math.random() < 0.7 ? 8 : 10;
            return Array.from({length}, () => chars[Math.floor(36 * Math.random())]).join("");
        },

        /**
         * 生成假的IOPlatform UUID（用于ioreg输出伪造）
         */
        generateFakeIOPlatformUUID() {
            return [8, 4, 4, 4, 12].map(length =>
                Array.from({length}, () => "0123456789ABCDEF"[Math.floor(16 * Math.random())]).join("")
            ).join("-");
        },

        /**
         * 生成假的IOPlatform序列号（用于ioreg输出伪造）
         * 修复：生成正确的12字符长度序列号
         */
        generateFakeIOPlatformSerial() {
            const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            return "C02" + Array.from({length: 9}, () => chars[Math.floor(36 * Math.random())]).join("");
        },

        /**
         * 生成Linux机器ID
         */
        generateLinuxMachineId() {
            // 生成类似 /etc/machine-id 的32位十六进制字符串
            return Array.from({length: 32}, () =>
                "0123456789abcdef"[Math.floor(16 * Math.random())]
            ).join("");
        }
    };

    // 初始化系统信息
    INTERCEPTOR_CONFIG.system = SystemInfoGenerator.generateFakeSystemInfo();
    log(`🖥️ 已生成假系统信息: ${INTERCEPTOR_CONFIG.system.platform}/${INTERCEPTOR_CONFIG.system.arch}`);

    // ==================== 2. v2.5核心改进：智能数据分类 ====================
    
    /**
     * 智能数据分类器
     * 精确区分代码索引数据和遥测数据
     */
    const SmartDataClassifier = {
        /**
         * 检查是否为必要端点（最高优先级保护）
         * @param {string} context - 上下文信息（通常是URL）
         * @returns {boolean} 是否为必要端点
         */
        isEssentialEndpoint(context = '') {
            if (!context) return false;

            const contextStr = context.toLowerCase();

            // 检查是否匹配必要端点
            const isEssential = ESSENTIAL_ENDPOINTS.some(endpoint => {
                const endpointLower = endpoint.toLowerCase();
                return contextStr.includes(endpointLower);
            });

            if (isEssential) {
                log(`🛡️ 必要端点保护: ${context}`);
                return true;
            }

            return false;
        },

        /**
         * 检查是否为精确的遥测端点
         * @param {string} context - 上下文信息（通常是URL）
         * @returns {boolean} 是否为精确的遥测端点
         */
        isPreciseTelemetryEndpoint(context = '') {
            if (!context) return false;

            const contextStr = context.toLowerCase();

            // 检查是否匹配精确的遥测端点
            const isExactMatch = PRECISE_TELEMETRY_ENDPOINTS.some(endpoint => {
                const endpointLower = endpoint.toLowerCase();
                return contextStr.includes(endpointLower);
            });

            if (isExactMatch) {
                log(`🚫 精确匹配遥测端点: ${context}`);
                return true;
            }

            return false;
        },

        /**
         * 检查数据是否为代码索引相关
         * @param {string|Object} data - 要检查的数据
         * @param {string} context - 上下文信息（URL、方法名等）
         * @returns {boolean} 是否为代码索引相关
         */
        isCodeIndexingRelated(data, context = '') {
            if (!data) return false;
            
            const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
            const contextStr = context.toLowerCase();
            
            // 检查代码索引模式
            const matchedPattern = CODE_INDEXING_PATTERNS.find(pattern =>
                dataStr.toLowerCase().includes(pattern.toLowerCase()) ||
                contextStr.includes(pattern.toLowerCase())
            );

            if (matchedPattern) {
                log(`✅ 识别为代码索引数据 [匹配模式: ${matchedPattern}]: ${context}`);
                return true;
            }

            return false;
        },

        /**
         * 检查数据是否为遥测数据
         * @param {string|Object} data - 要检查的数据
         * @param {string} context - 上下文信息
         * @returns {boolean} 是否为遥测数据
         */
        isTelemetryData(data, context = '') {
            if (!data) return false;
            
            const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
            const contextStr = context.toLowerCase();
            
            // 检查遥测模式
            const matchedPattern = TELEMETRY_PATTERNS.find(pattern =>
                dataStr.toLowerCase().includes(pattern.toLowerCase()) ||
                contextStr.includes(pattern.toLowerCase())
            );

            if (matchedPattern) {
                log(`🚫 识别为遥测数据 [匹配模式: ${matchedPattern}]: ${context}`);
                return true;
            }

            return false;
        },

        /**
         * v2.5改进：智能决策是否应该拦截上传（分层检查逻辑）
         * @param {string|Object} data - 数据
         * @param {string} context - 上下文
         * @returns {boolean} 是否应该拦截
         */
        shouldInterceptUpload(data, context = '') {
            // 第零层：必要端点保护（最高优先级，绝对不拦截）
            if (this.isEssentialEndpoint(context)) {
                log(`🛡️ [第零层] 必要端点保护，绝对不拦截: ${context}`);
                return false; // 绝对不拦截必要端点
            }

            // 第一层：精确遥测端点检查（高优先级）
            if (this.isPreciseTelemetryEndpoint(context)) {
                log(`🚫 [第一层] 精确遥测端点拦截: ${context}`);
                return true; // 必须拦截精确的遥测端点
            }

            // 第二层：通用遥测关键字检查
            if (this.isTelemetryData(data, context)) {
                log(`🚫 [第二层] 遥测关键字拦截: ${context}`);
                return true; // 拦截遥测数据
            }

            // 第三层：代码索引功能检查
            if (this.isCodeIndexingRelated(data, context)) {
                log(`✅ [第三层] 代码索引功能保护: ${context}`);
                return false; // 不拦截代码索引
            }

            // 第四层：默认保守策略
            log(`⚪ [第四层] 未知数据，采用保守策略: ${context}`);
            return false; // 不拦截未知数据
        }
    };

    // ==================== 3. v2.5核心改进：精确的enableUpload拦截 ====================
    
    /**
     * 精确的Event Reporter拦截器
     * 直接拦截enableUpload()方法调用，而不是依赖网络层拦截
     */
    const PreciseEventReporterInterceptor = {
        // 拦截统计
        interceptionStats: {
            totalInterceptions: 0,
            byReporter: {},
            byMethod: {},
            lastInterception: null
        },

        /**
         * 记录拦截统计
         * @param {string} reporterType - Reporter类型
         * @param {string} method - 被拦截的方法
         */
        recordInterception(reporterType, method) {
            this.interceptionStats.totalInterceptions++;
            this.interceptionStats.byReporter[reporterType] = (this.interceptionStats.byReporter[reporterType] || 0) + 1;
            this.interceptionStats.byMethod[method] = (this.interceptionStats.byMethod[method] || 0) + 1;
            this.interceptionStats.lastInterception = {
                reporterType,
                method,
                timestamp: new Date().toISOString()
            };
        },

        /**
         * 获取拦截统计
         * @returns {Object} 拦截统计信息
         */
        getInterceptionStats() {
            return {
                ...this.interceptionStats,
                topReporters: Object.entries(this.interceptionStats.byReporter)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5),
                topMethods: Object.entries(this.interceptionStats.byMethod)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
            };
        },

        /**
         * 初始化精确的Event Reporter拦截
         */
        initialize() {
            if (!INTERCEPTOR_CONFIG.dataProtection.enablePreciseEventReporterControl) {
                return;
            }

            log('🎯 初始化精确Event Reporter拦截...');
            
            // 拦截全局对象上的Event Reporter
            this.interceptGlobalReporters();
            
            // 拦截可能的模块导出
            this.interceptModuleExports();
            
            log('✅ 精确Event Reporter拦截设置完成');
        },

        /**
         * 拦截全局对象上的Event Reporter
         */
        interceptGlobalReporters() {
            EVENT_REPORTER_TYPES.forEach(reporterType => {
                this.interceptReporterType(reporterType);
            });
        },

        /**
         * 拦截特定类型的Reporter
         * @param {string} reporterType - Reporter类型名称
         */
        interceptReporterType(reporterType) {
            // 尝试在多个可能的全局对象上查找
            const globalObjects = [];

            // 安全地添加全局对象
            if (typeof global !== 'undefined') globalObjects.push(global);
            if (typeof window !== 'undefined') globalObjects.push(window);
            if (typeof self !== 'undefined') globalObjects.push(self);

            globalObjects.forEach(globalObj => {
                if (globalObj && globalObj[reporterType]) {
                    this.interceptReporterInstance(globalObj[reporterType], reporterType);
                }
            });
        },

        /**
         * 拦截Reporter实例的enableUpload方法
         * @param {Object} reporter - Reporter实例
         * @param {string} reporterType - Reporter类型
         */
        interceptReporterInstance(reporter, reporterType) {
            if (!reporter || typeof reporter !== 'object') return;
            
            if (typeof reporter.enableUpload === 'function') {
                const originalEnableUpload = reporter.enableUpload;
                
                reporter.enableUpload = function(...args) {
                    log(`🎭 拦截 ${reporterType}.enableUpload() 调用`);

                    // 详细记录拦截信息
                    const interceptInfo = {
                        reporterType: reporterType,
                        method: 'enableUpload',
                        timestamp: new Date().toISOString(),
                        args: args.length > 0 ? `${args.length} 个参数` : '无参数',
                        action: '拦截'
                    };

                    // 打印详细的拦截日志
                    console.log('\n📊 Event Reporter 拦截详情:');
                    console.log(`  🎯 Reporter类型: ${interceptInfo.reporterType}`);
                    console.log(`  🔧 调用方法: ${interceptInfo.method}()`);
                    console.log(`  ⏰ 拦截时间: ${interceptInfo.timestamp}`);
                    console.log(`  📋 参数信息: ${interceptInfo.args}`);
                    console.log(`  🚫 执行动作: ${interceptInfo.action}`);

                    // 如果有参数，尝试显示参数内容（安全地）
                    if (args.length > 0) {
                        try {
                            args.forEach((arg, index) => {
                                if (arg !== null && arg !== undefined) {
                                    const argType = typeof arg;
                                    const argPreview = argType === 'object' ?
                                        `[${argType}] ${Object.keys(arg).length} 个属性` :
                                        `[${argType}] ${String(arg).substring(0, 50)}${String(arg).length > 50 ? '...' : ''}`;
                                    console.log(`    参数 ${index + 1}: ${argPreview}`);
                                }
                            });
                        } catch (e) {
                            console.log(`    参数解析失败: ${e.message}`);
                        }
                    }

                    // v2.5简化：暂时注释掉代码索引Reporter检查，统一拦截所有遥测
                    // if (PreciseEventReporterInterceptor.isCodeIndexingReporter(reporterType)) {
                    //     log(`✅ 允许代码索引相关的 ${reporterType}.enableUpload()`);
                    //     return originalEnableUpload.apply(this, args);
                    // }

                    // 拦截所有遥测相关的Reporter
                    console.log(`  ✅ 拦截成功，已阻止数据上传\n`);
                    log(`🚫 阻止遥测相关的 ${reporterType}.enableUpload()`);

                    // 记录拦截统计
                    PreciseEventReporterInterceptor.recordInterception(reporterType, 'enableUpload');

                    return Promise.resolve(); // 返回成功，避免扩展报错
                };
            }
        },

        /**
         * v2.5简化：暂时注释掉代码索引Reporter检查功能
         * 判断Reporter是否与代码索引相关
         * @param {string} reporterType - Reporter类型
         * @returns {boolean} 是否与代码索引相关
         */
        // isCodeIndexingReporter(reporterType) {
        //     // 代码编辑和工具使用相关的Reporter可能与代码索引有关
        //     const codeIndexingReporters = [
        //         '_codeEditReporter',           // 代码编辑可能涉及索引更新
        //         '_toolUseRequestEventReporter' // 工具使用可能涉及代码检索
        //     ];
        //
        //     return codeIndexingReporters.includes(reporterType);
        // },

        /**
         * 拦截模块导出（如果Reporter通过模块系统导出）
         */
        interceptModuleExports() {
            // 拦截require函数，监控Reporter模块的加载
            if (typeof require !== 'undefined') {
                const originalRequire = require;
                
                require = function(moduleName) {
                    const module = originalRequire.apply(this, arguments);
                    
                    // 检查是否为Reporter相关模块
                    if (moduleName && typeof moduleName === 'string' && 
                        moduleName.toLowerCase().includes('reporter')) {
                        PreciseEventReporterInterceptor.interceptModuleReporters(module);
                    }
                    
                    return module;
                };
            }
        },

        /**
         * 拦截模块中的Reporter
         * @param {Object} module - 模块对象
         */
        interceptModuleReporters(module) {
            if (!module || typeof module !== 'object') return;

            Object.keys(module).forEach(key => {
                if (EVENT_REPORTER_TYPES.includes(key) && module[key]) {
                    this.interceptReporterInstance(module[key], key);
                }
            });
        }
    };

    // ==================== 3.5. API服务器错误报告拦截 ====================

    /**
     * API服务器错误报告拦截器
     * 拦截_apiServer.reportError()方法调用
     */
    const ApiServerErrorReportInterceptor = {
        /**
         * 初始化API服务器错误报告拦截
         */
        initialize() {
            if (!INTERCEPTOR_CONFIG.dataProtection.enableApiServerErrorReportInterception) {
                return;
            }

            log('🚫 初始化API服务器错误报告拦截...');

            this.interceptApiServerInstances();
            this.interceptApiServerConstructors();

            log('✅ API服务器错误报告拦截设置完成');
        },

        /**
         * 拦截现有的API服务器实例
         */
        interceptApiServerInstances() {
            // 尝试在多个可能的全局对象上查找API服务器实例
            const globalObjects = [];

            // 安全地添加全局对象
            if (typeof global !== 'undefined') globalObjects.push(global);
            if (typeof window !== 'undefined') globalObjects.push(window);
            if (typeof self !== 'undefined') globalObjects.push(self);

            globalObjects.forEach(globalObj => {
                if (globalObj) {
                    // 查找可能的API服务器实例
                    this.findAndInterceptApiServers(globalObj);
                }
            });
        },

        /**
         * 递归查找并拦截API服务器实例
         * @param {Object} obj - 要搜索的对象
         * @param {number} depth - 搜索深度
         */
        findAndInterceptApiServers(obj, depth = 0) {
            if (!obj || typeof obj !== 'object' || depth > 3) return;

            try {
                Object.keys(obj).forEach(key => {
                    if (key.includes('apiServer') || key.includes('_apiServer')) {
                        const apiServer = obj[key];
                        if (apiServer && typeof apiServer.reportError === 'function') {
                            this.interceptReportErrorMethod(apiServer, `${key}`);
                        }
                    }

                    // 递归搜索子对象
                    if (depth < 2 && obj[key] && typeof obj[key] === 'object') {
                        this.findAndInterceptApiServers(obj[key], depth + 1);
                    }
                });
            } catch (e) {
                // 忽略访问错误，继续搜索
            }
        },

        /**
         * 拦截API服务器构造函数
         */
        interceptApiServerConstructors() {
            // 拦截可能的API服务器类构造函数
            const possibleConstructorNames = [
                'APIServerImpl', 'APIServerImplWithErrorReporting',
                'ApiServer', 'APIServer'
            ];

            possibleConstructorNames.forEach(constructorName => {
                if (typeof global[constructorName] === 'function') {
                    this.interceptConstructor(global[constructorName], constructorName);
                }
            });
        },

        /**
         * 拦截构造函数
         * @param {Function} Constructor - 构造函数
         * @param {string} name - 构造函数名称
         */
        interceptConstructor(Constructor, name) {
            const originalConstructor = Constructor;

            global[name] = function(...args) {
                const instance = new originalConstructor(...args);

                // 拦截新创建实例的reportError方法
                if (typeof instance.reportError === 'function') {
                    ApiServerErrorReportInterceptor.interceptReportErrorMethod(instance, `${name} instance`);
                }

                return instance;
            };

            // 保留原始构造函数的属性
            Object.setPrototypeOf(global[name], originalConstructor);
            Object.getOwnPropertyNames(originalConstructor).forEach(prop => {
                if (prop !== 'length' && prop !== 'name' && prop !== 'prototype') {
                    global[name][prop] = originalConstructor[prop];
                }
            });
        },

        /**
         * 拦截reportError方法
         * @param {Object} apiServer - API服务器实例
         * @param {string} instanceName - 实例名称
         */
        interceptReportErrorMethod(apiServer, instanceName) {
            if (!apiServer || typeof apiServer.reportError !== 'function') return;

            const originalReportError = apiServer.reportError;

            apiServer.reportError = function(originalRequestId, sanitizedMessage, stackTrace, diagnostics) {
                log(`🚫 拦截API服务器错误报告: ${instanceName}`);
                log(`   错误类型: ${sanitizedMessage}`);
                log(`   请求ID: ${originalRequestId}`);

                // 检查是否为代码索引相关的错误
                if (ApiServerErrorReportInterceptor.isCodeIndexingRelatedError(sanitizedMessage, stackTrace)) {
                    log(`✅ 允许代码索引相关的错误报告: ${sanitizedMessage}`);
                    return originalReportError.apply(this, arguments);
                }

                // 拦截遥测相关的错误报告
                log(`🚫 阻止遥测相关的错误报告: ${sanitizedMessage}`);
                return Promise.resolve(); // 返回成功，避免扩展报错
            };

            log(`🎯 已拦截 ${instanceName} 的 reportError 方法`);
        },

        /**
         * 判断错误是否与代码索引相关
         * @param {string} message - 错误消息
         * @param {string} stackTrace - 堆栈跟踪
         * @returns {boolean} 是否与代码索引相关
         */
        isCodeIndexingRelatedError(message, stackTrace) {
            if (!message && !stackTrace) return false;

            const combinedText = `${message || ''} ${stackTrace || ''}`.toLowerCase();

            // 代码索引相关的错误模式
            const codeIndexingErrorPatterns = [
                'batch-upload', 'codebase-retrieval', 'file-sync',
                'workspace-context', 'symbol-index', 'agents/',
                'file upload', 'code analysis', 'syntax error',
                'compilation error', 'workspace error'
            ];

            // 检查是否匹配代码索引相关模式
            const isCodeIndexing = codeIndexingErrorPatterns.some(pattern =>
                combinedText.includes(pattern)
            );

            if (isCodeIndexing) {
                return true;
            }

            // 遥测相关的错误模式（应该被拦截）
            const telemetryErrorPatterns = [
                'analytics', 'telemetry', 'tracking', 'metrics',
                'segment', 'feature-vector', 'user-behavior',
                'session-events', 'client-metrics'
            ];

            const isTelemetry = telemetryErrorPatterns.some(pattern =>
                combinedText.includes(pattern)
            );

            // 如果是遥测相关错误，返回false（应该被拦截）
            if (isTelemetry) {
                return false;
            }

            // 对于未知错误，采用保守策略：允许报告
            return true;
        }
    };

    // ==================== 4. 核心工具函数 ====================
    
    /**
     * 生成UUID格式的随机ID
     * @returns {string} UUID格式的字符串
     */
    function generateUUID() {
        const chars = "0123456789abcdef";
        let result = "";
        for (let i = 0; i < 36; i++) {
            if (i === 8 || i === 13 || i === 18 || i === 23) {
                result += "-";
            } else if (i === 14) {
                result += "4";
            } else if (i === 19) {
                result += chars[8 + Math.floor(Math.random() * 4)];
            } else {
                result += chars[Math.floor(Math.random() * 16)];
            }
        }
        return result;
    }

    /**
     * v2.5改进：更智能的URL拦截判断（带缓存优化）
     * @param {string} url - 要检查的URL
     * @param {string} data - 请求数据（可选）
     * @returns {boolean} 是否应该拦截
     */
    function shouldInterceptUrl(url, data = '') {
        if (typeof url !== "string") return false;

        // 检查缓存
        const cached = URLClassificationCache.get(url, data);
        if (cached !== null) {
            return cached.shouldIntercept;
        }

        const urlLower = url.toLowerCase();
        let shouldIntercept = false;
        let reason = '';

        // 优先检查代码索引白名单
        if (INTERCEPTOR_CONFIG.dataProtection.enableEnhancedWhitelist) {
            const isCodeIndexing = CODE_INDEXING_PATTERNS.some(pattern =>
                urlLower.includes(pattern.toLowerCase())
            );

            if (isCodeIndexing) {
                shouldIntercept = false;
                reason = '代码索引白名单保护';
                log(`✅ 代码索引白名单保护: ${url}`);
            }
        }

        if (!shouldIntercept) {
            // 检查是否匹配拦截模式
            const matchesInterceptPattern = INTERCEPT_PATTERNS.some(pattern =>
                urlLower.includes(pattern.toLowerCase())
            );

            if (matchesInterceptPattern) {
                // 检查是否为重要功能URL（不拦截）
                const importantPatterns = [
                    'vscode-webview://', 'vscode-file://', 'vscode-resource://',
                    'localhost:', '127.0.0.1:', 'file://', 'data:', 'blob:',
                    'chrome-extension://', 'moz-extension://', 'ms-browser-extension://'
                ];

                const isImportant = importantPatterns.some(pattern =>
                    urlLower.includes(pattern)
                );

                if (isImportant) {
                    shouldIntercept = false;
                    reason = '重要功能URL保护';
                    if (INTERCEPTOR_CONFIG.network.logInterceptions) {
                        log(`✅ 允许重要功能URL: ${url}`);
                    }
                } else {
                    shouldIntercept = true;
                    reason = '匹配拦截模式';
                }
            } else {
                shouldIntercept = false;
                reason = '未匹配拦截模式';
            }
        }

        // 缓存结果
        const result = { shouldIntercept, reason };
        URLClassificationCache.set(url, data, result);

        return shouldIntercept;
    }

    /**
     * 检查值是否为会话ID
     * @param {any} value - 要检查的值
     * @returns {boolean} 是否为会话ID
     */
    function isSessionId(value) {
        if (typeof value !== "string") return false;
        
        // UUID格式检查
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(value)) return true;
        
        // 其他会话ID格式
        if (value.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(value)) return true;
        
        return false;
    }

    /**
     * 日志输出函数
     * @param {string} message - 日志消息
     * @param {string} level - 日志级别 (info, warn, error)
     */
    function log(message, level = 'info') {
        if (!INTERCEPTOR_CONFIG.debugMode) return;

        const prefix = '[AugmentCode拦截器]';
        switch (level) {
            case 'warn':
                console.warn(`${prefix} ⚠️ ${message}`);
                break;
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }

    // ==================== 5. v2.5改进：更安全的Analytics拦截 ====================

    /**
     * 安全的Analytics代理拦截器
     * 使用代理模式而不是完全替换，保留必要功能
     */
    const SafeAnalyticsInterceptor = {
        /**
         * 初始化安全的Analytics拦截
         */
        initialize() {
            if (!INTERCEPTOR_CONFIG.dataProtection.enableAnalyticsBlocking) {
                return;
            }

            log('🛡️ 初始化安全Analytics拦截...');

            this.interceptSegmentFunctions();
            this.interceptAnalyticsObject();

            log('✅ 安全Analytics拦截设置完成');
        },

        /**
         * 拦截Segment.io相关函数（使用代理模式）
         */
        interceptSegmentFunctions() {
            const segmentFunctions = ['track', 'identify', 'page', 'screen', 'group', 'alias'];

            segmentFunctions.forEach(funcName => {
                if (typeof global[funcName] === 'function') {
                    const originalFunc = global[funcName];

                    global[funcName] = function(...args) {
                        // v2.5改进：检查是否为代码索引相关调用
                        if (SafeAnalyticsInterceptor.isCodeIndexingCall(funcName, args)) {
                            log(`✅ 允许代码索引相关的 ${funcName} 调用`);
                            return originalFunc.apply(this, args);
                        }

                        log(`🚫 拦截遥测相关的 Segment ${funcName} 调用`);
                        return Promise.resolve({ success: true });
                    };
                }
            });
        },

        /**
         * 拦截Analytics对象（使用代理模式）
         */
        interceptAnalyticsObject() {
            if (typeof global.Analytics === 'function') {
                const OriginalAnalytics = global.Analytics;

                global.Analytics = function(config) {
                    logOnce('🛡️ 拦截 Analytics 初始化', 'analytics-init-intercept');

                    // 创建原始实例
                    const originalInstance = new OriginalAnalytics(config);

                    // 返回代理对象而不是完全替换
                    return SafeAnalyticsInterceptor.createAnalyticsProxy(originalInstance);
                };

                // 保留原始构造函数的属性
                Object.setPrototypeOf(global.Analytics, OriginalAnalytics);
                Object.getOwnPropertyNames(OriginalAnalytics).forEach(prop => {
                    if (prop !== 'length' && prop !== 'name' && prop !== 'prototype') {
                        global.Analytics[prop] = OriginalAnalytics[prop];
                    }
                });
            }
        },

        /**
         * 创建Analytics代理对象
         * @param {Object} originalInstance - 原始Analytics实例
         * @returns {Proxy} 代理对象
         */
        createAnalyticsProxy(originalInstance) {
            return new Proxy(originalInstance, {
                get(target, prop) {
                    if (['track', 'identify', 'page', 'screen', 'group', 'alias'].includes(prop)) {
                        return function(...args) {
                            // v2.5改进：智能判断是否为代码索引相关
                            if (SafeAnalyticsInterceptor.isCodeIndexingCall(prop, args)) {
                                log(`✅ 允许代码索引相关的 analytics.${prop}`);
                                return target[prop].apply(target, args);
                            }

                            log(`🚫 拦截遥测相关的 analytics.${prop}`);
                            return Promise.resolve();
                        };
                    }

                    return target[prop];
                }
            });
        },

        /**
         * 判断Analytics调用是否与代码索引相关
         * @param {string} method - 调用的方法名
         * @param {Array} args - 调用参数
         * @returns {boolean} 是否与代码索引相关
         */
        isCodeIndexingCall(method, args) {
            if (!args || args.length === 0) return false;

            // 检查第一个参数（通常是事件名或数据对象）
            const firstArg = args[0];
            if (typeof firstArg === 'string') {
                return SmartDataClassifier.isCodeIndexingRelated(firstArg, method);
            } else if (typeof firstArg === 'object') {
                return SmartDataClassifier.isCodeIndexingRelated(firstArg, method);
            }

            return false;
        }
    };

    // ==================== 6. 会话管理模块 ====================

    const SessionManager = {
        // 生成的会话ID缓存
        sessionIds: {
            main: generateUUID(),
            user: generateUUID(),
            anonymous: generateUUID()
        },

        /**
         * 获取主会话ID
         * @returns {string} 主会话ID
         */
        getMainSessionId() {
            return this.sessionIds.main;
        },

        /**
         * 获取用户ID
         * @returns {string} 用户ID
         */
        getUserId() {
            return this.sessionIds.user;
        },

        /**
         * 获取匿名ID
         * @returns {string} 匿名ID
         */
        getAnonymousId() {
            return this.sessionIds.anonymous;
        },

        /**
         * 重新生成所有会话ID
         */
        regenerateAll() {
            this.sessionIds.main = generateUUID();
            this.sessionIds.user = generateUUID();
            this.sessionIds.anonymous = generateUUID();
            log('🔄 已重新生成所有会话ID');
        },

        /**
         * 替换请求头中的会话ID
         * @param {Object} headers - 请求头对象
         * @returns {boolean} 是否进行了替换
         */
        replaceSessionIds(headers) {
            if (!headers || typeof headers !== 'object') return false;

            let replaced = false;

            // 定义不同类型的ID字段及其对应的生成策略
            const idFieldMappings = {
                // 请求ID - 每次请求都应该是唯一的
                //"x-request-id": () => this.generateUniqueRequestId(),

                // 会话ID - 使用主会话ID
                "x-request-session-id": () => this.getMainSessionId(),
                // "session-id": () => this.getMainSessionId(),
                // "sessionId": () => this.getMainSessionId(),
                // "x-session-id": () => this.getMainSessionId(),

                // // 用户ID - 使用用户ID
                // "x-user-id": () => this.getUserId(),
                // "user-id": () => this.getUserId(),
                // "userId": () => this.getUserId(),
                // "x-user": () => this.getUserId()
            };

            // 处理Headers对象
            if (headers instanceof Headers) {
                Object.entries(idFieldMappings).forEach(([field, generator]) => {
                    if (headers.has(field)) {
                        const originalValue = headers.get(field);
                        if (isSessionId(originalValue)) {
                            const newValue = generator();
                            headers.set(field, newValue);
                            log(`🎭 替换Headers中的${field}: ${originalValue} → ${newValue}`);
                            replaced = true;
                        }
                    }
                });
            }
            // 处理普通对象
            else {
                Object.entries(idFieldMappings).forEach(([field, generator]) => {
                    if (headers[field] && isSessionId(headers[field])) {
                        const originalValue = headers[field];
                        const newValue = generator();
                        headers[field] = newValue;
                        log(`🎭 替换对象中的${field}: ${originalValue} → ${newValue}`);
                        replaced = true;
                    }
                });
            }

            return replaced;
        },

        /**
         * 生成唯一的请求ID
         * 每次调用都生成新的ID，用于x-request-id等字段
         */
        generateUniqueRequestId() {
            return [8,4,4,4,12].map(len =>
                Array.from({length: len}, () =>
                    "0123456789abcdef"[Math.floor(Math.random() * 16)]
                ).join("")
            ).join("-");
        }
    };

    log(`🆔 会话管理器初始化完成，主会话ID: ${SessionManager.getMainSessionId()}`);

    // ==================== 7. v2.5改进：优化的JSON拦截 ====================
    // 注意：JSON拦截功能已暂时禁用，避免潜在的递归问题

    /**
     * 智能JSON拦截器（暂时禁用）
     * 更保守的JSON拦截策略，避免影响正常功能
     */
    const SmartJsonInterceptor = {
        /**
         * 初始化智能JSON拦截
         */
        initialize() {
            if (!INTERCEPTOR_CONFIG.dataProtection.enableJsonCleaning) {
                return;
            }

            log('🔍 初始化智能JSON拦截...');

            this.interceptJsonStringify();

            log('✅ 智能JSON拦截设置完成');
        },

        /**
         * 拦截JSON.stringify（修复无限递归问题）
         */
        interceptJsonStringify() {
            if (typeof global.JSON !== 'undefined' && global.JSON.stringify) {
                const originalStringify = global.JSON.stringify;

                global.JSON.stringify = function(value, replacer, space) {
                    try {
                        // v2.5修复：避免无限递归，直接检查原始值而不是序列化后的字符串
                        const valueStr = typeof value === 'string' ? value :
                                        (value && typeof value === 'object' ? Object.keys(value).join(' ') : String(value));

                        // 检查是否为代码索引相关数据
                        if (SmartDataClassifier.isCodeIndexingRelated(valueStr, 'JSON.stringify')) {
                            log('✅ 允许代码索引相关的JSON序列化');
                            return originalStringify.apply(this, arguments);
                        }

                        // 检查是否为遥测数据
                        if (SmartDataClassifier.isTelemetryData(valueStr, 'JSON.stringify')) {
                            logOnce('🚫 拦截遥测相关的JSON序列化', 'json-telemetry-intercept');
                            return SmartJsonInterceptor.createSafeReplacer(value, replacer, space, originalStringify);
                        }

                        // 默认允许（保守策略）
                        return originalStringify.apply(this, arguments);

                    } catch (e) {
                        // 如果检查失败，使用原始方法（保守策略）
                        log(`⚠️ JSON拦截检查失败，使用原始方法: ${e.message}`, 'warn');
                        return originalStringify.apply(this, arguments);
                    }
                };
            }
        },

        /**
         * 创建安全的替换器
         * @param {any} value - 原始值
         * @param {Function} replacer - 原始替换器
         * @param {string|number} space - 空格参数
         * @param {Function} originalStringify - 原始JSON.stringify方法
         * @returns {string} 安全的JSON字符串
         */
        createSafeReplacer(value, replacer, space, originalStringify) {
            const safeReplacer = function(key, val) {
                // 移除敏感字段
                const sensitiveFields = [
                    'sessionId', 'userId', 'machineId', 'deviceId',
                    'email', 'username', 'token', 'password',
                    'analytics', 'telemetry', 'tracking'
                ];

                if (sensitiveFields.includes(key)) {
                    return '[REDACTED]';
                }

                // 如果有原始replacer，先应用它
                if (typeof replacer === 'function') {
                    val = replacer.call(this, key, val);
                }

                return val;
            };

            // 使用传入的原始stringify方法，避免递归调用
            return originalStringify(value, safeReplacer, space);
        }
    };

    // ==================== 7.5. 系统API拦截器 ====================

    /**
     * 系统API拦截器
     * 拦截process对象和os模块，返回假系统信息
     */
    const SystemApiInterceptor = {
        /**
         * 初始化系统API拦截
         */
        initialize() {
            if (!INTERCEPTOR_CONFIG.dataProtection.enableSystemApiInterception) {
                return;
            }

            log('🖥️ 初始化系统API拦截...');

            this.interceptProcessObject();
            this.interceptOSModule();

            log('✅ 系统API拦截设置完成');
        },

        /**
         * 拦截process对象
         */
        interceptProcessObject() {
            if (typeof process !== 'undefined') {
                // 拦截 process.platform
                if (process.platform) {
                    Object.defineProperty(process, 'platform', {
                        get: function() {
                            return INTERCEPTOR_CONFIG.system.platform;
                        },
                        configurable: true,
                        enumerable: true
                    });
                    log(`🎭 已拦截 process.platform: ${INTERCEPTOR_CONFIG.system.platform}`);
                }

                // 拦截 process.arch
                if (process.arch) {
                    Object.defineProperty(process, 'arch', {
                        get: function() {
                            return INTERCEPTOR_CONFIG.system.arch;
                        },
                        configurable: true,
                        enumerable: true
                    });
                    log(`🎭 已拦截 process.arch: ${INTERCEPTOR_CONFIG.system.arch}`);
                }
            }
        },

        /**
         * 拦截OS模块
         */
        interceptOSModule() {
            // 拦截require('os')
            if (typeof require !== 'undefined') {
                const originalRequire = require;

                require = function(moduleName) {
                    const module = originalRequire.apply(this, arguments);

                    if (moduleName === 'os') {
                        logOnce('🖥️ 拦截OS模块...', 'os-module-intercept');
                        return SystemApiInterceptor.createOSProxy(module);
                    }

                    return module;
                };

                // 保留原始require的属性
                Object.setPrototypeOf(require, originalRequire);
                Object.getOwnPropertyNames(originalRequire).forEach(prop => {
                    if (prop !== 'length' && prop !== 'name') {
                        require[prop] = originalRequire[prop];
                    }
                });
            }
        },

        /**
         * 创建OS模块代理
         * @param {Object} originalOS - 原始OS模块
         * @returns {Proxy} OS模块代理
         */
        createOSProxy(originalOS) {
            return new Proxy(originalOS, {
                get(target, prop) {
                    switch (prop) {
                        case 'platform':
                            return function() {
                                INTERCEPTOR_CONFIG.systemAccessCount.platform++;
                                if (INTERCEPTOR_CONFIG.systemAccessCount.platform === 1) {
                                    log(`🎭 拦截 os.platform(): ${INTERCEPTOR_CONFIG.system.platform}`);
                                } else if (INTERCEPTOR_CONFIG.systemAccessCount.platform % 10 === 0) {
                                    log(`🎭 拦截 os.platform(): ${INTERCEPTOR_CONFIG.system.platform} (第${INTERCEPTOR_CONFIG.systemAccessCount.platform}次访问)`);
                                }
                                return INTERCEPTOR_CONFIG.system.platform;
                            };
                        case 'arch':
                            return function() {
                                INTERCEPTOR_CONFIG.systemAccessCount.arch++;
                                if (INTERCEPTOR_CONFIG.systemAccessCount.arch === 1) {
                                    log(`🎭 拦截 os.arch(): ${INTERCEPTOR_CONFIG.system.arch}`);
                                } else if (INTERCEPTOR_CONFIG.systemAccessCount.arch % 10 === 0) {
                                    log(`🎭 拦截 os.arch(): ${INTERCEPTOR_CONFIG.system.arch} (第${INTERCEPTOR_CONFIG.systemAccessCount.arch}次访问)`);
                                }
                                return INTERCEPTOR_CONFIG.system.arch;
                            };
                        case 'hostname':
                            return function() {
                                INTERCEPTOR_CONFIG.systemAccessCount.hostname++;
                                if (INTERCEPTOR_CONFIG.systemAccessCount.hostname === 1) {
                                    log(`🎭 拦截 os.hostname(): ${INTERCEPTOR_CONFIG.system.hostname}`);
                                } else if (INTERCEPTOR_CONFIG.systemAccessCount.hostname % 10 === 0) {
                                    log(`🎭 拦截 os.hostname(): ${INTERCEPTOR_CONFIG.system.hostname} (第${INTERCEPTOR_CONFIG.systemAccessCount.hostname}次访问)`);
                                }
                                return INTERCEPTOR_CONFIG.system.hostname;
                            };
                        case 'type':
                            return function() {
                                INTERCEPTOR_CONFIG.systemAccessCount.type++;
                                if (INTERCEPTOR_CONFIG.systemAccessCount.type === 1) {
                                    log(`🎭 拦截 os.type(): ${INTERCEPTOR_CONFIG.system.type}`);
                                } else if (INTERCEPTOR_CONFIG.systemAccessCount.type % 10 === 0) {
                                    log(`🎭 拦截 os.type(): ${INTERCEPTOR_CONFIG.system.type} (第${INTERCEPTOR_CONFIG.systemAccessCount.type}次访问)`);
                                }
                                return INTERCEPTOR_CONFIG.system.type;
                            };
                        case 'release':
                        case 'version':
                            return function() {
                                const countKey = prop === 'release' ? 'release' : 'version';
                                INTERCEPTOR_CONFIG.systemAccessCount[countKey]++;
                                if (INTERCEPTOR_CONFIG.systemAccessCount[countKey] === 1) {
                                    log(`🎭 拦截 os.${prop}(): ${INTERCEPTOR_CONFIG.system.version}`);
                                } else if (INTERCEPTOR_CONFIG.systemAccessCount[countKey] % 10 === 0) {
                                    log(`🎭 拦截 os.${prop}(): ${INTERCEPTOR_CONFIG.system.version} (第${INTERCEPTOR_CONFIG.systemAccessCount[countKey]}次访问)`);
                                }
                                return INTERCEPTOR_CONFIG.system.version;
                            };
                        default:
                            return target[prop];
                    }
                }
            });
        }
    };

    // ==================== 7.6. 系统命令拦截器 ====================

    /**
     * v2.5扩展：系统命令拦截器
     * 拦截敏感的系统命令（Git、ioreg、注册表等），返回假信息
     */
    const SystemCommandInterceptor = {
        /**
         * Git命令配置表（保持向后兼容）
         * 定义敏感Git命令的匹配模式和替换策略
         */
        commandConfig: {
            // 用户配置相关命令
            userConfig: {
                patterns: [
                    "git config user.email",
                    "git config user.name",
                    "git config --get user.email",
                    "git config --get user.name",
                    "git config --global user.email",
                    "git config --global user.name"
                ],
                shouldReplace: (command, error, stdout, stderr) => {
                    // 如果有有效的输出（不是错误），就替换
                    return !error && stdout && stdout.trim().length > 0;
                }
            },

            // 远程仓库URL相关命令
            remoteUrl: {
                patterns: [
                    "git config --get remote.origin.url",
                    "git remote get-url origin",
                    "git remote get-url",
                    "git remote -v"
                ],
                shouldReplace: (command, error, stdout, stderr) => {
                    // 如果命令执行成功且返回了有效的URL，就替换
                    if (!error && stdout && stdout.trim().length > 0) {
                        const output = stdout.trim();

                        // 增强的Git URL验证
                        const isValidGitUrl = SystemCommandInterceptor.isValidGitUrl(output);

                        if (isValidGitUrl) {
                            // 对于多行输出，显示第一行作为示例
                            const firstLine = output.split('\n')[0];
                            const displayOutput = output.includes('\n') ?
                                `${firstLine}... (${output.split('\n').length} 行)` :
                                output;
                            log(`🔍 检测到真实Git仓库URL，将进行替换: ${displayOutput}`);
                            return true;
                        } else {
                            log(`💡 输出不是有效的Git URL，不进行替换: ${output.substring(0, 100)}${output.length > 100 ? '...' : ''}`);
                            return false;
                        }
                    }

                    // 如果命令执行失败，检查错误信息
                    if (error || stderr) {
                        const errorMessage = (stderr || error?.message || "").toLowerCase();

                        // 常见的"不是Git仓库"错误信息
                        const notGitRepoErrors = [
                            "fatal: not a git repository",
                            "not a git repository",
                            "fatal: no such remote",
                            "fatal: no upstream configured",
                            "fatal: 'origin' does not appear to be a git repository"
                        ];

                        // 系统级错误信息（不应该被替换）
                        const systemErrors = [
                            "spawn cmd.exe enoent",
                            "spawn git enoent",
                            "enoent",
                            "command not found",
                            "is not recognized as an internal or external command",
                            "no such file or directory",
                            "permission denied",
                            "access denied",
                            "cannot access",
                            "file not found"
                        ];

                        const isNotGitRepo = notGitRepoErrors.some(errorPattern =>
                            errorMessage.includes(errorPattern)
                        );

                        const isSystemError = systemErrors.some(errorPattern =>
                            errorMessage.includes(errorPattern)
                        );

                        if (isNotGitRepo) {
                            log(`💡 检测到非Git仓库错误，不进行替换: ${errorMessage}`);
                            return false;
                        } else if (isSystemError) {
                            log(`🚫 检测到系统级错误，不进行替换: ${errorMessage}`);
                            return false;
                        } else {
                            log(`🔍 检测到其他Git错误，可能需要替换: ${errorMessage}`);
                            return true;
                        }
                    }

                    return false;
                }
            },

            // 其他敏感命令
            other: {
                patterns: [
                    "git config --list",
                    "git log --author",
                    "git log --pretty"
                ],
                shouldReplace: (command, error, stdout, stderr) => {
                    // 对于其他命令，如果有输出就替换
                    return !error && stdout && stdout.trim().length > 0;
                }
            }
        },

        /**
         * 统一的系统命令分析方法（扩展版）
         * @param {string} command - 要分析的命令
         * @param {Error|null} error - 执行错误
         * @param {string} stdout - 标准输出
         * @param {string} stderr - 错误输出
         * @returns {Object} 匹配结果 {isSensitive: boolean, shouldReplace: boolean, commandType: string}
         */
        analyzeSystemCommand(command, error = null, stdout = "", stderr = "") {
            if (typeof command !== "string") {
                return { isSensitive: false, shouldReplace: false, commandType: null };
            }

            const normalizedCommand = command.toLowerCase().trim();

            // 检测macOS ioreg命令
            if (normalizedCommand.includes('ioreg')) {
                log(`🔍 检测到ioreg命令: ${command}`);

                // 分析具体的ioreg命令类型
                let ioregType = 'general';
                if (normalizedCommand.includes('-c ioplatformexpertdevice') ||
                    normalizedCommand.includes('-c IOPlatformExpertDevice')) {
                    ioregType = 'platform';
                } else if (normalizedCommand.includes('-p iousb') ||
                          normalizedCommand.includes('-p IOUSB')) {
                    ioregType = 'usb';
                }

                return {
                    isSensitive: true,
                    shouldReplace: true,
                    commandType: 'ioreg',
                    ioregType: ioregType
                };
            }

            // 检测Windows注册表命令
            if (normalizedCommand.includes('reg query') ||
                normalizedCommand.includes('reg.exe query') ||
                normalizedCommand.includes('wmic') ||
                normalizedCommand.includes('systeminfo')) {
                log(`🔍 检测到Windows注册表命令: ${command}`);
                return {
                    isSensitive: true,
                    shouldReplace: true,
                    commandType: 'registry'
                };
            }

            // 检测Git命令
            if (normalizedCommand.includes('git ') || normalizedCommand.startsWith('git')) {
                const gitAnalysis = this.analyzeGitCommand(command, error, stdout, stderr);
                return {
                    isSensitive: gitAnalysis.isSensitive,
                    shouldReplace: gitAnalysis.shouldReplace,
                    commandType: 'git',
                    configType: gitAnalysis.configType
                };
            }

            return { isSensitive: false, shouldReplace: false, commandType: null };
        },

        /**
         * 统一的Git命令匹配和判断方法
         * @param {string} command - Git命令
         * @param {Error|null} error - 执行错误
         * @param {string} stdout - 标准输出
         * @param {string} stderr - 错误输出
         * @returns {Object} 匹配结果 {isSensitive: boolean, shouldReplace: boolean, configType: string}
         */
        analyzeGitCommand(command, error = null, stdout = "", stderr = "") {
            if (typeof command !== "string") {
                return { isSensitive: false, shouldReplace: false, configType: null };
            }

            const isGitCommand = command.includes("git ") || command.startsWith("git");
            if (!isGitCommand) {
                return { isSensitive: false, shouldReplace: false, configType: null };
            }

            const normalizedCommand = command.toLowerCase().replace(/\s+/g, " ").trim();

            // 遍历所有配置类型
            for (const [configType, config] of Object.entries(this.commandConfig)) {
                // 检查是否匹配任何模式
                const isMatch = config.patterns.some(pattern =>
                    normalizedCommand.includes(pattern.toLowerCase())
                );

                if (isMatch) {
                    const shouldReplace = config.shouldReplace(command, error, stdout, stderr);
                    return {
                        isSensitive: true,
                        shouldReplace: shouldReplace,
                        configType: configType
                    };
                }
            }

            return { isSensitive: false, shouldReplace: false, configType: null };
        },

        /**
         * 初始化系统命令拦截
         */
        initialize() {
            if (!INTERCEPTOR_CONFIG.dataProtection.enableGitCommandInterception) {
                return;
            }

            log('🔧 初始化系统命令拦截...');

            this.interceptChildProcess();

            log('✅ 系统命令拦截设置完成');
        },

        /**
         * 拦截child_process模块
         */
        interceptChildProcess() {
            if (typeof require !== 'undefined') {
                const originalRequire = require;

                require = function(moduleName) {
                    const module = originalRequire.apply(this, arguments);

                    if (moduleName === 'child_process') {
                        logOnce('🔧 拦截child_process模块...', 'child-process-module-intercept');
                        return SystemCommandInterceptor.createChildProcessProxy(module);
                    }

                    return module;
                };

                // 保留原始require的属性
                Object.setPrototypeOf(require, originalRequire);
                Object.getOwnPropertyNames(originalRequire).forEach(prop => {
                    if (prop !== 'length' && prop !== 'name') {
                        require[prop] = originalRequire[prop];
                    }
                });
            }
        },

        /**
         * 创建child_process模块代理
         * @param {Object} originalCP - 原始child_process模块
         * @returns {Proxy} child_process模块代理
         */
        createChildProcessProxy(originalCP) {
            const self = this;

            return new Proxy(originalCP, {
                get(target, prop) {
                    if (prop === 'exec') {
                        return function(command, options, callback) {
                            // 使用扩展的系统命令分析方法
                            const analysis = self.analyzeSystemCommand(command);

                            if (analysis.isSensitive) {
                                log(`🔍 检测到敏感系统exec命令: ${command} (类型: ${analysis.commandType})`);

                                // 先执行原始命令获取真实结果
                                const originalExec = target[prop].bind(target);

                                if (typeof options === 'function') {
                                    callback = options;
                                    options = {};
                                }

                                return originalExec(command, options, (error, stdout, stderr) => {
                                    // 重新分析，这次包含执行结果
                                    const finalAnalysis = self.analyzeSystemCommand(command, error, stdout, stderr);

                                    if (finalAnalysis.shouldReplace) {
                                        let fakeOutput = stdout;

                                        // 根据命令类型选择相应的伪造方法
                                        switch (finalAnalysis.commandType) {
                                            case 'ioreg':
                                                fakeOutput = self.spoofIoregOutput(stdout, finalAnalysis.ioregType);
                                                log(`🚫 拦截并替换ioreg命令输出 (${finalAnalysis.ioregType}): ${command}`);
                                                break;
                                            case 'registry':
                                                fakeOutput = self.spoofWindowsRegistryOutput(stdout, command);
                                                log(`🚫 拦截并替换Windows注册表命令输出: ${command}`);
                                                break;
                                            case 'git':
                                                fakeOutput = self.getFakeGitResponse(command);
                                                log(`🚫 拦截并替换Git命令输出: ${command}`);
                                                break;
                                        }

                                        log(`🎭 生成假系统信息完成`);
                                        if (callback) {
                                            callback(null, fakeOutput, stderr);
                                        }
                                    } else {
                                        log(`✅ 系统命令无需拦截，返回原始结果: ${command}`);
                                        if (callback) {
                                            callback(error, stdout, stderr);
                                        }
                                    }
                                });
                            }

                            return target[prop].apply(target, arguments);
                        };
                    } else if (prop === 'execSync') {
                        return function(command, options) {
                            // 使用扩展的系统命令分析方法
                            const analysis = self.analyzeSystemCommand(command);

                            if (analysis.isSensitive) {
                                log(`🔍 检测到敏感系统execSync命令: ${command} (类型: ${analysis.commandType})`);

                                try {
                                    // 先执行原始命令获取真实结果
                                    const originalResult = target[prop].call(target, command, options);
                                    const stdout = originalResult.toString();

                                    // 重新分析，这次包含执行结果
                                    const finalAnalysis = self.analyzeSystemCommand(command, null, stdout, "");

                                    if (finalAnalysis.shouldReplace) {
                                        let fakeOutput = stdout;

                                        // 根据命令类型选择相应的伪造方法
                                        switch (finalAnalysis.commandType) {
                                            case 'ioreg':
                                                fakeOutput = self.spoofIoregOutput(stdout, finalAnalysis.ioregType);
                                                log(`🚫 拦截并替换ioreg execSync输出 (${finalAnalysis.ioregType}): ${command}`);
                                                break;
                                            case 'registry':
                                                fakeOutput = self.spoofWindowsRegistryOutput(stdout, command);
                                                log(`🚫 拦截并替换Windows注册表execSync输出: ${command}`);
                                                break;
                                            case 'git':
                                                fakeOutput = self.getFakeGitResponse(command);
                                                log(`🚫 拦截并替换Git execSync输出: ${command}`);
                                                break;
                                        }

                                        log(`🎭 生成假系统信息完成`);
                                        return Buffer.from(fakeOutput);
                                    } else {
                                        log(`✅ 系统execSync命令无需拦截，返回原始结果: ${command}`);
                                        return originalResult;
                                    }
                                } catch (error) {
                                    // 如果原始命令执行失败，重新分析包含错误信息
                                    const finalAnalysis = self.analyzeSystemCommand(command, error, "", error.message);

                                    if (finalAnalysis.shouldReplace) {
                                        let fakeOutput = "";

                                        // 根据命令类型选择相应的伪造方法
                                        switch (finalAnalysis.commandType) {
                                            case 'ioreg':
                                                fakeOutput = self.spoofIoregOutput("", finalAnalysis.ioregType);
                                                log(`🚫 拦截ioreg execSync错误并替换 (${finalAnalysis.ioregType}): ${command}`);
                                                break;
                                            case 'registry':
                                                fakeOutput = self.spoofWindowsRegistryOutput("", command);
                                                log(`🚫 拦截Windows注册表execSync错误并替换: ${command}`);
                                                break;
                                            case 'git':
                                                fakeOutput = self.getFakeGitResponse(command);
                                                log(`🚫 拦截Git execSync错误并替换: ${command}`);
                                                break;
                                        }

                                        log(`🎭 生成假系统信息完成`);
                                        return Buffer.from(fakeOutput);
                                    } else {
                                        log(`✅ 系统execSync错误无需拦截，抛出原始错误: ${command}`);
                                        throw error;
                                    }
                                }
                            }

                            return target[prop].apply(target, arguments);
                        };
                    } else if (prop === 'spawn') {
                        return function(command, args, options) {
                            // 构建完整命令字符串用于分析
                            const fullCommand = Array.isArray(args) ? `${command} ${args.join(' ')}` : command;
                            const analysis = self.analyzeSystemCommand(fullCommand);

                            if (analysis.isSensitive) {
                                log(`🔍 检测到敏感系统spawn命令: ${fullCommand} (类型: ${analysis.commandType})`);

                                // 对于敏感命令，返回一个模拟的子进程
                                const mockProcess = {
                                    stdout: {
                                        on: (event, callback) => {
                                            if (event === 'data') {
                                                // 根据命令类型生成假数据
                                                let fakeOutput = "";
                                                switch (analysis.commandType) {
                                                    case 'ioreg':
                                                        fakeOutput = self.spoofIoregOutput("", analysis.ioregType);
                                                        break;
                                                    case 'registry':
                                                        fakeOutput = self.spoofWindowsRegistryOutput("", fullCommand);
                                                        break;
                                                    case 'git':
                                                        fakeOutput = self.getFakeGitResponse(fullCommand);
                                                        break;
                                                }
                                                setImmediate(() => callback(Buffer.from(fakeOutput)));
                                            }
                                        },
                                        pipe: () => {}
                                    },
                                    stderr: {
                                        on: () => {},
                                        pipe: () => {}
                                    },
                                    on: (event, callback) => {
                                        if (event === 'close') {
                                            setImmediate(() => callback(0));
                                        } else if (event === 'exit') {
                                            setImmediate(() => callback(0));
                                        }
                                    },
                                    kill: () => {
                                        log(`🚫 模拟终止spawn进程: ${fullCommand}`);
                                    },
                                    pid: Math.floor(Math.random() * 10000) + 1000
                                };

                                log(`🚫 拦截spawn命令并返回模拟进程: ${fullCommand}`);
                                return mockProcess;
                            }

                            return target[prop].apply(target, arguments);
                        };
                    }

                    return target[prop];
                }
            });
        },

        /**
         * 检查是否为有效的Git仓库URL（v2.5增强版）
         * @param {string} url - 待检查的URL
         * @returns {boolean} 是否为有效的Git URL
         */
        isValidGitUrl(url) {
            if (!url || typeof url !== 'string') return false;

            const trimmedUrl = url.trim();

            // 处理多行输出（如 git remote -v 的输出）
            const lines = trimmedUrl.split('\n');
            if (lines.length > 1) {
                // 检查每一行是否包含有效的Git URL
                return lines.some(line => this.isValidGitUrl(line.trim()));
            }

            // 提取URL部分（处理 "origin https://github.com/user/repo.git (fetch)" 格式）
            const urlMatch = trimmedUrl.match(/(?:https?:\/\/|git@|git:\/\/)[^\s]+/);
            const actualUrl = urlMatch ? urlMatch[0] : trimmedUrl;

            // 增强的Git URL格式检查
            const gitUrlPatterns = [
                // HTTPS格式 - 更宽松的匹配
                /^https:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]+\.git$/,
                /^https:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]+$/,

                // SSH格式 - 支持更多字符
                /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=/-]+\.git$/,
                /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=/-]+$/,

                // SSH格式 - 支持端口号
                /^ssh:\/\/git@[a-zA-Z0-9.-]+(:[0-9]+)?\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=/-]+\.git$/,
                /^ssh:\/\/git@[a-zA-Z0-9.-]+(:[0-9]+)?\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=/-]+$/,

                // Git协议格式
                /^git:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=/-]+\.git$/,
                /^git:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=/-]+$/
            ];

            // 检查是否匹配任何Git URL模式
            const matchesPattern = gitUrlPatterns.some(pattern => pattern.test(actualUrl));

            if (matchesPattern) {
                log(`✅ URL匹配Git格式模式: ${actualUrl}`);
                return true;
            }

            // 扩展的Git托管平台域名检查
            const gitPlatforms = [
                // 主流平台
                'github.com', 'gitlab.com', 'bitbucket.org', 'gitee.com',
                'coding.net', 'dev.azure.com', 'visualstudio.com',

                // 企业和其他平台
                'sourceforge.net', 'codeberg.org', 'framagit.org',
                'git.sr.ht', 'notabug.org', 'repo.or.cz',

                // 自托管常见域名模式
                'git.', 'gitlab.', 'github.', 'gitea.', 'forgejo.',
                'code.', 'repo.', 'scm.', 'vcs.'
            ];

            const containsGitPlatform = gitPlatforms.some(platform => {
                if (platform.endsWith('.')) {
                    // 对于以点结尾的模式，检查是否作为子域名存在
                    return actualUrl.includes(`://${platform}`) || actualUrl.includes(`@${platform}`);
                } else {
                    // 对于完整域名，直接检查包含关系
                    return actualUrl.includes(platform);
                }
            });

            if (containsGitPlatform) {
                log(`✅ URL包含Git托管平台域名: ${actualUrl}`);
                return true;
            }

            // 最后检查：是否包含典型的Git仓库路径结构
            const hasGitRepoStructure = /\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\.git)?(?:\/|$)/.test(actualUrl);

            if (hasGitRepoStructure) {
                log(`✅ URL具有Git仓库路径结构: ${actualUrl}`);
                return true;
            }

            log(`❌ URL不是有效的Git仓库地址: ${actualUrl}`);
            return false;
        },

        /**
         * 生成假的Git响应
         * @param {string} command - Git命令
         * @returns {string} 假响应
         */
        getFakeGitResponse(command) {
            const normalizedCommand = command.toLowerCase();

            if (normalizedCommand.includes("user.email")) {
                const fakeEmail = this.generateFakeEmail();
                log(`🎭 生成假Git邮箱: ${fakeEmail}`);
                return fakeEmail;
            } else if (normalizedCommand.includes("user.name")) {
                const fakeName = this.generateFakeName();
                log(`🎭 生成假Git用户名: ${fakeName}`);
                return fakeName;
            } else if (normalizedCommand.includes("remote")) {
                const fakeRepo = this.generateFakeRepo();
                log(`🎭 生成假Git仓库: ${fakeRepo}`);
                return fakeRepo;
            }

            return "";
        },

        /**
         * 生成完整的假用户信息（v2.5增强版 - 基于v2.2的完整实现）
         */
        generateFakeUserInfo() {
            const firstNames = ["Alex", "Jordan", "Casey", "Taylor", "Morgan", "Riley", "Avery", "Quinn", "Sam", "Blake", "Drew", "Sage", "River", "Phoenix", "Skyler", "Cameron"];
            const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas"];
            const emailDomains = ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "icloud.com", "protonmail.com", "aol.com", "live.com"];

            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
            const randomNum = Math.floor(Math.random() * 9999) + 1;

            // 生成多种邮箱格式
            const emailFormats = [
                `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
                `${firstName.toLowerCase()}${lastName.toLowerCase()}@${domain}`,
                `${firstName.toLowerCase()}${randomNum}@${domain}`,
                `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${domain}`
            ];

            const email = emailFormats[Math.floor(Math.random() * emailFormats.length)];
            const name = `${firstName} ${lastName}`;

            return { name, email };
        },

        /**
         * 生成假邮箱
         */
        generateFakeEmail() {
            return this.generateFakeUserInfo().email;
        },

        /**
         * 生成假用户名
         */
        generateFakeName() {
            return this.generateFakeUserInfo().name;
        },

        /**
         * 生成假仓库URL（v2.5增强版 - 基于v2.2的完整实现）
         */
        generateFakeRepo() {
            const platforms = ["github.com", "gitlab.com", "bitbucket.org"];
            const orgPrefixes = ["tech", "dev", "open", "code", "build", "app", "web", "data", "cloud", "digital"];
            const orgSuffixes = ["labs", "works", "corp", "inc", "team", "group", "studio", "solutions", "systems", "tech"];
            const repoTypes = ["api", "app", "web", "mobile", "desktop", "cli", "lib", "framework", "tool", "service"];
            const repoNames = ["manager", "builder", "helper", "client", "server", "core", "utils", "common", "shared", "base"];

            const platform = platforms[Math.floor(Math.random() * platforms.length)];
            const orgPrefix = orgPrefixes[Math.floor(Math.random() * orgPrefixes.length)];
            const orgSuffix = orgSuffixes[Math.floor(Math.random() * orgSuffixes.length)];
            const repoType = repoTypes[Math.floor(Math.random() * repoTypes.length)];
            const repoName = repoNames[Math.floor(Math.random() * repoNames.length)];

            // 生成多种组织名格式
            const orgFormats = [
                `${orgPrefix}${orgSuffix}`,
                `${orgPrefix}-${orgSuffix}`,
                `${orgPrefix}_${orgSuffix}`,
                `${orgPrefix}${Math.floor(Math.random() * 99) + 1}`,
                `${orgSuffix}${Math.floor(Math.random() * 99) + 1}`
            ];

            // 生成多种仓库名格式
            const repoFormats = [
                `${repoType}-${repoName}`,
                `${repoType}_${repoName}`,
                `${repoType}${repoName}`,
                `${repoName}-${repoType}`,
                `${repoName}_${repoType}`,
                `${repoType}${Math.floor(Math.random() * 999) + 1}`,
                `${repoName}${Math.floor(Math.random() * 999) + 1}`
            ];

            const org = orgFormats[Math.floor(Math.random() * orgFormats.length)];
            const repo = repoFormats[Math.floor(Math.random() * repoFormats.length)];

            return `https://${platform}/${org}/${repo}.git`;
        },

        /**
         * 伪造macOS ioreg输出
         * @param {string} output - 原始ioreg输出
         * @param {string} ioregType - ioreg命令类型 ('platform', 'usb', 'general')
         * @returns {string} 伪造后的输出
         */
        spoofIoregOutput(output, ioregType = 'general') {
            // 如果没有原始输出，根据命令类型生成假输出
            if (!output || typeof output !== "string" || output.trim().length === 0) {
                return this.generateFakeIoregOutput(ioregType);
            }

            let spoofed = output;
            const fakeUUID = INTERCEPTOR_CONFIG.system.macUUID;
            const fakeSerial = INTERCEPTOR_CONFIG.system.macSerial;
            const fakeBoardId = INTERCEPTOR_CONFIG.system.macBoardId;

            log(`🎭 开始伪造ioreg输出 (类型: ${ioregType})...`);

            // 替换IOPlatformUUID
            const uuidPattern = /"IOPlatformUUID"\s*=\s*"[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}"/g;
            const uuidMatches = output.match(uuidPattern);
            if (uuidMatches) {
                log(`🔍 发现${uuidMatches.length}个IOPlatformUUID，将替换为: ${fakeUUID}`);
                spoofed = spoofed.replace(uuidPattern, `"IOPlatformUUID" = "${fakeUUID}"`);
            }

            // 替换IOPlatformSerialNumber
            const serialPattern = /"IOPlatformSerialNumber"\s*=\s*"[A-Z0-9]+"/g;
            const serialMatches = output.match(serialPattern);
            if (serialMatches) {
                log(`🔍 发现${serialMatches.length}个IOPlatformSerialNumber，将替换为: ${fakeSerial}`);
                spoofed = spoofed.replace(serialPattern, `"IOPlatformSerialNumber" = "${fakeSerial}"`);
            }

            // 替换board-id
            const boardPattern = /"board-id"\s*=\s*<"Mac-[0-9A-Fa-f]+">/g;
            const boardMatches = output.match(boardPattern);
            if (boardMatches) {
                log(`🔍 发现${boardMatches.length}个board-id，将替换为: ${fakeBoardId}`);
                spoofed = spoofed.replace(boardPattern, `"board-id" = <"${fakeBoardId}">`);
            }

            log(`✅ ioreg输出伪造完成`);
            return spoofed;
        },

        /**
         * 生成假的ioreg输出（当没有原始输出时）
         * @param {string} ioregType - ioreg命令类型
         * @returns {string} 生成的假输出
         */
        generateFakeIoregOutput(ioregType) {
            const fakeUUID = INTERCEPTOR_CONFIG.system.macUUID;
            const fakeSerial = INTERCEPTOR_CONFIG.system.macSerial;
            const fakeBoardId = INTERCEPTOR_CONFIG.system.macBoardId;
            const fakeModel = INTERCEPTOR_CONFIG.system.macModel;

            // 架构检测（在switch外面声明避免重复）
            const realArch = process.arch;
            const isAppleSilicon = realArch === 'arm64';

            log(`🎭 生成假的ioreg输出 (类型: ${ioregType}), 使用型号: ${fakeModel}, 架构: ${realArch}`);

            switch (ioregType) {
                case 'platform':
                    // 根据架构选择不同的platform输出

                    // 生成动态变化的值
                    const dynamicDeviceId = `0x${(0x100000115 + Math.floor(Math.random() * 50)).toString(16)}`;
                    const dynamicBusyTime = Math.floor(Math.random() * 10); // 0-10ms
                    const dynamicRetain = 45 + Math.floor(Math.random() * 15); // 45-60

                    if (isAppleSilicon) {
                        // M系列Mac platform输出
                        const dynamicSystemMemory = Math.floor(Math.random() * 3) + 1; // 1-4 (表示8GB-32GB)
                        const systemMemoryHex = `000000000${dynamicSystemMemory.toString(16).padStart(7, '0')}00000000`;
                        const dynamicSessionId = 100000 + Math.floor(Math.random() * 10000); // 100000-110000
                        const dynamicUserId = 500 + Math.floor(Math.random() * 10); // 500-510
                        const dynamicGroupId = 20 + Math.floor(Math.random() * 5); // 20-25
                        const dynamicCGSSessionId = 250 + Math.floor(Math.random() * 50); // 250-300

                        // 根据fakeModel生成对应的compatible和board-id
                        let compatibleValue, boardIdValue, targetTypeValue;
                        if (fakeModel.includes('Macmini')) {
                            compatibleValue = `"${fakeModel}","J274AP"`;
                            boardIdValue = "Mac-747B3727A59523C5";
                            targetTypeValue = "Mac";
                        } else if (fakeModel.includes('MacBookAir')) {
                            compatibleValue = `"${fakeModel}","J313AP"`;
                            boardIdValue = "Mac-827FB448E656EC26";
                            targetTypeValue = "Mac";
                        } else if (fakeModel.includes('MacBookPro')) {
                            compatibleValue = `"${fakeModel}","J316sAP"`;
                            boardIdValue = "Mac-06F11FD93F0323C5";
                            targetTypeValue = "Mac";
                        } else {
                            compatibleValue = `"${fakeModel}","J274AP"`;
                            boardIdValue = "Mac-747B3727A59523C5";
                            targetTypeValue = "Mac";
                        }

                        log(`🎭 生成M系列Mac platform输出 - 型号: ${fakeModel}, 内存: ${dynamicSystemMemory * 8}GB`);

                        return `+-o Root  <class IORegistryEntry, id 0x100000100, retain 24>
  +-o ${fakeModel}  <class IOPlatformExpertDevice, id ${dynamicDeviceId}, registered, matched, active, busy 0 (${dynamicBusyTime} ms), retain ${dynamicRetain}>
      {
        "IONVRAM-OF-lwvm-compatible" = "J274"
        "board-id" = <"${boardIdValue}">
        "secure-root-prefix" = "com.apple.xbs"
        "IOPlatformUUID" = "${fakeUUID}"
        "system-memory-size" = <${systemMemoryHex}>
        "serial-number" = <"${fakeSerial}">
        "IOConsoleUsers" = ({"kCGSSessionUserNameKey"="user","kCGSSessionOnConsoleKey"=Yes,"kSCSecuritySessionID"=${dynamicSessionId},"kCGSSessionLoginwindowSafeLogin"=No,"kCGSSessionID"=${dynamicCGSSessionId},"kCGSSessionSystemSafeBoot"=No,"kCGSSessionAuditID"=${dynamicSessionId},"kCGSSessionUserIDKey"=${dynamicUserId},"kCGSSessionGroupIDKey"=${dynamicGroupId}})
        "target-type" = <"${targetTypeValue}">
        "name" = <"product">
        "firmware-version" = <"iBoot-8419.80.7">
        "compatible" = <${compatibleValue}>
        "IOPlatformSerialNumber" = "${fakeSerial}"
        "system-type" = <01>
        "model" = <"${fakeModel}">
        "manufacturer" = <"Apple Inc.">
        "product-name" = <"${fakeModel}">
      }`;
                    } else {
                        // Intel Mac platform输出（保持原有的Intel版本）
                        log(`🎭 生成Intel Mac platform输出 - 型号: ${fakeModel}`);

                        return `+-o Root  <class IORegistryEntry, id 0x100000100, retain 24>
  +-o ${fakeModel}  <class IOPlatformExpertDevice, id ${dynamicDeviceId}, registered, matched, active, busy 0 (${dynamicBusyTime} ms), retain ${dynamicRetain}>
      {
        "IOInterruptSpecifiers" = (<0900000005000000>)
        "IOPolledInterface" = "SMCPolledInterface is not serializable"
        "IOPlatformUUID" = "${fakeUUID}"
        "serial-number" = <"${fakeSerial}">
        "platform-feature" = <3200000000000000>
        "IOPlatformSystemSleepPolicy" = <534c505402000a000800000008000000000000000000000005000000000000000501000001000000000040000000400000001000000010000700000000000000>
        "IOBusyInterest" = "IOCommand is not serializable"
        "target-type" = <"Mac">
        "IOInterruptControllers" = ("io-apic-0")
        "name" = <"/">
        "version" = <"1.0">
        "manufacturer" = <"Apple Inc.">
        "compatible" = <"${fakeModel}">
        "product-name" = <"${fakeModel}">
        "IOPlatformSerialNumber" = "${fakeSerial}"
        "IOConsoleSecurityInterest" = "IOCommand is not serializable"
        "clock-frequency" = <0084d717>
        "model" = <"${fakeModel}">
        "board-id" = <"${fakeBoardId}">
        "bridge-model" = <"J152fAP">
        "system-type" = <02>
      }`;
                    }

                case 'usb':
                    // 根据架构选择不同的USB设备树
                    // 生成动态变化的值
                    const dynamicSessionId = Math.floor(Math.random() * 1000000000) + 900000000; // 900M-1.9B范围
                    const generateDeviceId = (base) => `0x${(base + Math.floor(Math.random() * 100)).toString(16)}`;
                    const generateUsbAddress = () => Math.floor(Math.random() * 6) + 2; // 2-8
                    const generateLocationId = (base) => base + Math.floor(Math.random() * 1000);

                    if (isAppleSilicon) {
                        // M系列Mac USB设备树
                        const dynamicT6000Id1 = `0x${(0x100000181 + Math.floor(Math.random() * 20)).toString(16)}`;
                        const dynamicT6000Id2 = `0x${(0x100000181 + Math.floor(Math.random() * 20)).toString(16)}`;
                        const dynamicXHCId1 = `0x${(0x1000002f1 + Math.floor(Math.random() * 30)).toString(16)}`;
                        const dynamicXHCId2 = `0x${(0x100000311 + Math.floor(Math.random() * 30)).toString(16)}`;
                        const dynamicRootHubId1 = `0x${(0x1000002f4 + Math.floor(Math.random() * 50)).toString(16)}`;
                        const dynamicRootHubId2 = `0x${(0x100000314 + Math.floor(Math.random() * 50)).toString(16)}`;
                        const dynamicRetain1 = 20 + Math.floor(Math.random() * 10); // 20-30
                        const dynamicRetain2 = 12 + Math.floor(Math.random() * 8); // 12-20

                        // M系列Mac外设随机删减
                        const includeKeyboard = Math.random() > 0.05; // 95%概率包含内置键盘（几乎总是存在）
                        const includeAmbientLight = Math.random() > 0.1; // 90%概率包含环境光传感器
                        const includeUSBCAdapter = Math.random() > 0.4; // 60%概率包含USB-C适配器
                        const includeDellMonitor = Math.random() > 0.3; // 70%概率包含Dell显示器
                        const includeUnifyingReceiver = Math.random() > 0.5; // 50%概率包含罗技接收器
                        const includeUSBDrive = Math.random() > 0.6; // 40%概率包含U盘
                        const includeiPhone = Math.random() > 0.4; // 60%概率包含iPhone

                        log(`🎭 生成M系列Mac动态USB设备树 - 会话ID: ${dynamicSessionId}, 外设: 键盘=${includeKeyboard}, 环境光=${includeAmbientLight}, USB-C适配器=${includeUSBCAdapter}, Dell显示器=${includeDellMonitor}, 罗技接收器=${includeUnifyingReceiver}, U盘=${includeUSBDrive}, iPhone=${includeiPhone}`);

                        return `+-o Root  <class IORegistryEntry, id 0x100000100, retain 26, depth 0>
  +-o AppleT6000IO  <class AppleT6000IO, id ${dynamicT6000Id1}, retain 11, depth 1>
    +-o IOUSBHostController@01000000  <class AppleT6000USBXHCI, id ${dynamicXHCId1}, retain 28, depth 2>
    | +-o AppleUSBRootHubDevice  <class AppleUSBRootHubDevice, id ${dynamicRootHubId1}, retain ${dynamicRetain1}, depth 3>
    |   {
    |     "iManufacturer" = 1
    |     "bNumConfigurations" = 1
    |     "idProduct" = 32771
    |     "bcdDevice" = 256
    |     "Bus Power Available" = 2500
    |     "bMaxPacketSize0" = 64
    |     "iProduct" = 2
    |     "iSerialNumber" = 0
    |     "bDeviceClass" = 9
    |     "Built-In" = Yes
    |     "locationID" = ${generateLocationId(16777216)}
    |     "bDeviceSubClass" = 0
    |     "bcdUSB" = 768
    |     "sessionID" = ${dynamicSessionId}
    |     "USBSpeed" = 5
    |     "idVendor" = 1452
    |     "IOUserClient" = "IOUSBHostUserClient"
    |     "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |     "Device Speed" = 3
    |     "bDeviceProtocol" = 1
    |     "IOCFPlugInTypes" = {"9dc7b780-9ec0-11d4-a54f-000a27052861"="IOUSBHostFamily.kext/Contents/PlugIns/IOUSBHostHIDDevice.kext"}
    |     "IOGeneralInterest" = "IOCommand is not serializable"
    |     "IOClassNameOverride" = "IOUSBDevice"
    |   }
    |   +-o AppleUSB20Hub@01100000  <class AppleUSB20Hub, id ${generateDeviceId(0x1000002f6)}, retain 16, depth 4>
    |   | {
    |   |   "iManufacturer" = 1
    |   |   "bNumConfigurations" = 1
    |   |   "idProduct" = 10781
    |   |   "bcdDevice" = 256
    |   |   "Bus Power Available" = 2500
    |   |   "USB Address" = 1
    |   |   "bMaxPacketSize0" = 64
    |   |   "iProduct" = 2
    |   |   "iSerialNumber" = 0
    |   |   "bDeviceClass" = 9
    |   |   "Built-In" = Yes
    |   |   "locationID" = ${generateLocationId(17825792)}
    |   |   "bDeviceSubClass" = 0
    |   |   "bcdUSB" = 512
    |   |   "sessionID" = ${dynamicSessionId}
    |   |   "USBSpeed" = 2
    |   |   "idVendor" = 1452
    |   |   "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |   |   "Device Speed" = 2
    |   |   "bDeviceProtocol" = 1
    |   |   "PortNum" = 1
    |   | }${includeKeyboard ? `
    |   | +-o Apple Internal Keyboard / Trackpad@01110000  <class IOUSBHostDevice, id ${generateDeviceId(0x100000300)}, retain 20, depth 5>
    |   | | {
    |   | |   "iManufacturer" = 1
    |   | |   "bNumConfigurations" = 1
    |   | |   "idProduct" = 796
    |   | |   "bcdDevice" = 545
    |   | |   "Bus Power Available" = 500
    |   | |   "USB Address" = ${generateUsbAddress()}
    |   | |   "bMaxPacketSize0" = 64
    |   | |   "iProduct" = 2
    |   | |   "iSerialNumber" = 3
    |   | |   "bDeviceClass" = 0
    |   | |   "Built-In" = Yes
    |   | |   "locationID" = ${generateLocationId(17891328)}
    |   | |   "bDeviceSubClass" = 0
    |   | |   "bcdUSB" = 512
    |   | |   "sessionID" = ${dynamicSessionId}
    |   | |   "USBSpeed" = 2
    |   | |   "idVendor" = 1452
    |   | |   "USB Serial Number" = "${fakeSerial}"
    |   | |   "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |   | |   "Device Speed" = 2
    |   | |   "bDeviceProtocol" = 0
    |   | |   "PortNum" = 1
    |   | | }
    |   | | ` : ''}${includeAmbientLight ? `
    |   | +-o Ambient Light Sensor@01120000  <class IOUSBHostDevice, id ${generateDeviceId(0x100000301)}, retain 12, depth 5>
    |   |   {
    |   |     "iManufacturer" = 1
    |   |     "bNumConfigurations" = 1
    |   |     "idProduct" = 33026
    |   |     "bcdDevice" = 0
    |   |     "Bus Power Available" = 500
    |   |     "USB Address" = ${generateUsbAddress()}
    |   |     "bMaxPacketSize0" = 64
    |   |     "iProduct" = 2
    |   |     "iSerialNumber" = 0
    |   |     "bDeviceClass" = 0
    |   |     "Built-In" = Yes
    |   |     "locationID" = ${generateLocationId(17956864)}
    |   |     "bDeviceSubClass" = 0
    |   |     "bcdUSB" = 512
    |   |     "sessionID" = ${dynamicSessionId}
    |   |     "USBSpeed" = 2
    |   |     "idVendor" = 1452
    |   |     "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |   |     "Device Speed" = 2
    |   |     "bDeviceProtocol" = 0
    |   |     "PortNum" = 2
    |   |   }` : ''}
    |   |
    |   +-o AppleUSB30Hub@01200000  <class AppleUSB30Hub, id ${generateDeviceId(0x100000305)}, retain 18, depth 4>
    |     {
    |       "iManufacturer" = 1
    |       "bNumConfigurations" = 1
    |       "idProduct" = 10787
    |       "bcdDevice" = 256
    |       "Bus Power Available" = 2500
    |       "USB Address" = ${generateUsbAddress()}
    |       "bMaxPacketSize0" = 9
    |       "iProduct" = 2
    |       "iSerialNumber" = 0
    |       "bDeviceClass" = 9
    |       "Built-In" = Yes
    |       "locationID" = ${generateLocationId(18874368)}
    |       "bDeviceSubClass" = 0
    |       "bcdUSB" = 768
    |       "sessionID" = ${dynamicSessionId}
    |       "USBSpeed" = 4
    |       "idVendor" = 1452
    |       "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |       "Device Speed" = 3
    |       "bDeviceProtocol" = 3
    |       "PortNum" = 2
    |     }${includeUSBCAdapter ? `
    |     +-o USB C Video Adaptor@01210000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000008bd)}, retain 14, depth 5>
    |     | {
    |     |   "iManufacturer" = 1
    |     |   "bNumConfigurations" = 1
    |     |   "idProduct" = 16658
    |     |   "bcdDevice" = 272
    |     |   "Bus Power Available" = 900
    |     |   "USB Address" = ${generateUsbAddress()}
    |     |   "bMaxPacketSize0" = 9
    |     |   "iProduct" = 2
    |     |   "iSerialNumber" = 0
    |     |   "bDeviceClass" = 9
    |     |   "Built-In" = No
    |     |   "locationID" = ${generateLocationId(18939904)}
    |     |   "bDeviceSubClass" = 0
    |     |   "bcdUSB" = 768
    |     |   "sessionID" = ${dynamicSessionId}
    |     |   "USBSpeed" = 4
    |     |   "idVendor" = 8118
    |     |   "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |     |   "Device Speed" = 3
    |     |   "bDeviceProtocol" = 1
    |     |   "PortNum" = 1
    |     | }
    |     | +-o USB2.0 Hub@01210000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000008cd)}, retain 15, depth 6>
    |     |   {
    |     |     "iManufacturer" = 1
    |     |     "bNumConfigurations" = 1
    |     |     "idProduct" = 2337
    |     |     "bcdDevice" = 4640
    |     |     "Bus Power Available" = 500
    |     |     "USB Address" = ${generateUsbAddress()}
    |     |     "bMaxPacketSize0" = 64
    |     |     "iProduct" = 2
    |     |     "iSerialNumber" = 0
    |     |     "bDeviceClass" = 9
    |     |     "Built-In" = No
    |     |     "locationID" = ${generateLocationId(18939904)}
    |     |     "bDeviceSubClass" = 0
    |     |     "bcdUSB" = 512
    |     |     "sessionID" = ${dynamicSessionId}
    |     |     "USBSpeed" = 2
    |     |     "idVendor" = 8118
    |     |     "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |     |     "Device Speed" = 2
    |     |     "bDeviceProtocol" = 2
    |     |     "PortNum" = 1
    |     |   }${includeUSBDrive ? `
    |     |   +-o Cruzer Blade@01214000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000008d3)}, retain 15, depth 7>
    |     |     {
    |     |       "iManufacturer" = 1
    |     |       "bNumConfigurations" = 1
    |     |       "idProduct" = 21845
    |     |       "bcdDevice" = 256
    |     |       "Bus Power Available" = 224
    |     |       "USB Address" = ${generateUsbAddress()}
    |     |       "bMaxPacketSize0" = 64
    |     |       "iProduct" = 2
    |     |       "iSerialNumber" = 3
    |     |       "bDeviceClass" = 0
    |     |       "Built-In" = No
    |     |       "locationID" = ${generateLocationId(18966016)}
    |     |       "bDeviceSubClass" = 0
    |     |       "bcdUSB" = 512
    |     |       "sessionID" = ${dynamicSessionId}
    |     |       "USBSpeed" = 2
    |     |       "idVendor" = 1921
    |     |       "USB Serial Number" = "20053538421F86B191E5"
    |     |       "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |     |       "Device Speed" = 2
    |     |       "bDeviceProtocol" = 0
    |     |       "PortNum" = 4
    |     |     }` : ''}
    |     |     ` : ''}${includeDellMonitor ? `
    |     +-o Dell U3223QE @01230000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000008e3)}, retain 15, depth 5>
    |       {
    |         "iManufacturer" = 1
    |         "bNumConfigurations" = 1
    |         "idProduct" = 8802
    |         "bcdDevice" = 256
    |         "Bus Power Available" = 900
    |         "USB Address" = ${generateUsbAddress()}
    |         "bMaxPacketSize0" = 9
    |         "iProduct" = 2
    |         "iSerialNumber" = 0
    |         "bDeviceClass" = 9
    |         "Built-In" = No
    |         "locationID" = ${generateLocationId(19070976)}
    |         "bDeviceSubClass" = 0
    |         "bcdUSB" = 768
    |         "sessionID" = ${dynamicSessionId}
    |         "USBSpeed" = 4
    |         "idVendor" = 1043
    |         "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |         "Device Speed" = 3
    |         "bDeviceProtocol" = 1
    |         "PortNum" = 3
    |       }${includeUnifyingReceiver ? `
    |       +-o USB2.0 Hub@01230000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000008f4)}, retain 14, depth 6>
    |         {
    |           "iManufacturer" = 1
    |           "bNumConfigurations" = 1
    |           "idProduct" = 8798
    |           "bcdDevice" = 256
    |           "Bus Power Available" = 500
    |           "USB Address" = ${generateUsbAddress()}
    |           "bMaxPacketSize0" = 64
    |           "iProduct" = 2
    |           "iSerialNumber" = 0
    |           "bDeviceClass" = 9
    |           "Built-In" = No
    |           "locationID" = ${generateLocationId(19070976)}
    |           "bDeviceSubClass" = 0
    |           "bcdUSB" = 512
    |           "sessionID" = ${dynamicSessionId}
    |           "USBSpeed" = 2
    |           "idVendor" = 1043
    |           "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |           "Device Speed" = 2
    |           "bDeviceProtocol" = 2
    |           "PortNum" = 1
    |         }
    |         +-o Unifying Receiver@01231000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000008fb)}, retain 16, depth 7>
    |           {
    |             "iManufacturer" = 1
    |             "bNumConfigurations" = 1
    |             "idProduct" = 49198
    |             "bcdDevice" = 4864
    |             "Bus Power Available" = 98
    |             "USB Address" = ${generateUsbAddress()}
    |             "bMaxPacketSize0" = 8
    |             "iProduct" = 2
    |             "iSerialNumber" = 0
    |             "bDeviceClass" = 255
    |             "Built-In" = No
    |             "locationID" = ${generateLocationId(19075072)}
    |             "bDeviceSubClass" = 0
    |             "bcdUSB" = 512
    |             "sessionID" = ${dynamicSessionId}
    |             "USBSpeed" = 1
    |             "idVendor" = 1133
    |             "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
    |             "Device Speed" = 1
    |             "bDeviceProtocol" = 0
    |             "PortNum" = 1
    |           }` : ''}` : ''}
    |
  +-o AppleT6000IO  <class AppleT6000IO, id ${dynamicT6000Id2}, retain 11, depth 1>
    +-o IOUSBHostController@00000000  <class AppleT6000USBXHCI, id ${dynamicXHCId2}, retain 20, depth 2>
      +-o AppleUSBRootHubDevice  <class AppleUSBRootHubDevice, id ${dynamicRootHubId2}, retain ${dynamicRetain2}, depth 3>
        {
          "iManufacturer" = 1
          "bNumConfigurations" = 1
          "idProduct" = 32771
          "bcdDevice" = 256
          "Bus Power Available" = 2500
          "bMaxPacketSize0" = 64
          "iProduct" = 2
          "iSerialNumber" = 0
          "bDeviceClass" = 9
          "Built-In" = Yes
          "locationID" = ${generateLocationId(0)}
          "bDeviceSubClass" = 0
          "bcdUSB" = 768
          "sessionID" = ${dynamicSessionId + 1}
          "USBSpeed" = 5
          "idVendor" = 1452
          "IOUserClient" = "IOUSBHostUserClient"
          "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
          "Device Speed" = 3
          "bDeviceProtocol" = 1
          "IOCFPlugInTypes" = {"9dc7b780-9ec0-11d4-a54f-000a27052861"="IOUSBHostFamily.kext/Contents/PlugIns/IOUSBHostHIDDevice.kext"}
          "IOGeneralInterest" = "IOCommand is not serializable"
          "IOClassNameOverride" = "IOUSBDevice"
        }
        +-o AppleUSB20Hub@00100000  <class AppleUSB20Hub, id ${generateDeviceId(0x100000316)}, retain 13, depth 4>
        | {
        |   "iManufacturer" = 1
        |   "bNumConfigurations" = 1
        |   "idProduct" = 10781
        |   "bcdDevice" = 256
        |   "Bus Power Available" = 2500
        |   "USB Address" = 1
        |   "bMaxPacketSize0" = 64
        |   "iProduct" = 2
        |   "iSerialNumber" = 0
        |   "bDeviceClass" = 9
        |   "Built-In" = Yes
        |   "locationID" = ${generateLocationId(65536)}
        |   "bDeviceSubClass" = 0
        |   "bcdUSB" = 512
        |   "sessionID" = ${dynamicSessionId + 1}
        |   "USBSpeed" = 2
        |   "idVendor" = 1452
        |   "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
        |   "Device Speed" = 2
        |   "bDeviceProtocol" = 1
        |   "PortNum" = 1
        | }${includeiPhone ? `
        | +-o iPhone@00110000  <class IOUSBHostDevice, id ${generateDeviceId(0x100000913)}, retain 20, depth 5>
        |   {
        |     "iManufacturer" = 1
        |     "bNumConfigurations" = 4
        |     "idProduct" = 4776
        |     "bcdDevice" = 768
        |     "Bus Power Available" = 500
        |     "USB Address" = ${generateUsbAddress()}
        |     "bMaxPacketSize0" = 64
        |     "iProduct" = 2
        |     "iSerialNumber" = 3
        |     "bDeviceClass" = 0
        |     "Built-In" = No
        |     "locationID" = ${generateLocationId(720896)}
        |     "bDeviceSubClass" = 0
        |     "bcdUSB" = 512
        |     "sessionID" = ${dynamicSessionId + 1}
        |     "USBSpeed" = 2
        |     "idVendor" = 1452
        |     "USB Serial Number" = "00008110-001A45142168801E"
        |     "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
        |     "Device Speed" = 2
        |     "bDeviceProtocol" = 0
        |     "PortNum" = 1
        |   }` : ''}
        |
        +-o AppleUSB30Hub@00200000  <class AppleUSB30Hub, id ${generateDeviceId(0x100000325)}, retain 12, depth 4>
          {
            "iManufacturer" = 1
            "bNumConfigurations" = 1
            "idProduct" = 10787
            "bcdDevice" = 256
            "Bus Power Available" = 2500
            "USB Address" = ${generateUsbAddress()}
            "bMaxPacketSize0" = 9
            "iProduct" = 2
            "iSerialNumber" = 0
            "bDeviceClass" = 9
            "Built-In" = Yes
            "locationID" = ${generateLocationId(131072)}
            "bDeviceSubClass" = 0
            "bcdUSB" = 768
            "sessionID" = ${dynamicSessionId + 1}
            "USBSpeed" = 4
            "idVendor" = 1452
            "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
            "Device Speed" = 3
            "bDeviceProtocol" = 3
            "PortNum" = 2
          }`;
                    } else {
                        // Intel Mac USB设备树
                        const dynamicRootHubId = `0x${(0x10000032b + Math.floor(Math.random() * 50)).toString(16)}`;
                        const dynamicRetain = 25 + Math.floor(Math.random() * 10); // 25-35
                        const dynamicXHCId = `0x${(0x1000002f2 + Math.floor(Math.random() * 30)).toString(16)}`;
                        const dynamicACPIId = `0x${(0x100000118 + Math.floor(Math.random() * 20)).toString(16)}`;
                        const dynamicExpertId = `0x${(0x100000116 + Math.floor(Math.random() * 10)).toString(16)}`;

                        // Intel Mac外设随机删减
                        const includeDellMonitor = Math.random() > 0.3; // 70%概率包含Dell显示器
                        const includeT2Controller = Math.random() > 0.1; // 90%概率包含T2控制器（内置）
                        const includeCalDigit = Math.random() > 0.5; // 50%概率包含CalDigit扩展坞
                        const includeWebcam = Math.random() > 0.4; // 60%概率包含摄像头
                        const includeUSBDrive = Math.random() > 0.6; // 40%概率包含U盘

                        log(`🎭 生成Intel Mac动态USB设备树 - 会话ID: ${dynamicSessionId}, 外设: Dell显示器=${includeDellMonitor}, T2控制器=${includeT2Controller}, CalDigit=${includeCalDigit}, 摄像头=${includeWebcam}, U盘=${includeUSBDrive}`);

                        return `+-o Root  <class IORegistryEntry, id 0x100000100, retain 26, depth 0>
  +-o AppleACPIPlatformExpert  <class AppleACPIPlatformExpert, id ${dynamicExpertId}, retain 42, depth 1>
    +-o AppleACPIPCI  <class AppleACPIPCI, id ${dynamicACPIId}, retain 41, depth 2>
      +-o XHC1@14  <class AppleIntelCNLUSBXHCI, id ${dynamicXHCId}, retain 52, depth 3>
        +-o AppleUSBRootHubDevice  <class AppleUSBRootHubDevice, id ${dynamicRootHubId}, retain ${dynamicRetain}, depth 4>
          {
            "iManufacturer" = 1
            "bNumConfigurations" = 1
            "idProduct" = 33282
            "bcdDevice" = 0
            "Bus Power Available" = 2500
            "bMaxPacketSize0" = 64
            "iProduct" = 2
            "iSerialNumber" = 0
            "bDeviceClass" = 9
            "Built-In" = Yes
            "locationID" = ${generateLocationId(337641472)}
            "bDeviceSubClass" = 0
            "bcdUSB" = 768
            "sessionID" = ${dynamicSessionId}
            "USBSpeed" = 5
            "idVendor" = 32902
            "IOUserClient" = "IOUSBHostUserClient"
            "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
            "Device Speed" = 3
            "bDeviceProtocol" = 1
            "IOCFPlugInTypes" = {"9dc7b780-9ec0-11d4-a54f-000a27052861"="IOUSBHostFamily.kext/Contents/PlugIns/IOUSBHostHIDDevice.kext"}
            "IOGeneralInterest" = "IOCommand is not serializable"
            "IOClassNameOverride" = "IOUSBDevice"
          }
          +-o HS01@14100000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000003b5)}, retain 12, depth 5>
          | {
          |   "sessionID" = ${dynamicSessionId}
          |   "USBSpeed" = 2
          |   "idProduct" = 33076
          |   "iManufacturer" = 0
          |   "bNumConfigurations" = 1
          |   "Device Speed" = 2
          |   "idVendor" = 32902
          |   "bcdDevice" = 0
          |   "Bus Power Available" = 0
          |   "bMaxPacketSize0" = 64
          |   "Built-In" = Yes
          |   "locationID" = ${generateLocationId(336592896)}
          |   "iProduct" = 0
          |   "bDeviceClass" = 9
          |   "iSerialNumber" = 0
          |   "bDeviceSubClass" = 0
          |   "bcdUSB" = 512
          |   "bDeviceProtocol" = 1
          |   "PortNum" = 1
          | }
          |
          +-o HS02@14200000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000003b6)}, retain 15, depth 5>
          | {
          |   "sessionID" = ${dynamicSessionId}
          |   "USBSpeed" = 2
          |   "idProduct" = 33076
          |   "iManufacturer" = 0
          |   "bNumConfigurations" = 1
          |   "Device Speed" = 2
          |   "idVendor" = 32902
          |   "bcdDevice" = 0
          |   "Bus Power Available" = 0
          |   "bMaxPacketSize0" = 64
          |   "Built-In" = Yes
          |   "locationID" = ${generateLocationId(337641472)}
          |   "iProduct" = 0
          |   "bDeviceClass" = 9
          |   "iSerialNumber" = 0
          |   "bDeviceSubClass" = 0
          |   "bcdUSB" = 512
          |   "bDeviceProtocol" = 1
          |   "PortNum" = 2
          | }${includeDellMonitor ? `
          | +-o Dell U3219Q @14200000  <class IOUSBHostDevice, id ${generateDeviceId(0x100000851)}, retain 14, depth 6>
          |   {
          |     "iManufacturer" = 1
          |     "bNumConfigurations" = 1
          |     "idProduct" = 8746
          |     "bcdDevice" = 256
          |     "Bus Power Available" = 500
          |     "USB Address" = ${generateUsbAddress()}
          |     "bMaxPacketSize0" = 64
          |     "iProduct" = 2
          |     "iSerialNumber" = 0
          |     "bDeviceClass" = 9
          |     "Built-In" = No
          |     "locationID" = ${generateLocationId(337641472)}
          |     "bDeviceSubClass" = 0
          |     "bcdUSB" = 512
          |     "sessionID" = ${dynamicSessionId}
          |     "USBSpeed" = 2
          |     "idVendor" = 1678
          |     "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
          |     "Device Speed" = 2
          |     "bDeviceProtocol" = 1
          |     "PortNum" = 2
          |   }` : ''}
          |
          +-o HS03@14300000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000003bd)}, retain 12, depth 5>
          | {
          |   "sessionID" = ${dynamicSessionId}
          |   "USBSpeed" = 2
          |   "idProduct" = 33076
          |   "iManufacturer" = 0
          |   "bNumConfigurations" = 1
          |   "Device Speed" = 2
          |   "idVendor" = 32902
          |   "bcdDevice" = 0
          |   "Bus Power Available" = 0
          |   "bMaxPacketSize0" = 64
          |   "Built-In" = Yes
          |   "locationID" = ${generateLocationId(338690048)}
          |   "iProduct" = 0
          |   "bDeviceClass" = 9
          |   "iSerialNumber" = 0
          |   "bDeviceSubClass" = 0
          |   "bcdUSB" = 512
          |   "bDeviceProtocol" = 1
          |   "PortNum" = 3
          | }
          |
          +-o HS04@14400000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000003be)}, retain 12, depth 5>
          | {
          |   "sessionID" = ${dynamicSessionId}
          |   "USBSpeed" = 2
          |   "idProduct" = 33076
          |   "iManufacturer" = 0
          |   "bNumConfigurations" = 1
          |   "Device Speed" = 2
          |   "idVendor" = 32902
          |   "bcdDevice" = 0
          |   "Bus Power Available" = 0
          |   "bMaxPacketSize0" = 64
          |   "Built-In" = Yes
          |   "locationID" = ${generateLocationId(339738624)}
          |   "iProduct" = 0
          |   "bDeviceClass" = 9
          |   "iSerialNumber" = 0
          |   "bDeviceSubClass" = 0
          |   "bcdUSB" = 512
          |   "bDeviceProtocol" = 1
          |   "PortNum" = 4
          | }
          |
          +-o HS05@14500000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000003bf)}, retain 17, depth 5>
          | {
          |   "sessionID" = ${dynamicSessionId}
          |   "USBSpeed" = 2
          |   "idProduct" = 33076
          |   "iManufacturer" = 0
          |   "bNumConfigurations" = 1
          |   "Device Speed" = 2
          |   "idVendor" = 32902
          |   "bcdDevice" = 0
          |   "Bus Power Available" = 0
          |   "bMaxPacketSize0" = 64
          |   "Built-In" = Yes
          |   "locationID" = ${generateLocationId(340787200)}
          |   "iProduct" = 0
          |   "bDeviceClass" = 9
          |   "iSerialNumber" = 0
          |   "bDeviceSubClass" = 0
          |   "bcdUSB" = 512
          |   "bDeviceProtocol" = 1
          |   "PortNum" = 5
          | }${includeT2Controller ? `
          | +-o Apple T2 Controller@14500000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000003c2)}, retain 30, depth 6>
          |   {
          |     "iManufacturer" = 1
          |     "bNumConfigurations" = 1
          |     "idProduct" = 33025
          |     "bcdDevice" = 256
          |     "Bus Power Available" = 500
          |     "USB Address" = ${generateUsbAddress()}
          |     "bMaxPacketSize0" = 64
          |     "iProduct" = 2
          |     "iSerialNumber" = 3
          |     "bDeviceClass" = 0
          |     "Built-In" = Yes
          |     "locationID" = ${generateLocationId(340787200)}
          |     "bDeviceSubClass" = 0
          |     "bcdUSB" = 512
          |     "sessionID" = ${dynamicSessionId}
          |     "USBSpeed" = 2
          |     "idVendor" = 1452
          |     "USB Serial Number" = "${fakeSerial}"
          |     "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
          |     "Device Speed" = 2
          |     "bDeviceProtocol" = 0
          |     "PortNum" = 5
          |   }` : ''}
          |
          +-o SS01@14600000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000003e8)}, retain 12, depth 5>
          | {
          |   "sessionID" = ${dynamicSessionId}
          |   "USBSpeed" = 4
          |   "idProduct" = 4126
          |   "iManufacturer" = 0
          |   "bNumConfigurations" = 1
          |   "Device Speed" = 3
          |   "idVendor" = 32902
          |   "bcdDevice" = 0
          |   "Bus Power Available" = 0
          |   "bMaxPacketSize0" = 9
          |   "Built-In" = Yes
          |   "locationID" = ${generateLocationId(341835776)}
          |   "iProduct" = 0
          |   "bDeviceClass" = 9
          |   "iSerialNumber" = 0
          |   "bDeviceSubClass" = 0
          |   "bcdUSB" = 768
          |   "bDeviceProtocol" = 3
          |   "PortNum" = 6
          | }
          |
          +-o SS02@14700000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000003e9)}, retain 15, depth 5>
          | {
          |   "sessionID" = ${dynamicSessionId}
          |   "USBSpeed" = 4
          |   "idProduct" = 4126
          |   "iManufacturer" = 0
          |   "bNumConfigurations" = 1
          |   "Device Speed" = 3
          |   "idVendor" = 32902
          |   "bcdDevice" = 0
          |   "Bus Power Available" = 0
          |   "bMaxPacketSize0" = 9
          |   "Built-In" = Yes
          |   "locationID" = ${generateLocationId(342884352)}
          |   "iProduct" = 0
          |   "bDeviceClass" = 9
          |   "iSerialNumber" = 0
          |   "bDeviceSubClass" = 0
          |   "bcdUSB" = 768
          |   "bDeviceProtocol" = 3
          |   "PortNum" = 7
          | }${includeDellMonitor ? `
          | +-o Dell U3219Q @14700000  <class IOUSBHostDevice, id ${generateDeviceId(0x100000854)}, retain 13, depth 6>
          |   {
          |     "iManufacturer" = 1
          |     "bNumConfigurations" = 1
          |     "idProduct" = 8747
          |     "bcdDevice" = 256
          |     "Bus Power Available" = 900
          |     "USB Address" = ${generateUsbAddress()}
          |     "bMaxPacketSize0" = 9
          |     "iProduct" = 2
          |     "iSerialNumber" = 0
          |     "bDeviceClass" = 9
          |     "Built-In" = No
          |     "locationID" = ${generateLocationId(342884352)}
          |     "bDeviceSubClass" = 0
          |     "bcdUSB" = 768
          |     "sessionID" = ${dynamicSessionId}
          |     "USBSpeed" = 4
          |     "idVendor" = 1678
          |     "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
          |     "Device Speed" = 3
          |     "bDeviceProtocol" = 1
          |     "PortNum" = 7
          |   }` : ''}
          |
          +-o SS03@14800000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000003ea)}, retain 15, depth 5>
          | {
          |   "sessionID" = ${dynamicSessionId}
          |   "USBSpeed" = 4
          |   "idProduct" = 4126
          |   "iManufacturer" = 0
          |   "bNumConfigurations" = 1
          |   "Device Speed" = 3
          |   "idVendor" = 32902
          |   "bcdDevice" = 0
          |   "Bus Power Available" = 0
          |   "bMaxPacketSize0" = 9
          |   "Built-In" = Yes
          |   "locationID" = ${generateLocationId(343932928)}
          |   "iProduct" = 0
          |   "bDeviceClass" = 9
          |   "iSerialNumber" = 0
          |   "bDeviceSubClass" = 0
          |   "bcdUSB" = 768
          |   "bDeviceProtocol" = 3
          |   "PortNum" = 8
          | }${includeCalDigit ? `
          | +-o CalDigit TS3 Plus@14800000  <class IOUSBHostDevice, id ${generateDeviceId(0x100000858)}, retain 15, depth 6>
          |   {
          |     "iManufacturer" = 1
          |     "bNumConfigurations" = 1
          |     "idProduct" = 22282
          |     "bcdDevice" = 1088
          |     "Bus Power Available" = 0
          |     "USB Address" = ${generateUsbAddress()}
          |     "bMaxPacketSize0" = 9
          |     "iProduct" = 2
          |     "iSerialNumber" = 3
          |     "bDeviceClass" = 9
          |     "Built-In" = No
          |     "locationID" = ${generateLocationId(343932928)}
          |     "bDeviceSubClass" = 0
          |     "bcdUSB" = 768
          |     "sessionID" = ${dynamicSessionId}
          |     "USBSpeed" = 4
          |     "idVendor" = 2109
          |     "USB Serial Number" = "000000000001"
          |     "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
          |     "Device Speed" = 3
          |     "bDeviceProtocol" = 1
          |     "PortNum" = 8
          |   }` : ''}
          |
          +-o SS04@14900000  <class IOUSBHostDevice, id ${generateDeviceId(0x1000003eb)}, retain 12, depth 5>
          | {
          |   "sessionID" = ${dynamicSessionId}
          |   "USBSpeed" = 4
          |   "idProduct" = 4126
          |   "iManufacturer" = 0
          |   "bNumConfigurations" = 1
          |   "Device Speed" = 3
          |   "idVendor" = 32902
          |   "bcdDevice" = 0
          |   "Bus Power Available" = 0
          |   "bMaxPacketSize0" = 9
          |   "Built-In" = Yes
          |   "locationID" = ${generateLocationId(344981504)}
          |   "iProduct" = 0
          |   "bDeviceClass" = 9
          |   "iSerialNumber" = 0
          |   "bDeviceSubClass" = 0
          |   "bcdUSB" = 768
          |   "bDeviceProtocol" = 3
          |   "PortNum" = 9
          | }
          |
          +-o USR1@14a00000  <class IOUSBHostDevice, id ${generateDeviceId(0x10000041b)}, retain 15, depth 5>
            {
              "sessionID" = ${dynamicSessionId}
              "USBSpeed" = 2
              "idProduct" = 33076
              "iManufacturer" = 0
              "bNumConfigurations" = 1
              "Device Speed" = 2
              "idVendor" = 32902
              "bcdDevice" = 0
              "Bus Power Available" = 0
              "bMaxPacketSize0" = 64
              "Built-In" = Yes
              "locationID" = ${generateLocationId(346030080)}
              "iProduct" = 0
              "bDeviceClass" = 9
              "iSerialNumber" = 0
              "bDeviceSubClass" = 0
              "bcdUSB" = 512
              "bDeviceProtocol" = 1
              "PortNum" = 10
            }
            +-o Billboard Device@14a00000  <class IOUSBHostDevice, id ${generateDeviceId(0x10000085c)}, retain 13, depth 6>
            | {
            |   "iManufacturer" = 1
            |   "bNumConfigurations" = 1
            |   "idProduct" = 8194
            |   "bcdDevice" = 257
            |   "Bus Power Available" = 500
            |   "USB Address" = ${generateUsbAddress()}
            |   "bMaxPacketSize0" = 64
            |   "iProduct" = 2
            |   "iSerialNumber" = 0
            |   "bDeviceClass" = 17
            |   "Built-In" = No
            |   "locationID" = ${generateLocationId(346030080)}
            |   "bDeviceSubClass" = 0
            |   "bcdUSB" = 512
            |   "sessionID" = ${dynamicSessionId}
            |   "USBSpeed" = 2
            |   "idVendor" = 2109
            |   "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
            |   "Device Speed" = 2
            |   "bDeviceProtocol" = 0
            |   "PortNum" = 10
            | }
            |
            +-o USB2.0 Hub@14a10000  <class IOUSBHostDevice, id ${generateDeviceId(0x100000863)}, retain 16, depth 6>
              {
                "iManufacturer" = 1
                "bNumConfigurations" = 1
                "idProduct" = 10785
                "bcdDevice" = 1088
                "Bus Power Available" = 500
                "USB Address" = ${generateUsbAddress()}
                "bMaxPacketSize0" = 64
                "iProduct" = 2
                "iSerialNumber" = 0
                "bDeviceClass" = 9
                "Built-In" = No
                "locationID" = ${generateLocationId(346095616)}
                "bDeviceSubClass" = 0
                "bcdUSB" = 512
                "sessionID" = ${dynamicSessionId}
                "USBSpeed" = 2
                "idVendor" = 2109
                "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
                "Device Speed" = 2
                "bDeviceProtocol" = 1
                "PortNum" = 1
              }${includeWebcam ? `
              +-o C922 Pro Stream Webcam@14a11000  <class IOUSBHostDevice, id ${generateDeviceId(0x10000086b)}, retain 20, depth 7>
              | {
              |   "iManufacturer" = 1
              |   "bNumConfigurations" = 1
              |   "idProduct" = 2093
              |   "bcdDevice" = 16
              |   "Bus Power Available" = 500
              |   "USB Address" = ${generateUsbAddress()}
              |   "bMaxPacketSize0" = 64
              |   "iProduct" = 2
              |   "iSerialNumber" = 3
              |   "bDeviceClass" = 239
              |   "Built-In" = No
              |   "locationID" = ${generateLocationId(346103808)}
              |   "bDeviceSubClass" = 2
              |   "bcdUSB" = 512
              |   "sessionID" = ${dynamicSessionId}
              |   "USBSpeed" = 2
              |   "idVendor" = 1133
              |   "USB Serial Number" = "A86D94AF"
              |   "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
              |   "Device Speed" = 2
              |   "bDeviceProtocol" = 1
              |   "PortNum" = 1
              | }
              | ` : ''}${includeUSBDrive ? `
              +-o Cruzer Blade@14a14000  <class IOUSBHostDevice, id ${generateDeviceId(0x100000877)}, retain 15, depth 7>
                {
                  "iManufacturer" = 1
                  "bNumConfigurations" = 1
                  "idProduct" = 21845
                  "bcdDevice" = 256
                  "Bus Power Available" = 224
                  "USB Address" = ${generateUsbAddress()}
                  "bMaxPacketSize0" = 64
                  "iProduct" = 2
                  "iSerialNumber" = 3
                  "bDeviceClass" = 0
                  "Built-In" = No
                  "locationID" = ${generateLocationId(346120192)}
                  "bDeviceSubClass" = 0
                  "bcdUSB" = 512
                  "sessionID" = ${dynamicSessionId}
                  "USBSpeed" = 2
                  "idVendor" = 1921
                  "USB Serial Number" = "20053538421F86B191E5"
                  "IOPowerManagement" = {"DevicePowerState"=2,"CurrentPowerState"=2,"CapabilityFlags"=32768,"MaxPowerState"=4,"DriverPowerState"=2}
                  "Device Speed" = 2
                  "bDeviceProtocol" = 0
                  "PortNum" = 4
                }` : ''}`;
                    }

                default:
                    // 通用ioreg输出
                    return `+-o Root  <class IORegistryEntry, id 0x100000100, retain 4>
  +-o IOPlatformExpertDevice  <class IOPlatformExpertDevice, id 0x100000110, registered, matched, active, busy 0 (1 ms), retain 9>
    {
      "IOPlatformUUID" = "${fakeUUID}"
      "IOPlatformSerialNumber" = "${fakeSerial}"
      "board-id" = <"${fakeBoardId}">
      "model" = <"${fakeModel}">
      "serial-number" = <"${fakeSerial}">
    }`;
            }
        },

        /**
         * 伪造Windows注册表输出
         * @param {string} output - 原始注册表输出
         * @param {string} command - 执行的注册表命令（可选，用于生成特定格式的输出）
         * @returns {string} 伪造后的输出
         */
        spoofWindowsRegistryOutput(output, command = '') {
            log(`🎭 开始伪造Windows注册表输出...`);
            log(`📋 原始输出长度: ${output ? output.length : 0} 字符`);
            log(`🔍 命令上下文: ${command}`);

            // 如果输出为空，生成逼真的注册表数据
            if (!output || typeof output !== "string" || output.trim() === "") {
                log(`🔧 检测到空输出，生成逼真的注册表数据`);
                return this.generateRealisticRegistryOutput(command);
            }

            // 如果有真实输出，替换其中的敏感值
            let spoofed = output;

            // 确保缓存值存在
            if (!INTERCEPTOR_CONFIG.system.winMachineGuid) {
                INTERCEPTOR_CONFIG.system.winMachineGuid = this.generateRandomGuid();
            }
            if (!INTERCEPTOR_CONFIG.system.winFeatureSet) {
                INTERCEPTOR_CONFIG.system.winFeatureSet = this.generateRandomFeatureSet();
            }

            const fakeMachineGuid = INTERCEPTOR_CONFIG.system.winMachineGuid;
            const fakeProductId = INTERCEPTOR_CONFIG.system.winProductId;
            const fakeSerial = INTERCEPTOR_CONFIG.system.winSerial;
            const fakeFeatureSet = INTERCEPTOR_CONFIG.system.winFeatureSet;

            // 替换MachineGuid（使用缓存的值）
            const machineGuidPattern = /(MachineGuid\s+REG_SZ\s+)[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/g;
            const guidMatches = output.match(machineGuidPattern);
            if (guidMatches) {
                log(`🔍 发现${guidMatches.length}个MachineGuid，将替换为: ${fakeMachineGuid}`);
                spoofed = spoofed.replace(machineGuidPattern, `$1${fakeMachineGuid}`);
            }

            // 替换FeatureSet（使用缓存的值）
            const featureSetPattern = /(FeatureSet\s+REG_DWORD\s+)0x[0-9A-Fa-f]{8}/g;
            const featureMatches = output.match(featureSetPattern);
            if (featureMatches) {
                log(`🔍 发现${featureMatches.length}个FeatureSet，将替换为: ${fakeFeatureSet}`);
                spoofed = spoofed.replace(featureSetPattern, `$1${fakeFeatureSet}`);
            }

            // 替换ProductId
            const productIdPattern = /(ProductId\s+REG_SZ\s+)[A-Z0-9\-]+/g;
            const productMatches = output.match(productIdPattern);
            if (productMatches) {
                log(`🔍 发现${productMatches.length}个ProductId，将替换为: ${fakeProductId}`);
                spoofed = spoofed.replace(productIdPattern, `$1${fakeProductId}`);
            }

            // 替换SerialNumber
            const serialNumberPattern = /(SerialNumber\s+REG_SZ\s+)[A-Z0-9]+/g;
            const serialMatches = output.match(serialNumberPattern);
            if (serialMatches) {
                log(`🔍 发现${serialMatches.length}个SerialNumber，将替换为: ${fakeSerial}`);
                spoofed = spoofed.replace(serialNumberPattern, `$1${fakeSerial}`);
            }

            log(`✅ Windows注册表输出伪造完成`);
            return spoofed;
        },

        /**
         * 生成逼真的Windows注册表输出
         * @param {string} command - 执行的注册表命令
         * @returns {string} 生成的注册表输出
         */
        generateRealisticRegistryOutput(command = '') {
            const commandLower = command.toLowerCase();

            // 检测MachineGuid查询
            if (commandLower.includes('machineguid') ||
                commandLower.includes('hkey_local_machine\\software\\microsoft\\cryptography')) {
                return this.generateMachineGuidOutput();
            }

            // 检测FeatureSet查询
            if (commandLower.includes('featureset') ||
                commandLower.includes('centralprocessor\\0') ||
                commandLower.includes('hardware\\description\\system\\centralprocessor')) {
                return this.generateFeatureSetOutput();
            }

            // 检测其他常见的注册表查询
            if (commandLower.includes('productid')) {
                return this.generateProductIdOutput();
            }

            if (commandLower.includes('serialnumber')) {
                return this.generateSerialNumberOutput();
            }

            // 检测WMIC命令
            if (commandLower.includes('wmic')) {
                return this.generateWmicOutput(command);
            }

            // 检测systeminfo命令
            if (commandLower.includes('systeminfo')) {
                return this.generateSystemInfoOutput();
            }

            // 默认返回通用的注册表查询结果
            log(`⚠️ 未识别的注册表查询类型，返回通用输出`);
            return this.generateGenericRegistryOutput();
        },

        /**
         * 生成MachineGuid查询的输出
         * @returns {string} MachineGuid注册表输出
         */
        generateMachineGuidOutput() {
            // 使用缓存的GUID，如果没有则生成一个并缓存
            if (!INTERCEPTOR_CONFIG.system.winMachineGuid) {
                INTERCEPTOR_CONFIG.system.winMachineGuid = this.generateRandomGuid();
                log(`🔑 首次生成并缓存MachineGuid: ${INTERCEPTOR_CONFIG.system.winMachineGuid}`);
            }

            const fakeGuid = INTERCEPTOR_CONFIG.system.winMachineGuid;
            log(`🔑 使用缓存的MachineGuid输出: ${fakeGuid}`);

            return `
HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography
    MachineGuid    REG_SZ    ${fakeGuid}
`.trim();
        },

        /**
         * 生成FeatureSet查询的输出
         * @returns {string} FeatureSet注册表输出
         */
        generateFeatureSetOutput() {
            // 使用缓存的FeatureSet，如果没有则生成一个并缓存
            if (!INTERCEPTOR_CONFIG.system.winFeatureSet) {
                INTERCEPTOR_CONFIG.system.winFeatureSet = this.generateRandomFeatureSet();
                log(`🔧 首次生成并缓存FeatureSet: ${INTERCEPTOR_CONFIG.system.winFeatureSet}`);
            }

            const fakeFeatureSet = INTERCEPTOR_CONFIG.system.winFeatureSet;
            log(`🔧 使用缓存的FeatureSet输出: ${fakeFeatureSet}`);

            return `
HKEY_LOCAL_MACHINE\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0
    FeatureSet    REG_DWORD    ${fakeFeatureSet}
`.trim();
        },

        /**
         * 生成ProductId查询的输出
         * @returns {string} ProductId注册表输出
         */
        generateProductIdOutput() {
            const fakeProductId = INTERCEPTOR_CONFIG.system.winProductId || this.generateRandomProductId();
            log(`🏷️ 使用缓存的ProductId输出: ${fakeProductId}`);

            return `
HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion
    ProductId    REG_SZ    ${fakeProductId}
`.trim();
        },

        /**
         * 生成SerialNumber查询的输出
         * @returns {string} SerialNumber注册表输出
         */
        generateSerialNumberOutput() {
            const fakeSerial = INTERCEPTOR_CONFIG.system.winSerial || this.generateRandomSerial();
            log(`🔢 使用缓存的SerialNumber输出: ${fakeSerial}`);

            return `
HKEY_LOCAL_MACHINE\\HARDWARE\\DESCRIPTION\\System\\BIOS
    SerialNumber    REG_SZ    ${fakeSerial}
`.trim();
        },

        /**
         * 生成通用注册表查询输出
         * @returns {string} 通用注册表输出
         */
        generateGenericRegistryOutput() {
            log(`📝 生成通用注册表输出`);

            return `
查询操作已完成。
`.trim();
        },

        /**
         * 生成随机GUID
         * @returns {string} 随机GUID
         */
        generateRandomGuid() {
            return [8,4,4,4,12].map(len =>
                Array.from({length: len}, () =>
                    "0123456789abcdef"[Math.floor(Math.random() * 16)]
                ).join("")
            ).join("-");
        },

        /**
         * 生成随机FeatureSet值
         * @returns {string} 随机FeatureSet十六进制值
         */
        generateRandomFeatureSet() {
            // 生成8位十六进制数值 (REG_DWORD)
            const randomValue = Math.floor(Math.random() * 0xFFFFFFFF);
            return `0x${randomValue.toString(16).padStart(8, '0')}`;
        },

        /**
         * 生成随机ProductId
         * 格式: 00330-91125-35784-AA503 (20个字符，全数字+固定AA)
         * @returns {string} 随机ProductId
         */
        generateRandomProductId() {
            // 第一组：5位数字 (产品相关编号)
            const firstGroup = Array.from({length: 5}, () =>
                "0123456789"[Math.floor(Math.random() * 10)]
            ).join("");

            // 第二组：5位数字 (随机序列号)
            const secondGroup = Array.from({length: 5}, () =>
                "0123456789"[Math.floor(Math.random() * 10)]
            ).join("");

            // 第三组：5位数字 (随机序列号)
            const thirdGroup = Array.from({length: 5}, () =>
                "0123456789"[Math.floor(Math.random() * 10)]
            ).join("");

            // 第四组：AA + 3位数字 (AA似乎是固定的)
            const fourthGroup = "AA" + Array.from({length: 3}, () =>
                "0123456789"[Math.floor(Math.random() * 10)]
            ).join("");

            return `${firstGroup}-${secondGroup}-${thirdGroup}-${fourthGroup}`;
        },

        /**
         * 生成随机序列号
         * 格式: 8位字符 (如: PF5X3L1C)，支持8位和10位两种格式
         * @returns {string} 随机序列号
         */
        generateRandomSerial() {
            const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            // 随机选择8位或10位格式 (8位更常见)
            const length = Math.random() < 0.7 ? 8 : 10;
            return Array.from({length}, () => chars[Math.floor(36 * Math.random())]).join("");
        },

        /**
         * 生成WMIC命令输出
         * @param {string} command - WMIC命令
         * @returns {string} 生成的WMIC输出
         */
        generateWmicOutput(command = '') {
            const commandLower = command.toLowerCase();

            // BIOS信息
            if (commandLower.includes('bios')) {
                if (commandLower.includes('serialnumber')) {
                    return this.generateWmicBiosSerialNumber();
                } else if (commandLower.includes('manufacturer')) {
                    return this.generateWmicBiosManufacturer();
                } else if (commandLower.includes('version')) {
                    return this.generateWmicBiosVersion();
                } else {
                    return this.generateWmicBiosInfo();
                }
            }

            // 主板信息
            if (commandLower.includes('baseboard') || commandLower.includes('motherboard')) {
                if (commandLower.includes('serialnumber')) {
                    return this.generateWmicBaseboardSerial();
                } else if (commandLower.includes('manufacturer')) {
                    return this.generateWmicBaseboardManufacturer();
                } else if (commandLower.includes('product')) {
                    return this.generateWmicBaseboardProduct();
                } else {
                    return this.generateWmicBaseboardInfo();
                }
            }

            // CPU信息
            if (commandLower.includes('cpu') || commandLower.includes('processor')) {
                if (commandLower.includes('processorid')) {
                    return this.generateWmicProcessorId();
                } else if (commandLower.includes('name')) {
                    return this.generateWmicProcessorName();
                } else if (commandLower.includes('manufacturer')) {
                    return this.generateWmicProcessorManufacturer();
                } else {
                    return this.generateWmicProcessorInfo();
                }
            }

            // 内存信息
            if (commandLower.includes('memorychip') || commandLower.includes('physicalmemory')) {
                if (commandLower.includes('serialnumber')) {
                    return this.generateWmicMemorySerial();
                } else if (commandLower.includes('manufacturer')) {
                    return this.generateWmicMemoryManufacturer();
                } else {
                    return this.generateWmicMemoryInfo();
                }
            }

            // 硬盘信息
            if (commandLower.includes('diskdrive') || commandLower.includes('logicaldisk')) {
                if (commandLower.includes('serialnumber')) {
                    return this.generateWmicDiskSerial();
                } else if (commandLower.includes('model')) {
                    return this.generateWmicDiskModel();
                } else {
                    return this.generateWmicDiskInfo();
                }
            }

            // 网卡信息
            if (commandLower.includes('nic') || commandLower.includes('networkadapter')) {
                if (commandLower.includes('macaddress')) {
                    return this.generateWmicNetworkMac();
                } else {
                    return this.generateWmicNetworkInfo();
                }
            }

            // 系统信息
            if (commandLower.includes('computersystem')) {
                if (commandLower.includes('uuid')) {
                    return this.generateWmicSystemUuid();
                } else if (commandLower.includes('manufacturer')) {
                    return this.generateWmicSystemManufacturer();
                } else if (commandLower.includes('model')) {
                    return this.generateWmicSystemModel();
                } else {
                    return this.generateWmicSystemInfo();
                }
            }

            // 默认WMIC输出
            log(`⚠️ 未识别的WMIC命令类型: ${command}`);
            return this.generateGenericWmicOutput();
        },

        /**
         * 生成WMIC BIOS序列号输出
         * @returns {string} BIOS序列号输出
         */
        generateWmicBiosSerialNumber() {
            // 使用缓存的序列号，如果没有则生成一个并缓存
            if (!INTERCEPTOR_CONFIG.system.winBiosSerial) {
                INTERCEPTOR_CONFIG.system.winBiosSerial = this.generateRandomSerial();
                log(`🔧 首次生成并缓存BIOS序列号: ${INTERCEPTOR_CONFIG.system.winBiosSerial}`);
            }

            const fakeSerial = INTERCEPTOR_CONFIG.system.winBiosSerial;
            log(`🔧 使用缓存的BIOS序列号: ${fakeSerial}`);

            return `SerialNumber\n${fakeSerial}`;
        },

        /**
         * 生成WMIC主板序列号输出
         * @returns {string} 主板序列号输出
         */
        generateWmicBaseboardSerial() {
            // 使用缓存的主板序列号，如果没有则生成一个并缓存
            if (!INTERCEPTOR_CONFIG.system.winBaseboardSerial) {
                INTERCEPTOR_CONFIG.system.winBaseboardSerial = this.generateRandomSerial();
                log(`🔧 首次生成并缓存主板序列号: ${INTERCEPTOR_CONFIG.system.winBaseboardSerial}`);
            }

            const fakeSerial = INTERCEPTOR_CONFIG.system.winBaseboardSerial;
            log(`🔧 使用缓存的主板序列号: ${fakeSerial}`);

            return `SerialNumber\n${fakeSerial}`;
        },

        /**
         * 生成WMIC处理器ID输出
         * @returns {string} 处理器ID输出
         */
        generateWmicProcessorId() {
            // 使用缓存的处理器ID，如果没有则生成一个并缓存
            if (!INTERCEPTOR_CONFIG.system.winProcessorId) {
                // 处理器ID通常是16位十六进制
                INTERCEPTOR_CONFIG.system.winProcessorId = Array.from({length: 16}, () =>
                    "0123456789ABCDEF"[Math.floor(Math.random() * 16)]
                ).join("");
                log(`🔧 首次生成并缓存处理器ID: ${INTERCEPTOR_CONFIG.system.winProcessorId}`);
            }

            const fakeProcessorId = INTERCEPTOR_CONFIG.system.winProcessorId;
            log(`🔧 使用缓存的处理器ID: ${fakeProcessorId}`);

            return `ProcessorId\n${fakeProcessorId}`;
        },

        /**
         * 生成WMIC系统UUID输出
         * @returns {string} 系统UUID输出
         */
        generateWmicSystemUuid() {
            // 使用缓存的系统UUID，如果没有则生成一个并缓存
            if (!INTERCEPTOR_CONFIG.system.winSystemUuid) {
                INTERCEPTOR_CONFIG.system.winSystemUuid = this.generateRandomGuid().toUpperCase();
                log(`🔧 首次生成并缓存系统UUID: ${INTERCEPTOR_CONFIG.system.winSystemUuid}`);
            }

            const fakeUuid = INTERCEPTOR_CONFIG.system.winSystemUuid;
            log(`🔧 使用缓存的系统UUID: ${fakeUuid}`);

            return `UUID\n{${fakeUuid}}`;
        },

        /**
         * 生成WMIC网卡MAC地址输出
         * @returns {string} MAC地址输出
         */
        generateWmicNetworkMac() {
            // 使用缓存的MAC地址，如果没有则生成一个并缓存
            if (!INTERCEPTOR_CONFIG.system.winMacAddress) {
                // 生成随机MAC地址，使用常见的厂商前缀
                const vendorPrefixes = [
                    '00:1B:44', // Dell
                    '00:50:56', // VMware
                    '08:00:27', // VirtualBox
                    '00:0C:29', // VMware
                    '00:15:5D', // Microsoft Hyper-V
                    '52:54:00', // QEMU/KVM
                    'AC:DE:48', // Intel
                    '00:E0:4C'  // Realtek
                ];
                const prefix = vendorPrefixes[Math.floor(Math.random() * vendorPrefixes.length)];
                const suffix = Array.from({length: 3}, () =>
                    Array.from({length: 2}, () =>
                        "0123456789ABCDEF"[Math.floor(Math.random() * 16)]
                    ).join("")
                ).join(":");

                INTERCEPTOR_CONFIG.system.winMacAddress = `${prefix}:${suffix}`;
                log(`🔧 首次生成并缓存MAC地址: ${INTERCEPTOR_CONFIG.system.winMacAddress}`);
            }

            const fakeMac = INTERCEPTOR_CONFIG.system.winMacAddress;
            log(`🔧 使用缓存的MAC地址: ${fakeMac}`);

            return `MACAddress\n${fakeMac}`;
        },

        /**
         * 生成WMIC BIOS制造商输出
         * @returns {string} BIOS制造商输出
         */
        generateWmicBiosManufacturer() {
            const manufacturers = [
                'American Megatrends Inc.',     // 最常见
                'Phoenix Technologies Ltd.',    // 常见
                'Award Software',               // 较常见
                'Insyde Corp.',                // 常见
                'Dell Inc.',                   // Dell品牌机
                'HP',                          // HP品牌机
                'Lenovo',                      // Lenovo品牌机
                'ASUS',                        // ASUS主板
                'ASUSTeK COMPUTER INC.',       // ASUS完整名称
                'Gigabyte Technology Co., Ltd.', // 技嘉
                'MSI',                         // 微星
                'ASRock',                      // 华擎
                'Intel Corp.',                 // Intel主板
                'BIOSTAR Group',               // 映泰
                'EVGA',                        // EVGA
                'Supermicro',                  // 超微
                'Foxconn',                     // 富士康
                'ECS',                         // 精英
                'Acer',                        // 宏碁
                'Gateway',                     // Gateway
                'eMachines',                   // eMachines
                'Packard Bell',                // Packard Bell
                'Sony',                        // 索尼
                'Toshiba',                     // 东芝
                'Samsung',                     // 三星
                'LG Electronics',              // LG
                'Alienware',                   // 外星人
                'Origin PC',                   // Origin PC
                'CyberPowerPC',               // CyberPower
                'iBUYPOWER'                   // iBUYPOWER
            ];
            const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
            return `Manufacturer\n${manufacturer}`;
        },

        /**
         * 生成WMIC BIOS版本输出
         * @returns {string} BIOS版本输出
         */
        generateWmicBiosVersion() {
            const versions = ['A01', 'A02', 'A03', 'A04', 'A05', '1.0.0', '1.0.1', '1.1.0', '2.0.0'];
            const version = versions[Math.floor(Math.random() * versions.length)];
            return `Version\n${version}`;
        },

        /**
         * 生成WMIC主板制造商输出
         * @returns {string} 主板制造商输出
         */
        generateWmicBaseboardManufacturer() {
            const manufacturers = [
                'ASUSTeK COMPUTER INC.',       // 华硕 - 最常见
                'Gigabyte Technology Co., Ltd.', // 技嘉 - 很常见
                'MSI',                         // 微星 - 很常见
                'ASRock',                      // 华擎 - 常见
                'Dell Inc.',                   // 戴尔品牌机
                'HP',                          // 惠普品牌机
                'Lenovo',                      // 联想品牌机
                'Intel Corporation',           // Intel主板
                'BIOSTAR Group',               // 映泰
                'EVGA',                        // EVGA
                'Supermicro',                  // 超微
                'Foxconn',                     // 富士康
                'ECS',                         // 精英
                'Acer',                        // 宏碁
                'Gateway',                     // Gateway
                'eMachines',                   // eMachines
                'Packard Bell',                // Packard Bell
                'Sony Corporation',            // 索尼
                'Toshiba',                     // 东芝
                'Samsung Electronics Co., Ltd.', // 三星
                'LG Electronics Inc.',         // LG
                'Alienware Corporation',       // 外星人
                'ZOTAC',                       // 索泰
                'XFX',                         // XFX
                'PNY Technologies',            // PNY
                'Corsair',                     // 海盗船
                'NZXT',                        // NZXT
                'Thermaltake',                 // 曜越
                'Cooler Master',               // 酷冷至尊
                'be quiet!',                   // be quiet!
                'Fractal Design',              // Fractal Design
                'SilverStone Technology',      // 银欣
                'Lian Li',                     // 联力
                'In Win',                      // 迎广
                'Antec',                       // 安钛克
                'Seasonic',                    // 海韵
                'ADATA Technology',            // 威刚
                'G.Skill',                     // 芝奇
                'Team Group',                  // 十铨
                'Crucial',                     // 美光
                'Western Digital',             // 西数
                'Seagate Technology'           // 希捷
            ];
            const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
            return `Manufacturer\n${manufacturer}`;
        },

        /**
         * 生成WMIC主板产品输出
         * @returns {string} 主板产品输出
         */
        generateWmicBaseboardProduct() {
            const products = [
                // ASUS主板 - 最常见品牌
                'PRIME B450M-A', 'PRIME B550M-A', 'PRIME B650M-A', 'PRIME Z690-A',
                'ROG STRIX B450-F GAMING', 'ROG STRIX B550-F GAMING', 'ROG STRIX Z690-E GAMING',
                'TUF GAMING B450M-PLUS II', 'TUF GAMING B550M-PLUS', 'TUF GAMING Z690-PLUS',
                'PRIME X570-A', 'PRIME Z590-A', 'PRIME H610M-A',
                'ROG CROSSHAIR VIII HERO', 'ROG MAXIMUS XIII HERO',

                // MSI主板 - 很常见
                'B450M PRO-VDH MAX', 'B550M PRO-VDH WIFI', 'B650M PRO-VDH WIFI',
                'MAG B550 TOMAHAWK', 'MAG B650 TOMAHAWK WIFI', 'MAG Z690 TOMAHAWK WIFI',
                'MPG B550 GAMING PLUS', 'MPG Z690 CARBON WIFI', 'MPG X570 GAMING PLUS',
                'PRO B450M PRO-M2 MAX', 'PRO Z690-A WIFI',

                // Gigabyte主板 - 很常见
                'B450 AORUS M', 'B550 AORUS ELITE', 'B650 AORUS ELITE AX',
                'Z690 AORUS ELITE AX', 'X570 AORUS ELITE', 'Z590 AORUS ELITE AX',
                'B450M DS3H', 'B550M DS3H', 'H610M H',
                'AORUS X570 MASTER', 'AORUS Z690 MASTER',

                // ASRock主板 - 常见
                'B450M Steel Legend', 'B550M Steel Legend', 'Z690 Steel Legend',
                'B450M PRO4', 'B550M PRO4', 'Z690 PRO RS',
                'X570 Phantom Gaming 4', 'Z590 Phantom Gaming 4',

                // 品牌机主板
                'OptiPlex 7090', 'OptiPlex 5090', 'OptiPlex 3090', // Dell
                'EliteDesk 800 G8', 'EliteDesk 600 G6', 'ProDesk 400 G7', // HP
                'ThinkCentre M720q', 'ThinkCentre M920q', 'ThinkStation P340', // Lenovo
                'Vostro 3681', 'Inspiron 3881', 'XPS 8940', // Dell消费级
                'Pavilion Desktop TP01', 'OMEN 25L Desktop', // HP消费级
                'IdeaCentre 5i', 'Legion Tower 5i', // Lenovo消费级

                // Intel主板
                'DH61WW', 'DZ68DB', 'DQ67SW', 'DH87RL', 'DH97DB',
                'NUC8i7HVK', 'NUC11PAHi7', 'NUC12WSHi7',

                // 其他品牌
                'H110M-A/M.2', 'H310M-R R2.0', 'A320M-HDV R4.0', // 入门级
                'X299 AORUS MASTER', 'TRX40 AORUS MASTER', // 高端
                'Creator TRX40', 'WS X299 SAGE', // 工作站

                // 服务器主板
                'X11SSH-F', 'X12SPi-TF', 'H12SSL-i', // Supermicro
                'MBD-X11SSH-F-O', 'MBD-X12SPL-F-O',

                // 小众但真实的型号
                'Fatal1ty AB350 Gaming K4', 'Fatal1ty B450 Gaming K4',
                'GAMING X', 'GAMING EDGE WIFI', 'GAMING CARBON',
                'AORUS PRO', 'AORUS ULTRA', 'AORUS XTREME',
                'Phantom Gaming X', 'Taichi', 'Creator'
            ];
            const product = products[Math.floor(Math.random() * products.length)];
            return `Product\n${product}`;
        },

        /**
         * 生成WMIC处理器名称输出
         * @returns {string} 处理器名称输出
         */
        generateWmicProcessorName() {
            const processors = [
                // Intel 12代 (Alder Lake) - 最新主流
                'Intel(R) Core(TM) i9-12900K CPU @ 3.20GHz',
                'Intel(R) Core(TM) i9-12900KF CPU @ 3.20GHz',
                'Intel(R) Core(TM) i7-12700K CPU @ 3.60GHz',
                'Intel(R) Core(TM) i7-12700KF CPU @ 3.60GHz',
                'Intel(R) Core(TM) i7-12700 CPU @ 2.10GHz',
                'Intel(R) Core(TM) i7-12700F CPU @ 2.10GHz',
                'Intel(R) Core(TM) i5-12600K CPU @ 3.70GHz',
                'Intel(R) Core(TM) i5-12600KF CPU @ 3.70GHz',
                'Intel(R) Core(TM) i5-12600 CPU @ 3.30GHz',
                'Intel(R) Core(TM) i5-12400 CPU @ 2.50GHz',
                'Intel(R) Core(TM) i5-12400F CPU @ 2.50GHz',
                'Intel(R) Core(TM) i3-12100 CPU @ 3.30GHz',
                'Intel(R) Core(TM) i3-12100F CPU @ 3.30GHz',

                // Intel 11代 (Rocket Lake) - 较新
                'Intel(R) Core(TM) i9-11900K CPU @ 3.50GHz',
                'Intel(R) Core(TM) i9-11900KF CPU @ 3.50GHz',
                'Intel(R) Core(TM) i7-11700K CPU @ 3.60GHz',
                'Intel(R) Core(TM) i7-11700KF CPU @ 3.60GHz',
                'Intel(R) Core(TM) i7-11700 CPU @ 2.50GHz',
                'Intel(R) Core(TM) i7-11700F CPU @ 2.50GHz',
                'Intel(R) Core(TM) i5-11600K CPU @ 3.90GHz',
                'Intel(R) Core(TM) i5-11600KF CPU @ 3.90GHz',
                'Intel(R) Core(TM) i5-11400 CPU @ 2.60GHz',
                'Intel(R) Core(TM) i5-11400F CPU @ 2.60GHz',

                // Intel 10代 (Comet Lake) - 主流
                'Intel(R) Core(TM) i9-10900K CPU @ 3.70GHz',
                'Intel(R) Core(TM) i9-10900KF CPU @ 3.70GHz',
                'Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz',
                'Intel(R) Core(TM) i7-10700KF CPU @ 3.80GHz',
                'Intel(R) Core(TM) i7-10700 CPU @ 2.90GHz',
                'Intel(R) Core(TM) i7-10700F CPU @ 2.90GHz',
                'Intel(R) Core(TM) i5-10600K CPU @ 4.10GHz',
                'Intel(R) Core(TM) i5-10600KF CPU @ 4.10GHz',
                'Intel(R) Core(TM) i5-10400 CPU @ 2.90GHz',
                'Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz',
                'Intel(R) Core(TM) i3-10100 CPU @ 3.60GHz',
                'Intel(R) Core(TM) i3-10100F CPU @ 3.60GHz',

                // Intel 9代 (Coffee Lake Refresh) - 仍然常见
                'Intel(R) Core(TM) i9-9900K CPU @ 3.60GHz',
                'Intel(R) Core(TM) i9-9900KF CPU @ 3.60GHz',
                'Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz',
                'Intel(R) Core(TM) i7-9700KF CPU @ 3.60GHz',
                'Intel(R) Core(TM) i7-9700 CPU @ 3.00GHz',
                'Intel(R) Core(TM) i7-9700F CPU @ 3.00GHz',
                'Intel(R) Core(TM) i5-9600K CPU @ 3.70GHz',
                'Intel(R) Core(TM) i5-9600KF CPU @ 3.70GHz',
                'Intel(R) Core(TM) i5-9400 CPU @ 2.90GHz',
                'Intel(R) Core(TM) i5-9400F CPU @ 2.90GHz',

                // AMD Ryzen 5000系列 (Zen 3) - 最新主流
                'AMD Ryzen 9 5950X 16-Core Processor',
                'AMD Ryzen 9 5900X 12-Core Processor',
                'AMD Ryzen 7 5800X 8-Core Processor',
                'AMD Ryzen 7 5700X 8-Core Processor',
                'AMD Ryzen 5 5600X 6-Core Processor',
                'AMD Ryzen 5 5600 6-Core Processor',
                'AMD Ryzen 5 5500 6-Core Processor',

                // AMD Ryzen 3000系列 (Zen 2) - 主流
                'AMD Ryzen 9 3950X 16-Core Processor',
                'AMD Ryzen 9 3900X 12-Core Processor',
                'AMD Ryzen 7 3800X 8-Core Processor',
                'AMD Ryzen 7 3700X 8-Core Processor',
                'AMD Ryzen 5 3600X 6-Core Processor',
                'AMD Ryzen 5 3600 6-Core Processor',
                'AMD Ryzen 5 3500X 6-Core Processor',
                'AMD Ryzen 3 3300X 4-Core Processor',
                'AMD Ryzen 3 3100 4-Core Processor',

                // AMD Ryzen 2000系列 (Zen+) - 仍然常见
                'AMD Ryzen 7 2700X Eight-Core Processor',
                'AMD Ryzen 7 2700 Eight-Core Processor',
                'AMD Ryzen 5 2600X Six-Core Processor',
                'AMD Ryzen 5 2600 Six-Core Processor',
                'AMD Ryzen 5 2400G with Radeon Vega Graphics',
                'AMD Ryzen 3 2200G with Radeon Vega Graphics',

                // Intel 8代 (Coffee Lake) - 较老但仍常见
                'Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz',
                'Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz',
                'Intel(R) Core(TM) i5-8600K CPU @ 3.60GHz',
                'Intel(R) Core(TM) i5-8400 CPU @ 2.80GHz',
                'Intel(R) Core(TM) i3-8100 CPU @ 3.60GHz',

                // Intel 7代 (Kaby Lake) - 较老
                'Intel(R) Core(TM) i7-7700K CPU @ 4.20GHz',
                'Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz',
                'Intel(R) Core(TM) i5-7600K CPU @ 3.80GHz',
                'Intel(R) Core(TM) i5-7400 CPU @ 3.00GHz',
                'Intel(R) Core(TM) i3-7100 CPU @ 3.90GHz',

                // 移动处理器 (笔记本常见)
                'Intel(R) Core(TM) i7-1165G7 CPU @ 2.80GHz',
                'Intel(R) Core(TM) i5-1135G7 CPU @ 2.40GHz',
                'AMD Ryzen 7 4800H with Radeon Graphics',
                'AMD Ryzen 5 4600H with Radeon Graphics',
                'Intel(R) Core(TM) i7-10750H CPU @ 2.60GHz',
                'Intel(R) Core(TM) i5-10300H CPU @ 2.50GHz',

                // 服务器/工作站处理器
                'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
                'Intel(R) Xeon(R) Gold 6248 CPU @ 2.50GHz',
                'AMD EPYC 7742 64-Core Processor',
                'Intel(R) Core(TM) i9-10980XE CPU @ 3.00GHz'
            ];
            const processor = processors[Math.floor(Math.random() * processors.length)];
            return `Name\n${processor}`;
        },

        /**
         * 生成WMIC处理器制造商输出
         * @returns {string} 处理器制造商输出
         */
        generateWmicProcessorManufacturer() {
            const manufacturers = ['GenuineIntel', 'AuthenticAMD'];
            const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
            return `Manufacturer\n${manufacturer}`;
        },

        /**
         * 生成WMIC内存序列号输出
         * @returns {string} 内存序列号输出
         */
        generateWmicMemorySerial() {
            // 生成随机内存序列号
            const serial = Array.from({length: 8}, () =>
                "0123456789ABCDEF"[Math.floor(Math.random() * 16)]
            ).join("");
            return `SerialNumber\n${serial}`;
        },

        /**
         * 生成WMIC硬盘序列号输出
         * @returns {string} 硬盘序列号输出
         */
        generateWmicDiskSerial() {
            // 生成随机硬盘序列号
            const serial = Array.from({length: 12}, () =>
                "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 36)]
            ).join("");
            return `SerialNumber\n${serial}`;
        },

        /**
         * 生成WMIC系统制造商输出
         * @returns {string} 系统制造商输出
         */
        generateWmicSystemManufacturer() {
            // 使用缓存的制造商，确保与systeminfo一致
            if (INTERCEPTOR_CONFIG.system.winSystemManufacturer) {
                const manufacturer = INTERCEPTOR_CONFIG.system.winSystemManufacturer;
                log(`🔧 使用缓存的系统制造商: ${manufacturer}`);
                return `Manufacturer\n${manufacturer}`;
            }

            // 如果没有缓存，生成新的并缓存
            const manufacturers = [
                // 主要品牌机制造商 (按市场份额排序)
                'Dell Inc.',                    // 戴尔 - 最大市场份额
                'HP',                          // 惠普 - 第二大
                'Lenovo',                      // 联想 - 第三大
                'ASUS',                        // 华硕
                'Acer',                        // 宏碁
                'MSI',                         // 微星
                'Apple Inc.',                  // 苹果 (Boot Camp)
                'Microsoft Corporation',       // 微软 Surface
                'Samsung Electronics Co., Ltd.', // 三星
                'LG Electronics Inc.',         // LG
                'Sony Corporation',            // 索尼
                'Toshiba',                     // 东芝
                'Fujitsu',                     // 富士通
                'Gateway',                     // Gateway
                'eMachines',                   // eMachines
                'Packard Bell',                // Packard Bell
                'Alienware Corporation',       // 外星人 (Dell子品牌)
                'Origin PC',                   // Origin PC
                'CyberPowerPC',               // CyberPower
                'iBUYPOWER',                  // iBUYPOWER
                'NZXT',                       // NZXT BLD
                'Corsair',                    // 海盗船
                'Thermaltake',                // 曜越
                'Cooler Master',              // 酷冷至尊
                'EVGA',                       // EVGA
                'Gigabyte Technology Co., Ltd.', // 技嘉
                'ASRock',                     // 华擎
                'BIOSTAR',                    // 映泰
                'Supermicro',                 // 超微
                'Intel Corporation',          // Intel NUC
                'ZOTAC',                      // 索泰
                'Shuttle Inc.',               // 浩鑫
                'ASUSTeK COMPUTER INC.',      // 华硕完整名称
                'Micro-Star International',   // 微星完整名称
                'Hewlett-Packard',            // 惠普完整名称
                'Dell Computer Corporation',   // 戴尔完整名称
                'Lenovo Group Limited',       // 联想完整名称
                'System manufacturer',        // 通用制造商标识
                'To Be Filled By O.E.M.',    // OEM占位符
                'Default string'              // 默认字符串
            ];
            const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
            INTERCEPTOR_CONFIG.system.winSystemManufacturer = manufacturer;
            log(`🔧 首次生成并缓存系统制造商: ${manufacturer}`);
            return `Manufacturer\n${manufacturer}`;
        },

        /**
         * 生成WMIC系统型号输出
         * @returns {string} 系统型号输出
         */
        generateWmicSystemModel() {
            // 使用缓存的型号，确保与systeminfo一致
            if (INTERCEPTOR_CONFIG.system.winSystemModel) {
                const model = INTERCEPTOR_CONFIG.system.winSystemModel;
                log(`🔧 使用缓存的系统型号: ${model}`);
                return `Model\n${model}`;
            }

            // 如果没有缓存，生成新的并缓存
            const models = [
                // Dell 戴尔型号
                'OptiPlex 7090', 'OptiPlex 5090', 'OptiPlex 3090', 'OptiPlex 7080', 'OptiPlex 5080',
                'OptiPlex 3080', 'OptiPlex 7070', 'OptiPlex 5070', 'OptiPlex 3070', 'OptiPlex 7060',
                'Vostro 3681', 'Vostro 3888', 'Vostro 5090', 'Vostro 3470', 'Vostro 3670',
                'Inspiron 3881', 'Inspiron 3880', 'Inspiron 5680', 'Inspiron 5675', 'Inspiron 3668',
                'XPS 8940', 'XPS 8930', 'XPS 8920', 'XPS 8910', 'XPS Tower',
                'Precision 3650', 'Precision 3640', 'Precision 3630', 'Precision 5820', 'Precision 7820',
                'Alienware Aurora R12', 'Alienware Aurora R11', 'Alienware Aurora R10', 'Alienware Aurora R9',

                // HP 惠普型号
                'EliteDesk 800 G8', 'EliteDesk 800 G6', 'EliteDesk 800 G5', 'EliteDesk 600 G6', 'EliteDesk 600 G5',
                'ProDesk 400 G7', 'ProDesk 400 G6', 'ProDesk 600 G5', 'ProDesk 405 G6', 'ProDesk 405 G4',
                'Pavilion Desktop TP01', 'Pavilion Gaming TG01', 'Pavilion 590', 'Pavilion 595', 'Pavilion 570',
                'OMEN 25L Desktop', 'OMEN 30L Desktop', 'OMEN Obelisk', 'OMEN 870', 'OMEN 880',
                'ENVY Desktop TE01', 'ENVY 795', 'ENVY Phoenix', 'ENVY Curved AiO', 'ENVY 750',
                'Z2 Tower G5', 'Z4 G4', 'Z6 G4', 'Z8 G4', 'Z1 Entry Tower G6',

                // Lenovo 联想型号
                'ThinkCentre M720q', 'ThinkCentre M920q', 'ThinkCentre M720s', 'ThinkCentre M920s', 'ThinkCentre M720t',
                'ThinkCentre M920t', 'ThinkCentre M75q', 'ThinkCentre M75s', 'ThinkCentre M75t', 'ThinkCentre M70q',
                'ThinkStation P340', 'ThinkStation P520', 'ThinkStation P720', 'ThinkStation P920', 'ThinkStation P330',
                'IdeaCentre 5i', 'IdeaCentre 3i', 'IdeaCentre Gaming 5i', 'IdeaCentre AiO 3', 'IdeaCentre 720',
                'Legion Tower 5i', 'Legion Tower 7i', 'Legion C530', 'Legion C730', 'Legion Y520',
                'Yoga AiO 7', 'Yoga A940', 'Yoga Home 900', 'Yoga Home 500',

                // ASUS 华硕型号
                'ASUS Desktop M32CD', 'ASUS Desktop M52BC', 'ASUS Desktop M70AD', 'ASUS Desktop K31CD',
                'VivoPC VM65', 'VivoPC VM62', 'VivoPC X', 'VivoMini UN65', 'VivoMini UN68',
                'ROG Strix GT35', 'ROG Strix GT15', 'ROG Strix GL10', 'ROG Strix GL12', 'ROG G20',
                'TUF Gaming GT501', 'TUF Gaming GT301', 'TUF Gaming A15', 'TUF Gaming A17',
                'ProArt Station PA90', 'ProArt Display PA278', 'ProArt StudioBook',
                'ZenAiO Pro 22', 'ZenAiO 24', 'Zen AiO ZN242',

                // Acer 宏碁型号
                'Aspire TC-895', 'Aspire TC-885', 'Aspire TC-875', 'Aspire TC-865', 'Aspire TC-780',
                'Aspire XC-895', 'Aspire XC-885', 'Aspire XC-830', 'Aspire XC-705', 'Aspire X3995',
                'Predator Orion 9000', 'Predator Orion 5000', 'Predator Orion 3000', 'Predator G1', 'Predator G3',
                'Nitro N50', 'Nitro N30', 'Nitro 5', 'Nitro 7', 'Nitro VG270',
                'Veriton X2665G', 'Veriton X4665G', 'Veriton X6665G', 'Veriton M2640G', 'Veriton M4640G',

                // MSI 微星型号
                'Codex R', 'Codex S', 'Codex X', 'Codex XE', 'Codex 5',
                'Trident 3', 'Trident A', 'Trident X', 'Trident AS', 'Trident 3 Arctic',
                'Aegis 3', 'Aegis RS', 'Aegis Ti3', 'Aegis X3', 'Aegis SE',
                'Infinite A', 'Infinite S', 'Infinite X', 'Infinite XE', 'Infinite 8',
                'Creator P100A', 'Creator P100X', 'Prestige P100', 'Modern AM271',

                // 其他品牌
                'Surface Studio 2', 'Surface Pro X', 'Surface Laptop Studio', // Microsoft
                'Mac Pro', 'iMac', 'Mac mini', 'MacBook Pro', 'MacBook Air', // Apple (Boot Camp)
                'Galaxy Book Pro', 'Galaxy Book Flex', 'Galaxy Book Ion', // Samsung
                'gram 17', 'gram 16', 'gram 14', 'All-in-One 27V70N', // LG
                'VAIO Z', 'VAIO S', 'VAIO A12', 'VAIO FE14', // Sony VAIO
                'Satellite Pro C50', 'Satellite L50', 'Portégé X30L', // Toshiba
                'LIFEBOOK U9311', 'LIFEBOOK E5511', 'ESPRIMO D958', // Fujitsu

                // Intel NUC型号
                'NUC8i7HVK', 'NUC11PAHi7', 'NUC12WSHi7', 'NUC10i7FNH', 'NUC8i5BEH',
                'NUC6CAYH', 'NUC7CJYH', 'NUC8i3BEH', 'NUC10i5FNH', 'NUC11TNHi5',

                // 通用/OEM型号
                'System Product Name', 'To be filled by O.E.M.', 'Default string',
                'Desktop', 'All Series', 'System Version', 'Not Specified',
                'Computer', 'PC', 'Workstation', 'Tower', 'Mini Tower'
            ];
            const model = models[Math.floor(Math.random() * models.length)];
            INTERCEPTOR_CONFIG.system.winSystemModel = model;
            log(`🔧 首次生成并缓存系统型号: ${model}`);
            return `Model\n${model}`;
        },

        /**
         * 生成完整的WMIC信息输出（当查询多个字段时）
         * @returns {string} 完整信息输出
         */
        generateWmicBiosInfo() {
            return `Manufacturer                SerialNumber  Version\nAmerican Megatrends Inc.    ${this.generateRandomSerial()}     A01`;
        },

        generateWmicBaseboardInfo() {
            return `Manufacturer  Product           SerialNumber\nDell Inc.     OptiPlex 7090     ${this.generateRandomSerial()}`;
        },

        generateWmicProcessorInfo() {
            return `Manufacturer   Name                                          ProcessorId\nGenuineIntel   Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz   ${Array.from({length: 16}, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("")}`;
        },

        generateWmicMemoryInfo() {
            return `Manufacturer  SerialNumber\nSamsung       ${Array.from({length: 8}, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("")}`;
        },

        generateWmicDiskInfo() {
            return `Model                SerialNumber\nSamsung SSD 970 EVO  ${Array.from({length: 12}, () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 36)]).join("")}`;
        },

        generateWmicNetworkInfo() {
            return `MACAddress        Name\n${INTERCEPTOR_CONFIG.system.winMacAddress || this.generateWmicNetworkMac().split('\n')[1]}  Intel(R) Ethernet Connection`;
        },

        generateWmicSystemInfo() {
            return `Manufacturer  Model         UUID\nDell Inc.     OptiPlex 7090 {${INTERCEPTOR_CONFIG.system.winSystemUuid || this.generateRandomGuid().toUpperCase()}}`;
        },

        /**
         * 生成通用WMIC输出
         * @returns {string} 通用WMIC输出
         */
        generateGenericWmicOutput() {
            log(`📝 生成通用WMIC输出`);
            return `查询操作已完成。`;
        },

        /**
         * 生成systeminfo命令输出
         * @returns {string} systeminfo输出
         */
        generateSystemInfoOutput() {
            log(`🖥️ 生成systeminfo输出`);

            // 确保缓存值存在
            if (!INTERCEPTOR_CONFIG.system.winSystemInfoData) {
                INTERCEPTOR_CONFIG.system.winSystemInfoData = this.generateSystemInfoData();
                log(`🔧 首次生成并缓存systeminfo数据`);
            }

            const data = INTERCEPTOR_CONFIG.system.winSystemInfoData;
            log(`🔧 使用缓存的systeminfo数据`);

            return this.formatSystemInfoOutput(data);
        },

        /**
         * 生成systeminfo数据
         * @returns {Object} systeminfo数据对象
         */
        generateSystemInfoData() {
            // 使用与os.hostname()相同的hostname，但转换为Windows格式
            let hostName = INTERCEPTOR_CONFIG.system.hostname;

            // 如果hostname是Unix风格的，转换为Windows风格
            if (hostName && hostName.includes('-') && !hostName.toUpperCase().startsWith('DESKTOP-')) {
                // 将Unix风格的hostname转换为Windows风格
                hostName = 'DESKTOP-' + hostName.replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 6);
                log(`🔧 将hostname从Unix风格转换为Windows风格: ${INTERCEPTOR_CONFIG.system.hostname} -> ${hostName}`);
            } else if (!hostName) {
                // 如果没有hostname，生成一个Windows风格的
                hostName = this.generateRandomHostName();
                log(`🔧 生成新的Windows风格hostname: ${hostName}`);
            }
            const osVersions = [
                { name: 'Microsoft Windows 11 Pro', version: '10.0.26100 N/A Build 26100' },
                { name: 'Microsoft Windows 11 Home', version: '10.0.26100 N/A Build 26100' },
                { name: 'Microsoft Windows 11 Enterprise', version: '10.0.26100 N/A Build 26100' },
                { name: 'Microsoft Windows 10 Pro', version: '10.0.19045 N/A Build 19045' },
                { name: 'Microsoft Windows 10 Home', version: '10.0.19045 N/A Build 19045' },
                { name: 'Microsoft Windows 10 Enterprise', version: '10.0.19045 N/A Build 19045' }
            ];
            const osInfo = osVersions[Math.floor(Math.random() * osVersions.length)];

            // 使用缓存的制造商和型号，确保与WMIC一致
            let manufacturer, model;
            if (INTERCEPTOR_CONFIG.system.winSystemManufacturer && INTERCEPTOR_CONFIG.system.winSystemModel) {
                manufacturer = INTERCEPTOR_CONFIG.system.winSystemManufacturer;
                model = INTERCEPTOR_CONFIG.system.winSystemModel;
            } else {
                const manufacturers = ['LENOVO', 'DELL', 'HP', 'ASUS', 'Acer', 'MSI'];
                manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
                const models = this.getSystemModelsForManufacturer(manufacturer);
                model = models[Math.floor(Math.random() * models.length)];

                // 缓存制造商和型号
                INTERCEPTOR_CONFIG.system.winSystemManufacturer = manufacturer;
                INTERCEPTOR_CONFIG.system.winSystemModel = model;
                log(`🔧 首次生成并缓存系统制造商: ${manufacturer}, 型号: ${model}`);
            }

            // 使用缓存的处理器信息，确保与WMIC一致
            let processor;
            if (INTERCEPTOR_CONFIG.system.winSystemInfoProcessor) {
                processor = INTERCEPTOR_CONFIG.system.winSystemInfoProcessor;
            } else {
                const processors = this.getProcessorInfoForSystemInfo();
                processor = processors[Math.floor(Math.random() * processors.length)];
                INTERCEPTOR_CONFIG.system.winSystemInfoProcessor = processor;
                log(`🔧 首次生成并缓存处理器信息: ${processor}`);
            }

            // 使用缓存的BIOS版本，确保与WMIC一致
            let biosVersion;
            if (INTERCEPTOR_CONFIG.system.winSystemInfoBios) {
                biosVersion = INTERCEPTOR_CONFIG.system.winSystemInfoBios;
            } else {
                const biosVersions = this.getBiosVersionsForManufacturer(manufacturer);
                biosVersion = biosVersions[Math.floor(Math.random() * biosVersions.length)];
                INTERCEPTOR_CONFIG.system.winSystemInfoBios = biosVersion;
                log(`🔧 首次生成并缓存BIOS版本: ${biosVersion}`);
            }

            // 生成随机日期
            const installDate = this.generateRandomInstallDate();
            const bootTime = this.generateRandomBootTime();

            // 生成内存信息 (常见配置)
            const memoryConfigs = [
                { total: 8192, available: 5120 },    // 8GB
                { total: 16384, available: 10240 },  // 16GB
                { total: 32768, available: 20480 },  // 32GB
                { total: 65536, available: 45056 }   // 64GB
            ];
            const memory = memoryConfigs[Math.floor(Math.random() * memoryConfigs.length)];

            return {
                hostName,
                osName: osInfo.name,
                osVersion: osInfo.version,
                manufacturer,
                model,
                processor,
                biosVersion,
                installDate,
                bootTime,
                memory,
                productId: INTERCEPTOR_CONFIG.system.winProductId || this.generateRandomProductId()
            };
        },

        /**
         * 根据制造商获取系统型号
         * @param {string} manufacturer - 制造商
         * @returns {Array} 型号数组
         */
        getSystemModelsForManufacturer(manufacturer) {
            const modelMap = {
                'LENOVO': ['21N5', '21N6', '21N7', '20U9', '20UA', '20UB', '20UC', '20UD'],
                'DELL': ['OptiPlex 7090', 'OptiPlex 5090', 'OptiPlex 3090', 'Inspiron 3881', 'XPS 8940'],
                'HP': ['EliteDesk 800 G8', 'ProDesk 400 G7', 'Pavilion Desktop TP01', 'OMEN 25L Desktop'],
                'ASUS': ['M32CD', 'M52BC', 'M70AD', 'K31CD', 'VivoPC VM65'],
                'Acer': ['TC-895', 'TC-885', 'TC-875', 'XC-895', 'Predator Orion 5000'],
                'MSI': ['Codex R', 'Trident 3', 'Aegis 3', 'Infinite A', 'Creator P100A']
            };
            return modelMap[manufacturer] || ['Desktop', 'Computer', 'PC'];
        },

        /**
         * 获取处理器信息 (systeminfo格式)
         * @returns {Array} 处理器信息数组
         */
        getProcessorInfoForSystemInfo() {
            return [
                'Intel64 Family 6 Model 183 Stepping 1 GenuineIntel ~2200 Mhz',
                'Intel64 Family 6 Model 165 Stepping 2 GenuineIntel ~2900 Mhz',
                'Intel64 Family 6 Model 165 Stepping 3 GenuineIntel ~3600 Mhz',
                'Intel64 Family 6 Model 158 Stepping 10 GenuineIntel ~3700 Mhz',
                'Intel64 Family 6 Model 158 Stepping 13 GenuineIntel ~3800 Mhz',
                'AMD64 Family 25 Model 33 Stepping 0 AuthenticAMD ~3600 Mhz',
                'AMD64 Family 25 Model 33 Stepping 2 AuthenticAMD ~3700 Mhz',
                'AMD64 Family 23 Model 113 Stepping 0 AuthenticAMD ~3600 Mhz',
                'AMD64 Family 23 Model 96 Stepping 1 AuthenticAMD ~3600 Mhz'
            ];
        },

        /**
         * 根据制造商获取BIOS版本
         * @param {string} manufacturer - 制造商
         * @returns {Array} BIOS版本数组
         */
        getBiosVersionsForManufacturer(manufacturer) {
            const biosMap = {
                'LENOVO': ['LENOVO W6DE39WW, 2025/4/4', 'LENOVO M1AKT59A, 2024/12/15', 'LENOVO N2HET82W, 2024/11/20'],
                'DELL': ['Dell Inc. 2.18.0, 2024/10/15', 'Dell Inc. 1.21.0, 2024/8/20', 'Dell Inc. 2.15.0, 2024/6/10'],
                'HP': ['HP F.49, 2024/9/25', 'HP F.47, 2024/7/18', 'HP F.45, 2024/5/12'],
                'ASUS': ['ASUS 3602, 2024/11/8', 'ASUS 3501, 2024/9/15', 'ASUS 3401, 2024/7/22'],
                'Acer': ['Acer V1.09, 2024/10/30', 'Acer V1.07, 2024/8/14', 'Acer V1.05, 2024/6/5'],
                'MSI': ['MSI 7C95v1C, 2024/12/1', 'MSI 7C95v1B, 2024/10/10', 'MSI 7C95v1A, 2024/8/8']
            };
            return biosMap[manufacturer] || ['American Megatrends Inc. 5.19, 2024/9/1', 'Phoenix Technologies Ltd. 6.00, 2024/8/15'];
        },

        /**
         * 生成随机主机名
         * @returns {string} 主机名
         */
        generateRandomHostName() {
            const prefixes = ['DESKTOP', 'PC', 'WORKSTATION', 'COMPUTER', 'WIN'];
            const suffixes = Array.from({length: 6}, () =>
                '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 36)]
            ).join('');
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            return `${prefix}-${suffixes}`;
        },

        /**
         * 生成随机安装日期
         * @returns {string} 安装日期
         */
        generateRandomInstallDate() {
            const year = 2023 + Math.floor(Math.random() * 2); // 2023-2024
            const month = 1 + Math.floor(Math.random() * 12);
            const day = 1 + Math.floor(Math.random() * 28);
            const hour = Math.floor(Math.random() * 24);
            const minute = Math.floor(Math.random() * 60);
            const second = Math.floor(Math.random() * 60);

            return `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}, ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
        },

        /**
         * 生成随机启动时间
         * @returns {string} 启动时间
         */
        generateRandomBootTime() {
            const now = new Date();
            const bootTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // 最近7天内
            const year = bootTime.getFullYear();
            const month = bootTime.getMonth() + 1;
            const day = bootTime.getDate();
            const hour = bootTime.getHours();
            const minute = bootTime.getMinutes();
            const second = bootTime.getSeconds();

            return `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}, ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
        },

        /**
         * 格式化systeminfo输出
         * @param {Object} data - 系统信息数据
         * @returns {string} 格式化的systeminfo输出
         */
        formatSystemInfoOutput(data) {
            const virtualMemoryMax = Math.floor(data.memory.total * 1.1);
            const virtualMemoryAvailable = Math.floor(data.memory.available * 1.1);
            const virtualMemoryInUse = virtualMemoryMax - virtualMemoryAvailable;

            // 生成网卡信息
            const networkCards = this.generateNetworkCardsInfo();

            // 生成热修复信息
            const hotfixes = this.generateHotfixesInfo();

            return `
Host Name:                     ${data.hostName}
OS Name:                       ${data.osName}
OS Version:                    ${data.osVersion}
OS Manufacturer:               Microsoft Corporation
OS Configuration:              Standalone Workstation
OS Build Type:                 Multiprocessor Free
Registered Owner:              ${data.hostName}@${data.hostName.toLowerCase()}.com
Registered Organization:       N/A
Product ID:                    ${data.productId}
Original Install Date:         ${data.installDate}
System Boot Time:              ${data.bootTime}
System Manufacturer:           ${data.manufacturer}
System Model:                  ${data.model}
System Type:                   x64-based PC
Processor(s):                  1 Processor(s) Installed.
                               [01]: ${data.processor}
BIOS Version:                  ${data.biosVersion}
Windows Directory:             C:\\WINDOWS
System Directory:              C:\\WINDOWS\\system32
Boot Device:                   \\Device\\HarddiskVolume1
System Locale:                 en-us;English (United States)
Input Locale:                  en-us;English (United States)
Time Zone:                     (UTC-08:00) Pacific Time (US & Canada)
Total Physical Memory:         ${data.memory.total.toLocaleString()} MB
Available Physical Memory:     ${data.memory.available.toLocaleString()} MB
Virtual Memory: Max Size:      ${virtualMemoryMax.toLocaleString()} MB
Virtual Memory: Available:     ${virtualMemoryAvailable.toLocaleString()} MB
Virtual Memory: In Use:        ${virtualMemoryInUse.toLocaleString()} MB
Page File Location(s):         C:\\pagefile.sys
Domain:                        WORKGROUP
Logon Server:                  \\\\${data.hostName}
${hotfixes}
${networkCards}
Virtualization-based security: Status: Not enabled
                               App Control for Business policy: Audit
                               App Control for Business user mode policy: Off
                               Security Features Enabled:
Hyper-V Requirements:          VM Monitor Mode Extensions: Yes
                               Virtualization Enabled In Firmware: Yes
                               Second Level Address Translation: Yes
                               Data Execution Prevention Available: Yes
`.trim();
        },

        /**
         * 生成网卡信息
         * @returns {string} 网卡信息
         */
        generateNetworkCardsInfo() {
            const networkConfigs = [
                {
                    count: 3,
                    cards: [
                        {
                            name: 'Intel(R) Wi-Fi 6E AX211 160MHz',
                            connection: 'Internet',
                            dhcp: true,
                            dhcpServer: '192.168.1.1',
                            ips: ['192.168.1.100', 'fe80::1234:5678:9abc:def0']
                        },
                        {
                            name: 'Realtek PCIe GbE Family Controller',
                            connection: 'Ethernet',
                            dhcp: false,
                            ips: ['192.168.0.100', 'fe80::abcd:ef12:3456:7890']
                        },
                        {
                            name: 'Bluetooth Device (Personal Area Network)',
                            connection: 'Bluetooth Network Connection',
                            status: 'Media disconnected'
                        }
                    ]
                },
                {
                    count: 4,
                    cards: [
                        {
                            name: 'Intel(R) Ethernet Connection I219-V',
                            connection: 'Ethernet',
                            dhcp: true,
                            dhcpServer: '10.0.0.1',
                            ips: ['10.0.0.50', 'fe80::2468:ace0:1357:9bdf']
                        },
                        {
                            name: 'Intel(R) Wi-Fi 6 AX200 160MHz',
                            connection: 'Wi-Fi',
                            dhcp: true,
                            dhcpServer: '192.168.1.1',
                            ips: ['192.168.1.150', 'fe80::9876:5432:10ab:cdef']
                        },
                        {
                            name: 'VMware Virtual Ethernet Adapter for VMnet1',
                            connection: 'VMware Network Adapter VMnet1',
                            dhcp: false,
                            ips: ['192.168.192.1', 'fe80::3b21:3ecb:808e:67b8']
                        },
                        {
                            name: 'Bluetooth Device (Personal Area Network)',
                            connection: 'Bluetooth Network Connection',
                            status: 'Media disconnected'
                        }
                    ]
                }
            ];

            const config = networkConfigs[Math.floor(Math.random() * networkConfigs.length)];
            let output = `Network Card(s):               ${config.count} NIC(s) Installed.\n`;

            config.cards.forEach((card, index) => {
                const cardNum = (index + 1).toString().padStart(2, '0');
                output += `                               [${cardNum}]: ${card.name}\n`;
                output += `                                     Connection Name: ${card.connection}\n`;

                if (card.status) {
                    output += `                                     Status:          ${card.status}\n`;
                } else {
                    if (card.dhcp !== undefined) {
                        output += `                                     DHCP Enabled:    ${card.dhcp ? 'Yes' : 'No'}\n`;
                    }
                    if (card.dhcpServer) {
                        output += `                                     DHCP Server:     ${card.dhcpServer}\n`;
                    }
                    if (card.ips && card.ips.length > 0) {
                        output += `                                     IP address(es)\n`;
                        card.ips.forEach((ip, ipIndex) => {
                            const ipNum = (ipIndex + 1).toString().padStart(2, '0');
                            output += `                                     [${ipNum}]: ${ip}\n`;
                        });
                    }
                }
            });

            return output.trim();
        },

        /**
         * 生成热修复信息
         * @returns {string} 热修复信息
         */
        generateHotfixesInfo() {
            const hotfixSets = [
                ['KB5056579', 'KB5062660', 'KB5063666', 'KB5064485'],
                ['KB5055999', 'KB5061001', 'KB5062562', 'KB5063228'],
                ['KB5057144', 'KB5060414', 'KB5061566', 'KB5063950'],
                ['KB5058204', 'KB5061317', 'KB5062746', 'KB5064718']
            ];

            const hotfixes = hotfixSets[Math.floor(Math.random() * hotfixSets.length)];
            let output = `Hotfix(s):                     ${hotfixes.length} Hotfix(s) Installed.\n`;

            hotfixes.forEach((hotfix, index) => {
                const hotfixNum = (index + 1).toString().padStart(2, '0');
                output += `                               [${hotfixNum}]: ${hotfix}\n`;
            });

            return output.trim();
        }
    };

    // ==================== 7.7. VSCode拦截器 ====================

    /**
     * VSCode拦截器
     * 拦截VSCode模块，伪造版本、sessionId、machineId等信息
     */
    const VSCodeInterceptor = {
        /**
         * 初始化VSCode拦截
         */
        initialize() {
            if (!INTERCEPTOR_CONFIG.dataProtection.enableVSCodeInterception) {
                return;
            }

            log('🎭 初始化VSCode拦截...');

            this.setupVersionConfig();
            this.interceptVSCodeModule();

            log('✅ VSCode拦截设置完成');
        },

        /**
         * 设置VSCode版本配置
         */
        setupVersionConfig() {
            // 设置全局VSCode版本配置
            const globalObj = (typeof global !== 'undefined') ? global :
                             (typeof window !== 'undefined') ? window : this;

            globalObj._augmentVSCodeVersionConfig = {
                availableVersions: [...INTERCEPTOR_CONFIG.vscode.versions],
                fixedVersion: null,

                getRandomVersion() {
                    return this.availableVersions[Math.floor(Math.random() * this.availableVersions.length)];
                },

                setFixedVersion(version) {
                    if (this.availableVersions.includes(version)) {
                        this.fixedVersion = version;
                        log(`🎭 已设置固定VSCode版本: ${version}`);
                        return true;
                    } else {
                        log(`❌ 无效的VSCode版本: ${version}`, 'error');
                        return false;
                    }
                },

                clearFixedVersion() {
                    this.fixedVersion = null;
                    log('🎲 已恢复随机VSCode版本模式');
                },

                getCurrentVersion() {
                    return this.fixedVersion || this.getRandomVersion();
                },

                addVersion(version) {
                    if (!this.availableVersions.includes(version)) {
                        this.availableVersions.push(version);
                        log(`✅ 已添加新VSCode版本: ${version}`);
                        return true;
                    }
                    return false;
                },

                getStatus() {
                    return {
                        totalVersions: this.availableVersions.length,
                        fixedVersion: this.fixedVersion,
                        currentVersion: this.getCurrentVersion(),
                        availableVersions: [...this.availableVersions]
                    };
                }
            };

            // 为当前会话设置固定版本
            const sessionVersion = globalObj._augmentVSCodeVersionConfig.getRandomVersion();
            globalObj._augmentVSCodeVersionConfig.setFixedVersion(sessionVersion);
            log(`🔒 已为当前会话设置固定VSCode版本: ${sessionVersion}`);
        },

        /**
         * 拦截VSCode模块
         */
        interceptVSCodeModule() {
            if (typeof require !== 'undefined') {
                const originalRequire = require;

                require = function(moduleName) {
                    if (moduleName === 'vscode') {
                        try {
                            const vscodeModule = originalRequire.apply(this, arguments);

                            if (vscodeModule && typeof vscodeModule === 'object') {
                                logOnce('🎭 创建VSCode版本拦截代理...', 'vscode-module-intercept');
                                return VSCodeInterceptor.createVSCodeProxy(vscodeModule);
                            }

                            return vscodeModule;
                        } catch (e) {
                            log('提供VSCode模拟对象（带版本伪造）');
                            return VSCodeInterceptor.createMockVSCode();
                        }
                    }

                    return originalRequire.apply(this, arguments);
                };

                // 保留原始require的属性
                Object.setPrototypeOf(require, originalRequire);
                Object.getOwnPropertyNames(originalRequire).forEach(prop => {
                    if (prop !== 'length' && prop !== 'name') {
                        require[prop] = originalRequire[prop];
                    }
                });
            }
        },

        /**
         * 创建VSCode代理对象
         * @param {Object} vscodeModule - 原始VSCode模块
         * @returns {Proxy} VSCode代理对象
         */
        createVSCodeProxy(vscodeModule) {
            const globalObj = (typeof global !== 'undefined') ? global :
                             (typeof window !== 'undefined') ? window : this;

            const randomVSCodeVersion = globalObj._augmentVSCodeVersionConfig ?
                globalObj._augmentVSCodeVersionConfig.getCurrentVersion() :
                '1.96.0';

            return new Proxy(vscodeModule, {
                get: function(target, prop, receiver) {
                    // 拦截version属性
                    if (prop === 'version') {
                        const originalVersion = target[prop];
                        log(`🎭 拦截VSCode版本访问: ${originalVersion} → ${randomVSCodeVersion}`);
                        return randomVSCodeVersion;
                    }

                    // 拦截env对象
                    if (prop === 'env') {
                        const originalEnv = target[prop];
                        if (originalEnv && typeof originalEnv === 'object') {
                            return VSCodeInterceptor.createEnvProxy(originalEnv);
                        }
                        return originalEnv;
                    }

                    return Reflect.get(target, prop, receiver);
                }
            });
        },

        /**
         * 创建env对象代理
         * @param {Object} originalEnv - 原始env对象
         * @returns {Proxy} env代理对象
         */
        createEnvProxy(originalEnv) {
            return new Proxy(originalEnv, {
                get: function(envTarget, envProp, envReceiver) {
                    if (envProp === 'uriScheme') {
                        INTERCEPTOR_CONFIG.vscodeEnvAccessCount.uriScheme++;
                        const originalValue = Reflect.get(envTarget, envProp, envReceiver);
                        const fakeValue = 'vscode';

                        if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.uriScheme === 1) {
                            logOnce('🎭 拦截VSCode URI方案访问', 'vscode-uri-scheme-intercept');
                            logOnce(`📋 原始值: ${originalValue} → 伪造值: ${fakeValue}`, 'vscode-uri-scheme-values');
                        } else if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.uriScheme % 10 === 0) {
                            log(`🎭 拦截VSCode URI方案访问 (第${INTERCEPTOR_CONFIG.vscodeEnvAccessCount.uriScheme}次)`);
                        }
                        return fakeValue;
                    }

                    if (envProp === 'sessionId') {
                        INTERCEPTOR_CONFIG.vscodeEnvAccessCount.sessionId++;
                        const originalValue = Reflect.get(envTarget, envProp, envReceiver);
                        const fakeValue = SessionManager.getMainSessionId();

                        if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.sessionId === 1) {
                            logOnce('🎭 拦截VSCode会话ID访问', 'vscode-session-id-intercept');
                            logOnce(`📋 原始sessionId: ${originalValue}`, 'vscode-session-id-original');
                            logOnce(`📋 伪造sessionId: ${fakeValue}`, 'vscode-session-id-fake');
                            log('✅ 成功替换会话ID');
                        } else if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.sessionId % 10 === 0) {
                            log(`🎭 拦截VSCode会话ID访问 (第${INTERCEPTOR_CONFIG.vscodeEnvAccessCount.sessionId}次)`);
                        }
                        return fakeValue;
                    }

                    if (envProp === 'machineId') {
                        INTERCEPTOR_CONFIG.vscodeEnvAccessCount.machineId++;
                        const originalValue = Reflect.get(envTarget, envProp, envReceiver);
                        const fakeValue = INTERCEPTOR_CONFIG.system.machineId;

                        if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.machineId === 1) {
                            logOnce('🎭 拦截VSCode机器ID访问', 'vscode-machine-id-intercept');
                            logOnce(`📋 原始machineId: ${originalValue}`, 'vscode-machine-id-original');
                            logOnce(`📋 伪造machineId: ${fakeValue}`, 'vscode-machine-id-fake');
                            log('✅ 成功替换机器ID');
                        } else if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.machineId % 10 === 0) {
                            log(`🎭 拦截VSCode机器ID访问 (第${INTERCEPTOR_CONFIG.vscodeEnvAccessCount.machineId}次)`);
                        }
                        return fakeValue;
                    }

                    // 强制禁用遥测功能
                    if (envProp === 'isTelemetryEnabled') {
                        INTERCEPTOR_CONFIG.vscodeEnvAccessCount.isTelemetryEnabled++;
                        const originalValue = Reflect.get(envTarget, envProp, envReceiver);

                        if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.isTelemetryEnabled === 1) {
                            logOnce('🎭 拦截VSCode遥测状态访问', 'vscode-telemetry-intercept');
                            logOnce(`📋 原始isTelemetryEnabled: ${originalValue}`, 'vscode-telemetry-original');
                            logOnce('📋 强制设置isTelemetryEnabled: false', 'vscode-telemetry-fake');
                            log('✅ 成功禁用遥测功能');
                        } else if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.isTelemetryEnabled % 10 === 0) {
                            log(`🎭 拦截VSCode遥测状态访问 (第${INTERCEPTOR_CONFIG.vscodeEnvAccessCount.isTelemetryEnabled}次)`);
                        }
                        return false;
                    }

                    // 统一语言环境
                    if (envProp === 'language') {
                        INTERCEPTOR_CONFIG.vscodeEnvAccessCount.language++;
                        const originalValue = Reflect.get(envTarget, envProp, envReceiver);

                        if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.language === 1) {
                            logOnce('🎭 拦截VSCode语言环境访问', 'vscode-language-intercept');
                            logOnce(`📋 原始language: ${originalValue}`, 'vscode-language-original');
                            logOnce('📋 强制设置language: en-US', 'vscode-language-fake');
                            log('✅ 成功统一语言环境');
                        } else if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.language % 10 === 0) {
                            log(`🎭 拦截VSCode语言环境访问 (第${INTERCEPTOR_CONFIG.vscodeEnvAccessCount.language}次)`);
                        }
                        return 'en-US';
                    }

                    // 打印其他环境变量访问（用于调试）
                    const value = Reflect.get(envTarget, envProp, envReceiver);
                    if (typeof envProp === 'string' && !envProp.startsWith('_')) {
                        INTERCEPTOR_CONFIG.vscodeEnvAccessCount.other++;
                        if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.other === 1) {
                            log(`📊 VSCode env访问: ${envProp} = ${value}`);
                        } else if (INTERCEPTOR_CONFIG.vscodeEnvAccessCount.other % 5 === 0) {
                            log(`📊 VSCode env访问: ${envProp} = ${value} (第${INTERCEPTOR_CONFIG.vscodeEnvAccessCount.other}次其他访问)`);
                        }
                    }
                    return value;
                }
            });
        },

        /**
         * 创建模拟VSCode对象
         * @returns {Object} 模拟的VSCode对象
         */
        createMockVSCode() {
            const globalObj = (typeof global !== 'undefined') ? global :
                             (typeof window !== 'undefined') ? window : this;

            const randomVSCodeVersion = globalObj._augmentVSCodeVersionConfig ?
                globalObj._augmentVSCodeVersionConfig.getCurrentVersion() :
                '1.96.0';

            return {
                version: randomVSCodeVersion,
                commands: { registerCommand: () => ({}) },
                window: {
                    showInformationMessage: () => Promise.resolve(),
                    showErrorMessage: () => Promise.resolve(),
                    createOutputChannel: () => ({
                        appendLine: () => {},
                        show: () => {},
                        dispose: () => {}
                    })
                },
                workspace: {
                    getConfiguration: () => ({
                        get: () => undefined,
                        has: () => false,
                        inspect: () => undefined,
                        update: () => Promise.resolve()
                    })
                },
                authentication: {
                    getSession: () => Promise.resolve(null),
                    onDidChangeSessions: { dispose: () => {} }
                },
                env: new Proxy({
                    uriScheme: 'vscode',
                    sessionId: SessionManager.getMainSessionId(),
                    machineId: INTERCEPTOR_CONFIG.system.machineId,
                    isTelemetryEnabled: false,
                    language: 'en-US'
                }, {
                    get: function(target, prop, receiver) {
                        const value = Reflect.get(target, prop, receiver);
                        if (prop === 'sessionId') {
                            log('🎭 模拟VSCode对象 - 访问sessionId');
                            log(`📋 返回伪造sessionId: ${value}`);
                        } else if (prop === 'machineId') {
                            log('🎭 模拟VSCode对象 - 访问machineId');
                            log(`📋 返回伪造machineId: ${value}`);
                        } else if (prop === 'uriScheme') {
                            log('🎭 模拟VSCode对象 - 访问uriScheme');
                            log(`📋 返回伪造uriScheme: ${value}`);
                        } else if (prop === 'isTelemetryEnabled') {
                            log('🎭 模拟VSCode对象 - 访问isTelemetryEnabled');
                            log('📋 强制返回isTelemetryEnabled: false');
                        } else if (prop === 'language') {
                            log('🎭 模拟VSCode对象 - 访问language');
                            log('📋 强制返回language: en-US');
                        } else if (typeof prop === 'string' && !prop.startsWith('_')) {
                            log(`📊 模拟VSCode对象 - env访问: ${prop} = ${value}`);
                        }
                        return value;
                    }
                })
            };
        }
    };

    // ==================== 7.7. URL分类缓存机制 ====================

    /**
     * URL分类缓存器
     * 缓存URL分类结果，提高性能
     */
    const URLClassificationCache = {
        // 缓存存储
        cache: new Map(),

        // 缓存统计
        stats: {
            hits: 0,
            misses: 0,
            totalRequests: 0
        },

        // 缓存大小限制
        maxCacheSize: 1000,

        /**
         * 获取缓存的分类结果
         * @param {string} url - URL
         * @param {string} data - 请求数据
         * @returns {Object|null} 缓存的分类结果或null
         */
        get(url, data = '') {
            this.stats.totalRequests++;

            // 生成缓存键（URL + 数据摘要）
            const cacheKey = this.generateCacheKey(url, data);

            if (this.cache.has(cacheKey)) {
                this.stats.hits++;
                const cached = this.cache.get(cacheKey);
                log(`💾 缓存命中: ${url} -> ${cached.shouldIntercept ? '拦截' : '放行'}`);
                return cached;
            }

            this.stats.misses++;
            return null;
        },

        /**
         * 设置缓存
         * @param {string} url - URL
         * @param {string} data - 请求数据
         * @param {Object} result - 分类结果
         */
        set(url, data = '', result) {
            const cacheKey = this.generateCacheKey(url, data);

            // 如果缓存已满，删除最旧的条目
            if (this.cache.size >= this.maxCacheSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
                log(`🗑️ 缓存已满，删除最旧条目: ${firstKey}`);
            }

            this.cache.set(cacheKey, {
                ...result,
                timestamp: Date.now(),
                url: url
            });

            log(`💾 缓存设置: ${url} -> ${result.shouldIntercept ? '拦截' : '放行'}`);
        },

        /**
         * 生成缓存键
         * @param {string} url - URL
         * @param {string} data - 请求数据
         * @returns {string} 缓存键
         */
        generateCacheKey(url, data = '') {
            // 对于有数据的请求，生成数据摘要
            let dataHash = '';
            if (data && typeof data === 'string' && data.length > 0) {
                // 简单哈希算法
                let hash = 0;
                for (let i = 0; i < Math.min(data.length, 100); i++) {
                    const char = data.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // 转换为32位整数
                }
                dataHash = `_${hash}`;
            }

            return `${url}${dataHash}`;
        },

        /**
         * 清空缓存
         */
        clear() {
            this.cache.clear();
            this.stats = { hits: 0, misses: 0, totalRequests: 0 };
            log('🗑️ URL分类缓存已清空');
        },

        /**
         * 获取缓存统计
         * @returns {Object} 缓存统计信息
         */
        getStats() {
            const hitRate = this.stats.totalRequests > 0 ?
                (this.stats.hits / this.stats.totalRequests * 100).toFixed(2) : 0;

            return {
                ...this.stats,
                hitRate: `${hitRate}%`,
                cacheSize: this.cache.size,
                maxCacheSize: this.maxCacheSize
            };
        },

        /**
         * 打印缓存统计
         */
        printStats() {
            const stats = this.getStats();
            console.log('\n📊 URL分类缓存统计:');
            console.log(`  总请求数: ${stats.totalRequests}`);
            console.log(`  缓存命中: ${stats.hits}`);
            console.log(`  缓存未命中: ${stats.misses}`);
            console.log(`  命中率: ${stats.hitRate}`);
            console.log(`  当前缓存大小: ${stats.cacheSize}/${stats.maxCacheSize}`);
        }
    };

    // ==================== 8. 网络拦截模块（v2.5优化版） ====================

    const NetworkInterceptor = {
        /**
         * 记录所有请求的详细信息（包括拦截和放行的）
         * @param {string} url - 请求URL
         * @param {string} method - 请求方法
         * @param {any} body - 请求体
         * @param {Object} options - 请求选项
         * @param {string} action - 动作类型：'INTERCEPTED'（拦截）或 'ALLOWED'（放行）
         * @param {string} reason - 拦截或放行的原因
         * @param {any} response - 响应数据（可选）
         */
        logRequestDetails(url, method = 'GET', body = null, options = {}, action = 'UNKNOWN', reason = '', response = null) {
            if (!INTERCEPTOR_CONFIG.network.logAllRequests) return;

            const timestamp = new Date().toISOString();
            const limit = INTERCEPTOR_CONFIG.network.requestLogLimit;

            // 根据动作类型选择不同的图标和颜色
            let actionIcon = '';
            let actionColor = '';
            switch (action) {
                case 'INTERCEPTED':
                    actionIcon = '🚫';
                    actionColor = '拦截';
                    break;
                case 'ALLOWED':
                    actionIcon = '✅';
                    actionColor = '放行';
                    break;
                case 'PROTECTED':
                    actionIcon = '🛡️';
                    actionColor = '保护';
                    break;
                default:
                    actionIcon = '❓';
                    actionColor = '未知';
            }

            // 构建完整的原始请求包信息
            let requestPackage = `\n=== ${actionIcon} 网络请求${actionColor} ===\n`;
            requestPackage += `时间: ${timestamp}\n`;
            requestPackage += `原因: ${reason}\n`;
            requestPackage += `方法: ${method}\n`;
            requestPackage += `URL: ${url}\n`;

            // 添加Headers信息
            if (options.headers) {
                requestPackage += `\n--- 请求头 ---\n`;
                if (typeof options.headers === 'object') {
                    if (options.headers instanceof Headers) {
                        // 处理Headers对象
                        for (const [key, value] of options.headers.entries()) {
                            requestPackage += `${key}: ${value}\n`;
                        }
                    } else {
                        // 处理普通对象
                        for (const [key, value] of Object.entries(options.headers)) {
                            requestPackage += `${key}: ${value}\n`;
                        }
                    }
                } else {
                    requestPackage += `Headers: [Headers对象存在但无法解析]\n`;
                }
            }

            // 添加请求体信息
            if (body) {
                requestPackage += `\n--- 请求体 ---\n`;
                let bodyString = '';
                if (typeof body === 'string') {
                    bodyString = body;
                } else if (body instanceof FormData) {
                    bodyString = '[FormData - 无法显示内容]';
                    // 尝试获取FormData的键
                    try {
                        const keys = Array.from(body.keys());
                        if (keys.length > 0) {
                            bodyString += `\nFormData键: ${keys.join(', ')}`;
                        }
                    } catch (e) {
                        bodyString += '\n[无法获取FormData键]';
                    }
                } else if (body instanceof URLSearchParams) {
                    bodyString = body.toString();
                } else if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
                    bodyString = `[二进制数据 - 大小: ${body.byteLength || body.length} 字节]`;
                } else {
                    try {
                        bodyString = JSON.stringify(body, null, 2);
                    } catch (e) {
                        bodyString = `[复杂对象 - 无法序列化: ${e.message}]`;
                    }
                }
                requestPackage += bodyString;
            } else {
                requestPackage += `\n--- 请求体 ---\n[无请求体]`;
            }

            // 添加响应包信息
            if (response) {
                requestPackage += `\n--- 响应信息 ---\n`;
                try {
                    if (typeof response === 'object') {
                        // 处理Response对象
                        if (response.status !== undefined) {
                            requestPackage += `状态码: ${response.status}\n`;
                        }
                        if (response.statusText !== undefined) {
                            requestPackage += `状态文本: ${response.statusText}\n`;
                        }
                        if (response.ok !== undefined) {
                            requestPackage += `请求成功: ${response.ok}\n`;
                        }

                        // 处理响应头
                        if (response.headers) {
                            requestPackage += `\n--- 响应头 ---\n`;
                            if (response.headers instanceof Headers) {
                                for (const [key, value] of response.headers.entries()) {
                                    requestPackage += `${key}: ${value}\n`;
                                }
                            } else if (typeof response.headers === 'object') {
                                for (const [key, value] of Object.entries(response.headers)) {
                                    requestPackage += `${key}: ${value}\n`;
                                }
                            }
                        }

                        // 处理响应体（如果可用）
                        if (response._responseText || response.responseText) {
                            const responseText = response._responseText || response.responseText;
                            requestPackage += `\n--- 响应体 ---\n${responseText}\n`;
                        } else if (response._jsonData) {
                            requestPackage += `\n--- 响应体 (JSON) ---\n${JSON.stringify(response._jsonData, null, 2)}\n`;
                        }
                    } else if (typeof response === 'string') {
                        requestPackage += `响应内容: ${response}\n`;
                    } else {
                        requestPackage += `响应类型: ${typeof response}\n`;
                        requestPackage += `响应内容: ${String(response).substring(0, 200)}${String(response).length > 200 ? '...' : ''}\n`;
                    }
                } catch (e) {
                    requestPackage += `[响应解析失败: ${e.message}]\n`;
                }
            } else {
                requestPackage += `\n--- 响应信息 ---\n[无响应数据或响应未记录]`;
            }

            requestPackage += `\n=== 请求${actionColor}结束 ===\n`;

            // 截取整个请求包的前指定字符数
            const truncatedPackage = requestPackage.length > limit ?
                requestPackage.substring(0, limit) + '\n...[请求包过长，已截断]' : requestPackage;

            // 输出详细的请求日志
            console.log(truncatedPackage);
        },

        /**
         * 记录被放行的请求（调试功能）
         * 兼容旧版本，内部调用新的logRequestDetails方法
         */
        logAllowedRequest(url, method = 'GET', body = null, options = {}) {
            if (!INTERCEPTOR_CONFIG.network.logAllowedRequests) return;
            this.logRequestDetails(url, method, body, options, 'ALLOWED', '通过白名单检查');
        },

        /**
         * 初始化所有网络拦截
         */
        initializeAll() {
            if (INTERCEPTOR_CONFIG.network.enableHttpInterception) {
                this.interceptHttp();
            }
            if (INTERCEPTOR_CONFIG.network.enableFetchInterception) {
                this.interceptFetchDecrypted();
                log('✅ 已启用Fetch拦截');
            }
            if (INTERCEPTOR_CONFIG.network.enableXhrInterception) {
                this.interceptXHRDecrypted();
                log('✅ 已启用XMLHttpRequest拦截');
            }

            // Axios拦截支持 (默认启用，与其他网络拦截保持一致)
            if (INTERCEPTOR_CONFIG.network.enableHttpInterception ||
                INTERCEPTOR_CONFIG.network.enableFetchInterception ||
                INTERCEPTOR_CONFIG.network.enableXhrInterception) {
                // 当任何网络拦截启用时，同时启用Axios拦截
                this.interceptAxios();
                log('✅ 已启用Axios拦截');
            }

            log('🌐 网络拦截模块初始化完成');
        },

        /**
         * v2.5改进：更智能的Fetch拦截
         * 注意：此方法已被 interceptFetchDecrypted() 替代
         */
        interceptFetch() {
            /*
             * 原实现使用构造函数重写方式，新实现使用更轻量的原型链重写方式
             */
            /*
            if (typeof global !== 'undefined' && global.fetch) {
                const originalFetch = global.fetch;

                global.fetch = function(url, options = {}) {
                    const urlString = url.toString();
                    const method = options.method || 'GET';

                    // 使用智能数据分类并记录详细日志
                    if (SmartDataClassifier.shouldInterceptUpload(options.body || '', urlString)) {
                        // 创建模拟响应
                        const mockResponse = NetworkInterceptor.createMockFetchResponse();

                        // 记录被拦截的请求详情（包含响应）
                        NetworkInterceptor.logRequestDetails(
                            urlString, method, options.body, options,
                            'INTERCEPTED', '智能拦截 - 识别为遥测数据', mockResponse
                        );
                        log(`🚫 智能拦截Fetch请求: ${urlString}`);
                        return Promise.resolve(mockResponse);
                    }

                    // 专门拦截 Segment.io 数据收集端点
                    if (urlString.includes('segment.io') ||
                        urlString.includes('api.segment.io') ||
                        urlString.includes('/v1/batch') ||
                        urlString.includes('/v1/track')) {

                        const segmentResponse = {
                            ok: true,
                            status: 200,
                            statusText: 'OK',
                            headers: new Map([['content-type', 'application/json']]),
                            json: () => Promise.resolve({ success: true, batch: { sent: true } }),
                            text: () => Promise.resolve('{"success": true, "batch": {"sent": true}}'),
                            _jsonData: { success: true, batch: { sent: true } }
                        };

                        // 记录Segment.io拦截详情（包含响应）
                        NetworkInterceptor.logRequestDetails(
                            urlString, method, options.body, options,
                            'INTERCEPTED', 'Segment.io数据收集拦截', segmentResponse
                        );
                        log(`🚫 阻止 Segment.io Fetch请求: ${urlString}`);
                        return Promise.resolve(segmentResponse);
                    }

                    // 检查URL是否需要拦截
                    if (shouldInterceptUrl(urlString, options.body || '')) {
                        // 创建模拟响应
                        const mockResponse = NetworkInterceptor.createMockFetchResponse();

                        // 记录URL模式拦截详情（包含响应）
                        NetworkInterceptor.logRequestDetails(
                            urlString, method, options.body, options,
                            'INTERCEPTED', 'URL模式匹配拦截', mockResponse
                        );
                        log(`🚫 拦截Fetch请求: ${urlString}`);
                        return Promise.resolve(mockResponse);
                    }

                    // 会话ID替换
                    if (options.headers) {
                        SessionManager.replaceSessionIds(options.headers);
                    }

                    // 记录被放行的请求详情（包含实际响应）
                    let allowReason = '通过所有拦截检查';
                    if (SmartDataClassifier.isEssentialEndpoint(urlString)) {
                        allowReason = '必要端点保护';
                    } else if (SmartDataClassifier.isCodeIndexingRelated('', urlString)) {
                        allowReason = '代码索引功能';
                    }

                    // 先记录请求信息
                    NetworkInterceptor.logRequestDetails(
                        urlString, method, options.body, options,
                        'ALLOWED', allowReason
                    );

                    // 执行原始请求并记录响应
                    const fetchPromise = originalFetch.apply(this, arguments);

                    // 如果启用了响应日志记录，拦截响应
                    if (INTERCEPTOR_CONFIG.network.logAllRequests) {
                        return fetchPromise.then(response => {
                            // 克隆响应以避免消费原始响应
                            const responseClone = response.clone();

                            // 尝试读取响应文本（异步）
                            responseClone.text().then(responseText => {
                                const responseWithText = {
                                    ok: response.ok,
                                    status: response.status,
                                    statusText: response.statusText,
                                    headers: response.headers,
                                    _responseText: responseText
                                };

                                // 记录包含响应的完整日志
                                NetworkInterceptor.logRequestDetails(
                                    urlString, method, options.body, options,
                                    'ALLOWED', `${allowReason} - 响应已记录`, responseWithText
                                );
                            }).catch(err => {
                                log(`⚠️ 读取响应文本失败: ${err.message}`, 'warn');
                            });

                            return response;
                        }).catch(error => {
                            // 记录请求错误
                            NetworkInterceptor.logRequestDetails(
                                urlString, method, options.body, options,
                                'ALLOWED', `${allowReason} - 请求失败: ${error.message}`
                            );
                            throw error;
                        });
                    }

                    return fetchPromise;
                };

                log('✅ Fetch API拦截设置完成');
            }
            */
        },

        /**
         * v2.5改进：更智能的XHR拦截
         */
        interceptXHR() {
            /*
             * 原实现使用构造函数重写方式，新实现使用更轻量的原型链重写方式
             */
            /*
            if (typeof global !== 'undefined' && global.XMLHttpRequest) {
                const OriginalXHR = global.XMLHttpRequest;

                global.XMLHttpRequest = function() {
                    const xhr = new OriginalXHR();
                    const originalOpen = xhr.open;
                    const originalSend = xhr.send;

                    let interceptedUrl = '';
                    let interceptedMethod = '';

                    xhr.open = function(method, url, async, user, password) {
                        interceptedUrl = url;
                        interceptedMethod = method;

                        // 使用智能分类判断并记录详细日志
                        if (SmartDataClassifier.shouldInterceptUpload('', url)) {
                            NetworkInterceptor.logRequestDetails(
                                url, method, null, {},
                                'INTERCEPTED', '智能拦截 - XMLHttpRequest识别为遥测数据'
                            );
                            log(`🚫 智能拦截XMLHttpRequest: ${method} ${url}`);
                            NetworkInterceptor.createMockXHRResponse(xhr);
                            return;
                        }

                        // 专门拦截 Segment.io
                        if (url.includes('segment.io') || url.includes('/v1/batch')) {
                            NetworkInterceptor.logRequestDetails(
                                url, method, null, {},
                                'INTERCEPTED', 'Segment.io数据收集拦截 - XMLHttpRequest'
                            );
                            log(`🚫 阻止 Segment.io XMLHttpRequest: ${url}`);
                            NetworkInterceptor.createMockXHRResponse(xhr);
                            return;
                        }

                        if (shouldInterceptUrl(url)) {
                            NetworkInterceptor.logRequestDetails(
                                url, method, null, {},
                                'INTERCEPTED', 'URL模式匹配拦截 - XMLHttpRequest'
                            );
                            log(`🚫 拦截XMLHttpRequest: ${url}`);
                            NetworkInterceptor.createMockXHRResponse(xhr);
                            return;
                        }

                        // 记录被放行的请求详情（在open阶段）
                        let allowReason = '通过所有拦截检查 - XMLHttpRequest';
                        if (SmartDataClassifier.isEssentialEndpoint(url)) {
                            allowReason = '必要端点保护 - XMLHttpRequest';
                        } else if (SmartDataClassifier.isCodeIndexingRelated('', url)) {
                            allowReason = '代码索引功能 - XMLHttpRequest';
                        }

                        NetworkInterceptor.logRequestDetails(
                            url, method, null, {},
                            'ALLOWED', allowReason
                        );

                        return originalOpen.apply(this, arguments);
                    };

                    xhr.send = function(data) {
                        // 检查发送的数据并记录详细日志
                        if (data && SmartDataClassifier.shouldInterceptUpload(data, interceptedUrl)) {
                            NetworkInterceptor.logRequestDetails(
                                interceptedUrl, interceptedMethod, data, {},
                                'INTERCEPTED', '数据发送阶段拦截 - XMLHttpRequest请求体包含遥测数据'
                            );
                            log(`🚫 拦截XMLHttpRequest数据发送: ${interceptedUrl}`);
                            NetworkInterceptor.createMockXHRResponse(xhr);
                            return;
                        }

                        // 如果有请求体数据，记录完整的请求详情
                        if (data) {
                            let allowReason = '数据发送阶段通过检查 - XMLHttpRequest';
                            if (SmartDataClassifier.isEssentialEndpoint(interceptedUrl)) {
                                allowReason = '必要端点保护 - XMLHttpRequest数据发送';
                            } else if (SmartDataClassifier.isCodeIndexingRelated(data, interceptedUrl)) {
                                allowReason = '代码索引功能 - XMLHttpRequest数据发送';
                            }

                            NetworkInterceptor.logRequestDetails(
                                interceptedUrl, interceptedMethod, data, {},
                                'ALLOWED', allowReason
                            );
                        }

                        return originalSend.apply(this, arguments);
                    };

                    return xhr;
                };

                log('✅ XMLHttpRequest拦截设置完成');
            }
            */
        },

        /**
         * Fetch拦截实现
         * 使用更轻量的global.fetch重写方式，整合v2.5的智能分类和日志功能
         */
        interceptFetchDecrypted() {
            if (typeof global !== 'undefined' && global.fetch && !global._fetchIntercepted) {
                const originalFetch = global.fetch;

                global.fetch = function(url, options = {}) {
                    const urlString = url.toString();
                    const method = options.method || 'GET';

                    // 使用智能数据分类并记录详细日志
                    if (SmartDataClassifier.shouldInterceptUpload(options.body || '', urlString)) {
                        // 创建模拟响应
                        const mockResponse = {
                            ok: true,
                            status: 200,
                            statusText: "OK",
                            headers: new Headers({"content-type": "application/json"}),
                            json: () => Promise.resolve({}),
                            text: () => Promise.resolve("{}"),
                            blob: () => Promise.resolve(new Blob(["{}"], {type: "application/json"})),
                            arrayBuffer: () => Promise.resolve(new ArrayBuffer(2)),
                            clone: function() { return this; }
                        };

                        // 记录被拦截的请求详情（包含响应）
                        NetworkInterceptor.logRequestDetails(
                            urlString, method, options.body, options,
                            'INTERCEPTED', '智能拦截 - 识别为遥测数据', mockResponse
                        );
                        log(`🚫 智能拦截Fetch请求: ${urlString}`);
                        return Promise.resolve(mockResponse);
                    }

                    // 专门拦截 Segment.io 数据收集端点
                    if (urlString.includes('segment.io') ||
                        urlString.includes('api.segment.io') ||
                        urlString.includes('/v1/batch') ||
                        urlString.includes('/v1/track')) {

                        const segmentResponse = {
                            ok: true,
                            status: 200,
                            statusText: 'OK',
                            headers: new Headers([['content-type', 'application/json']]),
                            json: () => Promise.resolve({ success: true, batch: { sent: true } }),
                            text: () => Promise.resolve('{"success": true, "batch": {"sent": true}}'),
                            blob: () => Promise.resolve(new Blob(['{"success": true, "batch": {"sent": true}}'], {type: "application/json"})),
                            arrayBuffer: () => Promise.resolve(new ArrayBuffer(2)),
                            clone: function() { return this; }
                        };

                        // 记录Segment.io拦截详情（包含响应）
                        NetworkInterceptor.logRequestDetails(
                            urlString, method, options.body, options,
                            'INTERCEPTED', 'Segment.io数据收集拦截', segmentResponse
                        );
                        log(`🚫 阻止 Segment.io Fetch请求: ${urlString}`);
                        return Promise.resolve(segmentResponse);
                    }

                    // 检查URL是否需要拦截
                    if (shouldInterceptUrl(urlString, options.body || '')) {
                        // 创建模拟响应
                        const mockResponse = {
                            ok: true,
                            status: 200,
                            statusText: "OK",
                            headers: new Headers({"content-type": "application/json"}),
                            json: () => Promise.resolve({}),
                            text: () => Promise.resolve("{}"),
                            blob: () => Promise.resolve(new Blob(["{}"], {type: "application/json"})),
                            arrayBuffer: () => Promise.resolve(new ArrayBuffer(2)),
                            clone: function() { return this; }
                        };

                        // 记录URL模式拦截详情（包含响应）
                        NetworkInterceptor.logRequestDetails(
                            urlString, method, options.body, options,
                            'INTERCEPTED', 'URL模式匹配拦截', mockResponse
                        );
                        log(`🚫 拦截Fetch请求: ${urlString}`);
                        return Promise.resolve(mockResponse);
                    }

                    // 会话ID替换 - 使用v2.5的SessionManager
                    if (options.headers) {
                        // 处理Headers对象
                        if (options.headers instanceof Headers) {
                            if (options.headers.has("x-request-session-id")) {
                                const sessionId = options.headers.get("x-request-session-id");
                                if (isSessionId(sessionId)) {
                                    options.headers.set("x-request-session-id", SessionManager.getMainSessionId());
                                    log(`🎭 替换Fetch请求中的会话ID: ${sessionId} → ${SessionManager.getMainSessionId()}`);
                                }
                            }
                        } else {
                            // 处理普通对象
                            const headers = new Headers(options.headers);
                            if (headers.has("x-request-session-id")) {
                                const sessionId = headers.get("x-request-session-id");
                                if (isSessionId(sessionId)) {
                                    headers.set("x-request-session-id", SessionManager.getMainSessionId());
                                    options.headers = headers;
                                    log(`🎭 替换Fetch请求中的会话ID: ${sessionId} → ${SessionManager.getMainSessionId()}`);
                                }
                            }
                        }
                    }

                    // 记录被放行的请求详情
                    let allowReason = '通过所有拦截检查';
                    if (SmartDataClassifier.isEssentialEndpoint(urlString)) {
                        allowReason = '必要端点保护';
                    } else if (SmartDataClassifier.isCodeIndexingRelated('', urlString)) {
                        allowReason = '代码索引功能';
                    }

                    // 先记录请求信息
                    NetworkInterceptor.logRequestDetails(
                        urlString, method, options.body, options,
                        'ALLOWED', allowReason
                    );

                    return originalFetch.apply(this, arguments);
                };

                global._fetchIntercepted = true;
                log('✅ Fetch API拦截设置完成');
            }
        },

        /**
         * XMLHttpRequest拦截实现
         * 使用更轻量的原型链重写方式，整合v2.5的智能分类和日志功能
         */
        interceptXHRDecrypted() {
            if (typeof XMLHttpRequest !== "undefined" && !XMLHttpRequest._intercepted) {
                const originalOpen = XMLHttpRequest.prototype.open;
                const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

                XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                    this._interceptedHeaders = {};
                    this._interceptedUrl = url;
                    this._interceptedMethod = method;

                    // 使用智能分类判断并记录详细日志
                    if (SmartDataClassifier.shouldInterceptUpload('', url)) {
                        NetworkInterceptor.logRequestDetails(
                            url, method, null, {},
                            'INTERCEPTED', '智能拦截 - XMLHttpRequest识别为遥测数据'
                        );
                        log(`🚫 智能拦截XMLHttpRequest: ${method} ${url}`);

                        this._shouldIntercept = true;
                        this.send = function(data) {
                            Object.defineProperty(this, "readyState", {value: 4, writable: false});
                            Object.defineProperty(this, "status", {value: 200, writable: false});
                            Object.defineProperty(this, "statusText", {value: "OK", writable: false});
                            Object.defineProperty(this, "responseText", {value: "{}", writable: false});
                            Object.defineProperty(this, "response", {value: "{}", writable: false});

                            setTimeout(() => {
                                if (this.onreadystatechange) this.onreadystatechange();
                                if (this.onload) this.onload();
                            }, 0);
                        };
                        return;
                    }

                    // 专门拦截 Segment.io
                    if (url.includes('segment.io') || url.includes('/v1/batch')) {
                        NetworkInterceptor.logRequestDetails(
                            url, method, null, {},
                            'INTERCEPTED', 'Segment.io数据收集拦截 - XMLHttpRequest'
                        );
                        log(`🚫 阻止 Segment.io XMLHttpRequest: ${url}`);

                        this._shouldIntercept = true;
                        this.send = function(data) {
                            Object.defineProperty(this, "readyState", {value: 4, writable: false});
                            Object.defineProperty(this, "status", {value: 200, writable: false});
                            Object.defineProperty(this, "statusText", {value: "OK", writable: false});
                            Object.defineProperty(this, "responseText", {value: '{"success": true, "batch": {"sent": true}}', writable: false});
                            Object.defineProperty(this, "response", {value: '{"success": true, "batch": {"sent": true}}', writable: false});

                            setTimeout(() => {
                                if (this.onreadystatechange) this.onreadystatechange();
                                if (this.onload) this.onload();
                            }, 0);
                        };
                        return;
                    }

                    // 检查URL是否需要拦截
                    if (shouldInterceptUrl(url)) {
                        NetworkInterceptor.logRequestDetails(
                            url, method, null, {},
                            'INTERCEPTED', 'URL模式匹配拦截 - XMLHttpRequest'
                        );
                        log(`🚫 拦截XMLHttpRequest: ${url}`);

                        this._shouldIntercept = true;
                        this.send = function(data) {
                            Object.defineProperty(this, "readyState", {value: 4, writable: false});
                            Object.defineProperty(this, "status", {value: 200, writable: false});
                            Object.defineProperty(this, "statusText", {value: "OK", writable: false});
                            Object.defineProperty(this, "responseText", {value: "{}", writable: false});
                            Object.defineProperty(this, "response", {value: "{}", writable: false});

                            setTimeout(() => {
                                if (this.onreadystatechange) this.onreadystatechange();
                                if (this.onload) this.onload();
                            }, 0);
                        };
                        return;
                    }

                    // 记录被放行的请求详情（在open阶段）
                    let allowReason = '通过所有拦截检查 - XMLHttpRequest';
                    if (SmartDataClassifier.isEssentialEndpoint(url)) {
                        allowReason = '必要端点保护 - XMLHttpRequest';
                    } else if (SmartDataClassifier.isCodeIndexingRelated('', url)) {
                        allowReason = '代码索引功能 - XMLHttpRequest';
                    }

                    NetworkInterceptor.logRequestDetails(
                        url, method, null, {},
                        'ALLOWED', allowReason
                    );

                    return originalOpen.apply(this, arguments);
                };

                XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
                    this._interceptedHeaders = this._interceptedHeaders || {};
                    this._interceptedHeaders[name] = value;

                    // 会话ID替换 - 使用v2.5的SessionManager
                    if (name.toLowerCase() === "x-request-session-id" && isSessionId(value)) {
                        const newSessionId = SessionManager.getMainSessionId();
                        log(`🎭 替换XMLHttpRequest请求头中的会话ID: ${value} → ${newSessionId}`);
                        return originalSetRequestHeader.call(this, name, newSessionId);
                    }

                    return originalSetRequestHeader.apply(this, arguments);
                };

                XMLHttpRequest._intercepted = true;
                log('✅ XMLHttpRequest拦截设置完成');
            }
        },

        /**
         * 通过require拦截axios模块，整合v2.5的智能分类和日志功能
         */
        interceptAxios() {
            // 检查是否已经拦截过require
            if (typeof require !== 'undefined' && !require._axiosIntercepted) {
                const originalRequire = require;

                require = function(moduleName) {
                    const module = originalRequire.apply(this, arguments);

                    // 拦截Axios模块
                    if (moduleName === "axios" && module && module.interceptors && module.interceptors.request) {
                        module.interceptors.request.use(
                            function(config) {
                                const url = config.url || '';
                                const method = config.method || 'GET';

                                // 使用智能数据分类并记录详细日志
                                if (SmartDataClassifier.shouldInterceptUpload(config.data || '', url)) {
                                    NetworkInterceptor.logRequestDetails(
                                        url, method, config.data, config,
                                        'INTERCEPTED', '智能拦截 - Axios识别为遥测数据'
                                    );
                                    log(`🚫 智能拦截Axios请求: ${method} ${url}`);

                                    config.adapter = function() {
                                        return Promise.resolve({
                                            data: {},
                                            status: 200,
                                            statusText: "OK",
                                            headers: {"content-type": "application/json"},
                                            config: config
                                        });
                                    };
                                    return config;
                                }

                                // 专门拦截 Segment.io
                                if (url.includes('segment.io') || url.includes('/v1/batch')) {
                                    NetworkInterceptor.logRequestDetails(
                                        url, method, config.data, config,
                                        'INTERCEPTED', 'Segment.io数据收集拦截 - Axios'
                                    );
                                    log(`🚫 阻止 Segment.io Axios请求: ${url}`);

                                    config.adapter = function() {
                                        return Promise.resolve({
                                            data: { success: true, batch: { sent: true } },
                                            status: 200,
                                            statusText: "OK",
                                            headers: {"content-type": "application/json"},
                                            config: config
                                        });
                                    };
                                    return config;
                                }

                                // 检查URL是否需要拦截
                                if (shouldInterceptUrl(url)) {
                                    NetworkInterceptor.logRequestDetails(
                                        url, method, config.data, config,
                                        'INTERCEPTED', 'URL模式匹配拦截 - Axios'
                                    );
                                    log(`🚫 拦截Axios请求: ${url}`);

                                    config.adapter = function() {
                                        return Promise.resolve({
                                            data: {},
                                            status: 200,
                                            statusText: "OK",
                                            headers: {"content-type": "application/json"},
                                            config: config
                                        });
                                    };
                                    return config;
                                }

                                // 会话ID替换 - 使用v2.5的SessionManager
                                if (config.headers && config.headers["x-request-session-id"]) {
                                    if (isSessionId(config.headers["x-request-session-id"])) {
                                        const originalSessionId = config.headers["x-request-session-id"];
                                        const newSessionId = SessionManager.getMainSessionId();
                                        config.headers["x-request-session-id"] = newSessionId;
                                        log(`🎭 替换Axios请求头中的会话ID: ${originalSessionId} → ${newSessionId}`);
                                    }
                                }

                                // 记录被放行的请求详情
                                let allowReason = '通过所有拦截检查 - Axios';
                                if (SmartDataClassifier.isEssentialEndpoint(url)) {
                                    allowReason = '必要端点保护 - Axios';
                                } else if (SmartDataClassifier.isCodeIndexingRelated(config.data || '', url)) {
                                    allowReason = '代码索引功能 - Axios';
                                }

                                NetworkInterceptor.logRequestDetails(
                                    url, method, config.data, config,
                                    'ALLOWED', allowReason
                                );

                                return config;
                            },
                            function(error) {
                                return Promise.reject(error);
                            }
                        );

                        log('✅ Axios拦截器设置完成');
                    }

                    return module;
                };

                require._axiosIntercepted = true;
                log('✅ Axios require拦截设置完成');
            }
        },

        /**
         * 拦截HTTP/HTTPS模块
         */
        interceptHttp() {
            try {
                const http = require('http');
                const https = require('https');

                // HTTP拦截
                const originalHttpRequest = http.request;
                http.request = function(options, callback) {
                    const url = NetworkInterceptor.buildUrlFromOptions(options);

                    if (shouldInterceptUrl(url)) {
                        log(`🚫 拦截HTTP请求: ${url}`);
                        return NetworkInterceptor.createMockResponse(callback);
                    }

                    return originalHttpRequest.apply(this, arguments);
                };

                // HTTPS拦截
                const originalHttpsRequest = https.request;
                https.request = function(options, callback) {
                    const url = NetworkInterceptor.buildUrlFromOptions(options);

                    if (shouldInterceptUrl(url)) {
                        log(`🚫 拦截HTTPS请求: ${url}`);
                        return NetworkInterceptor.createMockResponse(callback);
                    }

                    return originalHttpsRequest.apply(this, arguments);
                };

                log('✅ HTTP/HTTPS拦截设置完成');
            } catch (e) {
                log(`HTTP/HTTPS拦截设置失败: ${e.message}`, 'error');
            }
        },

        /**
         * 从选项构建URL
         */
        buildUrlFromOptions(options) {
            if (typeof options === 'string') return options;
            if (!options) return '';

            const protocol = options.protocol || 'http:';
            const hostname = options.hostname || options.host || 'localhost';
            const port = options.port ? `:${options.port}` : '';
            const path = options.path || '/';

            return `${protocol}//${hostname}${port}${path}`;
        },

        /**
         * 创建模拟XHR响应
         */
        createMockXHRResponse(xhr) {
            setTimeout(() => {
                Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
                Object.defineProperty(xhr, 'status', { value: 200, writable: false });
                Object.defineProperty(xhr, 'responseText', {
                    value: '{"success": true}',
                    writable: false
                });

                if (xhr.onreadystatechange) xhr.onreadystatechange();
                if (xhr.onload) xhr.onload();
            }, 0);
        },

        /**
         * 创建模拟Fetch响应
         */
        createMockFetchResponse() {
            const mockData = { success: true, intercepted: true, timestamp: new Date().toISOString() };
            const mockText = JSON.stringify(mockData);

            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([
                    ['content-type', 'application/json'],
                    ['x-intercepted', 'true'],
                    ['x-interceptor-version', 'v2.5']
                ]),
                json: () => Promise.resolve(mockData),
                text: () => Promise.resolve(mockText),
                blob: () => Promise.resolve(new Blob([mockText], { type: 'application/json' })),
                arrayBuffer: () => Promise.resolve(new TextEncoder().encode(mockText).buffer),
                _jsonData: mockData,
                _responseText: mockText
            };
        },

        /**
         * 创建模拟HTTP响应
         */
        createMockResponse(callback) {
            const mockResponse = {
                statusCode: 200,
                headers: {'content-type': 'application/json'},
                on: function(event, handler) {
                    if (event === 'data') {
                        setTimeout(() => handler('{"success": true}'), 10);
                    } else if (event === 'end') {
                        setTimeout(() => handler(), 15);
                    }
                },
                pipe: function() { return this; },
                end: function() {}
            };

            if (callback) {
                setTimeout(() => callback(mockResponse), 5);
            }

            return {
                on: function() {},
                write: function() {},
                end: function() {}
            };
        }
    };

    // ==================== 9. v2.5主初始化模块 ====================

    /**
     * v2.5主初始化器
     * 按照优化后的顺序初始化所有模块
     */
    const MainInitializer = {
        /**
         * 初始化所有拦截器模块
         */
        initializeAll() {
            log('🚀 开始初始化 v2.5 精确拦截器...');

            try {
                // 1. 首先初始化智能数据分类器
                log('📊 智能数据分类器已就绪');

                // 2. 初始化精确的Event Reporter拦截
                PreciseEventReporterInterceptor.initialize();

                // 3. 初始化API服务器错误报告拦截
                ApiServerErrorReportInterceptor.initialize();

                // 4. 初始化安全的Analytics拦截
                SafeAnalyticsInterceptor.initialize();

                // 5. 初始化智能JSON拦截（暂时禁用）
                // SmartJsonInterceptor.initialize();

                // 6. 初始化系统API拦截
                SystemApiInterceptor.initialize();

                // 7. 初始化系统命令拦截
                SystemCommandInterceptor.initialize();

                // 8. 初始化VSCode拦截
                VSCodeInterceptor.initialize();

                // 9. 初始化网络拦截
                NetworkInterceptor.initializeAll();

                // 10. 设置全局配置接口
                this.setupGlobalInterface();

                log('✅ v2.5 精确拦截器初始化完成！');
                this.printStatus();

            } catch (error) {
                log(`❌ 初始化失败: ${error.message}`, 'error');
                console.error('[AugmentCode拦截器] 初始化错误详情:', error);
            }
        },

        /**
         * 设置全局配置接口
         */
        setupGlobalInterface() {
            // 在全局对象上暴露配置接口
            let globalObj = this;

            if (typeof global !== 'undefined') {
                globalObj = global;
            } else if (typeof window !== 'undefined') {
                globalObj = window;
            }

            globalObj.AugmentCodeInterceptor = {
                version: INTERCEPTOR_CONFIG.version,
                config: INTERCEPTOR_CONFIG,

                // 配置方法
                enableDebug: () => {
                    INTERCEPTOR_CONFIG.debugMode = true;
                    log('🔧 调试模式已启用');
                },

                disableDebug: () => {
                    INTERCEPTOR_CONFIG.debugMode = false;
                    console.log('[AugmentCode拦截器] 🔧 调试模式已禁用');
                },

                // 会话管理
                regenerateSessionIds: () => {
                    SessionManager.regenerateAll();
                },

                getSessionIds: () => ({
                    main: SessionManager.getMainSessionId(),
                    user: SessionManager.getUserId(),
                    anonymous: SessionManager.getAnonymousId()
                }),

                // 系统信息访问统计
                getSystemAccessStats: () => {
                    const stats = INTERCEPTOR_CONFIG.systemAccessCount;
                    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
                    log('📊 系统信息访问统计:');
                    log(`   os.platform(): ${stats.platform}次`);
                    log(`   os.arch(): ${stats.arch}次`);
                    log(`   os.hostname(): ${stats.hostname}次`);
                    log(`   os.type(): ${stats.type}次`);
                    log(`   os.release(): ${stats.release}次`);
                    log(`   os.version(): ${stats.version}次`);
                    log(`   总访问次数: ${total}次`);
                    return stats;
                },

                resetSystemAccessStats: () => {
                    INTERCEPTOR_CONFIG.systemAccessCount = {
                        platform: 0,
                        arch: 0,
                        hostname: 0,
                        type: 0,
                        release: 0,
                        version: 0
                    };
                    log('🔄 已重置系统信息访问统计');
                },

                // VSCode环境变量访问统计
                getVSCodeEnvAccessStats: () => {
                    const stats = INTERCEPTOR_CONFIG.vscodeEnvAccessCount;
                    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
                    log('📊 VSCode环境变量访问统计:');
                    log(`   vscode.env.uriScheme: ${stats.uriScheme}次`);
                    log(`   vscode.env.sessionId: ${stats.sessionId}次`);
                    log(`   vscode.env.machineId: ${stats.machineId}次`);
                    log(`   vscode.env.isTelemetryEnabled: ${stats.isTelemetryEnabled}次`);
                    log(`   vscode.env.language: ${stats.language}次`);
                    log(`   其他环境变量: ${stats.other}次`);
                    log(`   总访问次数: ${total}次`);
                    return stats;
                },

                resetVSCodeEnvAccessStats: () => {
                    INTERCEPTOR_CONFIG.vscodeEnvAccessCount = {
                        uriScheme: 0,
                        sessionId: 0,
                        machineId: 0,
                        isTelemetryEnabled: 0,
                        language: 0,
                        other: 0
                    };
                    log('🔄 已重置VSCode环境变量访问统计');
                },

                // 状态查询
                getStatus: () => MainInitializer.getDetailedStatus(),

                // 测试方法
                testDataClassification: (data, context) => ({
                    isCodeIndexing: SmartDataClassifier.isCodeIndexingRelated(data, context),
                    isTelemetry: SmartDataClassifier.isTelemetryData(data, context),
                    shouldIntercept: SmartDataClassifier.shouldInterceptUpload(data, context)
                }),

                // VSCode版本配置管理
                vscodeVersionConfig: {
                    getStatus: () => {
                        const globalObj = (typeof global !== 'undefined') ? global :
                                         (typeof window !== 'undefined') ? window : {};
                        return globalObj._augmentVSCodeVersionConfig ?
                               globalObj._augmentVSCodeVersionConfig.getStatus() : null;
                    },
                    setFixedVersion: (version) => {
                        const globalObj = (typeof global !== 'undefined') ? global :
                                         (typeof window !== 'undefined') ? window : {};
                        return globalObj._augmentVSCodeVersionConfig ?
                               globalObj._augmentVSCodeVersionConfig.setFixedVersion(version) : false;
                    },
                    clearFixedVersion: () => {
                        const globalObj = (typeof global !== 'undefined') ? global :
                                         (typeof window !== 'undefined') ? window : {};
                        if (globalObj._augmentVSCodeVersionConfig) {
                            globalObj._augmentVSCodeVersionConfig.clearFixedVersion();
                        }
                    },
                    addVersion: (version) => {
                        const globalObj = (typeof global !== 'undefined') ? global :
                                         (typeof window !== 'undefined') ? window : {};
                        return globalObj._augmentVSCodeVersionConfig ?
                               globalObj._augmentVSCodeVersionConfig.addVersion(version) : false;
                    }
                },

                // Event Reporter拦截统计
                getInterceptionStats: () => {
                    return PreciseEventReporterInterceptor.getInterceptionStats();
                },

                // URL分类缓存统计
                getCacheStats: () => {
                    return URLClassificationCache.getStats();
                },

                printCacheStats: () => {
                    URLClassificationCache.printStats();
                },

                clearCache: () => {
                    URLClassificationCache.clear();
                },

                // 打印拦截统计报告
                printInterceptionReport: () => {
                    const stats = PreciseEventReporterInterceptor.getInterceptionStats();

                    console.log('\n📊 Event Reporter 拦截统计报告');
                    console.log('='.repeat(50));
                    console.log(`总拦截次数: ${stats.totalInterceptions}`);

                    if (stats.lastInterception) {
                        console.log(`最后拦截: ${stats.lastInterception.reporterType}.${stats.lastInterception.method}()`);
                        console.log(`拦截时间: ${stats.lastInterception.timestamp}`);
                    }

                    if (stats.topReporters.length > 0) {
                        console.log('\n🎯 拦截最多的Reporter:');
                        stats.topReporters.forEach(([reporter, count], index) => {
                            console.log(`  ${index + 1}. ${reporter}: ${count} 次`);
                        });
                    }

                    if (stats.topMethods.length > 0) {
                        console.log('\n🔧 拦截最多的方法:');
                        stats.topMethods.forEach(([method, count], index) => {
                            console.log(`  ${index + 1}. ${method}(): ${count} 次`);
                        });
                    }

                    console.log('='.repeat(50));
                }
            };

            log('🔧 全局配置接口已设置');
        },

        /**
         * 打印初始化状态
         */
        printStatus() {
            console.log('\n' + '='.repeat(60));
            console.log('🛡️  Augment Code 安全拦截器 v2.5 状态报告');
            console.log('='.repeat(60));
            console.log(`📅 构建时间: ${INTERCEPTOR_CONFIG.buildTime}`);
            console.log(`🔧 调试模式: ${INTERCEPTOR_CONFIG.debugMode ? '✅ 启用' : '❌ 禁用'}`);
            console.log(`🆔 主会话ID: ${SessionManager.getMainSessionId()}`);
            console.log('\n📊 功能模块状态:');
            console.log(`  🎯 精确Event Reporter拦截: ${INTERCEPTOR_CONFIG.dataProtection.enablePreciseEventReporterControl ? '✅' : '❌'}`);
            console.log(`  🚫 API错误报告拦截: ${INTERCEPTOR_CONFIG.dataProtection.enableApiServerErrorReportInterception ? '✅' : '❌'}`);
            console.log(`  🛡️ 安全Analytics拦截: ${INTERCEPTOR_CONFIG.dataProtection.enableAnalyticsBlocking ? '✅' : '❌'}`);
            console.log(`  🔍 智能数据分类: ${INTERCEPTOR_CONFIG.dataProtection.enableSmartDataClassification ? '✅' : '❌'}`);
            console.log(`  🖥️ 系统API拦截: ${INTERCEPTOR_CONFIG.dataProtection.enableSystemApiInterception ? '✅' : '❌'}`);
            console.log(`  🔧 系统命令拦截: ${INTERCEPTOR_CONFIG.dataProtection.enableGitCommandInterception ? '✅' : '❌'}`);
            console.log(`  🎭 VSCode拦截: ${INTERCEPTOR_CONFIG.dataProtection.enableVSCodeInterception ? '✅' : '❌'}`);
            console.log(`  🌐 网络请求拦截: ${INTERCEPTOR_CONFIG.network.enableFetchInterception ? '✅' : '❌'}`);
            console.log(`  📝 智能JSON拦截: ${INTERCEPTOR_CONFIG.dataProtection.enableJsonCleaning ? '✅' : '❌ (已禁用)'}`);
            console.log(`  🔒 增强白名单保护: ${INTERCEPTOR_CONFIG.dataProtection.enableEnhancedWhitelist ? '✅' : '❌'}`);
            console.log(`  🔍 被放行请求监控: ${INTERCEPTOR_CONFIG.network.logAllowedRequests ? '✅' : '❌'}`);
            console.log('\n🎯 拦截策略:');
            console.log(`  📊 遥测模式数量: ${TELEMETRY_PATTERNS.length}`);
            console.log(`  ✅ 代码索引白名单: ${CODE_INDEXING_PATTERNS.length}`);
            console.log(`  🎭 Event Reporter类型: ${EVENT_REPORTER_TYPES.length}`);
            console.log('\n💡 使用方法:');
            console.log('  - 查看状态: AugmentCodeInterceptor.getStatus()');
            console.log('  - 测试分类: AugmentCodeInterceptor.testDataClassification(data, context)');
            console.log('  - 重新生成ID: AugmentCodeInterceptor.regenerateSessionIds()');
            console.log('  - 缓存统计: AugmentCodeInterceptor.getCacheStats()');
            console.log('  - 打印缓存: AugmentCodeInterceptor.printCacheStats()');
            console.log('  - 清空缓存: AugmentCodeInterceptor.clearCache()');
            console.log('='.repeat(60) + '\n');
        },

        /**
         * 获取详细状态信息
         */
        getDetailedStatus() {
            return {
                version: INTERCEPTOR_CONFIG.version,
                buildTime: INTERCEPTOR_CONFIG.buildTime,
                debugMode: INTERCEPTOR_CONFIG.debugMode,
                sessionIds: {
                    main: SessionManager.getMainSessionId(),
                    user: SessionManager.getUserId(),
                    anonymous: SessionManager.getAnonymousId()
                },
                modules: {
                    preciseEventReporter: INTERCEPTOR_CONFIG.dataProtection.enablePreciseEventReporterControl,
                    apiServerErrorReportInterception: INTERCEPTOR_CONFIG.dataProtection.enableApiServerErrorReportInterception,
                    safeAnalytics: INTERCEPTOR_CONFIG.dataProtection.enableAnalyticsBlocking,
                    smartDataClassification: INTERCEPTOR_CONFIG.dataProtection.enableSmartDataClassification,
                    systemApiInterception: INTERCEPTOR_CONFIG.dataProtection.enableSystemApiInterception,
                    systemCommandInterception: INTERCEPTOR_CONFIG.dataProtection.enableGitCommandInterception,
                    vscodeInterception: INTERCEPTOR_CONFIG.dataProtection.enableVSCodeInterception,
                    networkInterception: INTERCEPTOR_CONFIG.network.enableFetchInterception,
                    smartJsonInterception: INTERCEPTOR_CONFIG.dataProtection.enableJsonCleaning,
                    enhancedWhitelist: INTERCEPTOR_CONFIG.dataProtection.enableEnhancedWhitelist
                },
                patterns: {
                    telemetryPatterns: TELEMETRY_PATTERNS.length,
                    codeIndexingPatterns: CODE_INDEXING_PATTERNS.length,
                    eventReporterTypes: EVENT_REPORTER_TYPES.length,
                    totalInterceptPatterns: INTERCEPT_PATTERNS.length
                }
            };
        }
    };

    // ==================== 10. 启动拦截器 ====================

    // 立即执行初始化
    MainInitializer.initializeAll();

    // 导出主要接口（如果在模块环境中）
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            version: INTERCEPTOR_CONFIG.version,
            SmartDataClassifier,
            SessionManager,
            NetworkInterceptor,
            getStatus: () => MainInitializer.getDetailedStatus(),
            // 调试功能控制
            enableAllowedRequestLogging: () => {
                INTERCEPTOR_CONFIG.network.logAllowedRequests = true;
                console.log('[DEBUG] 被放行请求监控已启用');
            },
            disableAllowedRequestLogging: () => {
                INTERCEPTOR_CONFIG.network.logAllowedRequests = false;
                console.log('[DEBUG] 被放行请求监控已禁用');
            },
            setLogLimit: (limit) => {
                INTERCEPTOR_CONFIG.network.allowedRequestLogLimit = limit;
                console.log(`[DEBUG] 整个请求包日志长度限制设置为: ${limit}`);
            }
        };
    }

})();
