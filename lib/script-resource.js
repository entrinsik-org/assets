'use strict';

var util = require('util');
var Resource = require('./resource').Resource;
var vfs = require('vinyl-fs');
var concat = require('gulp-concat');
var ngAnnotate = require('gulp-ng-annotate');
var uglify = require('gulp-uglify');
var gulp = require('gulp');
var _ = require('lodash');

function ScriptResource(base, filename, priority) {
    Resource.call(this, base, filename, priority);
    this.type = 'script';
}

util.inherits(ScriptResource, Resource);

ScriptResource.prototype.minifyStream = function (dest) {
    this.opts.read = true;
    return vfs.src(_.pluck(this.paths, 'file'), this.opts)
        .pipe(concat(this.filename))
        .pipe(ngAnnotate())
        .pipe(uglify())
        .pipe(gulp.dest(dest));
};

exports.ScriptResource = ScriptResource;