/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const path = require('path');
const {
  remote
} = require('electron');

const app = angular.module('launcher-self-updater');

app.controller('QuickUpdaterCtrl', function($filter, $scope, updater, updaterProgress) {
  const argv = remote.getGlobal('argv');
  // TODO: Retrieve the install directory to update
  const installDir = path.resolve('../test'); //argv.installDir

  $scope.updaterProgress = updaterProgress;

  $scope.$watch('updaterProgress.text', newVal => // TODO: Update the progress bar
  console.log(newVal));

  return updater.getVersions('launcher')
    .then(function(versions) {
      versions = $filter('orderBy')(versions, '-build');
      console.log(versions);
      return updater.update(versions[0], installDir);
  });
});
