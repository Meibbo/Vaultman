import { describe, it, expect } from 'vitest';
import { evalInObsidian } from 'obsidian-integration-testing';
import type { App } from 'obsidian';

/**
 * Internal interface for Obsidian's plugin manager
 */
interface ObsidianPluginManager {
    enabledPlugins: Set<string>;
    plugins: Record<string, {
        propertyIndex?: unknown;
        filterService?: unknown;
        queueService?: unknown;
        contextMenuService?: {
            _registry: Array<{ id: string }>;
        };
    }>;
}

/**
 * Extended App interface to access internal/undocumented properties safely in tests
 */
interface ExtendedApp extends App {
    plugins: ObsidianPluginManager;
}

describe('Vaultman Integration Tests', () => {
    it('should be loaded by Obsidian', async () => {
        const isLoaded = await evalInObsidian({
            fn: ({ app }) => {
                const extendedApp = app as ExtendedApp;
                return extendedApp.plugins.enabledPlugins.has('vaultman');
            }
        });
        expect(isLoaded).toBe(true);
    });

    it('can access the vault and create a file', async () => {
        const fileName = 'integration-test-sample.md';

        // Delete if left over from a previous failed run
        await evalInObsidian({
            args: { fileName },
            fn: async ({ app, fileName }) => {
                if (typeof fileName !== 'string') return;
                const existing = app.vault.getAbstractFileByPath(fileName);
                if (existing && 'extension' in existing) {
                    await app.fileManager.trashFile(existing);
                }
            }
        });

        await evalInObsidian({
            args: { fileName },
            fn: async ({ app, fileName }) => {
                if (typeof fileName !== 'string') return;
                await app.vault.create(fileName, '# Test Content\nCreated during integration test.');
            }
        });

        const fileExists = await evalInObsidian({
            args: { fileName },
            fn: ({ app, fileName }) => {
                if (typeof fileName !== 'string') return false;
                return !!app.vault.getAbstractFileByPath(fileName);
            }
        });
        expect(fileExists).toBe(true);

        await evalInObsidian({
            args: { fileName },
            fn: async ({ app, fileName }) => {
                if (typeof fileName !== 'string') return;
                const file = app.vault.getAbstractFileByPath(fileName);
                // Guard: only trash if it's a file (has an extension), not a folder
                if (file && 'extension' in file) {
                    await app.fileManager.trashFile(file);
                }
            }
        });
    });

    it('has core services initialized', async () => {
        const services = await evalInObsidian({
            fn: ({ app }) => {
                const extendedApp = app as ExtendedApp;
                const plugin = extendedApp.plugins.plugins.vaultman;
                return {
                    propertyIndex: !!plugin?.propertyIndex,
                    filterService: !!plugin?.filterService,
                    queueService: !!plugin?.queueService
                };
            }
        });

        expect(services.propertyIndex).toBe(true);
        expect(services.filterService).toBe(true);
        expect(services.queueService).toBe(true);
    });

    it('ContextMenuService is registered on the plugin', async () => {
        // Panel actions (tag.*, prop.*, value.*, file.*) register in panel onload(),
        // which only runs when the Vaultman view is mounted. In the test environment
        // the view is not open, so we only verify: service exists + workspace stub action.
        const result = await evalInObsidian({
            fn: ({ app }) => {
                const extendedApp = app as ExtendedApp;
                const plugin = extendedApp.plugins.plugins.vaultman;
                if (!plugin) return { ok: false, reason: 'plugin not found' };
                const svc = plugin.contextMenuService;
                if (!svc) return { ok: false, reason: 'contextMenuService not found' };
                const registeredIds = svc._registry.map((a: { id: string }) => a.id);
                const hasStub = registeredIds.includes('workspace.edit-with-vm');
                if (!hasStub) return { ok: false, reason: `workspace stub not found; registry: ${registeredIds.join(', ')}` };
                return { ok: true, reason: '' };
            }
        });
        expect(result.ok).toBe(true);
    });
});
