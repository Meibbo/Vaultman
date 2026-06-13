/**
 * logicsFiles — transition re-export shim (Q4 lane A, slice 1).
 *
 * The files-domain logic moved to the pure, app-free `logicFiles.ts` (spec AC#1:
 * zero `obsidian`/DOM/Svelte imports). This module historically exported the
 * impure `FilesLogic` class (constructed with `App`). It is kept ONLY as a
 * re-export of the pure API for one transition slice so external references
 * (knip/ADR-009/docs) resolve. New code must import from `./logicFiles`.
 *
 * @deprecated Import from `./logicFiles` instead. Slated for removal once the
 * coordinator updates knip/ADR-009 references (rename request reported, not done
 * here to respect the no-delete-outside-domain safety rule).
 */
export {
	buildFileTree,
	filterFlat,
	sortFileDescriptors,
	fileIconFor,
	fileCountLabelFor,
	isHiddenPath,
	fileNodeId,
	folderNodeId,
	type FileDescriptor,
	type FileRef,
	type FileNodeMeta,
	type BuildFileTreeOptions,
} from './logicFiles';
