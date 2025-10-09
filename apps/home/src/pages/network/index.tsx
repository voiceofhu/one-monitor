import { useTranslation } from "react-i18next"

function Network() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("network") || "网络"}</h1>
        <p className="text-muted-foreground">
          {t("network_description") || "查看网络状态和流量信息"}
        </p>
      </div>
      
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold mb-4">网络状态</h2>
        <p className="text-muted-foreground">
          网络功能正在开发中...
        </p>
      </div>
    </div>
  )
}

export default Network
