/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.controller('CouncilCtrl', ($http, $scope, $sce) => $http.get('http://starmadedock.net/forums/council-news/index.rss')
  .then(function(response) {
    $scope.news = [];

    // Convert the data to the same format that the news page uses
    response.data.rss.channel.item.forEach(item => $scope.news.push({
      title: item.title,
      body: item.encoded.toString(),
      created_at: new Date(item.pubDate).getTime()
    }));

    return $scope.news.forEach(entry => entry.body = $sce.trustAsHtml(entry.body));
  }
  , function() {
    if (!navigator.onLine) {
      return $scope.news = [{
        body: $sce.trustAsHtml('Unable to retrieve council news, you are not connected to the Internet')
      }];
    } else {
      return $scope.news = [{
        body: $sce.trustAsHtml('Unable to retrieve council news at this time.')
      }];
    }
}));
