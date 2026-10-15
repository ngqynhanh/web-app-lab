import {
  $,
  escapeHTML as e,
  fetchCourses,
  showLoading,
  showError,
  debounce,
} from "./ui.js";
// ES-module scope keeps state off window. Data is never hardcoded in HTML.
const state = { courses: [], term: "", category: "all", ready: false };
const host = $("#course-list");
const lifetime = new AbortController();
function render() {
  if (!state.ready) return;
  const term = state.term.toLowerCase().trim();
  const courses = state.courses.filter(
    (course) =>
      (state.category === "all" || course.category === state.category) &&
      (!term ||
        [course.code, course.title, course.instructor].some((value) =>
          value.toLowerCase().includes(term),
        )),
  );
  host.removeAttribute("aria-busy");
  $("#results-info").textContent =
    `Showing ${courses.length} of ${state.courses.length} courses`;
  host.innerHTML = courses.length
    ? courses
        .map(
          (course) => `
    <article class="card ${course.seats < 10 ? "low-seats" : ""}">
      <h3>${e(course.code)} · ${e(course.title)}</h3>
      <p class="meta">${e(course.instructor)} · ${course.credits} credits</p>
      <p class="meta">${e(course.schedule)}</p>
      <p>${e(course.description)}</p>
      <span class="badge ${course.seats < 10 ? "low" : ""}">${course.seats} seats available</span>
      <div class="actions"><button type="button" data-action="details" data-code="${e(course.code)}">View Details</button></div>
    </article>`,
        )
        .join("")
    : '<p class="empty">No courses found. Try a different search or category.</p>';
}
async function init() {
  state.ready = false;
  showLoading(host);
  try {
    state.courses = await fetchCourses(lifetime.signal);
    state.ready = true;
    render();
  } catch (error) {
    if (error.name !== "AbortError") showError(host, error, init);
  }
}
const search = debounce(render, 150);
$("#search-input").addEventListener(
  "input",
  (event) => {
    state.term = event.target.value;
    search();
  },
  { signal: lifetime.signal },
);
$(".filters").addEventListener(
  "click",
  (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    document
      .querySelectorAll("[data-category]")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    render();
  },
  { signal: lifetime.signal },
);
// One delegated handler continues to work after every card replacement.
host.addEventListener(
  "click",
  (event) => {
    const button = event.target.closest('[data-action="details"]');
    if (!button) return;
    const course = state.courses.find(
      (item) => item.code === button.dataset.code,
    );
    if (!course) return;
    alert(
      `${course.code}: ${course.title}\n${course.description}\nInstructor: ${course.instructor}\nSchedule: ${course.schedule}\nCredits: ${course.credits}\nSeats: ${course.seats}\nPrerequisites: ${course.prerequisites.join(", ") || "None"}`,
    );
  },
  { signal: lifetime.signal },
);
init();
window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  lifetime.abort();
  search.cancel();
});
