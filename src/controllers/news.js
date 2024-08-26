/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.controller('NewsCtrl', function($http, $scope, $rootScope, $sce, NewsSidebarEntry) {
  $http.get('https://star-made.org/news.json')
    .then(function(response) {
      $rootScope.log.event("Retrieved news");

      $scope.news = response.data;
      return $scope.news.forEach(function(entry) {
        entry.body = entry.body.replace(/style=['"].*?["']/g, '');
        return entry.body = $sce.trustAsHtml(entry.body);
      });}).catch(function(response) {
      if (!navigator.onLine) {
        $rootScope.log.warning("Unable to retrieve news (no internet connection)");
        return $scope.news = [{
          body: $sce.trustAsHtml('Unable to retrieve news, you are not connected to the Internet')
        }];
      } else {
        $rootScope.log.error("Unable to retrieve news (unknown cause)");
        $rootScope.log.error(response);
        return $scope.news = [{
          body: $sce.trustAsHtml('Unable to retrieve news at this time.')
        }];
      }});

  return $scope.sidebarEntries = NewsSidebarEntry.query();
});
