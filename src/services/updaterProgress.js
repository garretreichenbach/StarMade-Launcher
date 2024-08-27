/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.service('updaterProgress', function ($rootScope) {
	this.text = '';

	this.curValue = 0;
	this.maxValue = 100;

	this.filesDone = 0;
	this.filesCount = 0;

	this.inProgress = false;

	this.calculatePercentage = function () {
		return Math.round((this.curValue / this.maxValue) * 100.0);
	};

	this.toMegabytes = value => (value / 1024 / 1024).toFixed(1);

	this.updateText = function () {
		this.text = `Downloading files... ${this.filesDone}/${this.filesCount} (${this.toMegabytes(this.curValue)}MB/${this.toMegabytes(this.maxValue)} MB) [${this.calculatePercentage()}%]`;

		// Trick to get the progress bar to update quicker
		if (!$rootScope.$$phase) {
			return $rootScope.$digest();
		}
	};

});
