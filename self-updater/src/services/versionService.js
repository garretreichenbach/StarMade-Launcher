/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const _ = require('underscore');
const async = require('async');

const app = angular.module('launcher-self-updater');

app.service('versionService', function($q, $http) {

  const VERSIONS_URL = "https://registry.star-made.org/api/v1/launcher/versions.json";

  this.getVersions = function(releasesOnly) { if (releasesOnly == null) { releasesOnly = true; } return $http.get(VERSIONS_URL); };

  this.getManifestForVersion = function(version) {
    const def = $q.defer();

    this.getVersions().then(obj => def.resolve(_.find(obj.data, v => v.version === version)));

    return def.promise;
  };


  // Must have a return on the final line to make a service work correctly
});
