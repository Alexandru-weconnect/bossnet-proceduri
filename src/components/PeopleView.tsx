import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, readOrganization } from "../lib/api";
import type { BossnetSession, OrganizationDirectory, OrganizationUser } from "../types";
import { Glyph } from "./Glyph";

interface PeopleViewProps {
  session: BossnetSession;
}

interface HierarchyEntry {
  depth: number;
  user: OrganizationUser;
}

function buildHierarchy(users: OrganizationUser[]): HierarchyEntry[] {
  const userIds = new Set(users.map((user) => user.id));
  const children = new Map<string | null, OrganizationUser[]>();

  for (const user of users) {
    const parentId = user.managerId && userIds.has(user.managerId) ? user.managerId : null;
    const group = children.get(parentId) ?? [];
    group.push(user);
    children.set(parentId, group);
  }

  for (const group of children.values()) {
    group.sort((left, right) => left.name.localeCompare(right.name, "ro"));
  }

  const flattened: HierarchyEntry[] = [];
  const visit = (user: OrganizationUser, depth: number) => {
    flattened.push({ depth, user });
    for (const child of children.get(user.id) ?? []) visit(child, depth + 1);
  };
  for (const root of children.get(null) ?? []) visit(root, 0);
  return flattened;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function PersonIdentity({ user }: { user: OrganizationUser }) {
  return (
    <div className="person-identity">
      <span className="person-identity__avatar">{initials(user.name)}</span>
      <span>
        <strong>{user.name}</strong>
        <small>{user.jobTitle || user.organizationalRole || "Membru Bossnet"}</small>
      </span>
    </div>
  );
}

export function PeopleView({ session }: PeopleViewProps) {
  const [directory, setDirectory] = useState<OrganizationDirectory | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"directory" | "hierarchy">("hierarchy");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("ro-RO"));

  useEffect(() => {
    if (!session.token || !API_BASE_URL) return;
    const controller = new AbortController();
    setError("");

    void readOrganization(session.token, controller.signal)
      .then(setDirectory)
      .catch((caughtError: unknown) => {
        if (controller.signal.aborted) return;
        setError(caughtError instanceof Error ? caughtError.message : "Directorul nu a putut fi încărcat.");
      });

    return () => controller.abort();
  }, [reloadKey, session.token]);

  const filteredUsers = useMemo(() => {
    if (!directory) return [];
    if (!deferredQuery) return directory.users;
    return directory.users.filter((user) =>
      [user.name, user.email, user.jobTitle, user.organizationalRole, ...user.departmentNames]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("ro-RO").includes(deferredQuery)),
    );
  }, [deferredQuery, directory]);

  const hierarchy = useMemo(() => buildHierarchy(filteredUsers), [filteredUsers]);
  const managers = useMemo(
    () => directory?.users.filter((user) => user.directReports > 0).length ?? 0,
    [directory],
  );

  if (!session.token || !API_BASE_URL) {
    return (
      <div className="people-locked view-enter">
        <span className="people-locked__icon"><Glyph name="shield" size={29} /></span>
        <p className="eyebrow"><span /> DATE PROTEJATE</p>
        <h2>DIRECTORUL ESTE<br />ÎN POSTGRESQL.</h2>
        <p>
          Utilizatorii și telefoanele nu sunt incluse în executabil. Configurează Google OAuth pentru a le încărca prin API după autentificare.
        </p>
        <div><i /> 10 UTILIZATORI IMPORTAȚI <i /> 7 DEPARTAMENTE</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="people-locked view-enter">
        <span className="people-locked__icon people-locked__icon--error"><Glyph name="close" size={26} /></span>
        <p className="eyebrow"><span /> API INDISPONIBIL</p>
        <h2>NU AM PUTUT<br />SINCRONIZA.</h2>
        <p>{error}</p>
        <button className="button button--gold" onClick={() => setReloadKey((value) => value + 1)} type="button">
          REÎNCEARCĂ <Glyph name="arrow" size={16} />
        </button>
      </div>
    );
  }

  if (!directory) {
    return (
      <div className="people-loading view-enter" aria-live="polite">
        <span className="button-loader" />
        <strong>SINCRONIZARE ORGANIZAȚIE</strong>
        <small>PostgreSQL → API → Bossnet Proceduri</small>
      </div>
    );
  }

  return (
    <div className="people-view view-enter">
      <div className="people-toolbar">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> STRUCTURĂ ORGANIZAȚIONALĂ</p>
            <h2>ECHIPA BOSSNET</h2>
          </div>
        </div>
        <label className="people-search">
          <Glyph name="user" size={16} />
          <input
            aria-label="Caută în echipă"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="CAUTĂ NUME, ROL, DEPARTAMENT"
            value={query}
          />
          <span>{filteredUsers.length.toString().padStart(2, "0")}</span>
        </label>
      </div>

      <section className="people-stats" aria-label="Rezumat organizație">
        <article><span>01</span><strong>{directory.users.length}</strong><small>UTILIZATORI ACTIVI</small></article>
        <article><span>02</span><strong>{directory.departments.length}</strong><small>DEPARTAMENTE</small></article>
        <article><span>03</span><strong>{managers}</strong><small>MANAGERI DIRECȚI</small></article>
        <article><span>04</span><strong>{Math.max(...directory.users.map((user) => user.hierarchyLevel)) + 1}</strong><small>NIVELURI</small></article>
      </section>

      <div className="people-tabs" role="tablist" aria-label="Vizualizare echipă">
        <button aria-selected={tab === "hierarchy"} onClick={() => setTab("hierarchy")} role="tab" type="button">IERARHIE</button>
        <button aria-selected={tab === "directory"} onClick={() => setTab("directory")} role="tab" type="button">DIRECTOR</button>
        <span>ACTUALIZAT DIN DB <i /></span>
      </div>

      {tab === "hierarchy" ? (
        <div className="hierarchy-list" role="tree">
          {hierarchy.map(({ depth, user }, index) => (
            <article
              aria-level={depth + 1}
              className="hierarchy-row"
              key={user.id}
              role="treeitem"
              style={{ "--tree-depth": depth } as React.CSSProperties}
            >
              <span className="hierarchy-row__index">{String(index + 1).padStart(2, "0")}</span>
              <span className="hierarchy-row__branch" aria-hidden="true"><i /></span>
              <PersonIdentity user={user} />
              <span className="hierarchy-row__departments">{user.departmentNames.join(" / ") || "GENERAL"}</span>
              <span className="hierarchy-row__reports">{user.directReports}<small>SUBORDONAȚI</small></span>
              <div className="hierarchy-row__contact">
                {user.phone ? <a href={`tel:${user.phone}`}>{user.phone}</a> : <span>—</span>}
                <a href={`mailto:${user.email}`}>{user.email}</a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="people-directory">
          {filteredUsers.map((user) => (
            <article className="person-card" key={user.id}>
              <header>
                <PersonIdentity user={user} />
                <span className={`role-chip role-chip--${user.systemRole}`}>{user.systemRole}</span>
              </header>
              <dl>
                <div><dt>DEPARTAMENT</dt><dd>{user.departmentNames.join(", ") || "General"}</dd></div>
                <div><dt>TELEFON</dt><dd>{user.phone ? <a href={`tel:${user.phone}`}>{user.phone}</a> : "—"}</dd></div>
                <div><dt>EMAIL</dt><dd><a href={`mailto:${user.email}`}>{user.email}</a></dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
