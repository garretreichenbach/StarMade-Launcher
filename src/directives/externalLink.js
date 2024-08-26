/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const electron = require('electron');

const {
  remote
} = electron;
const {
  shell
} = electron;

const {
  dialog
} = remote;

const app = angular.module('launcher');

app.directive('externalLink', () => ({
  restrict: 'E',
  replace: true,

  scope: {
    href: '@href',
    thirdPartyWarning: '=thirdPartyWarning'
  },

  template: '<a ng-click="openExternal($event)" ng-transclude></a>',
  transclude: true,

  link(scope, element) {
    element.removeAttr('href');

    return scope.openExternal = function(event) {
      event.preventDefault();

      if (scope.thirdPartyWarning) {
        return dialog.showMessageBox({
          type: 'info',
          buttons: [
            'OK',
            'Cancel'
          ],
          title: 'Third Party Website',
          message: 'You are about to visit a third party website. Schine GmbH does not take any responsibility for any content on third party sites.'
        },
          function(response) {
            if (response === 0) { return shell.openExternal(scope.href); }
        });
      } else {
        return shell.openExternal(scope.href);
      }
    };
  }
}));
