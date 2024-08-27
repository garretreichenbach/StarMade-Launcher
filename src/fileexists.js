/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const fs = require('fs');
const path = require('path');

const fileExists = function (fullpath) {
	// since Node changes the fs.exists() functions with every version
	try {
		let needle;
		fullpath = path.resolve(fullpath);
		if ((needle = path.basename(fullpath), Array.from(fs.readdirSync(path.dirname(fullpath))).includes(needle))) {
			return true;
		}
		return false;
	} catch (e) {
		return false;
	}
};

module.exports = {
	fileExists
};