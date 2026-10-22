# 日序 Daymark

日序是一款完全本地运行的 Windows 桌面待办应用。任务、分类、设置和提醒时间保存在本机 SQLite 数据库中，核心功能不需要网络、账号或云服务。

## 已实现功能

- 收集箱、今天、未来 7 天、全部待办、已完成和分类视图
- 任务创建、编辑、完成、重新打开、软删除、优先级、截止时间、提醒和描述
- 同一任务可设置每天、工作日、每周、每月或自定义天数的循环提醒
- 一级子任务与分类管理；删除分类时任务自动移入收集箱
- 任务标题搜索、`Ctrl+K` 搜索/命令面板、`Ctrl+N` 新建任务
- 浅色、深色和跟随系统主题
- 无系统菜单栏的无边框窗口、自定义拖拽区和窗口控制按钮
- 以日出、地平线和远山为核心意象的品牌图标与小尺寸单色版本
- 设置页可打开当前窗口的独立开发者工具
- 系统托盘、单实例运行、可配置全局快捷键、快速添加窗口
- 应用运行期间的 Windows 桌面提醒与去重
- SQLite 安全备份、完整性验证、恢复前应急备份和失败回滚
- UTF-8 JSON / CSV 导出
- SQLite 迁移、Zod IPC 校验、Electron 进程隔离和受限 preload API

## 环境要求

- Windows 10 或更新版本
- Node.js 20 或更新版本
- Yarn 1.22

目标用户运行 ZIP 发布包时不需要安装 Node.js。

## 开发

```powershell
yarn install
yarn dev
```

首次安装会下载 Electron 和 better-sqlite3。项目 `.npmrc` 已配置可访问的二进制镜像；原生模块脚本会根据当前 Electron 版本安装匹配的预编译文件。

开发模式下，`src/renderer` 的 React 组件支持 Fast Refresh，CSS 与资源支持 HMR；修改 `src/main` 或 `src/preload` 时，开发脚本会重启 Electron。`release` 中的生产构建不会自动热更新。

## 检查与测试

```powershell
yarn run check
yarn check:native
```

Yarn 1.22 把裸命令 `yarn check` 保留为内置锁文件检查，因此应使用 `yarn run check` 执行项目的格式、静态检查和全部测试。`yarn test` 在 Electron 的 Node 运行时中执行 Vitest，因此测试使用与应用相同的原生 SQLite ABI。测试只创建临时数据库，不读取真实用户数据。

## 生产构建、快捷 ZIP 与安装包

```powershell
yarn build
yarn package:win
yarn dist:win
```

- `yarn build` 生成 `dist/main`、`dist/preload` 和 `dist/renderer`。
- `yarn package:win` 生成 `release/win-unpacked/日序.exe`。
- `yarn dist:win` 同时生成：
    - 快捷 ZIP：`release/Daymark-1.0.0-win-x64.zip`
    - Windows 安装包：`release/Daymark-Setup-1.0.0-x64.exe`

安装包允许选择安装目录，并创建桌面和开始菜单快捷方式；卸载应用不会删除本地任务数据库和备份。

## 快捷键

| 操作            | 默认快捷键       |
| --------------- | ---------------- |
| 显示/隐藏主窗口 | `Ctrl+Alt+T`     |
| 快速添加任务    | `Ctrl+Alt+Space` |
| 搜索/命令面板   | `Ctrl+K`         |
| 新建任务        | `Ctrl+N`         |
| 关闭弹窗        | `Escape`         |

全局快捷键可以在“设置与数据”中修改。若组合被系统或其他应用占用，日序会提示冲突并恢复原快捷键。

## 本地数据

默认数据目录：

```text
%APPDATA%\daymark\data\daymark.sqlite
```

默认备份目录：

```text
%APPDATA%\daymark\backups
```

实际路径始终显示在“设置与数据”页面。程序升级不会写入、覆盖或删除这些目录。

恢复流程会先验证所选文件的 SQLite 完整性与 schema 版本，再为当前数据库生成应急备份。只有用户确认后才替换数据；恢复失败会自动回滚。

## 提醒边界

提醒由 Electron 主进程在应用运行期间检查。应用完全退出、Windows 关机或进程被结束后，日序不能继续可靠发送提醒。Windows 通知权限和专注助手也可能影响提醒展示。

## 架构

```text
React Renderer
    -> contextBridge preload
    -> Zod-validated IPC
    -> Main services / repositories
    -> better-sqlite3
```

Renderer 不直接访问 Node.js、文件系统、SQLite 或通用 IPC 通道。所有任务筛选与本地日期边界都在主进程实现。

源码按进程边界组织：`src/main` 负责 Electron 主进程系统能力，`src/preload` 只暴露业务 API，`src/renderer` 包含全部页面与界面资源；`core` 存放可独立测试的数据、校验、IPC 和业务服务。

## 关键目录

```text
configs/rspack/     三套 Rspack 构建配置
core/database/      SQLite 连接、迁移和 repository
core/ipc/           受限 IPC handler
core/services/      任务、提醒、备份、导出和设置业务逻辑
src/main/           窗口、托盘、快捷键、通知和安全策略
src/preload/        受限 contextBridge API
src/renderer/       React 页面、组件、状态、样式和渲染进程服务
tests/              单元与真实 SQLite 集成测试
scripts/            开发、构建、原生模块和 ZIP 脚本
```

## 已知限制

- 应用完全退出后不能发送提醒。
- 首版不支持重复任务、自然语言日期、标签、云同步或拖拽排序。
- 当前发布包未执行代码签名，因此 Windows SmartScreen 可能显示未知发布者提示。
- 原生模块已在本机构建环境验证；发布到其他 Windows 环境前仍应执行一次目录运行检查。
