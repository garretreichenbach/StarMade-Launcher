/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

exports.setupExternalLinks = function () {
	const {
		shell
	} = require('electron');

	const externalLinks = document.getElementsByClassName('external');

	return Array.prototype.forEach.call(externalLinks, link => link.addEventListener('click', function (event) {
		event.preventDefault();

		return shell.openExternal(this.href);
	}));
};

exports.parseBoolean = function (str) {
	if (str === 'true') {
		return true;
	} else {
		return false;
	}
};

exports.getJreDirectory = function (javaVersion, platform) {
	if (platform == null) {
		({
			platform
		} = process);
	}
	let jreDirectory = `jre${javaVersion}`;
	if (platform === 'darwin') {
		return jreDirectory += '.jre/Contents/Home';
	} else {
		return jreDirectory;
	}
};