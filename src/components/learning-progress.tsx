'use client';
import { useState, useSyncExternalStore } from 'react';
import { emptyProgress, readProgress, type LearningProgress } from '@/lib/learning';
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedProgress = emptyProgress;
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}
function snapshot() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem('pathmap-learning-v1');
  } catch {
    /* Keep the course readable without storage. */
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedProgress = readProgress(raw);
  }
  return cachedProgress;
}
const serverSnapshot = () => emptyProgress;
export function useLearningProgress() {
  const progress = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [saveFailed, setSaveFailed] = useState(false);
  function save(next: LearningProgress) {
    try {
      localStorage.setItem('pathmap-learning-v1', JSON.stringify(next));
      setSaveFailed(false);
      listeners.forEach((listener) => listener());
      return true;
    } catch {
      setSaveFailed(true);
      return false;
    }
  }
  return { progress, save, saveFailed };
}
