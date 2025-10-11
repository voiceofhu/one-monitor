import { PublicNoteData, cn, getDaysBetweenDatesWithAutoRenewal, resolveCycleInfo } from "@/lib/utils"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"

import RemainPercentBar from "./RemainPercentBar"

export default function BillingInfo({ parsedData }: { parsedData?: PublicNoteData | null }) {
  const { t } = useTranslation()
  const billing = parsedData?.billingDataMod

  if (!billing) {
    return null
  }

  const { months, label: cycleLabel } = resolveCycleInfo(billing.cycle)
  const billingModel = (billing.billingModel || "").toLowerCase()
  const purchaseDateRaw = billing.purchaseDate || billing.startDate
  const purchaseDate = purchaseDateRaw && dayjs(purchaseDateRaw).isValid() ? dayjs(purchaseDateRaw).format("YYYY-MM-DD") : undefined
  const startDateRaw = billing.startDate || purchaseDateRaw
  const startDate = startDateRaw && dayjs(startDateRaw).isValid() ? dayjs(startDateRaw).format("YYYY-MM-DD") : undefined
  const startDay = startDate ? dayjs(startDate) : null

  let effectiveEndDate = billing.endDate && dayjs(billing.endDate).isValid() ? dayjs(billing.endDate).format("YYYY-MM-DD") : undefined
  const inferredEndDate =
    !effectiveEndDate && startDay && months > 0 ? startDay.add(months, "month").format("YYYY-MM-DD") : effectiveEndDate
  effectiveEndDate = inferredEndDate
  const isNeverExpire = Boolean(effectiveEndDate && effectiveEndDate.startsWith("0000-00-00"))

  const priceSource = billing.purchasePrice ?? billing.amount ?? ""
  const parsedPrice = Number.parseFloat(priceSource || "")
  const numericPrice = Number.isFinite(parsedPrice) ? parsedPrice : 0
  const isUsageBased = billing.amount === "-1"
  const isFree = billing.isFree === true || (!isUsageBased && numericPrice === 0)
  const currency = billing.currency ?? ""
  const currencyPrefix = currency ? `${currency}` : ""

  const isPermanent =
    billingModel === "permanent" ||
    billingModel === "lifetime" ||
    (!billing.cycle && billing.autoRenewal !== "1") ||
    billingModel === "固定"

  let dailyValue: number | null = null
  if (isUsageBased) {
    dailyValue = null
  } else if (isFree) {
    dailyValue = 0
  } else if (isPermanent) {
    if (purchaseDate) {
      const daysSince = Math.max(1, dayjs().diff(dayjs(purchaseDate), "day") || 1)
      dailyValue = numericPrice / daysSince
    }
  } else if (startDay && effectiveEndDate && dayjs(effectiveEndDate).isValid()) {
    const endDay = dayjs(effectiveEndDate)
    const periodDays = Math.max(1, endDay.diff(startDay, "day") || 1)
    dailyValue = numericPrice / periodDays
  }

  const cycleSummary = !isPermanent
    ? getDaysBetweenDatesWithAutoRenewal({
        autoRenewal: billing.autoRenewal,
        cycle: billing.cycle,
        startDate,
        endDate: effectiveEndDate,
      })
    : null

  const priceNodes: JSX.Element[] = []
  if (isPermanent) {
    if (isFree) {
      priceNodes.push(<p className={cn("text-[10px] text-green-600 ")} key="price-free">{t("billingInfo.free")}</p>)
    } else if (priceSource) {
      priceNodes.push(
        <p className={cn("text-[10px] text-muted-foreground ")} key="price-permanent">
          {t("billingInfo.price")}: {currencyPrefix}
          {priceSource}
        </p>,
      )
    }
  } else {
    if (billing.amount && billing.amount !== "0" && billing.amount !== "-1") {
      priceNodes.push(
        <p className={cn("text-[10px] text-muted-foreground ")} key="price-recurring">
          {t("billingInfo.price")}: {currencyPrefix}
          {billing.amount}/{billing.cycle ?? cycleLabel}
        </p>,
      )
    } else if (isFree || billing.amount === "0") {
      priceNodes.push(<p className={cn("text-[10px] text-green-600 ")} key="price-free">{t("billingInfo.free")}</p>)
    } else if (billing.amount === "-1") {
      priceNodes.push(
        <p className={cn("text-[10px] text-pink-600 ")} key="price-usage">
          {t("billingInfo.usage-baseed")}
        </p>,
      )
    }
  }

  const detailNodes: JSX.Element[] = [...priceNodes]

  if (purchaseDate && isPermanent) {
    detailNodes.push(
      <div className={cn("text-[10px] text-muted-foreground")} key="purchase-date">
        购买日期: {purchaseDate}
      </div>,
    )
  }

  if (!isPermanent) {
    if (startDate) {
      detailNodes.push(
        <div className={cn("text-[10px] text-muted-foreground")} key="start-date">
          开始日期: {startDate}
        </div>,
      )
    }
    if (effectiveEndDate && !isNeverExpire) {
      detailNodes.push(
        <div className={cn("text-[10px] text-muted-foreground")} key="end-date">
          结束日期: {effectiveEndDate}
        </div>,
      )
    }
  }

  if (!isPermanent && cycleSummary) {
    if (cycleSummary.days >= 0) {
      detailNodes.push(
        <div className={cn("text-[10px] text-muted-foreground")} key="remaining">
          {t("billingInfo.remaining")}:{" "}
          {isNeverExpire ? t("billingInfo.indefinite") : `${cycleSummary.days} ${t("billingInfo.days")}`}
        </div>,
      )
      if (!isNeverExpire) {
        detailNodes.push(
          <RemainPercentBar
            className="mt-0.5"
            key="remain-bar"
            value={Math.max(0, Math.min(100, cycleSummary.remainingPercentage * 100))}
          />,
        )
      }
    } else {
      detailNodes.push(
        <p className={cn("text-[10px] text-muted-foreground text-red-600")} key="expired">
          {t("billingInfo.expired")}: {Math.abs(cycleSummary.days)} {t("billingInfo.days")}
        </p>,
      )
    }
  }

  if (dailyValue !== null && !Number.isNaN(dailyValue)) {
    detailNodes.push(
      <div className={cn("text-[10px] text-muted-foreground")} key="daily-value">
        每日价值: {currencyPrefix}
        {dailyValue === 0 ? "0" : dailyValue.toFixed(2)}
      </div>,
    )
  }

  return <>{detailNodes}</>
}
