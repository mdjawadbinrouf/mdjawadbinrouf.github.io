# mdjawadbinrouf.github.io

Personal website of Md Jawad Bin Rouf. One page of plain HTML, one CSS file and one small script, published by GitHub Pages.

## Editing

1. All content is in `index.html`, one section per block: News, Education, Experience, Research, Projects, Teaching, Awards, Skills, Beyond the lab, Contact.
2. Experience cards: set `data-tags` to `teaching`, `research` or `service` so the filter chips work.
3. Papers: set `data-area` (`forecasting` or `decision`) and `data-status` (`journal`, `conference` or `review`). A `pub-summary` paragraph is optional.
4. Colors and fonts: `style.css` (the variables at the top).
5. Menu, filters, summaries switch and photo viewer: `site.js`.
6. Photo: `assets/img/photo.jpg`. CV: `assets/pdf/Md_Jawad_Bin_Rouf_CV.pdf`.

The old `about.html`, `publications.html`, `awards.html` and `cv.html` addresses redirect to the matching section.

After editing `style.css` or `site.js`, change the `?v=` value after the file name in `index.html` so browsers load the new version.

Images in `assets/img` are also used by the Google Site, so keep them in place.

Fonts: Lora, IBM Plex Sans and Bricolage Grotesque, all under the SIL Open Font License (see `assets/fonts`).
