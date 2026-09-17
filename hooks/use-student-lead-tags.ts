"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "leadlly.metrics.student-lead-tags";

function readTags() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const tags: Record<string, string> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value) tags[id] = value;
    }
    return tags;
  } catch {
    return {};
  }
}

export function useStudentLeadTags() {
  const [tags, setTags] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTags(readTags());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  }, [ready, tags]);

  const setTag = useCallback((ids: string[], tagId: string | null) => {
    if (!ids.length) return;
    setTags((current) => {
      const next = { ...current };
      for (const id of ids) {
        if (!tagId) delete next[id];
        else next[id] = tagId;
      }
      return next;
    });
  }, []);

  return { tags, setTag, ready };
}
