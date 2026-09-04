// Obsidian anade helpers a Element/Document que jsdom no tiene. Se instalan
// una vez para todos los tests de componente en vez de por fichero: olvidarlo
// en uno produce un fallo que parece del componente y no lo es.
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';

installObsidianDomPolyfill();
