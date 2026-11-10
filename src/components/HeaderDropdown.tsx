import { Sparkles, Bookmark, AlertCircle, Sun, Moon, Wand2, Share2, BookOpen, ExternalLink, Scale, Smartphone } from "lucide-react";

interface HeaderDropdownProps {
  isOpen: boolean;
  isDark: boolean;
  diagnosticsCount: number;
  onClose: () => void;
  onOpenPresets: () => void;
  onOpenDiagnostics: () => void;
  onToggleTheme: () => void;
  onFormatCode: () => void;
  onExport: () => void;
  onOpenDocs: () => void;
  onOpenAttributions: () => void;
}

export function HeaderDropdown({
  isOpen,
  isDark,
  diagnosticsCount,
  onClose,
  onOpenPresets,
  onOpenDiagnostics,
  onToggleTheme,
  onFormatCode,
  onExport,
  onOpenDocs,
  onOpenAttributions,
}: HeaderDropdownProps) {
  if (!isOpen) return null;

  const iconColor = isDark ? "#ffffff" : "#000000";

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-3 top-11 z-50 w-52 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black shadow-xl py-1.5 flex flex-col text-xs select-none animate-in fade-in zoom-in-95 duration-100">
        <button
          type="button"
          onClick={() => {
            onFormatCode();
            onClose();
          }}
          className="flex items-center space-x-2.5 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 transition-colors text-left"
        >
          <Wand2 size={14} color={iconColor} strokeWidth={1.5} />
          <div className="flex-1">
            <div className="font-medium">Format Code</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenPresets();
          }}
          className="flex items-center space-x-2.5 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 transition-colors text-left"
        >
          <Bookmark size={14} color={iconColor} strokeWidth={1.5} />
          <div className="flex-1">
            <div className="font-medium">Presets & Examples</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenDiagnostics();
          }}
          className="flex items-center space-x-2.5 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 transition-colors text-left"
        >
          <div className="relative">
            <AlertCircle size={14} color={iconColor} strokeWidth={1.5} />
            {diagnosticsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[7px] flex items-center justify-center font-bold">
                {diagnosticsCount}
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-between">
            <span className="font-medium">Diagnostics</span>
            {diagnosticsCount > 0 && (
              <span className="text-[10px] text-neutral-400 font-mono">
                {diagnosticsCount}
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            window.open("https://play.google.com/store/apps/details?id=io.loperlabs.honk", "_blank");
          }}
          className="flex items-center space-x-2.5 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 transition-colors text-left"
        >
          <Smartphone size={14} color={iconColor} strokeWidth={1.5} />
          <div className="flex-1 flex items-center justify-between">
            <div className="font-medium">Android App</div>
            <ExternalLink size={12} className="text-neutral-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onExport();
            onClose();
          }}
          className="flex items-center space-x-2.5 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 transition-colors text-left"
        >
          <Share2 size={14} color={iconColor} strokeWidth={1.5} />
          <div className="flex-1">
            <div className="font-medium">Export Current File</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenDocs();
          }}
          className="flex items-center space-x-2.5 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 transition-colors text-left"
        >
          <BookOpen size={14} color={iconColor} strokeWidth={1.5} />
          <div className="flex-1 flex items-center justify-between">
            <div className="font-medium">Documentation</div>
            <ExternalLink size={12} className="text-neutral-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenAttributions();
          }}
          className="flex items-center space-x-2.5 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 transition-colors text-left"
        >
          <Scale size={14} color={iconColor} strokeWidth={1.5} />
          <div className="flex-1">
            <div className="font-medium">Attributions & Licenses</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onToggleTheme();
            onClose();
          }}
          className="flex items-center space-x-2.5 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 transition-colors text-left"
        >
          {isDark ? (
            <Sun size={14} color={iconColor} strokeWidth={1.5} />
          ) : (
            <Moon size={14} color={iconColor} strokeWidth={1.5} />
          )}
          <div className="flex-1">
            <div className="font-medium">Theme: {isDark ? "Dark" : "Light"}</div>
          </div>
        </button>

        <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />

        <div className="px-3 py-1.5 text-[10px] text-neutral-400">
          Honk Web IDE v1.0.0
        </div>
      </div>
    </>
  );
}
