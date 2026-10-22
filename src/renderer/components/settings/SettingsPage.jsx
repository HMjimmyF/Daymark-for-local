import { useEffect, useState } from 'react'
import { Archive, Bell, Code2, Database, Download, FolderOpen, Keyboard, Palette, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { api } from '@/services/daymark'
import { useAppStore } from '@/stores/app-store'
import brandIcon from '@brand/brand-icon.svg'

const themes = [
    { id: 'light', label: '浅色' },
    { id: 'system', label: '跟随系统' },
    { id: 'dark', label: '深色' }
]

function SettingRow({ title, description, children }) {
    return (
        <div className="setting-row">
            <div>
                <div className="setting-title">{title}</div>
                {description && <div className="setting-description">{description}</div>}
            </div>
            {children}
        </div>
    )
}

export function SettingsPage({ settings, onSettingsChanged, onReload }) {
    const [toggleShortcut, setToggleShortcut] = useState(settings?.toggleShortcut || '')
    const [quickAddShortcut, setQuickAddShortcut] = useState(settings?.quickAddShortcut || '')
    const [reminderStatus, setReminderStatus] = useState(null)
    const [busy, setBusy] = useState('')
    const showToast = useAppStore((state) => state.showToast)

    useEffect(() => {
        setToggleShortcut(settings?.toggleShortcut || '')
        setQuickAddShortcut(settings?.quickAddShortcut || '')
    }, [settings?.toggleShortcut, settings?.quickAddShortcut])

    useEffect(() => {
        api.reminders
            .status()
            .then(setReminderStatus)
            .catch(() => setReminderStatus(null))
    }, [])

    if (!settings) {
        return null
    }

    const save = async (patch, successMessage = '设置已保存') => {
        setBusy('setting')
        try {
            const next = await api.settings.update(patch)
            onSettingsChanged?.(next)
            showToast(successMessage)
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setBusy('')
        }
    }

    const saveShortcuts = async () => {
        await save({ toggleShortcut, quickAddShortcut }, '快捷键已更新')
    }

    const createBackup = async () => {
        setBusy('backup')
        try {
            const result = await api.backup.create()
            showToast(`备份完成：${result.path}`)
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setBusy('')
        }
    }

    const restore = async () => {
        setBusy('restore')
        try {
            const result = await api.backup.restore()
            if (!result.cancelled) {
                showToast('数据恢复完成，界面已刷新')
                onReload()
            }
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setBusy('')
        }
    }

    const exportData = async (type) => {
        setBusy(`export-${type}`)
        try {
            const result = type === 'json' ? await api.exportData.json() : await api.exportData.csv()
            if (!result.cancelled) {
                showToast(`已导出到：${result.path}`)
            }
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setBusy('')
        }
    }

    const chooseBackupDirectory = async () => {
        try {
            const result = await api.backup.chooseDirectory()
            if (!result.cancelled) {
                showToast('备份位置已更新')
                onSettingsChanged?.(result.settings)
                onReload()
            }
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    const openDataFolder = async (kind) => {
        try {
            await api.data.openFolder(kind)
        } catch (error) {
            showToast(error.message, 'error')
        }
    }

    const openDevTools = async () => {
        setBusy('devtools')
        try {
            await api.windows.openDevTools()
            showToast('开发者工具已打开')
        } catch (error) {
            showToast(error.message, 'error')
        } finally {
            setBusy('')
        }
    }

    return (
        <div className="settings-page">
            <section className="settings-section">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Palette size={16} /> 外观
                </h3>
                <p className="settings-section-copy">主题会立即应用，并只保存在本机。</p>
                <div className="theme-options">
                    {themes.map((theme) => (
                        <button
                            type="button"
                            key={theme.id}
                            className={`theme-option ${settings.theme === theme.id ? 'active' : ''}`}
                            onClick={() => save({ theme: theme.id }, `已切换为${theme.label}主题`)}
                        >
                            <span className={`theme-preview ${theme.id}`} />
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{theme.label}</span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="settings-section">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Keyboard size={16} /> 窗口与快捷键
                </h3>
                <p className="settings-section-copy">快捷键由系统全局注册，若被其他应用占用会提示冲突并保留原设置。</p>
                <SettingRow title="关闭主窗口时最小化到托盘" description="应用将继续在托盘中运行，提醒也可以继续发送。">
                    <Switch checked={settings.closeToTray} onCheckedChange={(checked) => save({ closeToTray: checked })} aria-label="关闭到托盘" />
                </SettingRow>
                <SettingRow title="启动时隐藏主窗口" description="适合开机启动后在后台记录任务。">
                    <Switch checked={settings.startMinimized} onCheckedChange={(checked) => save({ startMinimized: checked })} aria-label="启动时隐藏主窗口" />
                </SettingRow>
                <SettingRow title="显示/隐藏主窗口">
                    <Input
                        className="shortcut-input"
                        value={toggleShortcut}
                        onChange={(event) => setToggleShortcut(event.target.value)}
                        aria-label="显示主窗口快捷键"
                    />
                </SettingRow>
                <SettingRow title="快速添加任务">
                    <Input
                        className="shortcut-input"
                        value={quickAddShortcut}
                        onChange={(event) => setQuickAddShortcut(event.target.value)}
                        aria-label="快速添加快捷键"
                    />
                </SettingRow>
                {(settings.shortcutStatus?.toggle === 'conflict' || settings.shortcutStatus?.quickAdd === 'conflict') && (
                    <div className="setting-description" style={{ color: 'hsl(var(--danger))', marginTop: 7 }}>
                        {settings.shortcutStatus.toggle === 'conflict' ? '显示/隐藏快捷键' : '快速添加快捷键'}已被其他应用占用。请修改后保存。
                    </div>
                )}
                <div className="button-row" style={{ marginTop: 12 }}>
                    <Button onClick={saveShortcuts} disabled={busy === 'setting'}>
                        保存快捷键
                    </Button>
                    <span className="setting-description" style={{ alignSelf: 'center' }}>
                        应用内：Ctrl+K 搜索，Ctrl+N 新建
                    </span>
                </div>
            </section>

            <section className="settings-section">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={16} /> 提醒
                </h3>
                <SettingRow title="启用桌面提醒" description={reminderStatus?.exitedAppLimitation || '应用运行期间会检查到期提醒。'}>
                    <Switch checked={settings.reminderEnabled} onCheckedChange={(checked) => save({ reminderEnabled: checked })} aria-label="启用桌面提醒" />
                </SettingRow>
                <div className="setting-description" style={{ marginTop: 8 }}>
                    Windows 专注助手或通知权限可能影响通知展示。完全退出应用后不会继续提醒。
                </div>
                <div className="button-row" style={{ marginTop: 12 }}>
                    <Button
                        variant="secondary"
                        onClick={async () => {
                            const result = await api.reminders.checkNow()
                            showToast(result.delivered ? `已发送 ${result.delivered} 条提醒` : '当前没有到期提醒')
                        }}
                    >
                        <RefreshCw size={14} />
                        立即检查
                    </Button>
                </div>
            </section>

            <section className="settings-section">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Database size={16} /> 本地数据
                </h3>
                <p className="settings-section-copy">任务只保存在 SQLite 数据库中。升级程序不会覆盖这里的用户数据。</p>
                <div className="field-label">数据库位置</div>
                <div className="data-path" title={settings.databasePath}>
                    {settings.databasePath}
                </div>
                <div className="field-label" style={{ marginTop: 12 }}>
                    备份位置
                </div>
                <div className="data-path" title={settings.actualBackupDirectory}>
                    {settings.actualBackupDirectory}
                </div>
                <div className="button-row" style={{ marginTop: 12 }}>
                    <Button variant="secondary" onClick={() => openDataFolder('data')}>
                        <FolderOpen size={14} /> 打开数据目录
                    </Button>
                    <Button variant="secondary" onClick={chooseBackupDirectory}>
                        <FolderOpen size={14} /> 更改备份位置
                    </Button>
                </div>
            </section>

            <section className="settings-section">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={16} /> 备份、恢复与导出
                </h3>
                <p className="settings-section-copy">恢复前会验证数据库完整性，并为当前数据创建应急备份。</p>
                <div className="button-row">
                    <Button onClick={createBackup} disabled={busy === 'backup'}>
                        <Archive size={14} /> {busy === 'backup' ? '备份中…' : '立即备份'}
                    </Button>
                    <Button variant="secondary" onClick={restore} disabled={busy === 'restore'}>
                        {busy === 'restore' ? '恢复中…' : '从备份恢复'}
                    </Button>
                    <Button variant="secondary" onClick={() => exportData('json')} disabled={busy === 'export-json'}>
                        <Download size={14} /> 导出 JSON
                    </Button>
                    <Button variant="secondary" onClick={() => exportData('csv')} disabled={busy === 'export-csv'}>
                        <Download size={14} /> 导出 CSV
                    </Button>
                </div>
            </section>

            <section className="settings-section">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Code2 size={16} /> 开发者工具
                </h3>
                <p className="settings-section-copy">用于检查界面元素、网络与运行日志。开发者工具会在独立窗口中打开。</p>
                <Button variant="secondary" onClick={openDevTools} disabled={busy === 'devtools'}>
                    <Code2 size={14} />
                    {busy === 'devtools' ? '正在打开…' : '打开开发者工具'}
                </Button>
            </section>

            <section className="settings-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                    <h3>日序 Daymark</h3>
                    <p className="settings-section-copy" style={{ margin: 0 }}>
                        版本 {settings.version} · 离线优先，本地保存
                    </p>
                </div>
                <img className="brand-mark" src={brandIcon} width="38" height="38" alt="" />
            </section>
        </div>
    )
}
