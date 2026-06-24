# 2026-06-02 — Open Design → Vaultman tooling adaptation

## Classification

Initiative: hardening.

Rationale: this is not a publish initiative yet, because no public release or marketplace packaging decision exists. It is not primarily polish either, because the work is about reducing translation risk between the proto-design stream and Vaultman's production toolchain. If this later becomes a reusable Open Design plugin package, the packaging/distribution portion may move or cross-link to publish.

## Context

Open Design is currently being used as the `proto design` stream for Vaultman. The live project imported from `Vaultman (4).zip` lives under Open Design's application data:

```text
C:\Users\vic_A\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\cc18d191-72b5-453c-8f57-04b86a230f66
```

`C:\Users\vic_A\Downloads\Vaultman` is now a junction to that Open Design project folder, so humans and tools can refer to a stable path while Open Design keeps its internal random project id.

Open Design's Antigravity handoff resolves `antigravity` through:

```text
C:\Users\vic_A\.local\bin\antigravity.cmd
```

That shim redirects Open Design's internal project path to `Downloads\Vaultman`, launches Antigravity in a new window, and attempts to focus the IDE window.

## External Research Snapshot

Open Design is more flexible than Claude Design because it is local-first, open source, and built around existing code-agent CLIs. Its README describes the daemon as scanning PATH for CLIs such as Claude, Codex, Cursor, Gemini, OpenCode, Qwen, Copilot, Hermes, and others, then using whichever are available as design engines. It also frames skills as file-based `SKILL.md` folders and design systems as portable Markdown.

Open Design's plugin spec confirms that a plugin is the unit of distribution: a folder anchored by `SKILL.md`, optionally extended with `open-design.json`, design-system references, craft rules, assets, previews, inputs, and pipeline metadata. The plugin is not a Figma-style UI extension; it is a packaged intent/context layer consumed by a code agent through Open Design's project/run pipeline.

The plugin spec also defines task kinds relevant to Vaultman:

- `new-generation`: design/artifact generation.
- `code-migration`: existing repo or local path refresh.
- `tune-collab`: iteration on an existing Open Design project/artifact.

It reserves a code-migration pipeline shape:

```text
code-import -> design-extract -> rewrite-plan -> generate -> diff-review
```

The same spec is candid that some code-migration atoms are still planned or incomplete in v1, but it explicitly describes an existing-codebase refresh workaround: import a real repo, grant filesystem/subprocess capabilities, have the SKILL guide the agent through scanning files, planning, small patch batches, running typecheck/tests, and encoding build/test verdicts into the run loop.

Implication: a Vaultman-specific Open Design workflow is plausible, but it should begin as an out-of-tree/plugin-level workflow rather than a core fork.

Sources:

- Open Design repository: https://github.com/nexu-io/open-design
- Open Design plugin spec: https://github.com/nexu-io/open-design/blob/main/docs/plugins-spec.md
- Open Design official system prompt observed locally: `C:\tmp\open-design-src\packages\contracts\src\prompts\official-system.ts`
- Open Design local `code-import` atom observed locally: `C:\tmp\open-design-src\apps\daemon\src\plugins\atoms\code-import.ts`

## Local Evidence

Vaultman's production stack is not React artifact tooling:

- Svelte 5.
- TypeScript.
- `vite-plus`.
- UnoCSS.
- Vitest.
- `svelte-check`.
- Obsidian plugin runtime.
- Obsidian integration testing.
- Existing component tests and fixtures, including `obsidian-web-lab` references.

Confirmed files:

- `package.json`
- `vite.config.ts`
- `uno.config.ts`
- `vitest.config.ts`
- `src/**/*.svelte`
- `test/component/**`

Open Design's default designer prompt is HTML-first and React-on-request. It includes a dedicated React + Babel inline JSX section with pinned React, ReactDOM, and Babel standalone URLs. This is useful for artifact previews, but it is not the same as producing Vaultman-native Svelte/TypeScript/UnoCSS code.

Open Design's local `code-import` atom can detect framework/package-manager/style information and scan common web files, but in the inspected v0.8.0 code the primary `LANG_EXT` table includes `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.scss`, `.json`, `.html`, `.md`, and `.mdx`; it does not list `.svelte` there. A different design-system import path does know about `.svelte`, but code-migration coverage for Svelte should be considered incomplete until verified or patched.

## Working Hypothesis

We can mold Open Design responsibly enough to reduce the tooling mismatch, but the safest path is layered:

1. Do not fork/patch installed Open Design first.
2. Start with a Vaultman-specific Open Design plugin/skill/workflow.
3. Point it at a dedicated `sandbox` worktree or a copy of one.
4. Teach the workflow Vaultman's actual stack, commands, architecture, and stream discipline.
5. Use Codex or Claude Code as the agent inside Open Design when running that workflow.
6. Keep production translation authority with a repo-native agent in Antigravity/Codex until the Open Design workflow proves it can run checks and respect boundaries.

This keeps `proto design` experimental while bypassing part of the HTML/React-only tooling mismatch.

## Proposed Adaptation Path

### Phase 0 — Safety Boundary

Create a dedicated worktree from `sandbox`, for example:

```text
C:\Users\vic_A\worktrees\vaultman-od-sandbox
```

Rules:

- Open Design may read/write only this worktree or its own proto project.
- No direct writes to `main`.
- No direct writes to the primary `dev` checkout.
- Promotion remains upward: `sandbox` -> `dev` -> `main`.
- Every run that writes code must leave a summary, diff, and verification status.

### Phase 1 — Vaultman Open Design Skill

Create a local Open Design plugin/skill such as `vaultman-proto-integration`.

It should tell the agent:

- Target stack is Svelte 5 + TypeScript + vite-plus + UnoCSS.
- React/HTML artifacts are references only.
- Do not introduce React runtime code into Vaultman.
- Do not dump generated JSX into production.
- Use existing Vaultman components/services/types before inventing new ones.
- Treat `Downloads\Vaultman` as proto input, not the product repo.
- Treat the sandbox worktree as the code output target.
- Translate by feature slice, not whole-prototype overwrite.
- Run Vaultman verification commands after each patch batch.

Initial pipeline can stay simple:

```text
read proto -> scan repo -> classify -> plan -> patch small slice -> run checks -> summarize diff
```

### Phase 2 — Optional Live Preview Bridge

Investigate replacing or supplementing Open Design's artifact iframe with a Vaultman dev preview:

- `vp build --watch` for plugin build.
- an Obsidian/web-lab harness for rendering relevant Vaultman surfaces.
- component tests or fixture pages as preview targets.
- optional browser automation for screenshot comparison.

This should not be the first patch. First prove the agent can map proto intent to Svelte/TS changes in a worktree and run checks. Then wire preview ergonomics.

### Phase 3 — Open Design Core/Fork Patch Only If Needed

Only after the plugin-level flow hits a hard wall should we patch Open Design itself.

Candidate core patches:

- Add `.svelte` to code-import scanning.
- Improve framework/style detection for Svelte + UnoCSS.
- Add first-class external preview URL/project metadata.
- Add a safer worktree-import mode that records source branch and target path.
- Expose build/test status as a first-class pipeline signal instead of encoding it into critique score.

Any core patch should be maintained in a fork or separate branch and backed up before replacing the packaged app.

## Agent Role Split

Open Design agent:

- strong for visual exploration, artifact generation, structured critique, and proto iteration;
- acceptable for controlled worktree edits when given a strict Vaultman skill and verification loop;
- not yet trusted as sole production integrator.

Codex in Antigravity:

- owns production translation and repository integration;
- reads proto artifacts and Open Design summaries;
- implements into Svelte/TS/UnoCSS using Vaultman architecture;
- runs checks and prepares promotion-ready diffs.

Claude Code inside Open Design:

- likely similar to Codex inside Open Design if given the same skill and worktree;
- may be useful for design-heavy or long-form iteration;
- still must be constrained away from React artifact output when target is Vaultman code.

Claude Design / Claude artifacts:

- useful for visual ideation;
- expected to keep producing HTML/React/JSX-style artifacts unless strongly constrained;
- should not be treated as production-code generator for Vaultman.

## Decision Draft

Pursue a Vaultman-specific Open Design plugin/skill as the next responsible experiment.

Do not begin by modifying the installed Open Design app. Do not give Open Design write access to the primary production checkout. Use a sandbox worktree and a constrained skill first. Reassess after one small real translation slice succeeds with verification.

## Open Questions

1. Should the first target be a UI-only slice from `proto-v10`, or a smaller non-visual behavior slice already attempted by Open Design?
2. Should the worktree live under `C:\Users\vic_A\worktrees\...` or inside the Open Design project as an imported repo?
3. Which agent should be default inside Open Design for this experiment: Codex CLI or Claude Code CLI?
4. Which verification gate is enough for the first trial: `vp run check`, `vp run test:component`, or the full `vp run verify`?

## Recommended Next Step

Write a small spec for `vaultman-proto-integration`:

- plugin/skill folder shape;
- worktree target;
- allowed commands;
- forbidden writes;
- proto-to-code classification rubric;
- first translation slice;
- verification gate.

After approval, implement it as an out-of-tree local Open Design plugin before considering any Open Design core fork.
