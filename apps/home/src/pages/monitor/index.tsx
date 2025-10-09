import { useTranslation } from "react-i18next"

function Monitor() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("monitor") || "监控"}</h1>
        <p className="text-muted-foreground">
          {t("monitor_description") || "查看系统监控信息和性能指标"}
        </p>
      </div>
      
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold mb-4">监控面板</h2>
        <p className="text-muted-foreground">
          监控功能正在开发中...
        </p>
      </div>
    </div>
  )
}

export default Monitor
