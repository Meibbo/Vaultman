// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindTreeKeyboardBoundary, routeTreeKeyboardEvent } from '../../src/logic/logicTreeKeyboardBoundary';
import { registerTreeClipboardHandler, routeTreeClipboardEvent } from '../../src/logic/logicTreeClipboard';
import { handleTreeKeyboardKey, type TreeKeyboardCallbacks } from '../../src/logic/logicTreeKeyboard';

const disposers: Array<() => void> = [];
afterEach(() => {
 for (const dispose of disposers.splice(0)) dispose();
 document.body.replaceChildren();
});

class HostClipboardEvent extends Event {
 readonly clipboardData = null;
 constructor(type: string) { super(type, { bubbles: true, cancelable: true }); }
}

function frameElements() {
 const leaf = document.body.appendChild(document.createElement('div'));
 leaf.className = 'workspace-leaf';
 const frame = leaf.appendChild(document.createElement('div'));
 frame.className = 'workspace-leaf-content';
 const tree = frame.appendChild(document.createElement('div'));
 const row = tree.appendChild(document.createElement('div'));
 return { leaf, frame, tree, row };
}

describe('active owner interaction routing', () => {
 it('routes a row key when view.containerEl is inside the workspace leaf', () => {
  // Given the actual Obsidian leaf/content/tree nesting.
  const { frame, tree, row } = frameElements();
  const handle = vi.fn(() => true);
  disposers.push(bindTreeKeyboardBoundary(tree, handle));
  const route = (event: KeyboardEvent) => routeTreeKeyboardEvent(event, { frameEl: frame });
  document.addEventListener('keydown', route, true);
  disposers.push(() => document.removeEventListener('keydown', route, true));
  // When a row-originated key reaches the active view scope.
  row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  // Then the leaf ancestor does not incorrectly reject its own tree.
  expect(handle).toHaveBeenCalledOnce();
 });

 it('routes body keys to the active tree rather than a hidden scene registered first', () => {
  const { frame, tree } = frameElements();
  const visible = frame.appendChild(document.createElement('div'));
  const hiddenHandle = vi.fn(() => true);
  const visibleHandle = vi.fn(() => true);
  disposers.push(bindTreeKeyboardBoundary(tree, hiddenHandle, () => false));
  disposers.push(bindTreeKeyboardBoundary(visible, visibleHandle, () => true));
  const route = (event: KeyboardEvent) => routeTreeKeyboardEvent(event, { frameEl: frame });
  document.addEventListener('keydown', route, true);
  disposers.push(() => document.removeEventListener('keydown', route, true));
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  expect(hiddenHandle).not.toHaveBeenCalled();
  expect(visibleHandle).toHaveBeenCalledOnce();
 });

 it('never picks an arbitrary global tree for body keys without a frame owner', () => {
  const { tree } = frameElements();
  const handle = vi.fn(() => true);
  disposers.push(bindTreeKeyboardBoundary(tree, handle));
  routeTreeKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  expect(handle).not.toHaveBeenCalled();
 });

 it('does not send clipboard events to Files when another scene is active', () => {
  const { frame, tree } = frameElements();
  const copy = vi.fn();
  disposers.push(registerTreeClipboardHandler(tree, { handleCopy: copy }, () => false));
  routeTreeClipboardEvent('copy', new HostClipboardEvent('copy'), { frameEl: frame });
  expect(copy).not.toHaveBeenCalled();
 });

 it('keeps clipboard input editing in the focused control', () => {
  const { frame, tree } = frameElements();
  const input = tree.appendChild(document.createElement('input'));
  const cut = vi.fn();
  disposers.push(registerTreeClipboardHandler(tree, { handleCut: cut }, () => true));
  const route = (event: Event) => {
   if (event instanceof HostClipboardEvent) routeTreeClipboardEvent('cut', event, { frameEl: frame });
  };
  document.addEventListener('cut', route, true);
  disposers.push(() => document.removeEventListener('cut', route, true));
  input.dispatchEvent(new HostClipboardEvent('cut'));
  expect(cut).not.toHaveBeenCalled();
 });

 it('requires an owner for clipboard dispatch', () => {
  const { tree } = frameElements();
  const paste = vi.fn();
  disposers.push(registerTreeClipboardHandler(tree, { handlePaste: paste }, () => true));
  routeTreeClipboardEvent('paste', new HostClipboardEvent('paste'));
  expect(paste).not.toHaveBeenCalled();
 });
});

describe('native modifier allowlist on the DOM event path', () => {
 const state = { rows: [{ id: 'a.md', depth: 0, hasChildren: false, isExpanded: false }], focusedId: 'a.md', anchorId: 'a.md' };
 const callbacks: TreeKeyboardCallbacks = {
  onFocus: vi.fn(), onToggleExpand: vi.fn(), onActivate: vi.fn(), onRangeSelect: vi.fn(),
  onClearSelection: vi.fn(() => false), onRename: vi.fn(), canRename: () => true,
 };
 it.each([
  [' ', { ctrlKey: true }], ['Enter', { shiftKey: true }],
  ['ArrowRight', { shiftKey: true }], ['ArrowDown', { ctrlKey: true, shiftKey: true }],
  ['ArrowDown', { metaKey: true }], ['F2', { ctrlKey: true }],
 ])('leaves unsupported %s modifiers to the platform', (key, modifiers) => {
  const event = new KeyboardEvent('keydown', { key, ...modifiers });
  expect(handleTreeKeyboardKey(event, state, callbacks, undefined, { isMacOS: false }).handled).toBe(false);
 });
});
