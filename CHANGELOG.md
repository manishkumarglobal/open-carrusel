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
