import { $, escapeHTML as e, storage, debounce } from "./ui.js";
import { createModal } from "./modal.js";
export function createCatalog({
  advanced = true,
  onAction = () => {},
  extraButtons = () => "",
  onDrag = () => {},
} = {}) {
  const host = $("#course-list"),
    search = $("#search-input"),
    suggestions = $("#suggestions");
  const abort = new AbortController();
  const modal = advanced ? createModal() : null;
  const state = {
    ready: false,
    courses: [],
    term: "",
    category: "all",
    view: "cards",
    sort: "code",
    direction: 1,
    favorites: new Set(storage.read("lab03-favorites", [])),
    onlyFavorites: false,
  };
  let suggested = [],
    selected = -1,
    renderTimer,
    virtualCourses = [];
  const debounced = debounce(() => render(), 150);
  function filtered() {
    const term = state.term.toLowerCase().trim();
    return state.courses
      .filter(
        (c) =>
          (state.category === "all" || c.category === state.category) &&
          (!state.onlyFavorites || state.favorites.has(c.code)) &&
          (!term ||
            [c.code, c.title, c.instructor].some((v) =>
              v.toLowerCase().includes(term),
            )),
      )
      .sort((a, b) => {
        const x = a[state.sort],
          y = b[state.sort];
        return (
          state.direction *
          (typeof x === "number"
            ? x - y
            : String(x).localeCompare(String(y), undefined, { numeric: true }))
        );
      });
  }
  function buttons(c) {
    return `<div class="actions"><button type="button" data-action="details" data-code="${e(c.code)}">View Details</button>${advanced ? `<button type="button" class="secondary" data-action="favorite" data-code="${e(c.code)}" aria-label="${state.favorites.has(c.code) ? "Remove" : "Add"} ${e(c.code)} ${state.favorites.has(c.code) ? "from" : "to"} favorites" aria-pressed="${state.favorites.has(c.code)}">${state.favorites.has(c.code) ? "♥" : "♡"} Favorite</button>` : ""}${extraButtons(c)}</div>`;
  }
  function card(c) {
    return `<article class="card ${c.seats < 10 ? "low-seats" : ""} ${c.pending ? "pending" : ""}" ${c.test ? "" : 'draggable="true"'} data-code="${e(c.code)}"><h3>${e(c.code)} · ${e(c.title)}</h3><p class="meta">${e(c.instructor)} · ${c.credits} credits</p><p class="meta">${e(c.schedule)}</p><p>${e(c.description)}</p><span class="badge ${c.seats < 10 ? "low" : ""}">${c.seats} seats available${c.pending ? " · Pending" : ""}${c.enrolled ? " · Enrolled" : ""}</span>${buttons(c)}</article>`;
  }
  function renderVirtual() {
    const scroller = $(".virtual-list", host);
    if (!scroller) return;
    const start = Math.max(0, Math.floor(scroller.scrollTop / 100) - 3);
    const end = Math.min(virtualCourses.length, start + 14);
    const inner = $(".virtual-inner", host);
    inner.innerHTML = virtualCourses
      .slice(start, end)
      .map(
        (c, index) =>
          `<article class="virtual-row" style="top:${(start + index) * 100}px"><div><h3>${e(c.code)} · ${e(c.title)}</h3><span>${c.credits} credits · ${c.seats} seats${c.test ? " · test copy" : ""}</span></div><button data-action="details" data-code="${e(c.code)}">View Details</button></article>`,
      )
      .join("");
  }
  function render(immediate = false) {
    if (!state.ready) return;
    clearTimeout(renderTimer);
    const items = filtered();
    const focused = document.activeElement;
    const focusedAction = host.contains(focused)
      ? { action: focused.dataset.action, code: focused.dataset.code }
      : null;
    host.classList.remove("is-changing");
    const paint = () => {
      host.removeAttribute("aria-busy");
      host.className =
        "view-host " +
        (state.view === "cards"
          ? "course-grid"
          : state.view === "list"
            ? "list-view"
            : "");
      $("#results-info").textContent =
        `Showing ${items.length} of ${state.courses.length} courses · ${state.view} view`;
      if (items.length > 200) {
        virtualCourses = items;
        host.className = "view-host";
        host.innerHTML =
          '<div class="virtual-list" tabindex="0" role="region" aria-label="Virtual course list"><div class="virtual-inner"></div></div>';
        $(".virtual-inner", host).style.height = items.length * 100 + "px";
        renderVirtual();
      } else if (!items.length)
        host.innerHTML =
          '<p class="empty">No courses found. Try a different search or category.</p>';
      else if (state.view === "table")
        host.innerHTML = `<div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable course table"><table><thead><tr><th scope="col">Course</th><th scope="col">Instructor</th><th scope="col">Schedule</th><th scope="col" class="numeric">Credits</th><th scope="col" class="numeric">Seats</th><th scope="col">Actions</th></tr></thead><tbody>${items.map((c) => `<tr><td>${e(c.code)} · ${e(c.title)}</td><td>${e(c.instructor)}</td><td>${e(c.schedule)}</td><td class="numeric">${c.credits}</td><td class="numeric">${c.seats}${c.pending ? " · Pending" : ""}${c.enrolled ? " · Enrolled" : ""}</td><td>${buttons(c)}</td></tr>`).join("")}</tbody></table></div>`;
      else host.innerHTML = items.map(card).join("");
      if (focusedAction?.action)
        host
          .querySelector(
            `[data-action="${focusedAction.action}"][data-code="${CSS.escape(focusedAction.code)}"]`,
          )
          ?.focus({ preventScroll: true });
    };
    if (immediate || matchMedia("(prefers-reduced-motion: reduce)").matches)
      paint();
    else {
      host.classList.add("is-changing");
      renderTimer = setTimeout(paint, 120);
    }
  }
  host.addEventListener(
    "scroll",
    (event) => {
      if (event.target.matches(".virtual-list")) renderVirtual();
    },
    { capture: true, passive: true, signal: abort.signal },
  );
  host.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button || button.disabled) return;
      const c = state.courses.find((c) => c.code === button.dataset.code);
      if (!c) return;
      if (button.dataset.action === "details") {
        if (modal) modal.open(c, button);
        else
          alert(
            `${c.code}: ${c.title}\n${c.description}\nInstructor: ${c.instructor}\nSchedule: ${c.schedule}\nCredits: ${c.credits}\nSeats: ${c.seats}\nPrerequisites: ${c.prerequisites.join(", ") || "None"}`,
          );
      } else if (button.dataset.action === "favorite") {
        if (state.favorites.has(c.code)) state.favorites.delete(c.code);
        else state.favorites.add(c.code);
        storage.write("lab03-favorites", [...state.favorites]);
        render(true);
      } else onAction(button.dataset.action, c, button);
    },
    { signal: abort.signal },
  );
  host.addEventListener(
    "dragstart",
    (event) => {
      const card = event.target.closest("article[data-code]");
      if (!card) return;
      event.dataTransfer.setData("text/plain", card.dataset.code);
      onDrag(card.dataset.code);
    },
    { signal: abort.signal },
  );
  $(".filters").addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      state.category = button.dataset.category;
      document
        .querySelectorAll("[data-category]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      render();
    },
    { signal: abort.signal },
  );
  function closeSuggestions() {
    suggestions.hidden = true;
    search.setAttribute("aria-expanded", "false");
    search.removeAttribute("aria-activedescendant");
    selected = -1;
  }
  function choose(index) {
    const c = suggested[index];
    if (!c) return;
    search.value = state.term = c.code;
    closeSuggestions();
    debounced.cancel();
    render(true);
  }
  function showSuggestions() {
    suggested = state.courses
      .filter(
        (c) =>
          !c.test &&
          state.term.trim() &&
          [c.code, c.title].some((v) =>
            v.toLowerCase().includes(state.term.toLowerCase()),
          ),
      )
      .slice(0, 8);
    selected = -1;
    suggestions.hidden = !suggested.length;
    search.setAttribute("aria-expanded", String(!!suggested.length));
    suggestions.innerHTML = suggested
      .map(
        (c, i) =>
          `<div role="option" id="suggestion-${i}" aria-selected="false" data-index="${i}">${e(c.code + " · " + c.title)}</div>`,
      )
      .join("");
  }
  search.addEventListener(
    "input",
    () => {
      state.term = search.value;
      debounced();
      if (advanced) showSuggestions();
    },
    { signal: abort.signal },
  );
  if (advanced) {
    search.setAttribute("role", "combobox");
    search.setAttribute("aria-autocomplete", "list");
    search.setAttribute("aria-controls", "suggestions");
    search.setAttribute("aria-expanded", "false");
    search.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          closeSuggestions();
          return;
        }
        if (suggestions.hidden) return;
        if (["ArrowDown", "ArrowUp"].includes(event.key)) {
          event.preventDefault();
          selected =
            selected < 0
              ? event.key === "ArrowDown"
                ? 0
                : suggested.length - 1
              : (selected +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  suggested.length) %
                suggested.length;
          suggestions
            .querySelectorAll("[role=option]")
            .forEach((s, i) =>
              s.setAttribute("aria-selected", String(i === selected)),
            );
          search.setAttribute(
            "aria-activedescendant",
            "suggestion-" + selected,
          );
          $("#suggestion-" + selected).scrollIntoView({ block: "nearest" });
        } else if (event.key === "Enter" && selected >= 0) {
          event.preventDefault();
          choose(selected);
        }
      },
      { signal: abort.signal },
    );
    suggestions.addEventListener(
      "mousedown",
      (event) => event.preventDefault(),
      { signal: abort.signal },
    );
    suggestions.addEventListener(
      "click",
      (event) => {
        const option = event.target.closest("[data-index]");
        if (option) choose(Number(option.dataset.index));
      },
      { signal: abort.signal },
    );
    search.addEventListener("blur", closeSuggestions, { signal: abort.signal });
    $("#sort-by").addEventListener(
      "change",
      (event) => {
        state.sort = event.target.value;
        render();
      },
      { signal: abort.signal },
    );
    $("#sort-direction").addEventListener(
      "click",
      (event) => {
        state.direction *= -1;
        event.currentTarget.textContent =
          state.direction === 1 ? "Ascending ↑" : "Descending ↓";
        render();
      },
      { signal: abort.signal },
    );
    $("#favorites-only").addEventListener(
      "change",
      (event) => {
        state.onlyFavorites = event.target.checked;
        render();
      },
      { signal: abort.signal },
    );
    const tabs = $(".tabs");
    function activate(tab) {
      state.view = tab.dataset.view;
      tabs.querySelectorAll("[role=tab]").forEach((t) => {
        const active = t === tab;
        t.setAttribute("aria-selected", String(active));
        t.tabIndex = active ? 0 : -1;
      });
      host.setAttribute("aria-labelledby", tab.id);
      render(true);
    }
    tabs.addEventListener(
      "click",
      (event) => {
        const tab = event.target.closest("[role=tab]");
        if (tab) activate(tab);
      },
      { signal: abort.signal },
    );
    tabs.addEventListener(
      "keydown",
      (event) => {
        const list = [...tabs.querySelectorAll("[role=tab]")];
        let i = list.indexOf(document.activeElement);
        if (i < 0) return;
        if (event.key === "ArrowRight") i = (i + 1) % list.length;
        else if (event.key === "ArrowLeft")
          i = (i - 1 + list.length) % list.length;
        else if (event.key === "Home") i = 0;
        else if (event.key === "End") i = list.length - 1;
        else return;
        event.preventDefault();
        list[i].focus();
        activate(list[i]);
      },
      { signal: abort.signal },
    );
  }
  return {
    setCourses(courses) {
      state.ready = true;
      state.courses = courses;
      render(true);
    },
    getCourse(code) {
      return state.courses.find((c) => c.code === code);
    },
    render,
    filtered,
    destroy() {
      abort.abort();
      debounced.cancel();
      clearTimeout(renderTimer);
      modal?.destroy();
    },
  };
}
