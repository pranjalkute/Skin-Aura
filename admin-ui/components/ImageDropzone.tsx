"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import clsx from "clsx";

interface Props {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function ImageDropzone({ label, file, onChange, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = file ? URL.createObjectURL(file) : null;

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith("image/")) onChange(dropped);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) onChange(picked);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">{label}</p>

      {previewUrl ? (
        <div className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={label} className="w-full h-full object-cover" />
          {!disabled && (
            <button
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-bg/80 border border-border flex items-center justify-center hover:bg-danger/20 hover:border-danger/40 transition-colors"
            >
              <X size={13} className="text-text-2" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={clsx(
            "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors duration-150 cursor-pointer",
            dragging
              ? "border-accent bg-accent/5"
              : "border-border bg-surface-2 hover:border-border-2 hover:bg-surface-3",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-surface-3 border border-border flex items-center justify-center">
            <ImageIcon size={18} className="text-text-3" />
          </div>
          <div className="text-center px-4">
            <p className="text-sm text-text-2 font-medium">Drop image here</p>
            <p className="text-xs text-text-3 mt-1">or click to browse</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-3">
            <Upload size={11} />
            JPG, PNG, WEBP
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
