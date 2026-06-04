export default {
	extends: ['stylelint-config-recommended'],
	plugins: ['stylelint-declaration-block-no-ignored-properties'],
	rules: {
		'font-family-no-missing-generic-family-keyword': null,
		'no-descending-specificity': null,
		'no-duplicate-selectors': null,
		'declaration-no-important': true,
		'declaration-property-value-disallowed-list': {
			display: ['/contents/i'],
		},
		'plugin/declaration-block-no-ignored-properties': true,
	},
};
