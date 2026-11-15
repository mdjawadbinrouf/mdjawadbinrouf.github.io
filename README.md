# mdjawadbinrouf.github.io

Personal website of Md Jawad Bin Rouf. One page of plain HTML, one CSS file and one small script, published by GitHub Pages.

## Editing

1. All content is in `index.html`, one section per block: News, Education, Experience, Research, Projects, Talks, Teaching, Skills, Personal, Contact. Empty slots are marked with `class="blank"` (shown as "To be added"); replace them with your text.
2. Experience cards: set `data-tags` to `teaching`, `research` or `service`. The Plain, ELI5 and TL;DR texts live in the `data-plain`, `data-eli5` and `data-tldr` attributes.
3. Papers: set `data-area` (`energy`, `supply` or `decision`) and `data-status` (`peer`, `abstract` or `review`).
4. Colors and fonts: `style.css` (the variables at the top).
5. Menu, filters, voices and photo viewer: `site.js`.
6. Photo: `assets/img/photo.jpg`. CV: `assets/pdf/Md_Jawad_Bin_Rouf_CV.pdf`.

The old `about.html`, `publications.html`, `awards.html` and `cv.html` addresses redirect to the matching section.

After editing `style.css` or `site.js`, change the `?v=` value after the file name in `index.html` so browsers load the new version.

Images in `assets/img` are also used by the Google Site, so keep them in place.

Fonts: Fraunces, Inter and JetBrains Mono, all under the SIL Open Font License (see `assets/fonts`).
