import { $, fetchCourses, showLoading, showError, storage } from "./ui.js";
import { createCatalog } from "./catalog.js";
import { setupEnrollmentForm } from "./validation.js";
const catalog = createCatalog();
const request = new AbortController();
let form;
async function init() {
  showLoading($("#course-list"));
  try {
    const courses = await fetchCourses(request.signal);
    catalog.setCourses(courses);
    form?.destroy();
    form = setupEnrollmentForm(courses, async (data) => {
      storage.write("lab03-profile", data);
      return `Enrollment preview accepted for ${data.name} in ${data.course}. No request was sent to a registration server.`;
    });
  } catch (error) {
    if (error.name !== "AbortError") showError($("#course-list"), error, init);
  }
}
init();
window.addEventListener(
  "pagehide",
  (event) => {
    if (event.persisted) return;
    request.abort();
    catalog.destroy();
    form?.destroy();
  },
  { once: true },
);
