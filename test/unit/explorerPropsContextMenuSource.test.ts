import { describe, expect, it } from 'vitest';

import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import propertyManagerSource from '../../src/modals/modalPropertyManager.ts?raw';

describe('Props explorer context-menu source guards', () => {
	it('registers minimal checkbox value state actions through shared boolean coercion', () => {
		expect(propsExplorerSource).toContain("id: 'value.checkbox-checked'");
		expect(propsExplorerSource).toContain("id: 'value.checkbox-unchecked'");
		expect(propsExplorerSource).toContain('meta.propType === \'checkbox\'');
		expect(propsExplorerSource).toContain(
			'this.plugin.settings?.minimalStyle === true',
		);
		expect(propsExplorerSource).toContain(
			"this._setCheckboxValue(meta.propName, meta.rawValue ?? '', true)",
		);
		expect(propsExplorerSource).toContain(
			"this._setCheckboxValue(meta.propName, meta.rawValue ?? '', false)",
		);
		expect(propsExplorerSource).toContain(
			"parsePropertyValue(String(checked), 'checkbox')",
		);
	});

	it('keeps checkbox state conversion on the property manager coercion path', () => {
		expect(propertyManagerSource).toContain(
			"import { convertPropertyValueType, parsePropertyValue } from '../logic/propertyValueCoercion';",
		);
		expect(propertyManagerSource).not.toContain('private parseValue');
		expect(propertyManagerSource).not.toContain('private convertType');
		expect(propsExplorerSource).toContain(
			"import { parsePropertyValue } from '../../logic/propertyValueCoercion';",
		);
	});
});
