/**
 * Augment Code Extension 完整拦截器
 * 
 * 整合所有v3.x功能的单文件版本：
 * ✅ 40+数据点身份配置文件系统
 * ✅ 智能网络策略（分层决策）
 * ✅ 完整SystemInformation库拦截
 * ✅ 硬件配置模板系统
 * ✅ 文件系统拦截
 * ✅ 性能监控
 * 
 * 版本: v3.6-complete
 * 构建时间: 2025-08-09
 */

(function() {
    'use strict';

    console.log('🚀 正在加载 Augment Code Extension 完整拦截器 v3.7...');

    // ==================== 1. 硬件配置模板加载 ====================
    let HARDWARE_TEMPLATES = {};
    try {
        const fs = require('fs');
        const path = require('path');

        // 在 VS Code 扩展上下文中，__dirname 指向包含当前脚本的目录 (如 '.../extension/out')
        // 我们假设 hardware-templates.json 被复制到了扩展的根目录 (如 '.../extension')
        const templatesPath = path.join(__dirname, '..', 'hardware-templates.json');

        if (fs.existsSync(templatesPath)) {
            const templatesJson = fs.readFileSync(templatesPath, 'utf8');
            HARDWARE_TEMPLATES = JSON.parse(templatesJson);
            console.log('✅ 硬件模板加载成功 from', templatesPath);
        } else {
            console.error('❌ 错误: hardware-templates.json 未找到 at', templatesPath);
            // 提供一个最小化的默认模板以避免崩溃
            HARDWARE_TEMPLATES = {
                fallback: {
                    cpu: { manufacturer: 'Intel', brand: 'Core i5', cores: 4, physicalCores: 4, speed: 2.5 },
                    bios: { vendor: 'Default BIOS Vendor' },
                    baseboard: { manufacturer: 'Default Board Manufacturer' },
                    chassis: { type: 'Desktop' },
                    memory: { total: 8589934592, modules: [{ size: 8589934592, type: 'DDR4' }] }
                }
            };
        }
    } catch (error) {
        console.error('❌ 加载硬件模板失败:', error.message);
    }

    // ==================== 2. 身份配置文件管理器 ====================

    class IdentityProfileManager {
        constructor() {
            this.currentProfile = null;

            // 配置文件路径
            const os = require('os');
            const path = require('path');
            this.configDir = path.join(os.homedir(), '.augment-interceptor');
            this.configFile = path.join(this.configDir, 'identity-profile.json');

            this.loadOrCreateProfile();
        }

        generateConsistentUUID(seed) {
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                const char = seed.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            const hex = Math.abs(hash).toString(16).padStart(8, '0');
            return `${hex.substr(0,8)}-${hex.substr(0,4)}-4${hex.substr(1,3)}-8${hex.substr(4,3)}-${hex}${hex.substr(0,4)}`;
        }

        generateProfile() {
            const profileSeed = 'augment-user-' + Date.now().toString(36);
            
            return {
                // 基础标识符 (8个)
                identifiers: {
                    machineId: this.generateConsistentUUID(profileSeed + '-machine'),
                    telemetryDevDeviceId: this.generateConsistentUUID(profileSeed + '-telemetry'),
                    osMachineId: this.generateConsistentUUID(profileSeed + '-os'),
                    userDataMachineId: this.generateConsistentUUID(profileSeed + '-userdata'),
                    sessionId: this.generateConsistentUUID(profileSeed + '-session'),
                    requestId: this.generateConsistentUUID(profileSeed + '-request'),
                    randomHash: this.generateConsistentUUID(profileSeed + '-hash'),
                    systemDataDirectoryUuid: this.generateConsistentUUID(profileSeed + '-systemdir')
                },
                
                // 系统信息 (8个)
                system: {
                    platform: process.platform || 'win32',
                    arch: process.arch || 'x64',
                    hostname: 'DESKTOP-' + this.generateConsistentUUID(profileSeed + '-host').substr(0, 8),
                    username: 'user-' + this.generateConsistentUUID(profileSeed + '-user').substr(0, 8),
                    osRelease: this.getOSRelease(),
                    kernelVersion: this.getKernelVersion(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    locale: 'en-US'
                },
                
                // 文件系统信息 (4个)
                filesystem: {
                    homeDirectoryIno: Math.floor(Math.random() * 10000000),
                    projectRootIno: Math.floor(Math.random() * 10000000),
                    userDataPathIno: Math.floor(Math.random() * 10000000),
                    systemDataDirectoryIno: Math.floor(Math.random() * 10000000)
                },
                
                // 硬件信息 (20+个)
                hardware: {
                    biosInfo: {
                        vendor: 'American Megatrends Inc.',
                        version: '2.' + Math.floor(Math.random() * 100),
                        serial: this.generateConsistentUUID(profileSeed + '-bios').replace(/-/g, '').substr(0, 12)
                    },
                    baseboardInfo: {
                        manufacturer: 'ASUSTeK COMPUTER INC.',
                        model: 'PRIME-' + this.generateConsistentUUID(profileSeed + '-board').substr(0, 6),
                        serial: this.generateConsistentUUID(profileSeed + '-baseboard').replace(/-/g, '').substr(0, 12)
                    },
                    macAddresses: [
                        this.generateMacAddress(profileSeed + '-mac1'),
                        this.generateMacAddress(profileSeed + '-mac2')
                    ],
                    memoryModuleSerials: [
                        this.generateConsistentUUID(profileSeed + '-mem1').replace(/-/g, '').substr(0, 12),
                        this.generateConsistentUUID(profileSeed + '-mem2').replace(/-/g, '').substr(0, 12)
                    ],
                    usbDeviceIds: [
                        this.generateConsistentUUID(profileSeed + '-usb1').replace(/-/g, '').substr(0, 8),
                        this.generateConsistentUUID(profileSeed + '-usb2').replace(/-/g, '').substr(0, 8)
                    ],
                    audioDeviceIds: [
                        this.generateConsistentUUID(profileSeed + '-audio').replace(/-/g, '').substr(0, 8)
                    ],
                    diskSerials: [
                        this.generateConsistentUUID(profileSeed + '-disk').replace(/-/g, '').substr(0, 12)
                    ],
                    gpuInfo: {
                        vendor: 'NVIDIA Corporation',
                        model: 'GeForce RTX 3070',
                        deviceId: this.generateConsistentUUID(profileSeed + '-gpu').replace(/-/g, '').substr(0, 8)
                    }
                },
                
                // 软件环境 (6个)
                software: {
                    vscode: '1.85.2',
                    node: process.version || 'v18.17.0',
                    npm: '9.6.7',
                    systemBootTime: Date.now() - Math.floor(Math.random() * 86400000),
                    processStartTime: Date.now() - Math.floor(Math.random() * 3600000),
                    extensionVersion: '0.525.0'
                }
            };
        }

        generateMacAddress(seed) {
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                hash = hash & hash;
            }
            const hex = Math.abs(hash).toString(16).padStart(12, '0');
            return hex.match(/.{2}/g).join(':').toUpperCase();
        }

        getOSRelease() {
            const platform = process.platform;
            if (platform === 'win32') return '10.0.19045';
            if (platform === 'darwin') return '22.6.0';
            if (platform === 'linux') return '5.15.0-91-generic';
            return '10.0.19045';
        }

        getKernelVersion() {
            const platform = process.platform;
            if (platform === 'win32') return '10.0.19045.3693';
            if (platform === 'darwin') return 'Darwin Kernel Version 22.6.0';
            if (platform === 'linux') return '5.15.0-91-generic #101-Ubuntu';
            return '10.0.19045.3693';
        }

        loadOrCreateProfile() {
            const fs = require('fs');

            try {
                // 检查配置文件是否存在
                if (fs.existsSync(this.configFile)) {
                    // 文件存在，加载现有身份
                    const stored = fs.readFileSync(this.configFile, 'utf8');
                    this.currentProfile = JSON.parse(stored);
                    console.log('[身份管理器] ✅ 已加载现有身份配置文件');
                    console.log('[身份管理器] 📁 配置文件:', this.configFile);
                    console.log('[身份管理器] 🆔 身份ID:', this.currentProfile.identifiers.machineId.substr(0, 8) + '...');
                    console.log('[身份管理器] 🏠 主机名:', this.currentProfile.system.hostname);
                    console.log('[身份管理器] 👤 用户名:', this.currentProfile.system.username);
                    return;
                }
            } catch (e) {
                console.warn('[身份管理器] ⚠️ 加载配置失败，将生成新身份:', e.message);
            }

            // 文件不存在，生成新身份
            console.log('[身份管理器] 📄 配置文件不存在，正在生成新身份...');
            this.currentProfile = this.generateProfile();
            this.saveProfile();
            console.log('[身份管理器] ✅ 已生成新的身份配置文件');
            console.log('[身份管理器] 📁 配置文件:', this.configFile);
            console.log('[身份管理器] 🆔 新身份ID:', this.currentProfile.identifiers.machineId.substr(0, 8) + '...');
            console.log('[身份管理器] 🏠 新主机名:', this.currentProfile.system.hostname);
            console.log('[身份管理器] 👤 新用户名:', this.currentProfile.system.username);
            console.log('[身份管理器] 💡 提示: 删除配置文件可重置身份');
        }

        saveProfile() {
            try {
                const fs = require('fs');

                // 确保配置目录存在
                if (!fs.existsSync(this.configDir)) {
                    fs.mkdirSync(this.configDir, { recursive: true });
                }

                // 保存配置文件
                fs.writeFileSync(this.configFile, JSON.stringify(this.currentProfile, null, 2));
                console.log('[身份管理器] 💾 配置已保存');
            } catch (e) {
                console.warn('[身份管理器] ❌ 保存配置失败:', e.message);
                console.warn('[身份管理器] 📁 配置目录:', this.configDir);
                console.warn('[身份管理器] 📄 配置文件:', this.configFile);
            }
        }

        getProfile() {
            return this.currentProfile;
        }

        resetProfile() {
            console.log('[身份管理器] 🔄 正在重置身份...');
            this.currentProfile = this.generateProfile();
            this.saveProfile();
            console.log('[身份管理器] ✅ 身份已重置');
            console.log('[身份管理器] 🆔 新身份ID:', this.currentProfile.identifiers.machineId.substr(0, 8) + '...');
            console.log('[身份管理器] 🏠 新主机名:', this.currentProfile.system.hostname);
            console.log('[身份管理器] 👤 新用户名:', this.currentProfile.system.username);
            console.log('[身份管理器] 💡 提示: 也可以删除配置文件来重置身份');
            return this.currentProfile;
        }
    }

    // ==================== 3. 智能网络策略 ====================

    class SmartNetworkStrategy {
        constructor(identityProfile) {
            this.profile = identityProfile;
        }

        getRequestStrategy(url, data) {
            // 1. 保留功能：优先允许必要功能端点
            if (this.isEssentialFunction(url)) {
                return 'ALLOW';
            }

            // 2. 身份验证：替换为伪造身份信息
            if (this.isIdentityVerification(url, data)) {
                return 'REPLACE_IDENTITY';
            }

            // 3. 保护隐私：拦截真实个人信息
            if (this.containsRealPersonalInfo(data)) {
                return 'REPLACE_IDENTITY';
            }

            // 4. 默认策略：检查是否为遥测数据
            if (this.isTelemetryData(url, data)) {
                return 'INTERCEPT';
            }

            return 'ALLOW';
        }

        isEssentialFunction(url) {
            const essentialPatterns = [
                'augmentcode.com',
                '/api/completion',
                '/api/chat',
                '/api/search',
                '/api/index',
                'vscode-webview',
                'localhost'
            ];
            return essentialPatterns.some(pattern => url.includes(pattern));
        }

        isIdentityVerification(url, data) {
            const identityPatterns = [
                '/api/auth',
                '/api/verify',
                '/api/login',
                '/api/register',
                '/api/user',
                '/api/device'
            ];
            return identityPatterns.some(pattern => url.includes(pattern));
        }

        isTelemetryData(url, data) {
            const telemetryPatterns = [
                'segment.io',
                'analytics',
                'telemetry',
                'mixpanel',
                'amplitude',
                'google-analytics',
                'facebook.com/tr',
                'doubleclick.net'
            ];
            return telemetryPatterns.some(pattern => url.includes(pattern));
        }

        containsRealPersonalInfo(data) {
            if (!data) return false;
            const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
            const personalInfoKeywords = [
                'machineId', 'hostname', 'username', 'userInfo',
                'telemetryDevDeviceId', 'osMachineId', 'deviceId',
                'homeDirectory', 'userDataPath'
            ];
            return personalInfoKeywords.some(keyword =>
                dataStr.toLowerCase().includes(keyword.toLowerCase())
            );
        }

        replaceWithFakeIdentity(data) {
            if (!data) return data;

            let fakeData;
            if (typeof data === 'string') {
                fakeData = data;
            } else {
                fakeData = JSON.stringify(data);
            }

            // 替换各种身份标识符
            const os = require('os');
            const replacements = {
                [os.hostname()]: this.profile.system.hostname,
                [os.userInfo().username]: this.profile.system.username,
                [process.env.USERNAME || '']: this.profile.system.username,
                [process.env.USER || '']: this.profile.system.username
            };

            // 执行替换
            Object.entries(replacements).forEach(([real, fake]) => {
                if (real && fake) {
                    fakeData = fakeData.replace(new RegExp(real, 'g'), fake);
                }
            });

            return typeof data === 'object' ? JSON.parse(fakeData) : fakeData;
        }
    }

    // ==================== 4. 硬件配置生成器 ====================

    class HardwareConfigGenerator {
        constructor(identityProfile) {
            this.profile = identityProfile;
            this.selectedTemplate = this.selectTemplate();
        }

        selectTemplate() {
            const templates = Object.keys(HARDWARE_TEMPLATES);
            const seed = this.profile.identifiers.machineId;
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                hash = hash & hash;
            }
            const index = Math.abs(hash) % templates.length;
            return HARDWARE_TEMPLATES[templates[index]];
        }

        generateSystemInfo() {
            const template = this.selectedTemplate;
            return {
                manufacturer: template.baseboard.manufacturer,
                model: template.baseboard.model,
                version: template.baseboard.version,
                serial: this.profile.hardware.baseboardInfo.serial,
                uuid: this.profile.identifiers.machineId,
                sku: 'SKU-' + this.profile.identifiers.machineId.substr(0, 8),
                family: template.chassis.type,
                virtual: false,
                virtualHost: ''
            };
        }

        generateBiosInfo() {
            const template = this.selectedTemplate;
            return {
                vendor: template.bios.vendor,
                version: template.bios.version,
                releaseDate: template.bios.releaseDate,
                revision: template.bios.revision,
                serial: this.profile.hardware.biosInfo.serial
            };
        }

        generateBaseboardInfo() {
            const template = this.selectedTemplate;
            return {
                manufacturer: template.baseboard.manufacturer,
                model: template.baseboard.model,
                version: template.baseboard.version,
                serial: this.profile.hardware.baseboardInfo.serial,
                assetTag: template.baseboard.assetTag
            };
        }

        generateChassisInfo() {
            const template = this.selectedTemplate;
            return {
                manufacturer: template.chassis.manufacturer,
                model: template.chassis.model,
                type: template.chassis.type,
                version: template.chassis.version,
                serial: this.generateConsistentSerial('chassis'),
                assetTag: template.chassis.assetTag
            };
        }

        generateCpuInfo() {
            const template = this.selectedTemplate.cpu;
            return {
                manufacturer: template.manufacturer,
                brand: template.brand,
                vendor: template.manufacturer,
                family: template.family,
                model: template.model,
                stepping: template.stepping,
                revision: template.revision,
                voltage: template.voltage,
                speed: template.speed,
                speedMin: template.speedMin,
                speedMax: template.speedMax,
                governor: 'performance',
                cores: template.cores,
                physicalCores: template.physicalCores,
                processors: template.processors,
                socket: template.socket,
                flags: template.flags,
                virtualization: true,
                cache: {
                    l1d: 32768,
                    l1i: 32768,
                    l2: 262144,
                    l3: 16777216
                }
            };
        }

        generateCpuFlags() {
            return this.selectedTemplate.cpu.flags;
        }

        generateMemoryInfo() {
            const template = this.selectedTemplate.memory;
            const used = Math.floor(template.total * (0.3 + Math.random() * 0.4));
            return {
                total: template.total,
                free: template.total - used,
                used: used,
                active: used,
                available: template.total - used,
                buffers: Math.floor(used * 0.1),
                cached: Math.floor(used * 0.2),
                slab: Math.floor(used * 0.05),
                buffcache: Math.floor(used * 0.3),
                swaptotal: template.total,
                swapused: 0,
                swapfree: template.total
            };
        }

        generateMemoryLayout() {
            const template = this.selectedTemplate.memory;
            return template.modules.map((module, index) => ({
                size: module.size,
                bank: `BANK ${index}`,
                type: module.type,
                clockSpeed: module.clockSpeed,
                formFactor: 'DIMM',
                manufacturer: module.manufacturer,
                partNum: `${module.manufacturer}-${this.generateConsistentSerial('mem' + index)}`,
                serialNum: this.profile.hardware.memoryModuleSerials[index] || this.generateConsistentSerial('mem' + index),
                voltageConfigured: 1.2,
                voltageMin: 1.2,
                voltageMax: 1.2
            }));
        }

        generateDiskLayout() {
            return [
                {
                    device: '/dev/sda',
                    type: 'SSD',
                    name: 'Samsung SSD 980 PRO 1TB',
                    vendor: 'Samsung',
                    size: 1000204886016,
                    bytesPerSector: 512,
                    totalCylinders: 121601,
                    totalHeads: 255,
                    totalSectors: 1953525168,
                    totalTracks: 31008255,
                    tracksPerCylinder: 255,
                    sectorsPerTrack: 63,
                    firmwareRevision: '5B2QGXA7',
                    serialNum: this.profile.hardware.diskSerials[0],
                    interfaceType: 'NVMe',
                    smartStatus: 'Ok',
                    temperature: 35 + Math.floor(Math.random() * 20)
                }
            ];
        }

        generateConsistentSerial(type) {
            const seed = this.profile.identifiers.machineId + type;
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16).toUpperCase().padStart(12, '0');
        }
    }

    // ==================== 5. SystemInformation 库拦截器 ====================

    class SystemInformationInterceptor {
        constructor(identityProfile, hardwareGenerator) {
            this.profile = identityProfile;
            this.hardware = hardwareGenerator;
            this.setupInterceptor();
        }

        setupInterceptor() {
            try {
                const Module = require('module');
                const originalRequire = Module.prototype.require;
                const self = this;

                Module.prototype.require = function(id) {
                    if (id === 'systeminformation') {
                        console.log('🔍 拦截 systeminformation 库加载');
                        return self.createSystemInformationMock();
                    }
                    return originalRequire.apply(this, arguments);
                };

                console.log('✅ SystemInformation 库拦截已设置');
            } catch (e) {
                console.warn('[SystemInformation拦截器] 设置失败:', e.message);
            }
        }

        createSystemInformationMock() {
            const self = this;

            return {
                // 系统信息
                system: (callback) => this.handleCallback(callback, () => self.hardware.generateSystemInfo()),
                bios: (callback) => this.handleCallback(callback, () => self.hardware.generateBiosInfo()),
                baseboard: (callback) => this.handleCallback(callback, () => self.hardware.generateBaseboardInfo()),
                chassis: (callback) => this.handleCallback(callback, () => self.hardware.generateChassisInfo()),

                // CPU信息
                cpu: (callback) => this.handleCallback(callback, () => self.hardware.generateCpuInfo()),
                cpuFlags: (callback) => this.handleCallback(callback, () => self.hardware.generateCpuFlags()),
                cpuCache: (callback) => this.handleCallback(callback, () => ({
                    l1d: 32768, l1i: 32768, l2: 262144, l3: 16777216
                })),
                cpuCurrentSpeed: (callback) => this.handleCallback(callback, () => ({
                    avg: self.hardware.selectedTemplate.cpu.speed,
                    min: self.hardware.selectedTemplate.cpu.speedMin,
                    max: self.hardware.selectedTemplate.cpu.speedMax
                })),
                cpuTemperature: (callback) => this.handleCallback(callback, () => ({
                    main: 45 + Math.floor(Math.random() * 20),
                    cores: Array(self.hardware.selectedTemplate.cpu.cores).fill(0).map(() =>
                        40 + Math.floor(Math.random() * 25)
                    ),
                    max: 85
                })),

                // 内存信息
                mem: (callback) => this.handleCallback(callback, () => self.hardware.generateMemoryInfo()),
                memLayout: (callback) => this.handleCallback(callback, () => self.hardware.generateMemoryLayout()),

                // 存储信息
                diskLayout: (callback) => this.handleCallback(callback, () => self.hardware.generateDiskLayout()),
                blockDevices: (callback) => this.handleCallback(callback, () => self.hardware.generateDiskLayout()),
                disksIO: (callback) => this.handleCallback(callback, () => ({
                    rIO: Math.floor(Math.random() * 1000),
                    wIO: Math.floor(Math.random() * 1000),
                    tIO: Math.floor(Math.random() * 2000),
                    rIO_sec: Math.floor(Math.random() * 100),
                    wIO_sec: Math.floor(Math.random() * 100),
                    tIO_sec: Math.floor(Math.random() * 200)
                })),

                // 网络信息
                networkInterfaces: (callback) => this.handleCallback(callback, () => [
                    {
                        iface: 'Ethernet',
                        ifaceName: 'Ethernet',
                        ip4: '192.168.1.' + (100 + Math.floor(Math.random() * 50)),
                        ip4subnet: '255.255.255.0',
                        ip6: 'fe80::' + Math.random().toString(16).substr(2, 4) + ':' + Math.random().toString(16).substr(2, 4),
                        mac: self.profile.hardware.macAddresses[0],
                        internal: false,
                        virtual: false,
                        operstate: 'up',
                        type: 'wired',
                        duplex: 'full',
                        mtu: 1500,
                        speed: 1000,
                        dhcp: true,
                        dnsSuffix: 'local',
                        ieee8021xAuth: 'Not required',
                        ieee8021xState: 'Not required'
                    }
                ]),

                // 操作系统信息
                osInfo: (callback) => this.handleCallback(callback, () => ({
                    platform: self.profile.system.platform,
                    distro: self.profile.system.platform === 'win32' ? 'Windows 10' : 'Ubuntu',
                    release: self.profile.system.osRelease,
                    codename: '',
                    kernel: self.profile.system.kernelVersion,
                    arch: self.profile.system.arch,
                    hostname: self.profile.system.hostname,
                    fqdn: self.profile.system.hostname + '.local',
                    codepage: 'UTF-8',
                    logofile: '',
                    serial: self.profile.identifiers.osMachineId,
                    build: self.profile.system.osRelease,
                    servicepack: ''
                })),

                // UUID信息
                uuid: (callback) => this.handleCallback(callback, () => ({
                    os: self.profile.identifiers.osMachineId,
                    hardware: self.profile.identifiers.machineId,
                    macs: self.profile.hardware.macAddresses
                })),

                // 版本信息
                versions: (callback) => this.handleCallback(callback, () => ({
                    kernel: self.profile.system.kernelVersion,
                    openssl: '1.1.1f',
                    systemOpenssl: '1.1.1f',
                    systemOpensslLib: 'OpenSSL 1.1.1f',
                    node: self.profile.software.node,
                    v8: '9.4.146.24-node.20',
                    npm: self.profile.software.npm,
                    yarn: '1.22.19',
                    pm2: '5.2.2',
                    gulp: '4.0.2',
                    grunt: '1.5.3',
                    git: '2.34.1',
                    tsc: '4.9.4',
                    mysql: '8.0.32',
                    redis: '6.2.6',
                    mongodb: '5.0.15',
                    apache: '2.4.52',
                    nginx: '1.18.0',
                    php: '8.1.2',
                    docker: '20.10.21',
                    postfix: '3.6.4',
                    postgresql: '14.6',
                    perl: '5.34.0',
                    python: '3.10.6',
                    python3: '3.10.6',
                    pip: '22.0.2',
                    pip3: '22.0.2',
                    java: '11.0.17',
                    gcc: '11.3.0',
                    virtualbox: '6.1.38',
                    bash: '5.1.16',
                    zsh: '5.8.1',
                    fish: '3.3.1',
                    powershell: '7.2.8',
                    dotnet: '6.0.404'
                })),

                // 用户信息
                users: (callback) => this.handleCallback(callback, () => [
                    {
                        user: self.profile.system.username,
                        tty: 'console',
                        date: new Date().toISOString(),
                        time: new Date().toISOString(),
                        ip: '',
                        command: 'explorer.exe'
                    }
                ]),

                // 进程信息
                processes: (callback) => this.handleCallback(callback, () => ({
                    all: Math.floor(Math.random() * 200) + 100,
                    running: Math.floor(Math.random() * 50) + 20,
                    blocked: 0,
                    sleeping: Math.floor(Math.random() * 150) + 80,
                    unknown: 0,
                    list: []
                })),

                // 服务信息
                services: (callback) => this.handleCallback(callback, () => []),

                // 时间信息
                time: (callback) => this.handleCallback(callback, () => ({
                    current: Date.now(),
                    uptime: Math.floor((Date.now() - self.profile.software.systemBootTime) / 1000),
                    timezone: self.profile.system.timezone,
                    timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone
                })),

                // 获取所有信息的便捷方法
                getAllData: (callback) => {
                    const allData = {
                        system: self.hardware.generateSystemInfo(),
                        bios: self.hardware.generateBiosInfo(),
                        baseboard: self.hardware.generateBaseboardInfo(),
                        chassis: self.hardware.generateChassisInfo(),
                        cpu: self.hardware.generateCpuInfo(),
                        mem: self.hardware.generateMemoryInfo(),
                        memLayout: self.hardware.generateMemoryLayout(),
                        diskLayout: self.hardware.generateDiskLayout(),
                        osInfo: {
                            platform: self.profile.system.platform,
                            hostname: self.profile.system.hostname,
                            arch: self.profile.system.arch
                        },
                        uuid: {
                            os: self.profile.identifiers.osMachineId,
                            hardware: self.profile.identifiers.machineId
                        }
                    };
                    return this.handleCallback(callback, () => allData);
                }
            };
        }

        handleCallback(callback, dataGenerator) {
            const data = dataGenerator();
            if (typeof callback === 'function') {
                setTimeout(() => callback(data), 0);
                return;
            }
            return Promise.resolve(data);
        }
    }

    // ==================== 6. 文件系统拦截器 ====================

    class FileSystemInterceptor {
        constructor(identityProfile) {
            this.profile = identityProfile;
            this.interceptFS();
            this.interceptOS();
        }

        interceptFS() {
            try {
                const Module = require('module');
                const originalRequire = Module.prototype.require;
                const self = this;

                Module.prototype.require = function(id) {
                    if (id === 'fs' || id === 'node:fs') {
                        const fs = originalRequire.apply(this, arguments);
                        return self.createFSProxy(fs);
                    }
                    return originalRequire.apply(this, arguments);
                };

                console.log('✅ 文件系统拦截已设置');
            } catch (e) {
                console.warn('[文件系统拦截器] 设置失败:', e.message);
            }
        }

        createFSProxy(fs) {
            const self = this;

            return new Proxy(fs, {
                get(target, prop) {
                    // 拦截stat相关方法
                    if (['statSync', 'lstatSync', 'stat', 'lstat'].includes(prop)) {
                        return function(path, ...args) {
                            const result = target[prop].apply(this, arguments);

                            // 替换inode信息
                            if (result && typeof result === 'object') {
                                if (path.includes('home') || path.includes('Users')) {
                                    result.ino = self.profile.filesystem.homeDirectoryIno;
                                } else if (path.includes('userData')) {
                                    result.ino = self.profile.filesystem.userDataPathIno;
                                } else if (path.includes('project') || path.includes('workspace')) {
                                    result.ino = self.profile.filesystem.projectRootIno;
                                }
                            }

                            return result;
                        };
                    }

                    // 拦截readFile相关方法（SSH密钥等）
                    if (['readFileSync', 'readFile'].includes(prop)) {
                        return function(path, ...args) {
                            const pathStr = path.toString();

                            // 拦截SSH相关文件
                            if (pathStr.includes('.ssh') || pathStr.includes('known_hosts') || pathStr.includes('id_rsa')) {
                                console.log('🔒 [文件拦截] SSH文件访问已拦截:', pathStr);
                                if (prop === 'readFileSync') {
                                    return Buffer.from('# Fake SSH file\n');
                                } else {
                                    const callback = args[args.length - 1];
                                    if (typeof callback === 'function') {
                                        setTimeout(() => callback(null, Buffer.from('# Fake SSH file\n')), 0);
                                        return;
                                    }
                                    return Promise.resolve(Buffer.from('# Fake SSH file\n'));
                                }
                            }

                            return target[prop].apply(this, arguments);
                        };
                    }

                    return target[prop];
                }
            });
        }

        interceptOS() {
            try {
                const Module = require('module');
                const originalRequire = Module.prototype.require;
                const self = this;

                Module.prototype.require = function(id) {
                    if (id === 'os' || id === 'node:os') {
                        const os = originalRequire.apply(this, arguments);
                        return self.createOSProxy(os);
                    }
                    return originalRequire.apply(this, arguments);
                };

                console.log('✅ OS模块拦截已设置');
            } catch (e) {
                console.warn('[文件系统拦截器] OS拦截设置失败:', e.message);
            }
        }

        createOSProxy(os) {
            const self = this;

            return new Proxy(os, {
                get(target, prop) {
                    if (prop === 'hostname') {
                        return function() {
                            console.log(`🔄 [OS拦截] hostname() 调用已拦截 - 伪造: ${self.profile.system.hostname}`);
                            return self.profile.system.hostname;
                        };
                    }

                    if (prop === 'userInfo') {
                        return function() {
                            const realInfo = target[prop]();
                            const fakeInfo = {
                                ...realInfo,
                                username: self.profile.system.username,
                                homedir: realInfo.homedir.replace(realInfo.username, self.profile.system.username)
                            };
                            console.log(`🔄 [OS拦截] userInfo() 调用已拦截 - 伪造用户: ${fakeInfo.username}`);
                            return fakeInfo;
                        };
                    }

                    return target[prop];
                }
            });
        }
    }

    // ==================== 7. 网络拦截器 ====================

    class NetworkInterceptor {
        constructor(identityProfile, networkStrategy) {
            this.profile = identityProfile;
            this.strategy = networkStrategy;
            this.stats = {
                intercepted: 0,
                allowed: 0,
                replaced: 0,
                total: 0
            };
            this.initializeAll();
        }

        interceptFetch() {
            if (typeof fetch === 'undefined') return;

            const originalFetch = fetch;
            const self = this;

            fetch = function(url, options = {}) {
                const urlString = url.toString();
                const method = options.method || 'GET';
                const body = options.body;

                const strategy = self.strategy.getRequestStrategy(urlString, body);

                switch (strategy) {
                    case 'INTERCEPT':
                        self.stats.intercepted++;
                        self.stats.total++;
                        console.log(`🚫 [网络拦截] ${method} ${urlString} - 遥测数据已拦截`);
                        return Promise.resolve({
                            ok: true,
                            status: 200,
                            json: () => Promise.resolve({success: true}),
                            text: () => Promise.resolve('{"success": true}')
                        });

                    case 'REPLACE_IDENTITY':
                        self.stats.replaced++;
                        self.stats.total++;
                        const fakeBody = self.strategy.replaceWithFakeIdentity(body);
                        const newOptions = { ...options, body: fakeBody };

                        // 替换请求头中的身份信息
                        if (newOptions.headers) {
                            self.replaceHeaderIdentity(newOptions.headers);
                        }

                        console.log(`🔄 [网络拦截] ${method} ${urlString} - 身份信息已替换`);
                        return originalFetch.call(this, url, newOptions);

                    case 'ALLOW':
                    default:
                        self.stats.allowed++;
                        self.stats.total++;
                        console.log(`✅ [网络拦截] ${method} ${urlString} - 必要功能已放行`);
                        return originalFetch.apply(this, arguments);
                }
            };

            console.log('✅ Fetch API拦截已设置');
        }

        interceptXHR() {
            if (typeof XMLHttpRequest === 'undefined') return;

            const originalXHR = XMLHttpRequest;
            const self = this;

            XMLHttpRequest = function() {
                const xhr = new originalXHR();
                const originalOpen = xhr.open;
                const originalSend = xhr.send;

                xhr.open = function(method, url, ...args) {
                    this._url = url;
                    this._method = method;
                    return originalOpen.apply(this, arguments);
                };

                xhr.send = function(data) {
                    const strategy = self.strategy.getRequestStrategy(this._url, data);

                    switch (strategy) {
                        case 'INTERCEPT':
                            self.stats.intercepted++;
                            self.stats.total++;
                            console.log(`🚫 [XHR拦截] ${this._method} ${this._url} - 遥测数据已拦截`);

                            setTimeout(() => {
                                Object.defineProperty(this, 'readyState', { value: 4, writable: false });
                                Object.defineProperty(this, 'status', { value: 200, writable: false });
                                Object.defineProperty(this, 'responseText', { value: '{"success": true}', writable: false });
                                if (this.onreadystatechange) this.onreadystatechange();
                            }, 0);
                            return;

                        case 'REPLACE_IDENTITY':
                            self.stats.replaced++;
                            self.stats.total++;
                            const fakeData = self.strategy.replaceWithFakeIdentity(data);
                            console.log(`🔄 [XHR拦截] ${this._method} ${this._url} - 身份信息已替换`);
                            return originalSend.call(this, fakeData);

                        case 'ALLOW':
                        default:
                            self.stats.allowed++;
                            self.stats.total++;
                            console.log(`✅ [XHR拦截] ${this._method} ${this._url} - 必要功能已放行`);
                            return originalSend.apply(this, arguments);
                    }
                };

                return xhr;
            };

            // 保持原型链
            XMLHttpRequest.prototype = originalXHR.prototype;
            console.log('✅ XMLHttpRequest拦截已设置');
        }

        replaceHeaderIdentity(headers) {
            const identityHeaders = ['User-Agent', 'X-Machine-Id', 'X-Device-Id'];
            identityHeaders.forEach(header => {
                if (headers[header]) {
                    headers[header] = this.strategy.replaceWithFakeIdentity(headers[header]);
                }
            });
        }

        initializeAll() {
            this.interceptFetch();
            this.interceptXHR();
            console.log('✅ 网络拦截器初始化完成');
        }

        getStats() {
            return { ...this.stats };
        }
    }

    // ==================== 8. 完整拦截器管理器 ====================

    class CompleteInterceptorManager {
        constructor() {
            this.version = '3.6-complete';
            this.buildTime = new Date().toISOString();
            this.status = 'initializing';

            this.initialize();
        }

        async initialize() {
            try {
                console.log('[完整拦截器] 开始初始化...');

                // 1. 初始化身份管理器
                this.identityManager = new IdentityProfileManager();
                this.currentProfile = this.identityManager.getProfile();

                // 2. 初始化硬件生成器
                this.hardwareGenerator = new HardwareConfigGenerator(this.currentProfile);

                // 3. 初始化网络策略
                this.networkStrategy = new SmartNetworkStrategy(this.currentProfile);

                // 4. 初始化各种拦截器
                this.systemInfoInterceptor = new SystemInformationInterceptor(this.currentProfile, this.hardwareGenerator);
                this.fileSystemInterceptor = new FileSystemInterceptor(this.currentProfile);
                this.networkInterceptor = new NetworkInterceptor(this.currentProfile, this.networkStrategy);

                this.status = 'running';
                console.log('✅ 完整拦截器初始化完成');

                this.printStatus();

            } catch (error) {
                this.status = 'error';
                console.error('❌ 完整拦截器初始化失败:', error.message);
            }
        }

        printStatus() {
            console.log('\n' + '='.repeat(60));
            console.log('🛡️ Augment Code Extension 完整拦截器 v3.6');
            console.log('='.repeat(60));
            console.log(`状态: ${this.status}`);
            console.log(`身份ID: ${this.currentProfile.identifiers.machineId.substr(0, 8)}...`);
            console.log(`硬件模板: ${Object.keys(HARDWARE_TEMPLATES).find(key =>
                HARDWARE_TEMPLATES[key] === this.hardwareGenerator.selectedTemplate) || 'unknown'}`);
            console.log(`主机名: ${this.currentProfile.system.hostname}`);
            console.log(`用户名: ${this.currentProfile.system.username}`);
            console.log('='.repeat(60));
            console.log('🚀 完整隐私保护功能已激活！');
            console.log('✅ 40+ 硬件数据点完全伪造');
            console.log('✅ 智能网络策略已启用');
            console.log('✅ SystemInformation库完全拦截');
            console.log('✅ 文件系统隐私保护已启用');
            console.log('='.repeat(60) + '\n');
        }

        getCompleteStatus() {
            return {
                version: this.version,
                status: this.status,
                buildTime: this.buildTime,
                uptime: Date.now() - new Date(this.buildTime).getTime(),
                profile: {
                    identityId: this.currentProfile.identifiers.machineId.substr(0, 8) + '...',
                    hostname: this.currentProfile.system.hostname,
                    username: this.currentProfile.system.username,
                    hardwareTemplate: Object.keys(HARDWARE_TEMPLATES).find(key =>
                        HARDWARE_TEMPLATES[key] === this.hardwareGenerator.selectedTemplate) || 'unknown'
                },
                components: {
                    identityManager: !!this.identityManager,
                    hardwareGenerator: !!this.hardwareGenerator,
                    networkStrategy: !!this.networkStrategy,
                    systemInfoInterceptor: !!this.systemInfoInterceptor,
                    fileSystemInterceptor: !!this.fileSystemInterceptor,
                    networkInterceptor: !!this.networkInterceptor
                }
            };
        }

        getAllStats() {
            return {
                network: this.networkInterceptor ? this.networkInterceptor.getStats() : {},
                profile: this.currentProfile ? {
                    identifiers: Object.keys(this.currentProfile.identifiers).length,
                    system: Object.keys(this.currentProfile.system).length,
                    hardware: Object.keys(this.currentProfile.hardware).length,
                    filesystem: Object.keys(this.currentProfile.filesystem).length,
                    software: Object.keys(this.currentProfile.software).length
                } : {}
            };
        }

        resetIdentity() {
            if (this.identityManager) {
                const newProfile = this.identityManager.resetProfile();
                this.currentProfile = newProfile;
                console.log('[完整拦截器] 身份已重置，新ID:', newProfile.identifiers.machineId.substr(0, 8) + '...');
                return newProfile;
            }
        }

        restart() {
            console.log('[完整拦截器] 正在重启...');
            this.status = 'restarting';
            setTimeout(() => {
                this.initialize();
            }, 1000);
        }

        shutdown() {
            console.log('[完整拦截器] 正在关闭...');
            this.status = 'shutdown';
        }
    }

    // ==================== 9. 初始化和导出 ====================

    // 创建完整拦截器管理器
    const completeManager = new CompleteInterceptorManager();

    // 导出到全局作用域
    const AugmentCompleteInterceptor = {
        version: '3.6-complete',
        manager: completeManager,

        // 状态方法
        getStatus: () => completeManager.getCompleteStatus(),
        getStats: () => completeManager.getAllStats(),

        // 控制方法
        restart: () => completeManager.restart(),
        shutdown: () => completeManager.shutdown(),

        // 快捷访问
        getProfile: () => completeManager.currentProfile,
        getHardwareInfo: () => completeManager.hardwareGenerator ? {
            template: Object.keys(HARDWARE_TEMPLATES).find(key =>
                HARDWARE_TEMPLATES[key] === completeManager.hardwareGenerator.selectedTemplate),
            cpu: completeManager.hardwareGenerator.generateCpuInfo(),
            memory: completeManager.hardwareGenerator.generateMemoryInfo(),
            system: completeManager.hardwareGenerator.generateSystemInfo()
        } : null,

        // 工具方法
        resetIdentity: () => completeManager.resetIdentity(),

        // 测试方法
        test: () => {
            console.log('🧪 [测试] 开始完整拦截功能测试...');

            // 测试系统信息拦截
            try {
                const os = require('os');
                console.log('🧪 [测试] hostname:', os.hostname());
                console.log('🧪 [测试] userInfo:', os.userInfo().username);
            } catch (e) {
                console.log('🧪 [测试] OS拦截测试失败:', e.message);
            }

            // 测试SystemInformation拦截
            try {
                const si = require('systeminformation');
                si.system().then(data => {
                    console.log('🧪 [测试] SystemInformation拦截成功:', data.manufacturer);
                }).catch(() => {
                    console.log('🧪 [测试] SystemInformation库未安装，跳过测试');
                });
            } catch (e) {
                console.log('🧪 [测试] SystemInformation库未安装，跳过测试');
            }

            // 测试网络拦截
            console.log('🧪 [测试] 模拟遥测请求拦截...');
            fetch('https://api.segment.io/v1/batch', {
                method: 'POST',
                body: JSON.stringify({test: 'data'})
            }).catch(() => {
                console.log('🧪 [测试] 网络拦截测试完成');
            });

            console.log('🧪 [测试] 完整拦截功能测试完成，请查看上方日志');
        },

        // 帮助信息
        help: () => {
            console.log(`
🛡️ Augment Code 完整拦截器 v3.6 - 可用命令:

📊 状态查询:
  AugmentCompleteInterceptor.getStatus()      - 获取拦截器状态
  AugmentCompleteInterceptor.getStats()       - 获取拦截统计
  AugmentCompleteInterceptor.getProfile()     - 获取身份配置文件
  AugmentCompleteInterceptor.getHardwareInfo() - 获取硬件信息

🧪 测试功能:
  AugmentCompleteInterceptor.test()           - 测试拦截功能

🔧 控制:
  AugmentCompleteInterceptor.resetIdentity()  - 重置身份
  AugmentCompleteInterceptor.restart()        - 重启拦截器
  AugmentCompleteInterceptor.shutdown()       - 关闭拦截器
  AugmentCompleteInterceptor.help()           - 显示此帮助信息

🛡️ 功能特性:
  ✅ 40+ 硬件数据点完全伪造
  ✅ 智能网络策略（分层决策）
  ✅ SystemInformation库完全拦截
  ✅ 文件系统隐私保护
  ✅ 身份信息一致性保证
            `);
        }
    };

    // 环境检测和全局对象赋值
    const globalScope = (function() {
        if (typeof global !== 'undefined') return global;
        if (typeof window !== 'undefined') return window;
        if (typeof self !== 'undefined') return self;
        return {};
    })();

    globalScope.AugmentCompleteInterceptor = AugmentCompleteInterceptor;

    // 模块导出
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AugmentCompleteInterceptor;
    }

    console.log('🎉 Augment Code Extension 完整拦截器 v3.6 加载完成！');

})();
