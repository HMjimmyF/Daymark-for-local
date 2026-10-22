# AGENTS.md

本文件为参与日序 Daymark 开发的 AI coding agent 提供仓库级上下文和执行规则。它遵循 [AGENTS.md](https://agents.md/) 开放格式：根目录文件作用于整个仓库；若未来出现更靠近目标文件的嵌套 `AGENTS.md`，以最近者为准。用户当前对话中的明确要求优先于本文件。

## 项目概览

日序 Daymark 是一款 Windows 桌面待办应用，核心要求是：

- 完全本地运行，无账号、云同步、遥测、广告或远程 API 依赖。
- 使用 Electron、React、Rspack、JavaScript（`.js` / `.jsx`）、Tailwind CSS 和 SQLite。
- 使用 `better-sqlite3`，数据库只能由 Electron 主进程访问。
- 生成可由 Windows 解压运行的便携 ZIP，最终用户无需安装 Node.js。
- 正确性优先于视觉扩展，数据安全优先于便利性。

产品与工程基线还记录在 `README.md`、`docs/RELEASE.md` 和 `docs/ACCEPTANCE.md` 中；修改行为、限制或交付方式时应同步更新相关文档。

## 目录边界

```text
src/
├── main/       Electron 主进程入口、窗口、托盘、快捷键、通知和安全策略
├── preload/    contextBridge 业务 API，仅暴露白名单方法
└── renderer/   React 页面、组件、hooks、客户端状态、样式和渲染进程服务

core/
├── database/   SQLite 连接、迁移和 repository
├── ipc/        主进程 IPC handler
├── lib/        可复用纯逻辑
├── services/   任务、分类、设置、提醒、备份和导出业务规则
└── validation/ Zod 输入模型

configs/rspack/  main、preload、renderer 三套独立构建配置
tests/             单元与真实 SQLite 集成测试
resources/         品牌图标、应用 ICO 和托盘资源
scripts/           开发、构建、原生模块、图标和打包脚本
```

- `src` 一级目录必须保持为 `main`、`preload`、`renderer`。
- 所有渲染进程页面与界面资源必须位于 `src/renderer`。
- 不要把数据库、业务服务或 IPC handler 重新放回 `src/main`；它们属于 `core`。
- 不要创建绕过目录边界的第二套并行实现。

## 常用命令

```powershell
# 安装依赖（只使用 Yarn，不生成 npm/pnpm 锁文件）
yarn install --frozen-lockfile

# 开发
yarn dev

# 完整格式、静态检查和测试
yarn run check

# Electron 运行时下的原生 SQLite 冒烟检查
yarn check:native

# 生产构建
yarn build

# Windows 目录版
yarn package:win

# Windows 目录版、ZIP 和 SHA-256
yarn dist:win

# 从 resources 中的 SVG/几何定义重新生成 PNG、托盘图和 ICO
yarn icons
```

Yarn 1.22 将裸命令 `yarn check` 保留为内置锁文件检查，因此质量检查必须使用 `yarn run check`。不要用 `npm install` 或 `pnpm install` 代替 Yarn。

## 编码规范

- 使用 JavaScript 和 JSX，不引入 TypeScript。
- 遵循 `.prettierrc`：单引号、无分号、4 空格、行宽 160、LF。
- Biome 负责通用 lint，ESLint 负责 React Hooks 与组件刷新规则；不要通过关闭整套规则规避错误。
- React 使用函数组件和 Hooks。共享客户端 UI 状态使用 Zustand，持久业务状态以 SQLite/API 为准。
- 图标统一使用 `lucide-react`，品牌图形使用 `resources` 中的日序资产。
- 组件源码进入仓库内，沿用现有 shadcn/ui 风格和 CSS 设计令牌；不要在页面散落近似颜色。
- 新逻辑优先放入 `core` 的可测试函数或 service；不要把 SQL、日期边界或业务规则复制到页面。

## 架构与安全约束

调用链必须保持为：

```text
React Renderer
  -> contextBridge preload
  -> Zod-validated IPC
  -> Main service / repository
  -> better-sqlite3
```

- Renderer 不得导入 `fs`、`path`、`child_process`、`better-sqlite3` 或任意 Node API。
- `contextIsolation: true`、`nodeIntegration: false` 和 `sandbox: true` 不得关闭。
- 不暴露通用 `ipcRenderer.send/invoke`、SQL 执行接口、原始数据库连接或任意文件读写接口。
- 每个新的 IPC 参数必须通过 Zod 或同等级校验，并统一返回 `{ ok, data }` / `{ ok, error }`。
- 文件对话框只能由主进程发起；不要接受 Renderer 传入的任意文件路径。
- 窗口导航和新窗口默认拒绝，生产渲染器不得加载远程页面。
- 用户错误信息不得包含堆栈、SQL 参数、绝对路径或其他内部细节。
- 不增加遥测、远程日志、网络请求、自动更新或后台常驻计划任务，除非用户明确要求并完成安全设计。

## 数据与产品不变量

- 所有“今天”“未来 7 天”等本地日历边界由主进程统一计算；未来 7 天包含今天，共 7 个自然日。
- 时间以 ISO 8601 存储；绝对时间入库前统一转换为 UTC。
- 任务标题必填、去除首尾空白并限制长度；优先级只能为 0–3。
- 任务删除为软删除；删除父任务时同步软删除其一级子任务。
- 子任务只允许一级，禁止自引用和二级嵌套。
- 删除分类不得删除任务；任务必须移入收集箱。
- 已完成、已删除或已软删除的任务不得触发提醒。
- 提醒只在应用运行期间可靠工作，不得宣称退出应用或关机后仍会提醒。
- 恢复数据库前必须验证文件、生成应急备份，并在失败时回滚。
- 迁移只能追加和递增版本；禁止在启动时删除并重建用户数据库。
- 用户数据库、备份、导出文件和日志不得进入构建产物或 ZIP。

## 窗口与品牌约定

- 主窗口和快速添加窗口均为无边框窗口，不恢复 Electron 原生标题栏或应用菜单。
- 自定义拖拽区必须保留；交互控件必须设置 `-webkit-app-region: no-drag`。
- 最小化、最大化/还原和关闭通过受限 preload API 控制；关闭行为遵循“关闭到托盘”设置。
- 最小窗口尺寸为 800×560；窗口变窄时优先隐藏或覆盖详情面板，不得遮挡窗口控制按钮。
- 品牌图形以日出、地平线和远山为共同意象。应用 ICO、托盘和界面 Logo 应保持来源一致。
- 修改品牌图形时更新 `resources/` 中的 SVG 与生成脚本，并运行 `yarn icons`；不要只替换某一个尺寸。

## 测试要求

- 业务规则、日期边界、校验、导出和状态转换必须有单元测试。
- Repository、迁移、备份、恢复和提醒去重必须有使用临时 SQLite 的集成测试。
- 测试不得读取、写入或删除开发者的真实用户数据库。
- 测试通过 `scripts/run-vitest.js` 在 Electron Node 运行时中执行，以匹配原生 SQLite ABI。
- 修改 UI、窗口、托盘、快捷键或图标后，至少验证生产构建；涉及桌面交互时启动实际窗口或目录版检查。
- 修改打包配置、原生模块或资源后，必须验证 `release/win-unpacked/日序.exe`，并在交付前确认 ZIP 可解压启动。

## 完成定义

在结束任务前：

1. 运行与改动范围相关的测试。
2. 运行 `yarn run check`。
3. 修改构建或桌面集成时运行 `yarn build`，并做相应的实际启动检查。
4. 修改发布内容时运行 `yarn dist:win`，更新 `docs/RELEASE.md` 与 `docs/ACCEPTANCE.md` 中的版本、大小、SHA-256 和真实验证结果。
5. 如实报告未执行、未通过或受环境限制的项目，不把“构建成功”视为功能验收完成。

不要提交 `node_modules/`、`dist/`、`release/`、临时测试数据库、日志或真实用户数据。保留工作区中与当前任务无关的用户修改。
