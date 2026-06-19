"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAgency,
  updateAgency,
  createAllowedDomain,
  updateAllowedDomainNotes,
  revokeAllowedDomain,
  revokeUser,
  unrevokeUser,
  updateUserRole,
  assignClientToAgency,
} from "./_actions";
import type { Agency, AllowedDomain, User, Client } from "./page";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400";

const cardCls = "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm";

export default function TenantsBoard({
  agencies,
  domains,
  users,
  clients,
}: {
  agencies: Agency[];
  domains: AllowedDomain[];
  users: User[];
  clients: Client[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-10">
      <AgencySection agencies={agencies} clients={clients} onSuccess={refresh} pending={pending} />
      <DomainSection
        domains={domains}
        agencies={agencies}
        clients={clients}
        onSuccess={refresh}
        pending={pending}
      />
      <ClientAssignSection clients={clients} agencies={agencies} onSuccess={refresh} pending={pending} />
      <UserSection users={users} agencies={agencies} clients={clients} onSuccess={refresh} pending={pending} />
    </div>
  );
}

// ─── Agencies ───────────────────────────────────────────────────────────────

function AgencySection({
  agencies,
  clients,
  onSuccess,
  pending,
}: {
  agencies: Agency[];
  clients: Client[];
  onSuccess: () => void;
  pending: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [agencyKey, setAgencyKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, startSubmit] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSubmit(async () => {
      const res = await createAgency({
        agency_key: agencyKey,
        display_name: displayName,
        contact_email: contactEmail,
        notes,
      });
      if (!res.ok) return setError(res.error);
      setAgencyKey("");
      setDisplayName("");
      setContactEmail("");
      setNotes("");
      onSuccess();
    });
  }

  function clientCount(agency_key: string) {
    return clients.filter(c => c.agency_key === agency_key).length;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Agencies</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Each agency groups one or more clients. Agency operators log in scoped to all clients within their agency.
      </p>

      <div className={`${cardCls} mt-4`}>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">New agency</h3>
        <form onSubmit={onSubmit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Agency key</span>
            <span className="block text-xs text-neutral-500">Lowercase snake_case (e.g. <code>lift_agency</code>)</span>
            <input
              type="text"
              value={agencyKey}
              onChange={e => setAgencyKey(e.target.value)}
              placeholder="lift_agency"
              required
              className={inputCls + " mt-1 font-mono"}
            />
          </label>
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Lift Agency"
              required
              className={inputCls + " mt-1"}
            />
          </label>
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Contact email (optional)</span>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="ops@liftagency.com"
              className={inputCls + " mt-1"}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="block font-semibold text-neutral-800">Notes (optional)</span>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={inputCls + " mt-1"}
            />
          </label>
          {error && (
            <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting || pending}
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create agency"}
            </button>
          </div>
        </form>
      </div>

      <div className={`${cardCls} mt-4 overflow-hidden p-0`}>
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-left">Agency key</th>
              <th className="px-4 py-3 text-left">Display name</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-right">Clients</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {agencies.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
                  No agencies yet.
                </td>
              </tr>
            ) : (
              agencies.map(a => (
                <AgencyRow
                  key={a.agency_key}
                  agency={a}
                  clientCount={clientCount(a.agency_key)}
                  onSuccess={onSuccess}
                  pending={pending}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AgencyRow({
  agency,
  clientCount,
  onSuccess,
  pending,
}: {
  agency: Agency;
  clientCount: number;
  onSuccess: () => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(agency.display_name);
  const [contactEmail, setContactEmail] = useState(agency.contact_email ?? "");
  const [notes, setNotes] = useState(agency.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  function onCancel() {
    setDisplayName(agency.display_name);
    setContactEmail(agency.contact_email ?? "");
    setNotes(agency.notes ?? "");
    setError(null);
    setEditing(false);
  }

  function onSave() {
    setError(null);
    startSave(async () => {
      const res = await updateAgency({
        agency_key: agency.agency_key,
        display_name: displayName,
        contact_email: contactEmail,
        notes,
      });
      if (!res.ok) return setError(res.error);
      setEditing(false);
      onSuccess();
    });
  }

  if (!editing) {
    return (
      <tr className="border-b border-neutral-100 last:border-0">
        <td className="px-4 py-3 font-mono">{agency.agency_key}</td>
        <td className="px-4 py-3">{agency.display_name}</td>
        <td className="px-4 py-3 text-xs text-neutral-600">{agency.contact_email ?? "—"}</td>
        <td className="px-4 py-3 text-right font-mono">{clientCount}</td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={pending}
            className="text-xs text-orange-700 hover:text-orange-900 disabled:opacity-50"
          >
            Edit
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0 bg-orange-50/30">
      <td className="px-4 py-3 font-mono align-top">{agency.agency_key}</td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className={inputCls + " text-sm"}
        />
      </td>
      <td className="px-4 py-3" colSpan={2}>
        <input
          type="email"
          value={contactEmail}
          onChange={e => setContactEmail(e.target.value)}
          placeholder="Contact email"
          className={inputCls + " text-sm mb-2"}
        />
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes"
          className={inputCls + " text-sm"}
        />
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </td>
      <td className="px-4 py-3 text-right align-top">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || pending}
            className="text-xs font-semibold text-orange-700 hover:text-orange-900 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || pending}
            className="text-xs text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Allowed email domains ──────────────────────────────────────────────────

function DomainSection({
  domains,
  agencies,
  clients,
  onSuccess,
  pending,
}: {
  domains: AllowedDomain[];
  agencies: Agency[];
  clients: Client[];
  onSuccess: () => void;
  pending: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [role, setRole] = useState<"chapter_staff" | "agency_operator" | "client_employee">("agency_operator");
  const [agencyKey, setAgencyKey] = useState("");
  const [clientKey, setClientKey] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [showRevoked, setShowRevoked] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSubmit(async () => {
      const res = await createAllowedDomain({ domain, role, agency_key: agencyKey, client_key: clientKey, notes });
      if (!res.ok) return setError(res.error);
      setDomain("");
      setAgencyKey("");
      setClientKey("");
      setNotes("");
      onSuccess();
    });
  }

  function onRevoke(id: string) {
    if (!window.confirm("Revoke this domain rule? Existing users keep access.")) return;
    startSubmit(async () => {
      await revokeAllowedDomain(id);
      onSuccess();
    });
  }

  const visibleDomains = showRevoked ? domains : domains.filter(d => !d.revoked_at);

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Allowed login domains</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Email domains that auto-provision a user row on first magic-link login. Public domains like gmail.com are blocked at the DB level.
      </p>

      <div className={`${cardCls} mt-4`}>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">New domain rule</h3>
        <form onSubmit={onSubmit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Domain</span>
            <input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="liftagency.com"
              required
              className={inputCls + " mt-1 font-mono"}
            />
          </label>
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Role</span>
            <select
              value={role}
              onChange={e => setRole(e.target.value as typeof role)}
              className={inputCls + " mt-1"}
            >
              <option value="chapter_staff">chapter_staff (Chapter team, global access)</option>
              <option value="agency_operator">agency_operator (agency partner)</option>
              <option value="client_employee">client_employee (client-side user)</option>
            </select>
          </label>
          {role === "agency_operator" && (
            <label className="block text-sm">
              <span className="block font-semibold text-neutral-800">Agency *</span>
              <select
                value={agencyKey}
                onChange={e => setAgencyKey(e.target.value)}
                required
                className={inputCls + " mt-1"}
              >
                <option value="">— pick agency —</option>
                {agencies.map(a => (
                  <option key={a.agency_key} value={a.agency_key}>
                    {a.display_name} ({a.agency_key})
                  </option>
                ))}
              </select>
            </label>
          )}
          {role === "client_employee" && (
            <label className="block text-sm">
              <span className="block font-semibold text-neutral-800">Client *</span>
              <select
                value={clientKey}
                onChange={e => setClientKey(e.target.value)}
                required
                className={inputCls + " mt-1"}
              >
                <option value="">— pick client —</option>
                {clients.map(c => (
                  <option key={c.client_key} value={c.client_key}>{c.client_key}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm sm:col-span-2">
            <span className="block font-semibold text-neutral-800">Notes (optional)</span>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={inputCls + " mt-1"}
            />
          </label>
          {error && (
            <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting || pending}
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create rule"}
            </button>
          </div>
        </form>
      </div>

      <div className={`${cardCls} mt-4 overflow-hidden p-0`}>
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2">
          <span className="text-xs uppercase tracking-wide text-neutral-500">
            {visibleDomains.length} {showRevoked ? "total" : "active"}
          </span>
          <label className="text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={showRevoked}
              onChange={e => setShowRevoked(e.target.checked)}
              className="mr-1"
            />
            Show revoked
          </label>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-left">Domain</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Scope</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visibleDomains.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
                  No domain rules yet.
                </td>
              </tr>
            ) : (
              visibleDomains.map(d => (
                <DomainRow
                  key={d.id}
                  domain={d}
                  onRevoke={onRevoke}
                  onSuccess={onSuccess}
                  pending={pending || submitting}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DomainRow({
  domain,
  onRevoke,
  onSuccess,
  pending,
}: {
  domain: AllowedDomain;
  onRevoke: (id: string) => void;
  onSuccess: () => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(domain.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  function onSave() {
    setError(null);
    startSave(async () => {
      const res = await updateAllowedDomainNotes(domain.id, notes);
      if (!res.ok) return setError(res.error);
      setEditing(false);
      onSuccess();
    });
  }

  return (
    <tr className={`border-b border-neutral-100 last:border-0 ${editing ? "bg-orange-50/30" : ""}`}>
      <td className="px-4 py-3 font-mono">{domain.domain}</td>
      <td className="px-4 py-3 text-xs">{domain.role}</td>
      <td className="px-4 py-3 text-xs font-mono">
        {domain.agency_key ? `agency:${domain.agency_key}` : domain.client_key ? `client:${domain.client_key}` : "—"}
      </td>
      <td className="px-4 py-3 text-xs">
        {editing ? (
          <>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes"
              className={inputCls + " text-xs"}
            />
            {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
          </>
        ) : domain.revoked_at ? (
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-600">revoked</span>
        ) : (
          <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">active</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {editing ? (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={saving || pending}
              className="text-xs font-semibold text-orange-700 hover:text-orange-900 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setNotes(domain.notes ?? ""); setError(null); setEditing(false); }}
              disabled={saving || pending}
              className="text-xs text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              className="text-xs text-orange-700 hover:text-orange-900 disabled:opacity-50"
            >
              Edit notes
            </button>
            {!domain.revoked_at && (
              <button
                type="button"
                onClick={() => onRevoke(domain.id)}
                disabled={pending}
                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Revoke
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Client → agency assignment ─────────────────────────────────────────────

function ClientAssignSection({
  clients,
  agencies,
  onSuccess,
  pending,
}: {
  clients: Client[];
  agencies: Agency[];
  onSuccess: () => void;
  pending: boolean;
}) {
  const [submitting, startSubmit] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  function onChange(client_key: string, agency_key: string) {
    setPendingKey(client_key);
    startSubmit(async () => {
      await assignClientToAgency(client_key, agency_key || null);
      setPendingKey(null);
      onSuccess();
    });
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Client → agency assignment</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Set which agency each client belongs to. Agency operators see the dashboard scoped to all clients of their agency.
      </p>
      <div className={`${cardCls} mt-4 overflow-hidden p-0`}>
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Storefront</th>
              <th className="px-4 py-3 text-left">Agency</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.client_key} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-mono">{c.client_key}</td>
                <td className="px-4 py-3 text-xs text-neutral-600">{c.storefront_domain ?? "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={c.agency_key ?? ""}
                    onChange={e => onChange(c.client_key, e.target.value)}
                    disabled={pendingKey === c.client_key || submitting || pending}
                    className={inputCls + " max-w-xs disabled:opacity-50"}
                  >
                    <option value="">(none — direct client)</option>
                    {agencies.map(a => (
                      <option key={a.agency_key} value={a.agency_key}>
                        {a.display_name} ({a.agency_key})
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Users ──────────────────────────────────────────────────────────────────

function UserSection({
  users,
  agencies,
  clients,
  onSuccess,
  pending,
}: {
  users: User[];
  agencies: Agency[];
  clients: Client[];
  onSuccess: () => void;
  pending: boolean;
}) {
  const [submitting, startSubmit] = useTransition();
  const [showRevoked, setShowRevoked] = useState(false);

  function onRevoke(id: string) {
    if (!window.confirm("Revoke this user? They lose dashboard access immediately.")) return;
    startSubmit(async () => {
      await revokeUser(id);
      onSuccess();
    });
  }

  function onUnrevoke(id: string) {
    startSubmit(async () => {
      await unrevokeUser(id);
      onSuccess();
    });
  }

  const visibleUsers = showRevoked ? users : users.filter(u => !u.revoked_at);

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Users</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Auto-provisioned on first magic-link login when an email matches an allowed domain rule (or is added directly via SQL).
      </p>
      <div className={`${cardCls} mt-4 overflow-hidden p-0`}>
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2">
          <span className="text-xs uppercase tracking-wide text-neutral-500">
            {visibleUsers.length} {showRevoked ? "total" : "active"}
          </span>
          <label className="text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={showRevoked}
              onChange={e => setShowRevoked(e.target.checked)}
              className="mr-1"
            />
            Show revoked
          </label>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Scope</th>
              <th className="px-4 py-3 text-left">Last login</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-500">
                  No users yet.
                </td>
              </tr>
            ) : (
              visibleUsers.map(u => (
                <UserRow
                  key={u.id}
                  user={u}
                  agencies={agencies}
                  clients={clients}
                  onRevoke={onRevoke}
                  onUnrevoke={onUnrevoke}
                  onSuccess={onSuccess}
                  pending={pending || submitting}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


function UserRow({
  user,
  agencies,
  clients,
  onRevoke,
  onUnrevoke,
  onSuccess,
  pending,
}: {
  user: User;
  agencies: Agency[];
  clients: Client[];
  onRevoke: (id: string) => void;
  onUnrevoke: (id: string) => void;
  onSuccess: () => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<"chapter_staff" | "agency_operator" | "client_employee">(
    (user.role as "chapter_staff" | "agency_operator" | "client_employee") || "chapter_staff",
  );
  const [agencyKey, setAgencyKey] = useState(user.agency_key ?? "");
  const [clientKey, setClientKey] = useState(user.client_key ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  // When role changes, clear the incompatible scope so the operator can pick the right one.
  function onRoleChange(next: "chapter_staff" | "agency_operator" | "client_employee") {
    setRole(next);
    if (next === "chapter_staff") {
      setAgencyKey("");
      setClientKey("");
    } else if (next === "agency_operator") {
      setClientKey("");
    } else if (next === "client_employee") {
      setAgencyKey("");
    }
  }

  function onCancel() {
    setRole((user.role as "chapter_staff" | "agency_operator" | "client_employee") || "chapter_staff");
    setAgencyKey(user.agency_key ?? "");
    setClientKey(user.client_key ?? "");
    setError(null);
    setEditing(false);
  }

  function onSave() {
    setError(null);
    startSave(async () => {
      const res = await updateUserRole({ id: user.id, role, agency_key: agencyKey, client_key: clientKey });
      if (!res.ok) return setError(res.error);
      setEditing(false);
      onSuccess();
    });
  }

  if (!editing) {
    return (
      <tr className="border-b border-neutral-100 last:border-0">
        <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
        <td className="px-4 py-3 text-xs">{user.role}</td>
        <td className="px-4 py-3 text-xs font-mono">
          {user.agency_key ? `agency:${user.agency_key}` : user.client_key ? `client:${user.client_key}` : "—"}
        </td>
        <td className="px-4 py-3 text-xs text-neutral-600">
          {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : "never"}
        </td>
        <td className="px-4 py-3 text-xs">
          {user.revoked_at ? (
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-600">revoked</span>
          ) : (
            <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">active</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              className="text-xs text-orange-700 hover:text-orange-900 disabled:opacity-50"
            >
              Edit
            </button>
            {user.revoked_at ? (
              <button
                type="button"
                onClick={() => onUnrevoke(user.id)}
                disabled={pending}
                className="text-xs text-orange-700 hover:text-orange-900 disabled:opacity-50"
              >
                Unrevoke
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRevoke(user.id)}
                disabled={pending}
                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Revoke
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0 bg-orange-50/30">
      <td className="px-4 py-3 font-mono text-xs align-top">{user.email}</td>
      <td className="px-4 py-3">
        <select value={role} onChange={e => onRoleChange(e.target.value as typeof role)} className={inputCls + " text-xs"}>
          <option value="chapter_staff">chapter_staff</option>
          <option value="agency_operator">agency_operator</option>
          <option value="client_employee">client_employee</option>
        </select>
      </td>
      <td className="px-4 py-3" colSpan={3}>
        {role === "agency_operator" && (
          <select value={agencyKey} onChange={e => setAgencyKey(e.target.value)} className={inputCls + " text-xs"}>
            <option value="">— pick agency —</option>
            {agencies.map(a => (
              <option key={a.agency_key} value={a.agency_key}>{a.display_name} ({a.agency_key})</option>
            ))}
          </select>
        )}
        {role === "client_employee" && (
          <select value={clientKey} onChange={e => setClientKey(e.target.value)} className={inputCls + " text-xs"}>
            <option value="">— pick client —</option>
            {clients.map(c => (
              <option key={c.client_key} value={c.client_key}>{c.client_key}</option>
            ))}
          </select>
        )}
        {role === "chapter_staff" && (
          <p className="text-xs text-neutral-500">No scope — chapter_staff has global access.</p>
        )}
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </td>
      <td className="px-4 py-3 text-right align-top">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || pending}
            className="text-xs font-semibold text-orange-700 hover:text-orange-900 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || pending}
            className="text-xs text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}
