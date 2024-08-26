/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const {
  remote
} = require('electron');
const sanitize = require('sanitize-filename');
const archiver = require('archiver');  // compression

const {
  dialog
} = remote;
const electronApp = remote.app;

const {
  fileExists
} = require('../fileexists');


const app = angular.module('launcher');


// Catch unhandled errors
angular.module('app', []).config($provide => $provide.decorator("$exceptionHandler", ($delegate, $injector) => (function(exception, cause) {
  const $rootScope = $injector.get("$rootScope");

  $rootScope.log.error("Uncaught Error");
  $rootScope.log.indent.debug(`exception: ${exception}`);
  $rootScope.log.indent.debug(`cause:     ${cause}`);

  let msgs = ["unknown"];
  if (exception != null) { msgs = [exception]; }
  if (exception.message != null) { msgs = [exception.message]; }
  if ((typeof exception !== 'string')  &&  (Object.keys(exception).length > 0)) {
    msgs = [];
    for (var key of Array.from(Object.keys(exception))) { msgs.push(`${key}: ${exception[key]}`); }
  }
  for (var msg of Array.from(msgs)) { $rootScope.log.indent.entry(msg); }
  $rootScope.log.outdent();

  return $delegate(exception, cause);
})));




app.controller('UpdateCtrl', function($filter, $rootScope, $scope, $q, $timeout, updater, updaterProgress) {
  const argv = remote.getGlobal('argv');

  $scope.versions = [];
  $scope.updaterProgress = updaterProgress;
  $scope.status = '';

  $scope.onPlayTab = true;
  $scope.onDedicatedTab = false;
  $scope.updateHover = false;
  $scope.launchHover = false;

  $scope.popupData = {};


  const strToBool = function(str) {
    if (str === "true") { return true; }
    if (str === "false") { return false; }
    return null;
  };

  $scope.backupOptions = {};
  // localStorage values are always strings, hence strToBool() for the checkboxes
  $scope.backupOptions.configs         = strToBool(localStorage.getItem('backupConfigs'));
  $scope.backupOptions.worlds          = strToBool(localStorage.getItem('backupWorlds'));
  $scope.backupOptions.blueprints      = strToBool(localStorage.getItem('backupBlueprints'));
  $scope.backupOptions.compressionType =           localStorage.getItem('backupCompressionType');
  // Set Defaults   (as unset values are falsey, || won't work)
  if ($scope.backupOptions.configs    === null) { $scope.backupOptions.configs    = true; }
  if ($scope.backupOptions.worlds     === null) { $scope.backupOptions.worlds     = true; }
  if ($scope.backupOptions.blueprints === null) { $scope.backupOptions.blueprints = true; }
  if ($scope.backupOptions.blueprints === null) { $scope.backupOptions.blueprints = true; }
  if (!['zip', 'targz'].includes($scope.backupOptions.compressionType)) {  // invalid & `null` cases
    if (os.platform() === "win32") {
      localStorage.setItem('backupCompressionType', 'zip');
      $scope.backupOptions.compressionType = 'zip';
    } else {
      localStorage.setItem('backupCompressionType', 'targz');
      $scope.backupOptions.compressionType = 'targz';
    }
  }



  $rootScope.log.info("Backup options:",  $rootScope.log.levels.verbose);
  $rootScope.log.indent.entry(`configs:         ${$scope.backupOptions.configs}`,         $rootScope.log.levels.verbose);
  $rootScope.log.indent.entry(`worlds:          ${$scope.backupOptions.worlds}`,          $rootScope.log.levels.verbose);
  $rootScope.log.indent.entry(`blueprints:      ${$scope.backupOptions.blueprints}`,      $rootScope.log.levels.verbose);
  $rootScope.log.indent.entry(`compressionType: ${$scope.backupOptions.compressionType}`, $rootScope.log.levels.verbose);



  $scope.backupDialog           = {};
  $scope.backupDialog.error     = {};
  $scope.backupDialog.skipped   = false;
  $scope.backupDialog.progress  = {};


  // Save backup options for subsequent sessions
  $scope.$watch('backupOptions.configs', function(newVal) {
    localStorage.setItem('backupConfigs', newVal);
    return $timeout(() => $rootScope.log.verbose(`Set backupConfigs    to ${newVal} (localStorage reread: ${localStorage.getItem('backupConfigs')})`));
  });

  $scope.$watch('backupOptions.worlds', function(newVal) {
    localStorage.setItem('backupWorlds', newVal);
    return $timeout(() => $rootScope.log.verbose(`Set backupWorlds     to ${newVal} (localStorage reread: ${localStorage.getItem('backupWorlds')})`));
  });

  $scope.$watch('backupOptions.blueprints', function(newVal) {
    localStorage.setItem('backupBlueprints', newVal);
    return $timeout(() => $rootScope.log.verbose(`Set backupBlueprints to ${newVal} (localStorage reread: ${localStorage.getItem('backupBlueprints')})`));
  });



  $scope.showPlayTab = function() {
    $scope.onPlayTab = true;
    return $scope.onDedicatedTab = false;
  };

  $scope.showDedicatedTab = function() {
    $scope.onDedicatedTab = true;
    return $scope.onPlayTab = false;
  };

  $scope.updateMouseEnter = () => $scope.updateHover = true;

  $scope.updateMouseLeave = () => $scope.updateHover = false;

  $scope.launchMouseEnter = () => $scope.launchHover = true;

  $scope.launchMouseLeave = () => $scope.launchHover = false;

  $scope.openOptions = function(name) {
    switch (name) {
      case 'buildType':
        $scope.buildTypeOptions = true;
        $scope.popupData.branch = $scope.branch;
        return $scope.popupData.installDir = path.resolve( $scope.installDir );
      case 'buildVersion':
        return $scope.buildVersionOptions = true;
    }
  };

  $scope.closeOptions = function(name) {
    switch (name) {
      case 'buildType':
        return $scope.buildTypeOptions = false;
      case 'buildVersion':
        return $scope.buildVersionOptions = false;
    }
  };


  $scope.browseInstallDir = () => dialog.showOpenDialog(remote.getCurrentWindow(), {
    title: 'Select Installation Directory',
    properties: ['openDirectory']
  }
  , function(newPath) {
    if (newPath == null) { return; }
    newPath = path.resolve(newPath[0]);

    // Scenario: existing install
    if (fs.existsSync( path.join(newPath, "StarMade.jar") )) {
      // console.log "installBrowse(): Found StarMade.jar here:  #{path.join(newPath, "StarMade.jar")}"
      $scope.popupData.installDir = newPath;
      return;
    }

    // Scenario: StarMade/StarMade
    if ((path.basename(             newPath.toLowerCase())  === "starmade") &&
        (path.basename(path.dirname(newPath.toLowerCase())) === "starmade") ) {  // ridiculous, but functional
      // console.log "installBrowse(): Path ends in StarMade/StarMade  (path: #{newPath})"
      $scope.popupData.installDir = newPath;
      return;
    }

    // Default: append StarMade
    return $scope.popupData.installDir = path.join(newPath, 'StarMade');
  });


  $scope.popupBuildTypeSave = function() {
    if ($scope.popupData.installDir.trim() === "") {
      $scope.popupData.installDir_error = "Install path cannot be blank.";
      return;
    }

    $scope.popupData.installDir_error = "";

    if (($scope.branch === $scope.popupData.branch) && ($scope.installDir !== $scope.popupData.installDir)) {
      // Scan the new install directroy
      $scope.status_updateWarning = "";  // Remove the warning, if present
      //#TODO make this actually read the installed version from the new directory
      updater.update($scope.versions[$scope.selectedVersion], sanitizePath($scope.popupData.installDir), true);
    }


    $rootScope.log.debug("Sanitizing path");
    $rootScope.log.indent.entry(`From: ${$scope.popupData.installDir}`,                 $rootScope.log.levels.debug);
    $rootScope.log.indent.entry(`To:   ${sanitizePath( $scope.popupData.installDir )}`, $rootScope.log.levels.debug);


    $scope.branch           = $scope.popupData.branch;
    $scope.installDir       = sanitizePath( $scope.popupData.installDir );
    return $scope.buildTypeOptions = false;
  };


  // Cross-platform path sanitizing
  // Relies on the `sanitize-filename` npm package
  //#! Possible issues:
  //     * (Win32)  A malformed drive letter causes the malformed path to be treated as relative to the current directory.  This is due to the initial `path.resolve()`
  var sanitizePath = function(str) {
    // Resolve into an absolute path first
    str = path.resolve(str);
    // and split the resulting path into tokens
    const tokens = str.split(path.sep);

    // For Win32, retain the root drive
    let root = null;
    if (os.platform() === "win32") {
      root = tokens.shift();
      // Sanitize it, and add the ":" back
      root = sanitize(root) + ":";
    }

    // Sanitize each token in turn
    for (let index = 0; index < tokens.length; index++) {
      var token = tokens[index];
      tokens[index] = sanitize(token);
    }

    // Remove all empty elements
    tokens.filter(n => n !== "");

    // Rebuild array
    let new_path = tokens.join( path.sep );

    // Restore the root of the path
    if (os.platform() === "win32") {
      new_path = path.join(root, new_path);  // Win32: drive letter
    } else {
      new_path = path.sep + new_path;        // POSIX: leading /
    }

    // And return our new, sparkling-clean path
    return new_path;
  };



  $scope.getLastUsedVersion = function() {
    for (let i = 0; i < $scope.versions.length; i++) {
      var version = $scope.versions[i];
      if (version.build === $scope.lastVersion) {
        $scope.lastUsedVersion       =  version.version.toString();
        $scope.lastUsedVersionHotfix = `${version.version}${version.hotfix || ''}`;  // used in dialog
        return i.toString();
      }
    }
    return '0';
  };

  $scope.selectLastUsedVersion = function() {
    $rootScope.log.verbose("selectLastUsedVersion()");
    return $scope.selectedVersion = $scope.getLastUsedVersion();
  };

  const updateStatus = function(selectedVersion) {
    if ($scope.versions.length === 0) { return; }

    $rootScope.log.verbose("updateStatus()");

    if ($scope.updaterProgress.needsUpdating) {
      $scope.status = `You need to update for v${$scope.versions[selectedVersion].version}${$scope.versions[selectedVersion].hotfix || ""}`;
      $scope.status_updateWarning = "This will overwrite any installed mods.";
    } else {
      $scope.status_updateWarning = "";
      if (selectedVersion === '0') {
        $scope.status = 'You have the latest version for this build type';
      } else {
        $scope.status = `You are up-to-date for v${$scope.versions[selectedVersion].version}${$scope.versions[selectedVersion].hotfix || ""}`;
      }
    }

    if ($scope.updaterProgress.indeterminateState) {
      $scope.status = "Unable to determine installed game version.";
      $scope.status_updateWarning = "Update game to resolve.";
    }


    if (!$scope.starmadeInstalled) {
      $scope.status = "";
      $scope.status_updateWarning = "Click to install StarMade";
    }

    $rootScope.log.indent.entry(`Status:  ${$scope.status}`,               $rootScope.log.levels.verbose);
    return $rootScope.log.indent.entry(`Status2: ${$scope.status_updateWarning}`, $rootScope.log.levels.verbose);
  };



  // Is StarMade is actually installed?
  const isStarMadeInstalled = function() {
    //TODO: Check for the presence of other files as well.  some files -> not intact; no files -> clean
    $scope.starmadeInstalled = fileExists( path.join($scope.installDir, "StarMade.jar") );
    return $scope.starmadeInstalled;
  };

  //TODO: isStarMadeIntact()


  const branchChange = function(newVal) {
    $rootScope.log.event(`Changing branch to ${newVal.charAt(0).toUpperCase()}${newVal.slice(1)}`);  // Capitalize first character
    $scope.switchingBranch = true;
    return updater.getVersions(newVal)
      .then(function(versions) {
        $scope.switchingBranch = false;
        $scope.versions = $filter('orderBy')(versions, '-build');

        // Add hotfix indicators to duplicate version entries
        let index            = $scope.versions.length - 1;
        let previous_version = null;
        let hotfix_counter   = 0;

        // Work backwards through the list
        while (index >= 0) {
          if ((index-1) >= 0) {  // all but the last entry
            if ($scope.versions[index].version === previous_version) {
              // and add hotfix indicators to the second, third, etc. matching entries
              $scope.versions[index].hotfix = String.fromCharCode(97 + hotfix_counter++);
              //#! This will cause problems in the unlikely event there are >26 hotfixes for the same version
            } else {
              previous_version = $scope.versions[index].version;
              hotfix_counter   = 0;
            }
          } else {  // last entry
            if ($scope.versions[index].version === previous_version) {
              $scope.versions[index].hotfix = String.fromCharCode(97 + hotfix_counter++);
            }
          }
          index--;
        }
        // end hotfix indicators


        // Add Latest indicator
        $scope.versions[0].latest = '(Latest)';

        // Workaround for when ngRepeat hasn't processed the versions yet
        return requestAnimationFrame(() => $scope.$apply(function($scope) {
          if ($scope.lastVersion != null) {
            $scope.selectLastUsedVersion();
          } else {
            $scope.lastVersion = $scope.versions[0].build;
            $scope.selectedVersion = '0';
          }

          if ($rootScope.nogui) {
            // Always use the latest version with -nogui
            $scope.lastVersion = $scope.versions[0].build;
            $scope.selectedVersion = '0';

            updater.update($scope.versions[$scope.selectedVersion], $scope.installDir, false);

            return $scope.$watch('updaterProgress.inProgress', function(newVal) {
              // Quit when done
              if (!newVal) { return electronApp.quit(); }
            });
          } else {
            // Update only when selecting a different build version
            return $scope.updaterProgress.needsUpdating = (($scope.versions[$scope.selectedVersion].build !== $scope.lastVersion)  ||  !isStarMadeInstalled() || $scope.updaterProgress.indeterminateState);
          }
        }));
      }
              // updater.update($scope.versions[$scope.selectedVersion], $scope.installDir, true)
      , function() {
        if (!navigator.onLine) { $scope.status = 'You are offline.'; }
        $scope.switchingBranch = false;
        $scope.versions = [];
        return $scope.selectedVersion = null;
    });
  };

  $scope.selectNewestVersion = () => // selects the first item
  $scope.popupData.selectedVersion = '0';

  $rootScope.$watch('launcherUpdating', function(updating) {
    if (!updating) { return branchChange($scope.branch); }
  });

  $scope.$watch('branch', function(newVal) {
    if ($rootScope.launcherUpdating) { return; }
    localStorage.setItem('branch', newVal);
    return branchChange(newVal);
  });

  $scope.$watch('installDir', newVal => localStorage.setItem('installDir', newVal));

  $scope.$watch('lastVersion', function(newVal) {
    if (newVal == null) { return; }
    $scope.popupData.lastVersion = newVal;  //#- not used?
    return localStorage.setItem('lastVersion', newVal);
  });

  $scope.$watch('popupData.selectedVersion', function(newVal) {
    $scope.selectedVersion = newVal;
    if ((newVal == null)) { return; }

    const version = $scope.versions[$scope.selectedVersion];
    return $rootScope.log.event(`Changed selected version to ${version.version}${version.hotfix || ''}${$scope.selectedVersion === '0' ? ' (Latest)' : ''}`);
  });

  $scope.$watch('serverPort', newVal => localStorage.setItem('serverPort', newVal));

  $scope.$watch('selectedVersion', function(newVal) {
    $scope.popupData.selectedVersion = newVal;
    if ($scope.versions[newVal] == null) { return; }
    if (!navigator.onLine) { return; }
    // Require an update when selecting a different version
    $scope.updaterProgress.needsUpdating = (($scope.versions[newVal].build !== $scope.lastVersion) || !isStarMadeInstalled() || $scope.updaterProgress.indeterminateState);
    return updateStatus(newVal);
  });

  $scope.$watch('updaterProgress.text', function(newVal) {
    if ($scope.updaterProgress.inProgress) {
      return $scope.status = newVal;
    }
  });

  $scope.$watch('updaterProgress.inProgress', function(newVal) {
    if (!newVal) { // Not in progress
      return updateStatus($scope.selectedVersion);
    }
  });

  // Override settings with supplied arguments
  if (argv['install-dir'] != null) {
    localStorage.setItem('installDir', argv['install-dir']);
  }

  if (argv.archive) {
    localStorage.setItem('branch', 'archive');
  }

  if (argv.dev) {
    localStorage.setItem('branch', 'dev');
  }

  if (argv.latest) {
    localStorage.removeItem('lastVersion');
  }

  if (argv.pre) {
    localStorage.setItem('branch', 'pre');
  }

  if (argv.release) {
    localStorage.setItem('branch', 'release');
  }


  //TODO: make this public, have it accept a game id
  const getInstalledVersion = function() {
    let _do_logging;
    if (!$rootScope.alreadyExecuted('log getInstalledVersion')) { _do_logging = true; }

    if (_do_logging) {
      $rootScope.log.event("Determining installed game version", $rootScope.log.levels.verbose);
      $rootScope.log.indent(1, $rootScope.log.levels.verbose);
    }

    // get current install directory
    const dir = localStorage.getItem('installDir');
    if ((dir == null)) {
      if (_do_logging) {
        $rootScope.log.error("UpdateCtrl: installDir not set");
        $rootScope.log.outdent(1, $rootScope.log.levels.verbose);
      }
      return null;
    }

    // Edge-case: version.txt does not exist
    if (!fileExists(path.join(dir, "version.txt"))) {
      // Is it a fresh install?
      if (!fileExists(path.join(dir, "StarMade.jar"))) {
        if (_do_logging) {
          $rootScope.log.info("Fresh install");
          $rootScope.log.indent.debug(`Game install path: ${dir}`);
          $rootScope.log.outdent(1, $rootScope.log.levels.verbose);
        }
        return null;  // unknown version -> suggest updating to latest

      } else {
        // Otherwise... indeterminable game state with (at least) version.txt missing.
        if (_do_logging) {
          $rootScope.log.error("Unable to determine version of installed game: version.txt missing");
          $rootScope.log.indent.debug(`Game install path: ${dir}`);
          $rootScope.log.outdent(1, $rootScope.log.levels.verbose);
        }
        // Indeterminable game state requires an update to resolve.
        $scope.updaterProgress.indeterminateState = true;
        return null;  // unknown version -> suggest updating to latest
      }
    }

    // Parse version.txt  (Expected format: 0.199.132#20160802_134223)
    const data = fs.readFileSync(path.join(dir, "version.txt")).toString().trim();  // and strip newline, if present

    // Edge-case: invalid data/format
    if ((data.match(/^[0-9]{1,3}\.[0-9]{1,3}(\.[0-9]{1,3})?#[0-9]{8}_[0-9]+$/) == null)) {   // backwards-compatibility with previous 0.xxx version numbering
      if (_do_logging) {
        $rootScope.log.error("Unable to determine version of installed game: version.txt contains unexpected data");
        $rootScope.log.indent.debug(`Game install path: ${dir}`);
        $rootScope.log.indent.debug(`Version contents:  ${data}`);
        $rootScope.log.outdent(1, $rootScope.log.levels.verbose);
      }
      // Requires an update to resolve.
      $scope.updaterProgress.indeterminateState = true;
      return null;  // unknown version -> suggest updating to latest
    }

    // Return build data
    const [_version, _build] = Array.from(data.split('#'));

    if (_do_logging) {
      $rootScope.log.info(`Installed game version: ${_version} (build ${_build})`);
      $rootScope.log.outdent(1, $rootScope.log.levels.verbose);
    }

    return _build;
  };


  $scope.installDir  = localStorage.getItem('installDir');  // If this isn't set, we have a serious problem.
  $scope.branch      = localStorage.getItem('branch')     || 'release';
  $scope.serverPort  = localStorage.getItem('serverPort') || '4242';
  $scope.lastVersion = getInstalledVersion();               // Installed build id

  if (($scope.installDir == null)) {
    $rootScope.log.error("UpdateCtrl: installDir not set");
  }


  // Called by zip/targz radio buttons in index.jade
  $scope.set_zip_compression   = () => set_backup_compression('zip');
  $scope.set_targz_compression = () => set_backup_compression('targz');

  var set_backup_compression = function(newVal) {
    if (localStorage.getItem('backupCompressionType') === newVal) { return; }
    localStorage.setItem('backupCompressionType', newVal);
    $scope.backupOptions.compressionType = newVal;
    return $rootScope.log.entry(`Set backup compression type to ${localStorage.getItem('backupCompressionType')}`);
  };


  $scope.closeBackupDialog = function() {
    if ($scope.backupDialog.visible != null) {
      $rootScope.log.verbose("Closing backup dialog");
    }
    $scope.backupDialog.visible              = null;
    $scope.backupDialog.error.visible        = null;
    $scope.backupDialog.error.details        = null;
    $scope.backupDialog.error.detailsSection = null;
    $scope.backupDialog.progress.visible     = null;
    $scope.backupDialog.progress.worlds      = null;
    return $scope.backupDialog.progress.blueprints  = null;
  };


  $scope.backup = function() {

    let configs;
    if (!($scope.backupOptions.configs || $scope.backupOptions.worlds || $scope.backupOptions.blueprints)) {
      $rootScope.log.event("Skipping backup");
      $timeout(function() {
        // Show progress with everything as skipped
        $scope.backupDialog.progress.visible    = true;
        $scope.backupDialog.progress.configs    = "skipped";
        $scope.backupDialog.progress.worlds     = "skipped";
        $scope.backupDialog.progress.blueprints = "skipped";
        // And mark as complete and show skipped message
        $scope.backupDialog.progress.complete   = true;
        return $scope.backupDialog.skipped             = true;
      });
      return;
    }



    $rootScope.log.event("Performing backup");
    $rootScope.log.indent();

    // Show backup progress dialog
    $scope.backupDialog.progress.visible = true;


    try {
      fs.mkdirSync(path.join( path.resolve($scope.installDir), "backups"));
      $rootScope.log.verbose("Created backups folder");

    } catch (error) {
      const err = error;
      if (err.code !== "EEXIST") {  // This very likely already exists
        // build error description
        const desc = (err.message || "unknown");
        // Log
        $rootScope.log.error("Error creating parent backups folder");
        $rootScope.log.indent.entry(desc);
        // Show error dialog (using $timeout to wait for the next $digest cycle; it will not show otherwise)
        $timeout(function() {
          $scope.backupDialog.error.visible = true;
          return $scope.backupDialog.error.details = desc;
        });
        // And exit
        $rootScope.log.outdent();
        return;
      }
    }



    const now = new Date;
    // Get date/time portions
    let month   = now.getMonth()+1;    // 0-indexed
    let day     = now.getDate();       // 1-indexed
    let hours   = now.getHours();      // 1-indexed
    let minutes = now.getMinutes();    // 1-indexed
    let seconds = now.getSeconds()+1;  // 0-indexed
    // prefix with zeros
    if (month   < 10) { month   = `0${month}`; }
    if (day     < 10) { day     = `0${day}`; }
    if (hours   < 10) { hours   = `0${hours}`; }
    if (minutes < 10) { minutes = `0${minutes}`; }
    if (seconds < 10) { seconds = `0${seconds}`; }

    const version = $scope.versions[$scope.selectedVersion];


    // Format: game/backups/2016-09-06 at 17_08_46 from (0.199.132a) to (0.199.169).tar.gz
    let backupPath  = `${now.getFullYear()}-${month}-${day}`;
    backupPath += ` at ${hours}_${minutes}_${seconds}`;
    backupPath += ` from (${$scope.lastUsedVersionHotfix})`;
    backupPath += ` to (${version.version}${version.hotfix || ''})`;
    if ($scope.backupOptions.compressionType === "zip") { backupPath += ".zip"; }
    if ($scope.backupOptions.compressionType === "targz") { backupPath += ".tar.gz"; }
    backupPath  = path.resolve( path.join( path.resolve($scope.installDir), "backups", backupPath) );

    $rootScope.log.verbose(`Destination: ${backupPath}`);


    // Create archive stream
    let _format  = "zip";
    let _options = {};

    if ($scope.backupOptions.compressionType === "targz") {
      _format = "tar";
      _options = {
        gzip: true,
        gzipOptions: {
          level: 1
        }
      };
    }
    const archive            = archiver(_format, _options);
    const archiveWriteStream = fs.createWriteStream(backupPath);


    // Error handlers
    const _error_handler = function(err) {
      $rootScope.log.error("Aborted backup. Reason:");
      let msgs = ["unknown"];
      if (err != null) { msgs = [err]; }
      if (err.message != null) { msgs = [err.message]; }
      if ((typeof err !== 'string')  &&  (Object.keys(err).length > 0)) {
        msgs = [];
        for (var key of Array.from(Object.keys(err))) { msgs.push(`${key}: ${err[key]}`); }
      }
      for (var msg of Array.from(msgs)) { $rootScope.log.indent.entry(msg); }
      $rootScope.log.outdent();

      // Display error dialog
      $timeout(function() {
        $scope.backupDialog.error.visible         = true;
        return $scope.backupDialog.error.details = msgs.join(". ").trim();
      });
    };
    archive.on('error', err => _error_handler(err));
    archiveWriteStream.on('error', err => _error_handler(err));



    // Complete handler
    archive.on('end', function() {
      $rootScope.log.info(`File size: ${archive.pointer()} bytes`);
      $rootScope.log.entry("Backup complete");
      $rootScope.log.outdent();
      return $timeout(function() {
        // Show complete dialog
        $scope.backupDialog.progress.complete   = true;
        return $scope.backupDialog.path                = backupPath;
      });
    });



    // Show progress page
    $timeout(() => $scope.backupDialog.progress.visible = true);


    // Add configs
    if ($scope.backupOptions.configs) {
      $timeout(() => $scope.backupDialog.progress.configs = true);
      configs = ["settings.cfg", "server.cfg", "keyboard.cfg", "joystick.cfg"];
      let _found = false;
      for (var config of Array.from(configs)) {
        // Skip configs that do not exist, e.g. "joystick.cfg"
        if (!fileExists(path.resolve( path.join($scope.installDir, config) ))) { continue; }
        _found = true;
        archive.file(
          path.resolve(path.join($scope.installDir, config)),
          {name: config}
        );
      }
      if (!_found) {
        $timeout(() => $scope.backupDialog.progress.configs = "missing");
      }
    } else {
      $timeout(() => $scope.backupDialog.progress.configs = "skipped");
    }


    // Add worlds
    if ($scope.backupOptions.worlds) {
      $timeout(() => $scope.backupDialog.progress.worlds = true);
      if (fileExists(path.resolve( path.join($scope.installDir, "server-database") ))) {
        archive.directory(
          path.resolve(path.join($scope.installDir, "server-database")),
          "server-database"
        );
      } else { $scope.backupDialog.progress.worlds = "missing"; }
    } else { $scope.backupDialog.progress.worlds = "skipped"; }


    // Add blueprints
    if ($scope.backupOptions.blueprints) {
      $timeout(() => $scope.backupDialog.progress.blueprints = true);
      if (fileExists(path.resolve( path.join($scope.installDir, "blueprints") ))) {
        archive.directory(
          path.resolve(path.join($scope.installDir, "blueprints")),
          "blueprints"
        );
      } else { $scope.backupDialog.progress.blueprints = "missing"; }
    } else { $scope.backupDialog.progress.blueprints = "skipped"; }


    // Finalize
    archive.finalize();
    archive.pipe(archiveWriteStream);
  };





  $scope.pre_update = function(force) {
    // Skip if --nobackup
    if (force == null) { force = false; }
    if ($rootScope.noBackup) {
      $rootScope.log.info("Bypassing backup");
      return $scope.update(force);
    }

    // Ensure game directory exists
    if (!fileExists(path.resolve($scope.installDir))) {
      $rootScope.log.info("Skipping backup: fresh install");
      return $scope.update(force);
    }

    // Ensure at least one of [blueprints, server-database] exist
    const blueprints = fileExists(path.resolve( path.join($scope.installDir, "blueprints") ));
    const database   = fileExists(path.resolve( path.join($scope.installDir, "server-database") ));

    if (blueprints || database) {
      if ($scope.backupDialog.visible === true) {
        // Don't log if already visible.
        return;
      }

      // Show backup dialog
      $rootScope.log.event("Presenting backup dialog");
      $scope.update_force = force;  // preserve `force` param
      return $scope.backupDialog.visible = true;
    } else {
      // Otherwise, continue with the update
      $rootScope.log.info("Backup");
      $rootScope.log.indent.entry("Neither blueprints nor worlds folders exist");
      $rootScope.log.indent.entry("Aborting backup and continuing with udpdate");
      return $scope.update();
    }
  };


  return $scope.update = function(force) {
    if (force == null) { force = false; }
    $scope.closeBackupDialog();

    // Supplied `force` param overrides saved param from `pre_update()`
    force = force || $scope.update_force;
    $scope.update_force = null;

    const version = $scope.versions[$scope.selectedVersion];
    $rootScope.log.verbose(`Target version: ${JSON.stringify(version)}`);
    $scope.lastVersion = version.build;

    $rootScope.log.event(`Updating game from ${$scope.lastUsedVersionHotfix} to ${version.version}${version.hotfix || ''}${$scope.selectedVersion === '0' ? ' (Latest)' : ''}`);

    $scope.getLastUsedVersion();  // update displayed 'Currently Installed' version
    $scope.status_updateWarning = "";
    $scope.starmadeInstalled = true;
    $scope.updaterProgress.indeterminateState = false;
    return updater.update(version, $scope.installDir, false, force);
  };
});
