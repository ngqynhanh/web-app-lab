import { $, escapeHTML as e, slotText } from "./ui.js";
import { courseSlots, overlap } from "./mock-api.js";
export const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export function findConflicts(items, courses) {
  const codes = new Set();
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = courses.find((c) => c.code === items[i].code),
        b = courses.find((c) => c.code === items[j].code);
      if (
        a &&
        b &&
        courseSlots(a, items[i].sectionId).some((x) =>
          courseSlots(b, items[j].sectionId).some((y) => overlap(x, y)),
        )
      ) {
        codes.add(a.code);
        codes.add(b.code);
      }
    }
  return codes;
}
export function renderSchedule(items, courses) {
  const conflicts = findConflicts(items, courses);
  $("#schedule").innerHTML = days
    .map(
      (day) =>
        `<section class="day" data-day="${day}"><h3>${day}</h3>${items
          .map((item) => {
            const c = courses.find((c) => c.code === item.code);
            if (!c) return "";
            const slots = courseSlots(c, item.sectionId).filter(
              (s) => s.day === day,
            );
            return slots.length
              ? `<article class="schedule-item ${conflicts.has(c.code) ? "conflict" : ""}"><strong>${e(c.code)}</strong><br>${slots.map(slotText).map(e).join("<br>")}<br>${e(c.title)}${conflicts.has(c.code) ? "<br><strong>Time conflict</strong>" : ""}</article>`
              : "";
          })
          .join("")}</section>`,
    )
    .join("");
}
export function exportSchedule(items, courses) {
  const escape = (value) =>
    String(value).replace(
      /[<>&"']/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  let svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="white"/><text x="25" y="35" font-family="Arial" font-size="24">Weekly course schedule</text>';
  for (let i = 0; i < days.length; i++) {
    svg += `<text x="${i * 235 + 25}" y="75" font-family="Arial" font-size="20">${days[i]}</text>`;
    let y = 110;
    for (const item of items) {
      const course = courses.find((c) => c.code === item.code);
      if (!course) continue;
      for (const slot of courseSlots(course, item.sectionId).filter(
        (s) => s.day === days[i],
      )) {
        svg += `<rect x="${i * 235 + 20}" y="${y - 20}" width="220" height="80" rx="5" fill="#eaf2fc"/><text x="${i * 235 + 30}" y="${y}" font-family="Arial" font-size="16">${escape(course.code)}</text><text x="${i * 235 + 30}" y="${y + 25}" font-family="Arial" font-size="14">${escape(slotText(slot))}</text>`;
        y += 100;
      }
    }
  }
  svg += "</svg>";
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "weekly-schedule.svg";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
