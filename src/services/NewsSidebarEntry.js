/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.factory('NewsSidebarEntry', ($resource, apiConfig) => $resource(`https://${apiConfig.baseUrl}/api/v1/launcher/news_sidebar_entries/:id.json`, {id: '@id'}));
