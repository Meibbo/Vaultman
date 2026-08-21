/**
 * Tipos mínimos de los globales de mocha.
 *
 * POR QUÉ EXISTE ESTE FICHERO. El runner E2E es mocha (`framework: 'mocha'` en `wdio.conf.mts`),
 * pero el proyecto **no tiene `@types/mocha`** y `mocha` no publica tipos propios. Hasta hoy no
 * se notaba porque `test/e2e/` no existía, así que ningún fichero usaba `describe`/`it` fuera de
 * vitest, que sí trae los suyos.
 *
 * ESTO ES UN PARCHE, NO LA SOLUCIÓN. La solución es `pnpm add -D @types/mocha`, y es una decisión
 * del dev porque toca las dependencias y el proyecto tiene puertas de auditoría sobre ellas.
 * En cuanto se instale, **borra este fichero**: dos fuentes de verdad para los mismos globales
 * terminan divergiendo.
 */
declare function describe(title: string, fn: () => void): void;
declare function it(title: string, fn: () => void | Promise<void>): void;
declare function before(fn: () => void | Promise<void>): void;
declare function after(fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function afterEach(fn: () => void | Promise<void>): void;
