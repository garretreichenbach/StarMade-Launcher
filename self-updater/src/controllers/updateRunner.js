/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const path = require('path');
const {
  remote
} = require('electron');
const _ = require('underscore');

const app = angular.module('launcher-self-updater');

app.controller('UpdateRunnerCtrl', function($scope, $element, $http, versionService) {

  window.scope = $scope;

  $scope.status = "Downloading manifest...";

  $scope.progress = 1;

  $scope.$watch('progress', (newVal, oldVal) => document.getElementsByTagName('progress')[0].value = newVal);

  $scope.args = remote.getGlobal('argv');

  $scope.title = () => `Updating Launcher to ${$scope.args.version}`;

  return $scope.startUpdate = function() {
    $scope.status = "Starting Update";
    $scope.progress = 20;
    $scope.availableVersions = [];

    versionService.getManifestForVersion($scope.args.version).then(function(manifest) {});


    return versionService.getVersions().then(function(obj) {
      $scope.availableVersions = obj.data;
      const latest = _.filter($scope.availableVersions, ver => ver.version);
      return $scope.status = `Latest version is ${latest.version}, downloading binary...`;
    });
  };
});

