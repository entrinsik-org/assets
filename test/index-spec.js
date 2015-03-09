'use strict';

var hapi = require('hapi');
var should = require('chai').should();
var path = require('path');

describe('Assets Plugin', function () {
    var server;
    var testdata = path.join(__dirname, '../test-data');
    var dist = __dirname + '/../dist';
    var assets = require('../');

    beforeEach(function () {
        server = new hapi.Server();
        server.connection({ labels: ['content']});
    });

    afterEach(function (next) {
        server.stop(function () {
            next();
        });
    });

    it('should register', function (done) {
        server.register({ register: assets.register, options: { minify: true, checksums: true, folder: dist, 'js': 'scripts', 'css': 'styles'}}, function () {
            server.start(function () {
                var plugin = server.plugins['ent-assets'];
                should.exist(plugin);
                should.exist(plugin.module);
                should.exist(plugin.assemble);
                should.exist(plugin.ngModules);
                plugin.module.should.be.a('function');
                plugin.assemble.should.be.a('function');
                plugin.ngModules.should.be.a('function');
                done();
            });
        });
    });

    it('should assemble and minify components', function (done) {
        server.register({ register: assets.register, options: { minify: true, checksums: true, folder: dist, 'js': 'scripts', 'css': 'styles'}}, function () {
            server.start(function () {
                var plugin = server.plugins['ent-assets'];
                var root = plugin.module('/');
                root.bower(testdata);
                root.script().src(testdata + '/js/**/*.js', {cwd: path.join(__dirname, '..')});
                root.css().src(testdata + '/styles/**/*.css', {base: path.join(__dirname, '..', 'public'), cwd: path.join(__dirname, '..')});
                root.template('informer').src('public/components/**/*.html', {cwd: path.join(__dirname, '..'), base: path.join(__dirname, '..', 'public')});
                plugin.ngModules('ui.router', 'ngAnimate', 'LocalStorageModule');
                plugin.ngModules(['myModule', 'myOtherModule']);
                var ng = plugin.ngModules();
                ng.should.be.an('array');
                ng.should.have.length(5);
                plugin.assemble(function (err, data) {
                    should.not.exist(err);
                    data.css.should.be.an('array');
                    data.js.should.be.an('array');
                    done();
                });
            });
        });
    });


    it('should assemble components without minification', function (done) {
        server.register({ register: assets.register, options: { minify: false, checksums: true, folder: dist, 'js': 'scripts', 'css': 'styles'}}, function () {
            server.start(function () {
                var plugin = server.plugins['ent-assets'];
                var root = plugin.module('/');
                root.bower(testdata);
                root.script().src(testdata + '/js/**/*.js', {cwd: path.join(__dirname, '..')});
                plugin.module('/').script().src(testdata + '/scripts/**/*.js', {cwd: path.join(__dirname, '..')});
                root.css().src(testdata + '/styles/**/*.css', {base: path.join(__dirname, '..', 'public'), cwd: path.join(__dirname, '..')});
                root.template('informer').src('public/components/**/*.html', {cwd: path.join(__dirname, '..'), base: path.join(__dirname, '..', 'public')});
                plugin.ngModules('ui.router', 'ngAnimate', 'LocalStorageModule');
                plugin.ngModules(['myModule', 'myOtherModule']);
                var ng = plugin.ngModules();
                ng.should.be.an('array');
                ng.should.have.length(5);
                plugin.assemble(function (err, data) {
                    should.not.exist(err);
                    data.css.should.be.an('array');
                    data.js.should.be.an('array');
                    done();
                });
            });
        });
    });


})
;