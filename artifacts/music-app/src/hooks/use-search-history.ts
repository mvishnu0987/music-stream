import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "melodify_search_history";
const MAX_HISTORY = 10;

function readHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(items: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage unavailable
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(readHistory);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setHistory(readHistory());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addEntry = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((t) => t !== trimmed)].slice(0, MAX_HISTORY);
      writeHistory(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((term: string) => {
    setHistory((prev) => {
      const next = prev.filter((t) => t !== term);
      writeHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    writeHistory([]);
    setHistory([]);
  }, []);

  return { history, addEntry, removeEntry, clearHistory };
}
