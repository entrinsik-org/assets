'use strict';

var util = require('util');
var Resource = require('./resource').Resource;
var vfs = require('vinyl-fs');
var ngTemplates = require('gulp-angular-templatecache');
var uglify = require('gulp-uglify');
var gulp = require('gulp');
var _ = require('lodash');
var su = require('./stream-utils');
var path = require('path');

function TemplateResource(base, filename, module) {
    Resource.call(this, base, filename);
    this.extension = 'html';
    this.module = module;
    this.type = 'template';
}

util.inherits(TemplateResource, Resource);

TemplateResource.prototype.minifyStream = function(dest) {
    this.opts.read = true;
    return vfs.src(_.pluck(this.paths, 'file'), this.opts)
        .pipe(ngTemplates(this.filename, {module: this.module, root: this.base}))
        .pipe(uglify())
        .pipe(gulp.dest(dest));
};

TemplateResource.prototype.minify = function (opts, callback) {
    this.extension = 'js';
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


exports.TemplateResource = TemplateResource;