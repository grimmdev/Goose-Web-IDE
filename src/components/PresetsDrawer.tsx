import { PresetItem } from "@/store/slices/presetsSlice";
import { Sparkles, X, ChevronRight } from "lucide-react";

interface PresetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  presets: PresetItem[];
  onSelectPreset: (preset: PresetItem) => void;
  isDark: boolean;
}

export function PresetsDrawer({
  isOpen,
  onClose,
  presets,
  onSelectPreset,
  isDark,
}: PresetsDrawerProps) {
  if (!isOpen) return null;
  const iconColor = isDark ? "#ffffff" : "#000000";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 rounded-t-xl max-h-[70vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-yellow-500" />
            <h3 className="font-semibold text-sm">Goose Examples & Presets</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X size={16} color={iconColor} />
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset);
                onClose();
              }}
              className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50 dark:bg-neutral-950/50 cursor-pointer transition active:scale-[0.99] flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {preset.title}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    {preset.category}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {preset.description}
                </p>
              </div>
              <ChevronRight size={16} className="text-neutral-400 shrink-0 ml-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

