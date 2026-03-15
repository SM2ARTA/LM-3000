# ML3K — FIFA World Cup 2026 Logistics Manager

## Project Overview
Single-page web application for managing ground transport logistics for FWC26. Handles trucks, stadiums, venues, routes, and staffing across USA, Canada, and Mexico host cities.

## Architecture
- **Single file**: Everything lives in `index.html` (~800KB). No build step, no bundler.
- **Backend**: Supabase (URL and anon key stored at lines ~4204–4205 of `index.html`)
- **External libs** (CDN): `@supabase/supabase-js@2`, `xlsx@0.18.5`, `exceljs@4.4.0`, Google Fonts
- **No framework** — vanilla JS and CSS with CSS custom properties (design tokens in `:root`)

## Supabase
- Project URL: `https://stwopndhnxcjyomkufii.supabase.co`
- Key is the public anon key — safe to keep in source
- Client initialised at bottom of file: `SB = supabase.createClient(...)`
- Key table referenced in console output: `shared_state`

## Key Globals & Conventions
- CSS variables follow `--ac` (accent), `--tp` (text primary), `--ts` (text secondary), `--sf` (surface), `--bg` (background), etc.
- Font families: `--fd` = DM Sans, `--fm` = IBM Plex Mono
- Screen IDs: `#US` (upload screen), `#LS` (login screen), `#D` (dashboard)
- Sidebar venue list, main panel content, sticky header with tab buttons

## Dev Environment Notes
- **Shell**: Claude Code uses `C:\Users\vla8529\PortableGit-new\usr\bin\bash.exe`
- **Fork limitation**: msys2 programs (ls, grep, etc.) may fail to fork under Node.js. Use built-in tools (Read, Grep, Glob) instead of Bash for file operations.
- **Windows executables work fine** in the Bash tool (e.g. `whoami.exe`, `git.exe`)
- **No admin rights** on this machine (FIFA corporate domain)

## Editing
- Because the file is large, always use `offset` + `limit` when reading sections of `index.html`
- Use `Grep` with line numbers to locate specific functions or variables before editing
- Prefer `Edit` over full rewrites
