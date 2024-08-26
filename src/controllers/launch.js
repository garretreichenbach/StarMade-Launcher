/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const {
    spawn
} = require('child_process');
const {
    remote
} = require('electron');

const {
    dialog
} = remote;

const util = require('../util');
const {
    fileExists
} = require('../fileexists');
const pkg = require('../../package.json');

let javaVersion = () => {
    if ($rootScope.buildVersion().startsWith("0.2") || $rootScope.buildVersion().startsWith("0.1")) return pkg.java8Version;
    else return pkg.java18Version;
}

let javaJreDirectory = () => {
    return util.getJreDirectory(javaVersion());
}

const app = angular.module('launcher');

app.directive('stringToNumber', () => ({
    require: 'ngModel',

    link(scope, element, attrs, ngModel) {
        ngModel.$parsers.push(value => '' + value);
        ngModel.$formatters.push(value => parseFloat(value, 10));
    }
}));


app.controller('LaunchCtrl', function ($scope, $rootScope, $timeout, accessToken) {
    const totalRam = Math.floor(os.totalmem() / 1024 / 1024);  // bytes -> mb
    let x64max = 4096;

    // Low system memory? decrease default max
    if (totalRam <= 4096) {
        x64max = 2048;
        if (!$rootScope.alreadyExecuted('log low system memory')) {
            $rootScope.log.info(`Low system memory (${totalRam}mb)`);
            if (os.arch() === "x64") {
                $rootScope.log.indent.entry("Decreased default max memory from 4gb to 2gb");
            }
        }
    }

    const defaults = {
        ia32: {
            earlyGen: 64,
            initial: 256,
            max: 512,      // initial memory.max value
            ceiling: 2048
        },      // maximum value allowed
        x64: {
            earlyGen: 128,
            initial: 512,
            max: x64max,    // initial memory.max value
            ceiling: totalRam
        }  // maximum value allowed
    };


    // Load memory settings from storage, or set the defaults
    const loadMemorySettings = function () {
        let _do_logging = true;
        if (!$rootScope.alreadyExecuted('Loading memory settings', 1000)) {
            $rootScope.log.event("Loading memory settings");
            _do_logging = true;
        }

        // Cap max memory to physical ram
        let _max = Number(localStorage.getItem('maxMemory')) || Number(defaults[os.arch()].max);
        if ((_max > defaults[os.arch()].ceiling) && _do_logging) {
            $rootScope.log.indent.info("Max memory capped to physical ram");
        }
        _max = Math.min(_max, defaults[os.arch()].ceiling);

        $scope.memory = {
            max: _max,
            initial: Number(localStorage.getItem('initialMemory')) || Number(defaults[os.arch()].initial),
            earlyGen: Number(localStorage.getItem('earlyGenMemory')) || Number(defaults[os.arch()].earlyGen),
            ceiling: Number(defaults[os.arch()].ceiling),
            step: 256,  // Used by #maxMemoryInput.  See AngularJS workaround in $scope.closeClientOptions() below for why this isn't hardcoded.
            validate: {}   // Validation checks reside here
        };

        if (_do_logging) {
            $rootScope.log.indent.entry(`maxMemory:      ${$scope.memory.max}`);
            $rootScope.log.indent.entry(`initialMemory:  ${$scope.memory.initial}`);
            $rootScope.log.indent.entry(`earlyGenMemory: ${$scope.memory.earlyGen}`);
            $rootScope.log.indent.entry(`ceiling:        ${$scope.memory.ceiling}`);
        }

        $scope.memory.validate = function () {
            // Validate memory settings
            if (!$scope.memory.validate.initial()) {
                return false;
            }
            if (!$scope.memory.validate.earlyGen()) {
                return false;
            }
            if (!$scope.memory.validate.max()) {
                return false;
            }
            if ($scope.memory.earlyGen >= $scope.memory.initial) {
                return false;
            }
            if ($scope.memory.max < ($scope.memory.initial + $scope.memory.earlyGen)) {
                return false;
            }
            if ($scope.memory.max > $scope.memory.ceiling) {
                return false;
            }
            return true;
        };

        $scope.memory.validate.max = function () {
            // catch `undefined` from invalid values
            if (($scope.memory.max == null)) {
                return false;
            }
            if (!typeof $scope.memory.max === "number") {
                return false;
            }

            _max = $scope.memory.max;
            if (_max > $scope.memory.ceiling) {
                return false;
            }
            if (_max < ($scope.memory.initial + $scope.memory.earlyGen)) {
                return false;
            }
            return true;
        };

        $scope.memory.validate.initial = function () {
            if (($scope.memory.initial == null)) {
                return false;
            }    // catch `undefined` from invalid values
            return true;
        };

        $scope.memory.validate.earlyGen = function () {
            if (($scope.memory.earlyGen == null)) {
                return false;
            }   // catch `undefined` from invalid values
            return true;
        };


        $scope.memory.validate.max.class = function () {
            if (!$scope.memory.validate.max()) {
                return "invalid";
            }
            if ($scope.memory.max < 2048) {
                return "critical";
            }
            if ($scope.memory.max < 4096) {
                return "warning";
            }
        };
        $scope.memory.validate.initial.class = function () {
            if (!$scope.memory.validate.initial()) {
                return "invalid";
            }
            if ($scope.memory.initial <= $scope.memory.earlyGen) {
                return "invalid";
            }
            if ($scope.memory.initial < 256) {
                return "warning";
            }
        };
        return $scope.memory.validate.earlyGen.class = function () {
            if (!$scope.memory.validate.earlyGen()) {
                return "invalid";
            }
        };
    };


    // load memory settings immediately
    loadMemorySettings();


    // Load launcher settings from storage, or set the defaults

    let _do_logging = true;
    if (!$rootScope.alreadyExecuted("Loading launcher options")) {
        $rootScope.log.event("Loading launcher options");
        _do_logging = true;
    }

    $scope.launcherOptions = {};

    // restore previous settings, or use the defaults
    $scope.serverPort = localStorage.getItem('serverPort') || 4242;
    $scope.launcherOptions.javaPath = localStorage.getItem('javaPath') || "";
    $scope.launcherOptions.javaArgs = localStorage.getItem("javaArgs");    // Defaults set below

    if (_do_logging) {
        $rootScope.log.indent.entry(`serverPort: ${$scope.serverPort}`);
        $rootScope.log.indent.entry(`javaPath:   ${$scope.launcherOptions.javaPath || '(none)'}`);
    }
    // javaArgs logged below


    // Custom java args (and defaults)

    $scope.resetJavaArgs = function () {
        let args = [];
        args.push('-Xincgc');
        if (os.arch() === "x64") {
            args.push('-server');
        }
        args = args.join(" ");
        // Don't bother if they've already been reset
        if ($scope.launcherOptions.javaArgs === args) {
            return;
        }

        $scope.launcherOptions.javaArgs = args;
        localStorage.setItem("javaArgs", args);
        $rootScope.log.info("Set javaArgs to defaults");
        return $rootScope.log.indent.entry(args);
    };

    // Set default javaArgs when not set
    if (($scope.launcherOptions.javaArgs == null)) {
        $scope.resetJavaArgs();
    }
    // and log them
    if (_do_logging) {
        $rootScope.log.indent.entry(`javaArgs:   ${$scope.launcherOptions.javaArgs}`);
    }


    $scope.setJavaArgs = function () {
        if ($scope.launcherOptions.javaArgs === localStorage.getItem("javaArgs")) {
            return;
        }
        localStorage.setItem("javaArgs", $scope.launcherOptions.javaArgs);
        $rootScope.log.info("Set javaArgs");
        return $rootScope.log.indent.entry($scope.launcherOptions.javaArgs);
    };


    /* _JAVA_OPTIONS Dialog */

    $scope.showEnvJavaOptionsWarning = function () {
        $scope._java_options.show_dialog = true;
        if ($rootScope.alreadyExecuted('log _JAVA_OPTIONS Dialog')) {
            return;
        }

        $rootScope.log.info(`_JAVA_OPTIONS=${process.env['_JAVA_OPTIONS']}`);
        return $rootScope.log.event("Presenting _JAVA_OPTIONS Dialog");
    };

    $scope.get_java_options = () => (process.env["_JAVA_OPTIONS"] || '').trim();

    $scope.clearEnvJavaOptions = function () {
        process.env["_JAVA_OPTIONS"] = '';
        $rootScope.log.info("Cleared _JAVA_OPTIONS");
        return $scope._java_options.show_dialog = false;
    };

    $scope.saveEnvJavaOptionsWarning = function () {
        process.env["_JAVA_OPTIONS"] = $scope._java_options.modified;

        if (process.env["_JAVA_OPTIONS"] === '') {
            $rootScope.log.info("Cleared _JAVA_OPTIONS");
        } else {
            $rootScope.log.info(`Set _JAVA_OPTIONS to: ${process.env['_JAVA_OPTIONS']}`);
        }
        return $scope._java_options.show_dialog = false;
    };

    $scope.closeEnvJavaOptionsWarning = function () {
        $rootScope.log.entry("Keeping _JAVA_OPTIONS intact");
        return $scope._java_options.show_dialog = false;
    };


    // Must follow function declarations
    if (process.env["_JAVA_OPTIONS"] != null) {
        $scope._java_options = {};
        $scope._java_options.modified = $scope.get_java_options();
        $scope._java_options.show_dialog = false;
        $scope.showEnvJavaOptionsWarning();
    }


    $scope.$watch('serverPort', newVal => localStorage.setItem('serverPort', newVal));

    $scope.$watch('memory.earlyGen', function (newVal) {
        if ((document.getElementById("maxMemorySlider") == null)) {
            return;
        }  // Ensure markup has loaded
        if (typeof $scope.memory === "undefined") {
            return;
        }
        return updateMemorySlider(newVal, $scope.memory.initial);
    });

    $scope.$watch('memory.initial', function (newVal) {
        if ((document.getElementById("maxMemorySlider") == null)) {
            return;
        }  // Ensure markup has loaded
        if (typeof $scope.memory === "undefined") {
            return;
        }
        return updateMemorySlider($scope.memory.earlyGen, newVal);
    });


    // Update slider when memory.max changes via textbox
    $scope.set_memory_slider_value = function (newVal) {
        $scope.memory.slider = newVal;
        return update_slider_class();
    };

    // Called by slider updates
    $scope.snap_memory = function (newVal) {
        const _nearest_pow_2 = nearestPow2(newVal);
        const _floor = $scope.memory.floor;

        // Snap to lower bound if between `floor` and `(floor + floor->pow2)/2`
        if (newVal <= ((_floor + nearestPow2(_floor, false)) >> 1)) {  // false: bypass nearestPow2() memoizing
            $scope.memory.max = _floor;
        } else {
            // Snap to nearest pow2 (higher than the lower bound, capped at memory ceiling)
            $scope.memory.max = Math.max(_floor, Math.min(_nearest_pow_2, $scope.memory.ceiling));
        }


        // Allow snapping up to end of slider, power of 2 or not
        if ($scope.memory.max !== $scope.memory.ceiling) {
            if (newVal >= (($scope.memory.max + $scope.memory.ceiling) / 2)) {
                $scope.memory.max = $scope.memory.ceiling;
            }
        }


        $scope.memory.slider = $scope.memory.max;
        update_slider_class();
        // $rootScope.log.verbose "Slider: Snapping from #{newVal} to #{$scope.memory.max}"

        // Log bounding errors  (these should never happen)
        if ($scope.memory.max > $scope.memory.ceiling) {
            $rootScope.log.error(`Snapped above memory ceiling (${$scope.memory.max} > ${$scope.memory.ceiling})`);
        }
        if ($scope.memory.max < $scope.memory.floor) {
            return $rootScope.log.error(`Snapped below memory floor (${$scope.memory.max} < ${$scope.memory.floor})`);
        }
    };


    var update_slider_class = function () {
        // ensure there's only one bit set:
        // (nonzero, no bits match val-1)
        const val = $scope.memory.slider;
        const pow2 = val && !(val & (val - 1));

        // Set flag and update class
        $scope.memory.power_of_2 = pow2;
        if (pow2) {
            document.getElementById("maxMemorySlider").classList.add("power-of-2");
        }
        if (!pow2) {
            return document.getElementById("maxMemorySlider").classList.remove("power-of-2");
        }
    };


    const nearestPow2_clear_bounds = function () {
        // Leaving the stored bounds intact does not cause incorrect results.
        // clearing them, however, slightly speeds up any subsequent calls with too-far-out-of-bounds values (>=1 power in either direction)
        //   ex: nearestPow2(255)  then  nearestPow2(1023)
        let pow2_upper_bound;
        const pow2_lower_bound = null;
        return pow2_upper_bound = null;
    };

    // As this is kind of hard to read, I've added comments describing the bitwise math I've used.
    // Works for up values up to 30 bits (javascript limitation)
    // Undefined behavior for values < 1
    var nearestPow2 = function (val, memoize) {
        // Memoize to speed up subsequent calls with similar values
        if (memoize == null) {
            memoize = true;
        }
        if (memoize && (typeof pow2_lower_bound === "number") && (typeof pow2_upper_bound === "number")) {  // Skip entire block if bounds are undefined/incorrect
            // no change?
            if (val === pow2_current_power) {
                return pow2_current_power;
            }

            // Prev/Next powers are guaranteed powers of 2, so simply return them.
            if (val === pow2_next_power) {
                nearestPow2_clear_bounds(); // Clear bounds to speed up the next call
                return pow2_next_power;
            }
            if (val === pow2_prev_power) {
                nearestPow2_clear_bounds();
                return pow2_prev_power;
            }

            // Halfway bounds allow quick rounding:
            //  - Within bounds
            if (((val > pow2_current_power) && (val < pow2_upper_bound)) || ((val < pow2_current_power) && (val >= pow2_lower_bound))) {
                return pow2_current_power;
            }

            //  - Between upper bound and next power
            if ((val >= pow2_upper_bound) && (val <= pow2_next_power)) {
                nearestPow2_clear_bounds();
                return pow2_next_power;
            }

            //  - Between lower bound and previous power
            if ((val < pow2_lower_bound) && (val >= pow2_prev_power)) {
                nearestPow2_clear_bounds();
                return pow2_prev_power;
            }
        }


        // Already a power of 2? simply return it.
        // (As this scenario is rare, checking likely lowers performance)
        if ((val & (val - 1)) === 0) {
            return val;
        }  // This will be nonzero (and therefore fail) if there are multiple bits set.


        // Round to nearest power of 2 using bitwise math:
        val = ~~val;  // Fast floor via double bitwise not
        let val_copy = val;
        let shift_count = 0;
        // Count the number of bits to the right of the most-significant bit:  111011 -> 5
        while (val_copy > 1) {
            val_copy = val_copy >>> 1;   // >>> left-fills with zeros
            shift_count++;
        }

        // If the value's second-most-significant bit is set (meaning it's halfway to the next power), add a shift to round up
        if (val & (1 << (shift_count - 1))) {
            shift_count++;
        }

        // Construct the power by left-shifting  --  much faster than Math.pow(2, shift_count)
        val = 1 << shift_count;

        // Shortcut if not memoizing
        if (!memoize) {
            return val;
        }

        // ... and memoize by storing halfway bounds and the next/prev powers
        var pow2_next_power = val << 1;
        var pow2_upper_bound = val + (val >>> 1);          // Halfway up   (x*1.5)
        var pow2_current_power = val;
        var pow2_lower_bound = (val >>> 1) + (val >>> 2);  // Halfway down (x/2 + x/4)
        var pow2_prev_power = val >>> 1;

        // Return our shiny new power of 2 (:
        return val;
    };


    // ensure Max >= initial+earlyGen; update slider's value
    var updateMemorySlider = function (earlyGen, initial) {
        if (typeof earlyGen === "undefined") {
            ({
                earlyGen
            } = $scope.memory);
        }
        if (typeof initial === "undefined") {
            ({
                initial
            } = $scope.memory);
        }

        // Still invalid?  bypass updating until they're set.
        if (typeof earlyGen === "undefined") {
            return;
        }
        if (typeof initial === "undefined") {
            return;
        }

        if (!$rootScope.alreadyExecuted("Log - updateMemorySlider", 1000)) {
            _do_logging = true;
        }

        if (_do_logging != null) {
            $rootScope.log.verbose("Updating memory slider");
            $rootScope.log.indent.entry(`earlyGen: ${earlyGen}`, $rootScope.log.levels.verbose);
            $rootScope.log.indent.entry(`initial:  ${initial}`, $rootScope.log.levels.verbose);
            $rootScope.log.indent();
        }

        updateMemoryFloor();  // update floor whenever initial/earlyGen change


        $scope.memory.max = Math.max($scope.memory.floor, $scope.memory.max);
        $scope.memory.slider = $scope.memory.max;
        update_slider_class(); // toggles green and labels when at a power of 2

        if (_do_logging != null) {
            $rootScope.log.outdent();
            $rootScope.log.indent.entry(`max:      ${$scope.memory.max}`, $rootScope.log.levels.verbose);
            $rootScope.log.indent.entry(`slider:   ${$scope.memory.slider}`, $rootScope.log.levels.verbose);
        }

        // Workaround for Angular's range bug  (https://github.com/angular/angular.js/issues/6726)
        return $timeout(() => document.getElementById("maxMemorySlider").value = $scope.memory.max);
    };


    // max memory should be >= early+initial
    var updateMemoryFloor = function () {
        // deleting the contents of the `earlyGen` and/or `initial` textboxes causes problems.  setting a min value here fixes it.
        $scope.memory.floor = Math.max($scope.memory.earlyGen + $scope.memory.initial, 256);  // 256 minimum
        if (!$rootScope.alreadyExecuted("Log - updateMemoryFloor", 1000)) {
            $rootScope.log.verbose("Updating memory floor");
            return $rootScope.log.indent.entry(`setting memory.floor to ${$scope.memory.floor}`, $rootScope.log.levels.verbose);
        }
    };


    $scope.openClientMemoryOptions = function () {
        loadMemorySettings();
        updateMemorySlider();
        return $scope.clientMemoryOptions = true;
    };

    $scope.closeClientOptions = function () {
        $scope.memory.step = 1;    // AngularJS workaround: specifying non-multiples of {{step}} throws an error upon hiding the control.  hacky workaround.
        return $scope.clientMemoryOptions = false;
    };


    $scope.saveClientOptions = function () {
        localStorage.setItem('maxMemory', $scope.memory.max);
        localStorage.setItem('initialMemory', $scope.memory.initial);
        localStorage.setItem('earlyGenMemory', $scope.memory.earlyGen);

        $rootScope.log.event("Saving memory settings");
        $rootScope.log.indent.entry(`maxMemory:      ${$scope.memory.max}`);
        $rootScope.log.indent.entry(`initialMemory:  ${$scope.memory.initial}`);
        $rootScope.log.indent.entry(`earlyGenMemory: ${$scope.memory.earlyGen}`);

        return $scope.closeClientOptions();
    };


    $scope.steamLaunch = () => $rootScope.steamLaunch;

    $scope.buildVersion = () => $rootScope.buildVersion;


    $scope.$watch('launcherOptions.javaPath', function (newVal) {
        localStorage.setItem('javaPath', newVal);
        return $rootScope.javaPath = newVal;
    });


    $scope.$watch('launcherOptionsWindow', function (visible) {
        if (!visible) {
            return;
        }
        return $scope.verifyJavaPath();
    });

    $scope.launcherOptions.javaPathBrowse = () => {
        $rootScope.log.event("Browsing for custom java path", $rootScope.log.levels.verbose);
        return dialog.showOpenDialog(remote.getCurrentWindow(), {
                title: 'Select Java Bin Directory',
                properties: ['openDirectory'],
                defaultPath: $scope.launcherOptions.javaPath
            }
            , newPath => {
                if ((newPath == null)) {
                    $rootScope.log.indent.verbose("Canceled");
                    return;
                }
                $rootScope.log.indent.verbose(`Setting javaPath to ${newPath[0]}`);
                $scope.launcherOptions.javaPath = newPath[0];
                $scope.$apply();
                return $scope.verifyJavaPath();
            });
    };


    $scope.verifyJavaPath = () => {
        let newPath = $rootScope.javaPath;

        // Log only once per second (as there are four controller references)
        if (!$rootScope.alreadyExecuted('log verifyJavaPath', 1000)) {
            _do_logging = true;
        }

        if (_do_logging) {
            $rootScope.log.verbose("Verifying Java path");
            $rootScope.log.indent(1, $rootScope.log.levels.verbose);
        }

        if (!newPath) {  // blank path uses bundled java instead
            $scope.launcherOptions.invalidJavaPath = false;
            $scope.launcherOptions.javaPathStatus = "-- Using bundled Java version --";

            if (_do_logging) {
                $rootScope.log.debug("Using bundled Java");
                $rootScope.log.outdent(1, $rootScope.log.levels.verbose);
            }
            return;
        }

        newPath = path.resolve(newPath);

        javaJreDirectory = util.getJreDirectory(javaVersion);

        if (fileExists(path.join(newPath, "java")) || // osx+linux
            fileExists(path.join(newPath, "java.exe"))) { // windows
            $scope.launcherOptions.javaPathStatus = "-- Using custom Java install --";
            $scope.launcherOptions.invalidJavaPath = false;

            if (_do_logging) {
                $rootScope.log.debug("Using custom Java");
                $rootScope.log.indent.entry(`path: ${newPath}`, $rootScope.log.levels.debug);
                $rootScope.log.outdent(1, $rootScope.log.levels.verbose);
            }
            return;
        }

        $scope.launcherOptions.invalidJavaPath = true;
        if (_do_logging) {
            $rootScope.log.warning("Invalid Java path specified");
            $rootScope.log.indent.entry(`path: ${newPath}`);
            $rootScope.log.debug("Using bundled Java as a fallback");
            return $rootScope.log.outdent(1, $rootScope.log.levels.verbose);
        }
    };


    return $scope.launch = dedicatedServer => {
        let javaBinDir, javaExec;
        if (dedicatedServer == null) {
            dedicatedServer = false;
        }
        $rootScope.log.event("Launching game");
        $scope.verifyJavaPath();
        loadMemorySettings();
        $rootScope.log.info(" settings loaded");
        let customJavaPath = null;
        $rootScope.javaVersion = javaVersion();

        // Use the custom java path if it's set and valid
        if ($rootScope.javaPath && !$scope.launcherOptions.invalidJavaPath) {
            customJavaPath = $rootScope.javaPath;  // `$scope.launcherOptions.javaPath` isn't set right away.
            $rootScope.log.info("Using custom Java");
        } else {
            $rootScope.log.info("Using bundled Java");
        }

        const installDir = path.resolve($scope.$parent.installDir);
        const starmadeJar = path.resolve(`${installDir}/StarMade.jar`);
        if (process.platform === 'darwin') {
            const appDir = path.dirname(process.execPath);
            javaBinDir = customJavaPath || path.join(path.dirname(path.dirname(path.dirname(path.dirname(path.dirname(process.execPath))))), 'MacOS', 'dep', 'java', javaJreDirectory, 'bin');
        } else {
            javaBinDir = customJavaPath || path.join(path.dirname(process.execPath), `dep/java/${javaJreDirectory}/bin`);
        }

        // Use the javaw binary (with extension) on Windows
        if (process.platform === 'win32') {
            javaExec = path.join(javaBinDir, 'javaw.exe');
        } else {
            javaExec = path.join(javaBinDir, 'java');
        }

        // attach with --steam or --attach; --detach overrides
        const detach = (!$rootScope.steamLaunch && !$rootScope.attach) || $rootScope.detach;

        // Standard IO:  pipe if debugging and attaching to the process
        let stdio = 'inherit';
        if ($rootScope.captureGame && !detach) {
            stdio = 'pipe';
        }

        $rootScope.log.indent.entry(`bin path: ${javaBinDir}`);
        $rootScope.log.info("Child process: " + (detach ? 'detached' : 'attached'));


        $rootScope.log.info("Custom java args:");
        $rootScope.log.indent.entry($scope.launcherOptions.javaArgs);

        // Argument builder
        const args = [];
        // JVM args
        if ($rootScope.verbose) {
            args.push('-verbose:jni');
        }
        args.push('-Djava.net.preferIPv4Stack=true');
        args.push(`-Xmn${$scope.memory.earlyGen}M`);
        args.push(`-Xms${$scope.memory.initial}M`);
        args.push(`-Xmx${$scope.memory.max}M`);
        args.push('-illegal-access=permit');
        if (!javaVersion.startsWith("1.8.0")) {
            args.push('--add-exports=java.base/jdk.internal.ref=ALL-UNNAMED');
            args.push('--add-exports=java.base/sun.nio.ch=ALL-UNNAMED');
            args.push('--add-exports=jdk.unsupported/sun.misc=ALL-UNNAMED');
            args.push('--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED');
            args.push('--add-opens=jdk.compiler/com.sun.tools.javac=ALL-UNNAMED');
            args.push('--add-opens=java.base/sun.nio.ch=ALL-UNNAMED');
            args.push('--add-opens=java.base/java.lang=ALL-UNNAMED');
            args.push('--add-opens=java.base/java.lang.reflect=ALL-UNNAMED');
            args.push('--add-opens=java.base/java.io=ALL-UNNAMED');
            args.push('--add-opens=java.base/java.util=ALL-UNNAMED');
        }

        // Custom args
        for (var arg of Array.from($scope.launcherOptions.javaArgs.split(" "))) {
            args.push(arg);
        }
        // Jar args
        args.push('-jar');
        args.push(starmadeJar);
        if (!dedicatedServer) {
            args.push('-force');
        }
        // args.push('-server')                         if dedicatedServer
        if (dedicatedServer) {
            args.push('-gui');
        }
        args.push(`-port:${$scope.serverPort}`);
        if (accessToken.get() != null) {
            args.push(`-auth ${accessToken.get()}`);
        }


        // Debug output
        $rootScope.log.debug("Command:");
        const command = javaExec + " " + args.join(" ");
        for (var cmd_slice of Array.from(command.match(/.{1,128}/g))) {
            $rootScope.log.indent.debug(cmd_slice);
        }

        $rootScope.log.debug("Options:");
        $rootScope.log.indent();
        $rootScope.log.debug(`cwd: ${installDir}`);
        $rootScope.log.debug(`stdio: ${stdio}`);
        $rootScope.log.debug(`detached: ${detach}`);
        $rootScope.log.verbose("Environment:");
        for (var envvar of Array.from(Object.keys(process.env))) {
            $rootScope.log.indent.verbose(`  ${envvar} = ${process.env[envvar]}`);
        }
        $rootScope.log.outdent();


        // Spawn game process
        const child = spawn(javaExec, args, {
                cwd: installDir,
                stdio,
                detached: detach
            }
        );


        if (detach) {
            $rootScope.log.event("Launched game. Exiting");
            remote.app.quit();
        }


        if ($rootScope.captureGame && !detach) {
            $rootScope.log.event("Monitoring game output");

            child.stdout.on('data', function (data) {
                let str = "";
                for (var char of Array.from(data)) {
                    str += String.fromCharCode(char);
                }
                return $rootScope.log.indent.game(str);
            });

            child.stderr.on('data', data => {
                let str = "";
                for (var char of Array.from(data)) {
                    str += String.fromCharCode(char);
                }

                return $rootScope.log.indent.game(str);
            });

            child.on('close', code => {
                return $rootScope.log.indent.event(`Game process exited with code ${code}`, $rootScope.log.levels.game);
            });
        }


        child.on('close', function () {
            $rootScope.log.event("Game closed. Exiting");
            return remote.app.quit();
        });

        return remote.getCurrentWindow().hide();
    };
});
