/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const {
	remote
} = require('electron');

const app = angular.module('launcher');

app.directive('minimizeButton', () => ({
	restrict: 'E',
	replace: true,
	template: '<a ng-click="minimize()" ng-transclude></a>',
	transclude: true,

	link(scope) {
		return scope.minimize = () => remote.getCurrentWindow().minimize();
	}
}));
