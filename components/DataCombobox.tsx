"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

export interface DataComboboxProps<T> {
  category: "spells" | "items" | "classes" | "races" | "backgrounds";
  placeholder?: string;
  onSelect: (item: T) => void;
  selectedId?: string;
  renderItem?: (item: T) => React.ReactNode;
  getItemLabel?: (item: T) => string;
}

export function DataCombobox<T extends { id: string; name: string }>({
  category,
  placeholder = "Search...",
  onSelect,
  selectedId,
  renderItem,
  getItemLabel,
}: DataComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch data
  useEffect(() => {
    let active = true;

    async function fetchData() {
      if (!open) return;
      setLoading(true);
      try {
        const url = `/api/data/${category}?limit=20${query ? `&q=${encodeURIComponent(query)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await res.json();
          if (active) {
            setResults(data);
          }
        } else {
          const text = await res.text();
          console.error("Expected JSON but received:", contentType, text.substring(0, 200));
          throw new Error("Received non-JSON response");
        }
      } catch (err) {
        console.error("Failed to fetch combobox data:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    const timer = setTimeout(fetchData, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, query, open]);

  // Keep track of selected item when passing selectedId prop
  useEffect(() => {
    const fetchSelectedItem = async () => {
      if (!selectedId) {
        setSelectedItem(null);
        return;
      }
      
      // If we already have it in the current results or as the selectedItem, we can use it
      if (selectedItem?.id === selectedId) return;
      
      const foundInResults = results.find(r => r.id === selectedId);
      if (foundInResults) {
        setSelectedItem(foundInResults);
        return;
      }

      // Otherwise we need to fetch it (or just fetch the broad list and find it)
      try {
        const res = await fetch(`/api/data/${category}`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await res.json();
            const item = (data as T[]).find(i => i.id === selectedId);
            if (item) setSelectedItem(item);
          }
        }
      } catch (e) {
        console.error("fetchSelectedItem error", e);
      }
    }

    fetchSelectedItem();
  }, [category, selectedId, selectedItem?.id, results]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setQuery("");
            // Focus input after opening
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        <span className="truncate">
          {selectedItem 
            ? (getItemLabel ? getItemLabel(selectedItem) : selectedItem.name)
            : <span className="text-neutral-500">{placeholder}</span>}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-neutral-500" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-700 bg-neutral-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm shadow-xl">
          <div className="sticky top-0 z-10 bg-neutral-800 px-2 py-1.5 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
              <input
                ref={inputRef}
                type="text"
                className="w-full rounded bg-neutral-900 pl-9 pr-3 py-2 text-sm text-neutral-200 border-none outline-none focus:ring-1 focus:ring-amber-500/50"
                placeholder={`Search ${category}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          
          {loading && results.length === 0 && (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
            </div>
          )}
          
          {!loading && results.length === 0 && query !== "" && (
            <div className="px-4 py-3 text-center text-sm text-neutral-400">
              No results found.
            </div>
          )}

          <ul
            className="px-1"
            role="listbox"
          >
            {results.map((item) => (
              <li
                key={item.id}
                role="option"
                aria-selected={selectedId === item.id}
                className={`relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-3 pr-9 text-sm outline-none transition-colors hover:bg-neutral-700 ${
                  selectedId === item.id ? "bg-neutral-800 text-amber-500 font-medium" : "text-neutral-200"
                }`}
                onClick={() => {
                  onSelect(item);
                  setSelectedItem(item);
                  setOpen(false);
                }}
              >
                {renderItem ? renderItem(item) : (
                  <span className="block truncate">{item.name}</span>
                )}

                {selectedId === item.id && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-amber-500">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
