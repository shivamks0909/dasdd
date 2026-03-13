import { useMemo } from "react";
import { useLocation } from "wouter";

export interface SessionParams {
  pid: string;
  uid: string;
  ip: string;
  entryTime: string;
  exitTime: string;
  duration: string;
  loiMinutes: string;
  currentTime: string;
  reason: string;
  country: string;
  status: string;
  rawStart: string | null;
  rawEnd: string | null;
  timestamp: string;
  session: string;
  // Legacy aliases
  start: string;
  end: string;
  loi: string;
}

export function formatTimestamp(unix: string | null): string {
  if (!unix) return "-";
  try {
    const date = new Date(parseInt(unix) * 1000);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short"
    }).replace(",", "");
  } catch {
    return "-";
  }
}

export function calculateDuration(start: string | null, end: string | null): { loi: string, duration: string } {
  if (!start || !end) return { loi: "-", duration: "-" };
  try {
    const s = parseInt(start);
    const e = parseInt(end);
    const diffSeconds = e - s;
    if (isNaN(diffSeconds) || diffSeconds < 0) return { loi: "-", duration: "-" };

    const minutes = Math.floor(diffSeconds / 60);
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;

    let durationStr = `${minutes} minutes`;
    if (hrs > 0) {
      durationStr = `${hrs} hr ${mins} min`;
    }

    return {
      loi: minutes.toString(),
      duration: durationStr
    };
  } catch {
    return { loi: "-", duration: "-" };
  }
}

export function getSessionParams(search: string): SessionParams {
  const searchParams = new URLSearchParams(search);

  const pid = searchParams.get("pid") || "-";
  const uid = searchParams.get("uid") || "-";
  const ip = searchParams.get("ip") || "-";
  const startRaw = searchParams.get("start");
  const endRaw = searchParams.get("end");
  const loiParam = searchParams.get("loi");
  const reason = searchParams.get("reason") || "-";
  const country = searchParams.get("country") || "-";
  const status = searchParams.get("status") || "-";
  const session = searchParams.get("session") || "-";

  const entryTime = formatTimestamp(startRaw);
  const exitTime = formatTimestamp(endRaw);
  const { loi: calcLoi, duration: calcDuration } = calculateDuration(startRaw, endRaw);

  const loiMinutes = loiParam || calcLoi;
  let duration = calcDuration;
  if (loiParam) {
    const m = parseInt(loiParam);
    if (!isNaN(m)) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      duration = h > 0 ? `${h} hr ${min} min` : `${m} minutes`;
    }
  }

  const currentTime = new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short"
  }).replace(",", "");

  return {
    pid,
    uid,
    ip,
    entryTime,
    exitTime,
    duration,
    loiMinutes,
    currentTime,
    reason,
    country,
    status,
    rawStart: startRaw,
    rawEnd: endRaw,
    start: entryTime,
    end: exitTime,
    loi: loiMinutes,
    timestamp: currentTime,
    session,
  };
}

export function useSessionParams(): SessionParams {
  // Use window.location.search for SSR/Initial compatibility or just standard access
  const params = useMemo(() => getSessionParams(window.location.search), []);
  return params;
}
