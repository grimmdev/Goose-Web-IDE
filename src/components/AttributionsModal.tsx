import { useState } from "react";
import { Scale, X, ExternalLink, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";

interface AttributionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

interface AttributionEntry {
  title: string;
  author: string;
  license: string;
  url: string;
  role: string;
  licenseText: string;
}

const ATTRIBUTIONS: AttributionEntry[] = [
  {
    title: "Goose Programming Language",
    author: "Wouter van Oortmerssen (Aardappel) & Contributors",
    license: "Apache License 2.0",
    url: "https://github.com/aardappel/goose",
    role: "Core compiler, standard library, typechecker, and WebAssembly compilation pipeline.",
    licenseText: `Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`,
  },
  {
    title: "cute_spirv & ckit",
    author: "Randy Gaul (cute_framework)",
    license: "zlib License / Public Domain",
    url: "https://github.com/RandyGaul/cute_framework",
    role: "GLSL-to-SPIR-V translation and multi-target shader cross-compilation for embed_shader.",
    licenseText: `This software is provided 'as-is', without any express or implied warranty.
In no event will the authors be held liable for any damages arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it freely.`,
  },
  {
    title: "subprocess.h",
    author: "sheredom",
    license: "The Unlicense (Public Domain)",
    url: "https://github.com/sheredom/subprocess.h",
    role: "Cross-platform process execution runner for Goose build toolchain.",
    licenseText: `This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any means.`,
  },
  {
    title: "SDL3 (Simple DirectMedia Layer)",
    author: "Sam Lantinga & SDL Community",
    license: "zlib License",
    url: "https://github.com/libsdl-org/SDL",
    role: "Graphics, audio, and windowing abstractions powering the Goose gfx module.",
    licenseText: `This software is provided 'as-is', without any express or implied warranty.
In no event will the authors be held liable for any damages arising from the use of this software.`,
  },
  {
    title: "CodeMirror 6",
    author: "Marijn Haverbeke & Contributors",
    license: "MIT License",
    url: "https://codemirror.net",
    role: "Mobile code editor component, Goose syntax grammar, autocomplete, and caret navigation.",
    licenseText: `Copyright (C) 2018-2026 by Marijn Haverbeke <marijnh@gmail.com> and others.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction.`,
  },
  {
    title: "React, React Native & Expo",
    author: "Meta Platforms, Inc. & 650 Industries",
    license: "MIT License",
    url: "https://expo.dev",
    role: "Native mobile host architecture, WebView embedding, haptics, and file system bridge.",
    licenseText: `Copyright (c) Meta Platforms, Inc. and affiliates.
Copyright (c) 650 Industries, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software without restriction.`,
  },
  {
    title: "Redux Toolkit",
    author: "Mark Erikson & Contributors",
    license: "MIT License",
    url: "https://redux-toolkit.js.org",
    role: "Client-side state management for editor, compiler, diagnostics, and project assets.",
    licenseText: `Copyright (c) 2018 Mark Erikson

Permission is hereby granted, free of charge, to any person obtaining a copy of this software without restriction.`,
  },
  {
    title: "Tailwind CSS",
    author: "Tailwind Labs, Inc.",
    license: "MIT License",
    url: "https://tailwindcss.com",
    role: "Responsive UI utility styling and dark mode theming.",
    licenseText: `Copyright (c) Tailwind Labs, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software without restriction.`,
  },
  {
    title: "Lucide Icons",
    author: "Lucide Contributors",
    license: "ISC License",
    url: "https://lucide.dev",
    role: "Vector icon design system across mobile IDE and toolbar controls.",
    licenseText: `Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) 2022-2026 held by Lucide Contributors.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.`,
  },
  {
    title: "JSZip",
    author: "Stuart Knightley & Contributors",
    license: "MIT License",
    url: "https://stuk.github.io/jszip",
    role: "Client-side zip archive packaging for complete offline project export.",
    licenseText: `Copyright (c) 2009-2026 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso

Permission is hereby granted, free of charge, to any person obtaining a copy of this software without restriction.`,
  },
];

export function AttributionsModal({
  isOpen,
  onClose,
  isDark,
}: AttributionsModalProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const iconColor = isDark ? "#ffffff" : "#000000";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 shrink-0">
          <div className="flex items-center space-x-2">
            <Scale size={18} color={iconColor} strokeWidth={1.75} />
            <div>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-white leading-tight">
                Attributions & Licenses
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Open source software powering Honk IDE
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 select-text text-xs">
          {/* Introductory notice */}
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <div className="flex items-center space-x-1.5 font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Independent Commercial Software</span>
            </div>
            Honk is built with pride on the following open source projects and permissive libraries. All original copyrights and licenses are acknowledged below in accordance with Apache License 2.0 and relevant open source terms.
          </div>

          {/* List of Attributions */}
          {ATTRIBUTIONS.map((item, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div
                key={item.title}
                className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-1.5 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-xs text-neutral-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {item.author}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 shrink-0">
                    {item.license}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-normal">
                  {item.role}
                </p>

                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="flex items-center space-x-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium"
                  >
                    {isExpanded ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                    <span>{isExpanded ? "Hide License" : "View License"}</span>
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>Website</span>
                    <ExternalLink size={10} />
                  </a>
                </div>

                {isExpanded && (
                  <pre className="mt-2 p-2.5 rounded-lg bg-neutral-100 dark:bg-black font-mono text-[10px] text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed border border-neutral-200 dark:border-neutral-800">
                    {item.licenseText}
                  </pre>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-neutral-400">
            Honk IDE • Not affiliated with or endorsed by Google LLC.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black font-medium text-xs hover:opacity-90 transition active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

