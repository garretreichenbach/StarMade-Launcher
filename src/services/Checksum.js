/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const async = require('async');
const crypto = require('crypto');
const fs = require('fs');
const mkdirp = require('mkdirp');
const request = require('request');

const app = angular.module('launcher');

app.factory('Checksum', function($q, $rootScope, updaterProgress) {
  let Checksum;
  return Checksum = class Checksum {
    constructor(size, checksum, relativePath, buildPath) {
      this.size = size;
      this.checksum = checksum;
      this.relativePath = relativePath;
      this.buildPath = buildPath;
    }

    checkLocal(installDir) {
      return $q(resolve => {
        const hash = crypto.createHash('sha1');

        const dest = `${installDir}/${this.relativePath}`;
        const stream = fs.createReadStream(dest);

        stream.on('error', () => {
          $rootScope.log.entry(`${this.relativePath} does not exist`);
          return resolve(true);
        });

        stream.on('data', data => hash.update(data, 'utf8'));

        return stream.on('end', () => {
          const localChecksum = hash.digest('hex');
          if (localChecksum !== this.checksum) {
            $rootScope.log.entry(`Checksum differs for ${this.relativePath}`);
            return resolve(true);
          } else {
            $rootScope.log.verbose(`Not downloading ${this.relativePath}`);
            return resolve(false);
          }
        });
      });
    }

    download(installDir) {
      const sourceFilePath = `${this.buildPath}/${this.relativePath}`;
      const dest = `${installDir}/${this.relativePath}`;

      $rootScope.log.entry(`Downloading: ${sourceFilePath}`);
      $rootScope.log.indent.entry(`To local: ${dest}`, $rootScope.log.levels.debug);

      return $q((resolve, reject) => {
        return async.series([
          function(callback) {
            const destBits = dest.split('/');
            const destFolder = dest.replace(destBits[destBits.length - 1], '');
            return mkdirp(destFolder, callback);
          },
          callback => {
            let bytesReceived = 0;
            return request
              .get(sourceFilePath)
              .on('error', err => {
                updaterProgress.curValue += this.size - bytesReceived;
                updaterProgress.filesDone += 1;
                updaterProgress.updateText();
                reject(err);
                return callback(err);
            }).on('data', function(chunk) {
                bytesReceived += chunk.length;
                updaterProgress.curValue += chunk.length;
                return updaterProgress.updateText();
              }).on('end', function() {
                updaterProgress.filesDone += 1;
                updaterProgress.updateText();
                resolve();
                return callback(null);
              }).pipe(fs.createWriteStream(dest));
          }
        ]);
    });
    }
  };
});
