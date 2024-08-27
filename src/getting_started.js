'use strict';

const fs = require('fs');
const path = require('path');
const electron = require('electron');

const ipc = electron.ipcRenderer;
const {
	remote
} = electron;
const {
	shell
} = electron;

const pkg = require(path.join(path.dirname(__dirname), 'package.json'));
const util = require('./util');
const log = require('./log-helpers');

const {
	dialog
} = remote;
const electronApp = remote.app;


log.event("Beginning initial setup");

const {
	steamLaunch
} = remote.getCurrentWindow();

const close = document.getElementById('close');
const footerLinks = document.getElementById('footerLinks');
let currentStep = -1;


const step0 = document.getElementById('step0');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');
const updating = document.getElementById('updating');
const changelog = document.getElementById('changelog');


const showLicenses = function () {
	log.event("Showing licenses");
	close.style.display = 'none';
	step0.style.display = 'block';
	step1.style.display = 'none';
	step2.style.display = 'none';
	step3.style.display = 'none';
	step4.style.display = 'none';
	updating.style.display = 'none';
	changelog.style.display = 'none';
	return footerLinks.style.display = 'none';
};


const showUpdating = function () {
	step0.style.display = 'none';
	return updating.style.display = 'block';
};


const determineInstallDirectory = function () {
	// Try to automatically determine the correct install path
	log.event("Automatically determining install directory");

	// Get current working directory from the main process
	const cwd = ipc.sendSync('cwd');
	const cwd_array = cwd.toLowerCase().split(path.sep);
	const pos_steamapps = cwd_array.indexOf("steamapps");
	const pos_common = cwd_array.indexOf("common");
	const pos_starmade = cwd_array.indexOf("starmade");
	let suggested_path = "";

	// append a "StarMade" directory for the game to live in, then condense and clean
	suggested_path = path.resolve(path.normalize(path.join(cwd, "StarMade")));


	// Automatically use the suggested path for steam installs
	// (determine manually as greenworks.getCurrentGameInstallDir() is not yet implemented)


	// Does the path conform to Steam's standard directory structure?
	// The path should always include "SteamApps/common" somewhere
	let install_automatically = false;
	if ((pos_steamapps > 0) && (pos_steamapps < pos_common)) {
		// with "StarMade" following it
		if (pos_starmade === (pos_common + 1)) {
			// console.log("   | Correct steam path found")  ##~
			install_automatically = true;
		}
	}
	// Otherwise, Someone likely just renamed StarMade to something else, or moved it to a subfolder. (why? who knows.)


	installPath.value = path.resolve(suggested_path);


	if (!install_automatically) {
		log.indent.info(`Suggested path: ${suggested_path}`);
		return;
	}


// Automatically set the path and move onto the next step
	log.info("Installing automatically");
	localStorage.setItem('installDir', installPath.value);
	log.indent.entry(`Here: ${installPath.value}`);
	currentStep = 2;
	step1.style.display = 'none';
	step2.style.display = 'block';
	return log.event("Initial Setup: Step 2");
};


const acceptEula = function () {
	log.entry("Accepted EULA");

	localStorage.setItem('acceptedEula', true);
	close.style.display = 'inline';
	footerLinks.style.display = 'block';

	// console.log("   > currentStep switch")  ##~
	switch (currentStep) {
		case -1:
			return window.close();
		case 0:
		case 1:
			currentStep = 1;
			log.event("Initial Setup: Step 1");
			step0.style.display = 'none';
			step1.style.display = 'block';
			return determineInstallDirectory();
		case 2:
			log.event("Initial Setup: Step 2");
			step0.style.display = 'none';
			return step2.style.display = 'block';
		case 3:
			log.event("Initial Setup: Step 3");
			step0.style.display = 'none';
			return step3.style.display = 'block';
		case 4:
			log.event("Initial Setup: Step 4");
			step0.style.display = 'none';
			return step4.style.display = 'block';
	}
};


close.addEventListener('click', function () {
	log.end("User clicked the close button.");
	return remote.app.quit();
});

// console.log("[Root]")  ##~
// console.log(" | localStorage: #{JSON.stringify(localStorage)}")  ##~
if ((localStorage.getItem('gotStarted') == null) && (localStorage.getItem('acceptedEula') != null)) {
	// If the user has not finished the initial setup, restart it and present the EULA again.
	log.info("User did not finish previous setup. Restarting.");
	localStorage.removeItem('acceptedEula');
}
// This also prevents a race condition between a) showing the window and b) updating the install directory textbox
// -- The events required to solve this race condition [getCurrentWindow.on('show' / 'ready-to-show')] currently do not fire.


log.verbose(`Getting Started window.location.href: ${window.location.href}`);

if (localStorage.getItem('gotStarted') != null) {
	log.debug("Already got started");
	if (window.location.href.split('?')[1] === 'licenses') {
		showLicenses();
		remote.getCurrentWindow().show();
	} else if (window.location.href.split('?')[1] === 'steam') {
		currentStep = 4;
		step0.style.display = 'none';
		step4.style.display = 'block';
		footerLinks.style.display = 'block';
		log.event("Initial Setup: Step 4 (Steam)");
		remote.getCurrentWindow().show();
	} else if (window.location.href.split('?')[1] === 'updating') {
		showUpdating();
		ipc.send('updating-opened');
		remote.getCurrentWindow().show();
	} else {
		// Show changelog, if needed.
		if (localStorage.getItem("presented-changelog") === pkg.version) {
			log.debug("Already presented changelog");
			window.close();
			return;
		}

		log.event("Presenting changelog");
		step0.style.display = 'none';
		changelog.style.display = 'block';
		localStorage.setItem("presented-changelog", pkg.version);
		remote.getCurrentWindow().show();
	}
} else {
	// Fresh install; bypass changelog.
	log.debug("fresh install; bypassing changelog");
	log.indent.debug(`set version to ${pkg.version}`);
	localStorage.setItem("presented-changelog", pkg.version);


	currentStep = 0;
	log.event("Initial Setup: Step 0 (EULA)");
	if (localStorage.getItem('acceptedEula') != null) {
		acceptEula();
	}
	remote.getCurrentWindow().show();
}

util.setupExternalLinks();


//
// Step 0 (Licenses)
//


const licenses = document.getElementById('licenses');
const accept = document.getElementById('accept');
const acceptBg = document.getElementById('acceptBg');
const decline = document.getElementById('decline');
const declineBg = document.getElementById('declineBg');

fs.readFile(path.join(path.dirname(__dirname), 'static', 'licenses.txt'), function (err, data) {
	if (err) {
		log.warning('Unable to open licenses.txt');
		acceptEula();
	}

	return licenses.innerHTML = '\n\n\n' + data;
});

accept.addEventListener('mouseenter', () => acceptBg.className = 'hover');

accept.addEventListener('mouseleave', () => acceptBg.className = '');

accept.addEventListener('click', () => acceptEula());

decline.addEventListener('mouseenter', () => declineBg.className = 'hover');

decline.addEventListener('mouseleave', () => declineBg.className = '');

decline.addEventListener('click', () => remote.app.quit());

//
// Step 1 -- install directory
//

var installPath = document.getElementById('installPath');
const installBrowse = document.getElementById('installBrowse');
const installContinue = document.getElementById('installContinue');
const installContinueBg = document.getElementById('installContinueBg');


// default install dir
const default_install_path = localStorage.getItem('installDir') ||
	path.resolve(path.join(electronApp.getPath('userData'), '..'));
installPath.value = default_install_path;


if (process.platform === 'linux') {
	document.getElementById("linux_info").className = '';  // remove .hidden from linux_info
}

installContinue.addEventListener('mouseenter', () => installContinueBg.className = 'hover');

installContinue.addEventListener('mouseleave', () => installContinueBg.className = '');

installBrowse.addEventListener('click', () => dialog.showOpenDialog(remote.getCurrentWindow(), {
		title: 'Select Installation Directory',
		properties: ['openDirectory'],
		defaultPath: installPath.value
	}
	, function (newPath) {
		if (newPath == null) {
			return;
		}
		newPath = newPath[0];

		// Scenario: existing install
		if (fs.existsSync(path.join(newPath, "StarMade.jar"))) {
			// console.log "installBrowse(): Found StarMade.jar here:  #{path.join(newPath, "StarMade.jar")}"
			installPath.value = newPath;
			return;
		}

		// Scenario: StarMade/StarMade
		if ((path.basename(newPath.toLowerCase()) === "starmade") &&
			(path.basename(path.dirname(newPath.toLowerCase())) === "starmade")) {  // ridiculous, but functional
			// console.log "installBrowse(): Path ends in StarMade/StarMade  (path: #{newPath})"
			installPath.value = newPath;
			return;
		}

		// Default: append StarMade
		return installPath.value = path.join(newPath, 'StarMade');
	}));
// console.log "installBrowse(): installing to #{installPath.value}"


installContinue.addEventListener('click', function () {
	// Disallow blank install directories
	if (installPath.value.toString().trim() === '') {
		document.getElementById("blank_path").className = '';        // remove .hidden from blank_path
		return;
	} else {
		document.getElementById("blank_path").className = 'hidden';  // hide it again
	}


	currentStep = 2;
	localStorage.setItem('installDir', installPath.value);
	log.entry(`Install path: ${installPath.value}`);
	step1.style.display = 'none';
	step2.style.display = 'block';
	return log.event("Initial Setup: Step 2");
});


//
// Step 2
//

const next = document.getElementById('next');
next.addEventListener('click', function () {
	currentStep = 3;
	localStorage.setItem('gotStarted', true);
	step2.style.display = 'none';
	step3.style.display = 'block';
	return log.event("Initial Setup: Step 3");
});


//
// Step 3
//


const login = document.getElementById('login');
const loginBg = document.getElementById('loginBg');
const createAccount = document.getElementById('createAccount');
const createAccountBg = document.getElementById('createAccountBg');
const skip = document.getElementById('skip');
const skipBg = document.getElementById('skipBg');

login.addEventListener('mouseenter', () => loginBg.className = 'hover');

login.addEventListener('mouseleave', () => loginBg.className = '');

login.addEventListener('click', function () {
	localStorage.setItem('authGoto', 'uplink');
	return window.close();
});

createAccount.addEventListener('mouseenter', () => createAccountBg.className = 'hover');

createAccount.addEventListener('mouseleave', () => createAccountBg.className = '');

createAccount.addEventListener('click', function () {
	localStorage.setItem('authGoto', 'register');
	return window.close();
});

skip.addEventListener('mouseenter', () => skipBg.className = 'hover');

skip.addEventListener('mouseleave', () => skipBg.className = '');

skip.addEventListener('click', function () {
	localStorage.setItem('authGoto', 'guest');
	return window.close();
});


//
// Step 4
//


const link = document.getElementById('link');
const linkBg = document.getElementById('linkBg');
const skipOnce = document.getElementById('skipOnce');
const skipOnceBg = document.getElementById('skipOnceBg');
const skipAlways = document.getElementById('skipAlways');

link.addEventListener('mouseenter', () => linkBg.className = 'hover');

link.addEventListener('mouseleave', () => linkBg.className = '');

link.addEventListener('click', function () {
	// Steam linking takes place on the Registry website
	log.event("Opening external: https://registry.star-made.org/profile/steam_link");
	localStorage.setItem('steamLinked', 'linked');
	shell.openExternal('https://registry.star-made.org/profile/steam_link');
	return window.close();
});

skipOnce.addEventListener('mouseenter', () => skipOnceBg.className = 'hover');

skipOnce.addEventListener('mouseleave', () => skipOnceBg.className = '');

skipOnce.addEventListener('click', function () {
	log.entry("Steam Link: Skipping");
	return window.close();
});

skipAlways.addEventListener('click', function () {
	log.entry("Steam Link: Permanently ignoring");
	localStorage.setItem('steamLinked', 'ignored');
	return window.close();
});

//
// Changelog
//


const closeChangelog = document.getElementById('closeChangelog');

closeChangelog.addEventListener('mouseenter', () => closeChangelogBg.className = 'hover');

closeChangelog.addEventListener('mouseleave', () => closeChangelogBg.className = '');

closeChangelog.addEventListener('click', () => // ipc.send("changelog-close")
	window.close());


//
// Footer links
//

const licensesLink = document.getElementById('licensesLink');

licensesLink.addEventListener('click', () => showLicenses());
