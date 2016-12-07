'use strict';

var _ = require('lodash');
var es = require('event-stream');
var AssetBuilder = require('./asset-builder').AssetBuilder;
var BowerResource = require('./bower-resource').BowerResource;
var Bundle = require('./bundle').Bundle;
var Hostpage = require('./hostpage').Hostpage;
var modules = {};
var angularModules = [];

var bowerScripts = new BowerResource('/bower_components', 'bower.min.js');
var bowerStyles = new BowerResource('/bower_components', 'bower.min.css');

function module(moduleName, priority) {
    if (modules.hasOwnProperty(moduleName)) {
        return modules[moduleName];
    } else {
        var assetBuilder = new AssetBuilder(moduleName, [ bowerScripts, bowerStyles ]);
        assetBuilder._priority = priority;
        modules[moduleName] = assetBuilder;
        return assetBuilder;
    }
}

function resources() {
    return _(modules)
        .values()
        .pluck('resources')
        .flatten()
        .concat(bowerScripts)
        .concat(bowerStyles)
        .value();
}

function stream() {
    return es.readArray(resources());
}

function select() {
    return es.map(function (resource, callback) {
        resource.select(callback);
    });
}

function maybeMinify(options) {
    return es.map(function (resource, callback) {
        if (options.minify) {
            resource.minify(options, callback);
        } else {
            callback(null, resource);
        }
    });
}

function pruneEmptyResources() {
    return es.map(function (resource, callback) {
        if (resource.paths && resource.paths.length > 0) {
            callback(null, resource);
        } else {
            callback();
        }
    });
}

function assemble(options, callback) {
    options = options || {};
    if (_.isFunction(options)) {
        callback = options;
        options = { minify: false };
    }

    stream()
        .pipe(select())
        .pipe(pruneEmptyResources())
        .pipe(maybeMinify(options))
        .pipe(es.writeArray(function (err, resources) {
            if (err) {
                callback(err);
            } else {
                callback(null, _(resources).sortBy('priority').reverse().groupBy('extension').value());
            }
        }));
}

function ngModules(modules) {
    modules = _.isArray(modules) ? modules : arguments;
    if (modules.length > 0) {
        _.forEach(modules, function (module) {
            if (!_.contains(angularModules, module)) {
                angularModules.push(module);
            }
        });
    } else {
        return angularModules;
    }
}

function reset() {
    modules = {};
    angularModules = [];
    bowerScripts = new BowerResource('/bower_components', 'bower.min.js');
    bowerStyles = new BowerResource('/bower_components', 'bower.css');
}

exports.module = module;
exports.resources = resources;
exports.stream = stream;
exports.select = select;
exports.assemble = assemble;
exports.ngModules = ngModules;
exports.reset = reset;
exports.register = function (server, opts, next) {
    // reset modules for testing
    reset();

    function registerRoutes(resources) {
        var flattenedResources = _.flatten(_.values(resources));
        _.forEach(_.filter(flattenedResources, 'autoroute'), function (resource) {
            resource.paths.forEach(function (path) {
                server.log(['Asset Manager', 'server', 'debug', 'startup'], 'Adding route ' + path.url + ' -> ' + path.file);
                server.select('content').route({ method: 'GET', path: path.url, config: {auth: false, handler: { file: path.file }}});
            });
        });
        server.log(['Asset Manager', 'server', 'info', 'startup'], 'Exporting resources');
        server.expose('resources', resources);
    }

    function doAssemble(done) {
        server.log(['Asset Manager', 'server', 'info', 'startup'], 'Assembling assets...');
        assemble(opts, function (err, resources) {
            if (err) {
                server.log(['Asset Manager', 'server', 'info', 'startup'], 'Error during assembly: ' + err);
                return done(err);
            }
            registerRoutes(resources);
            server.expose('resources', resources);
            done(null, resources);
        });
    }

    server.log(['Asset Manager', 'server', 'info', 'startup'], 'Starting');
    server.expose('module', module);
    server.expose('assemble', doAssemble);
    server.expose('ngModules', ngModules);
    server.expose('bundle', (base, id) => new Bundle(base, id, opts));
    server.expose('hostpage', () => new Hostpage(opts));
    next();
};

exports.bower = require('./bower-utils');

exports.register.attributes = {
    pkg: require('../package.json')
};