'use strict';

var should = require('chai').should();
var ScriptResource = require('../lib/script-resource').ScriptResource;
var path = require('path');
var fs = require('fs');

describe('JavaScript Resource', function () {

    var testdata = path.join(__dirname, '../test-data');
    var dist = __dirname + '/../dist';

    it('should select JavaScript dependencies', function (done) {
        var sr = new ScriptResource('/module', 'module-scripts.js');
        sr.src(testdata + '/scripts/**/*.js');
        sr.select(function (err, resource) {
            should.not.exist(err);
            should.exist(resource);
            resource.filename.should.equal('module-scripts.js');
            resource.paths.should.have.length(8);
            done();
        });
    });

    it('should minify script dependencies', function (done) {
        var sr = new ScriptResource('/module', 'module-scripts.js');
        sr.src(testdata + '/scripts/**/*.js');
        var outputFile = path.resolve(__dirname, '../dist/scripts/module-scripts.js');
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
        fs.existsSync(outputFile).should.equal(false);
        sr.select(function (err, resource) {
            resource.minify({ folder: dist, js: 'scripts', checksums: true }, function (err, resource) {
                should.not.exist(err);
                resource.paths.should.have.length(1);
                resource.paths[0].file.should.equal(outputFile);
                resource.paths[0].url.should.match(/^\/scripts\/module-scripts-/);
                fs.exists(outputFile, function (exists) {
                    exists.should.equal(true);
                    done();
                });
            });
        });
    });


});