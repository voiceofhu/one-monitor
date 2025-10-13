import { swrFetcher } from "@/api/api"
import { deleteServer, forceUpdateServer, updateServer } from "@/api/server"
import { ActionButtonGroup } from "@/components/action-button-group"
import { BatchMoveServerIcon } from "@/components/batch-move-server-icon"
import { CopyButton } from "@/components/copy-button"
import { HeaderButtonGroup } from "@/components/header-button-group"
import { InstallCommandsMenu } from "@/components/install-commands"
import { NoteMenu } from "@/components/note-menu"
import { ServerCard } from "@/components/server"
import { ServerConfigCardBatch } from "@/components/server-config-batch"
import { TerminalButton } from "@/components/terminal"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { IconButton } from "@/components/xui/icon-button"
import { useServer } from "@/hooks/useServer"
import { cn, joinIP } from "@/lib/utils"
import {
    ModelServer,
    ModelServerForm,
    ModelServerTaskResponse,
    ModelServerGroupResponseItem,
} from "@/types"
import {
    ColumnDef,
    Row,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Loader2 } from "lucide-react"
import {
    type CSSProperties,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import useSWR from "swr"

const SERVER_PREFIX = "server-"
const CATEGORY_PREFIX = "category-group-"
const ALL_CATEGORY_ID = "category-all"
const UNGROUPED_CATEGORY_ID = "category-ungrouped"

interface CategoryMeta {
    id: string
    label: string
    count: number
    type: "static" | "group"
}

type ColumnMeta = {
    headerClassName?: string
    cellClassName?: string
}

type TableColumnConfig = {
    id: string
    header: string
    headerClassName?: string
    cellClassName?: string
    render: (server: ModelServer) => ReactNode
}

const toServerDraggableId = (id: number) => `${SERVER_PREFIX}${id}`
const toGroupDraggableId = (id: number) => `${CATEGORY_PREFIX}${id}`

const isServerDraggableId = (id: string) => id.startsWith(SERVER_PREFIX)
const isGroupDraggableId = (id: string) => id.startsWith(CATEGORY_PREFIX)

const parseServerId = (id: string) => Number(id.replace(SERVER_PREFIX, ""))
const parseGroupId = (id: string) => Number(id.replace(CATEGORY_PREFIX, ""))

export default function ServerPage() {
    const { t } = useTranslation()
    const { data, mutate, error, isLoading } = useSWR<ModelServer[]>("/api/v1/server", swrFetcher)
    const { serverGroups } = useServer()

    const [orderedServers, setOrderedServers] = useState<ModelServer[]>([])
    const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY_ID)
    const [categoryOrder, setCategoryOrder] = useState<string[]>([])
    const [isSavingOrder, setIsSavingOrder] = useState(false)

    useEffect(() => {
        if (error)
            toast(t("Error"), {
                description: t("Results.ErrorFetchingResource", { error: error.message }),
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error])

    useEffect(() => {
        if (!data) return
        setOrderedServers(sortServersByDisplayIndex(data))
    }, [data])

    useEffect(() => {
        if (!serverGroups) {
            setCategoryOrder([])
            return
        }
        setCategoryOrder((prev) => {
            const next = serverGroups.map((sg) => toGroupDraggableId(sg.group.id))
            if (prev.length === 0) {
                return next
            }
            const persisted = prev.filter((id) => next.includes(id))
            const additions = next.filter((id) => !persisted.includes(id))
            return [...persisted, ...additions]
        })
    }, [serverGroups])

    useEffect(() => {
        if (
            activeCategory !== ALL_CATEGORY_ID &&
            activeCategory !== UNGROUPED_CATEGORY_ID &&
            categoryOrder.length > 0 &&
            !categoryOrder.includes(activeCategory)
        ) {
            setActiveCategory(ALL_CATEGORY_ID)
        }
    }, [activeCategory, categoryOrder])

    const categories = useMemo<Map<string, CategoryMeta>>(() => {
        const map = new Map<string, CategoryMeta>()
        map.set(ALL_CATEGORY_ID, {
            id: ALL_CATEGORY_ID,
            label: t("AllServers", { defaultValue: "所有服务器" }),
            count: orderedServers.length,
            type: "static",
        })

        const assigned = new Set<number>()
        serverGroups?.forEach((group) => {
            group.servers?.forEach((sid) => assigned.add(sid))
            map.set(toGroupDraggableId(group.group.id), {
                id: toGroupDraggableId(group.group.id),
                label: group.group.name,
                count: group.servers?.length ?? 0,
                type: "group",
            })
        })

        const ungroupedCount = orderedServers.filter((server) => !assigned.has(server.id)).length
        if (ungroupedCount > 0) {
            map.set(UNGROUPED_CATEGORY_ID, {
                id: UNGROUPED_CATEGORY_ID,
                label: t("UngroupedServers", { defaultValue: "未分组" }),
                count: ungroupedCount,
                type: "static",
            })
        } else {
            map.delete(UNGROUPED_CATEGORY_ID)
        }

        return map
    }, [orderedServers, serverGroups, t])

    const visibleServers = useMemo(() => {
        if (activeCategory === UNGROUPED_CATEGORY_ID) {
            const ungroupedIds = computeUngroupedServerIds(orderedServers, serverGroups)
            const set = new Set<number>(ungroupedIds)
            return orderedServers.filter((server) => set.has(server.id))
        }
        if (isGroupDraggableId(activeCategory)) {
            const groupId = parseGroupId(activeCategory)
            const group = serverGroups?.find((sg) => sg.group.id === groupId)
            if (!group) {
                return []
            }
            const set = new Set<number>(group.servers ?? [])
            return orderedServers.filter((server) => set.has(server.id))
        }
        return orderedServers
    }, [activeCategory, orderedServers, serverGroups])

    const visibleServerIds = useMemo(
        () => visibleServers.map((server) => toServerDraggableId(server.id)),
        [visibleServers],
    )

    const currencyFormatter = useMemo(
        () => new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
        [],
    )

    const trafficFormatter = useMemo(
        () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
        [],
    )

    const columnConfigs = useMemo<TableColumnConfig[]>(() => {
        const empty = "—"
        const formatDate = (value?: string | null) => {
            if (!value) return empty
            const date = new Date(value)
            if (Number.isNaN(date.getTime())) {
                return value
            }
            return date.toISOString().slice(0, 10)
        }
        const formatPrice = (value?: number | null) =>
            value == null ? empty : currencyFormatter.format(value)
        const formatYears = (value?: number | null) =>
            value == null ? empty : `${value}${t("YearUnit", { defaultValue: "年" })}`
        const formatTraffic = (value?: number | null) =>
            value == null
                ? empty
                : `${trafficFormatter.format(value)}${t("GBUnit", { defaultValue: "GB" })}`

        return [
            {
                id: "name",
                header: t("Name", { defaultValue: "名称" }),
                headerClassName: "min-w-[160px] px-3",
                cellClassName: "min-w-[160px] px-3 py-2",
                render: (server) => (
                    <span className="block truncate font-medium" title={server.name}>
                        {server.name}
                    </span>
                ),
            },
            {
                id: "account",
                header: t("Account", { defaultValue: "账号" }),
                headerClassName: "min-w-[120px] px-3",
                cellClassName: "min-w-[120px] px-3 py-2 text-xs text-muted-foreground",
                render: (server) => server.account || empty,
            },
            {
                id: "ip",
                header: "IP",
                headerClassName: "min-w-[150px] px-3",
                cellClassName: "min-w-[150px] px-3 py-2 text-xs text-muted-foreground",
                render: (server) => {
                    const ipText = joinIP(server.geoip?.ip)
                    if (!ipText) return empty
                    return (
                        <span className="block truncate" title={ipText}>
                            {ipText}
                        </span>
                    )
                },
            },
            {
                id: "purchase_price",
                header: t("PurchasePrice", { defaultValue: "购入价格" }),
                headerClassName: "min-w-[120px] px-3 text-right",
                cellClassName: "min-w-[120px] px-3 py-2 text-right",
                render: (server) => formatPrice(server.purchase_price),
            },
            {
                id: "agent_version",
                header: t("AgentVersion", { defaultValue: "Agent 版本" }),
                headerClassName: "w-[120px] px-3 text-center",
                cellClassName: "w-[120px] px-3 py-2 text-center text-xs text-muted-foreground",
                render: (server) => server.host?.version || t("Unknown"),
            },
            {
                id: "purchase_date",
                header: t("PurchaseDate", { defaultValue: "购买日期" }),
                headerClassName: "min-w-[120px] px-3",
                cellClassName: "min-w-[120px] px-3 py-2",
                render: (server) => formatDate(server.purchase_date),
            },
            {
                id: "purchase_years",
                header: t("PurchaseYears", { defaultValue: "购买年限" }),
                headerClassName: "w-[110px] px-3 text-right",
                cellClassName: "w-[110px] px-3 py-2 text-right",
                render: (server) => formatYears(server.purchase_years),
            },
            {
                id: "monthly_traffic",
                header: t("MonthlyTraffic", { defaultValue: "月度流量 (GB)" }),
                headerClassName: "min-w-[140px] px-3 text-right",
                cellClassName: "min-w-[140px] px-3 py-2 text-right",
                render: (server) => formatTraffic(server.monthly_traffic),
            },
            {
                id: "expired_at",
                header: t("ExpireAt", { defaultValue: "到期日期" }),
                headerClassName: "min-w-[120px] px-3",
                cellClassName: "min-w-[120px] px-3 py-2",
                render: (server) => formatDate(server.expired_at),
            },
            {
                id: "enable_ddns",
                header: t("DDNSStatus", { defaultValue: "DDNS 状态" }),
                headerClassName: "w-[110px] px-3 text-center",
                cellClassName: "w-[110px] px-3 py-2 text-center",
                render: (server) => (
                    <span className="text-sm font-medium">
                        {server.enable_ddns
                            ? t("Enabled", { defaultValue: "启用" })
                            : t("Disabled", { defaultValue: "禁用" })}
                    </span>
                ),
            },
            {
                id: "hide_for_guest",
                header: t("GuestVisible", { defaultValue: "游客可见" }),
                headerClassName: "w-[110px] px-3 text-center",
                cellClassName: "w-[110px] px-3 py-2 text-center",
                render: (server) => (
                    <span className="text-sm font-medium">
                        {server.hide_for_guest
                            ? t("Disabled", { defaultValue: "禁用" })
                            : t("Enabled", { defaultValue: "启用" })}
                    </span>
                ),
            },
            {
                id: "note",
                header: t("Note", { defaultValue: "备注" }),
                headerClassName: "w-[120px] px-3 text-center",
                cellClassName: "w-[120px] px-3 py-2 text-center",
                render: (server) => <NoteMenu note={{ private: server.note, public: server.public_note }} />,
            },
            {
                id: "uuid",
                header: "UUID",
                headerClassName: "min-w-[200px] px-3",
                cellClassName: "min-w-[200px] px-3 py-2",
                render: (server) => <CopyButton text={server.uuid} />,
            },
        ]
    }, [currencyFormatter, t, trafficFormatter])

    const columns = useMemo<ColumnDef<ModelServer>[]>(() => {
        const baseColumns: ColumnDef<ModelServer>[] = [
            {
                id: "drag",
                header: "",
                cell: () => null,
                enableSorting: false,
                enableHiding: false,
                size: 36,
                meta: {
                    headerClassName: "w-9 px-2",
                    cellClassName: "w-9 px-2 text-center align-middle",
                },
            },
            {
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                ),
                enableSorting: false,
                enableHiding: false,
                size: 48,
                meta: {
                    headerClassName: "w-12 px-2 text-center",
                    cellClassName: "w-12 px-2 text-center align-middle",
                },
            },
            ...columnConfigs.map((config) => ({
                id: config.id,
                header: config.header,
                cell: ({ row }: { row: Row<ModelServer> }) => config.render(row.original),
                meta: {
                    headerClassName: cn("px-3", config.headerClassName),
                    cellClassName: cn("px-3 py-2", config.cellClassName),
                },
            })),
            {
                id: "actions",
                header: t("Actions", { defaultValue: "操作" }),
                cell: ({ row }) => {
                    const s = row.original
                    return (
                        <div className="flex justify-end">
                            <ActionButtonGroup
                                className="flex gap-2"
                                delete={{ fn: deleteServer, id: s.id, mutate: mutate }}
                            >
                                <>
                                    <TerminalButton id={s.id} />
                                    <ServerCard mutate={mutate} data={s} />
                                </>
                            </ActionButtonGroup>
                        </div>
                    )
                },
                meta: {
                    headerClassName:
                        "sticky right-0 z-10 min-w-[190px] bg-background text-right shadow-[inset_12px_0_8px_-12px_rgba(15,23,42,0.18)] backdrop-blur supports-[backdrop-filter]:bg-background/80",
                    cellClassName:
                        "sticky right-0 z-10 min-w-[190px] bg-background text-right shadow-[inset_12px_0_8px_-12px_rgba(15,23,42,0.18)] backdrop-blur supports-[backdrop-filter]:bg-background/80",
                },
            },
        ]

        return baseColumns
    }, [columnConfigs, mutate, t])

    const table = useReactTable({
        data: visibleServers,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    const selectedRows = table.getSelectedRowModel().rows

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    const persistServerOrder = useCallback(
        async (previous: ModelServer[], next: ModelServer[]) => {
            const prevMap = new Map(previous.map((server) => [server.id, server.display_index]))
            const updates = next
                .filter((server) => prevMap.get(server.id) !== server.display_index)
                .map((server) => ({
                    id: server.id,
                    payload: buildServerUpdatePayload(server),
                }))

            if (updates.length === 0) {
                return
            }

            setIsSavingOrder(true)
            try {
                await Promise.all(updates.map(({ id, payload }) => updateServer(id, payload)))
                await mutate()
            } catch (e) {
                console.error(e)
                toast(t("Error"), {
                    description: t("Results.UnExpectedError"),
                })
                setOrderedServers(previous)
            } finally {
                setIsSavingOrder(false)
            }
        },
        [mutate, t],
    )

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event
            if (!over) return

            const activeId = String(active.id)
            const overId = String(over.id)
            if (activeId === overId) return

            if (isGroupDraggableId(activeId) && isGroupDraggableId(overId)) {
                setCategoryOrder((prev) => {
                    const current = [...prev]
                    const activeIndex = current.indexOf(activeId)
                    const overIndex = current.indexOf(overId)
                    if (activeIndex === -1 || overIndex === -1) {
                        return prev
                    }
                    return arrayMove(current, activeIndex, overIndex)
                })
                return
            }

            if (isServerDraggableId(activeId) && isServerDraggableId(overId)) {
                const fromId = parseServerId(activeId)
                const toId = parseServerId(overId)
                setOrderedServers((prev) => {
                    const reordered = reorderServersByCategory(
                        prev,
                        fromId,
                        toId,
                        activeCategory,
                        serverGroups,
                    )
                    if (reordered === prev) {
                        return prev
                    }
                    const total = reordered.length
                    const withUpdatedIndex = reordered.map((server, index) => ({
                        ...server,
                        display_index: total - index,
                    }))
                    void persistServerOrder(prev, withUpdatedIndex)
                    return withUpdatedIndex
                })
            }
        },
        [activeCategory, persistServerOrder, serverGroups],
    )

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="px-3">
                <div className="flex mt-6 mb-4 items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">{t("Server")}</h1>
                    {isSavingOrder ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t("Saving", { defaultValue: "保存中" })}
                        </span>
                    ) : null}
                    <HeaderButtonGroup
                        className="flex-2 flex ml-auto gap-2"
                        delete={{
                            fn: deleteServer,
                            id: selectedRows.map((r) => r.original.id),
                            mutate: mutate,
                        }}
                    >
                        <IconButton
                            icon="update"
                            onClick={async () => {
                                const id = selectedRows.map((r) => r.original.id)
                                if (id.length < 1) {
                                    toast(t("Error"), {
                                        description: t("Results.SelectAtLeastOneServer"),
                                    })
                                    return
                                }

                                let resp: ModelServerTaskResponse = {}
                                try {
                                    resp = await forceUpdateServer(id)
                                } catch (e) {
                                    console.error(e)
                                    toast(t("Error"), {
                                        description: t("Results.UnExpectedError"),
                                    })
                                    return
                                }
                                toast(t("Done"), {
                                    description:
                                        t("Results.ForceUpdate") +
                                        (resp.success?.length
                                            ? t(`Success`) + ` [${resp.success.join(",")}]`
                                            : "") +
                                        (resp.failure?.length
                                            ? t(`Failure`) + ` [${resp.failure.join(",")}]`
                                            : "") +
                                        (resp.offline?.length
                                            ? t(`Offline`) + ` [${resp.offline.join(",")}]`
                                            : ""),
                                })
                            }}
                        />
                        <BatchMoveServerIcon serverIds={selectedRows.map((r) => r.original.id)} />
                        <ServerConfigCardBatch
                            sid={selectedRows.map((r) => r.original.id)}
                            className="shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] bg-yellow-600 text-white hover:bg-yellow-500 dark:hover:bg-yellow-700 rounded-lg"
                        />
                        <InstallCommandsMenu className="shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] bg-blue-700 text-white hover:bg-blue-600 dark:hover:bg-blue-800 rounded-lg" />
                    </HeaderButtonGroup>
                </div>

                <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <aside className="space-y-4">
                        <div className="flex flex-col gap-2">
                            {[ALL_CATEGORY_ID, UNGROUPED_CATEGORY_ID].map((id) => {
                                const meta = categories.get(id)
                                if (!meta) return null
                                return (
                                    <CategoryButton
                                        key={id}
                                        id={id}
                                        label={meta.label}
                                        count={meta.count}
                                        active={activeCategory === id}
                                        onSelect={setActiveCategory}
                                    />
                                )
                            })}
                            {categoryOrder.length > 0 ? (
                                <SortableContext
                                    items={categoryOrder}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {categoryOrder.map((id) => {
                                        const meta = categories.get(id)
                                        if (!meta) return null
                                        return (
                                            <SortableCategoryItem
                                                key={id}
                                                id={id}
                                                label={meta.label}
                                                count={meta.count}
                                                active={activeCategory === id}
                                                onSelect={setActiveCategory}
                                            />
                                        )
                                    })}
                                </SortableContext>
                            ) : null}
                        </div>
                    </aside>
                    <section className="relative max-w-full overflow-hidden rounded-lg border bg-background">
                        <div className="overflow-x-auto">
                            <Table className="min-w-max w-full">
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => {
                                                const headerMeta =
                                                    (header.column.columnDef.meta as ColumnMeta | undefined) ??
                                                    {}
                                                return (
                                                    <TableHead
                                                        key={header.id}
                                                        className={cn(
                                                            "text-sm font-medium whitespace-nowrap",
                                                            headerMeta.headerClassName,
                                                        )}
                                                    >
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(
                                                                  header.column.columnDef.header,
                                                                  header.getContext(),
                                                              )}
                                                    </TableHead>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length}
                                                className="h-24 text-center"
                                            >
                                                {t("Loading")}...
                                            </TableCell>
                                        </TableRow>
                                    ) : table.getRowModel().rows?.length ? (
                                        <SortableContext
                                            items={visibleServerIds}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {table.getRowModel().rows.map((row) => (
                                                <SortableTableRow key={row.id} row={row} />
                                            ))}
                                        </SortableContext>
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length}
                                                className="h-24 text-center"
                                            >
                                                {t("NoResults")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </section>
                </div>
            </div>
        </DndContext>
    )
}

const CategoryButton: React.FC<{
    id: string
    label: string
    count: number
    active: boolean
    onSelect: (id: string) => void
}> = ({ id, label, count, active, onSelect }) => {
    return (
        <button
            type="button"
            onClick={() => onSelect(id)}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-muted/60"
            }`}
        >
            <span>{label}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
        </button>
    )
}

const SortableCategoryItem: React.FC<{
    id: string
    label: string
    count: number
    active: boolean
    onSelect: (id: string) => void
}> = ({ id, label, count, active, onSelect }) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
        useSortable({ id })
    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-muted/60"
            } ${isDragging ? "opacity-60" : ""}`}
            onClick={() => onSelect(id)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onSelect(id)
                }
            }}
        >
            <span className="flex items-center gap-2">
                <span
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    onClick={(event) => event.stopPropagation()}
                    className="cursor-grab text-muted-foreground"
                >
                    <GripVertical className="h-4 w-4" />
                </span>
                {label}
            </span>
            <span className="text-xs text-muted-foreground">{count}</span>
        </div>
    )
}

const SortableTableRow: React.FC<{ row: Row<ModelServer> }> = ({ row }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: toServerDraggableId(row.original.id) })

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
        transition,
    }

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            className={isDragging ? "opacity-60" : undefined}
            data-state={row.getIsSelected() && "selected"}
        >
            {row.getVisibleCells().map((cell) => {
                const cellMeta = (cell.column.columnDef.meta as ColumnMeta | undefined) ?? {}
                return (
                    <TableCell key={cell.id} className={cn("text-sm", cellMeta.cellClassName)}>
                        {cell.column.id === "drag" ? (
                            <button
                                type="button"
                                ref={setActivatorNodeRef}
                                {...attributes}
                                {...listeners}
                                onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    row.toggleSelected(!row.getIsSelected())
                                }}
                                className="cursor-grab text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <GripVertical className="h-4 w-4" />
                            </button>
                        ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                    </TableCell>
                )
            })}
        </TableRow>
    )
}

const computeUngroupedServerIds = (
    servers: ModelServer[],
    groups?: ModelServerGroupResponseItem[],
) => {
    const assigned = new Set<number>()
    groups?.forEach((group) => group.servers?.forEach((sid) => assigned.add(sid)))
    return servers.filter((server) => !assigned.has(server.id)).map((server) => server.id)
}

const reorderServersByCategory = (
    list: ModelServer[],
    fromId: number,
    toId: number,
    categoryId: string,
    groups?: ModelServerGroupResponseItem[],
) => {
    const fromIndex = list.findIndex((server) => server.id === fromId)
    const toIndex = list.findIndex((server) => server.id === toId)
    if (fromIndex === -1 || toIndex === -1) return list

    if (categoryId === ALL_CATEGORY_ID) {
        return arrayMove([...list], fromIndex, toIndex)
    }

    let targetIds: number[] = []
    if (categoryId === UNGROUPED_CATEGORY_ID) {
        targetIds = computeUngroupedServerIds(list, groups)
    } else if (isGroupDraggableId(categoryId)) {
        const groupId = parseGroupId(categoryId)
        targetIds = groups?.find((group) => group.group.id === groupId)?.servers ?? []
    } else {
        return list
    }

    const targetSet = new Set<number>(targetIds)
    if (!targetSet.has(fromId) || !targetSet.has(toId)) {
        return list
    }

    const groupedIndices: number[] = []
    const groupedItems: ModelServer[] = []
    list.forEach((server, index) => {
        if (targetSet.has(server.id)) {
            groupedIndices.push(index)
            groupedItems.push(server)
        }
    })

    const fromGroupedIndex = groupedItems.findIndex((server) => server.id === fromId)
    const toGroupedIndex = groupedItems.findIndex((server) => server.id === toId)
    if (fromGroupedIndex === -1 || toGroupedIndex === -1) {
        return list
    }

    const reorderedGrouped = arrayMove([...groupedItems], fromGroupedIndex, toGroupedIndex)
    const result = [...list]
    groupedIndices.forEach((listIndex, idx) => {
        result[listIndex] = reorderedGrouped[idx]
    })
    return result
}

const sortServersByDisplayIndex = (servers: ModelServer[]) => {
    return [...servers].sort((a, b) => {
        if (b.display_index !== a.display_index) {
            return b.display_index - a.display_index
        }
        return b.id - a.id
    })
}

const buildServerUpdatePayload = (server: ModelServer): ModelServerForm => ({
    name: server.name,
    display_index: server.display_index,
    enable_ddns: server.enable_ddns,
    hide_for_guest: server.hide_for_guest,
    note: server.note,
    public_note: server.public_note,
    account: server.account,
    expired_at: server.expired_at,
    ddns_profiles: server.ddns_profiles,
    override_ddns_domains: server.override_ddns_domains,
    purchase_price: server.purchase_price ?? null,
    purchase_date: server.purchase_date ?? null,
    purchase_years: server.purchase_years ?? null,
    monthly_traffic: server.monthly_traffic ?? null,
})
