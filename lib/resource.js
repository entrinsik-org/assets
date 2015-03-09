'use strict';

var fs = require('fs');
var vfs = require('vinyl-fs');
var path = require('path');
var su = require('./stream-utils');

function Resource(base, filename, priority) {
    this.base = base;
    this.filename = filename;
    this.extension = this.filename.split('.').pop();
    this.lastModified = 0;
    this.priority = priority || 0;
}

Resource.prototype.src = function(src, opts) {
    this.src = src;
    this.opts = opts || {};
};

Resource.prototype.sourceStream = function () {
    this.opts.read = false;
    var self = this;
    return vfs.src(this.src, this.opts)
        .pipe(su.paths(self.base, false, function (err, paths) {
            self.paths = paths;
        }));
};

Resource.prototype.select = function (callback) {
    var self = this;
    this.sourceStream()
        .pipe(su.lastMod(function (err, lastModified) {
            self.lastModified = lastModified;
        }))
        .on('end', function () {
            callback(null, self);
        });
};


Resource.prototype.targetStream = function (dest) {
    // locate the destination file and see if it needs updating
    var fileName = path.join(dest, this.filename);

    var isCurrent = fs.existsSync(fileName) && fs.statSync(fileName).mtime.getTime() > this.lastModified;

    return isCurrent ?
        vfs.src(fileName) :
        this.minifyStream(dest);
};

Resource.prototype.minify = function (opts, callback) {
    this.autoroute = true;
    var self = this;
    var dest = opts.folder;
    var base = opts[this.extension];

    this.targetStream(path.join(dest, base))
        .pipe(su.paths('/'+ base, opts.checksums, function (err, paths) {
            self.paths = paths;
        }))
        .on('end', function() {
            callback(null, self);
        });
};

exports.Resource = Resource;