import { DiagnosticItem } from "@/store/slices/diagnosticsSlice";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";

interface DiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: DiagnosticItem[];
  onSelectDiagnostic: (diag: DiagnosticItem) => void;
  isDark: boolean;
}

export function DiagnosticsDrawer({
  isOpen,
  onClose,
  diagnostics,
  onSelectDiagnostic,
  isDark,
}: DiagnosticsDrawerProps) {
  if (!isOpen) return null;

  const iconColor = isDark ? "#ffffff" : "#000000";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 rounded-t-xl max-h-[70vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-red-500" />
            <h3 className="font-semibold text-sm">
              Diagnostics ({diagnostics.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X size={16} color={iconColor} />
          </button>
        </div>

        <div className="overflow-y-auto p-2 space-y-1.5 divide-y divide-neutral-100 dark:divide-neutral-800">
          {diagnostics.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500">
              ✓ No errors or warnings found. Goose code is valid!
            </div>
          ) : (
            diagnostics.map((diag, index) => (
              <div
                key={index}
                onClick={() => {
                  onSelectDiagnostic(diag);
                  onClose();
                }}
                className="pt-2 pb-2 px-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition select-text"
              >
                <div className="flex items-start space-x-2">
                  {diag.severity === "error" ? (
                    <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  ) : diag.severity === "warning" ? (
                    <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {diag.severity.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-mono">
                        Line {diag.line}:{diag.col}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5">
                      {diag.message}
                    </p>
                    {diag.text && (
                      <pre className="mt-1 text-[11px] font-mono p-1.5 rounded bg-neutral-100 dark:bg-black border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 overflow-x-auto">
                        {diag.text}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

