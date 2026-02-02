"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CopyButtonProps {
  text: string
  ariaLabel?: string
  successMessage?: string
  errorMessage?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "sm" | "default" | "lg" | "icon"
  className?: string
}

export function CopyButton({
  text,
  ariaLabel = "Copy to clipboard",
  successMessage = "Copied to clipboard!",
  errorMessage = "Failed to copy",
  variant = "ghost",
  size = "sm",
  className = ""
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleCopy = async () => {
    if (!text || isLoading || isCopied) return

    setIsLoading(true)

    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      toast.success(successMessage)

      // Auto-reset after 2 seconds
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (error) {
      console.error("Copy failed:", error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const IconComponent = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />
    if (isCopied) return <Check className="h-4 w-4 text-green-600" />
    return <Copy className="h-4 w-4" />
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      disabled={isLoading || isCopied}
      aria-label={ariaLabel}
      className={className}
    >
      <IconComponent />
      <span className="sr-only">
        {isCopied ? "Copied!" : ariaLabel}
      </span>
    </Button>
  )
}