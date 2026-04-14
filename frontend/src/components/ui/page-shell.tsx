'use client'

import * as React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  LayoutDashboard,
  ShieldCheck,
  Settings,
  Terminal,
  BrainCircuit,
  Box,
  Search,
  Plus,
  BarChart3
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from './sidebar'
import { Separator } from './separator'
import { Button } from './button'

const NAV_ITEMS = [
  {
    title: 'Cockpit',
    url: '/cockpit',
    icon: LayoutDashboard,
  },
  {
    title: 'Governance',
    url: '/cockpit/governance',
    icon: ShieldCheck,
  },
  {
    title: 'Observability',
    url: '/cockpit/observability',
    icon: Activity,
  },
  {
    title: 'Settings',
    url: '/cockpit/settings',
    icon: Settings,
  },
]

const SECONDARY_NAV = [
  {
    title: 'Terminal',
    url: '/cockpit/terminal',
    icon: Terminal,
  },
  {
    title: 'Brain',
    url: '/cockpit/brain',
    icon: BrainCircuit,
  },
]

export function PageShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/50">
        <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/50">
          <div className="flex items-center gap-2 font-semibold">
            <div className="size-6 rounded bg-primary flex items-center justify-center">
              <Box className="size-4 text-primary-foreground" />
            </div>
            <span className="truncate group-data-[collapsible=icon]:hidden">Control Plane</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SECONDARY_NAV.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-border/50 p-4">
          <div className="flex items-center gap-4 group-data-[collapsible=icon]:hidden">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">admin@system</p>
              <p className="text-[10px] text-muted-foreground truncate">v2.0.0-gamma</p>
            </div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-background/80 backdrop-blur-md px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-sm font-medium">
              {NAV_ITEMS.find(i => i.url === location.pathname)?.title || 'Control Plane'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="size-8">
               <Search className="size-4" />
             </Button>
             <Button size="sm" className="h-8 gap-1.5 px-3">
               <Plus className="size-3.5" />
               <span>New Task</span>
             </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-sidebar/10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
