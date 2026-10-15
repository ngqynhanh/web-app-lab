# Lab 03 JavaScript DOM and Fetch

Nguyen Quynh Anh - ITCSIU24005

This package contains code for all three exercises. No PDF, DOCX or technical report is included. The answers to What You Must Explain are provided in the chat response.

## Start a local HTTP server

Fetch and ES modules require HTTP. Do not double-click index.html or use file://.

Open a terminal in this extracted folder. On Windows:

```sh
py -m http.server 8000
```

On macOS/Linux:

```sh
python3 -m http.server 8000
```

Then visit:

- http://localhost:8000/ex01/index.html
- http://localhost:8000/ex02/index.html
- http://localhost:8000/ex03/index.html

VS Code Live Server also works. No npm dependencies, frameworks or remote services are required by the apps. Each exercise has its own HTML, CSS, JS modules and data/courses.json and can be served independently. The files are newly authored for Lab 03; Exercise 1 does not reuse Lab 01/02 markup or CSS.

## Exercise 1

Twelve courses are fetched from data/courses.json. Search matches code, title and instructor; category buttons combine with search. Result count, low-seat styling, no-results state, loading indicator, error state and Retry are implemented. One delegated course-list listener handles View Details. Exercise 1 uses the guide's simple alert for details; Exercises 2 and 3 use the accessible custom dialog.

To reproduce an actual HTTP error, open ex01/index.html?loadError=1. Retry reruns the same request; Reset data path returns to the valid JSON source. evidence/ex01-fetch-error.png shows this error state.

## Exercise 2

- Modal: complete details, click-X, outside-click and Escape close; scroll lock, focus trap and restored opener focus.
- Accordion: multiple course sections, at most one expanded. CS301 has two sections.
- Tabs: Card/Table/List without refetch, active styling and arrow/Home/End keyboard support.
- Form: live errors and valid borders; required name >=3 characters, exactly 8 digits for ID, email, course, optional phone, 500-character comments/counter; submission disabled until valid.
- Skeleton loading, spinner, filter fades, card entrance and reduced-motion preference.
- Optional challenges: keyboard autocomplete, code/title/seats/credits sorting and ascending/descending, persistent favorites and favorites-only filter.

The form stores a demonstration profile locally and shows success. It does not send a real enrollment. A valid lab student-ID example is 24000005; ITCSIU24005 is the submission ID but does not satisfy the guide's eight-digit input requirement.

## Exercise 3

Modules:

- app.js: coordinates UI, cart, queued operations, optimistic overlays and recovery.
- mock-api.js: 500-1500ms latency, 10% random failures, authoritative mock records, atomic validation/commit, idempotency and 5-10s availability simulation.
- store.js: reducer and persistent client cart, queue, profile and undo/redo history.
- schedule.js: interval conflicts, weekly grid, drag/drop and SVG export.
- catalog.js, modal.js, validation.js, ui.js: reusable components and utilities.

Workflow:

1. Fill valid student details in the enrollment form. Course selection can be set by Add to cart. Default completed courses are CS201, CS301, CS302, CS303 and CS304; edit this demo eligibility input as needed.
2. Add courses to the cart and select the desired section. Review credit, schedule, prerequisite and availability warnings.
3. Checkout immediately shows pending enrollment and a tentative seat decrement. Requests execute serially. Confirmed records stay enrolled; failed requests roll back individually and remain in the cart for retry.
4. Cancel confirmed enrollments or use Undo/Redo. Ctrl+Z and Ctrl+Y work outside text fields; Ctrl+Shift+Z also redoes.

Mock operations correspond to GET /api/courses, GET /api/courses/:code, POST /api/enrollment and DELETE /api/enrollment/:id. They are JavaScript Promise methods, not real HTTP endpoints. Initial course seed data is loaded with Fetch. The simulated server and client persistence are separate localStorage keys. Web Locks serialize commits across same-origin tabs where supported; the fallback is only single-context atomicity. No authentication, real registration server, payment or cross-device consistency is claimed.

## Reproduce edge cases

Expand Simulation controls near the top of Exercise 3:

- Fail next enrollment: arms a deterministic failure. Checkout a nonconflicting course and observe pending state, then exact seat/status rollback.
- Simulate offline: queue checkout or cancellation. Reconnect to drain the queue. A browser refresh preserves queued request IDs and recovers when the app is loaded online.
- Other students simulation: on by default; every 5-10s a course loses 0-2 seats or a spot opens. Turn it off for repeatable manual tests.
- Waitlist: CS410 starts full. With valid profile/course selection, Join waitlist shows a persistent position. Opening a spot triggers a notification; no seat is automatically reserved.
- Conflict: CS201 Monday 09:00-10:30 overlaps CS301 Section A Monday 10:00-11:30. CS301 Section B is an alternative.
- Prerequisite: remove CS302 from completed courses and try CS305. The client warns and the mock rechecks at commit.
- Eligibility: uncheck eligible academic standing; checkout is blocked.
- Credit limit: the selected and enrolled total must not exceed 18. The mock checks again per commit.
- Race: CS420 starts with one seat. Use two tabs with different eight-digit IDs, stop availability simulation, and attempt enrollment. The second commit sees the fresh seat count and fails safely.
- Partial failure: add two nonconflicting courses and arm Fail next enrollment. The first fails; later operations continue and successful enrollments stay confirmed.
- Refresh: cart, queue, history, favorites, profile and mock enrollments persist. Tabs/modal/search reset. Retried request IDs do not decrement a seat twice.
- Load 1000-course performance view: generates explicitly labeled copies. Only fourteen rows render at once. Search remains debounced. Test copies cannot be enrolled.

The weekly calendar accepts course-card drops only onto weekdays on which the course has a real section. Add to cart is the keyboard alternative. Export downloads an SVG image; Print / Save PDF opens the browser print dialog. Recommendations are transparent prerequisite-based hints, not a model trained on enrollment history.

## Boundaries

Offline action queueing works after initial assets have loaded. There is no service worker for an offline cold start. Waitlist joining itself requires a connection. Mock eligibility uses the supplied demo profile; a real backend would derive it from authenticated records. A waiting student is notified of capacity but does not receive an automatic reservation.

To reset the demonstration, clear this origin's localStorage in DevTools Application > Local Storage. Keys begin with lab03-. Do not clear unrelated sites' data.

## Verification

verification.json records tested features and measured headless-Chromium timings. Browser tests cover JSON loading/error/retry, search/category, modal focus, accordion, tabs, autocomplete, favorites, validation, optimistic queue recovery, undo/redo, rollback, prerequisites, conflicts, waitlist, last-seat racing, credit limit, random failures, virtualization and 15 page/viewport combinations from 320 to 1440px. Firefox and assistive-technology testing remain manual checks. Timings are observations, not a universal 60fps guarantee.
