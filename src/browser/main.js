(function () {
	'use strict';
	let BrowserWindow, OSX_HEIGHT_OFFSET, _cwd, _pos_asar, app, argv, authFinished, authWindow, cache_path, dialog,
		electron, gettingStartedWindow, ipc, launcherUpdating, loadFailure, log, log_level, mainWindow,
		openGettingStartedWindow, openMainWindow, path, quitting, shell, staticDir, updatingWindow;

	argv = (process.argv.slice(1));

	path = require('path');
	argv.debugging = true;
	argv.verbose = true;


	process.argv.slice(1).forEach(function (arg, index) {
		if (arg === '-archive') {
			argv.archive = true;
		}
		if (arg === '-dev') {
			argv.dev = true;
		}
		if (arg === '-latest') {
			argv.latest = true;
		}
		if (arg === '-nogui') {
			argv.nogui = true;
		}
		if (arg === '-pre') {
			argv.pre = true;
		}
		if (arg === '-release') {
			argv.release = true;
		}
		if (arg === '-help') {
			argv.help = true;
		}
		if (arg === '-debugging') {
			argv.debugging = true;
		}
		if (arg === '-verbose') {
			argv.debugging = true;
			return argv.verbose = true;
		}
	});

	global.argv = argv;

	global.version = require(path.join(__dirname, '..', '..', 'package.json')).version;

	// global.buildHash = require('../buildHash.js').buildHash;
	global.buildHash = '4882c5e';
	global.qa = false;

	if (argv.help != null) {
		console.log(("StarMade Launcher v" + global.version + " build " + global.buildHash) + (global.qa ? " (QA)" : "") + "\n");
		console.log("");
		console.log("Launcher options:");
		console.log(" --noupdate          Skip the autoupdate process");
		console.log(" --steam             Run in Steam mode             (implies attach, noupdate)");
		console.log(" --attach            Attach  to  the game process  (close when the game closes)");
		console.log(" --detach            Detach from the game process  (default; supercedes attach)");
		console.log("");
		console.log("Logging options:");
		console.log(" --debugging         Increase log-level to include debug entries");
		console.log(" --verbose           Increase log-level to include everything");
		console.log(" --capture-game-log  Capture the game's output (for troubleshooting; implies attach)");
		console.log("");
		console.log("Advanced options:");
		console.log(" --nogui             Immediately update to the newest game version");
		console.log(" --cache-dir=\"path\"  Specify a custom cache path");
		process.exit(0);
	}

	electron = require('electron');

	// rimraf = require('rimraf');

	log = require('../log.js');

	app = electron.app;

	BrowserWindow = electron.BrowserWindow;

	dialog = electron.dialog;

	ipc = electron.ipcMain;

	shell = electron.shell;

	OSX_HEIGHT_OFFSET = 21;


	/* Update working directory */

	_cwd = __dirname.split(path.sep);

	_pos_asar = __dirname.toLowerCase().split(path.sep).indexOf("app.asar");

	_cwd = _cwd.slice(0, _pos_asar + 1).join(path.sep);

	_cwd = path.resolve(path.normalize(path.join(_cwd, "..", "..")));

	if (process.platform === 'darwin') {
		_cwd = path.join(_cwd, "MacOS");
	}

	process.chdir(_cwd);

	/* End */


	/* Update Electron's cache location */

	if (process.platform === "darwin") {
		cache_path = path.resolve(path.join(app.getPath('appData'), 'StarMade', 'Launcher'));
	} else {
		cache_path = path.resolve(path.join(".", ".cache"));
	}

	if (argv['cache-dir'] != null) {
		cache_path = path.join(path.resolve(argv['install-dir']), 'StarMade', 'Launcher');
	}

	app.setPath("appData", cache_path);

	app.setPath("userData", path.join(cache_path, 'userData'));

	if (argv.verbose != null) {
		console.log("Set appData  cache path to: " + cache_path);
		console.log("Set userData cache path to: " + (path.join(cache_path, 'userData')));
	}


	/* End */


	/* Logging */

	log_level = log.levels.normal;

	if (argv["capture-game-log"]) {
		log_level = log.levels.game;
	}

	if (argv.debugging) {
		log_level = log.levels.debug;
	}

	if (argv.verbose) {
		log_level = log.levels.verbose;
	}

	log.set_level(log_level);

	ipc.on('log-entry', (function (_this) {
		return function (event, msg, level) {
			log.entry(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-info', (function (_this) {
		return function (event, msg, level) {
			log.info(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-event', (function (_this) {
		return function (event, msg, level) {
			log.event(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-game', (function (_this) {
		return function (event, msg, level) {
			log.game(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-warning', (function (_this) {
		return function (event, msg, level) {
			log.warning(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-error', (function (_this) {
		return function (event, msg, level) {
			log.error(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-fatal', (function (_this) {
		return function (event, msg, level) {
			log.fatal(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-debug', (function (_this) {
		return function (event, msg, level) {
			log.debug(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-verbose', (function (_this) {
		return function (event, msg, level) {
			log.verbose(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-important', (function (_this) {
		return function (event, msg, level) {
			log.important(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-update', (function (_this) {
		return function (event, msg, level) {
			log.update(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-end', (function (_this) {
		return function (event, msg, level) {
			log.end(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-raw', (function (_this) {
		return function (event, msg, level) {
			log.raw(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent', (function (_this) {
		return function (event, num, level) {
			log.indent(num, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-outdent', (function (_this) {
		return function (event, num, level) {
			log.outdent(num, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-entry', (function (_this) {
		return function (event, msg, level) {
			log.indent.entry(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-info', (function (_this) {
		return function (event, msg, level) {
			log.indent.info(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-event', (function (_this) {
		return function (event, msg, level) {
			log.indent.event(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-game', (function (_this) {
		return function (event, msg, level) {
			log.indent.game(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-warning', (function (_this) {
		return function (event, msg, level) {
			log.indent.warning(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-error', (function (_this) {
		return function (event, msg, level) {
			log.indent.error(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-fatal', (function (_this) {
		return function (event, msg, level) {
			log.indent.fatal(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-debug', (function (_this) {
		return function (event, msg, level) {
			log.indent.debug(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-verbose', (function (_this) {
		return function (event, msg, level) {
			log.indent.verbose(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-important', (function (_this) {
		return function (event, msg, level) {
			log.indent.important(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-update', (function (_this) {
		return function (event, msg, level) {
			log.indent.update(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-end', (function (_this) {
		return function (event, msg, level) {
			log.indent.end(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-indent-raw', (function (_this) {
		return function (event, msg, level) {
			log.indent.raw(msg, level);
			return event.returnValue = true;
		};
	})(this));

	ipc.on('log-levels', (function (_this) {
		return function (event) {
			return event.returnValue = log.levels;
		};
	})(this));

	ipc.on('cwd', (function (_this) {
		return function (event, arg) {
			return event.returnValue = process.cwd();
		};
	})(this));

	staticDir = path.join(path.dirname(path.dirname(__dirname)), 'static');

	gettingStartedWindow = null;

	authWindow = null;

	mainWindow = null;

	updatingWindow = null;

	authFinished = false;

	quitting = false;

	launcherUpdating = false;

	app.commandLine.appendSwitch('disable-http-cache');

	openMainWindow = function () {
		var height;
		if (launcherUpdating) {
			return;
		}
		if (quitting) {
			return;
		}
		height = 550;
		if (process.platform === 'darwin') {
			height -= OSX_HEIGHT_OFFSET;
		}
		mainWindow = new BrowserWindow({
			frame: false,
			resizable: false,
			show: false,
			width: 800,
			height: height
		});
		mainWindow.loadURL("file://" + staticDir + "/index.html");
		log.verbose("Opened Window: Main");
		if (argv.development) {
			mainWindow.openDevTools();
		}
		return mainWindow.on('closed', function () {
			return mainWindow = null;
		});
	};

	openGettingStartedWindow = function (args) {
		var height;
		if (quitting) {
			return;
		}
		height = 504;
		if (process.platform === 'darwin') {
			height -= OSX_HEIGHT_OFFSET;
		}
		gettingStartedWindow = new BrowserWindow({
			frame: false,
			resizable: false,
			show: false,
			width: 650,
			height: height
		});
		gettingStartedWindow.steamLaunch = !!argv.steam;
		if (args != null) gettingStartedWindow.loadURL("file://" + staticDir + "/getting_started.html?" + args);
		else gettingStartedWindow.loadURL("file://" + staticDir + "/getting_started.html");
		if (argv.development) {
			gettingStartedWindow.openDevTools();
		}

		gettingStartedWindow.on('close', function () {
			if (authWindow != null) {

			} else if (mainWindow != null) {
				return mainWindow.show();
			} else {
				log.verbose("Finished Initial Setup");
				return openMainWindow();
			}
		});

		return gettingStartedWindow.on('closed', function () {
			return gettingStartedWindow = null;
		});
	};

	app.on('window-all-closed', function () {
		log.end("All windows closed.  Exiting.");
		return app.quit();
	});

	loadFailure = setTimeout(function () {
		log.fatal("App failed to load");
		log.end("Exiting");
		return process.exit(1);
	}, 6000);

	app.on('ready', function () {
		log.event("App ready", log.levels.verbose);
		clearTimeout(loadFailure);
		return openGettingStartedWindow();//.show(); If I don't call this, nothing ever appears... but then the UI breaks?
	});

	app.on('before-quit', function () {
		log.end("Exiting");
		return quitting = true;
	});

	ipc.on('open-changelog', function () {
		log.event("Opening changelog");
		return openGettingStartedWindow();
	});

	ipc.on('open-licenses', function () {
		openGettingStartedWindow('licenses');
		return log.verbose("Opened Window: Licenses");
	});

	ipc.on('open-updating', function () {
		var launcher_updating;
		launcher_updating = true;
		openGettingStartedWindow('updating');
		return log.verbose("Opened Window: Update");
	});

	ipc.on('updating-opened', function () {
		if (!!mainWindow) {
			mainWindow.hide();
		}
		if (!!authWindow) {
			authWindow.hide();
		}
		return mainWindow.webContents.send('updating-opened');
	});

	ipc.on('close-updating', function () {
		gettingStartedWindow.close();
		launcherUpdating = false;
		return log.verbose("Closed Window: Update");
	});

	ipc.on('start-auth', function () {
		var height;
		if (launcherUpdating) {
			return;
		}
		height = 404;
		if (process.platform === 'darwin') {
			height -= OSX_HEIGHT_OFFSET;
		}
		authWindow = new BrowserWindow({
			frame: false,
			resizable: false,
			width: 255,
			height: height
		});
		mainWindow.hide();
		authWindow.loadURL("file://" + staticDir + "/auth.html");
		log.verbose("Opened Window: Auth");
		if (argv.development) {
			authWindow.openDevTools();
		}
		return authWindow.on('closed', function () {
			authWindow = null;
			if ((mainWindow != null) && !mainWindow.isVisible() && !authFinished) {
				return mainWindow.close();
			}
		});
	});

	ipc.on('finish-auth', function (event, args) {
		authFinished = true;
		log.verbose("Finished Auth");
		if (authWindow != null) {
			authWindow.close();
		} else {
			log.warning('finish-auth was triggered when authWindow is null!');
		}
		return mainWindow.webContents.send('finish-auth', args);
	});

	ipc.on('start-steam-link', function () {
		openGettingStartedWindow('steam');
		return log.verbose("Opened Window: Steam Link");
	});
}).call(this);
