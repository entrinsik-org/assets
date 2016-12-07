'use strict';

const path = require('path');
const _ = require('lodash');
const P = require('bluebird');
const joi = require('joi');
const Bundle = require('./bundle').Bundle;

const schema = joi.object().keys({
    script: joi.string(),
    style: joi.string(),
    bundle: joi.object().type(Bundle, 'Bundle'),
    description: joi.string(),
    priority: joi.number().integer().default(0)
}).xor('script', 'style', 'bundle');

class Hostpage {
    constructor(options) {
        this.options = options;
        this.scripts = [];
        this.styles = [];
        this.assets = [];
        this.ngModules = [];
    }

    coerce(descriptor) {
        if (descriptor instanceof Bundle) return { bundle: descriptor };

        if (_.isString(descriptor) && path.extname(descriptor) === '.js') return { script: descriptor };

        if (_.isString(descriptor) && path.extname(descriptor) === '.css') return { style: descriptor };

        return descriptor;
    }

    inject(descriptor, priority = 0) {
        descriptor = _.defaults(this.coerce(descriptor), { priority: priority });

        this.assets.push(joi.attempt(descriptor, schema));

        return this;
    }

    ngModule(modules) {
        this.ngModules = _.uniq(_.compact(this.ngModules.concat(modules)));
        return this;
    }

    compile() {
        function compileBundle(descriptor) {
            return descriptor.bundle.compile().then(
                resources => resources.map(r => ({
                    description: descriptor.description || r.filename,
                    extension: r.extension,
                    priority: descriptor.priority,
                    paths: _.pluck(r.paths, 'url')
                }))
            );
        }

        function compileScript(descriptor) {
            return {
                extension: 'js',
                description: descriptor.description || descriptor.script,
                priority: descriptor.priority,
                paths: [descriptor.script]
            };
        }

        function compileStyle(descriptor) {
            return {
                extension: 'css',
                description: descriptor.description || descriptor.script,
                priority: descriptor.priority,
                paths: [descriptor.style]
            };
        }

        function compileAsset(asset) {
            if (asset.bundle) return compileBundle(asset);
            if (asset.script) return compileScript(asset);
            if (asset.style) return compileStyle(asset);
        }

        if (this._compile) return this._compile;

        return this._compile = P.map(this.assets, asset => compileAsset(asset))
            .then(resources => _(resources).flatten().sortByOrder(['priority'], [false]).groupBy('extension').value())
            .then(resources => _.assign(this, { scripts: resources.js, styles: resources.css }));
    }

    deployTo(server) {
        server.ext('onPreStart', (s, d) => this.compile().nodeify(d));
        return this;
    }
}

exports.Hostpage = Hostpage;