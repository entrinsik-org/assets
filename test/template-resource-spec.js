'use strict';

var should = require('chai').should();
var TemplateResource = require('../lib/template-resource').TemplateResource;
var path = require('path');
var fs = require('fs');

describe('Template Resource', function () {

    var testdata = path.join(__dirname, '../test-data');
    var dist = __dirname + '/../dist';

    it('should select angular templates', function (done) {
        var tr = new TemplateResource('/module', 'module-templates.js', 'informer');
        tr.src(testdata + '/views/**/*.html');
        tr.select(function (err, resource) {
            should.not.exist(err);
            should.exist(resource);
            resource.filename.should.equal('module-templates.js');
            resource.paths.should.have.length(2);
            done();
        });
    });

    it('should minify html into a template cache script', function (done) {
        var tr = new TemplateResource('/module', 'module-templates.js', 'informer');
        tr.src(testdata + '/scripts/**/*.js');
        var outputFile = path.resolve(__dirname, '../dist/scripts/module-templates.js');
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
        fs.existsSync(outputFile).should.equal(false);
        tr.select(function (err, resource) {
            resource.minify({ folder: dist, js: 'scripts', checksums: true }, function (err, resource) {
                should.not.exist(err);
                resource.paths.should.have.length(1);
                resource.paths[0].file.should.equal(outputFile);
                resource.paths[0].url.should.equal('/scripts/module-templates-016c2745.js');
                fs.exists(outputFile, function (exists) {
                    exists.should.equal(true);
                    done();
                });
            });
        });
    });


});