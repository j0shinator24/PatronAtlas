"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { revokeKeyAction } from "../_actions"

export function RevokeButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    const confirmed = window.confirm(
      `Revoke key "${name}"? Any apps using it will stop working immediately. This cannot be undone.`,
    )
    if (!confirmed) return
    const fd = new FormData()
    fd.set("id", id)
    startTransition(async () => {
      await revokeKeyAction(fd)
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
      aria-label={`Revoke ${name}`}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      <span className="ml-1.5">Revoke</span>
    </Button>
  )
}
