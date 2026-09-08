"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultColumnPrefs,
  normalizeColumnPrefs,
  type ColumnPrefs,
  type TableColumn,
} from "@/lib/columns";

const PREFIX = "leadlly.metrics.columns.";

export function useColumnPrefs(tableKey: string, catalog: TableColumn[]) {
  const defaults = useMemo(() => defaultColumnPrefs(catalog), [catalog]);
  const [prefs, setPrefs] = useState<ColumnPrefs>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFIX + tableKey);
      if (raw) {
        setPrefs(normalizeColumnPrefs(catalog, JSON.parse(raw) as ColumnPrefs));
      } else {
        setPrefs(defaults);
      }
    } catch {
      setPrefs(defaults);
    }
    setReady(true);
  }, [tableKey, catalog, defaults]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(PREFIX + tableKey, JSON.stringify(prefs));
  }, [prefs, ready, tableKey]);

  const columnsByKey = useMemo(
    () => new Map(catalog.map((column) => [column.key, column])),
    [catalog],
  );

  const visibleColumns = useMemo(
    () =>
      prefs.order
        .map((key) => columnsByKey.get(key))
        .filter((column): column is TableColumn =>
          Boolean(column && prefs.visible.includes(column.key)),
        ),
    [prefs, columnsByKey],
  );

  const toggle = useCallback(
    (key: string) => {
      const column = columnsByKey.get(key);
      if (!column || column.locked) return;
      setPrefs((current) => {
        const isVisible = current.visible.includes(key);
        if (isVisible) {
          const nextVisible = current.visible.filter((item) => item !== key);
          if (nextVisible.length === 0) return current;
          return { ...current, visible: nextVisible };
        }
        return { ...current, visible: [...current.visible, key] };
      });
    },
    [columnsByKey],
  );

  const reorder = useCallback((order: string[]) => {
    setPrefs((current) => ({ ...current, order }));
  }, []);

  const reset = useCallback(() => {
    setPrefs(defaults);
  }, [defaults]);

  return {
    prefs,
    visibleColumns,
    toggle,
    reorder,
    reset,
  };
}
