/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.directive('faqEntry', () => ({
	restrict: 'E',
	replace: true,
	transclude: true,
	templateUrl: 'templates/faqEntry.html',

	scope: {
		question: '@',
		note: '@'
	},

	link(scope) {
		return scope.expanded = false;
	}
}));
