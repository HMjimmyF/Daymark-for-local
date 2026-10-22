# 日序 Daymark 1.0.0 发布说明

## 交付内容

- Windows x64 目录构建与便携 ZIP
- 完全本地 SQLite 数据库
- 任务、分类、子任务、视图、搜索、快捷添加
- 无边框窗口、自定义拖拽区和窗口控制按钮
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
- 便携包：`release/Daymark-1.0.0-win-x64.zip`
- ZIP 大小：130,127,700 字节
- SHA-256：`CA77D56F3C6D8451305FD7C7BCECDE5A4B25C266AD12E71139D9968FB9973D1E`

## 安全说明

- Renderer 启用 `contextIsolation`、关闭 `nodeIntegration` 并启用 sandbox。
- Preload 只暴露业务级方法，不提供通用 IPC 或文件系统接口。
- IPC 参数由 Zod 校验。
- 外部窗口打开与页面导航默认拒绝。
- 恢复前创建应急备份，验证失败不会覆盖当前数据库。

## 提醒限制

只有在日序进程运行时，提醒才会发送。完全退出应用后，Electron 定时器不能继续工作。Windows 专注助手和通知权限也影响通知展示。

## 签名状态

当前构建未进行代码签名。Windows SmartScreen 可能提示“未知发布者”。本项目不声称已通过 SmartScreen 验证。
