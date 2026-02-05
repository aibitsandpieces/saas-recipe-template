import { usePathname } from "next/navigation"

export const useActiveNavigation = () => {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const getLinkStyles = (href: string, baseClass: string = "") => {
    return `${baseClass} ${isActive(href)
      ? "font-semibold text-amber"
      : "text-warm-white hover:text-amber"}`
  }

  return { isActive, getLinkStyles }
}