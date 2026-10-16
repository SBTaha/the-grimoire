# the-grimoire
A dark-fantasy personal quest and knowledge management system. Zero dependencies, no build step.

A personal quest and knowledge management system with a dark-fantasy interface and an
ordinary productivity application underneath. Quests with priorities, deadlines, subtasks
and recurrence; questlines that unseal in order; a dated chronicle; a searchable codex;
and a statistics view built on an append-only completion log.

Built with no dependencies, no build step and no backend.

There is nothing to install and nothing to build. The application is ES modules loaded
directly by the browser.

```bash
git clone <repository-url> grimoire
cd grimoire
python3 -m http.server 8080      # or: npx serve, or any static file server
```

Then open <http://localhost:8080>.

A static server is required rather than opening `index.html` from the filesystem: browsers
refuse ES module imports over `file://` because of the same-origin policy. Any static
server will do.

To run the test suite you need Node 18 or newer, for its built-in test runner:

```bash
npm test        # node --test 'test/*.test.js'
```

`npm install` is not needed. The project has no dependencies, production or development.

**Requirements:** any browser from 2023 onwards. The code uses ES modules, private class
fields, `Array.prototype.at`, optional chaining, `structuredClone` (with a fallback) and
`color-mix()` in CSS.

