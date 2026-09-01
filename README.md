# school-scheduler

Weekly timetable viewer for the MENDELU information system (UIS).

UIS renders the timetable as a 143-column HTML table on a page behind a login,
and it shows every alternative seminar group for courses you have not signed up
for yet — which makes the real week hard to read. This app takes that page,
turns it into a clean grid, and lets you click the variant you actually attend
so the rest disappears.

**Your timetable never leaves your browser.** The page is parsed client-side and
kept in `localStorage` only; nothing is uploaded, and no schedule data is stored
in this repository.

## Using it

1. In UIS open **Zobrazení a tisk rozvrhů** / **Display and print the course
   weekly plan** in HTML format.
2. Open the browser console (⌥⌘J / F12) and run:

   ```js
   copy(document.documentElement.outerHTML)
   ```

3. Paste that into the app's import screen — or save the page with ⌘S and drop
   the `.html` file onto the same box.

Czech and English UIS pages are both supported; the interface follows the
language of the page you imported. **Replace timetable** re-imports, **Delete
data** wipes the stored timetable and your picks from the browser.

## Picking your lessons

- Click a lesson to pick it: it gets a red outline and the other variants of
  that course *and lesson type* drop off the grid.
- Lessons with no alternative (most lectures) are fixed and never hidden.
- **Show picked only** additionally hides variants you have not decided yet.
- Picks persist per browser and can be cleared any time.

## Saving versions

Once every choice is decided the week can be kept:

- **Save version** asks for a name and stores that complete week in the browser.
  It stays disabled while anything is still unpicked, and tells you how many
  choices are left.
- **New version** empties the grid so you can build a different week from
  scratch, then save that one too.
- Click a saved version to put it back on the grid — flipping between versions
  is how you compare them. All versions share the one imported timetable.
- Editing a loaded version marks it *unsaved*: **Save** overwrites it,
  **Save as new** keeps both, **Discard changes** puts it back.
- **✎** renames a version and **✕** deletes it — a deleted version is removed
  from the browser for good; if it was the one on screen its picks stay on the
  grid, no longer attached to any version.

**Replace timetable** keeps your versions; **Delete data** removes all of them
along with the timetable. The share link and QR code carry only what is on the
grid right now, not the whole list.

## Development

```sh
npm install
npm run dev
```

`npm run build` type-checks and builds; `npm run lint` runs ESLint. Pushing to
`main` deploys to GitHub Pages via `.github/workflows/deploy.yml` (enable Pages
with source "GitHub Actions" once, in repository settings).

## How the parsing works

`src/lib/parseSchedule.ts` exploits the fixed grid: each hour block occupies 10
column units followed by a 2-unit gap, so a lesson cell with `colspan="22"`
spans exactly two hours, and the running sum of `colspan` values locates every
lesson on the time axis. Per lesson it extracts day, start/end, room, study
group restriction, course, teacher, lecture vs. seminar, and the footnote
numbers — resolving those footnotes to an odd/even week parity by their text,
since the numbering differs on every page.
