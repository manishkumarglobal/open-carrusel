# Maintaining this fork

This repository is a maintained fork of
[Hainrixz/open-carrusel](https://github.com/Hainrixz/open-carrusel).
This document describes how the fork tracks upstream and how changes get in.

## Remotes

Every clone of this fork should have both remotes configured:

```bash
git remote -v
# origin    https://github.com/manishkumarglobal/open-carrusel.git
# upstream  https://github.com/Hainrixz/open-carrusel.git
```

If `upstream` is missing:

```bash
git remote add upstream https://github.com/Hainrixz/open-carrusel.git
```

The upstream relationship is deliberate and must not be removed.
GitHub also records the fork relationship at the repository level.

## No ticket, no work

Every material product or engineering change starts as a GitHub Issue and lands
through a pull request that references it, normally with `Closes #N`.
Trivial administrative edits (a typo, a one-line ignore rule) do not need an
Issue.

Every pull request that changes behavior must add an entry under `[Unreleased]`
in [`CHANGELOG.md`](../CHANGELOG.md).

## Upstream sync model

Upstream changes are never applied blindly, and fork-specific behavior is never
silently overwritten by an upstream revision.

1. **Fetch upstream.**

   ```bash
   git fetch upstream
   git log --oneline main..upstream/main
   ```

   An empty log means there is nothing new to reconcile.

2. **Open an upstream-sync branch** when upstream has meaningful changes.

   ```bash
   git switch -c sync/upstream-YYYY-MM-DD main
   git merge upstream/main
   ```

3. **Reconcile conflicts in favor of the fork's fixes.** The files most likely
   to conflict are the ones this fork has corrected: the slide HTML rendering
   contract, the export pipeline, the JSON data layer, and the chat system
   prompt. When upstream touches one of those, keep the fork's corrected
   behavior and re-apply the upstream intent on top of it rather than reverting
   to the upstream implementation.

4. **Run the full gate.**

   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```

5. **Merge through a pull request** so the reconciliation is reviewable, and
   record anything noteworthy in the changelog.

## Contributing fixes back upstream

Some fixes in this fork are generic and would benefit the original project.
Where that is the case it is noted in the changelog entry. Opening an upstream
pull request is a separate, deliberate decision and is not automatic.

## Releases

The fork versions independently of upstream, starting from the upstream
`0.1.0` baseline.

1. Confirm `main` is green on CI.
2. Move the applicable `[Unreleased]` entries into a dated release section in
   the changelog.
3. Bump `version` in `package.json`.
4. Tag the exact commit and publish GitHub release notes derived from the
   changelog.
