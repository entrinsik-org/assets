'use strict';

var ScriptResource = require('./script-resource').ScriptResource;
var TemplateResource = require('./template-resource').TemplateResource;
var CssResource = require('./css-resource').CssResource;
var _ = require('lodash');
var es = require('event-stream');

function AssetBuilder(module, bowerResources) {
    this.module = module;
    this.resources = [];
    this.bowerResources = _.isArray(bowerResources) ? bowerResources : [ bowerResources ];
}

AssetBuilder.prototype.addResource = function(resource) {
    this.resources.push(resource);
    return resource;
};

AssetBuilder.prototype.script = function(filename, priority) {
    if (_.isNumber(filename)) {
        priority = filename;
        filename = null;
    }

    return this.addResource(new ScriptResource(this.module, filename || 'scripts.min.js', priority));
};

AssetBuilder.prototype.css = function(filename, priority) {
    if (_.isNumber(filename)) {
        priority = filename;
        filename = null;
    }
    return this.addResource(new CssResource(this.module, filename || 'styles.min.css', priority));
};

AssetBuilder.prototype.template = function(module, filename, priority) {
    if (_.isNumber(filename)) {
        priority = filename;
        filename = null;
    }
    return this.addResource(new TemplateResource(this.module, filename || 'templates.min.js', module, priority));
};

AssetBuilder.prototype.bower = function(bowerJson) {
    this.bowerResources.forEach(function(resource){
        resource.src(bowerJson);
    });
};

AssetBuilder.prototype.stream = function() {
    return es.readArray(this.resources);
};

AssetBuilder.prototype.select = function () {
    return es.map(function (resource, callback) {
        resource.select(callback);
    });
};

exports.AssetBuilder = AssetBuilder;