"use client";

import { FaceStyle } from "../lib/cards";

type Props = {
  faceStyle: FaceStyle;
  onChange: (style: FaceStyle) => void;
};

export function FaceStyleToggle({ faceStyle, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-300">Face style</span>
      <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/10">
        {(["simple", "original"] as FaceStyle[]).map((style) => (
          <button
            key={style}
            onClick={() => onChange(style)}
            className={`px-3 py-1 font-semibold transition ${
              faceStyle === style
                ? "bg-white/20 text-white"
                : "text-slate-200 hover:bg-white/10"
            }`}
          >
            {style === "simple" ? "Simple" : "Original"}
          </button>
        ))}
      </div>
    </div>
  );
}
