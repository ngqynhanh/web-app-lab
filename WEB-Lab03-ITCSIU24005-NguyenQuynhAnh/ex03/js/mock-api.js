import { storage } from "./ui.js";
const KEY = "lab03-mock-server-v1";
export const overlap = (a, b) =>
  a.day === b.day && a.start < b.end && b.start < a.end;
export function courseSlots(course, sectionId) {
  return (course.sections.find((s) => s.id === sectionId) || course.sections[0])
    .slots;
}
export function createMockAPI(initialCourses) {
  let memory = storage.read(KEY, null);
  if (!memory) {
    memory = {
      courses: structuredClone(initialCourses),
      enrollments: [],
      waitlists: {},
      requests: {},
    };
    storage.write(KEY, memory);
  }
  let stopped = false,
    timer,
    failNext = false,
    forceOffline = false;
  const subscribers = new Set();
  const read = () => storage.read(KEY, memory);
  const write = (data) => {
    memory = data;
    storage.write(KEY, data);
  };
  const atomic = (callback) =>
    navigator.locks
      ? navigator.locks.request(KEY, () => callback())
      : Promise.resolve(callback());
  const delay = () =>
    new Promise((resolve) =>
      setTimeout(resolve, 500 + Math.floor(Math.random() * 1001)),
    );
  function emit(event) {
    subscribers.forEach((fn) => fn(event));
  }
  async function latency(kind) {
    await delay();
    if (forceOffline || !navigator.onLine)
      throw new Error("Offline. Your action remains queued.");
    if (kind === "enroll" && failNext) {
      failNext = false;
      throw new Error(
        "Simulated enrollment failure. Your seats and status were restored.",
      );
    }
    if (Math.random() < 0.1)
      throw new Error("Simulated network failure. Please retry.");
  }
  function snapshot() {
    return structuredClone(read());
  }
  function verify(data, course, student, sectionId) {
    if (
      !/^\d{8}$/.test(student.studentId) ||
      !student.name ||
      student.name.trim().length < 3 ||
      !/^\S+@\S+\.\S+$/.test(student.email)
    )
      throw new Error("Student details are invalid.");
    if (!student.eligible)
      throw new Error(
        "Academic standing does not meet this demo eligibility rule.",
      );
    const existing = data.enrollments.filter(
      (e) => e.studentId === student.studentId,
    );
    if (existing.some((e) => e.code === course.code))
      throw new Error("You are already enrolled in " + course.code + ".");
    const completed = new Set(student.completed || []);
    const missing = course.prerequisites.filter((code) => !completed.has(code));
    if (missing.length)
      throw new Error("Missing prerequisites: " + missing.join(", "));
    if (course.seats <= 0)
      throw new Error(
        "The last seat was taken. Join the waitlist or choose another course.",
      );
    if (!course.sections.some((s) => s.id === sectionId))
      throw new Error("The selected section no longer exists.");
    const credits =
      existing.reduce(
        (sum, e) => sum + data.courses.find((c) => c.code === e.code).credits,
        0,
      ) + course.credits;
    if (credits > 18)
      throw new Error("The 18-credit semester limit would be exceeded.");
    for (const enrollment of existing) {
      const other = data.courses.find((c) => c.code === enrollment.code);
      if (
        courseSlots(course, sectionId).some((a) =>
          courseSlots(other, enrollment.sectionId).some((b) => overlap(a, b)),
        )
      )
        throw new Error("Schedule conflict with " + other.code + ".");
    }
  }
  async function getCourses() {
    await latency("get");
    return snapshot();
  }
  async function getCourse(code) {
    await latency("get");
    const course = read().courses.find((c) => c.code === code);
    if (!course) throw new Error("Course not found.");
    return structuredClone(course);
  }
  async function enrollInCourse(code, student, { requestId, sectionId } = {}) {
    await latency("enroll");
    return atomic(() => {
      const data = read();
      if (data.requests[requestId])
        return structuredClone(data.requests[requestId]);
      const course = data.courses.find((c) => c.code === code);
      if (!course) throw new Error("Course not found.");
      verify(data, course, student, sectionId);
      course.seats -= 1;
      const enrollment = {
        id: crypto.randomUUID(),
        code,
        sectionId,
        studentId: student.studentId,
        requestId,
        createdAt: new Date().toISOString(),
      };
      data.enrollments.push(enrollment);
      data.requests[requestId] = enrollment;
      const wait = data.waitlists[code] || [];
      data.waitlists[code] = wait.filter((id) => id !== student.studentId);
      write(data);
      emit({ type: "enrollment", code });
      return structuredClone(enrollment);
    });
  }
  async function cancelEnrollment(id, requestId) {
    await latency("cancel");
    return atomic(() => {
      const data = read();
      if (data.requests[requestId])
        return structuredClone(data.requests[requestId]);
      const item = data.enrollments.find((e) => e.id === id);
      if (!item)
        throw new Error("Enrollment no longer exists. Refresh your data.");
      data.courses.find((c) => c.code === item.code).seats += 1;
      data.enrollments = data.enrollments.filter((e) => e.id !== id);
      const result = { cancelled: structuredClone(item) };
      data.requests[requestId] = result;
      write(data);
      emit({ type: "cancellation", code: item.code });
      return result;
    });
  }
  async function joinWaitlist(code, studentId) {
    await latency("waitlist");
    return atomic(() => {
      const data = read();
      data.waitlists[code] ||= [];
      if (!data.waitlists[code].includes(studentId))
        data.waitlists[code].push(studentId);
      write(data);
      return { position: data.waitlists[code].indexOf(studentId) + 1 };
    });
  }
  function schedule() {
    clearTimeout(timer);
    if (stopped) return;
    timer = setTimeout(
      async () => {
        await atomic(() => {
          const data = read();
          const course =
            data.courses[Math.floor(Math.random() * data.courses.length)];
          const before = course.seats;
          const opened = Math.random() < 0.3;
          course.seats = opened
            ? Math.min(40, course.seats + 1)
            : Math.max(0, course.seats - Math.floor(Math.random() * 3));
          write(data);
          if (course.seats !== before)
            emit({
              type: opened ? "spot" : "seats",
              code: course.code,
              seats: course.seats,
            });
        });
        schedule();
      },
      5000 + Math.random() * 5000,
    );
  }
  schedule();
  const onStorage = (event) => {
    if (event.key === KEY) emit({ type: "sync" });
  };
  window.addEventListener("storage", onStorage);
  return {
    setOffline(value) {
      forceOffline = value;
    },
    getCourses,
    getCourse,
    enrollInCourse,
    cancelEnrollment,
    joinWaitlist,
    snapshot,
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    failNextEnrollment() {
      failNext = true;
    },
    setRealtime(active) {
      stopped = !active;
      if (active) schedule();
      else clearTimeout(timer);
    },
    destroy() {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
      subscribers.clear();
    },
  };
}
