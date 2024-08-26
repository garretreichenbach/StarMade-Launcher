/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.factory('Version', function() {
  let Version;
  return (Version = class Version {
    constructor(path, version, build) {
      this.path = path;
      this.version = version;
      this.build = build;
    }
  });
});
