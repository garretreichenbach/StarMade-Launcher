/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.factory('citizenBroadcastApi', function ($http, apiConfig, $rootScope) {
	this.get = () => $http.get(`https://${apiConfig.baseUrl}/api/v1/citizen_broadcasts.json`)
		.then(function (response) {

				$rootScope.log.event("Checking for citizen broadcasts");

				// Get last-displayed broadcast ID
				const last_id = localStorage.getItem('last_broadcast_id') || -1;

				// Fetch and combine all broadcasts
				const messages = [];
				const broadcasts = response.data;
				broadcasts.forEach(function (broadcast) {
					broadcast = broadcast.citizen_broadcast;

					// Only display broadcasts once
					if (broadcast.id > last_id) {
						localStorage.setItem('last_broadcast_id', broadcast.id);
						$rootScope.log.indent.entry(`Displaying broadcast #${broadcast.id}`);
					} else {
						$rootScope.log.indent.verbose(`Already displayed broadcast #${broadcast.id}`);
						return;
					}

					let message = "";
					message += broadcast.message;
					message += "\r\n\r\n";
					messages.push(message);
					return messages.push("<hr/>");
				});


				// No broadcasts to display?
				if (messages.length === 0) {
					return null;
				}

				// Remove trailing <hr/> and join into a single string
				messages.pop();
				let message = messages.join("");
				// Convert newlines to markup
				message = message.split("\r\n").join("<br/>");

				$rootScope.log.indent.verbose(`markup: ${message}`);
				return message;
			}


			, function (err) {
				const msg = (err.message || err || "(unknown error)");
				$rootScope.log.error(`Error fetching citizen broadcasts: ${msg}`);
				return null;
			});

	return this;
});