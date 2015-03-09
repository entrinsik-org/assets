'use strict';

var util = require('util');
var Resource = require('./resource').Resource;
var vfs = require('vinyl-fs');
var concat = require('gulp-concat');
var minifyCss = require('gulp-minify-css');
var gulp = require('gulp');
var _ = require('lodash');

function CssResource(base, filename) {
    Resource.call(this, base, filename);
    this.type = 'css';
}

util.inherits(CssResource, Resource);

CssResource.prototype.minifyStream = function (dest) {
    this.opts.read = true;
    return vfs.src(_.pluck(this.paths, 'file'), this.opts)
        .pipe(concat(this.filename))
        .pipe(minifyCss())
        .pipe(gulp.dest(dest));
};

exports.CssResource = CssResource;