import { getCurrentWindow } from "@tauri-apps/api/window";
import { BrandMark } from "./BrandMark";
import { Glyph } from "./Glyph";

const isTauriRuntime = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function runWindowAction(action: "minimize" | "maximize" | "close") {
  if (!isTauriRuntime()) return;

  const appWindow = getCurrentWindow();
  if (action === "minimize") await appWindow.minimize();
  if (action === "maximize") await appWindow.toggleMaximize();
  if (action === "close") await appWindow.close();
}

export function TitleBar() {
  return (
    <header className="title-bar" data-tauri-drag-region>
      <div className="title-bar__identity" data-tauri-drag-region>
        <BrandMark className="title-bar__mark" />
        <span data-tauri-drag-region>Bossnet Proceduri</span>
        <span className="title-bar__environment" data-tauri-drag-region>TEST</span>
      </div>

      <div className="title-bar__controls">
        <button aria-label="Minimizează" onClick={() => void runWindowAction("minimize")} type="button">
          <Glyph name="minimize" size={15} />
        </button>
        <button aria-label="Maximizează" onClick={() => void runWindowAction("maximize")} type="button">
          <Glyph name="maximize" size={13} />
        </button>
        <button
          aria-label="Ascunde în system tray"
          className="title-bar__close"
          onClick={() => void runWindowAction("close")}
          type="button"
        >
          <Glyph name="close" size={16} />
        </button>
      </div>
    </header>
  );
}
