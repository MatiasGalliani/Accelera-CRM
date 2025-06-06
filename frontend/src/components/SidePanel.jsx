import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/auth/AuthContext"
import logo from "@/assets/Accelera_logo.svg"
import { Sparkle } from "@phosphor-icons/react"

// shadcn/ui components
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Icons } from "@/components/icons"

export default function SidePanel() {
  const { user, logout, isAdminEmail, loading } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // close mobile drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  if (loading || !user) return null

  // determine roles
  const isAdmin =
    user.role === "admin" ||
    (typeof isAdminEmail === "function" && isAdminEmail(user.email))
  const isCampaignManager = user.role === "campaign_manager"

  // build nav list, re-adding the disabled items we'd lost
  const navItems = [
    { title: "Home", to: "/", icon: Icons.house },
    ...(isAdmin
      ? [
          { title: "Gestione utenti", to: "/users", icon: Icons.users },
          { title: "Leads agenti", to: "/admin-leads", icon: Icons.userList },
          /*{
            title: "Eugenio AI",
            to: "/eugenio-chat",
            icon: Icons.sparkle,
          },*/
          {
            title: "Richieste Documentali",
            to: "/admin-cases",
            icon: Icons.files,
            disabled: true,
          },
        ]
      : isCampaignManager
      ? [
          { title: "Leads Campagna", to: "/campaign-leads", icon: Icons.megaphone },
          /*{
            title: "Eugenio AI",
            to: "/eugenio-chat",
            icon: Icons.sparkle,
          },*/
        ]
      : [
          { title: "My Leads", to: "/agent/my-leads", icon: Icons.userList },
          /* {
            title: "Eugenio AI",
            to: "/eugenio-chat",
            icon: Icons.sparkle,
          },*/
          {
            title: "Richieste Documentali",
            to: "/my-cases",
            icon: Icons.files,
          },
          {
            title: "Pre Istruttoria Documenti IA",
            to: "/client-type",
            icon: Icons.brain,
          },
        ]),
  ]

  return (
    <>
      {/* Mobile Hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50"
          >
            <Icons.menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <Link to="/" onClick={() => setOpen(false)}>
                <img src={logo} alt="Accelera" className="h-8" />
              </Link>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Icons.x className="h-6 w-6" />
                </Button>
              </SheetTrigger>
            </div>
            <Separator />

            {/* Nav */}
            <ScrollArea className="flex-1 p-4">
              <nav className="space-y-1">
                {navItems.map(({ title, to, icon: Icon, disabled }) => (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      disabled
                        ? "text-gray-400 cursor-not-allowed"
                        : location.pathname === to
                        ? "bg-gray-900 text-white"
                        : "text-muted-foreground hover:bg-gray-900 hover:text-white transition-all"
                    )}
                    onClick={e => disabled && e.preventDefault()}
                  >
                    <Icon className="mr-2 h-5 w-5" />
                    {title}
                  </Link>
                ))}
              </nav>
            </ScrollArea>

            <Separator />
            {/* Logout */}
            <div className="p-4">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-gray-900 hover:text-white transition-colors"
                onClick={logout}
              >
                <Icons.logOut className="mr-2 h-5 w-5 text-red-500" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Static Sidebar for lg+ */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-white border-r fixed">
        <div className="flex items-center justify-center p-6">
          <Link to="/">
            <img src={logo} alt="Accelera" className="h-12" />
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ title, to, icon: Icon, disabled }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                disabled
                  ? "text-gray-400 cursor-not-allowed"
                  : location.pathname === to
                  ? "bg-gray-900 text-white"
                  : "text-muted-foreground hover:bg-gray-900 hover:text-white transition-all"
              )}
              onClick={e => disabled && e.preventDefault()}
            >
              <Icon className="mr-2 h-5 w-5" />
              {title}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-gray-900 hover:text-white transition-colors"
            onClick={logout}
          >
            <Icons.logOut className="mr-2 h-5 w-5 text-red-500" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  )
}
