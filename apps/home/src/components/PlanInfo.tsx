import { PublicNoteData, cn } from "@/lib/utils"

export default function PlanInfo({ parsedData }: { parsedData?: PublicNoteData | null }) {
  if (!parsedData || !parsedData.planDataMod) {
    return null
  }

  const plan = parsedData.planDataMod
  const extraRaw = plan.extra ?? ""
  const extraList =
    extraRaw.split(",").length > 1
      ? extraRaw.split(",").map((item) => item.trim()).filter((item) => item !== "")
      : extraRaw
        ? [extraRaw.trim()]
        : []
  const networkRouteRaw = plan.networkRoute ?? ""
  const networkRouteSegments = networkRouteRaw ? networkRouteRaw.split(",") : []

  return (
    <section className="flex gap-1 items-center flex-wrap mt-0.5">
      {plan.bandwidth && (
        <p className={cn("text-[9px] bg-blue-600 dark:bg-blue-800 text-blue-200 dark:text-blue-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}>
          {plan.bandwidth}
        </p>
      )}
      {plan.trafficVol && (
        <p className={cn("text-[9px] bg-green-600 text-green-200 dark:bg-green-800 dark:text-green-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}>
          {plan.trafficVol}
        </p>
      )}
      {plan.IPv4 === "1" && (
        <p
          className={cn("text-[9px] bg-purple-600 text-purple-200 dark:bg-purple-800 dark:text-purple-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}
        >
          IPv4
        </p>
      )}
      {plan.IPv6 === "1" && (
        <p className={cn("text-[9px] bg-pink-600 text-pink-200 dark:bg-pink-800 dark:text-pink-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}>
          IPv6
        </p>
      )}
      {networkRouteSegments.length > 0 && (
        <p className={cn("text-[9px] bg-blue-600 text-blue-200 dark:bg-blue-800 dark:text-blue-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}>
          {networkRouteSegments.map((route, index) => {
            return route + (index === networkRouteSegments.length - 1 ? "" : "｜")
          })}
        </p>
      )}
      {extraList.map((extra, index) => {
        return (
          <p
            key={index}
            className={cn("text-[9px] bg-stone-600 text-stone-200 dark:bg-stone-800 dark:text-stone-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}
          >
            {extra}
          </p>
        )
      })}
    </section>
  )
}
