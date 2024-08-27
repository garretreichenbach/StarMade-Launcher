'use strict';

const {
	shell
} = require('electron');

const app = angular.module('launcher');

app.directive('newsBody', () => ({
	restrict: 'E',
	replace: true,
	transclude: true,
	template: '<div class="body" ng-transclude></div>',

	link(scope, element) {
		return scope.$watch(() => element.find('a').length
			, () => element.find('a').on('click', function (e) {
				e.preventDefault();
				return shell.openExternal(angular.element(this).attr('href'));
			}));
	}
}));
