export type GlyphName =
  | "arrow"
  | "bell"
  | "check"
  | "chevron"
  | "close"
  | "folder"
  | "grid"
  | "home"
  | "layers"
  | "logout"
  | "maximize"
  | "minimize"
  | "new"
  | "pin"
  | "settings"
  | "shield"
  | "spark"
  | "user";

interface GlyphProps {
  name: GlyphName;
  size?: number;
  strokeWidth?: number;
}

const PATHS: Record<GlyphName, React.ReactNode> = {
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  folder: <><path d="M3 7h7l2 2h9v10H3z" /><path d="M3 7V5h7l2 2" /></>,
  grid: <><path d="M4 4h6v6H4z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6H4z" /><path d="M14 14h6v6h-6z" /></>,
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
  logout: <><path d="M10 5H4v14h6" /><path d="M14 8l4 4-4 4" /><path d="M8 12h10" /></>,
  maximize: <path d="M5 5h14v14H5z" />,
  minimize: <path d="M5 12h14" />,
  new: <><path d="M12 5v14" /><path d="M5 12h14" /><path d="M4 4h16v16H4z" /></>,
  pin: <><path d="m15 4 5 5-3 1-4 4-1 6-2-5-5-2 6-1 4-4Z" /><path d="m4 20 6-6" /></>,
  settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19 13.5 2-1.5-2-1.5-.5-2.2.8-2.4-2.4-1.4-1.7 1.8-2.2-.7L12 3 10 4.6l-2.2.7-1.7-1.8L3.7 4.9l.8 2.4L4 9.5 2 11l2 1.5.5 2.2-.8 2.4 2.4 1.4 1.7-1.8 2.2.7L12 21l2-1.6 2.2-.7 1.7 1.8 2.4-1.4-.8-2.4.5-2.2Z" /></>,
  shield: <><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-5" /></>,
  spark: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

export function Glyph({ name, size = 20, strokeWidth = 1.7 }: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {PATHS[name]}
    </svg>
  );
}
