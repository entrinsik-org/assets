'use strict';

var should = require('chai').should();
var path = require('path');
var AssetBuilder = require('../lib/asset-builder').AssetBuilder;
var BowerResource = require('../lib/bower-resource').BowerResource;

describe('Asset Builder', function () {

    var testdata = path.join(__dirname, '../test-data');
    var bu;

    beforeEach(function () {
        bu = new BowerResource('/bower_components', 'bower.min.js');
    });

    it('should add bower components', function () {
        var ab = new AssetBuilder('/', bu);
        ab.bowerResources[0].files.should.have.length(0);
        ab.bower(testdata);
        ab.bowerResources[0].files.should.have.length(1);
    });

    it('should add script components', function () {
        var ab = new AssetBuilder('/', bu);
        ab.resources.should.have.length(0);
        ab.script().src(testdata + '/scripts/**/*.js', {cwd: path.join(__dirname, '..')});
        ab.resources.should.have.length(1);
        ab.resources[0].type.should.equal('script');
        ab.resources[0].filename.should.equal('scripts.min.js');
    });

    it('should add css components', function () {
        var ab = new AssetBuilder('/', bu);
        ab.css().src(testdata + '/styles/**/*.css', {base: path.join(__dirname, '..', 'public'), cwd: path.join(__dirname, '..')});
        ab.resources.should.have.length(1);
        ab.resources[0].type.should.equal('css');
        ab.resources[0].filename.should.equal('styles.min.css');
    });

    it('should add angular template components', function () {
        var ab = new AssetBuilder('/', bu);
        ab.template('informer').src('public/components/**/*.html', {cwd: path.join(__dirname, '..'), base: path.join(__dirname, '..', 'public')});
        ab.resources.should.have.length(1);
        ab.resources[0].type.should.equal('template');
        ab.resources[0].filename.should.equal('templates.min.js');
    });

    it('should return a stream of resources', function (done) {
        var ab = new AssetBuilder('/', bu);
        var count = 0;
        ab.script().src(testdata + '/scripts/**/*.js', {cwd: path.join(__dirname, '..')});
        ab.css().src(testdata + '/styles/**/*.css', {base: path.join(__dirname, '..', 'public'), cwd: path.join(__dirname, '..')});
        ab.template('informer').src('public/components/**/*.html', {cwd: path.join(__dirname, '..'), base: path.join(__dirname, '..', 'public')});
        ab.stream().on('data',function (resource) {
            should.exist(resource);
            count++;
        }).on('end', function () {
            count.should.equal(3);
            done();
        });
    });

    it('should provide a selecting stream', function (done) {
        var ab = new AssetBuilder('/', bu);
        var count = 0;
        ab.script().src(testdata + '/scripts/**/*.js', {cwd: path.join(__dirname, '..')});
        ab.css().src(testdata + '/styles/**/*.css', {base: path.join(__dirname, '..', 'public'), cwd: path.join(__dirname, '..')});
        ab.template('informer').src('public/components/**/*.html', {cwd: path.join(__dirname, '..'), base: path.join(__dirname, '..', 'public')});
        ab.stream()
            .pipe(ab.select())
            .on('data', function (data) {
                should.exist(data);
                count++;
            })
            .on('end', function (err) {
                should.not.exist(err);
                count.should.equal(3);
                done();
            });
    });


});