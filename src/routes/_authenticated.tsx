import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Bell, Dices, Gauge, Gem, History, LayoutDashboard, LogOut, Pickaxe, Settings, Shield, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notificationsQ, rolesQ } from "@/lib/data";
import { dt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/referrals", label: "Referrals", icon: Users },
  { to: "/mining", label: "Mining", icon: Pickaxe },
  { to: "/games", label: "Rewards", icon: Dices },
  { to: "/nfts", label: "NFTs", icon: Gem },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/presale", label: "Buy MVG", icon: Banknote },
  { to: "/activity", label: "Activity", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Layout() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data: roles } = useQuery({ ...rolesQ, enabled: !!session });
  const { data: notes } = useQuery({ ...notificationsQ, enabled: !!session });
  const isAdmin = roles?.some((r) => r.role === "admin");
  const unread = notes?.filter((n) => !n.read).length ?? 0;

  async function markRead() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const links = [...NAV, ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield } as const] : [])];
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Logo />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
              <l.icon className="size-4" /> {l.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" onClick={logout} className="justify-start"><LogOut /> Log out</Button>
        <p className="mt-3 text-xs text-muted-foreground">Created by Spidervarse</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:justify-end">
          <div className="md:hidden"><Logo /></div>
          <div className="flex items-center gap-1">
            <Popover onOpenChange={(o) => o && unread && markRead()}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                  <Bell />{unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-ember" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="max-h-96 w-80 overflow-auto">
                {notes?.length ? notes.map((n) => (
                  <div key={n.id} className="border-b py-2 last:border-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">{dt(n.created_at)}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No notifications yet</p>}
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={logout} aria-label="Log out"><LogOut /></Button>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b px-2 py-2 md:hidden">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground" activeProps={{ className: "bg-accent text-accent-foreground" }}>
              <l.icon className="size-3.5" /> {l.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
