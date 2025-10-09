import { ModeToggle } from "@/components/ThemeSwitcher"
import { Skeleton } from "@/components/ui/skeleton"
import { useBackground } from "@/hooks/use-background"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { fetchLoginUser, fetchSetting } from "@/lib/nezha-api"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, m } from "framer-motion"
import { ImageMinus } from "lucide-react"
import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { LanguageSwitcher } from "./LanguageSwitcher"
import { MobileHeaderMenu } from "./MobileHeaderMenu"
import { Navigation } from "./Navigation"
import { LoadingSpinner } from "./loading/Loader"
import { Button } from "./ui/button"

function Header() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { backgroundImage, updateBackground } = useBackground()

  const { data: settingData, isLoading } = useQuery({
    queryKey: ["setting"],
    queryFn: () => fetchSetting(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  const { lastMessage, connected } = useWebSocketContext()

  const onlineCount = connected ? (lastMessage ? JSON.parse(lastMessage.data).online || 0 : 0) : "..."

  const siteName = settingData?.data?.config?.site_name

  // @ts-expect-error CustomLogo is a global variable
  const customLogo = window.CustomLogo || "/apple-touch-icon.png"

  useEffect(() => {
    const link = document.querySelector("link[rel*='icon']") || document.createElement("link")
    // @ts-expect-error set link.type
    link.type = "image/x-icon"
    // @ts-expect-error set link.rel
    link.rel = "shortcut icon"
    // @ts-expect-error set link.href
    link.href = customLogo
    document.getElementsByTagName("head")[0].appendChild(link)
  }, [customLogo])

  useEffect(() => {
    document.title = siteName ?? ""
  }, [siteName])

  const handleBackgroundToggle = () => {
    if (window.CustomBackgroundImage) {
      // Store the current background image before removing it
      sessionStorage.setItem("savedBackgroundImage", window.CustomBackgroundImage)
      updateBackground(undefined)
    } else {
      // Restore the saved background image
      const savedImage = sessionStorage.getItem("savedBackgroundImage")
      if (savedImage) {
        updateBackground(savedImage)
      }
    }
  }

  const customBackgroundImage = backgroundImage

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* 左侧区域 */}
          <div className="flex items-center gap-4">
            {/* Logo和站点名称 */}
            <div
              onClick={() => {
                sessionStorage.removeItem("selectedGroup")
                navigate("/")
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="relative">
                <img
                  width={32}
                  height={32}
                  alt="logo"
                  src={customLogo}
                  className="h-8 w-8 rounded-lg object-cover transition-transform group-hover:scale-105"
                />
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-24 rounded-md" />
              ) : (
                <span className="text-lg font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">{siteName || ""}</span>
              )}
            </div>

            {/* 桌面端导航 */}
            <div className="hidden lg:block">
              <Navigation />
            </div>
          </div>

          {/* 右侧控制区域 */}
          <div className="flex items-center gap-2">
            {/* 在线状态 */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
              <div
                className={cn("h-2 w-2 rounded-full", {
                  "bg-green-500 animate-pulse": connected,
                  "bg-red-500": !connected,
                })}
              />
              <span className="text-sm font-medium">{connected ? onlineCount : "..."}</span>
              <span className="hidden sm:inline text-xs text-muted-foreground">{connected ? t("online") : t("offline")}</span>
            </div>

            {/* 桌面端功能按钮 */}
            <div className="hidden md:flex items-center gap-1">
              <Links />
              <DashboardLink />

              {/* 背景切换按钮 */}
              {(customBackgroundImage || sessionStorage.getItem("savedBackgroundImage")) && (
                <Button variant="ghost" size="sm" onClick={handleBackgroundToggle} className="h-9 w-9 p-0" aria-label={t("toggle_background")}>
                  {/* @ts-expect-error React 19 type compatibility */}
                  <ImageMinus className="h-4 w-4" />
                </Button>
              )}

              <LanguageSwitcher />
              <ModeToggle />
            </div>

            {/* 移动端设置菜单 */}
            <div className="md:hidden">
              <MobileHeaderMenu customBackgroundImage={customBackgroundImage} handleBackgroundToggle={handleBackgroundToggle} />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

type links = {
  link: string
  name: string
}

function Links() {
  // @ts-expect-error CustomLinks is a global variable
  const customLinks = window.CustomLinks as string

  const links: links[] | null = customLinks ? JSON.parse(customLinks) : null

  if (!links) return null

  return (
    <>
      {links.map((link, index) => {
        return (
          <Button key={index} variant="ghost" size="sm" asChild className="h-9 px-3">
            <a href={link.link} target="_blank" rel="noopener noreferrer">
              <span className="truncate max-w-[100px]">{link.name}</span>
            </a>
          </Button>
        )
      })}
    </>
  )
}

export function RefreshToast() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { needReconnect } = useWebSocketContext()

  if (!needReconnect) {
    return null
  }

  if (needReconnect) {
    sessionStorage.removeItem("needRefresh")
    setTimeout(() => {
      navigate(0)
    }, 1000)
  }

  return (
    // @ts-expect-error React 19 type compatibility
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.8 }}
        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.8 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="fixed left-1/2 -translate-x-1/2 top-8 z-[999] flex items-center justify-between gap-4 rounded-[50px] border-[1px] border-solid bg-white px-2 py-1.5 shadow-xl shadow-black/5 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none"
      >
        <div className="flex items-center gap-1.5">
          <LoadingSpinner />
          <p className="text-[12.5px] font-medium">{t("refreshing")}...</p>
        </div>
      </m.div>
    </AnimatePresence>
  )
}

function DashboardLink() {
  const { t } = useTranslation()
  const { setNeedReconnect } = useWebSocketContext()
  const previousLoginState = useRef<boolean | null>(null)
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
      // 只有当登录状态发生变化时才设置needReconnect
      if (previousLoginState.current !== null && previousLoginState.current !== isLogin) {
        setNeedReconnect(true)
      }
      previousLoginState.current = isLogin
    }
  }, [isLogin])

  return (
    <Button variant="ghost" size="sm" asChild className="h-9 px-3">
      <a href={"/dashboard"} rel="noopener noreferrer">
        <span className="text-nowrap">
          {!isLogin && t("login")}
          {isLogin && t("dashboard")}
        </span>
      </a>
    </Button>
  )
}

export default Header
