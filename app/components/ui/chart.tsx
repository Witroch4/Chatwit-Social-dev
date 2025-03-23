"use client"

import * as React from "react"
import { useId } from "react"
import { cn } from "@/lib/utils"
import { ResponsiveContainer, Tooltip, TooltipProps } from "recharts"

export interface ChartConfig {
  [key: string]: {
    label: string
    color?: string
  }
}

interface ChartContextValue extends ChartConfig {
  hiddenKeys: string[]
  toggleKey: (key: string) => void
}

const ChartContext = React.createContext<ChartContextValue | undefined>(
  undefined
)

export function ChartContainer({
  config,
  children,
  className,
  hideLegend,
  hideToolbar,
  maxHeight = 350,
}: {
  config: ChartConfig
  children: React.ReactNode
  className?: string
  hideLegend?: boolean
  hideToolbar?: boolean
  maxHeight?: number
}) {
  const [hiddenKeys, setHiddenKeys] = React.useState<string[]>([])
  const id = useId()

  function toggleKey(key: string) {
    setHiddenKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key)
      }
      return [...prev, key]
    })
  }

  return (
    <ChartContext.Provider
      value={{
        ...config,
        hiddenKeys,
        toggleKey,
      }}
    >
      <style>
        {Object.entries(config).map(
          ([key, { color }]) => `
            :root {
              --color-${key}: ${color || `hsl(var(--chart-${id}-color))`};
            }
          `
        )}
      </style>
      <div
        className={cn(
          "md:rounded-lg border bg-background text-card-foreground shadow animate-in fade-in-50 xl:col-span-3",
          className
        )}
      >
        <div className={cn("p-2", hideToolbar ? "sr-only" : "")}>
          {!hideLegend && <ChartLegend />}
        </div>
        <div
          className={cn("w-full", hideToolbar ? "h-[200px]" : "")}
          style={{ maxHeight }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </div>
    </ChartContext.Provider>
  )
}

export function ChartLegend() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("ChartLegend should be used within ChartContainer")
  }

  const { hiddenKeys, toggleKey, ...config } = context

  return (
    <div className="flex items-center gap-4 flex-wrap overflow-x-auto py-1">
      {Object.entries(config).map(([key, { label, color }]) => (
        <button
          type="button"
          key={key}
          onClick={() => toggleKey(key)}
          className={cn(
            "inline-flex items-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            hiddenKeys.includes(key) ? "opacity-50" : ""
          )}
        >
          <span
            className={cn(
              "mr-1.5 h-2 w-2 rounded-full",
              color ? "bg-current" : "bg-current"
            )}
            style={{
              color: `var(--color-${key})`,
            }}
          />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  )
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  formatter,
  labelFormatter,
  hideLabel = false,
  indicator = "line",
}: TooltipProps & {
  formatter?: (value: number, name: string, entry: any, index: number) => React.ReactNode
  labelFormatter?: (label: string) => React.ReactNode
  hideLabel?: boolean
  indicator?: "line" | "dot" | "dashed"
}) {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("ChartTooltipContent should be used within ChartContainer")
  }

  const { hiddenKeys, ...config } = context

  if (!active || !payload?.length) {
    return null
  }

  const filteredPayload = payload.filter(
    ({ dataKey }) => !hiddenKeys.includes(String(dataKey))
  )

  if (!filteredPayload.length) {
    return null
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-2 shadow-md animate-in fade-in-50 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
        className
      )}
    >
      {!hideLabel && (
        <div className="mb-2 px-2 text-sm font-medium">
          {labelFormatter ? labelFormatter(label as string) : label}
        </div>
      )}
      <div className="grid gap-0.5">
        {filteredPayload.map(({ value, name, dataKey }, index) => {
          const formattedValue = formatter
            ? formatter(value as number, name, payload[index], index)
            : value

          return (
            <div
              key={`item-${index}`}
              className="flex items-center justify-between gap-2 px-2 py-1"
            >
              <div className="flex items-center gap-1">
                {indicator === "line" && (
                  <div
                    className="h-0.5 w-4"
                    style={{
                      backgroundColor: `var(--color-${dataKey})`,
                    }}
                  />
                )}
                {indicator === "dot" && (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: `var(--color-${dataKey})`,
                    }}
                  />
                )}
                {indicator === "dashed" && (
                  <div
                    className="h-0.5 w-4"
                    style={{
                      backgroundImage: `linear-gradient(to right, var(--color-${dataKey}) 50%, transparent 50%)`,
                      backgroundSize: "6px 100%",
                    }}
                  />
                )}
                <span className="text-xs">
                  {(config[dataKey as string]?.label ?? name) || dataKey}
                </span>
              </div>
              <div className="font-medium">{formattedValue}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 