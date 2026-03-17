"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const glassButtonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 group relative overflow-hidden",
    {
        variants: {
            variant: {
                default: "bg-white/80 hover:bg-white border border-slate-200/60 text-slate-900 shadow-sm backdrop-blur-md",
                primary: "bg-blue-600/90 hover:bg-blue-600 text-white border border-blue-400/20 shadow-lg shadow-blue-500/20 backdrop-blur-md",
                outline: "bg-transparent border border-slate-200 hover:bg-slate-50 text-slate-600",
                ghost: "bg-transparent hover:bg-slate-100/50 text-slate-600",
                danger: "bg-red-500/90 hover:bg-red-500 text-white border border-red-400/20 shadow-lg shadow-red-500/20 backdrop-blur-md",
            },
            size: {
                default: "h-11 px-6 py-2",
                sm: "h-9 rounded-lg px-3",
                lg: "h-13 rounded-2xl px-8 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface GlassButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
    asChild?: boolean
    isLoading?: boolean
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
    ({ className, variant, size, asChild = false, isLoading, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(glassButtonVariants({ variant, size, className }))}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Please wait...</span>
                    </div>
                ) : (
                    <span className="relative z-10">{props.children}</span>
                )}
                {variant !== 'ghost' && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                )}
            </Comp>
        )
    }
)
GlassButton.displayName = "GlassButton"

export { GlassButton, glassButtonVariants }
