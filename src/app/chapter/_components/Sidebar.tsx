"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, IconName } from "./Icon";
import { Dropdown } from "./Dropdown";
import { useChapter } from "./ChapterContext";
import { CLIENTS } from "./mockdata";

type NavItem = { key: string; label: string; icon: IconName; badge?: string; locked?: boolean };

export function Sidebar() {
  const { client, setClient } = useChapter();
  const pathname = usePathname();

  const obsItem: NavItem = {
    key: "observations", label: "Observations", icon: "observations",
    badge: "8 new", locked: client.tier === "Starter",
  };
  const analyze: NavItem[] = [
    { key: "overview",    label: "Lifecycle Overview",    icon: "overview" },
    { key: "channels",    label: "Channel Roles",         icon: "channels" },
    { key: "paths",       label: "Path Patterns",         icon: "paths" },
    { key: "lift",        label: "Lift & Incrementality", icon: "lift" },
    { key: "attribution", label: "Attribution Models",    icon: "attribution" },
    { key: "journeys",    label: "Customer Journeys",     icon: "journeys" },
    { key: "raw",         label: "Raw Performance",       icon: "raw" },
  ];

  const isActive = (key: string) => pathname === `/chapter/${key}` || (key === "observations" && pathname === "/chapter");

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">C</div>
        <div className="brand-name">Chapter<span>by afG</span></div>
      </div>

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
            {CLIENTS.map(c => (
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

      <div className="nav-section">
        <Link
          href={`/chapter/${obsItem.key}`}
          className={`nav-item ${isActive(obsItem.key) ? "active" : ""} ${obsItem.locked ? "locked" : ""}`}
        >
          <span className="icon"><Icon name={obsItem.icon} size={16}/></span>
          <span>{obsItem.label}</span>
          {obsItem.locked
            ? <span className="pill lock"><Icon name="lock" size={9} /></span>
            : obsItem.badge ? <span className="pill">{obsItem.badge}</span> : null}
        </Link>
      </div>

      <div className="nav-section">
        <div className="nav-section-label">Analyze</div>
        {analyze.map(it => (
          <Link
            key={it.key}
            href={`/chapter/${it.key}`}
            className={`nav-item ${isActive(it.key) ? "active" : ""} ${it.locked ? "locked" : ""}`}
          >
            <span className="icon"><Icon name={it.icon} size={16}/></span>
            <span>{it.label}</span>
            {it.locked
              ? <span className="pill lock"><Icon name="lock" size={9} /></span>
              : it.badge ? <span className="pill">{it.badge}</span> : null}
          </Link>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-section-label">Configure</div>
        <button className="nav-item">
          <span className="icon"><Icon name="settings" size={16}/></span>
          <span>Pixel & sources</span>
        </button>
        <button className="nav-item">
          <span className="icon"><Icon name="cohort" size={16}/></span>
          <span>Audiences</span>
        </button>
      </div>

      <div className="sidebar-foot">
        <div className="user-av">JR</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontSize: 12, fontWeight: 500 }}>Jordan R.</div>
          <div style={{ fontSize: 11 }}>Agency operator</div>
        </div>
      </div>
    </aside>
  );
}
