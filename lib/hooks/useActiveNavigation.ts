import { usePathname } from "next/navigation"

export const useActiveNavigation = () => {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const getLinkStyles = (href: string, baseClass: string = "") => {
    return `${baseClass} ${isActive(href)
      ? "font-semibold text-foreground"
      : "text-muted-foreground hover:text-foreground"}`
  }

  return { isActive, getLinkStyles }
}