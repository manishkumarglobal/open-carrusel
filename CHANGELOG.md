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

- Slide preview no longer reads a React ref during render to decide its
  transition direction. The previous index is tracked in state instead, which
  removes a `react-hooks/refs` violation that made the newly added lint gate
  unpassable and could have produced a stale transition direction.
