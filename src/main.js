'use strict';

const os = require('os');
const path = require('path');
const electron = require('electron');
const {
    spawn
} = require('child_process');

const ipc = electron.ipcRenderer;
const {
    shell
} = electron;
const {
    remote
} = electron;
const electronApp = remote.app;

let {
    buildHash
} = require('../buildHash.js');
const util = require('./util');

const pkg = require(path.join(path.dirname(__dirname), 'package.json'));

const angular = require('angular');

const app = angular.module('launcher', [
    require('angular-moment'),
    require('angular-resource'),
    require('angular-ui-router'),
    'xml'
]);


// Catch unhandled errors
angular.module('app', []).config($provide => $provide.decorator("$exceptionHandler", ($delegate, $injector) => (function (exception, cause) {
    const $rootScope = $injector.get("$rootScope");

    $rootScope.log.error("Uncaught Error");
    $rootScope.log.indent.debug(`exception: ${exception}`);
    $rootScope.log.indent.debug(`cause:     ${cause}`);

    let msgs = ["unknown"];
    if (exception != null) {
        msgs = [exception];
    }
    if (exception.message != null) {
        msgs = [exception.message];
    }
    if ((typeof exception !== 'string') && (Object.keys(exception).length > 0)) {
        msgs = [];
        for (var key of Array.from(Object.keys(exception))) {
            msgs.push(`${key}: ${exception[key]}`);
        }
    }
    for (var msg of Array.from(msgs)) {
        $rootScope.log.indent.entry(msg);
    }
    $rootScope.log.outdent();

    return $delegate(exception, cause);
})));


app.config(function ($httpProvider, $stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');

    $stateProvider
        .state('authToken', {
            url: '/access_token=:response',
            controller: 'AuthTokenCtrl'
        }).state('news', {
        controller: 'NewsCtrl',
        templateUrl: 'templates/news.html'
    }).state('community',
        {templateUrl: 'templates/community.html'})
        .state('council', {
            controller: 'CouncilCtrl',
            templateUrl: 'templates/council.html'
        }).state('player', {
        controller: 'PlayerCtrl',
        templateUrl: 'templates/player.html'
    }).state('support',
        {templateUrl: 'templates/support.html'})
        .state('update', {
                controller: 'UpdateCtrl',
                templateUrl: 'templates/update.html'
            }
        );

    $httpProvider.interceptors.push('xmlHttpInterceptor');
    return $httpProvider.interceptors.push('tokenInterceptor');
});

app.run(function ($q, $rootScope, $state, $timeout, accessToken, api, refreshToken, updater) {
    const argv = remote.getGlobal('argv');
    const rememberMe = util.parseBoolean(localStorage.getItem('rememberMe'));

    // Quality Assurance build?  (enables debugging)
    const qa = remote.getGlobal('qa');
    // Launcher version info
    const version = remote.getGlobal('version');
    buildHash = remote.getGlobal('buildHash');

    $rootScope.log = require('./log-helpers');  // Logging helpers
    $rootScope.version = version;
    $rootScope.buildHash = buildHash;
    $rootScope.steamLaunch = !!argv.steam;                                    //#TODO: change to just `steam`
    $rootScope.attach = !!argv.attach || !!argv['capture-game-log'];  // attach the game process; default behavior with   --steam
    $rootScope.detach = !!argv.detach;                                   // detach the game process; default behavior witout --steam
    $rootScope.noUpdate = !!argv.noupdate || $rootScope.steamLaunch;
    $rootScope.noBackup = !!argv.nobackup;
    $rootScope.debugging = !!argv.debugging || !!argv.verbose || qa;
    $rootScope.verbose = !!argv.verbose;
    $rootScope.captureGame = !!argv['capture-game-log'];


    $rootScope.log.raw(`StarMade Launcher v${version} build ${buildHash}` + (qa ? " (QA)" : "") + "\n");

    $rootScope.log.info("Platform");
    $rootScope.log.indent();
    $rootScope.log.entry(`OS:  ${process.platform} (${os.arch()})`);
    //#TODO: add java 32/64 info here
    $rootScope.log.entry(`RAM: ${Math.floor(os.totalmem() / 1024 / 1024)}mb`);
    $rootScope.log.entry(`CWD: ${ipc.sendSync('cwd')}`);
    $rootScope.log.outdent();

    $rootScope.log.info("Launcher flags:");
    $rootScope.log.indent();
    let _flags = [];
    for (var arg of Array.from(Object.keys(argv).slice(1))) {
        _flags.push(`--${arg}`);
    }
    _flags = _flags.join(" ");
    $rootScope.log.entry(_flags || "(None)");
    $rootScope.log.outdent();

    $rootScope.log.info("Mode:");
    $rootScope.log.indent();
    if ($rootScope.debugging) {
        $rootScope.log.entry("Debugging: enabled" + ($rootScope.verbose ? " (verbose)" : ""));
    }
    $rootScope.log.entry(`Steam:     ${$rootScope.steamLaunch}`);
    // attach with --steam or --attach; --detach overrides
    $rootScope.log.entry(`Attach:    ${($rootScope.steamLaunch || $rootScope.attach) && !$rootScope.detach}`);  //#TODO: migrate to using this in launch.coffee
    $rootScope.log.entry(`Capture:   ${$rootScope.captureGame}`);
    $rootScope.log.outdent();


    // Prevent multiple executions, optionally within a specified cooldown
    $rootScope.alreadyExecuted = function (id, cooldown) {
        // Forgive me for my sins... they just keep things so clean!
        if (cooldown == null) {
            cooldown = 0;
        }
        if (!$rootScope.alreadyExecuted.ids) {
            $rootScope.alreadyExecuted.ids = {};
        }
        if (cooldown > 0) {
            cooldown += Date.now();
        }

        const expiry = $rootScope.alreadyExecuted.ids[id];

        if ((expiry == null)) {
            // Not executed yet.
            $rootScope.alreadyExecuted.ids[id] = cooldown;
            return false;
        }

        // Already executed?
        if (expiry <= 0) {
            return true;
        }           // <1: only execute once
        if (expiry >= Date.now()) {
            return true;
        }  // still within cooldown

        // Yes, but out of cooldown.  Refresh ~
        $rootScope.alreadyExecuted.ids[id] = cooldown;
        return false;
    };

    $rootScope.showChangelog = function () {
        $rootScope.log.debug("showChangelog()");
        localStorage.removeItem("presented-changelog");
        return ipc.send("open-changelog");
    };

    $rootScope.openDownloadPage = function () {
        $rootScope.log.event("Opening download page: http://star-made.org/download");
        return shell.openExternal('http://star-made.org/download');
    };

    $rootScope.openLicenses = function () {
        $rootScope.log.event("Displaying licenses");
        return ipc.send('open-licenses');
    };

    $rootScope.openSteamLink = function () {
        $rootScope.log.event("opening: https://registry.star-made.org/profile/steam_link");
        return shell.openExternal('https://registry.star-made.org/profile/steam_link');
    };

    $rootScope.startAuth = function () {
        $rootScope.log.event("Displaying auth");
        $rootScope.currentUser = null;
        accessToken.delete();
        refreshToken.delete();
        return ipc.send('start-auth');
    };

    $rootScope.switchUser = function () {
        $rootScope.launcherOptionsWindow = false;
        $rootScope.log.event("Switching user");
        return $rootScope.startAuth();
    };


    var getCurrentUser = () => api.getCurrentUser()
        .then(function (response) {
            $rootScope.currentUser = response.data.user;
            $rootScope.playerName = $rootScope.currentUser.username;
            $rootScope.log.info("Using saved credentials");
            $rootScope.log.entry(`Username: ${$rootScope.playerName}`);
            if ($rootScope.steamLaunch && (localStorage.getItem('steamLinked') == null)) {
                return ipc.send('start-steam-link');
            } else {
                return remote.getCurrentWindow().show();
            }
        }).catch(function (response) {
            if (response.status === 401) {
                $rootScope.log.info("Using saved credentials");
                $rootScope.log.event("Requesting auth token");
                return refreshToken.refresh()
                    .then(function (rresponse) {
                            accessToken.set(response.data.access_token);
                            refreshToken.set(response.data.refresh_token);

                            // Try again
                            return getCurrentUser();
                        }
                        , function () {
                            accessToken.delete();
                            refreshToken.delete();
                            return $rootScope.startAuth();
                        });
            } else {
                return $rootScope.startAuth();
            }
        });


    const launcherAutoupdate = function () {
        // Check for updates to the launcher
        $rootScope.launcherUpdating = true;
        return updater.getVersions('launcher')
            .then(function (versions) {
                if (versions[0].version !== pkg.version) {
                    $rootScope.log.update('Updating launcher...');

                    const launcherDir = ipc.sendSync('cwd');  // Fetch launcher dir from main process
                    let launcherExec = null;
                    let launcherAsar = null;
                    if (process.platform === 'darwin') {
                        launcherAsar = path.join(launcherDir, '..', 'Resources');
                        launcherExec = path.join(launcherDir, 'Electron');
                    } else {
                        launcherAsar = path.join(launcherDir, 'resources');
                        launcherExec = path.join(launcherDir, 'starmade-launcher');
                        if (process.platform === 'win32') {
                            launcherExec += '.exe';
                        }
                    }


                    ipc.send('open-updating');
                    return ipc.once('updating-opened', () => updater.updateLauncher(versions[0], launcherDir)
                        .then(function () {
                                $rootScope.log.entry("Launcher updated!");
                                $rootScope.log.end("Restarting");
                                $rootScope.log.indent.verbose(`launcher exec path: ${launcherExec}`);

                                ipc.send('close-updating');
                                $rootScope.launcherUpdating = false;
                                const child = spawn(launcherExec, [],
                                    {detached: true});
                                return electronApp.quit();
                            }


                            , function (err) {
                                $rootScope.log.error('Launcher update failed!');
                                $rootScope.log.indent.entry(err);

                                // remote.showErrorBox('Launcher update failed', 'The launcher failed to update.')

                                ipc.send('close-updating');
                                $rootScope.launcherUpdating = false;
                                return $rootScope.startAuth();
                            }));
                } else {
                    // Delay for a second to workaround RawChannel errors
                    return $timeout(() => $rootScope.launcherUpdating = false
                        , 1000);
                }
            });
    };


    ipc.on('finish-auth', (event, args) => $rootScope.$apply(function (scope) {
        if (args.playerName != null) {
            scope.playerName = args.playerName;
            localStorage.setItem('playerName', scope.playerName);
            return remote.getCurrentWindow().show();
        } else {
            accessToken.set(args.access_token);
            refreshToken.set(args.refresh_token);
            return api.getCurrentUser()
                .then(function (response) {
                    const {
                        data
                    } = response;
                    scope.currentUser = data.user;
                    scope.playerName = scope.currentUser.username;
                    localStorage.setItem('playerName', scope.playerName);

                    if (data.user.steam_link != null) {
                        scope.steamAccountLinked = true;
                    }

                    // if $rootScope.steamLaunch && !data.user.steam_link? && steam.initialized && !localStorage.getItem('steamLinked')?
                    if ($rootScope.steamLaunch && (localStorage.getItem('steamLinked') == null)) {
                        return ipc.send('start-steam-link');
                        // steamId = steam.steamId().toString()
                        // api.get "profiles/steam_links/#{steamId}"
                        //   .success ->
                        //     # Current Steam account is already linked
                        //     remote.getCurrentWindow().show()
                        //   .error (data, status) ->
                        //     if status == 404
                        //       # Steam account not linked
                        //       ipc.send 'start-steam-link'
                        //     else
                        //       $rootScope.log.warning "Unable to determine status of Steam account: #{steamId}"
                        //       remote.getCurrentWindow().show()
                    } else {
                        return remote.getCurrentWindow().show();
                    }
                });
        }
    }));

    $rootScope.$on('$locationChangeStart', function () {
        // Remove authentication information unless we are told to remember it
        if (!rememberMe) {
            accessToken.delete();
            return refreshToken.delete();
        }
    });

    $rootScope.nogui = argv.nogui;

    if (!argv.nogui) {
        if (!$rootScope.noUpdate) {
            launcherAutoupdate();
        }
        if (api.isAuthenticated()) {
            if (!rememberMe || (refreshToken == null)) {
                $rootScope.startAuth();
            } else {
                getCurrentUser();
            }
        } else {
            $rootScope.startAuth();
        }
    }
    return $state.go('news');
});


// Controllers
require('./controllers/citizenBroadcast');
require('./controllers/council');
require('./controllers/launch');
require('./controllers/news');
require('./controllers/update');

// Directives
require('./directives/closeButton');
require('./directives/externalLink');
require('./directives/faqEntry');
require('./directives/minimizeButton');
require('./directives/newsBody');
require('./directives/popup');
require('./directives/progressBar');

// Filters
require('./filters/ordinalDate');

// Services
require('./services/Checksum');
require('./services/NewsSidebarEntry');
require('./services/Version');
require('./services/accessToken');
require('./services/api');
require('./services/refreshToken');
require('./services/tokenInterceptor');
require('./services/updater');
require('./services/updaterProgress');
require('./services/citizenBroadcast');
