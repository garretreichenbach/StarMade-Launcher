/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.controller('CitizenBroadcastCtrl', ($scope, $sce, citizenBroadcastApi, $rootScope) => citizenBroadcastApi.get().then(function(response) {
  if (response.data == null) { return; }

  $scope.message = $sce.trustAsHtml(response.data);
  return $scope.unread = true;
}));
