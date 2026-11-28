import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CHAT_DATA_EVENT, getChatDatasets } from "./chatDatasets";

const plain = (value) => String(value ?? "").replace(/<[^>]*>/g, "");
const visible = (element) => element.getClientRects().length > 0 && !element.closest("[hidden]");

export function collectGraphContext() {
  const main = document.querySelector("main");
  if (!main) return null;
  const loading = [...main.querySelectorAll('[role="status"]')].some(visible);
  const metadata = [...main.querySelectorAll("[data-chat-context]")].filter(visible).map((element) => JSON.parse(element.dataset.chatContext));
  const controls = [...main.querySelectorAll("select")].filter(visible).map((element) => ({
    name: element.getAttribute("aria-label") || element.closest("label")?.childNodes[0]?.textContent?.trim() || element.name,
    value: element.selectedOptions[0]?.textContent,
  }));
  const typesOnly = metadata.some((item) => item.metric === "types");
  const registered = getChatDatasets(window.location.pathname);
  const period = metadata.find((item) => item.period)?.period;
  const datasets = registered.filter((item) => (typesOnly ? item.id.startsWith("country-types-") : !item.id.startsWith("country-types-")) && (!period || !item.period || (item.period.start_ym === period.start_ym && item.period.end_ym === period.end_ym)));
  if (registered.length) return { page: window.location.pathname, status: !datasets.length || datasets.some((item) => item.status === "loading") ? "partial" : "ready", metadata, controls, datasets };
  const charts = loading ? [] : [...main.querySelectorAll(".js-plotly-plot")].filter(visible).map((element) => ({
    title: plain(element.layout?.title?.text || element.closest("section")?.getAttribute("aria-label") || element.closest("section")?.querySelector("h2, h3")?.textContent),
    x_axis: plain(element.layout?.xaxis?.title?.text),
    y_axis: plain(element.layout?.yaxis?.title?.text),
    bar_mode: element.layout?.barmode,
    hidden_labels: element.layout?.hiddenlabels ?? [],
    traces: (element.data ?? []).map((trace) => {
      const result = { name: plain(trace.name), type: trace.type, hidden: trace.visible === "legendonly" || trace.visible === false };
      for (const key of ["x", "y", "labels", "values", "q1", "median", "q3", "lowerfence", "upperfence", "customdata"]) {
        if (Array.isArray(trace[key]) || ArrayBuffer.isView(trace[key])) result[key] = Array.from(trace[key]);
      }
      return result;
    }),
  }));
  return { page: window.location.pathname, status: loading ? "loading" : "ready", metadata, controls, charts };
}

export default function useGraphContext() {
  const location = useLocation();
  const [context, setContext] = useState(null);
  const refresh = useCallback(() => {
    const next = collectGraphContext();
    setContext((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    return next;
  }, []);
  useEffect(() => {
    const main = document.querySelector("main");
    let timer;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(refresh, 150); };
    const observer = new MutationObserver(schedule);
    if (main) observer.observe(main, { subtree: true, childList: true, attributes: true, characterData: true });
    main?.addEventListener("change", schedule);
    window.addEventListener(CHAT_DATA_EVENT, schedule);
    schedule();
    return () => { clearTimeout(timer); observer.disconnect(); main?.removeEventListener("change", schedule); window.removeEventListener(CHAT_DATA_EVENT, schedule); };
  }, [location.pathname, location.search, refresh]);
  return [context, refresh];
}
