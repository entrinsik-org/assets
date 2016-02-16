'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var es = require('event-stream');
var semver = require('semver');
var util = require('util');
var vfs = require('vinyl-fs');

/**
 * Finds the location of a bower library relative to a bower.json file. Uses .bowerrc if present
 * @param bowerJsonPath {String}
 * @returns {string} a full path to the bower library directory
 */
function bowerDirectory(bowerJsonPath) {
    // accept path to bower.json or just its folder
    var bowerFolder = fs.statSync(bowerJsonPath).isDirectory() ? bowerJsonPath : path.dirname(bowerJsonPath);
    var bowerrc = path.resolve(bowerFolder, '.bowerrc');
    var libraryFolder = null;

    if (fs.existsSync(bowerrc)) {
        libraryFolder = JSON.parse(fs.readFileSync(bowerrc)).directory;
    }
    libraryFolder = libraryFolder || 'bower_components';

    // in case the folder isnt absolute
    return path.resolve(bowerFolder, libraryFolder);
}

/**
 * conditionally appends 'bower.json' to a directory path
 * @param bowerJsonPath {String}
 * @returns {String}
 */
function bowerJson(bowerJsonPath) {
    var stats = fs.statSync(bowerJsonPath);
    if (stats.isFile()) {
        return bowerJsonPath;
    }
    var newPath = path.resolve(bowerJsonPath, 'bower.json');
    if (fs.existsSync(newPath)) {
        return newPath;
    }

    newPath = path.resolve(bowerJsonPath, 'package.json');
    if (fs.existsSync(newPath)) {
        return newPath;
    }

    throw new Error('ENOENT', 'bower.json or package.json not found at path ' + bowerJsonPath);
}

/**
 * Returns an array of full dependency paths from a bower.json file
 *
 * @param {string} bowerJsonPath a path to a bower.json file
 * @param {string=} libraryFolder an optional path to the library folder.
 * @return {{}[]} an array of dependency objects including name, range and path
 */
function dependencies(bowerJsonPath, libraryFolder) {
    try {
        bowerJsonPath = bowerJson(bowerJsonPath);
        var bower = JSON.parse(fs.readFileSync(bowerJsonPath));
        libraryFolder = libraryFolder || bowerDirectory(bowerJsonPath);

        // expand deps to include sub-deps
        return _(bower.dependencies)
            .map(function (value, key) {
                var depBowerJsonPath = bowerJson(path.resolve(libraryFolder, key));
                var deps = dependencies(depBowerJsonPath, libraryFolder);

                deps.push({
                    name: key,
                    range: value,
                    path: depBowerJsonPath
                });
                return deps;
            })
            .flatten()
            .value();

    } catch (e) {
        return [];
    }
}

/**
 * Returns a bower descriptor for the library at the specified path. it is assumed that a valid bower.json file
 * exists in directory
 * @param libraryPath {String} the path to the bower library.
 */
function descriptor(libraryPath) {
    var bowerJsonPath = bowerJson(libraryPath);
    return JSON.parse(fs.readFileSync(bowerJsonPath));
}

/**
 * Returns a bower descriptor for the library at the specified path. it is assumed that a valid bower.json file
 * exists in directory
 * @param libraryPath {String} the path to the bower library.
 */
function mainJS(libraryPath) {
    var bowerJsonPath = bowerJson(libraryPath);
    var desc = descriptor(bowerJsonPath);
    var main = _.isArray(desc.main) ? desc.main[0] : desc.main;
    return path.resolve(path.dirname(bowerJsonPath), main);
}

/**
 * Returns an array of full dependency paths from a bower.json file
 *
 * @param bowerJsonPath {String || []} a path to a bower.json file
 * @param libraryFolder
 * @return {[]} an array of dependency objects including name, range and path
 */
function dependencyFiles(bowerJsonPath, libraryFolder) {
    if (!_.isArray(bowerJsonPath)) {
        bowerJsonPath = [bowerJsonPath];
    }
    try {
        var results = [];
        _.forEach(bowerJsonPath, function (p) {
            try {
                bowerJsonPath = bowerJson(p);
                var bower = JSON.parse(fs.readFileSync(bowerJsonPath));
                libraryFolder = libraryFolder || bowerDirectory(bowerJsonPath);
                _.forEach(bower.dependencies, function (value, key) {
                    var bp = bowerJson(path.resolve(libraryFolder, key));
                    var subDeps = dependencyFiles(bp, libraryFolder);
                    _.forEach(subDeps, function (value) {
                        results.push(value);
                    });
                    results.push(mainJS(bp));
                });
            } catch (e) {
                // do nothing
            }
        });
        return results;
    } catch (e) {
        return [];
    }
}

/**
 * Returns a vinyl fs stream comprised of the file, or files, specified by the "main" bower.json property
 * @param libraryPath
 * @return {*}
 */
function mainStream(libraryPath) {
    var bowerJsonPath = bowerJson(libraryPath);
    var desc = descriptor(bowerJsonPath);
    return desc.main ? vfs.src(desc.main, {cwd: path.dirname(bowerJsonPath)}) : es.readArray([]);
}

/**
 * Gathers a an array of files from a bower.json's main property
 * @param {string} libraryPath the library path
 * @param {function} callback
 */
function mainFiles(libraryPath, callback) {
    mainStream(libraryPath)
        .pipe(es.writeArray(callback));
}

/**
 * Returns a stream of paths to the bower.json files of a component's dependencies
 * @param bowerJsonPath
 */
function dependencyStream(bowerJsonPath) {
    var deps;

    bowerJsonPath = util.isArray(bowerJsonPath) ? bowerJsonPath : [bowerJsonPath];
    deps = _(bowerJsonPath)
        .map(function (bowerJson) {
            return dependencies(bowerJson);
        })
        .flatten()
        .value();
    return es.readArray(deps);
}

/**
 * Dedupes a stream of bower dependencies by choosing the newest version of each library. possible dependency mismatches are
 * logged.
 * @returns {*}
 */
function dedupingStream() {
    var deps = {};

    return es.through(
        function write(dep) {
            // parse the dependency descriptor
            var descriptor = JSON.parse(fs.readFileSync(dep.path));
            var existing = deps[dep.name];

            // havent seen you yet so add
            if (!existing) {
                deps[dep.name] = {name: dep.name, range: dep.range, version: descriptor.version, path: dep.path};
            } else if (existing && descriptor.version && existing.version && semver.gt(descriptor.version, existing.version)) {
                //TODO add back logging
                deps[dep.name] = {name: dep.name, range: dep.range, version: descriptor.version, path: dep.path};
            }
        }, function end() {
            var self = this;
            _.values(deps).forEach(function (value) {
                self.emit('data', value);
            });
            this.emit('end');
        }
    );
}

exports.bowerDirectory = bowerDirectory;
exports.dependencies = dependencies;
exports.descriptor = descriptor;
exports.mainJS = mainJS;
exports.mainStream = mainStream;
exports.mainFiles = mainFiles;
exports.dependencyStream = dependencyStream;
exports.dependencyFiles = dependencyFiles;
exports.dedupingStream = dedupingStream;