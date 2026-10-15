import {
  $,
  escapeHTML as e,
  fetchCourses,
  showLoading,
  showError,
  storage,
} from "./ui.js";
import { createCatalog } from "./catalog.js";
import { setupEnrollmentForm } from "./validation.js";
import { createMockAPI, courseSlots, overlap } from "./mock-api.js";
import { createStore } from "./store.js";
import {
  renderSchedule,
  findConflicts,
  exportSchedule,
  days,
} from "./schedule.js";
const store = createStore();
const abort = new AbortController();
let api,
  catalog,
  form,
  base = [],
  snapshot = { courses: [], enrollments: [], waitlists: {} },
  processing = false,
  stress = false,
  unsubAPI,
  unsubStore,
  sessionProfileId = "";
const offline = () => !navigator.onLine || $("#simulate-offline").checked;
function notify(message, error = false) {
  const log = $("#notifications");
  const node = document.createElement("p");
  node.className = error ? "toast error" : "toast";
  node.textContent = message;
  log.prepend(node);
  while (log.children.length > 6) log.lastChild.remove();
}
function profile() {
  const values = form?.getData() || store.getState().profile;
  return {
    ...values,
    completed: $("#completed")
      .value.split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
    eligible: $("#eligible").checked,
  };
}
function myEnrollments() {
  const id = profile().studentId || store.getState().profile.studentId;
  return snapshot.enrollments.filter((en) => en.studentId === id);
}
function chosenItems() {
  const enrolled = myEnrollments().map((en) => ({
    code: en.code,
    sectionId: en.sectionId,
  }));
  return [
    ...enrolled,
    ...store
      .getState()
      .cart.filter((item) => !enrolled.some((x) => x.code === item.code)),
  ];
}
function validationForCart() {
  const state = store.getState(),
    items = chosenItems(),
    messages = [];
  const completed = new Set(profile().completed || []);
  const credit = items.reduce(
    (n, item) => n + (base.find((c) => c.code === item.code)?.credits || 0),
    0,
  );
  if (credit > 18) messages.push("Maximum 18 credits would be exceeded.");
  const conflicts = findConflicts(items, base);
  if (conflicts.size)
    messages.push("Time conflict: " + [...conflicts].join(", "));
  for (const item of state.cart) {
    const c = base.find((c) => c.code === item.code);
    if (!c) {
      messages.push("Unknown course " + item.code);
      continue;
    }
    if (c.seats === 0) messages.push(c.code + " has no seats.");
    const missing = c.prerequisites.filter((code) => !completed.has(code));
    if (missing.length)
      messages.push(c.code + " requires " + missing.join(", "));
  }
  if (!profile().eligible) messages.push("Academic standing must be eligible.");
  return { messages, credit };
}
function sync() {
  if (!api || !catalog) return;
  snapshot = api.snapshot();
  base = snapshot.courses;
  const queued = store.getState().queue;
  const pending = queued.filter((o) => o.kind === "enroll");
  const enrolled = myEnrollments();
  let courses = base.map((c) => ({
    ...c,
    seats: Math.max(
      0,
      c.seats -
        pending.filter(
          (o) =>
            o.code === c.code &&
            !snapshot.enrollments.some((en) => en.requestId === o.requestId),
        ).length,
    ),
    pending: queued.some((o) => o.code === c.code),
    enrolled: enrolled.some((en) => en.code === c.code),
  }));
  if (stress) {
    const originals = courses;
    courses = [
      ...courses,
      ...Array.from({ length: 1000 - courses.length }, (_, i) => {
        const c = originals[i % originals.length];
        return {
          ...c,
          code: "TEST" + String(i + 1).padStart(4, "0"),
          title: c.title + " (performance copy)",
          test: true,
        };
      }),
    ];
  }
  catalog.setCourses(courses);
  renderSide();
}
function renderSide() {
  if (!form) return;
  const state = store.getState();
  const { messages, credit } = validationForCart();
  $("#connection-status").textContent = offline()
    ? `Offline — ${state.queue.length} action(s) queued. They will sync when online.`
    : `Online · simulated API · ${state.queue.length} pending action(s)`;
  $("#cart").innerHTML = state.cart.length
    ? "<ul>" +
      state.cart
        .map((item) => {
          const c = base.find((c) => c.code === item.code);
          if (!c) return "";
          return `<li><strong>${e(c.code)}</strong> · ${c.credits} credits<label for="section-${e(c.code)}">Section</label><select id="section-${e(c.code)}" data-section-code="${e(c.code)}">${c.sections.map((s) => `<option value="${e(s.id)}" ${s.id === item.sectionId ? "selected" : ""}>${e(s.label)}</option>`).join("")}</select><button class="secondary" data-remove="${e(c.code)}">Remove</button></li>`;
        })
        .join("") +
      "</ul>"
    : "<p>Your cart is empty.</p>";
  $("#cart-status").textContent =
    `${credit} total credits including current enrollments. ${messages.join(" ")}`;
  $("#checkout").disabled =
    !state.cart.length ||
    messages.length > 0 ||
    !form.isValid() ||
    processing ||
    state.queue.length > 0;
  $("#enrollments").innerHTML =
    myEnrollments()
      .map(
        (en) =>
          `<p><strong>${e(en.code)}</strong> · Enrolled <button class="secondary" data-cancel="${e(en.id)}" ${state.queue.some((o) => o.id === en.id) ? "disabled" : ""}>Cancel</button></p>`,
      )
      .join("") +
      state.queue
        .map(
          (o) =>
            `<p class="pending"><span class="spinner" aria-hidden="true"></span> ${e(o.code)} · ${o.kind === "enroll" ? "Enrolled (pending confirmation)" : "Cancellation pending"}</p>`,
        )
        .join("") || "<p>No enrollments yet.</p>";
  const id = profile().studentId;
  $("#waitlists").innerHTML =
    Object.entries(snapshot.waitlists)
      .filter(([, ids]) => ids.includes(id))
      .map(
        ([code, ids]) =>
          `<p>${e(code)} · Position ${ids.indexOf(id) + 1}${base.find((c) => c.code === code)?.seats > 0 ? " · Spot available — add to cart now." : ""}</p>`,
      )
      .join("") || "<p>No waitlists joined.</p>";
  const enrolledCodes = new Set(myEnrollments().map((en) => en.code));
  const related = base.filter(
    (c) =>
      !enrolledCodes.has(c.code) &&
      c.prerequisites.some((pre) => enrolledCodes.has(pre)),
  );
  $("#recommendations").innerHTML = related.length
    ? related
        .map(
          (c) =>
            `<p>Students who took ${e(c.prerequisites.find((p) => enrolledCodes.has(p)))} may also consider <button class="secondary" data-recommend="${e(c.code)}">${e(c.code)} · ${e(c.title)}</button></p>`,
        )
        .join("")
    : "<p>Enroll in a course to see prerequisite-based recommendations.</p>";
  $("#undo").disabled =
    !state.history.length || !!state.queue.length || processing;
  $("#redo").disabled =
    !state.future.length || !!state.queue.length || processing;
  renderSchedule(chosenItems(), base);
}
function addToCart(code, dropDay) {
  const c = base.find((c) => c.code === code);
  if (!c) return;
  if (c.seats <= 0) {
    notify(c.code + " is full. Join the waitlist.", true);
    return;
  }
  if (
    myEnrollments().some((en) => en.code === code) ||
    store.getState().queue.some((o) => o.code === code)
  ) {
    notify("Already enrolled or pending in " + code + ".", true);
    return;
  }
  const section = dropDay
    ? c.sections.find((s) => s.slots.some((slot) => slot.day === dropDay))
    : c.sections[0];
  if (!section) {
    notify("That course has no section on " + dropDay + ".", true);
    return;
  }
  form.select(code);
  store.dispatch({ type: "CART_ADD", item: { code, sectionId: section.id } });
  notify(
    code + " added to cart. Review prerequisites and schedule before checkout.",
  );
}
function queue(operation) {
  if (
    store
      .getState()
      .queue.some(
        (o) =>
          (o.code === operation.code && o.kind === operation.kind) ||
          (o.id && o.id === operation.id),
      )
  ) {
    notify("This action is already pending.", true);
    return;
  }
  store.dispatch({
    type: "QUEUE",
    operation: { ...operation, requestId: crypto.randomUUID() },
  });
  void processQueue();
}
async function processQueue() {
  if (processing || offline() || !api) return;
  processing = true;
  renderSide();
  while (store.getState().queue.length && !offline()) {
    const operation = store.getState().queue[0];
    try {
      let result;
      if (operation.kind === "enroll") {
        result = await api.enrollInCourse(
          operation.code,
          operation.student,
          operation,
        );
      } else
        result = await api.cancelEnrollment(operation.id, operation.requestId);
      const enrollment =
        operation.kind === "enroll" ? result : result.cancelled;
      const command = operation.command
        ? { ...operation.command, enrollment }
        : {
            kind: operation.kind,
            enrollment,
            student: operation.student || profile(),
          };
      // One durable client transition commits queue removal, history and cart removal.
      store.dispatch({ type: "COMMIT", operation, command });
      notify(
        operation.code +
          (operation.kind === "enroll"
            ? " enrollment confirmed."
            : " enrollment cancelled."),
      );
    } catch (error) {
      if (offline()) {
        notify("Connection lost; pending action retained for recovery.", true);
        break;
      }
      store.dispatch({ type: "DEQUEUE", requestId: operation.requestId });
      notify(
        operation.code +
          ": " +
          error.message +
          " Other successful courses remain enrolled.",
        true,
      );
    }
  }
  processing = false;
  sync();
}
function checkout() {
  const { messages } = validationForCart();
  if (!form.isValid()) {
    notify(
      "Complete valid student details in the enrollment form before checkout.",
      true,
    );
    return;
  }
  if (messages.length) {
    notify(messages.join(" "), true);
    return;
  }
  if (processing || store.getState().queue.length) return;
  const student = profile();
  store.dispatch({ type: "PROFILE", profile: student });
  storage.write("lab03-profile", student);
  // Enqueue the whole batch first; disable checkout before any async work.
  for (const item of [...store.getState().cart])
    store.dispatch({
      type: "QUEUE",
      operation: {
        kind: "enroll",
        ...item,
        student,
        requestId: crypto.randomUUID(),
      },
    });
  sync();
  if (offline()) notify("Checkout queued locally. It will sync when online.");
  void processQueue();
}
function historyAction(direction) {
  const state = store.getState();
  if (processing || state.queue.length) return;
  const command = (direction === "undo" ? state.history : state.future).at(-1);
  if (!command) return;
  const invert = direction === "undo";
  const enroll = (command.kind === "enroll") !== invert;
  const item = command.enrollment;
  queue(
    enroll
      ? {
          kind: "enroll",
          code: item.code,
          sectionId: item.sectionId,
          student: command.student,
          mode: direction,
          command,
        }
      : {
          kind: "cancel",
          code: item.code,
          id: item.id,
          student: command.student,
          mode: direction,
          command,
        },
  );
}
async function init() {
  showLoading($("#course-list"));
  try {
    const courses = await fetchCourses(abort.signal);
    api = createMockAPI(courses);
    catalog = createCatalog({
      onAction: async (action, c) => {
        if (c.test) return;
        if (action === "cart") addToCart(c.code);
        else if (action === "waitlist") {
          if (!form.isValid()) {
            notify(
              "Enter valid student details before joining a waitlist.",
              true,
            );
            form.select(c.code);
            return;
          }
          try {
            const result = await api.joinWaitlist(c.code, profile().studentId);
            notify(c.code + " waitlist position " + result.position);
            sync();
          } catch (error) {
            notify(error.message, true);
          }
        }
      },
      extraButtons: (c) =>
        c.test
          ? ""
          : `<button class="secondary" data-action="${c.seats <= 0 ? "waitlist" : "cart"}" data-code="${e(c.code)}" ${c.pending || c.enrolled ? "disabled" : ""}>${c.pending ? "Pending…" : c.enrolled ? "Enrolled" : c.seats <= 0 ? "Join waitlist" : "Add to cart"}</button>`,
    });
    form = setupEnrollmentForm(courses, async (data) => {
      const student = {
        ...data,
        completed: profile().completed,
        eligible: profile().eligible,
      };
      store.dispatch({ type: "PROFILE", profile: student });
      storage.write("lab03-profile", student);
      addToCart(data.course);
      return "Student details saved locally and course added to cart. Use Checkout to enroll.";
    });
    const saved = store.getState().profile;
    if (saved.completed) $("#completed").value = saved.completed.join(", ");
    if (saved.eligible !== undefined) $("#eligible").checked = saved.eligible;
    unsubStore = store.subscribe(() => sync());
    unsubAPI = api.subscribe((event) => {
      sync();
      if (event.code)
        notify(
          `${event.seats ?? base.find((c) => c.code === event.code)?.seats} seats remaining in ${event.code}${event.type === "spot" ? " — a spot opened." : ""}`,
        );
    });
    $("#checkout").addEventListener("click", checkout, {
      signal: abort.signal,
    });
    $("#undo").addEventListener("click", () => historyAction("undo"), {
      signal: abort.signal,
    });
    $("#redo").addEventListener("click", () => historyAction("redo"), {
      signal: abort.signal,
    });
    $(".side").addEventListener(
      "click",
      (event) => {
        const remove = event.target.closest("[data-remove]");
        if (remove)
          store.dispatch({ type: "CART_REMOVE", code: remove.dataset.remove });
        const cancel = event.target.closest("[data-cancel]");
        if (cancel) {
          const en = snapshot.enrollments.find(
            (e) => e.id === cancel.dataset.cancel,
          );
          if (en)
            queue({
              kind: "cancel",
              id: en.id,
              code: en.code,
              student: profile(),
            });
        }
        const rec = event.target.closest("[data-recommend]");
        if (rec) addToCart(rec.dataset.recommend);
      },
      { signal: abort.signal },
    );
    $(".side").addEventListener(
      "change",
      (event) => {
        if (event.target.dataset.sectionCode)
          store.dispatch({
            type: "SECTION",
            code: event.target.dataset.sectionCode,
            sectionId: event.target.value,
          });
        else renderSide();
      },
      { signal: abort.signal },
    );
    // Keep checkout validity and student-scoped records current without replacing focused controls.
    $("#enrollment-form").addEventListener(
      "input",
      () => {
        const id = profile().studentId;
        if (id !== sessionProfileId) {
          sessionProfileId = id;
          sync();
        } else renderSide();
      },
      { signal: abort.signal },
    );
    $("#enrollment-form").addEventListener("change", renderSide, {
      signal: abort.signal,
    });
    $("#simulate-offline").addEventListener(
      "change",
      () => {
        api.setOffline($("#simulate-offline").checked);
        renderSide();
        if (!offline()) void processQueue();
      },
      { signal: abort.signal },
    );
    $("#fail-next").addEventListener(
      "click",
      () => {
        api.failNextEnrollment();
        notify("The next enrollment request will fail deliberately.");
      },
      { signal: abort.signal },
    );
    $("#realtime").addEventListener(
      "change",
      () => api.setRealtime($("#realtime").checked),
      { signal: abort.signal },
    );
    $("#stress").addEventListener(
      "click",
      () => {
        stress = !stress;
        $("#stress").textContent = stress
          ? "Return to 12-course catalog"
          : "Load 1000-course performance view";
        sync();
      },
      { signal: abort.signal },
    );
    $("#refresh-data").addEventListener(
      "click",
      async () => {
        try {
          await api.getCourses();
          sync();
          notify("Server snapshot refreshed.");
        } catch (error) {
          notify(error.message, true);
        }
      },
      { signal: abort.signal },
    );
    window.addEventListener(
      "online",
      () => {
        sync();
        void processQueue();
      },
      { signal: abort.signal },
    );
    window.addEventListener("offline", renderSide, { signal: abort.signal });
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.target.closest("input,textarea,select,[contenteditable=true]")
        )
          return;
        if (
          (event.ctrlKey || event.metaKey) &&
          ["z", "y"].includes(event.key.toLowerCase())
        ) {
          event.preventDefault();
          historyAction(
            event.key.toLowerCase() === "y" || event.shiftKey ? "redo" : "undo",
          );
        }
      },
      { signal: abort.signal },
    );
    $("#schedule").addEventListener(
      "dragover",
      (event) => event.preventDefault(),
      { signal: abort.signal },
    );
    $("#schedule").addEventListener(
      "drop",
      (event) => {
        event.preventDefault();
        const day = event.target.closest("[data-day]")?.dataset.day;
        if (day) addToCart(event.dataTransfer.getData("text/plain"), day);
      },
      { signal: abort.signal },
    );
    $("#export-image").addEventListener(
      "click",
      () => exportSchedule(chosenItems(), base),
      { signal: abort.signal },
    );
    $("#export-pdf").addEventListener("click", () => window.print(), {
      signal: abort.signal,
    });
    sync();
    void processQueue();
  } catch (error) {
    if (error.name !== "AbortError") showError($("#course-list"), error, init);
  }
}
init();
window.addEventListener(
  "pagehide",
  (event) => {
    if (event.persisted) return;
    abort.abort();
    unsubAPI?.();
    unsubStore?.();
    catalog?.destroy();
    form?.destroy();
    api?.destroy();
  },
  { once: true },
);
