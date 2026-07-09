# Doc Recovery

## Recovery Gate Status

Classification: required before any PKM-AI embedding rebuild.

No files were restored during this audit step.

## Cache-Missing Candidates

Command:

```powershell
node -e "const fs=require('fs');const index=JSON.parse(fs.readFileSync('.agents/cache/retrieval-index.json','utf8'));const docs=Array.isArray(index.docs)?index.docs:[];const missing=docs.map((doc)=>doc.path).filter(Boolean).filter((p)=>p.startsWith('.agents/docs/')&&!fs.existsSync(p)).sort();console.log(JSON.stringify({missingCount:missing.length},null,2))"
```

Observed: `570` cached `.agents/docs` paths no longer exist locally.

Top groups from the cache-missing set:

| Group | Missing |
| --- | ---: |
| `work/hardening/specs` | 156 |
| `work/hardening/plans` | 144 |
| `work/hardening/research` | 68 |
| `work/pkm-ai/specs` | 42 |
| `work/pkm-ai/plans` | 40 |
| `work/hardening/backlog` | 22 |
| `superpowers/specs/2026-05-10-shadcn-tailwind-transition` | 15 |
| `work/draft/2026-06-03-onenote-companion-architecture-megadump` | 14 |
| `work/hardening/issues` | 12 |
| `work/pkm-ai/research` | 9 |

Interpretation: the PKM-AI cache remembers substantially more documentation
than the local tree currently contains. This is strong evidence that rebuilding
retrieval or embeddings now would bake in a reduced corpus.

## Git Deleted-Path Evidence

Command:

```powershell
git log --diff-filter=D --name-status -- '.agents/docs'
```

Observed: `561` unique deleted `.agents/docs` paths in Git history.

Largest deleted groups include:

| Group | Deleted |
| --- | ---: |
| `hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy` | 22 |
| `hardening/research/2026-07-02-proto-v12-design-inputs` | 20 |
| `hardening/issues/stable-1-1-data-files-parity` | 20 |
| `hardening/plans/2026-05-20-explorer-AR-action-routing` | 19 |
| `hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity` | 16 |
| `work/hardening/research` | 16 |
| `superpowers/specs/2026-05-10-shadcn-tailwind-transition` | 15 |

Interpretation: Git can likely recover many historical paths, but history alone
does not decide which deletions were intentional migration versus accidental
loss. Human review is required.

## Current Working Tree Deletions

Command:

```powershell
git status --porcelain -- '.agents/docs'
```

Observed: `487` currently deleted tracked files under `.agents/docs`.

Top current deletion groups:

| Group | Deleted |
| --- | ---: |
| `work/hardening/specs` | 172 |
| `work/hardening/plans` | 160 |
| `work/hardening/research` | 88 |
| `work/hardening/issues` | 39 |
| `work/hardening/backlog` | 23 |
| `work/hardening/items` | 3 |
| `work/hardening/index.md` | 1 |
| `work/hardening/visuals` | 1 |

Interpretation: this is the highest-risk signal. These are not only old Git
history entries; they are active worktree deletions. This audit intentionally
does not revert them.

## Current Route Reference Check

Command:

```powershell
node -e "scan .agents/docs/current/status.md, .agents/docs/current/handoff.md, .agents/docs/sessions/session-log.md for .agents/docs links"
```

Observed:

- references scanned: `8`;
- missing referenced paths: `5`.

Missing referenced paths:

- `.agents/docs/api-reference.md`
- `.agents/docs/work/hardening/issues/post-1-1-2-stability-polish/025-post-qa-regression-recovery-plan.md`
- `.agents/docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/01-scope-docs-workflow-permissions.md`
- `.agents/docs/work/hardening/research/2026-06-15-lupa-filters-providers-queues-noncanonical/index.md`
- `.agents/docs/work/pkm-ai/CHANGELOG.md`

Interpretation: some missing docs are still referenced by current navigation or
session material, which raises their restore priority.

## Obsidian File Recovery Access

Command:

```powershell
obsidian eval code="JSON.stringify({vault: app.vault.getName(), recoveryPlugin: Object.keys(app.internalPlugins.plugins).filter((k)=>k.toLowerCase().includes('recover'))})"
```

Observed:

```json
{"vault":"Start of The Road","recoveryPlugin":["file-recovery"]}
```

Interpretation: Obsidian is focused on `Start of The Road`, and File Recovery is
available as an internal plugin. The audit did not inspect individual snapshots
or restore any files.

## Restore Decision Queue

Recommended review order:

1. Current working tree deletions under `.agents/docs/work/hardening`.
2. Current route references that point to missing files.
3. PKM-AI cache-missing groups under `work/pkm-ai`.
4. PKM-AI cache-missing groups under `work/hardening`.
5. Historical `superpowers` and `draft` groups.

Do not rebuild semantic embeddings until an approved restore/ignore list exists.
