import {
  ArrowUpRight,
  BellRing,
  Bold,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Clock3,
  Code2,
  Database,
  FileText,
  FolderKanban,
  Italic,
  Link2,
  List,
  ListOrdered,
  PanelsTopLeft,
  Redo2,
  RemoveFormatting,
  Search,
  ShieldCheck,
  Sparkles,
  Underline,
  Undo2,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

interface DebugCard {
  code: string;
  icon: LucideIcon;
  meta: string;
  status: string;
  title: string;
}

interface IconSample {
  icon: LucideIcon;
  label: string;
}

const SEARCH_ITEMS = [
  "Discovery proiect nou",
  "Migrare Shopify",
  "Verificare QA",
  "Aprobare design",
  "Predare către client",
  "Sincronizare proceduri",
] as const;

const DEBUG_CARDS: DebugCard[] = [
  { code: "01", icon: FolderKanban, meta: "ACTUALIZAT ACUM", status: "ACTIV", title: "Discovery / Aurora" },
  { code: "02", icon: ShieldCheck, meta: "8 DIN 12 CHECKS", status: "QA", title: "Gate B / Validare" },
  { code: "03", icon: Workflow, meta: "URMĂTORUL PAS · 14:30", status: "FLOW", title: "Predare Shopify" },
];

const ICON_SAMPLES: IconSample[] = [
  { icon: FolderKanban, label: "Proiect" },
  { icon: CalendarDays, label: "Calendar" },
  { icon: BellRing, label: "Alertă" },
  { icon: ShieldCheck, label: "Validare" },
  { icon: Database, label: "Date" },
  { icon: PanelsTopLeft, label: "Interfață" },
  { icon: Sparkles, label: "Automat" },
  { icon: Code2, label: "Debug" },
];

const INITIAL_EDITOR_HTML = `
  <h3>NOTĂ DE PROCEDURĂ</h3>
  <p>Definește aici pașii, <strong>responsabilul</strong> și criteriul de aprobare.</p>
  <ul><li>Brief validat</li><li>Gate vizual pregătit</li></ul>
`;

function localDateValue(date: Date): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDate(value: string): string {
  if (!value) return "NESELECTAT";
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`)).toUpperCase();
}

function wordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function ComponentPanel({
  children,
  className = "",
  code,
  description,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  code: string;
  description: string;
  title: string;
}) {
  return (
    <section className={`debug-panel ${className}`}>
      <header className="debug-panel__header">
        <span>{code}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </header>
      <div className="debug-panel__body">{children}</div>
    </section>
  );
}

function RichTextEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLSpanElement>(null);

  function updateStats() {
    const text = editorRef.current?.innerText ?? "";
    if (statsRef.current) {
      statsRef.current.textContent = `${wordCount(text)} CUVINTE · ${text.length} CARACTERE`;
    }
  }

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = INITIAL_EDITOR_HTML;
    updateStats();
  }, []);

  function execute(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateStats();
  }

  function keepSelection(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function createLink() {
    const href = window.prompt("Introdu adresa completă a linkului", "https://");
    if (!href?.trim()) return;
    const normalizedHref = /^https?:\/\//i.test(href.trim()) ? href.trim() : `https://${href.trim()}`;
    execute("createLink", normalizedHref);
  }

  const toolbar = [
    { command: "undo", icon: Undo2, label: "Anulează" },
    { command: "redo", icon: Redo2, label: "Refă" },
    { command: "bold", icon: Bold, label: "Aldin" },
    { command: "italic", icon: Italic, label: "Cursiv" },
    { command: "underline", icon: Underline, label: "Subliniat" },
    { command: "insertUnorderedList", icon: List, label: "Listă" },
    { command: "insertOrderedList", icon: ListOrdered, label: "Listă numerotată" },
  ] as const;

  return (
    <div className="wysiwyg-shell">
      <div aria-label="Formatare text" className="wysiwyg-toolbar" role="toolbar">
        {toolbar.map(({ command, icon: Icon, label }, index) => (
          <button
            aria-label={label}
            className={index === 2 || index === 5 ? "wysiwyg-tool wysiwyg-tool--group" : "wysiwyg-tool"}
            key={command}
            onClick={() => execute(command)}
            onMouseDown={keepSelection}
            title={label}
            type="button"
          >
            <Icon aria-hidden="true" size={14} strokeWidth={1.8} />
          </button>
        ))}
        <button
          aria-label="Adaugă link"
          className="wysiwyg-tool wysiwyg-tool--group"
          onClick={createLink}
          onMouseDown={keepSelection}
          title="Adaugă link"
          type="button"
        >
          <Link2 aria-hidden="true" size={14} strokeWidth={1.8} />
        </button>
        <button
          aria-label="Șterge formatarea"
          className="wysiwyg-tool"
          onClick={() => execute("removeFormat")}
          onMouseDown={keepSelection}
          title="Șterge formatarea"
          type="button"
        >
          <RemoveFormatting aria-hidden="true" size={14} strokeWidth={1.8} />
        </button>
      </div>
      <div
        aria-label="Editor text formatat"
        className="wysiwyg-editor"
        contentEditable
        onInput={updateStats}
        ref={editorRef}
        role="textbox"
        spellCheck="false"
        suppressContentEditableWarning
        tabIndex={0}
      />
      <footer className="wysiwyg-status">
        <span><i /> EDITOR ACTIV</span>
        <span ref={statsRef}>0 CUVINTE · 0 CARACTERE</span>
      </footer>
    </div>
  );
}

export function DebugView() {
  const today = useMemo(() => new Date(), []);
  const [category, setCategory] = useState("discovery");
  const [query, setQuery] = useState("");
  const [singleDate, setSingleDate] = useState(() => localDateValue(today));
  const [rangeStart, setRangeStart] = useState(() => localDateValue(today));
  const [rangeEnd, setRangeEnd] = useState(() => localDateValue(addDays(today, 7)));
  const [notes, setNotes] = useState("Verifică organigrama și marchează informațiile lipsă înainte de Gate A.");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ro-RO");
    if (!normalizedQuery) return SEARCH_ITEMS;
    return SEARCH_ITEMS.filter((item) => item.toLocaleLowerCase("ro-RO").includes(normalizedQuery));
  }, [query]);

  const invalidRange = Boolean(rangeStart && rangeEnd && rangeEnd < rangeStart);

  return (
    <div className="debug-view view-enter">
      <div className="debug-hero">
        <div>
          <p className="eyebrow"><span /> COMPONENT LAB / DEBUG</p>
          <h2>CONTROL<br />SURFACE.</h2>
        </div>
        <div className="debug-hero__copy">
          <span><Code2 aria-hidden="true" size={16} /> 8 FAMILII · LIVE</span>
          <p>Bibliotecă interactivă pentru verificarea componentelor Bossnet în WebView2, înainte de integrarea în proceduri.</p>
        </div>
      </div>

      <div className="debug-grid">
        <ComponentPanel code="A" description="Selectare contextuală, compactă." title="DROPDOWN">
          <label className="debug-field" htmlFor="debug-category">
            <span>TIP FLUX</span>
            <span className="debug-select-shell">
              <select id="debug-category" onChange={(event) => setCategory(event.target.value)} value={category}>
                <option value="discovery">Discovery proiect</option>
                <option value="design">Design &amp; conținut</option>
                <option value="qa">QA &amp; aprobare</option>
                <option value="shopify">Publicare Shopify</option>
              </select>
              <ChevronDown aria-hidden="true" size={15} strokeWidth={1.8} />
            </span>
          </label>
          <div className="debug-inline-status"><i /> VALOARE: {category.toUpperCase()}</div>
        </ComponentPanel>

        <ComponentPanel code="B" description="Filtrare instant, fără submit." title="SEARCH">
          <div className="debug-search">
            <Search aria-hidden="true" size={16} strokeWidth={1.8} />
            <input
              aria-label="Caută o procedură"
              autoComplete="off"
              id="debug-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Caută o procedură..."
              spellCheck="false"
              type="search"
              value={query}
            />
            {query ? (
              <button aria-label="Șterge căutarea" onClick={() => setQuery("")} type="button">
                <X aria-hidden="true" size={13} />
              </button>
            ) : <span>{filteredItems.length}</span>}
          </div>
          <div className="debug-search-results" role="status">
            {filteredItems.length > 0 ? filteredItems.slice(0, 3).map((item) => <span key={item}>{item}</span>) : <em>NICIUN REZULTAT</em>}
          </div>
        </ComponentPanel>

        <ComponentPanel className="debug-panel--wide" code="C" description="Trei stări de proiect, aceeași gramatică vizuală." title="CARDURI">
          <div className="debug-cards">
            {DEBUG_CARDS.map(({ code, icon: Icon, meta, status, title }) => (
              <article className="debug-card" key={code}>
                <header><span>{code}</span><em>{status}</em></header>
                <Icon aria-hidden="true" size={25} strokeWidth={1.5} />
                <h4>{title}</h4>
                <footer><small>{meta}</small><ArrowUpRight aria-hidden="true" size={15} /></footer>
              </article>
            ))}
          </div>
        </ComponentPanel>

        <ComponentPanel className="debug-panel--wide" code="D" description="Dată singulară și interval cu validare." title="DATE PICKERS">
          <div className="date-lab">
            <label className="debug-field" htmlFor="single-date">
              <span>DATĂ SIMPLĂ</span>
              <span className="date-input-shell">
                <CalendarDays aria-hidden="true" size={15} />
                <input id="single-date" onChange={(event) => setSingleDate(event.target.value)} type="date" value={singleDate} />
              </span>
              <small>{formatDate(singleDate)}</small>
            </label>

            <div className={invalidRange ? "range-picker range-picker--invalid" : "range-picker"}>
              <span className="range-picker__label">INTERVAL</span>
              <label htmlFor="range-start">
                <small>DE LA</small>
                <input id="range-start" onChange={(event) => setRangeStart(event.target.value)} type="date" value={rangeStart} />
              </label>
              <i aria-hidden="true" />
              <label htmlFor="range-end">
                <small>PÂNĂ LA</small>
                <input id="range-end" min={rangeStart} onChange={(event) => setRangeEnd(event.target.value)} type="date" value={rangeEnd} />
              </label>
              <span className="range-picker__state">
                {invalidRange ? <X aria-hidden="true" size={13} /> : <CircleCheck aria-hidden="true" size={13} />}
                {invalidRange ? "INTERVAL INVALID" : "INTERVAL VALID"}
              </span>
            </div>
          </div>
        </ComponentPanel>

        <ComponentPanel className="debug-panel--wide" code="F" description="SVG scalabil, stroke geometric, bibliotecă Lucide." title="ICON-URI SVG">
          <div className="icon-lab">
            {ICON_SAMPLES.map(({ icon: Icon, label }) => (
              <article key={label}>
                <span><Icon aria-hidden="true" size={23} strokeWidth={1.45} /></span>
                <small>{label}</small>
              </article>
            ))}
          </div>
        </ComponentPanel>

        <ComponentPanel code="G" description="Text amplu, controlat și numărat." title="TEXTAREA">
          <label className="debug-field debug-textarea" htmlFor="debug-notes">
            <span>OBSERVAȚII QA</span>
            <textarea
              id="debug-notes"
              maxLength={280}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Scrie o observație..."
              rows={6}
              value={notes}
            />
            <small>{notes.length} / 280 CARACTERE</small>
          </label>
        </ComponentPanel>

        <ComponentPanel code="H" description="Titluri, liste, linkuri și formatare inline." title="WYSIWYG">
          <RichTextEditor />
        </ComponentPanel>
      </div>

      <footer className="debug-footer">
        <span><CircleCheck aria-hidden="true" size={14} /> INPUTURI EDITABILE</span>
        <span><Clock3 aria-hidden="true" size={14} /> STARE LOCALĂ · FĂRĂ SALVARE ÎN DB</span>
        <span><FileText aria-hidden="true" size={14} /> WEBVIEW2 READY</span>
      </footer>
    </div>
  );
}
