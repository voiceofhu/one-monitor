import { Button } from "@/components/ui/button"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { fetchLoginUser } from "@/lib/nezha-api"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Activity, Globe, Home, ImageMinus, LogIn, Menu, Network, Settings, User, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

import { LanguageSwitcher } from "./LanguageSwitcher"
import { ModeToggle } from "./ThemeSwitcher"

interface MobileHeaderMenuProps {
  customBackgroundImage?: string
  handleBackgroundToggle: () => void
}

export function MobileHeaderMenu({ customBackgroundImage, handleBackgroundToggle }: MobileHeaderMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { setNeedReconnect } = useWebSocketContext()
  const previousLoginState = useRef<boolean | null>(null)

  // 导航项配置
  const navigationItems = [
    { key: "server", path: "/", label: t("servers"), icon: Home },
    { key: "monitor", path: "/monitor", label: t("monitor"), icon: Activity },
    { key: "network", path: "/network", label: t("network"), icon: Network },
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
    setIsOpen(false)
    sessionStorage.removeItem("selectedGroup")
  }

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/server")
    }
    return location.pathname === path
  }

  // 登录状态查询
  const {
    data: userData,
    isFetched,
    isLoadingError,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["login-user"],
    queryFn: () => fetchLoginUser(),
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    refetchInterval: 1000 * 30,
    retry: 0,
  })

  const isLogin = isError ? false : userData ? !!userData?.data?.id && !!document.cookie : false

  if (isLoadingError) {
    previousLoginState.current = isLogin
  }

  useEffect(() => {
    refetch()
  }, [document.cookie])

  useEffect(() => {
    if (isFetched || isError) {
      if (previousLoginState.current !== null && previousLoginState.current !== isLogin) {
        setNeedReconnect(true)
      }
      previousLoginState.current = isLogin
    }
  }, [isLogin])

  // @ts-expect-error CustomLinks is a global variable
  const customLinks = window.CustomLinks as string
  const links = customLinks ? JSON.parse(customLinks) : null

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      {/* @ts-expect-error React 19 type compatibility */}
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={t("menu")}>
          {/* @ts-expect-error React 19 type compatibility */}
          <Menu className="h-4 w-4" />
        </Button>
      </DrawerTrigger>

      {/* @ts-expect-error React 19 type compatibility */}
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left pb-4">
          {/* @ts-expect-error React 19 type compatibility */}
          <DrawerTitle className="flex items-center gap-2 text-lg font-semibold">
            {/* @ts-expect-error React 19 type compatibility */}
            <Settings className="w-5 h-5" />
            {t("menu")}
          </DrawerTitle>
          {/* @ts-expect-error React 19 type compatibility */}
          <DrawerDescription className="text-sm text-muted-foreground">{t("access_settings_and_links")}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6">
          {/* 导航部分 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {/* @ts-expect-error React 19 type compatibility */}
              <Globe className="w-4 h-4" />
              {t("navigation")}
            </h3>
            <div className="grid gap-2">
              {navigationItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <Button
                    key={item.key}
                    variant={isActivePath(item.path) ? "default" : "ghost"}
                    size="lg"
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "justify-start h-12 px-4 transition-all duration-200",
                      isActivePath(item.path) ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-secondary/80",
                    )}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* @ts-expect-error React 19 type compatibility */}
                      <IconComponent className="w-5 h-5" />
                      <div className="flex flex-col items-start flex-1">
                        <span className="text-base font-medium">{item.label}</span>
                        <span className="text-xs opacity-70">
                          {item.path === "/"
                            ? t("server_management")
                            : item.path === "/monitor"
                              ? t("performance_monitoring")
                              : item.path === "/network"
                                ? t("network_status")
                                : ""}
                        </span>
                      </div>
                      {isActivePath(item.path) && <div className="w-2 h-2 bg-primary-foreground rounded-full flex-shrink-0" />}
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* 账户部分 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {isLogin ? <User className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {t("account")}
            </h3>
            <Button
              variant="ghost"
              size="lg"
              className="w-full justify-start h-12 px-4"
              onClick={() => {
                window.open("/dashboard", "_blank", "noopener,noreferrer")
                setIsOpen(false)
              }}
            >
              <div className="flex items-center gap-3 w-full">
                {isLogin ? <User className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium">{!isLogin ? t("login") : t("dashboard")}</span>
                  <span className="text-xs text-muted-foreground">{!isLogin ? t("login_to_manage") : t("manage_servers")}</span>
                </div>
              </div>
            </Button>
          </div>

          <Separator />

          {/* 自定义链接 */}
          {links && links.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">{t("quick_links")}</h3>
                <div className="grid gap-2">
                  {links.map((link: { link: string; name: string }, index: number) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="lg"
                      className="w-full justify-start h-12 px-4"
                      onClick={() => {
                        window.open(link.link, "_blank", "noopener,noreferrer")
                        setIsOpen(false)
                      }}
                    >
                      <span className="text-base font-medium truncate">{link.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* 设置部分 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {/* @ts-expect-error React 19 type compatibility */}
              <Settings className="w-4 h-4" />
              {t("settings")}
            </h3>

            {/* 语言切换 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("language")}</label>
              <LanguageSwitcher />
            </div>

            {/* 主题切换 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("theme")}</label>
              <ModeToggle />
            </div>

            {/* 背景切换 */}
            {(customBackgroundImage || sessionStorage.getItem("savedBackgroundImage")) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("background")}</label>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    handleBackgroundToggle()
                    setIsOpen(false)
                  }}
                  className="w-full justify-start h-12 px-4"
                >
                  {/* @ts-expect-error React 19 type compatibility */}
                  <ImageMinus className="w-5 h-5 mr-3" />
                  <span className="text-base font-medium">{t("toggle_background")}</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="pt-4">
          {/* @ts-expect-error React 19 type compatibility */}
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              {/* @ts-expect-error React 19 type compatibility */}
              <X className="w-4 h-4 mr-2" />
              {t("close")}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
