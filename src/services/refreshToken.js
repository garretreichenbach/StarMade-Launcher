/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.service('refreshToken', function($http, $q) {
  const REGISTRY_TOKEN_URL = 'https://registry.star-made.org/oauth/token';

  this.get = () => localStorage.getItem('refreshToken');

  this.set = token => localStorage.setItem('refreshToken', token);

  this.refresh = function() {
    return $q((resolve, reject) => {
      const refreshToken = this.get();
      if (refreshToken == null) { reject('No refresh token is set'); }

      return $http.post(REGISTRY_TOKEN_URL, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }).then(data => resolve(data)).catch(data => reject(data));
    });
  };

  this.delete = () => localStorage.removeItem('refreshToken');

});
