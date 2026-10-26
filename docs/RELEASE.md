# 日序 Daymark 1.0.0 发布说明

## 交付内容

- Windows x64 目录构建与便携 ZIP
- 完全本地 SQLite 数据库
- 任务、分类、子任务、视图、搜索、快捷添加
- 提醒、已提醒状态与逾期状态的独立标记
- 每分钟、每小时、每天、工作日、每周、每月与自定义分钟/小时/天/月/年循环提醒
- 表单日期与时间选择器点击输入框即可展开下拉
- 无边框窗口、自定义拖拽区和窗口控制按钮
- 列表与详情共享工作区顶栏，窗口按钮固定在右上角顶边
- Windows 系统通知来源与标题统一显示为“日序”
- 日出、地平线和远山品牌图标及多分辨率 Windows 图标
- `src/main`、`src/preload`、`src/renderer` 的进程边界目录结构
- 系统托盘、全局快捷键、桌面提醒
- 数据库备份、恢复、JSON/CSV 导出
- 浅色/深色/跟随系统主题

## 数据位置

默认数据库：

```text
%APPDATA%\daymark\data\daymark.sqlite
```

默认备份：

```text
%APPDATA%\daymark\backups
```

ZIP 包不包含数据库、备份、导出文件、日志或用户设置。

## 发布包

- 目录版：`release/win-unpacked/日序.exe`
- 快捷 ZIP：`release/Daymark-1.0.0-win-x64.zip`
    - 大小：130,191,987 字节
    - SHA-256：`8E7B5A4E0F62F0BB557FA987B61E22EB60527BC44BFB2DB1619E1E99E86D5CE9`
- Windows 安装包：`release/Daymark-Setup-1.0.0-x64.exe`
    - 大小：89,578,211 字节
    - SHA-256：`0B8D1DDB70C24513C4FA7F5149D8736F277287CD1E492D2AD2F010CBC44E31CC`
    - 支持选择安装目录，创建桌面和开始菜单快捷方式
    - 卸载时保留用户数据库与备份

## 安全说明

- Renderer 启用 `contextIsolation`、关闭 `nodeIntegration` 并启用 sandbox。
- Preload 只暴露业务级方法，不提供通用 IPC 或文件系统接口。
- IPC 参数由 Zod 校验。
- 外部窗口打开与页面导航默认拒绝。
- 恢复前创建应急备份，验证失败不会覆盖当前数据库。

## 提醒限制

只有在日序进程运行时，提醒才会发送。完全退出应用后，Electron 定时器不能继续工作。Windows 专注助手和通知权限也影响通知展示。

提醒送达后任务会标记为“已提醒”，该状态不等于完成，也不影响逾期判断；关闭提醒弹窗不会自动推迟提醒时间。每分钟循环提醒按主进程检查间隔（默认 30 秒）合并处理。

## 签名状态

快捷 ZIP 和安装包均未进行代码签名。Windows SmartScreen 可能提示“未知发布者”。本项目不声称已通过 SmartScreen 验证。
