'use strict';

const app = angular.module('launcher');

app.controller('NewsCtrl', function ($http, $scope, $rootScope, $sce, NewsSidebarEntry) {
	// $http.get('https://star-made.org/news.json')
	$http.get('http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=244770&count=10&format=json')
		.then(function (response) {
			$rootScope.log.event("Retrieved news");

			// $scope.news = response.data;
			// return $scope.news.forEach(function (entry) {
			// 	entry.body = entry.body.replace(/style=['"].*?["']/g, '');
			// 	return entry.body = $sce.trustAsHtml(entry.body);
			// });

			//star-made.org is broken and is probably going to be retired, so lets use the Steam News API instead
			response.data.appnews.newsitems.forEach(function (entry) {
				entry.body = entry.contents;
				entry.body = entry.body.replace(/style=['"].*?["']/g, '');
				return entry.body = $sce.trustAsHtml(entry.body);
			});
		}).catch(function (response) {
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
		}
	});

	return $scope.sidebarEntries = NewsSidebarEntry.query();
});
