"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  Settings2,
  LayoutDashboard,
  Calculator,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { User } from "next-auth";

export function AppSidebar({
  user,
  organizationid,
  memberships,
  signout,
  ...props
}: {
  user: User;
  organizationid: string;
  memberships: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  }[];
  signout: () => Promise<void>;
} & React.ComponentProps<typeof Sidebar>) {
  const navMain = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Accounting",
      url: "#",
      icon: Calculator,
      items: [
        {
          title: "Register",
          url: "/accounting/register",
        },
        {
          title: "Chart of Accounts",
          url: "/accounting/accounts",
        },
        {
          title: "Classes",
          url: "/accounting/classes",
        },
        {
          title: "Payees",
          url: "/accounting/payees",
        },
        {
          title: "Profit & Loss",
          url: "/accounting/reports/profit-loss",
        },
        {
          title: "Balance Sheet",
          url: "/accounting/reports/balance-sheet",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: `/organizations/${organizationid}/billing`,
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={memberships}
          activeOrganizationId={organizationid}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} signout={signout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
