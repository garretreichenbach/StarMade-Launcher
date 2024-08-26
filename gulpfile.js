/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

let acknowledgeTaskName, arch, name, platform, taskName;
const GREENWORKS_URL = 'https://s3.amazonaws.com/sm-launcher/greenworks';
const JAVA_URL = 'https://s3.amazonaws.com/sm-launcher/java';
const argv = require('minimist')(process.argv.slice(2));
const async = require('async');
const fs = require('fs');
const mkdirp = require('mkdirp');
const gulp = require('gulp');
const gutil = require('gulp-util');
const path = require('path');
const plugins = require('gulp-load-plugins')();
const rimraf = require('rimraf');
const source = require('vinyl-source-stream');
const cp = require('child_process');
const {
    spawn
} = cp;
const wiredep = require('wiredep').stream;
const untar = require('gulp-untar');

const util = require('./src/util');

let build_hash = "";

const paths = {
    bower: './bower.json',
    bowerComponents: {
        dir: 'bower_components',
        glob: 'bower_components/**/*'
    },
    build: {
        dir: 'build',
        glob: 'build/**/*',
        lib: {
            dir: 'build/lib'
        },
        static: {
            dir: 'build/static',
            glob: 'build/static/**/*',
            styles: {
                dir:
                    'build/static/styles'
            }
        }
    },
    cache: {
        electron: {
            dir: 'cache/electron'
        }
    },
    dep: {
        dir: 'dep',
        electron: {
            dir: 'dep/electron'
        },
        java8: {
            dir: 'dep/java8'
        },
        java18: {
            dir: 'dep/java18'
        },
        greenworks: {
            dir: 'dep/greenworks',
            entry: 'dep/greenworks/greenworks.js',
            lib: {
                dir: 'dep/greenworks/lib'
            }
        },
        steamworksSdk: {
            dir: 'dep/steamworks'
        }
    },
    dist: {
        dir: 'dist',
        platform: {
            darwin: {
                x64: 'dist/starmade-launcher-darwin-x64/starmade-launcher.app/Contents/MacOS'
            },
            linux: {
                ia32: 'dist/starmade-launcher-linux-ia32',
                x64: 'dist/starmade-launcher-linux-x64'
            },
            win32: {
                ia32: 'dist/starmade-launcher-win32-ia32',
                x64: 'dist/starmade-launcher-win32-x64'
            }
        }
    },
    lib: {
        dir: 'lib',
        glob: 'lib/**/*'
    },
    nodeModules: {
        dir: 'node_modules'
    },
    package: './package.json',
    res: {
        icon: 'res/starmade',
        licenses: {
            dir: 'res/licenses'
        }
    },
    src: {
        dir: 'src',
        glob: 'src/**/*.js'
    },
    static: {
        dir: 'static',
        entries: 'static/*.js',
        fonts: {
            glob: 'static/fonts/**/*'
        },
        images: {
            glob: 'static/images/**/*'
        },
        jade: {
            glob: 'static/**/*.jade'
        },
        styles: {
            main: 'static/styles/main.less'
        }
    },
    steamAppid: 'steam_appid.txt'
};

const bower = require(paths.bower);
const pkg = require(paths.package);
const {run} = require("node:test");
const {
    electronVersion
} = pkg;
const {
    greenworksVersion
} = pkg;
const {
    java8Version
} = pkg;
const {
    java18Version
} = pkg;

let targetPlatform = argv.platform || 'current';
let targetArch = argv.arch || 'current';

if (targetPlatform === 'current') {
    targetPlatform = process.platform;
}

if (targetArch === 'current') {
    targetArch = process.arch;
}

const greenworks = {
    win32: `${paths.dep.greenworks.dir}/lib/greenworks-win32.node`,
    win64: `${paths.dep.greenworks.dir}/lib/greenworks-win64.node`,
    osx64: `${paths.dep.greenworks.dir}/lib/greenworks-osx64.node`,
    linux32: `${paths.dep.greenworks.dir}/lib/greenworks-linux32.node`,
    linux64: `${paths.dep.greenworks.dir}/lib/greenworks-linux64.node`
};

const java8 = {
    //We need to allow for version switching between Java 8 and Java 18
    dir: {
        win32: {
            ia32: `${paths.dep.java8.dir}/win32`,
            x64: `${paths.dep.java8.dir}/win64`
        },
        darwin: {
            x64: `${paths.dep.java8.dir}/osx64`
        },
        linux: {
            ia32: `${paths.dep.java8.dir}/linux32`,
            x64: `${paths.dep.java8.dir}/linux64`
        }
    },
    url: {
        win32: `${JAVA_URL}/jre-${java8Version}-windows-i586.tar.gz`,
        win64: `${JAVA_URL}/jre-${java8Version}-windows-x64.tar.gz`,
        osx64: `${JAVA_URL}/jre-${java8Version}-macosx-x64.tar.gz`,
        linux32: `${JAVA_URL}/jre-${java8Version}-linux-i586.tar.gz`,
        linux64: `${JAVA_URL}/jre-${java8Version}-linux-x64.tar.gz`
    }
    // dir: {
    //   win32: {
    //     ia32: `${paths.dep.java.dir}/win32`,
    //     x64: `${paths.dep.java.dir}/win64`
    //   },
    //   darwin: {
    //     x64: `${paths.dep.java.dir}/osx64`
    //   },
    //   linux: {
    //     ia32: `${paths.dep.java.dir}/linux32`,
    //     x64: `${paths.dep.java.dir}/linux64`
    //   }
    // },
    // url: {
    //   win32: `${JAVA_URL}/jre-${javaVersion}-windows-i586.tar.gz`,
    //   win64: `${JAVA_URL}/jre-${javaVersion}-windows-x64.tar.gz`,
    //   osx64: `${JAVA_URL}/jre-${javaVersion}-macosx-x64.tar.gz`,
    //   linux32: `${JAVA_URL}/jre-${javaVersion}-linux-i586.tar.gz`,
    //   linux64: `${JAVA_URL}/jre-${javaVersion}-linux-x64.tar.gz`
    // }
};

const java18 = {
    dir: {
        win32: {
            ia32: `${paths.dep.java18.dir}/win32`,
            x64: `${paths.dep.java18.dir}/win64`
        },
        darwin: {
            x64: `${paths.dep.java18.dir}/osx64`
        },
        linux: {
            ia32: `${paths.dep.java18.dir}/linux32`,
            x64: `${paths.dep.java18.dir}/linux64`
        }
    },
    url: {
        win32: `${JAVA_URL}/jre-${java18Version}-windows-i586.tar.gz`,
        win64: `${JAVA_URL}/jre-${java18Version}-windows-x64.tar.gz`,
        osx64: `${JAVA_URL}/jre-${java18Version}-macosx-x64.tar.gz`,
        linux32: `${JAVA_URL}/jre-${java18Version}-linux-i586.tar.gz`,
        linux64: `${JAVA_URL}/jre-${java18Version}-linux-x64.tar.gz`
    }
}

const redistributables = {
    win32: `${paths.dep.steamworksSdk.dir}/sdk/redistributable_bin/steam_api.dll`,
    win64: `${paths.dep.steamworksSdk.dir}/sdk/redistributable_bin/win64/steam_api64.dll`,
    osx32: `${paths.dep.steamworksSdk.dir}/sdk/redistributable_bin/osx32/libsteam_api.dylib`,
    linux32: `${paths.dep.steamworksSdk.dir}/sdk/redistributable_bin/linux32/libsteam_api.so`,
    linux64: `${paths.dep.steamworksSdk.dir}/sdk/redistributable_bin/linux64/libsteam_api.so`
};

const licenses = path.join(paths.build.static.dir, 'licenses.txt');

const licenseOverrides = {
    'assert-plus': {
        license: 'MIT',
        source: 'README.md'
    },
    bl: {
        license: 'MIT',
        source: 'README.md'
    },
    jsonpointer: {
        license: 'MIT',
        source: 'README.md'
    }
};


const onError = function (error) {
    gutil.log(`Error:  ${error.name}`);
    gutil.log(` File:  ${error.filename.replace(process.cwd() + path.sep, '')}  @ Line ${error.location.first_line}, Cols ${error.location.first_column} to ${error.location.last_column}`);
    gutil.log(` Desc:  ${error.message}`);

    let _code = error.code.split("\n");
    const _code_begin = Math.max(0, error.location.first_line - 3);
    const _code_end = Math.min(_code.length, error.location.first_line + 3);
    _code = _code.slice(_code_begin, _code_end);


    gutil.log(" Code:");
    for (let index = 0; index < _code.length; index++) {
        var _source_line = _code[index];
        var _line = `  ${_code_begin + index + 1}`;
        if ((_code_begin + index) === error.location.first_line) {
            _line += ">";
        } else {
            _line += ":";
        }
        _line += `   ${_source_line}`;
        gutil.log(_line);
    }
    return process.exit(1);
};

const onWarning = error => gutil.log("Warning: " + error.message);

// gulp.task('default', ['run']);
gulp.task('default', () => run());

// gulp.task('bootstrap', ['greenworks', 'java']);
gulp.task('bootstrap', () => {
    return async.eachSeries(['greenworks', 'java'], (task, callback) => gulp.start(task, callback));
});

// gulp.task('build', ['build-hash', 'js', 'jade', 'less', 'copy', 'acknowledge']);
gulp.task('build', () => {
    return async.series([
        'build-hash',
        'js',
        'jade',
        'less',
        'copy',
        'acknowledge'
    ], (task, callback) => gulp.start(task, callback));
});

gulp.task('build-hash', function () {
    build_hash = cp.execSync('git rev-parse --short HEAD', {encoding: 'utf8'}).trim();
    // Write a js module containing the latest git short-hash for the launcher to include
    const buildHashJS = `exports.buildHash = '${build_hash}';`;
    fs.writeFileSync(path.join(paths.build.lib.dir, "buildHash.js"), buildHashJS);
    return console.log(`BUILD HASH: ${build_hash}`);
});

gulp.task('js', () => gulp.src(paths.src.glob).pipe(plugins.sourcemaps.write()).pipe(gulp.dest(paths.build.lib.dir)));

// gulp.task('electron-packager', ['build', 'acknowledge'], function (callback) {
gulp.task('electron-packager', function (callback) {
    async.series(['build', 'acknowledge'], function (task, callback) {
        return gulp.start(task, callback);
    });
    const packager = require('electron-packager');

    return packager({
            dir: paths.build.dir,
            out: 'dist',
            name: 'starmade-launcher',
            platform: targetPlatform,
            arch: targetArch,
            version: electronVersion,
            icon: paths.res.icon,
            overwrite: true,
            asar: true,

            // The launcher's autoupdate does not replace the executable,
            // meaning it is counterproductive to include the launcher version.
            // including the build hash, however, could be useful.

            'app-category-type': 'public.app-category.games',
            'version-string': {
                FileDescription: `StarMade Launcher (build ${build_hash})`,
                CompanyName: 'Schine GmbH',
                LegalCopyright: 'Copyright (C) 2016 Schine GmbH',
                ProductName: 'StarMade Launcher',
                OriginalFilename: 'starmade-launcher.exe'
            }
        }
        , callback);
});

gulp.task('greenworks', () => plugins.download(GREENWORKS_URL + `/greenworks-v${greenworksVersion}-starmade-electron-${electronVersion}.zip`)
    .pipe(plugins.unzip())
    .pipe(gulp.dest(paths.dep.greenworks.dir)));

const javaTasks = [];

const downloadJava8Task = platform => (function () {
    console.log(`Testing java downloading: platform ${platform}`);
    return plugins.download(java8.url[platform])
        .pipe(plugins.gunzip())
        .pipe(untar())
        .pipe(gulp.dest(path.join(paths.dep.java8.dir, platform)));
});

const downloadJava18Task = platform => (function () {
    console.log(`Testing java downloading: platform ${platform}`);
    return plugins.download(java18.url[platform])
        .pipe(plugins.gunzip())
        .pipe(untar())
        .pipe(gulp.dest(path.join(paths.dep.java18.dir, platform)));
});

for (platform in java8.url) {
    var url = java8.url[platform];
    taskName = `java8-${platform}`;
    gulp.task(taskName, downloadJava8Task(platform));
    javaTasks.push(taskName);
}

for (platform in java18.url) {
    var url = java18.url[platform];
    taskName = `java-${platform}`;
    gulp.task(taskName, downloadJava18Task(platform));
    javaTasks.push(taskName);
}

// gulp.task('java', javaTasks);
gulp.task('java', () => async.series(javaTasks, (task, callback) => gulp.start(task, callback)));

gulp.task('jade', () => gulp.src(paths.static.jade.glob)
    .pipe(plugins.jade({
        pretty: true
    })).pipe(wiredep())
    .pipe(gulp.dest(paths.build.static.dir)));

gulp.task('less', () => gulp.src(paths.static.styles.main)
    .pipe(plugins.less())
    .pipe(gulp.dest(paths.build.static.styles.dir)));

const copyTasks = [
    'copy-bower-components',
    'copy-package',
    'copy-static-entries',
    'copy-static-fonts',
    'copy-static-images'
];

gulp.task('copy-bower-components', () => gulp.src(paths.bowerComponents.glob)
    .pipe(gulp.dest(path.join(paths.build.dir, 'bower_components'))));

gulp.task('copy-package', () => gulp.src(paths.package)
    .pipe(gulp.dest(paths.build.dir)));

gulp.task('copy-static-entries', () => gulp.src(paths.static.entries)
    .pipe(gulp.dest(paths.build.static.dir)));

gulp.task('copy-static-fonts', () => gulp.src(paths.static.fonts.glob)
    .pipe(gulp.dest(path.join(paths.build.static.dir, 'fonts'))));

gulp.task('copy-static-images', () => gulp.src(paths.static.images.glob)
    .pipe(gulp.dest(path.join(paths.build.static.dir, 'images'))));

const copyModuleTask = name => (function () {
    const src = path.join(paths.nodeModules.dir, name, '**/*');
    const dest = path.join(paths.build.dir, 'node_modules', name);
    return gulp.src(src)
        .pipe(gulp.dest(dest));
});

const acknowledgeTasks = [
    'acknowledge-clear',
    'acknowledge-electron',
    'acknowledge-bebas-neue',
    'acknowledge-ubuntu',
    // 'acknowledge-java-8',
    // 'acknowledge-java-18',
    // 'acknowledge-java-8-thirdparty',
    // 'acknowledge-java-18-thirdparty',
    // 'acknowledge-java-8-thirdparty-javafx',
    // 'acknowledge-java-18-thirdparty-javafx',
    'acknowledge-greenworks'
];

gulp.task('acknowledge-clear', callback => fs.unlink(licenses, function (err) {
    if (err) {
        return mkdirp(paths.build.static.dir, callback);
    } else {
        return callback();
    }
}));

gulp.task('acknowledge-starmade', () => {return async.series(['acknowledge-clear'], (task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(paths.res.licenses.dir, 'starmade'), function (err, contents) {
    const data = contents + '\n' +
        'This application contains third-party libraries and fonts in accordance with the following\nlicenses:\n' +
        '--------------------------------------------------------------------------------\n\n';
    return fs.appendFile(licenses, data, callback);
}));

gulp.task('acknowledge-electron', () => {return async.series(['acknowledge-clear', 'acknowledge-starmade'], (task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(paths.res.licenses.dir, 'electron'), function (err, data) {
    if (err) {
        return callback(err);
    }
    data = 'electron\n' +
        '--------------------------------------------------------------------------------\n' +
        data.toString() + '\n';
    return fs.appendFile(licenses, data, callback);
}));

gulp.task('acknowledge-bebas-neue',  () => {return async.series(['acknowledge-clear', 'acknowledge-starmade'], (task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(paths.res.licenses.dir, 'bebas_neue'), function (err, data) {
    if (err) {
        return callback(err);
    }
    data = 'bebas neue font\n' +
        '--------------------------------------------------------------------------------\n' +
        data.toString() + '\n';
    return fs.appendFile(licenses, data, callback);
}));

gulp.task('acknowledge-ubuntu', () => {return async.series(['acknowledge-clear', 'acknowledge-starmade'], (task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(paths.res.licenses.dir, 'ubuntu'), function (err, data) {
    if (err) {
        return callback(err);
    }
    data = 'ubuntu fonts\n' +
        '--------------------------------------------------------------------------------\n' +
        data.toString() + '\n';
    return fs.appendFile(licenses, data, callback);
}));

gulp.task('acknowledge-java-8', () => {return async.series(['acknowledge-clear', 'acknowledge-starmade'], (task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(java8.dir[process.platform][process.arch], util.getJreDirectory(java8Version), 'LICENSE'), function (err, data) {
    if (err) {
        return callback(err);
    }
    data = 'java\n' +
        '--------------------------------------------------------------------------------\n' +
        data.toString() + '\n';
    return fs.appendFile(licenses, data, callback);
}));
gulp.task('acknowledge-java-18', () => {return async.series(['acknowledge-clear', 'acknowledge-starmade'], (task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(java18.dir[process.platform][process.arch], util.getJreDirectory(java18Version), 'LICENSE'), function (err, data) {
    if (err) {
        return callback(err);
    }
    data = 'java\n' +
        '--------------------------------------------------------------------------------\n' +
        data.toString() + '\n';
    return fs.appendFile(licenses, data, callback);
}));

gulp.task('acknowledge-java-8-thirdparty', () => {return async.series(['acknowledge-clear', 'acknowledge-starmade', 'acknowledge-java-8'], (task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(java8.dir[process.platform][process.arch], util.getJreDirectory(java8Version), 'THIRDPARTYLICENSEREADME.txt'), function (err, data) {
    if (err) {
        return callback(err);
    }
    data = 'java third party\n' +
        '--------------------------------------------------------------------------------\n' +
        data.toString() + '\n';
    return fs.appendFile(licenses, data, callback);
}));

gulp.task('acknowledge-java-18-thirdparty', () => {return async.series(['acknowledge-clear', 'acknowledge-starmade', 'acknowledge-java-18'], (task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(java18.dir[process.platform][process.arch], util.getJreDirectory(java18Version), 'THIRDPARTYLICENSEREADME.txt'), function (err, data) {
    if (err) {
        return callback(err);
    }
    data = 'java third party\n' +
        '--------------------------------------------------------------------------------\n' +
        data.toString() + '\n';
    return fs.appendFile(licenses, data, callback);
}));

gulp.task('acknowledge-java-8-thirdparty-javafx',  () => {return async.series(['acknowledge-clear', 'acknowledge-starmade', 'acknowledge-java-8', 'acknowledge-java-8-thirdparty'], (task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(java8.dir[process.platform][process.arch], util.getJreDirectory(java8Version), 'THIRDPARTYLICENSEREADME-JAVAFX.txt'), function (err, data) {
    if (err) {
        return callback(err);
    }
    data = 'java third party javafx\n' +
        '--------------------------------------------------------------------------------\n' +
        data.toString() + '\n';
    return fs.appendFile(licenses, data, callback);
}));

gulp.task('acknowledge-java-18-thirdparty-javafx', () => {return async.series(['acknowledge-clear', 'acknowledge-starmade', 'acknowledge-java-18', 'acknowledge-java-18-thirdparty'], (task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(java18.dir[process.platform][process.arch], util.getJreDirectory(java18Version), 'THIRDPARTYLICENSEREADME-JAVAFX.txt'), function (err, data) {
    if (err) {
        return callback(err);
    }
    data = 'java third party javafx\n' +
        '--------------------------------------------------------------------------------\n' +
        data.toString() + '\n';
    return fs.appendFile(licenses, data, callback);
}));

gulp.task('acknowledge-greenworks', () => {return async.series(['acknowledge-clear', 'acknowledge-starmade'],(task, callback) => gulp.start(task, callback));}, callback => fs.readFile(path.join(paths.res.licenses.dir, 'greenworks'), function (err, data) {
    if (err) {
        return callback(err);
    }
    data = 'greenworks\n' +
        '--------------------------------------------------------------------------------\n' +
        data.toString() + '\n';
    return fs.appendFile(licenses, data, callback);
}));

var acknowledgeModuleTask = function (name, dir) {
    if (dir == null) {
        ({
            dir
        } = paths.nodeModules);
    }
    const modulePkg = require(path.resolve(path.join(dir, name, 'package.json')));

    // Acknowledge licenses of this module's dependencies
    for (var depName in modulePkg.dependencies) {
        var acknowledgeTaskName = `acknowledge-module-${depName}`;
        if (acknowledgeTasks.indexOf(acknowledgeTaskName) !== -1) {
            continue;
        }

        // Find where the module is at
        var depModulesDir = path.resolve(path.join(dir, name, 'node_modules'));
        while (!fs.existsSync(path.join(depModulesDir, depName)) && (depModulesDir !== path.resolve(paths.nodeModules.dir))) {
            depModulesDir = path.resolve(path.join(depModulesDir, '..', '..'));
        }

        gulp.task(acknowledgeTaskName, () => {return async.series(['acknowledge-clear', 'acknowledge-starmade'], (task, callback) => gulp.start(task, callback));}, acknowledgeModuleTask(depName, depModulesDir));
        acknowledgeTasks.push(acknowledgeTaskName);
    }

    return function (callback) {
        const moduleLicense = path.join(dir, name, 'LICENSE');
        const moduleLicenseMIT = path.join(dir, name, 'LICENSE-MIT');
        const moduleLicenseMd = path.join(dir, name, 'LICENSE.md');
        const moduleLicenseLower = path.join(dir, name, 'license');
        const moduleLicence = path.join(dir, name, 'LICENCE');

        let data = `${modulePkg.name}\n` +
            '--------------------------------------------------------------------------------\n';

        if (fs.existsSync(moduleLicense)) {
            return fs.readFile(moduleLicense, function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        } else if (fs.existsSync(moduleLicenseMIT)) {
            return fs.readFile(moduleLicenseMIT, function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        } else if (fs.existsSync(moduleLicenseMd)) {
            return fs.readFile(moduleLicenseMd, function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        } else if (fs.existsSync(moduleLicenseLower)) {
            return fs.readFile(moduleLicenseLower, function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        } else if (fs.existsSync(moduleLicence)) {
            return fs.readFile(moduleLicence, function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        } else if (fs.existsSync(path.join(paths.res.licenses.dir, name))) {
            return fs.readFile(path.join(paths.res.licenses.dir, name), function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        } else if (licenseOverrides[modulePkg.name] != null) {
            return fs.readFile(path.join(dir, name, licenseOverrides[modulePkg.name].source), function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += `License: ${licenseOverrides[modulePkg.name].license}\n`;
                data += `According to the file ${licenseOverrides[modulePkg.name].source} from the module's repository, which is included\nbelow:\n\n`;
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        } else {
            if (modulePkg.license == null) {
                return callback(`No license found for ${modulePkg.name}: ${dir}`);
            }

            data += `\nLicense: ${modulePkg.license}\n`;
            data += "According to data from package.json; the author of the module did not include a license file.\n\n";
            return fs.appendFile(licenses, data, callback);
        }
    };
};

var acknowledgeBowerModuleTask = function (name) {
    const modulePkg = require(path.resolve(path.join(paths.bowerComponents.dir, name, 'bower.json')));

    // Acknowledge licenses of this module's dependencies
    for (var depName in modulePkg.dependencies) {
        var acknowledgeTaskName = `acknowledge-bower-module-${depName}`;
        if (acknowledgeTasks.indexOf(acknowledgeTaskName) !== -1) {
            continue;
        }
        gulp.task(acknowledgeTaskName, ['acknowledge-clear', 'acknowledge-starmade'], acknowledgeBowerModuleTask(depName));
        acknowledgeTasks.push(acknowledgeTaskName);
    }

    return function (callback) {
        const moduleLicense = path.join(paths.bowerComponents.dir, name, 'LICENSE');
        const moduleLicenseLower = path.join(paths.bowerComponents.dir, name, 'license');
        const moduleLicence = path.join(paths.bowerComponents.dir, name, 'LICENCE');

        let data = `${modulePkg.name}\n` +
            '--------------------------------------------------------------------------------\n';

        if (fs.existsSync(moduleLicense)) {
            return fs.readFile(moduleLicense, function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        } else if (fs.existsSync(moduleLicenseLower)) {
            return fs.readFile(moduleLicenseLower, function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        } else if (fs.existsSync(moduleLicence)) {
            return fs.readFile(moduleLicence, function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        } else {
            return fs.readFile(path.join(paths.res.licenses.dir, name), function (err, contents) {
                if (err) {
                    return callback(err);
                }
                data += contents.toString() + '\n\n';
                return fs.appendFile(licenses, data, callback);
            });
        }
    };
};

// Create copy tasks for each non-development dependencies
// Also create tasks to add their license contents to the licenses file
for (name in pkg.dependencies) {
    var copyTaskName = `copy-module-${name}`;
    acknowledgeTaskName = `acknowledge-module-${name}`;
    gulp.task(copyTaskName, copyModuleTask(name));
    gulp.task(acknowledgeTaskName, () => {return async.series(['acknowledge-clear', 'acknowledge-starmade'], (task, callback) => gulp.start(task, callback))}, acknowledgeModuleTask(name));
    copyTasks.push(copyTaskName);
    acknowledgeTasks.push(acknowledgeTaskName);
}

// Create tasks for each Bower dependency to add their license contents to the
// licenses file
for (name in bower.dependencies) {
    acknowledgeTaskName = `acknowledge-bower-module-${name}`;
    gulp.task(acknowledgeTaskName, () => {return async.series(['acknowledge-clear', 'acknowledge-starmade'],(task, callback) => gulp.start(task, callback))}, acknowledgeBowerModuleTask(name));
    acknowledgeTasks.push(acknowledgeTaskName);
}

gulp.task('copy', copyTasks);
gulp.task('acknowledge', acknowledgeTasks);

gulp.task('package', () => {return async.series(['build', 'electron-packager', 'package-greenworks', 'package-java', 'package-redistributables', 'package-steam-appid'],(task, callback) => gulp.start(task, callback));});

const packageGreenworksTasks = [
    'electron-packager'
];

const packageGreenworksNativeTask = platform => (function () {
    let os = platform.slice(0, -2);
    let arch = platform.slice(-2);

    switch (os) {
        case 'osx':
            os = 'darwin';
            break;
        case 'win':
            os = 'win32';
            break;
    }

    switch (arch) {
        case '32':
            arch = 'ia32';
            break;
        case '64':
            arch = 'x64';
            break;
    }

    if (targetPlatform !== 'all') {
        if (os !== targetPlatform) {
            return;
        }
    }

    if (targetArch !== 'all') {
        if (arch !== targetArch) {
            return;
        }
    }

    return gulp.src(greenworks[platform])
        .pipe(gulp.dest(path.join(paths.dist.platform[os][arch], 'dep', 'greenworks', 'lib')));
});

for (platform in greenworks) {
    taskName = `package-greenworks-${platform}`;
    gulp.task(taskName, ['electron-packager'], packageGreenworksNativeTask(platform));
    packageGreenworksTasks.push(taskName);
}

gulp.task('package-greenworks', packageGreenworksTasks, () => gulp.src(paths.dep.greenworks.entry)
    .pipe(gulp.dest(path.join(paths.dist.platform.win32.ia32, 'dep', 'greenworks')))
    .pipe(gulp.dest(path.join(paths.dist.platform.win32.x64, 'dep', 'greenworks')))
    .pipe(gulp.dest(path.join(paths.dist.platform.linux.ia32, 'dep', 'greenworks')))
    .pipe(gulp.dest(path.join(paths.dist.platform.linux.x64, 'dep', 'greenworks')))
    .pipe(gulp.dest(path.join(paths.dist.platform.darwin.x64, 'dep', 'greenworks'))));

const packageJavaTasks = [
    'electron-packager'
];

const packageJava8Task = (platform, arch) => (function () {
    const filter = plugins.filter('**/*/bin/*');
    let javaDir = path.join(java8.dir[platform][arch], util.getJreDirectory(java8Version, platform));
    if (platform === 'darwin') {
        javaDir = path.join(javaDir, '..', '..');
    }

    console.log(`JAVA 8 DIRECTORY: ${javaDir}, Java Version: ${java8Version}`);

    if (targetPlatform !== 'all') {
        if (platform !== targetPlatform) {
            return;
        }
    }

    if (targetArch !== 'all') {
        if (arch !== targetArch) {
            return;
        }
    }

    return gulp.src(`${javaDir}/**/*`, {base: java.dir[platform][arch]})
        .pipe(filter)
        .pipe(plugins.chmod(755))
        .pipe(filter.restore())
        .pipe(gulp.dest(path.join(paths.dist.platform[platform][arch], 'dep', 'java')));
});

const packageJava18Task = (platform, arch) => (function () {
    const filter = plugins.filter('**/*/bin/*');
    let javaDir = path.join(java18.dir[platform][arch], util.getJreDirectory(java18Version, platform));
    if (platform === 'darwin') {
        javaDir = path.join(javaDir, '..', '..');
    }

    console.log(`JAVA 18 DIRECTORY: ${javaDir}, Java Version: ${java18Version}`);

    if (targetPlatform !== 'all') {
        if (platform !== targetPlatform) {
            return;
        }
    }

    if (targetArch !== 'all') {
        if (arch !== targetArch) {
            return;
        }
    }

    return gulp.src(`${javaDir}/**/*`, {base: java18.dir[platform][arch]})
        .pipe(filter)
        .pipe(plugins.chmod(755))
        .pipe(filter.restore())
        .pipe(gulp.dest(path.join(paths.dist.platform[platform][arch], 'dep', 'java')));
});

for (platform in java8.dir) {
    for (arch in java8.dir[platform]) {
        taskName = `package-java-${platform}-${arch}`;
        gulp.task(taskName, ['electron-packager'], packageJava8Task(platform, arch));
        packageJavaTasks.push(taskName);
    }
}

for (platform in java18.dir) {
    for (arch in java18.dir[platform]) {
        taskName = `package-java-${platform}-${arch}`;
        gulp.task(taskName, ['electron-packager'], packageJava18Task(platform, arch));
        packageJavaTasks.push(taskName);
    }
}

gulp.task('package-java', packageJavaTasks);

const packageRedistributablesTasks = [
    'electron-packager'
];

const packageRedistributablesTask = platform => (function () {
    let os = platform.slice(0, -2);
    arch = platform.slice(-2);

    switch (os) {
        case 'osx':
            os = 'darwin';
            break;
        case 'win':
            os = 'win32';
            break;
    }

    switch (arch) {
        case '32':
            if (os === 'darwin') {
                // Place the 32-bit OS X binary in the 64-bit distribution
                arch = 'x64';
            } else {
                arch = 'ia32';
            }
            break;
        case '64':
            arch = 'x64';
            break;
    }

    if (targetPlatform !== 'all') {
        if (os !== targetPlatform) {
            return;
        }
    }

    if (targetArch !== 'all') {
        if (arch !== targetArch) {
            return;
        }
    }

    return gulp.src(redistributables[platform])
        .pipe(gulp.dest(path.join(paths.dist.platform[os][arch], 'dep', 'greenworks', 'lib')));
});

for (platform in redistributables) {
    taskName = `package-redistributables-${platform}`;
    gulp.task(taskName, ['electron-packager'], packageRedistributablesTask(platform));
    packageRedistributablesTasks.push(taskName);
}

gulp.task('package-redistributables', packageRedistributablesTasks);

gulp.task('package-steam-appid', ['electron-packager'], () => gulp.src(paths.steamAppid)
    .pipe(gulp.dest(paths.dist.platform.win32.ia32))
    .pipe(gulp.dest(paths.dist.platform.win32.x64))
    .pipe(gulp.dest(paths.dist.platform.linux.ia32))
    .pipe(gulp.dest(paths.dist.platform.linux.x64))
    .pipe(gulp.dest(paths.dist.platform.darwin.x64)));

gulp.task('run', function () {
    let app;
    const appDir = paths.dist.platform[process.platform][process.arch];
    if (process.platform === 'darwin') {
        app = path.join(appDir, 'Electron');
    } else {
        app = path.join(appDir, 'starmade-launcher');
        if (process.platform === 'win32') {
            app += '.exe';
        }
    }
    app = path.resolve(app);

    spawn(app, [], {
            cwd: appDir,
            stdio: 'inherit'
        }
    );

});
