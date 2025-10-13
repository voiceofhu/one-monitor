import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/hooks/useAuth"
import { useMainStore } from "@/hooks/useMainStore"
import { cn } from "@/lib/utils"
import gsap from "gsap"
import { LogOut, Settings, User2 } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export default function Header() {
    const { t } = useTranslation()
    const { logout } = useAuth()
    const profile = useMainStore((store) => store.profile)

    const location = useLocation()
    const navigate = useNavigate()

    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [isTransparent, setIsTransparent] = useState(true)
    const navListRef = useRef<HTMLUListElement>(null)
    const highlightRef = useRef<HTMLSpanElement>(null)
    const hasAnimatedRef = useRef(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsTransparent(window.scrollY < 24)
        }
        handleScroll()
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const pages = useMemo(
        () => [
            { href: "/dashboard", label: t("Server") },
            { href: "/dashboard/service", label: t("Service") },
            { href: "/dashboard/cron", label: t("Task") },
            { href: "/dashboard/notification", label: t("Notification") },
            { href: "/dashboard/ddns", label: t("DDNS") },
            { href: "/dashboard/nat", label: t("NATT") },
            { href: "/dashboard/server-group", label: t("Group") },
        ],
        [t],
    )

    const isPageActive = (href: string) => {
        if (href === "/dashboard/notification") {
            return (
                location.pathname === "/dashboard/notification" ||
                location.pathname === "/dashboard/alert-rule"
            )
        }
        if (href === "/dashboard/server-group") {
            return (
                location.pathname === "/dashboard/server-group" ||
                location.pathname === "/dashboard/notification-group"
            )
        }
        return location.pathname === href
    }

    const activeHref = useMemo(() => {
        if (!profile) {
            return undefined
        }
        const match = pages.find((page) => isPageActive(page.href))
        return match?.href
    }, [pages, profile, location.pathname])

    useLayoutEffect(() => {
        void pages
        const highlightEl = highlightRef.current
        const navEl = navListRef.current
        if (!highlightEl || !navEl || !activeHref) {
            if (highlightEl) {
                gsap.to(highlightEl, { opacity: 0, duration: 0.2 })
            }
            return
        }

        const activeLink = navEl.querySelector<HTMLAnchorElement>(`[data-nav-item="${activeHref}"]`)

        if (!activeLink) {
            gsap.to(highlightEl, { opacity: 0, duration: 0.2 })
            return
        }

        const { offsetLeft, offsetWidth } = activeLink
        const animationConfig = {
            x: offsetLeft - 8,
            width: offsetWidth,
            opacity: 1,
            duration: hasAnimatedRef.current ? 0.35 : 0,
            ease: "power3.out",
        }

        gsap.to(highlightEl, animationConfig)
        hasAnimatedRef.current = true
    }, [activeHref, pages, location.pathname])

    return (
        <header
            className={cn(
                "sticky top-0 z-40 w-full border-b transition-all duration-200",
                isTransparent
                    ? "bg-muted/40 backdrop-blur-sm"
                    : "bg-muted/80 shadow-sm backdrop-blur",
            )}
        >
            <div className="mx-auto grid w-full max-w-5xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
                <div className="flex items-center justify-start">
                    <Link
                        to={profile ? "/dashboard" : "#"}
                        className="flex items-center gap-2 text-sm font-semibold text-foreground"
                    >
                        <img
                            className="h-8 w-8 rounded-full bg-background"
                            src="/dashboard/favicon.ico"
                            alt="logo"
                        />
                        {/* {t("nezha")} */}
                    </Link>
                </div>

                <div className="flex min-w-0 items-center justify-center justify-self-center">
                    {profile && (
                        <nav className="max-w-full overflow-x-auto">
                            <ul
                                ref={navListRef}
                                className="relative mx-auto flex items-center gap-2 rounded-full bg-background/95 px-2 py-1 text-sm shadow-sm"
                            >
                                <span
                                    ref={highlightRef}
                                    className="pointer-events-none absolute inset-y-1 z-0 rounded-full bg-foreground"
                                    style={{ width: 0, transform: "translateX(0)", opacity: 0 }}
                                />
                                {pages.map((page) => (
                                    <li key={page.href}>
                                        <Link
                                            to={page.href}
                                            data-nav-item={page.href}
                                            className={cn(
                                                "relative z-[1] inline-flex items-center justify-center rounded-full px-3 py-1 text-center transition-colors",
                                                isPageActive(page.href)
                                                    ? "font-medium text-background"
                                                    : "text-muted-foreground hover:text-foreground",
                                            )}
                                        >
                                            {page.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2">
                    <a
                        href={"/"}
                        rel="noopener noreferrer"
                        className="flex items-center text-nowrap gap-1 text-sm font-medium text-muted-foreground transition-opacity hover:opacity-100"
                    >
                        {t("BackToHome")}
                    </a>
                    <ModeToggle />
                    {profile && (
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="h-8 w-8 cursor-pointer border border-foreground/40">
                                    <AvatarImage
                                        src={
                                            "https://api.dicebear.com/7.x/notionists/svg?seed=" +
                                            profile.username
                                        }
                                        alt={profile.username}
                                    />
                                    <AvatarFallback>{profile.username}</AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48">
                                <DropdownMenuLabel className="break-all">
                                    {profile.username}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setDropdownOpen(false)
                                            navigate("/dashboard/profile")
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <User2 />
                                            {t("Profile")}
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setDropdownOpen(false)
                                            navigate("/dashboard/settings")
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Settings />
                                            {t("Settings")}
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                                    <LogOut />
                                    {t("Logout")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </header>
    )
}
