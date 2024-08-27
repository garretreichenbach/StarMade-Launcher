/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const _ = require('underscore');
const fs = require('original-fs');
const ipc = require('electron').ipcRenderer;
const path = require('path');
const async = require('async');
const request = require('request');
const {
	fileExists
} = require('../fileexists');


const app = angular.module('launcher');

app.service('updater', function ($q, $http, Checksum, Version, $rootScope, updaterProgress) {
	const BASE_URL = 'http://files.star-made.org';
	const LAUNCHER_BASE_URL = 'http://launcher-files-origin.star-made.org';
	const BRANCH_INDEXES = {
		pre: `${BASE_URL}/prebuildindex`,
		dev: `${BASE_URL}/devbuildindex`,
		release: `${BASE_URL}/releasebuildindex`,
		archive: `${BASE_URL}/archivebuildindex`,
		launcher: `${LAUNCHER_BASE_URL}/launcherbuildindex`
	};


	this.update = function (version, installDir, checkOnly, force) {
		if (checkOnly == null) {
			checkOnly = false;
		}
		if (force == null) {
			force = false;
		}
		if (updaterProgress.inProgress) {
			return;
		}

		$rootScope.log.event("Updating game...");

		if (checkOnly) {
			$rootScope.log.indent.info("(checkOnly)");
		}
		if (force) {
			$rootScope.log.indent.info("(forced)");
		}


		updaterProgress.curValue = 0;
		updaterProgress.inProgress = true;
		updaterProgress.text = 'Getting checksums';
		$rootScope.log.entry("Getting checksums");

		return this.getChecksums(version.path)
			.then(function (checksums) {
				const filesToDownload = [];

				const download = _.after(checksums.length, function () {
					if (filesToDownload.length === 0) {
						updaterProgress.text = 'Up to date';
						updaterProgress.needsUpdating = false;
						updaterProgress.inProgress = false;
						$rootScope.log.info("Up to date");
						// $rootScope.log.outdent()
						return;
					}

					let downloadSize = 0;
					filesToDownload.forEach(checksum => downloadSize += checksum.size);

					updaterProgress.curValue = 0;
					updaterProgress.maxValue = downloadSize;
					updaterProgress.filesCount = filesToDownload.length;
					updaterProgress.updateText();

					const q = async.queue((checksum, callback) => checksum.download(installDir)
							.then(() => callback(null)
								, err => callback(err))
						, 5);

					q.drain = function () {
						updaterProgress.text = 'All files downloaded';
						updaterProgress.inProgress = false;
						updaterProgress.needsUpdating = false;
						return $rootScope.log.info("All files downloaded");
					};
					// $rootScope.log.outdent()

					if (checkOnly) {
						updaterProgress.needsUpdating = true;
						return updaterProgress.inProgress = false;
						// $rootScope.log.outdent()
					} else {
						return filesToDownload.forEach(checksum => q.push(checksum, function (err) {
							if (err) {
								return $rootScope.log.error(err);
							}
						}));
					}
				});
				// $rootScope.log.outdent()

				updaterProgress.text = 'Determining files to download...';
				updaterProgress.curValue = 0;
				updaterProgress.maxValue = checksums.length;

				let totalSize = 0;
				checksums.forEach(checksum => totalSize += checksum.size);

				return checksums.forEach(checksum => checksum.checkLocal(installDir)
					.then(function (needsDownloading) {
						if (needsDownloading || force) {
							filesToDownload.push(checksum);
						}
						updaterProgress.text = `Determining files to download... ${updaterProgress.calculatePercentage()}%  selected ${filesToDownload.length}/${checksums.length} (${updaterProgress.toMegabytes(totalSize)} MB)`;
						updaterProgress.curValue++;
						return download();
					}));
			});
	};

	this.updateLauncher = function (version, launcherDir) {
		let resourcesDir = null;
		if (process.platform === 'darwin') {
			resourcesDir = path.join(launcherDir, '..', 'Resources');
		} else {
			resourcesDir = path.join(launcherDir, 'resources');
		}

		return new Promise(function (resolve, reject) {
			$rootScope.log.update(`Updating launcher to v${version.version}`);
			return fetchUpdate(version, resourcesDir)
				.then(() => applyUpdate(resourcesDir))
				.then(() => cleanupUpdate(resourcesDir))
				.then(() => resolve())
				.catch(err => reject(err));
		});
	};


	var fetchUpdate = function (version, dir) {
		let fetch_failed = false;  // Hack; see below.

		return new Promise(function (resolve, reject) {
			// cloud -> app_update.asar
			let sourceFilePath = version.path;
			sourceFilePath = sourceFilePath.replace(/\.\//g, '');

			if (fileExists(path.resolve(path.join(dir, 'app_update.asar')))) {
				$rootScope.log.entry("Cleaning up previous update");
				fs.unlinkSync(path.resolve(path.join(dir, 'app_update.asar')));
			}

			// Fetch the update from the server
			const writeStream = fs.createWriteStream(path.join(dir, 'app_update.asar'));
			try {
				return request(`${LAUNCHER_BASE_URL}/${sourceFilePath}/app.asar`)
					.on('response', function (response) {
						if (response.statusCode === 200) {
							$rootScope.log.verbose("Response: 200 OK", $rootScope.log.levels.verbose);
							$rootScope.log.verbose(`Content length: ${response.headers['content-length']} bytes`, $rootScope.log.levels.verbose);
							return;
						}

						let msg = null;
						if (response.statusCode === 401) {
							msg = "Not Authorized";
						}
						if (response.statusCode === 403) {
							msg = "Forbidden";
						}
						if (response.statusCode === 404) {
							msg = "Not found";
						}
						if (response.statusCode === 500) {
							msg = "Internal Server Error";
						}
						if (response.statusCode === 502) {
							msg = "Bad Gateway";
						}
						if (response.statusCode === 503) {
							msg = "Service Unavailable";
						}
						if (response.statusCode === 504) {
							msg = "Gateway Timeout";
						}
						if (msg === null) {
							msg = `Unexpected response (${response.statusCode})`;
						} else {
							msg = `${response.statusCode} ` + msg;
						}

						fetch_failed = true;
						return reject(`Error fetching update  (${msg})`);
					}).on('error', function (err) {
						fetch_failed = true;
						return reject(`fetch error: ${err.message}`);
					}).on('end', function () {
						// This event fires even after rejecting; and there's no apparent way to read the response code.
						if (fetch_failed) {
							return;
						}
						$rootScope.log.update("Successfully fetched update");
						return resolve();
					}).pipe(writeStream);
			} catch (e) {
				return reject(`Unknown error while fetching update: ${JSON.stringify(e)}`);
			}
		});
	};


	var applyUpdate = dir => new Promise(function (resolve, reject) {
		// app_update.asar -> app.asar

		if (!fileExists(path.resolve(path.join(dir, 'app_update.asar')))) {
			return reject("Aborting update (app_update.asar does not exist)");
		}


		$rootScope.log.important("Applying update (do not interrupt)");

		const stream_update = fs.createReadStream(path.resolve(path.join(dir, 'app_update.asar')));
		stream_update.on('error', function (err) {
			$rootScope.log.error("Error reading update");
			reject(`update read error: ${err.message}`);
			// .on(error) emits after creating the write stream below, which truncates `app.asar`
			$rootScope.log.fatal("Launcher corrupted!  Please reinstall");  //#TODO: backup app.asar
			require('electron').remote.app.quit();
		});

		const stream_asar = fs.createWriteStream(path.resolve(path.join(dir, 'app.asar')));
		stream_asar
			.on('error', function (err) {
				$rootScope.log.error("Error applying update");
				reject(`update write error: ${err.message}`);
				// creating the write stream truncates `app.asar`
				$rootScope.log.fatal("Launcher corrupted!  Please reinstall");  //#TODO: backup app.asar
				require('electron').remote.app.quit();

			}).on('finish', function () {
			$rootScope.log.update("Successfully applied update");
			return resolve();
		});

		return stream_update.pipe(stream_asar);
	});


	var cleanupUpdate = dir => new Promise(function (resolve, reject) {
		$rootScope.log.entry("Cleaning up post-update");
		fs.unlinkSync(path.resolve(path.join(dir, 'app_update.asar')));
		return resolve();
	});


	this.getChecksums = pathName => $q((resolve, reject) => $http.get(`${BASE_URL}/${pathName}/checksums`)
		.then(function (response) {
			const {
				data
			} = response;
			const checksums = [];

			const lines = data.split("\n");
			// Using .every allows us to "break" out by returning false
			lines.every(function (line) {
				if (line === '') {
					return;
				}

				line.trim();

				const hashIndex = line.lastIndexOf(' ');
				if (hashIndex < 0) {
					reject(`Checksum file invalid [CHECKSUMNOTFOUND]: ${line}`);
					return false;
				}

				const checksum = line.substring(hashIndex, line.length).trim();
				line = line.substring(0, hashIndex).trim();

				const sizeIndex = line.lastIndexOf(' ');
				if (sizeIndex < 0) {
					reject(`Checksum file invalid [SIZENOTFOUND]: ${line}`);
					return false;
				}

				const sizeStr = line.substring(sizeIndex, line.length).trim();
				const size = parseFloat(sizeStr.trim());
				line = line.substring(0, sizeIndex).trim();

				const relativePath = line.trim();

				return checksums.push(new Checksum(size, checksum, relativePath, `${BASE_URL}/${pathName}`));
			});

			return resolve(checksums);
		}).catch(response => // TODO: Consolidate this to one argument to be consist with how
			// other errors are reported
			reject(response)));

	this.getEula = () => $http.get(`${BASE_URL}/smeula.txt`);

	this.getVersions = branch => $q((resolve, reject) => $http.get(BRANCH_INDEXES[branch])
		.then(function (response) { // success
			const {
				data
			} = response;
			// Entry format:  2.0.8#20170712_222922 ./build/starmade-launcher-build_20170712_222922
			const versions = [];

			const lines = data.split('\n');
			lines.forEach(function (line) {
				if (line === '') {
					return;
				}                  // Skip blank     entries
				if (line.substring(0, 1) === '#') {
					return;
				}  // Skip commented entries

				const tokens = line.split(' ');
				const build_id = tokens[0].split('#');

				const buildVersion = build_id[0];
				const buildBuild = build_id[1];

				const buildPath = tokens[1];

				// ignore malformed entries:
				if (!buildPath || !buildVersion || !buildBuild) {
					return;
				}  // missing segments
				if (buildPath.indexOf('#') >= 0) {
					return;
				}                   // two entries on a line

				return versions.push(new Version(buildPath, buildVersion, buildBuild));
			});

			return resolve(uniqVersions(versions));
		}).catch(function (response) { // error
			$rootScope.log.error(`Error fetching ${branch} build index`);
			$rootScope.log.indent.debug(`URL:     ${response.config['url']}`);
			$rootScope.log.indent.debug(`Status:  ${response.status}`);
			$rootScope.log.indent.verbose(`Headers: ${JSON.stringify(response.headers)}`);

			return reject(response);
		}));

	var uniqVersions = function (versions) {
		const uniq = [];
		versions.forEach(function (version, index) {
			if (JSON.stringify(versions[index + 1]) === JSON.stringify(version)) {
				return;
			}
			return uniq.push(version);
		});
		return uniq;
	};


});