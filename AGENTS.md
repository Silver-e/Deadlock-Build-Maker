# Project agent instructions

## Complete and publish changes

The project owner wants completed work published automatically so the live GitHub Pages site stays current. This is standing authorization to commit and push changes made for the user's requested task; do not ask for routine confirmation before committing or pushing.

- After implementing a requested change, run the relevant checks, including `npm test` and `npm run build` for application changes. Run affected browser checks when appropriate.
- Review the diff and commit the completed work with a clear message. Include required source, tests, documentation, dependency lockfile, and bundled data updates. Do not commit secrets, generated build output, or unrelated user changes.
- The deployment branch is `main` on `origin` (`https://github.com/Silver-e/Deadlock-Build-Maker.git`). For routine work on `main`, push to `origin main` after checks pass. If working on another branch, follow the user's branch or PR instructions; do not silently merge into `main` or bypass branch protection.
- Every push to `main` triggers `.github/workflows/deploy.yml`, which tests, builds, and deploys GitHub Pages. A local change alone does not update the live site.
- Never force-push, discard other people's changes, or rewrite published history. If the remote has advanced, integrate changes safely and rerun affected checks before pushing.
- If checks, authentication, branch protection, or a merge conflict prevent publication, explain the blocker and what remains. Do not claim that the live site updated unless deployment success was verified; distinguish a successful push from a successful deployment.
- In the final response, state whether changes were pushed and whether deployment was verified.

An explicit user instruction to keep work local, avoid committing, or avoid pushing overrides this default.
