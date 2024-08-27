'use strict';

const path = require('path');
const BigNumber = require('bignumber.js');
const greenworks = require(path.resolve(path.join('dep', 'greenworks', 'greenworks.js')));

const STEAM64_32_DIFFERENCE = '76561197960265728';


exports.initialized = false;

exports.init = function () {
	// Initialize with Steam. Since Steam is optional, we will just return if this fails.
	if (!greenworks.initAPI()) {
		return;
	}

	return exports.initialized = true;
};

exports.greenworks = greenworks;

exports.steamId = () => new BigNumber(greenworks.getSteamId().accountId).plus(STEAM64_32_DIFFERENCE);
