import { useEffect, useState } from "react";

// Minimal hash router: "#/library/bpc-157?x=1" -> { path: ["library", "bpc-157"], query }.
// Hash routing works on any static host with no server rewrites.

export interface Route {
  path: string[];
  query: URLSearchParams;
}

function parse(hash: string): Route {
  const [pathPart, queryPart = ""] = hash.replace(/^#\/?/, "").split("?");
  return { path: pathPart.split("/").filter(Boolean), query: new URLSearchParams(queryPart) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function href(path: string, query?: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== "") params.set(k, String(v));
  const qs = params.toString();
  return `#/${path}${qs ? `?${qs}` : ""}`;
}

export function navigate(path: string, query?: Record<string, string | number | undefined>) {
  window.location.hash = href(path, query);
}
