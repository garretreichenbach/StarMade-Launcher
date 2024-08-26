/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.factory('tokenInterceptor', (accessToken, apiConfig) => ({
  request(config) {
    if (config.url.indexOf(`//${apiConfig.baseUrl}` === 0)) {
      const token = accessToken.get();
      if (token) { config.headers.Authorization = 'Bearer ' + token; }
    }

    return config;
  }
}));
