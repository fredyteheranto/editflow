"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  LogOut,
  Settings,
  ShieldAlert,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";
import type { AppModuleKey } from "@/lib/platform/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell, type NotificacionRow } from "@/components/app/notification-bell";
import { InstallAppButton } from "@/components/pwa/pwa-install";
import { signOutAction } from "@/lib/actions/auth";

const MODULOS: { key: AppModuleKey; href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "clientes", href: "/app/clientes", label: "Clientes", icon: Users },
  { key: "monitoreo", href: "/app/monitoreo", label: "Monitoreo", icon: ClipboardList },
  { key: "calendario", href: "/app/calendario", label: "Calendario", icon: CalendarDays },
  { key: "metricas", href: "/app/metricas", label: "Métricas", icon: LineChart },
  { key: "bolsa", href: "/app/bolsa", label: "Bolsa de Empleo", icon: Briefcase },
];

const SOPORTE: { key: AppModuleKey; href: string; label: string; icon: typeof UsersRound }[] = [
  { key: "equipo", href: "/app/equipo", label: "Equipo", icon: UsersRound },
  { key: "configuracion", href: "/app/configuracion", label: "Configuración", icon: Settings },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function AppSidebar({
  memberName,
  avatarUrl,
  membershipId,
  notificaciones,
  allowedModules,
  isSuperAdmin = false,
}: {
  memberName: string;
  avatarUrl: string | null;
  membershipId: string;
  notificaciones: NotificacionRow[];
  allowedModules?: AppModuleKey[];
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [cerrando, startCerrar] = useTransition();
  const modulosVisibles = allowedModules
    ? MODULOS.filter((m) => allowedModules.includes(m.key))
    : MODULOS;
  const soporteVisible = allowedModules
    ? SOPORTE.filter((s) => allowedModules.includes(s.key))
    : SOPORTE;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="EditFlow" className="size-8 shrink-0 object-contain" />
          <div className="ml-auto group-data-[collapsible=icon]:hidden">
            <NotificationBell membershipId={membershipId} initial={notificaciones} />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modulosVisibles.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(href)} tooltip={label}>
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Soporte</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {soporteVisible.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(href)} tooltip={label}>
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/super-admin")} tooltip="Super Admin">
                    <Link href="/super-admin" className="text-primary">
                      <ShieldAlert />
                      <span>Super Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <InstallAppButton variant="sidebar" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-sidebar-accent"
            >
              <Avatar className="size-7">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={memberName} />}
                <AvatarFallback className="text-xs">{initials(memberName)}</AvatarFallback>
              </Avatar>
              <span className="truncate text-sm group-data-[collapsible=icon]:hidden">{memberName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-52">
            {(!allowedModules || allowedModules.includes("configuracion")) && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/app/configuracion">
                    <UserCog className="size-4" />
                    Mi perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              disabled={cerrando}
              onSelect={(e) => {
                e.preventDefault();
                startCerrar(() => signOutAction());
              }}
              className="text-danger focus:text-danger"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
