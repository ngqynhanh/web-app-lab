import { $, escapeHTML as e, storage } from "./ui.js";
export function setupEnrollmentForm(courses, onSubmit) {
  const form = $("#enrollment-form");
  const controller = new AbortController();
  const touched = new Set();
  let submitting = false;
  function updateCourses(items) {
    const value = form.elements.course.value;
    form.elements.course.innerHTML =
      '<option value="">Choose a course</option>' +
      items
        .filter((c) => !c.test)
        .map(
          (c) =>
            `<option value="${e(c.code)}">${e(c.code + " · " + c.title)}</option>`,
        )
        .join("");
    form.elements.course.value = value;
    validate();
  }
  function errorFor(name) {
    const value = form.elements[name].value.trim();
    if (name === "name" && value.length < 3)
      return "Enter a name with at least 3 characters.";
    if (name === "studentId" && !/^\d{8}$/.test(value))
      return "Enter exactly 8 digits (for example, 24000005).";
    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return "Enter a valid email address.";
    if (name === "course" && !courses.some((c) => c.code === value))
      return "Choose a course.";
    if (name === "phone" && value && !/^\+?[\d ()-]{8,20}$/.test(value))
      return "Use 8–15 digits, optionally with +, spaces or hyphens.";
    if (
      name === "phone" &&
      value &&
      (value.replace(/\D/g, "").length < 8 ||
        value.replace(/\D/g, "").length > 15)
    )
      return "Phone numbers must contain 8–15 digits.";
    if (name === "comments" && form.elements.comments.value.length > 500)
      return "Comments must be at most 500 characters.";
    return "";
  }
  function validate() {
    const names = ["name", "studentId", "email", "course", "phone", "comments"];
    let valid = true;
    for (const name of names) {
      const message = errorFor(name);
      if (message) valid = false;
      const control = form.elements[name];
      if (touched.has(name)) {
        control.classList.toggle("is-invalid", !!message);
        control.classList.toggle(
          "is-valid",
          !message && !!control.value.trim(),
        );
        control.setAttribute("aria-invalid", String(!!message));
        $("#" + name + "-error").textContent = message;
      }
    }
    $("#comment-count").textContent =
      `${form.elements.comments.value.length} / 500`;
    $("#submit-enrollment").disabled = !valid || submitting;
    return valid;
  }
  form.addEventListener(
    "input",
    (event) => {
      if (!event.target.name) return;
      touched.add(event.target.name);
      validate();
    },
    { signal: controller.signal },
  );
  form.addEventListener(
    "change",
    (event) => {
      touched.add(event.target.name);
      validate();
    },
    { signal: controller.signal },
  );
  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      ["name", "studentId", "email", "course", "phone", "comments"].forEach(
        (n) => touched.add(n),
      );
      if (submitting || !validate()) {
        form.querySelector("[aria-invalid=true]")?.focus();
        return;
      }
      const data = Object.fromEntries(new FormData(form));
      submitting = true;
      validate();
      $("#form-status").textContent = "Processing…";
      try {
        const message = await onSubmit(data);
        $("#form-status").className = "success";
        $("#form-status").textContent =
          message || "Enrollment recorded for this demonstration.";
      } catch (error) {
        $("#form-status").className = "error";
        $("#form-status").textContent = error.message;
      } finally {
        submitting = false;
        validate();
      }
    },
    { signal: controller.signal },
  );
  const saved = storage.read("lab03-profile", {});
  for (const n of ["name", "studentId", "email", "phone"])
    if (saved[n]) form.elements[n].value = saved[n];
  updateCourses(courses);
  return {
    updateCourses(items) {
      courses = items;
      updateCourses(items);
    },
    select(code) {
      form.elements.course.value = code;
      touched.add("course");
      validate();
    },
    getData() {
      return Object.fromEntries(new FormData(form));
    },
    isValid: validate,
    destroy() {
      controller.abort();
    },
  };
}
