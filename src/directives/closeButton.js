/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.directive('closeButton', () => ({
  restrict: 'E',
  replace: true,
  template: '<a ng-click="close()" ng-transclude></a>',
  transclude: true,

  link(scope) {
    return scope.close = () => window.close();
  }
}));
