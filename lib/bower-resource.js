'use strict';

var util = require('util');
var Resource = require('./resource').Resource;
var es = require('event-stream');
var bu = require('./bower-utils');
var vfs = require('vinyl-fs');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var path = require('path');
var gulp = require('gulp');
var _ = require('lodash');

/**
 * A virtual resource based on a bower dependency tree. Dependencies and sub-dependencies are scanned and filtered
 * according to the filename's extension. For example, a bower resource with the name 'bower-scripts.js' will select
 * all 'main' file entries with a .js extension. Bower resources may contain more than one bower.json path expression
 * @param base
 * @param filename
 * @constructor
 */
function BowerResource(base, filename) {
    Resource.call(this, base, filename, 100);
    this.autoroute = true;
    this.files = [];
    this.opts = {};
    this.type = 'bower';
}

util.inherits(BowerResource, Resource);


/**
 * Adds a path to a bower.json file or a directory containing a bower or package.json file. The resource's paths will be
 * expanded to include any dependencies of the same type. Conflicting dependencies will be deduped to include the most
 * recent version of the library.
 * @example
 * <pre>
 *     var bowerScripts = new BowerResource('/bower_components', 'bower.min.js');
 *     bowerScripts.src('./bower.json');
 *     bowerScripts.select(function(err, resource){
 *         console.log(resource.paths);  // contains all .js dependencies
 *     });
 * </pre>
 * @param bowerJson
 */
BowerResource.prototype.src = function(bowerJson) {
    this.files.push(bowerJson);
    return this;
};

/**
 * Selects all bower dependencies
 * @param callback
 */
BowerResource.prototype.select = function (callback) {
    var self = this;

    // creates a stream of bower libraries and their versions
    bu.dependencyStream(this.files)

        // libraries -> deduped libraries
        .pipe(bu.dedupingStream())

        // deduped libs -> bower.json paths
        .pipe(es.mapSync(function(dep) {
            return dep.path;
        }))

        // bower.json file -> array of dependency main files
        .pipe(es.map(bu.mainFiles))

        // file array -> files
        .pipe(es.through(function(files) {
            files.forEach(this.emit.bind(this, 'data'));
        }))

        // files of any extension -> files of same extension
        .pipe(es.map(function (file, cb) {
            var stats = file.stat;
            self.lastModified = Math.max(self.lastModified, stats.mtime.getTime());
            if (path.extname(file.path) === '.'+self.extension) {
                cb(null, { url: path.join(self.base, path.basename(file.path)).split(path.sep).join('/'), file: file.path });
            } else {
                cb();
            }
        }))
        .pipe(es.writeArray(function (err, paths) {
            if (err) {
                callback(err);
            } else {
                self.paths = paths;
                callback(null, self);
            }
        }));
};

BowerResource.prototype.minifyStream = function (dest) {
    this.opts.read = true;
    return vfs.src(_.pluck(this.paths, 'file'), this.opts)
        .pipe(concat(this.filename))
        .pipe(uglify())
        .pipe(gulp.dest(dest));
};

exports.BowerResource = BowerResource;