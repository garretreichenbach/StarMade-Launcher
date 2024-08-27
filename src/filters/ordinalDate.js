/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const app = angular.module('launcher');

app.filter('ordinalDate', $filter => (function (input) {
	const year = $filter('date')(new Date(input), 'yyyy');
	const month = $filter('date')(new Date(input), 'MMM');
	const day = new Date(input).getDate();

	const ordinals = ['th', 'st', 'nd', 'rd'];
	const ordinal = (ordinals[(day - 20) % 10] || ordinals[day] || ordinals[0]);

	return `${month} ${day}${ordinal} ${year}`;
}));
