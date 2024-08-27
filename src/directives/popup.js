/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.directive('popup', () => ({
	restrict: 'E',
	replace: true,
	transclude: true,
	templateUrl: 'templates/popup.html',

	scope: {
		opened: '=',
		title: '@',
		type: '@'
	},

	link(scope, element, attributes, controller, transclude) {
		return scope.close = () => scope.opened = false;
	}
}));
