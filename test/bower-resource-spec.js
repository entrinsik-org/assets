'use strict';

var BowerResource = require('../lib/bower-resource').BowerResource;
var fs = require('fs');
var path = require('path');
var chai = require('chai');
var should = chai.should();
var async = require('async');
var _ = require('lodash');

describe('Bower Resource', function () {
    var testdata = path.join(__dirname, '../test-data');

    it('should select bower dependencies', function (done) {
        var bu = new BowerResource('/', 'bower-scripts.js');
        bu.src(testdata + '/bower.json');
        bu.select(function (err, resource) {
            should.not.exist(err);
            should.exist(resource);
            resource.files[0].should.equal(testdata + '/bower.json');
            resource.paths.should.have.length(5);
            done();
        });
    });

    it('should default to "bower_components" if no directory is specified in bowerrc', function (done) {
        var bu = new BowerResource('/', 'bower-scripts.js');
        bu.src(testdata + '/plugins/myplugin/bower.json');
        bu.select(function (err, resource) {
            should.not.exist(err);
            resource.paths.should.have.length(2);
            resource.paths[0].file.should.contain(testdata + '/plugins/myplugin/bower_components');
            done();
        });
    });

    it('should accept a directory containing bower.json', function (done) {
        var bu = new BowerResource('/', 'bower-scripts.js');
        bu.src(testdata + '/plugins/myplugin');
        bu.select(function (err, resource) {
            should.not.exist(err);
            resource.paths.should.have.length(2);
            resource.paths[0].file.should.contain('bower_components');
            done();
        });
    });

    it('should skip a bower component if the .js file is missing', function (done) {
        var bu = new BowerResource('/', 'bower-scripts.js');
        bu.src(testdata + '/bower-with-missing-js.json');
        bu.select(function (err, resource) {
            resource.files[0].should.equal(testdata + '/bower-with-missing-js.json');
            resource.paths.should.have.length(5);
            done();
        });
    });

    it('should minimize bower dependencies', function (done) {
        this.timeout(50000);
        var bu = new BowerResource('/', 'bower-scripts.js');
        var outputFile = path.resolve(__dirname, '../dist/scripts/bower-scripts.js');
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
        fs.existsSync(outputFile).should.equal(false);
        bu.src(testdata + '/bower.json');
        bu.select(function (err, resource) {
            resource.minify({ folder: __dirname + '/../dist', js: 'scripts' }, function (err, resource) {
                should.not.exist(err);
                resource.paths.should.have.length(1);
                resource.paths[0].file.should.equal(outputFile);
                fs.exists(outputFile, function (exists) {
                    exists.should.equal(true);
                    done();
                });
            });
        });
    });

    it('should upgrade a dependency if a newer sem version is found', function (done) {
        var bu = new BowerResource('/', 'bower-scripts.js');
        bu.src(testdata + '/bower.json');
        bu.src(testdata + '/plugins/myplugin2/special-bower.json');
        bu.select(function (err, resource) {
            try {
                should.not.exist(err);
                resource.paths.should.have.length(5);
                resource.paths[0].file.should.contain('myplugin2/bower_components');
                resource.paths[1].file.should.contain('test-data/bower-components');
                resource.paths[2].file.should.contain('test-data/bower-components');
                resource.paths[3].file.should.contain('test-data/bower-components');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should ignore a dependency if a newer sem version exists', function (done) {
        var bu = new BowerResource('/', 'bower-scripts.js');
        bu.src(testdata + '/plugins/myplugin2/special-bower.json');
        bu.src(testdata + '/bower.json');
        bu.select(function (err, resource) {
            should.not.exist(err);
            resource.paths.should.have.length(5);
            resource.paths[0].file.should.contain('myplugin2/bower_components');
            resource.paths[1].file.should.contain('test-data/bower-components');
            resource.paths[2].file.should.contain('test-data/bower-components');
            resource.paths[3].file.should.contain('test-data/bower-components');
            done();
        });
    });


    it('should filter assets based on the resource extension', function (done) {
        var pluginHome, jsResource, cssResource;

        pluginHome = testdata + '/plugins/myplugin3';

        jsResource = new BowerResource('/', 'bower-scripts.js');
        jsResource.src(path.join(pluginHome, '/bower.json'));

        cssResource = new BowerResource('/', 'bower-css.css');
        cssResource.src(path.join(pluginHome , '/bower.json'));

        async.parallel([
            jsResource.select.bind(jsResource),
            cssResource.select.bind(cssResource)
        ], function(err, resources) {
            if (err) return done(err);

            resources[0].paths.should.have.length(2);
            _.pluck(resources[0].paths, 'file').should.have.members([
                path.join(pluginHome, 'bower_components/angular/angular.js'),
                path.join(pluginHome, 'bower_components/ng-table/ng-table.js')
            ]);

            resources[1].paths.should.have.length(1);
            _.pluck(resources[1].paths, 'file').should.have.members([
                path.join(pluginHome, 'bower_components/ng-table/ng-table.css')
            ]);
            done();
        });
    });
});