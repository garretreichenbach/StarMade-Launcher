'use strict';

const app = angular.module('launcher');

app.controller('CitizenBroadcastCtrl', ($scope, $sce, citizenBroadcastApi, $rootScope) => citizenBroadcastApi.get().then(function (response) {
	if (response.data == null) {
		return;
	}

	$scope.message = $sce.trustAsHtml(response.data);
	return $scope.unread = true;
}));
