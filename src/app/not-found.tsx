import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function NotFound() {
  return (
    <section className="flex flex-col items-center justify-center py-32 px-4 text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/">
        <Button size="lg">
          Back to home
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </section>
  )
}
