import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <Card className="group h-full border-border/50 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="pt-6 flex flex-col h-full">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-200 group-hover:bg-primary/15">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mt-auto">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
