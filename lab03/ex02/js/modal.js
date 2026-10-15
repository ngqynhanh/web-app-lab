import { $, escapeHTML as e, slotText } from "./ui.js";

export function createModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "dialog-backdrop";
    backdrop.innerHTML = '<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="course-modal-title" tabindex="-1"></section>';
    document.body.append(backdrop);
    const dialog = $(".dialog", backdrop);
    let opener, controller, closingTimer;

    function close() {
        if (backdrop.hidden)
            return;

        controller?.abort();
        backdrop.classList.remove("is-open");
        closingTimer = setTimeout(
            () => {
                backdrop.hidden = true;
                document.body.classList.remove("modal-open");
                (opener?.isConnected ? opener : $("#search-input"))?.focus()
            },

            matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180,
        );
    }


    function open(course, trigger) {
        clearTimeout(closingTimer);
        controller?.abort();
        controller = new AbortController();
        opener = trigger || document.activeElement;
        dialog.innerHTML = `<button class="dialog-close secondary" type="button" data-close aria-label="Close course details">×</button><h2 id="course-modal-title">${e(course.code)} · ${e(course.title)}</h2><p>${e(course.description)}</p><dl><dt>Instructor</dt><dd>${e(course.instructor)}</dd><dt>Credits</dt><dd>${course.credits}</dd><dt>Available seats</dt><dd>${course.seats}</dd><dt>Prerequisites</dt><dd>${e(course.prerequisites.join(", ") || "None")}</dd></dl><h3>Course sections</h3><div class="accordion">${course.sections.map((section, index) => `<button type="button" aria-expanded="${index === 0}" aria-controls="section-${index}" data-section="${index}">${e(section.label)} · ${e(section.id)}</button><div id="section-${index}" class="accordion-panel" ${index === 0 ? "" : "hidden"}><p>${e(section.slots.map(slotText).join("; "))}</p><p>Room ${e(section.room)}</p></div>`).join("")}</div>`;
        backdrop.hidden = false;

        document.body.classList.add("modal-open");
        requestAnimcationFrame(() => backdrop.classList.add("is-open"));
        
    }
}