// Small shared primitives; imports remain scoped to each ES module.
export const $ = (selector, root = document) => root.querySelector(selector);
export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export const storage = {
  read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};
export const debounce = (callback, ms = 150) => {
  let timer;
  const run = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), ms);
  };
  run.cancel = () => clearTimeout(timer);
  return run;
};
export async function fetchCourses(signal) {
  const url = new URLSearchParams(location.search).has("loadError")
    ? "data/missing-courses.json"
    : "data/courses.json";
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok)
    throw new Error(
      `HTTP ${response.status}: course data could not be loaded.`,
    );
  const data = await response.json();
  if (
    !Array.isArray(data) ||
    data.some(
      (c) =>
        !c.code ||
        !c.title ||
        !Number.isFinite(c.seats) ||
        !Array.isArray(c.sections),
    )
  )
    throw new Error("Invalid course JSON structure.");
  return data;
}
export function showLoading(host) {
  host.setAttribute("aria-busy", "true");
  host.innerHTML =
    '<p class="loading" role="status"><span class="spinner" aria-hidden="true"></span>Loading courses…</p>' +
    '<div class="skeleton" aria-hidden="true"></div>'.repeat(3);
}
export function showError(host, error, retry) {
  host.removeAttribute("aria-busy");
  host.innerHTML = `<section class="error" role="alert"><h2>Unable to load courses</h2><p>${escapeHTML(error.message)}</p><button type="button" data-action="retry">Retry</button><a href="index.html">Reset data path</a></section>`;
  host
    .querySelector("[data-action=retry]")
    .addEventListener("click", retry, { once: true });
}
export const slotText = (slot) =>
  `${slot.day} ${String(Math.floor(slot.start / 60)).padStart(2, "0")}:${String(slot.start % 60).padStart(2, "0")}–${String(Math.floor(slot.end / 60)).padStart(2, "0")}:${String(slot.end % 60).padStart(2, "0")}`;
