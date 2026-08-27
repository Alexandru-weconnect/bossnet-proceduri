import { useEffect, useState, type FormEvent } from "react";
import {
  DEFAULT_APPEARANCE,
  readAppearance,
  readProjects,
  saveAppearance,
  saveProjects,
} from "../lib/storage";
import type {
  AppearanceSettings,
  BossnetProject,
  BossnetSession,
  ProjectRoute,
  ProjectStatus,
} from "../types";
import { BrandMark } from "./BrandMark";
import { Glyph, type GlyphName } from "./Glyph";

type WorkspaceView = "dashboard" | "new-project" | "projects" | "procedures";

interface WorkspaceProps {
  session: BossnetSession;
  onLogout: () => void;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  DESCOPERIRE: "Descoperire",
  PREVIEW: "Preview",
  QA: "QA",
  SHOPIFY: "Shopify",
};

const PROCEDURES = [
  {
    code: "P/01",
    title: "Discovery",
    description: "Ruta, inventarul și funcționalitățile sunt stabilite înainte de implementare.",
    meta: "PUNCT UNIC DE INTRARE",
  },
  {
    code: "P/02",
    title: "Clonare vizuală",
    description: "Reconnaissance, evidence pack și preview aprobat înainte de Shopify.",
    meta: "RUTĂ CLONE",
  },
  {
    code: "P/03",
    title: "Creare de la zero",
    description: "Wireframe, trei direcții, homepage aprobat și design system derivat.",
    meta: "RUTĂ NEW",
  },
  {
    code: "P/04",
    title: "QA și predare",
    description: "Viewporturi, stări, interacțiuni, diferențe și gate-uri documentate.",
    meta: "STANDARD BOSSNET",
  },
] as const;

function applyAppearance(settings: AppearanceSettings) {
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--overlay-alpha", settings.overlayOpacity.toFixed(2));
  rootStyle.setProperty("--atmosphere", settings.atmosphere.toFixed(2));
}

function createProjectId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `project-${Date.now().toString(36)}`;
}

function MainHeader({
  label,
  title,
  onOpenSettings,
}: {
  label: string;
  title: string;
  onOpenSettings: () => void;
}) {
  return (
    <header className="main-header">
      <div>
        <span className="main-header__label">{label}</span>
        <h1>{title}</h1>
      </div>
      <div className="main-header__actions">
        <span className="sync-state"><i /> LOCAL / SINCRONIZAT</span>
        <button aria-label="Setări de aspect" className="icon-button" onClick={onOpenSettings} type="button">
          <Glyph name="settings" size={18} />
        </button>
      </div>
    </header>
  );
}

function DashboardView({ onNavigate }: { onNavigate: (view: WorkspaceView) => void }) {
  return (
    <div className="dashboard-view view-enter">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow"><span /> PUNCT DE INTRARE</p>
          <h2>CE CONSTRUIM<br />ASTĂZI?</h2>
        </div>
        <p>
          Alege ruta. Procedura potrivită se activează după prima decizie, iar proiectul rămâne urmărit de la brief până la Gate B.
        </p>
      </section>

      <section className="entry-grid" aria-label="Opțiuni proiect">
        <button className="entry-card entry-card--primary" onClick={() => onNavigate("new-project")} type="button">
          <span className="entry-card__number">01</span>
          <span className="entry-card__icon"><Glyph name="new" size={29} /></span>
          <span className="entry-card__body">
            <strong>Proiect nou</strong>
            <small>PORNEȘTE DISCOVERY</small>
          </span>
          <span className="entry-card__arrow"><Glyph name="arrow" size={22} /></span>
        </button>

        <button className="entry-card" onClick={() => onNavigate("projects")} type="button">
          <span className="entry-card__number">02</span>
          <span className="entry-card__icon"><Glyph name="folder" size={29} /></span>
          <span className="entry-card__body">
            <strong>Proiecte existente</strong>
            <small>CONTINUĂ DE UNDE AI RĂMAS</small>
          </span>
          <span className="entry-card__arrow"><Glyph name="arrow" size={22} /></span>
        </button>
      </section>

      <footer className="dashboard-foot">
        <span><Glyph name="shield" size={15} /> PROCEDURI BOSSNET · V1</span>
        <span>NEW / CLONE / QA / SHOPIFY</span>
      </footer>
    </div>
  );
}

function NewProjectView({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (project: BossnetProject) => void;
}) {
  const [route, setRoute] = useState<ProjectRoute>("NEW");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !source.trim()) return;

    onCreate({
      id: createProjectId(),
      name: name.trim(),
      route,
      source: source.trim(),
      status: "DESCOPERIRE",
      createdAt: Date.now(),
    });
  }

  return (
    <div className="project-form-view view-enter">
      <div className="section-heading">
        <div>
          <p className="eyebrow"><span /> PROJECT DISCOVERY</p>
          <h2>PROIECT NOU</h2>
        </div>
        <span className="step-indicator">PAS 01 / 04</span>
      </div>

      <form className="project-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>ALEGE RUTA PRINCIPALĂ</legend>
          <div className="route-grid">
            <button
              aria-pressed={route === "NEW"}
              className={route === "NEW" ? "route-option route-option--active" : "route-option"}
              onClick={() => setRoute("NEW")}
              type="button"
            >
              <span className="route-option__code">NEW</span>
              <strong>Creare de la zero</strong>
              <small>Organigramă, wireframe, direcție vizuală.</small>
              <i><Glyph name="check" size={15} /></i>
            </button>
            <button
              aria-pressed={route === "CLONE"}
              className={route === "CLONE" ? "route-option route-option--active" : "route-option"}
              onClick={() => setRoute("CLONE")}
              type="button"
            >
              <span className="route-option__code">CLONE</span>
              <strong>Clonare / migrare 1:1</strong>
              <small>Reconnaissance, evidence pack, preview.</small>
              <i><Glyph name="check" size={15} /></i>
            </button>
          </div>
        </fieldset>

        <div className="form-row">
          <label>
            <span>NUME PROIECT</span>
            <input
              autoFocus
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Magazin Aurora"
              value={name}
            />
          </label>
          <label>
            <span>{route === "CLONE" ? "URL SITE SURSĂ" : "ORGANIGRAMĂ / BRIEF"}</span>
            <input
              onChange={(event) => setSource(event.target.value)}
              placeholder={route === "CLONE" ? "https://exemplu.ro" : "Link Drive sau cale document"}
              value={source}
            />
          </label>
        </div>

        <div className="procedure-note">
          <Glyph name="spark" size={19} />
          <div>
            <strong>PROCEDURA {route} SE ACTIVEAZĂ AUTOMAT</strong>
            <p>
              {route === "CLONE"
                ? "Implementarea începe după inventar, evidence pack și specificația componentelor."
                : "Designul începe după organigramă, conținut disponibil și registrul informațiilor lipsă."}
            </p>
          </div>
        </div>

        <div className="form-actions">
          <button className="button button--ghost" onClick={onCancel} type="button">ANULEAZĂ</button>
          <button className="button button--gold" disabled={!name.trim() || !source.trim()} type="submit">
            CREEAZĂ PROIECTUL <Glyph name="arrow" size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}

function ProjectsView({
  projects,
  onNew,
}: {
  projects: BossnetProject[];
  onNew: () => void;
}) {
  if (projects.length === 0) {
    return (
      <div className="empty-state view-enter">
        <span className="empty-state__icon"><Glyph name="folder" size={34} /></span>
        <p className="eyebrow"><span /> REGISTRU LOCAL</p>
        <h2>NICIUN PROIECT<br />ÎNCĂ.</h2>
        <p>Primul proiect va apărea aici împreună cu ruta și etapa procedurală.</p>
        <button className="button button--gold" onClick={onNew} type="button">
          PROIECT NOU <Glyph name="arrow" size={17} />
        </button>
      </div>
    );
  }

  return (
    <div className="projects-view view-enter">
      <div className="section-heading">
        <div>
          <p className="eyebrow"><span /> REGISTRU LOCAL</p>
          <h2>PROIECTE EXISTENTE</h2>
        </div>
        <button className="button button--gold button--small" onClick={onNew} type="button">
          <Glyph name="new" size={15} /> ADAUGĂ
        </button>
      </div>

      <div className="project-list" role="list">
        {projects.map((project, index) => (
          <article className="project-row" key={project.id} role="listitem">
            <span className="project-row__index">{String(index + 1).padStart(2, "0")}</span>
            <span className="project-row__route">{project.route}</span>
            <div className="project-row__name">
              <strong>{project.name}</strong>
              <small>{project.source}</small>
            </div>
            <span className="project-row__status"><i /> {STATUS_LABELS[project.status]}</span>
            <time dateTime={new Date(project.createdAt).toISOString()}>
              {new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short", year: "numeric" }).format(project.createdAt)}
            </time>
            <button aria-label={`Deschide ${project.name}`} className="icon-button" type="button">
              <Glyph name="arrow" size={18} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProceduresView() {
  return (
    <div className="procedures-view view-enter">
      <div className="section-heading">
        <div>
          <p className="eyebrow"><span /> KNOWLEDGE BASE</p>
          <h2>PROCEDURI ACTIVE</h2>
        </div>
        <span className="step-indicator">4 DOCUMENTE · V1</span>
      </div>

      <div className="procedure-grid">
        {PROCEDURES.map((procedure) => (
          <article className="procedure-card" key={procedure.code}>
            <span className="procedure-card__code">{procedure.code}</span>
            <span className="procedure-card__icon"><Glyph name="layers" size={24} /></span>
            <h3>{procedure.title}</h3>
            <p>{procedure.description}</p>
            <footer>
              <span>{procedure.meta}</span>
              <Glyph name="chevron" size={16} />
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: AppearanceSettings;
  onChange: (settings: AppearanceSettings) => void;
  onClose: () => void;
}) {
  return (
    <div className="settings-layer">
      <button aria-label="Închide setările" className="settings-layer__backdrop" onClick={onClose} type="button" />
      <aside className="settings-panel" aria-labelledby="settings-title">
        <header>
          <div>
            <span className="micro-label">INTERFAȚĂ</span>
            <h2 id="settings-title">TRANSPARENȚĂ</h2>
          </div>
          <button aria-label="Închide" className="icon-button" onClick={onClose} type="button">
            <Glyph name="close" size={17} />
          </button>
        </header>

        <div className="setting-control">
          <label htmlFor="opacity">
            <span>OPACITATE OVERLAY</span>
            <output>{Math.round(settings.overlayOpacity * 100)}%</output>
          </label>
          <input
            id="opacity"
            max="94"
            min="48"
            onChange={(event) => onChange({ ...settings, overlayOpacity: Number(event.target.value) / 100 })}
            type="range"
            value={Math.round(settings.overlayOpacity * 100)}
          />
          <div className="range-labels"><span>TRANSPARENT</span><span>SOLID</span></div>
        </div>

        <div className="setting-control">
          <label htmlFor="atmosphere">
            <span>INTENSITATE GRADIENT</span>
            <output>{Math.round(settings.atmosphere * 100)}%</output>
          </label>
          <input
            id="atmosphere"
            max="100"
            min="20"
            onChange={(event) => onChange({ ...settings, atmosphere: Number(event.target.value) / 100 })}
            type="range"
            value={Math.round(settings.atmosphere * 100)}
          />
          <div className="range-labels"><span>DISCRET</span><span>INTENS</span></div>
        </div>

        <button className="button button--ghost settings-panel__reset" onClick={() => onChange(DEFAULT_APPEARANCE)} type="button">
          REVINO LA IMPLICIT
        </button>
        <p className="settings-panel__hint">Setarea se aplică instant și rămâne salvată pe acest dispozitiv.</p>
      </aside>
    </div>
  );
}

const NAV_ITEMS: Array<{ view: WorkspaceView; label: string; icon: GlyphName }> = [
  { view: "dashboard", label: "Start", icon: "home" },
  { view: "projects", label: "Proiecte", icon: "grid" },
  { view: "procedures", label: "Proceduri", icon: "layers" },
];

export function Workspace({ session, onLogout }: WorkspaceProps) {
  const [view, setView] = useState<WorkspaceView>("dashboard");
  const [projects, setProjects] = useState<BossnetProject[]>(() => readProjects());
  const [appearance, setAppearance] = useState<AppearanceSettings>(() => readAppearance());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => applyAppearance(appearance), [appearance]);

  function updateAppearance(nextSettings: AppearanceSettings) {
    setAppearance(nextSettings);
    saveAppearance(nextSettings);
  }

  function addProject(project: BossnetProject) {
    setProjects((currentProjects) => {
      const nextProjects = [project, ...currentProjects];
      saveProjects(nextProjects);
      return nextProjects;
    });
    setView("projects");
  }

  const headerTitle =
    view === "dashboard"
      ? "PANOU PRINCIPAL"
      : view === "new-project"
        ? "INIȚIALIZARE"
        : view === "projects"
          ? "REGISTRU PROIECTE"
          : "KNOWLEDGE BASE";

  return (
    <div className="workspace">
      <div className="atmosphere" aria-hidden="true">
        <i className="atmosphere__beam" />
        <i className="atmosphere__halo" />
        <i className="atmosphere__grid" />
      </div>

      <aside className="sidebar">
        <div className="sidebar__brand">
          <BrandMark className="sidebar__mark" />
          <div><strong>BOSSNET</strong><span>PROCEDURI</span></div>
        </div>

        <nav aria-label="Navigație principală">
          <span className="sidebar__label">SPAȚIU DE LUCRU</span>
          {NAV_ITEMS.map((item) => (
            <button
              aria-current={view === item.view ? "page" : undefined}
              className={view === item.view ? "nav-item nav-item--active" : "nav-item"}
              key={item.view}
              onClick={() => setView(item.view)}
              type="button"
            >
              <Glyph name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.view === "projects" && projects.length > 0 ? <em>{projects.length}</em> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar__bottom">
          <button className="nav-item" onClick={() => setSettingsOpen(true)} type="button">
            <Glyph name="settings" size={18} /><span>Setări overlay</span>
          </button>
          <div className="account-block">
            <span className="account-block__avatar">{session.email.slice(0, 1).toUpperCase()}</span>
            <div><strong>{session.email.split("@")[0]}</strong><span>@bossnet.ro</span></div>
            <button aria-label="Deconectare" onClick={onLogout} type="button"><Glyph name="logout" size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="workspace-main">
        <MainHeader label="BOSSNET / CONTROL" title={headerTitle} onOpenSettings={() => setSettingsOpen(true)} />
        <div className="workspace-content">
          {view === "dashboard" ? <DashboardView onNavigate={setView} /> : null}
          {view === "new-project" ? <NewProjectView onCancel={() => setView("dashboard")} onCreate={addProject} /> : null}
          {view === "projects" ? <ProjectsView onNew={() => setView("new-project")} projects={projects} /> : null}
          {view === "procedures" ? <ProceduresView /> : null}
        </div>
      </main>

      {settingsOpen ? (
        <SettingsPanel
          onChange={updateAppearance}
          onClose={() => setSettingsOpen(false)}
          settings={appearance}
        />
      ) : null}
    </div>
  );
}
