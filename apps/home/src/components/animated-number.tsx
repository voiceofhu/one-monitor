import { useLayoutEffect, useRef } from "react"
import { gsap } from "gsap"

interface AnimatedNumberProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  format?: (value: number) => string
}

export function AnimatedNumber({
  value,
  duration = 0.6,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  format,
}: AnimatedNumberProps) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const previousValue = useRef<number>(value)

  useLayoutEffect(() => {
    if (!nodeRef.current || typeof value !== "number" || Number.isNaN(value)) {
      return
    }

    const start = previousValue.current
    const target = { val: start }
    previousValue.current = value

    const animation = gsap.to(target, {
      val: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        if (!nodeRef.current) return
        const formatted = format ? format(target.val) : `${prefix}${target.val.toFixed(decimals)}${suffix}`
        nodeRef.current.textContent = formatted
      },
    })

    return () => {
      animation.kill()
    }
  }, [value, duration, decimals, prefix, suffix, format])

  const initialText = format
    ? format(typeof value === "number" && !Number.isNaN(value) ? value : 0)
    : `${prefix}${(typeof value === "number" && !Number.isNaN(value) ? value : 0).toFixed(decimals)}${suffix}`

  return (
    <span ref={nodeRef} className={className}>
      {initialText}
    </span>
  )
}
