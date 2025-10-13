import { getServerConfig, setServerConfig, updateServer } from "@/api/server"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { IconButton } from "@/components/xui/icon-button"
import { asOptionalField, conv } from "@/lib/utils"
import { ModelServer, ModelServerTaskResponse } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { KeyedMutator } from "swr"
import { z } from "zod"

interface ServerCardProps {
    data: ModelServer
    mutate: KeyedMutator<ModelServer[]>
}

const serverFormSchema = z.object({
    name: z.string().min(1),
    account: asOptionalField(z.string()),
    expired_at: asOptionalField(z.string()),
    purchase_price: asOptionalField(z.coerce.number().min(0)),
    purchase_date: asOptionalField(z.string()),
    purchase_years: asOptionalField(z.coerce.number().int().min(0)),
    monthly_traffic: asOptionalField(z.coerce.number().min(0)),
    note: asOptionalField(z.string()),
    public_note: asOptionalField(z.string()),
    display_index: z.coerce.number().int(),
    hide_for_guest: asOptionalField(z.boolean()),
    enable_ddns: asOptionalField(z.boolean()),
    ddns_profiles: asOptionalField(z.array(z.number())),
    ddns_profiles_raw: asOptionalField(z.string()),
    override_ddns_domains: asOptionalField(z.record(z.coerce.number().int(), z.array(z.string()))),
    override_ddns_domains_raw: asOptionalField(
        z.string().refine(
            (val) => {
                try {
                    JSON.parse(val)
                    return true
                } catch {
                    return false
                }
            },
            {
                message: "JSON 解析失败",
            },
        ),
    ),
})

const agentConfigSchema = z.object({
    debug: asOptionalField(z.boolean()),
    disable_auto_update: asOptionalField(z.boolean()),
    disable_command_execute: asOptionalField(z.boolean()),
    disable_force_update: asOptionalField(z.boolean()),
    disable_nat: asOptionalField(z.boolean()),
    disable_send_query: asOptionalField(z.boolean()),
    gpu: asOptionalField(z.boolean()),
    hard_drive_partition_allowlist: asOptionalField(z.array(z.string())),
    hard_drive_partition_allowlist_raw: asOptionalField(
        z.string().refine(
            (val) => {
                try {
                    JSON.parse(val)
                    return true
                } catch {
                    return false
                }
            },
            {
                message: "JSON 解析失败",
            },
        ),
    ),
    ip_report_period: asOptionalField(z.coerce.number().int().min(30)),
    nic_allowlist: asOptionalField(z.record(z.boolean())),
    nic_allowlist_raw: asOptionalField(
        z.string().refine(
            (val) => {
                try {
                    JSON.parse(val)
                    return true
                } catch {
                    return false
                }
            },
            {
                message: "JSON 解析失败",
            },
        ),
    ),
    report_delay: asOptionalField(z.coerce.number().int().min(1).max(4)),
    skip_connection_count: asOptionalField(z.boolean()),
    skip_procs_count: asOptionalField(z.boolean()),
    temperature: asOptionalField(z.boolean()),
})

type AgentConfig = z.infer<typeof agentConfigSchema>

const boolFields: (keyof AgentConfig)[] = [
    "disable_auto_update",
    "disable_command_execute",
    "disable_force_update",
    "disable_nat",
    "disable_send_query",
    "gpu",
    "temperature",
    "skip_connection_count",
    "skip_procs_count",
    "debug",
]

const groupedBoolFields: (keyof AgentConfig)[][] = []
for (let i = 0; i < boolFields.length; i += 2) {
    groupedBoolFields.push(boolFields.slice(i, i + 2))
}

const formatDateInputValue = (value?: string) => {
    if (!value) return ""
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ""
    return d.toISOString().slice(0, 10)
}

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
    </div>
)

export const ServerCard: FC<ServerCardProps> = ({ data, mutate }) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [configLoading, setConfigLoading] = useState(false)
    const [configError, setConfigError] = useState<string | null>(null)

    const form = useForm<z.infer<typeof serverFormSchema>>({
        resolver: zodResolver(serverFormSchema),
        defaultValues: {
            ...data,
            account: data.account ?? "",
            expired_at: formatDateInputValue(data.expired_at),
            purchase_price: data.purchase_price ?? undefined,
            purchase_date: formatDateInputValue(data.purchase_date ?? undefined),
            purchase_years: data.purchase_years ?? undefined,
            monthly_traffic: data.monthly_traffic ?? undefined,
            ddns_profiles_raw: data.ddns_profiles ? conv.arrToStr(data.ddns_profiles) : undefined,
            override_ddns_domains_raw: data.override_ddns_domains
                ? JSON.stringify(data.override_ddns_domains)
                : undefined,
        },
        resetOptions: { keepDefaultValues: false },
    })

    const configForm = useForm<AgentConfig>({
        resolver: zodResolver(agentConfigSchema),
        defaultValues: {
            hard_drive_partition_allowlist_raw: undefined,
            nic_allowlist_raw: undefined,
        },
        resetOptions: { keepDefaultValues: false },
    })

    const resetBasicForm = useCallback(() => {
        form.reset({
            ...data,
            account: data.account ?? "",
            expired_at: formatDateInputValue(data.expired_at),
            purchase_price: data.purchase_price ?? undefined,
            purchase_date: formatDateInputValue(data.purchase_date ?? undefined),
            purchase_years: data.purchase_years ?? undefined,
            monthly_traffic: data.monthly_traffic ?? undefined,
            ddns_profiles_raw: data.ddns_profiles ? conv.arrToStr(data.ddns_profiles) : undefined,
            override_ddns_domains_raw: data.override_ddns_domains
                ? JSON.stringify(data.override_ddns_domains)
                : undefined,
        })
    }, [data, form])

    useEffect(() => {
        if (!open) return
        resetBasicForm()
    }, [open, resetBasicForm])

    useEffect(() => {
        if (!open) return
        const fetchConfig = async () => {
            setConfigLoading(true)
            setConfigError(null)
            try {
                const raw = await getServerConfig(data.id)
                const parsed: AgentConfig = JSON.parse(raw || "{}")
                configForm.reset({
                    ...parsed,
                    hard_drive_partition_allowlist_raw: parsed.hard_drive_partition_allowlist
                        ? JSON.stringify(parsed.hard_drive_partition_allowlist)
                        : undefined,
                    nic_allowlist_raw: parsed.nic_allowlist
                        ? JSON.stringify(parsed.nic_allowlist)
                        : undefined,
                })
            } catch (error) {
                console.error(error)
                setConfigError((error as Error).message)
                toast(t("Error"), { description: (error as Error).message })
            } finally {
                setConfigLoading(false)
            }
        }
        fetchConfig()
    }, [open, data.id, configForm, t])

    const handleBasicSubmit = async (values: z.infer<typeof serverFormSchema>) => {
        const payload = { ...values }
        payload.ddns_profiles = values.ddns_profiles_raw
            ? conv.strToArr(values.ddns_profiles_raw).map(Number)
            : undefined
        payload.override_ddns_domains = values.override_ddns_domains_raw
            ? JSON.parse(values.override_ddns_domains_raw)
            : undefined
        payload.expired_at = values.expired_at
            ? new Date(`${values.expired_at}T00:00:00Z`).toISOString()
            : undefined
        payload.purchase_date = values.purchase_date
            ? new Date(`${values.purchase_date}T00:00:00Z`).toISOString()
            : null
        payload.purchase_price = values.purchase_price ?? null
        payload.purchase_years = values.purchase_years ?? null
        payload.monthly_traffic = values.monthly_traffic ?? null
        try {
            await updateServer(data.id, payload)
            toast(t("Done"), { description: t("Results.Success") })
            setOpen(false)
            await mutate()
            resetBasicForm()
        } catch (error) {
            console.error(error)
            toast(t("Error"), { description: t("Results.UnExpectedError") })
        }
    }

    const handleConfigSubmit = async (values: AgentConfig) => {
        let resp: ModelServerTaskResponse = {}
        try {
            values.nic_allowlist = values.nic_allowlist_raw
                ? JSON.parse(values.nic_allowlist_raw)
                : undefined
            values.hard_drive_partition_allowlist = values.hard_drive_partition_allowlist_raw
                ? JSON.parse(values.hard_drive_partition_allowlist_raw)
                : undefined
            resp = await setServerConfig({ config: JSON.stringify(values), servers: [data.id] })
        } catch (error) {
            console.error(error)
            toast(t("Error"), { description: t("Results.UnExpectedError") })
            return
        }
        toast(t("Done"), {
            description:
                t("Results.ForceUpdate") +
                (resp.success?.length ? t("Success") + ` [${resp.success.join(",")}]` : "") +
                (resp.failure?.length ? t("Failure") + ` [${resp.failure.join(",")}]` : "") +
                (resp.offline?.length ? t("Offline") + ` [${resp.offline.join(",")}]` : ""),
        })
    }

    const ddnsEnabled = form.watch("enable_ddns")
    const basicInfoTitle = t("BasicInfo", { defaultValue: "基本信息" })
    const configTitle = t("AgentConfig", { defaultValue: "Agent 设置" })

    const boolFieldLabels = useMemo(
        () =>
            ({
                disable_auto_update: t("disable_auto_update", { defaultValue: "禁用自动更新" }),
                disable_command_execute: t("disable_command_execute", { defaultValue: "禁用命令执行" }),
                disable_force_update: t("disable_force_update", { defaultValue: "禁用强制更新" }),
                disable_nat: t("disable_nat", { defaultValue: "禁用 NAT" }),
                disable_send_query: t("disable_send_query", { defaultValue: "禁用任务下发" }),
                gpu: t("gpu", { defaultValue: "启用 GPU" }),
                temperature: t("temperature", { defaultValue: "启用温度监控" }),
                skip_connection_count: t("skip_connection_count", { defaultValue: "跳过连接统计" }),
                skip_procs_count: t("skip_procs_count", { defaultValue: "跳过进程统计" }),
                debug: t("debug", { defaultValue: "调试模式" }),
            }) satisfies Partial<Record<keyof AgentConfig, string>>,
        [t],
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <IconButton variant="outline" icon="cog" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t("EditServer", { defaultValue: "编辑服务器" })}</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="mt-3 grid w-full grid-cols-2">
                        <TabsTrigger value="basic">{basicInfoTitle}</TabsTrigger>
                        <TabsTrigger value="config">{configTitle}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="mt-4">
                        <ScrollArea className="max-h-[calc(100dvh-11rem)] pr-2">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleBasicSubmit)} className="space-y-4">
                                    <Section title={t("BasicInfo", { defaultValue: "基础设置" })}>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("Name", { defaultValue: "名称" })}</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="服务器名称" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="display_index"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("Weight", { defaultValue: "权重" })}</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" min={0} {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="account"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("Account", { defaultValue: "账号" })}</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="账号信息" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="expired_at"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            {t("ExpireAt", { defaultValue: "到期日期" })}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="purchase_price"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            {t("PurchasePrice", { defaultValue: "购入价格" })}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                step="0.01"
                                                                value={field.value ?? ""}
                                                                onChange={(event) => {
                                                                    const next = Number(event.target.value)
                                                                    field.onChange(
                                                                        event.target.value === "" ||
                                                                            Number.isNaN(next)
                                                                            ? undefined
                                                                            : next,
                                                                    )
                                                                }}
                                                                placeholder="0.00"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="purchase_date"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            {t("PurchaseDate", { defaultValue: "购买日期" })}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="purchase_years"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            {t("PurchaseYears", { defaultValue: "购买年限" })}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                step="1"
                                                                value={field.value ?? ""}
                                                                onChange={(event) => {
                                                                    const next = Number(event.target.value)
                                                                    field.onChange(
                                                                        event.target.value === "" ||
                                                                            Number.isNaN(next)
                                                                            ? undefined
                                                                            : Math.trunc(next),
                                                                    )
                                                                }}
                                                                placeholder="0"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="monthly_traffic"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            {t("MonthlyTraffic", { defaultValue: "月度流量 (GB)" })}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                step="0.01"
                                                                value={field.value ?? ""}
                                                                onChange={(event) => {
                                                                    const next = Number(event.target.value)
                                                                    field.onChange(
                                                                        event.target.value === "" ||
                                                                            Number.isNaN(next)
                                                                            ? undefined
                                                                            : next,
                                                                    )
                                                                }}
                                                                placeholder="0"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="enable_ddns"
                                                render={({ field }) => (
                                                    <FormItem className="flex items-center space-x-2">
                                                        <FormControl>
                                                            <div className="flex items-center gap-2">
                                                                <Checkbox
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                                <Label className="text-sm">
                                                                    {t("EnableDDNS", { defaultValue: "启用 DDNS" })}
                                                                </Label>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="hide_for_guest"
                                                render={({ field }) => (
                                                    <FormItem className="flex items-center space-x-2">
                                                        <FormControl>
                                                            <div className="flex items-center gap-2">
                                                                <Checkbox
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                                <Label className="text-sm">
                                                                    {t("HideForGuest", { defaultValue: "游客不可见" })}
                                                                </Label>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        {ddnsEnabled ? (
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <FormField
                                                    control={form.control}
                                                    name="ddns_profiles_raw"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>
                                                                {t("DDNSProfiles", { defaultValue: "DDNS 配置" }) +
                                                                    t("SeparateWithComma", {
                                                                        defaultValue: "（逗号分隔）",
                                                                    })}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="1,2,3" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="override_ddns_domains_raw"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>
                                                                {t("OverrideDDNSDomains", {
                                                                    defaultValue: "自定义 DDNS 域名",
                                                                })}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Textarea className="resize-y" rows={3} {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        ) : null}
                                    </Section>
                                    <Section title={t("Notes", { defaultValue: "备注" })}>
                                        <FormField
                                            control={form.control}
                                            name="note"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("PrivateNote", { defaultValue: "管理员备注" })}</FormLabel>
                                                    <FormControl>
                                                        <Textarea className="resize-y" rows={3} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="public_note"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("PublicNote", { defaultValue: "公开备注" })}</FormLabel>
                                                    <FormControl>
                                                        <Textarea className="resize-y" rows={3} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </Section>
                                    <DialogFooter className="flex flex-row my-2 sm:space-x-2 space-y-2 sm:space-y-0">
                                        <DialogClose asChild>
                                            <Button type="button" variant="secondary">
                                                {t("Close", { defaultValue: "关闭" })}
                                            </Button>
                                        </DialogClose>
                                        <Button type="submit">{t("Submit", { defaultValue: "保存" })}</Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="config" className="mt-4">
                        <ScrollArea className="max-h-[calc(100dvh-11rem)] pr-2">
                            {configLoading ? (
                                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("Loading", { defaultValue: "加载中..." })}
                                </div>
                            ) : configError ? (
                                <div className="py-6 text-center text-sm text-destructive">{configError}</div>
                            ) : (
                                <Form {...configForm}>
                                    <form onSubmit={configForm.handleSubmit(handleConfigSubmit)} className="space-y-4">
                                        <Section title={t("Switches", { defaultValue: "功能开关" })}>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                {groupedBoolFields.map((group, idx) => (
                                                    <div key={idx} className="flex flex-col gap-2">
                                                        {group.map((fieldName) => (
                                                            <FormField
                                                                key={fieldName}
                                                                control={configForm.control}
                                                                name={fieldName}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex items-center space-x-2">
                                                                        <FormControl>
                                                                            <div className="flex items-center gap-2">
                                                                                <Checkbox
                                                                                    checked={field.value}
                                                                                    onCheckedChange={field.onChange}
                                                                                />
                                                                                <Label className="text-sm">
                                                                                    {boolFieldLabels[fieldName] ||
                                                                                        String(fieldName)}
                                                                                </Label>
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </Section>
                                        <Section title={t("Intervals", { defaultValue: "上报频率" })}>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <FormField
                                                    control={configForm.control}
                                                    name="ip_report_period"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>
                                                                {t("IPReportPeriod", { defaultValue: "IP 上报间隔(秒)" })}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input type="number" min={30} {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={configForm.control}
                                                    name="report_delay"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>
                                                                {t("ReportDelay", { defaultValue: "状态上报间隔(秒)" })}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input type="number" min={1} max={4} {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </Section>
                                        <Section title={t("Allowlist", { defaultValue: "采集白名单" })}>
                                            <FormField
                                                control={configForm.control}
                                                name="hard_drive_partition_allowlist_raw"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            {t("DiskAllowlist", { defaultValue: "硬盘分区 (JSON)" })}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Textarea className="resize-y" rows={3} {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={configForm.control}
                                                name="nic_allowlist_raw"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            {t("NICAllowlist", { defaultValue: "网卡 (JSON)" })}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Textarea className="resize-y" rows={3} {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </Section>
                                        <DialogFooter className="flex flex-row my-2 sm:space-x-2 space-y-2 sm:space-y-0">
                                            <DialogClose asChild>
                                                <Button type="button" variant="secondary">
                                                    {t("Close", { defaultValue: "关闭" })}
                                                </Button>
                                            </DialogClose>
                                            <Button type="submit">{t("Submit", { defaultValue: "保存" })}</Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
