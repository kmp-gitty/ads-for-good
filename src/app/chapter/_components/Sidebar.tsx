"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, IconName } from "./Icon";
import { Dropdown } from "./Dropdown";
import { useChapter } from "./ChapterContext";
import { CLIENTS } from "./mockdata";

type NavItem = { key: string; label: string; icon: IconName; badge?: string; locked?: boolean };

export function Sidebar({ inquiryUnreadCount = 0 }: { inquiryUnreadCount?: number } = {}) {
  const { client, setClient, sidebarOpen, setSidebarOpen, user, accessibleClientKeys } = useChapter();
  const pathname = usePathname();
  const isClientEmployee = user?.role === "client_employee";

  // Filter the dropdown list to clients the user can access. When
  // accessibleClientKeys is null (legacy CHAPTER_DASH_TOKEN cookie session, no
  // Supabase user resolved), fall through to all CLIENTS — matches old
  // chapter-staff-equivalent behavior so legacy operators aren't broken.
  const visibleClients = accessibleClientKeys
    ? CLIENTS.filter((c) => accessibleClientKeys.includes(c.id))
    : CLIENTS;

  // Three-role label. Falls back to "Chapter staff" if user is null so legacy
  // sessions show something sensible (rather than blank).
  const roleLabel =
    user?.role === "chapter_staff"     ? "Chapter staff" :
    user?.role === "agency_operator"   ? "Agency operator" :
    user?.role === "client_employee"   ? "Client employee" :
    "Chapter staff";

  // 5-group nav per the June 11 reorg work order.
  //   Actions     — Recommendations (top-of-mind synthesis, theme-grouped)
  //   Summary     — Lifecycle Overview (default landing post-login)
  //   Connections — Observations + Cross-Source Influence + Lagged Impact
  //   Analysis    — Lift / Attribution / Channel Roles
  //   Data        — Path Patterns / Journeys / Raw Performance
  const actions: NavItem[] = [
    { key: "recommendations", label: "Recommendations", icon: "observations" }, // icon swap can land later
  ];
  const summary: NavItem[] = [
    { key: "overview", label: "Lifecycle Overview", icon: "overview" },
  ];
  const connections: NavItem[] = [
    { key: "observations",              label: "Observations",           icon: "observations", badge: "8 new", locked: client.tier === "Starter" },
    { key: "connections/influence",     label: "Cross-Source Influence", icon: "influence" },
    { key: "connections/lagged-impact", label: "Lagged Impact",          icon: "lagged" },
  ];
  const analysis: NavItem[] = [
    { key: "lift",        label: "Lift, Incrementality & Value", icon: "lift" },
    { key: "attribution", label: "Attribution Models",           icon: "attribution" },
    { key: "channels",    label: "Channel Roles",                icon: "channels" },
  ];
  const data: NavItem[] = [
    { key: "paths",    label: "Path Patterns",     icon: "paths" },
    { key: "journeys", label: "Customer Journeys", icon: "journeys" },
    { key: "raw",      label: "Raw Performance",   icon: "raw" },
  ];
  // Support nav — Inbox lands under the data section as a separate group so
  // it's never confused with analytics. Visible for every role; the page
  // itself shows the read-only state for agency_operator.
  const support: NavItem[] = [
    {
      key: "inbox",
      label: "Inbox",
      icon: "observations",
      // Badge shows count of threads where Chapter team replied + client/agency
      // hasn't responded back. chapter_staff never sees this (count is 0 server-
      // side by design — they have the Gchat ping for their direction).
      badge: inquiryUnreadCount > 0 ? String(inquiryUnreadCount) : undefined,
    },
    {
      key: "billing",
      label: "Billing",
      icon: "observations",
    },
  ];

  // Default landing is /chapter/overview (Lifecycle Overview) per the
  // June 11 work order. Root /chapter aliases to Overview so navigation
  // without a slug still works.
  //
  // Sprint 5b real (June 14, 2026): sidebar links use the canonical client-
  // scoped form `/chapter/<client_key>/<slug>`. Middleware rewrites this
  // internally to the legacy `?client=` form so the existing page tree
  // renders unchanged. `isActive` recognises BOTH forms because in-app
  // navigation outside the sidebar (recommendation deep-links, pinned
  // observation router.push) still emits the legacy form pending step 4
  // backlog cleanup.
  const isActive = (key: string) =>
    pathname === `/chapter/${client.id}/${key}` ||
    pathname === `/chapter/${key}` ||
    (key === "overview" && (pathname === "/chapter" || pathname === `/chapter/${client.id}`));

  const renderNavItem = (it: NavItem) => (
    <Link
      key={it.key}
      href={`/chapter/${client.id}/${it.key}`}
      className={`nav-item ${isActive(it.key) ? "active" : ""} ${it.locked ? "locked" : ""}`}
    >
      <span className="icon"><Icon name={it.icon} size={16}/></span>
      <span>{it.label}</span>
      {it.locked
        ? <span className="pill lock"><Icon name="lock" size={9} /></span>
        : it.badge ? <span className="pill">{it.badge}</span> : null}
    </Link>
  );

  return (
    <>
      {/* Mobile scrim — tap outside the open sidebar to dismiss. */}
      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-mark">C</div>
        <div className="brand-name">Chapter<span>by afG</span></div>
      </div>

      {isClientEmployee ? (
        // Client employees see their assigned client as a static label, with
        // no switcher. The clientId is pinned in ChapterContext so URL
        // manipulation can't trick the UI into rendering another client.
        <div className="client-switch client-switch-static" role="presentation" aria-disabled="true">
          <span className="client-dot" style={{ background: client.color }}></span>
          <div className="client-info">
            <div className="client-label">Client · {client.tier}</div>
            <div className="client-name">{client.name}</div>
          </div>
        </div>
      ) : (
        <Dropdown align="left" width={220} trigger={
          <div className="client-switch" role="button">
            <span className="client-dot" style={{ background: client.color }}></span>
            <div className="client-info">
              <div className="client-label">Client · {client.tier}</div>
              <div className="client-name">{client.name}</div>
            </div>
            <span className="chev"><Icon name="chev" size={14}/></span>
          </div>
        }>
          {(close) => (
            <>
              <div className="dd-label">Switch client</div>
              {visibleClients.length === 0 && (
                <div className="dd-empty" style={{ padding: "10px 12px", fontSize: 12, color: "var(--ink-3)" }}>
                  No clients assigned yet.
                </div>
              )}
              {visibleClients.map(c => (
                <button key={c.id} className={`dd-item ${c.id === client.id ? "active" : ""}`} onClick={() => { setClient(c); close(); }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="client-dot" style={{ background: c.color }}></span>
                    <span>{c.name}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".1em" }}>{c.tier}</span>
                    {c.id === client.id && <span className="check"><Icon name="check" size={14}/></span>}
                  </span>
                </button>
              ))}
              <div className="dd-divider"></div>
              <button className="dd-item">
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="plus" size={14}/> Add a client
                </span>
              </button>
            </>
          )}
        </Dropdown>
      )}

      <div className="nav-section">
        <div className="nav-section-label">Actions</div>
        {actions.map(renderNavItem)}
      </div>
      <div className="nav-divider" />

      <div className="nav-section">
        <div className="nav-section-label">Summary</div>
        {summary.map(renderNavItem)}
      </div>
      <div className="nav-divider" />

      <div className="nav-section">
        <div className="nav-section-label">Connections</div>
        {connections.map(renderNavItem)}
      </div>
      <div className="nav-divider" />

      <div className="nav-section">
        <div className="nav-section-label">Analysis</div>
        {analysis.map(renderNavItem)}
      </div>
      <div className="nav-divider" />

      <div className="nav-section">
        <div className="nav-section-label">Data</div>
        {data.map(renderNavItem)}
      </div>
      <div className="nav-divider" />

      <div className="nav-section">
        <div className="nav-section-label">Support</div>
        {support.map(renderNavItem)}
      </div>

      <div className="sidebar-foot">
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-email" title={user.email}>{user.email}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
        )}
        <button
          type="button"
          className="sidebar-signout"
          onClick={async () => {
            try {
              await fetch("/api/chapter-auth/signout", { method: "POST" });
            } finally {
              window.location.href = "/chapter/login";
            }
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
    </>
  );
}
