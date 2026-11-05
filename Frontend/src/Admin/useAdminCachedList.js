import { useCallback, useEffect, useRef, useState } from "react";

const entries = new Map();
const subscribers = new Map();

const subscribe = (key, listener) => {
  const listeners = subscribers.get(key) || new Set();
  listeners.add(listener);
  subscribers.set(key, listeners);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) subscribers.delete(key);
  };
};

const publish = (key, entry) => {
  entries.set(key, entry);
  subscribers.get(key)?.forEach((listener) => listener(entry));
};

export const invalidateAdminListCache = (prefix) => {
  for (const key of entries.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) entries.delete(key);
  }
};

export const updateAdminListCache = (key, update) => {
  const entry = entries.get(key);
  if (!entry) return;
  publish(key, { ...entry, data: update(entry.data) });
};

export default function useAdminCachedList(key, fetcher, fallback, { enabled = true } = {}) {
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const fallbackValue = useRef(fallback).current;
  const [snapshot, setSnapshot] = useState(() => ({
    key,
    entry: entries.get(key) || { data: fallbackValue, hasData: false },
    refreshing: true,
    error: null
  }));

  const currentEntry = snapshot.key === key
    ? snapshot.entry
    : entries.get(key) || { data: fallbackValue, hasData: false };
  const refreshing = snapshot.key !== key || snapshot.refreshing;

  useEffect(() => subscribe(key, (entry) => {
    setSnapshot((current) => current.key === key ? { ...current, entry } : current);
  }), [key]);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setSnapshot((current) => ({
      key,
      entry: current.key === key ? current.entry : entries.get(key) || { data: fallbackValue, hasData: false },
      refreshing: true,
      error: null
    }));
    try {
      const data = await fetcherRef.current();
      if (requestId.current === id) {
        publish(key, { data, hasData: true });
        setSnapshot({ key, entry: { data, hasData: true }, refreshing: true, error: null });
      }
      return data;
    } catch (error) {
      if (requestId.current === id) {
        setSnapshot((current) => current.key === key ? { ...current, error } : current);
      }
      throw error;
    } finally {
      if (requestId.current === id) {
        setSnapshot((current) => current.key === key ? { ...current, refreshing: false } : current);
      }
    }
  }, [fallbackValue, key]);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh().catch(() => {});
    return () => { requestId.current += 1; };
  }, [enabled, refresh]);

  const setData = useCallback((next) => {
    const previous = entries.get(key)?.data ?? currentEntry.data;
    const data = typeof next === "function" ? next(previous) : next;
    publish(key, { data, hasData: true });
    setSnapshot((current) => ({
      key,
      entry: { data, hasData: true },
      refreshing: current.key === key && current.refreshing,
      error: current.key === key ? current.error : null
    }));
  }, [currentEntry.data, key]);

  return {
    data: currentEntry.data,
    setData,
    refresh,
    loading: !currentEntry.hasData,
    refreshing,
    error: snapshot.key === key ? snapshot.error : null
  };
}
