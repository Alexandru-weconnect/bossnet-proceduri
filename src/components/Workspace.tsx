import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import {
  DEFAULT_APPEARANCE,
  readAppearance,
  readProjects,
  saveAppearance,
  saveProjects,
} from "../lib/storage";
import type {
  AppearanceSettings,
  BossnetNotification,
  BossnetProject,
  BossnetSession,
  ProjectRoute,
  ProjectStatus,
} from "../types";
import { BrandMark } from "./BrandMark";
import { Glyph, type GlyphName } from "./Glyph";

type WorkspaceView = "dashboard" | "debug" | "new-project" | "people" | "projects" | "procedures";

const DebugView = lazy(async () => {
  const module = await import("./DebugView");
  return { default: module.DebugView };
});

const PeopleView = lazy(async () => {
  const module = await import("./PeopleView");
  return { default: module.PeopleView };
});

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
  rootStyle.setProperty("--overlay-blur", `${Math.round(settings.overlayBlur)}px`);
  document.documentElement.dataset.overlayGrid = settings.showGrid ? "on" : "off";
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function sendDesktopNotice(title: string, body: string, askPermission = false): Promise<boolean> {
  if (!isTauriRuntime()) return false;

  try {
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted && askPermission) {
      permissionGranted = (await requestPermission()) === "granted";
    }
    if (!permissionGranted) return false;
    sendNotification({ title, body });
    return true;
  } catch {
    return false;
  }
}

function createProjectId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `project-${Date.now().toString(36)}`;
}

function MainHeader({
  label,
  title,
  notificationCount,
  onOpenNotifications,
  onOpenSettings,
  syncLabel,
}: {
  label: string;
  title: string;
  notificationCount: number;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  syncLabel: string;
}) {
  return (
    <header className="main-header">
      <div>
        <span className="main-header__label">{label}</span>
        <h1>{title}</h1>
      </div>
      <div className="main-header__actions">
        <span className="sync-state"><i /> {syncLabel}</span>
        <button
          aria-label={`${notificationCount} notificări`}
          className="icon-button notification-button"
          onClick={onOpenNotifications}
          type="button"
        >
          <Glyph name="bell" size={17} />
          {notificationCount > 0 ? <span>{Math.min(notificationCount, 9)}</span> : null}
        </button>
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

function SettingSwitch({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      className="setting-switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span><strong>{label}</strong><small>{description}</small></span>
      <i aria-hidden="true"><b /></i>
    </button>
  );
}

const OVERLAY_PRESETS = [
  { label: "DISCRET", overlayOpacity: 0.58, atmosphere: 0.42, overlayBlur: 12 },
  { label: "ECHILIBRAT", overlayOpacity: 0.76, atmosphere: 0.78, overlayBlur: 20 },
  { label: "CONTRAST", overlayOpacity: 0.9, atmosphere: 0.58, overlayBlur: 28 },
] as const;

function SettingsPanel({
  settings,
  onChange,
  onClose,
  onDesktopNotificationsChange,
  onTestNotification,
}: {
  settings: AppearanceSettings;
  onChange: (settings: AppearanceSettings) => void;
  onClose: () => void;
  onDesktopNotificationsChange: (enabled: boolean) => void;
  onTestNotification: () => void;
}) {
  return (
    <div className="settings-layer">
      <button aria-label="Închide setările" className="settings-layer__backdrop" onClick={onClose} type="button" />
      <aside aria-labelledby="settings-title" aria-modal="true" className="settings-panel" role="dialog">
        <header>
          <div>
            <span className="micro-label">CONTROL LOCAL</span>
            <h2 id="settings-title">SETĂRI</h2>
          </div>
          <button aria-label="Închide" className="icon-button" onClick={onClose} type="button">
            <Glyph name="close" size={17} />
          </button>
        </header>

        <div className="settings-panel__body">
          <section className="settings-section" aria-labelledby="overlay-heading">
            <div className="settings-section__heading">
              <span>01</span>
              <div><h3 id="overlay-heading">ASPECT OVERLAY</h3><p>Atmosfera ferestrei și lizibilitatea suprafețelor.</p></div>
            </div>

            <div className="preset-grid" aria-label="Preset overlay">
              {OVERLAY_PRESETS.map((preset) => {
                const isActive =
                  settings.overlayOpacity === preset.overlayOpacity
                  && settings.atmosphere === preset.atmosphere
                  && settings.overlayBlur === preset.overlayBlur;
                return (
                  <button
                    aria-pressed={isActive}
                    className={isActive ? "preset-button preset-button--active" : "preset-button"}
                    key={preset.label}
                    onClick={() => onChange({
                      ...settings,
                      atmosphere: preset.atmosphere,
                      overlayBlur: preset.overlayBlur,
                      overlayOpacity: preset.overlayOpacity,
                    })}
                    type="button"
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="setting-control">
              <label htmlFor="opacity">
                <span>OPACITATE SUPRAFEȚE</span>
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

            <div className="setting-control">
              <label htmlFor="overlay-blur">
                <span>BLUR STICLĂ</span>
                <output>{Math.round(settings.overlayBlur)} PX</output>
              </label>
              <input
                id="overlay-blur"
                max="36"
                min="0"
                onChange={(event) => onChange({ ...settings, overlayBlur: Number(event.target.value) })}
                type="range"
                value={Math.round(settings.overlayBlur)}
              />
              <div className="range-labels"><span>CLAR</span><span>DIFUZ</span></div>
            </div>
          </section>

          <section className="settings-section" aria-labelledby="rules-heading">
            <div className="settings-section__heading">
              <span>02</span>
              <div><h3 id="rules-heading">REGULI OVERLAY</h3><p>Când și cum rămâne stratul de lucru vizibil.</p></div>
            </div>
            <div className="setting-switches">
              <SettingSwitch
                checked={settings.showGrid}
                description="Păstrează grila fină din fundal."
                label="GRILĂ TEHNICĂ"
                onChange={(showGrid) => onChange({ ...settings, showGrid })}
              />
              <SettingSwitch
                checked={settings.dimWhenInactive}
                description="Reduce atmosfera când lucrezi în altă fereastră."
                label="ESTOMPARE LA INACTIVITATE"
                onChange={(dimWhenInactive) => onChange({ ...settings, dimWhenInactive })}
              />
              <SettingSwitch
                checked={settings.alwaysOnTop}
                description="Ține Bossnet Proceduri deasupra celorlalte aplicații."
                label="MEREU DEASUPRA"
                onChange={(alwaysOnTop) => onChange({ ...settings, alwaysOnTop })}
              />
            </div>
          </section>

          <section className="settings-section" aria-labelledby="notifications-heading">
            <div className="settings-section__heading">
              <span>03</span>
              <div><h3 id="notifications-heading">NOTIFICĂRI</h3><p>Alerte în aplicație și toast-uri Windows.</p></div>
            </div>
            <div className="setting-switches">
              <SettingSwitch
                checked={settings.inAppNotifications}
                description="Afișează alerte compacte și istoricul din clopoțel."
                label="ÎN APLICAȚIE"
                onChange={(inAppNotifications) => onChange({ ...settings, inAppNotifications })}
              />
              <SettingSwitch
                checked={settings.desktopNotifications}
                description="Folosește centrul de notificări Windows."
                label="DESKTOP WINDOWS"
                onChange={onDesktopNotificationsChange}
              />
              <SettingSwitch
                checked={settings.projectNotifications}
                description="Confirmă proiectele create și schimbările importante."
                disabled={!settings.inAppNotifications && !settings.desktopNotifications}
                label="EVENIMENTE PROIECT"
                onChange={(projectNotifications) => onChange({ ...settings, projectNotifications })}
              />
            </div>
            <button
              className="button button--ghost settings-panel__test"
              disabled={!settings.inAppNotifications && !settings.desktopNotifications}
              onClick={onTestNotification}
              type="button"
            >
              <Glyph name="bell" size={15} /> TESTEAZĂ NOTIFICAREA
            </button>
          </section>
        </div>

        <footer className="settings-panel__footer">
          <button className="button button--ghost settings-panel__reset" onClick={() => onChange(DEFAULT_APPEARANCE)} type="button">
            REVINO LA IMPLICIT
          </button>
          <p className="settings-panel__hint">Modificările se aplică instant și rămân salvate pe acest dispozitiv.</p>
        </footer>
      </aside>
    </div>
  );
}

function NotificationPanel({
  notifications,
  onClear,
  onClose,
}: {
  notifications: BossnetNotification[];
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="settings-layer">
      <button aria-label="Închide notificările" className="settings-layer__backdrop" onClick={onClose} type="button" />
      <aside aria-labelledby="notification-title" aria-modal="true" className="notification-panel" role="dialog">
        <header>
          <div>
            <span className="micro-label">ACTIVITATE LOCALĂ</span>
            <h2 id="notification-title">NOTIFICĂRI</h2>
          </div>
          <button aria-label="Închide" className="icon-button" onClick={onClose} type="button">
            <Glyph name="close" size={17} />
          </button>
        </header>

        {notifications.length === 0 ? (
          <div className="notification-empty">
            <Glyph name="bell" size={25} />
            <strong>NICIO NOTIFICARE</strong>
            <p>Evenimentele proiectelor vor apărea aici.</p>
          </div>
        ) : (
          <div className="notification-list" role="list">
            {notifications.map((notification) => (
              <article className={`notification-item notification-item--${notification.tone}`} key={notification.id} role="listitem">
                <span className="notification-item__signal"><i /></span>
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <time dateTime={new Date(notification.createdAt).toISOString()}>
                    {new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(notification.createdAt)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}

        {notifications.length > 0 ? (
          <button className="button button--ghost notification-panel__clear" onClick={onClear} type="button">
            GOLEȘTE ISTORICUL
          </button>
        ) : null}
      </aside>
    </div>
  );
}

const NAV_ITEMS: Array<{ view: WorkspaceView; label: string; icon: GlyphName }> = [
  { view: "dashboard", label: "Start", icon: "home" },
  { view: "projects", label: "Proiecte", icon: "grid" },
  { view: "people", label: "Echipă", icon: "user" },
  { view: "procedures", label: "Proceduri", icon: "layers" },
  { view: "debug", label: "Debug", icon: "bug" },
];

export function Workspace({ session, onLogout }: WorkspaceProps) {
  const [view, setView] = useState<WorkspaceView>("dashboard");
  const [projects, setProjects] = useState<BossnetProject[]>(() => readProjects());
  const [appearance, setAppearance] = useState<AppearanceSettings>(() => readAppearance());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [windowFocused, setWindowFocused] = useState(() => document.hasFocus());
  const [notifications, setNotifications] = useState<BossnetNotification[]>(() =>
    appearance.inAppNotifications
      ? [{
          id: "session-ready",
          title: "Sesiune pregătită",
          message: "Spațiul local Bossnet este activ și sincronizat.",
          createdAt: Date.now(),
          tone: "info",
        }]
      : [],
  );
  const [toast, setToast] = useState<BossnetNotification | null>(null);

  useEffect(() => applyAppearance(appearance), [appearance]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void getCurrentWindow().setAlwaysOnTop(appearance.alwaysOnTop).catch(() => undefined);
  }, [appearance.alwaysOnTop]);

  useEffect(() => {
    const handleFocus = () => setWindowFocused(true);
    const handleBlur = () => setWindowFocused(false);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!settingsOpen && !notificationsOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [notificationsOpen, settingsOpen]);

  function updateAppearance(nextSettings: AppearanceSettings) {
    setAppearance(nextSettings);
    saveAppearance(nextSettings);
  }

  function publishNotification(
    title: string,
    message: string,
    tone: BossnetNotification["tone"] = "info",
    forceInApp = false,
  ) {
    const notification: BossnetNotification = {
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `notice-${Date.now().toString(36)}`,
      title,
      message,
      createdAt: Date.now(),
      tone,
    };

    if (appearance.inAppNotifications || forceInApp) {
      setNotifications((current) => [notification, ...current].slice(0, 20));
      setToast(notification);
    }

    if (appearance.desktopNotifications) {
      void sendDesktopNotice(title, message);
    }
  }

  async function handleDesktopNotificationsChange(enabled: boolean) {
    if (!enabled) {
      updateAppearance({ ...appearance, desktopNotifications: false });
      return;
    }

    if (!isTauriRuntime()) {
      updateAppearance({ ...appearance, desktopNotifications: true });
      publishNotification(
        "Preview web",
        "Toast-urile Windows se activează în aplicația instalată.",
        "info",
        true,
      );
      return;
    }

    const permissionGranted = await sendDesktopNotice(
      "Bossnet Proceduri",
      "Notificările Windows sunt active.",
      true,
    );
    if (permissionGranted) {
      updateAppearance({ ...appearance, desktopNotifications: true });
      publishNotification("Notificări activate", "Alertele Windows au fost conectate.", "success", true);
    } else {
      updateAppearance({ ...appearance, desktopNotifications: false });
      publishNotification(
        "Permisiune necesară",
        "Windows a blocat notificările. Le poți permite din setările sistemului.",
        "info",
        true,
      );
    }
  }

  function addProject(project: BossnetProject) {
    setProjects((currentProjects) => {
      const nextProjects = [project, ...currentProjects];
      saveProjects(nextProjects);
      return nextProjects;
    });
    setView("projects");
    if (appearance.projectNotifications) {
      publishNotification(
        "Proiect creat",
        `${project.name} a intrat în etapa Descoperire pe ruta ${project.route}.`,
        "success",
      );
    }
  }

  const headerTitle =
    view === "dashboard"
      ? "PANOU PRINCIPAL"
      : view === "new-project"
        ? "INIȚIALIZARE"
        : view === "projects"
          ? "REGISTRU PROIECTE"
          : view === "people"
            ? "ORGANIZAȚIE"
            : view === "procedures"
              ? "KNOWLEDGE BASE"
              : "COMPONENT LAB";

  return (
    <div className={appearance.dimWhenInactive && !windowFocused ? "workspace workspace--dimmed" : "workspace"}>
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
          <button
            className="nav-item"
            onClick={() => {
              setNotificationsOpen(false);
              setSettingsOpen(true);
            }}
            type="button"
          >
            <Glyph name="settings" size={18} /><span>Setări</span>
          </button>
          <div className="account-block">
            <span className="account-block__avatar">{session.email.slice(0, 1).toUpperCase()}</span>
            <div><strong>{session.name}</strong><span>{session.authMode === "google" ? "GOOGLE WORKSPACE" : "MOD TEST"}</span></div>
            <button aria-label="Deconectare" onClick={onLogout} type="button"><Glyph name="logout" size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="workspace-main">
        <MainHeader
          label="BOSSNET / CONTROL"
          notificationCount={notifications.length}
          onOpenNotifications={() => {
            setSettingsOpen(false);
            setNotificationsOpen(true);
          }}
          onOpenSettings={() => {
            setNotificationsOpen(false);
            setSettingsOpen(true);
          }}
          syncLabel={session.token ? "SERVER / SINCRONIZAT" : "LOCAL / MOD TEST"}
          title={headerTitle}
        />
        <div className="workspace-content">
          {view === "dashboard" ? <DashboardView onNavigate={setView} /> : null}
          {view === "new-project" ? <NewProjectView onCancel={() => setView("dashboard")} onCreate={addProject} /> : null}
          {view === "projects" ? <ProjectsView onNew={() => setView("new-project")} projects={projects} /> : null}
          {view === "people" ? (
            <Suspense fallback={<div className="people-loading"><span className="button-loader" /><strong>SE ÎNCARCĂ DIRECTORUL</strong></div>}>
              <PeopleView session={session} />
            </Suspense>
          ) : null}
          {view === "procedures" ? <ProceduresView /> : null}
          {view === "debug" ? (
            <Suspense fallback={<div className="people-loading"><span className="button-loader" /><strong>SE ÎNCARCĂ LABORATORUL</strong></div>}>
              <DebugView />
            </Suspense>
          ) : null}
        </div>
      </main>

      {settingsOpen ? (
        <SettingsPanel
          onChange={updateAppearance}
          onClose={() => setSettingsOpen(false)}
          onDesktopNotificationsChange={(enabled) => void handleDesktopNotificationsChange(enabled)}
          onTestNotification={() => publishNotification(
            "Test reușit",
            "Regulile de notificare Bossnet funcționează corect.",
            "success",
            true,
          )}
          settings={appearance}
        />
      ) : null}

      {notificationsOpen ? (
        <NotificationPanel
          notifications={notifications}
          onClear={() => setNotifications([])}
          onClose={() => setNotificationsOpen(false)}
        />
      ) : null}

      {toast ? (
        <div aria-atomic="true" aria-live="polite" className="toast-region">
          <div className={`app-toast app-toast--${toast.tone}`}>
            <span><Glyph name={toast.tone === "success" ? "check" : "bell"} size={16} /></span>
            <div><strong>{toast.title}</strong><p>{toast.message}</p></div>
            <button aria-label="Închide notificarea" onClick={() => setToast(null)} type="button">
              <Glyph name="close" size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
