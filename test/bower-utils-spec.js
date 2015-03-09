'use strict';

var path = require('path');
var butil = require('../lib/bower-utils');
var chai = require('chai');
var es = require('event-stream');
var should = chai.should();
var sinon = require('sinon');
chai.use(require('sinon-chai'));

describe('Bower Utils', function () {

    var testdata = path.join(__dirname, '../test-data');

    it('should not throw an error if bower.json is not found', function () {
        butil.dependencies(testdata + '/plugins/myplugin2').should.have.length(0);
    });

    it('should accept a directory containing bower.json when called directly', function () {
        var directory = testdata + '/plugins/myplugin/bower_components';
        var library = butil.bowerDirectory(testdata + '/plugins/myplugin');
        library.should.equal(directory);
    });

    it('should provide a dependency stream based on a string path to bower.json', function (done) {
        var count = 0;
        butil.dependencyStream(testdata + '/plugins/myplugin2/special-bower.json')
            .on('data', function (data) {
                should.exist(data.path);
                count++;
            })
            .on('end', function () {
                count.should.equal(3);
                done();
            });
    });

    it('should include sub-dependencies', function () {
        var files = butil.dependencies(testdata);
        var lodash = path.join(testdata, 'bower-components/lodash/bower.json');
        files.filter(function (dep) {
            return dep.path === lodash;
        }).should.have.length(1);
    });

    it('should include sub-dependencies in dependencyStream()', function (done) {
        butil.dependencyStream(testdata)
            .pipe(es.mapSync(function (item) {
                return item.path;
            }))
            .pipe(es.writeArray(function (err, paths) {
                if (err) return done(err);

                try {
                    paths.should.contain(path.join(testdata, 'bower-components/lodash/bower.json'));
                    done();
                } catch (err) {
                    done(err);
                }
            }))
            .on('error', done);
    });

    it('should provide a stream of files contained in main', function (done) {
        butil.mainStream(path.join(testdata, 'plugins/myplugin3/bower_components/ng-table'))
            .pipe(es.mapSync(function (descriptor) {
                return descriptor.path;
            }))
            .pipe(es.writeArray(function (err, array) {
                array.should.have.length(2);
                done();
            }));
    });

});