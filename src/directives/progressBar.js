/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.directive('progressBar', () => ({
	restrict: 'E',
	replace: true,
	transclude: true,
	templateUrl: 'templates/progressBar.html',

	scope: {
		curValue: '@curValue',
		maxValue: '@maxValue'
	},

	link(scope, element) {
		const updatePercent = function () {
			scope.percent = (scope.curValue / scope.maxValue) * 100.0;
			return scope.width = 208.0 * (scope.percent / 100.0);
		};

		scope.$watch('curValue', updatePercent);
		scope.$watch('maxValue', updatePercent);

		return updatePercent();
	}
}));
