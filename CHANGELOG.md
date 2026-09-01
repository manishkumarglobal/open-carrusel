# Changelog

All notable changes specific to this maintained fork of Open Carrusel are documented here.

This changelog begins where the fork starts introducing its own changes.
It does not restate the upstream history of
[Hainrixz/open-carrusel](https://github.com/Hainrixz/open-carrusel).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Fork provenance documentation: an `About this fork` notice in the README and a
  maintainer guide covering the upstream sync model.
- A test harness (Vitest) and a continuous integration workflow running
  typecheck, lint, tests, and a production build on every pull request.

### Fixed

- Brand fonts now actually render. Font-family extraction failed on the exact
  form the system prompt teaches the AI to write, `font-family: 'Name', serif`,
  because the captured value was not allowed to contain quote characters. Every
  generated slide therefore rendered in a system fallback in both preview and
  export, and because both failed identically there was nothing to notice.
  Quoted and unquoted names, with and without fallbacks, in inline styles and in
  style blocks, are all handled now.
- Italic text uses the font's real italic design instead of a browser-synthesised
  slant. The italic cut is requested separately per family, because Google
  rejects the italic axis outright for families that have none, and a rejected
  family in a combined request took every other family down with it.
- Export no longer stalls. It waited for every declared font face to report
  loaded, which never happens: only the faces a slide uses are ever loaded, so
  the wait ran to its full 10 second timeout on every slide. It now waits for
  font loading to settle, which is bounded and correct.
- Export waits for images explicitly. Images previously arrived in time only as
  a side effect of the font stall above, so removing the stall would have raced.
- Font cache filenames are derived from sanitised family names. Names come from
  AI-authored slide HTML and were previously interpolated into a path unescaped.
- Concurrent changes to a data file are no longer lost. The per-file lock now
  covers the whole read, modify and write, so overlapping requests can no longer
  read the same snapshot and have the later write discard the earlier one while
  both report success. Previously, 12 slides created at once persisted 1.
- A data file that exists but no longer parses is reported as an explicit error
  and left on disk untouched, instead of being treated as an absent file and
  overwritten with empty defaults on the next write. Defaults now apply only when
  a file is genuinely missing.
- Storage failures are no longer reported to the user as a malformed request, and
  a failed load no longer renders as an empty account. The dashboard and the
  editor show what went wrong and state that nothing was deleted.
- Reordering slides now requires a full permutation of the carousel's slides.
  A partial list previously discarded every slide left out of it, and a list
  containing the same slide twice duplicated it.
- Slide preview no longer reads a React ref during render to decide its
  transition direction. The previous index is tracked in state instead, which
  removes a `react-hooks/refs` violation that made the newly added lint gate
  unpassable and could have produced a stale transition direction.
