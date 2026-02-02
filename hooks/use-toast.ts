"use client"

import { useState } from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  onOpenChange?: (open: boolean) => void
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const listeners: Array<(toasts: Toast[]) => void> = []
let memoryState: Toast[] = []

function dispatch(toasts: Toast[]) {
  memoryState = toasts
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function addToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch(memoryState.filter((t) => t.id !== toastId))
  }, 5000)

  toastTimeouts.set(toastId, timeout)
}

function removeToast(toastId: string) {
  const timeout = toastTimeouts.get(toastId)
  if (timeout) {
    clearTimeout(timeout)
    toastTimeouts.delete(toastId)
  }

  dispatch(memoryState.filter((t) => t.id !== toastId))
}

export function toast({
  title,
  description,
  variant = "default",
  ...props
}: Omit<ToastProps, "id">) {
  const id = genId()

  const update = (props: ToastProps) =>
    dispatch(
      memoryState.map((t) => (t.id === props.id ? { ...t, ...props } : t))
    )
  const dismiss = () => removeToast(id)

  dispatch([...memoryState, { id, title, description, variant, ...props }])

  addToRemoveQueue(id)

  return {
    id: id,
    dismiss,
    update,
  }
}

export function useToast() {
  const [state, setState] = useState<Toast[]>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    toast,
    dismiss: removeToast,
    toasts: state,
  }
}

// Need to import React for useEffect
import * as React from "react"