# Lab 02 Exercise 3
Nguyen Quynh Anh - ITCSIU24005

## Open the website
Extract the ZIP and open `ex03/index.html`. No installation, JavaScript or server is needed.

The research lab site comes from `Lab1-ITCSIU24005-NguyenQuynhAnh.zip`. This package also includes the previously styled `ex01` and `ex02` folders. The current task completes Lab 02 Exercise 3; the course site has Exercise 1 styling and is not a complete Lab 02 Exercise 2 solution.

## Pages
- `ex03/index.html`: lab mission, team image, news and original deep links.
- `ex03/research.html`: three image-based project cards in a responsive grid.
- `ex03/people.html`: Flexbox faculty cards, student list and alumni table.
- `ex03/publications.html`: Grid sidebar/results layout, original ten publications, sticky table headers, optional authors column hidden on phones, publication badges and CSS-only row details.
- `ex03/join.html`: three form sections, CSS progress preview, styled PDF file input, static counter preview and :checked funding field.
- `ex03/contact.html`: lab location, map, contacts and a styled inquiry demo.
- `ex03/components.html`: component showcase in Professional Blue.
- `ex03/components-green.html`: the same showcase in Academic Green.
- `ex03/components-dark.html`: the same showcase in Dark Mode.
- `ex03/performance.html`: 60 labeled test rows made by repeating the ten supplied publications six times. These are test copies, not new publications.

## Themes
Change the body attribute in any page to `data-theme="default"`, `data-theme="green"` or `data-theme="dark"`. The style-guide theme links open the three ready-made theme previews. Theme selection is manual as required in the guide; it is not persisted across other pages.

## Controls
- Click a publication's Show details checkbox to expand/collapse its details without JavaScript.
- On Join Us, select Applicant, Research or Documents to preview progress. All sections remain visible; this is a visual indicator rather than a validated wizard.
- Check I have external funding to reveal an optional field using :checked.
- Native file controls display the chosen filename. CSS styles the file selector button; accept=".pdf,application/pdf" is a chooser hint, not server validation.
- The counter is styled and static, as specified for this CSS lab. maxlength enforces the 1000-character limit.
- The original forms remain static GET demonstrations. They do not save applications, upload files, send inquiries or filter records. Year links provide working navigation through the publications.

## Requirements and theory applied
One external stylesheet uses reset, variables/themes, typography, layout, components, utilities and media-query sections. It provides `.card--project`, `.card--person`, `.card--publication`, primary/secondary/outline buttons, badges and alerts. Grid controls projects and publication layout; Flexbox controls navigation, people and student lists. Selectors include :nth-child, ::first-letter, :checked and ::file-selector-button. Custom properties and calc define spacing; transitions and transforms are limited to cards/buttons.

Base layout starts at 320px; 768px adds two-column cards and the authors column; 1024px adds a 250px publications sidebar and three project columns. Sticky navigation gains a shadow and border accent through a CSS scroll timeline where supported; other browsers keep sticky navigation. Print, reduced-motion, increased-contrast and forced-colors styles are included.

Missing report links show an unavailable state instead of a broken link. Existing publication metadata is retained, including the original 2023 group containing a 2024 venue. Project illustrations are small local SVGs created for this exercise. The original images remain local and are responsive.

## Report and evidence
The `report` folder contains the technical report in DOCX and PDF, actual browser screenshots, and a concise verification JSON. The report covers architecture, themes, responsive strategy, advanced CSS, performance, accessibility, edge cases, real-world critique and the component library.

Chromium checks cover ten pages at 320, 375, 768, 1024 and 1440px; all three themes across the six original pages; CSS expansion, form visibility, progress, GET submission, keyboard skip links, sticky headers and reduced motion. External paper URLs are retained from the source and were not checked online. Firefox and assistive-technology checks should still be performed locally.

For a classroom DevTools screenshot, inspect a project `.card` in Elements > Computed and capture its box model. To show a cascade override, inspect the active navigation link: `.site-nav__link--active` overrides the base class's colors by source order with equal specificity. Performance and CSS matching in the report were inspected using Chrome's DevTools protocol; those measurements do not substitute for a screenshot of the interactive DevTools panel if your instructor asks for one.
