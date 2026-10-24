# Story Time

A small, mobile-first story reader. Plain HTML, CSS and JavaScript; no framework, backend, build step or runtime dependencies. The playable website lives entirely in **`docs/`**. Passages live in **`docs/scenes/`**.

## Preview locally

With Node.js installed, run these commands from the repository folder:

```sh
node tools/serve.mjs
```

Open **http://127.0.0.1:4173/story_time/**. Stop the server with Ctrl+C. No package installation is needed. Use a local HTTP server rather than double-clicking `index.html`: the reader fetches Markdown files.

```sh
node --test
```

Tests check scene format, links, both sample routes, safe text rendering, the reading pause and navigation failures. GitHub runs them on pull requests and pushes to `main` as **Story checks / story-checks**.

## Write and connect scenes

1. Start in `docs/scenes/start.md`. This is the entry point for a new reader.
2. Create additional files in that same folder, using lowercase names with hyphens, such as `open-door.md`. Filenames are case-sensitive on GitHub Pages.
3. Put a `# Title` first, then prose with a blank line between paragraphs.
4. At the end, add `## Choices` with ordinary Markdown links. Each link becomes a button, labelled exactly as written. For a single continuation, use `[Next](next-scene.md)`.
5. For an ending, leave out `## Choices` entirely. The reader shows “The end” with no controls.

```md
# An open door

Light falls across the hallway. Somewhere, a clock stops.

You hear *one quiet step*.

## Choices
- [Enter the room](inside.md)
- [Wait in the hallway](hallway.md)
```

The supported Markdown subset is paragraphs, a `#` scene title, `##` subheadings, `*italics*`, `**bold**`, and `> blockquotes`. Leave blank lines around headings and quotes. Choice labels are plain text. Raw HTML displays as text. Images, prose hyperlinks, lists, tables, embeds, Obsidian `[[wikilinks]]` and other Markdown extensions are not implemented.

### Optional colours

Add this at the very top of a file, before its title. Both fields are optional; use three- or six-digit hex values. A scene without colours returns to the default dark palette. Choose dark backgrounds so the off-white text remains readable.

```yaml
---
background: "#101014"
accent: "#c9b38c"
---
```

### A passage supplied outside the game

Use a normal scene as the placeholder, and link onward when the reader is ready. Replace the example title and contact instructions with your own. There is no file picker or local-content importer.

```md
# A letter for you

This passage is shared separately. Ask the author for **The letter** using the contact details they gave you.

When you have read it, continue here.

## Choices
- [Next](after-the-letter.md)
```

Keep separately supplied content outside this repository. Anything in `docs/` is part of the deployed website.

### Obsidian and phone editing

You can open `docs/scenes/` as an Obsidian vault, or write scenes elsewhere and copy the finished `.md` files into it. Use standard Markdown links (`[Label](scene-name.md)`) rather than wikilinks. In Obsidian, turn off **Use [[Wikilinks]]** under **Files and links**, or type the links directly; see [Obsidian's link guide](https://obsidian.md/help/links). Keep the `.md` extension in every choice target. Obsidian's `.obsidian/` settings are ignored by Git.

On your phone, open a scene on GitHub and edit it, or upload finished Markdown files from your laptop. Use a branch and pull request for changes; the scene-link check will flag missing targets. Editing on a phone does not require a separate in-game editor.

## Reading and saved progress

The opening fades in from black. A scene fades out over 220 ms and the next fades in over 220 ms; its buttons unlock **700 ms after that incoming fade**. `docs/reader.js` contains the two timing constants. Repeated input is ignored throughout loading, fading and the reading pause. This is a brief buffer, not a timer based on passage length.

Progress saves automatically in this browser under the key `story-time:scene`. Reopening resumes the last successfully displayed scene, including an ending. It does not sync between devices or between different site addresses. If browser storage is unavailable, the story still plays and a notice explains that progress cannot be saved.

Renaming or removing a saved scene sends that reader to `start.md`, with an explanation. A temporary loading error keeps their saved place and allows retrying. Prefer to keep published filenames stable. There is no Restart control. **For author testing only**, clear the site's saved data in browser developer tools to replay the other route; this removes saved progress for that browser.

Long scenes make the page taller. The buttons follow the text in normal page flow, so they never cover it. Short scenes leave the choices near the bottom of the frame. The reader uses installed serif fonts and needs no font downloads.

## GitHub Pages

After reviewing and merging, configure the repository's **Settings → Pages → Deploy from a branch**, with **`main`** and **`/docs`** as the source, if Pages is available for this repository/account; see [GitHub's publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). The intended address is `https://gauchecamera.github.io/story_time/`. No custom build workflow is required. `docs/.nojekyll` keeps the Markdown files available unchanged.

The local preview uses the same `/story_time/` prefix. All code and scene requests are relative to the site. This repository is currently private; this prototype does not change repository visibility or enable Pages. A local check is not a check of the deployed site.

## Before merging

- Run `node --test` and confirm the pull-request check passes.
- In a fresh browser session, open the story, choose Next, and try each route (using cleared test progress or a separate browser for the second route).
- Reopen the same address at the decision and at an ending; verify it resumes in the same place.
- Watch a new scene appear: choices should remain dim briefly, then become available. Tapping during the pause must not skip a scene.
- On a real phone, check portrait and landscape, tap a choice, and long-press a button to check that its text is not selected. Use a long passage and confirm you can scroll through it to the buttons.
- After deployment, repeat the opening and a complete route at the actual `/story_time/` Pages address, checking that colours, styles and scene files load there.

To preview from a phone on the same trusted Wi-Fi, you can opt into listening on the laptop's network interface in PowerShell: `$env:HOST='0.0.0.0'; node tools/serve.mjs`. Visit `http://<laptop-LAN-IP>:4173/story_time/`. This requires the laptop to stay on and may require a Windows firewall permission; the default preview is laptop-only. Stop the server when finished. The deployed Pages site will be independent of the laptop.
