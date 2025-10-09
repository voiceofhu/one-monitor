import { useQuery } from "@tanstack/react-query"
import React, { useEffect } from "react"
import { Route, BrowserRouter as Router, Routes } from "react-router-dom"

import { DashCommand } from "./components/DashCommand"
import ErrorBoundary from "./components/ErrorBoundary"
import Footer from "./components/Footer"
import Header, { RefreshToast } from "./components/Header"
import { useTheme } from "./hooks/use-theme"
import { fetchSetting } from "./lib/nezha-api"
import ErrorPage from "./pages/ErrorPage"
import ServerDetail from "./pages/ServerDetail"
import Monitor from "./pages/monitor"
import Network from "./pages/network"
import Server from "./pages/server"

const App: React.FC = () => {
  const { data: settingData, error } = useQuery({
    queryKey: ["setting"],
    queryFn: () => fetchSetting(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
  const { setTheme } = useTheme()
  // const [isCustomCodeInjected, setIsCustomCodeInjected] = useState(false)
  // const { backgroundImage: customBackgroundImage } = useBackground()

  useEffect(() => {
    if (settingData?.data?.config?.custom_code) {
      // InjectContext(settingData?.data?.config?.custom_code)
      // setIsCustomCodeInjected(true)
    }
  }, [settingData?.data?.config?.custom_code])

  // 检测是否强制指定了主题颜色
  const forceTheme =
    // @ts-expect-error ForceTheme is a global variable
    (window.ForceTheme as string) !== "" ? window.ForceTheme : undefined

  useEffect(() => {
    if (forceTheme === "dark" || forceTheme === "light") {
      setTheme(forceTheme)
    }
  }, [forceTheme])

  if (error) {
    return <ErrorPage code={500} message={error.message} />
  }

  // if (settingData?.data?.config?.language && !localStorage.getItem("language")) {
  //   i18n.changeLanguage(settingData?.data?.config?.language)
  // }

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <main className="w-full h-[100dvh] max-h-screen fixed top-0 left-0 z-10 flex flex-col overflow-hidden">
          <RefreshToast />
          <Header />
          <DashCommand />
          {/* @ts-expect-error React 19 type compatibility */}
          <Routes>
            {/* @ts-expect-error React 19 type compatibility */}
            <Route path="/" element={<Server />} />
            {/* @ts-expect-error React 19 type compatibility */}
            <Route path="/monitor" element={<Monitor />} />
            {/* @ts-expect-error React 19 type compatibility */}
            <Route path="/network" element={<Network />} />
            {/* @ts-expect-error React 19 type compatibility */}
            <Route path="/server/:id" element={<ServerDetail />} />
            {/* @ts-expect-error React 19 type compatibility */}
            <Route path="/error" element={<ErrorPage />} />
            {/* @ts-expect-error React 19 type compatibility */}
            <Route path="*" element={<Server />} />
          </Routes>
          <Footer />
        </main>
      </ErrorBoundary>
    </Router>
  )
}

export default App
