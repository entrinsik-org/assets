'use strict';

var should = require('chai').should();
var CssResource = require('../lib/css-resource').CssResource;
var path = require('path');
var fs = require('fs');

describe('CSS Resource', function () {

    var testdata = path.join(__dirname, '../test-data');
    var dist = __dirname + '/../dist';

    it('should select css dependencies', function (done) {
        var cr = new CssResource('/module', 'module-styles.css');
        cr.src(testdata + '/styles/**/*.css');
        cr.select(function (err, resource) {
            should.not.exist(err);
            should.exist(resource);
            resource.filename.should.equal('module-styles.css');
            resource.paths.should.have.length(2);
            done();
        });
    });

    it('should minify css dependencies', function (done) {
        var cr = new CssResource('/module', 'module-styles.css');
        cr.src(testdata + '/styles/**/*.css');
        var outputFile = path.resolve(__dirname, '../dist/styles/module-styles.css');
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
        fs.existsSync(outputFile).should.equal(false);
        cr.select(function (err, resource) {
            resource.minify({ folder: dist, css: 'styles', checksums: true }, function (err, resource) {
                should.not.exist(err);
                resource.paths.should.have.length(1);
                resource.paths[0].file.should.equal(outputFile);
                resource.paths[0].url.should.match(/^\/styles\/module-styles-.*.css/);
                fs.exists(outputFile, function (exists) {
                    exists.should.equal(true);
                    done();
                });
            });
        });
    });

    it('should use an existing minified file', function (done) {
        var cr = new CssResource('/module', 'module-styles.css');
        cr.src(testdata + '/styles/**/*.css');
        var outputFile = path.resolve(dist + '/styles/module-styles.css');
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
        fs.existsSync(outputFile).should.equal(false);
        cr.select(function (err, resource) {
            resource.minify({ folder: dist, css: 'styles', checksums: true }, function (err, resource) {
                should.not.exist(err);
                resource.paths.should.have.length(1);
                resource.paths[0].file.should.equal(outputFile);
                resource.paths[0].url.should.match(/^\/styles\/module-styles-.*.css/);
                var lastModified = resource.lastModified;
                fs.exists(outputFile, function (exists) {
                    exists.should.equal(true);
                    resource.minify({ folder: dist, css: 'styles', checksums: true }, function (err2, resource2) {
                        should.not.exist(err2);
                        lastModified.should.equal(resource2.lastModified);
                        done();
                    });
                });
            });
        });
    });
});