/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.constant('apiConfig', {
  baseUrl: 'registry.star-made.org',
  clientId: 'f23be50e1683f7b490d10e230a0bbaef01eee8ac9d43e7eb0ed240e5f669df52',
  redirectUri: 'starmade://auth/callback',
  scopes: 'public+read_citizen_info+write'
}
);

app.service('api', function($http, apiConfig) {
  this.getBaseUrl = () => apiConfig.baseUrl;

  this.getAuthorizeUrl = function() {
    let authorizeUrl = `https://${apiConfig.baseUrl}/oauth/authorize?`;
    authorizeUrl += 'response_type=token';
    authorizeUrl += '&client_id=' + apiConfig.clientId;
    authorizeUrl += '&redirect_uri=' + apiConfig.redirectUri;
    authorizeUrl += '&scope=' + apiConfig.scopes;
    return authorizeUrl;
  };

  this.get = relativeUrl => $http.get(`https://${apiConfig.baseUrl}/api/v1/${relativeUrl}`);

  this.put = (relativeUrl, data, config) => $http.put(`https://${apiConfig.baseUrl}/api/v1/${relativeUrl}`, data, config);

  this.getCurrentUser = function() {
    return this.get('users/me.json');
  };

  this.updateCurrentUser = function(data) {
    delete data.admin;
    return this.put('users/me.json', data);
  };

  this.isAuthenticated = () => !!localStorage.getItem('accessToken');

});
