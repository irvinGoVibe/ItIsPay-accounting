"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
}

interface Props {
  value: { id: string; name: string; company: string | null } | null;
  onChange: (lead: { id: string; name: string; company: string | null } | null) => void;
  placeholder?: string;
}

/**
 * Compact async combobox over /api/leads?search=…
 * Shows up to 8 matches in a popover; click to pick. Click "x" to clear.
 */
export function LeadPicker({ value, onChange, placeholder = "Search lead by name or email…" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/leads?search=${encodeURIComponent(query)}&sortBy=lastContact&sortOrder=desc`);
        const data: Lead[] = await r.json();
        setResults(data.slice(0, 8));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
        <span className="font-medium text-gray-900">{value.name}</span>
        {value.company && <span className="text-gray-500">· {value.company}</span>}
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-auto text-gray-400 hover:text-gray-700"
          aria-label="Remove lead"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {loading && <span className="text-xs text-gray-400">…</span>}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {results.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ id: l.id, name: l.name, company: l.company });
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
              >
                <div className="font-medium text-gray-900">{l.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {l.email}{l.company ? ` · ${l.company}` : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
