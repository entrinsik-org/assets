'use strict';

const _ = require('lodash');
const es = require('ent-streams');
const cluster = require('cluster');
const path = require('path');
const joi = require('joi');
const BowerResource = require('./bower-resource').BowerResource;
const ScriptResource = require('./script-resource').ScriptResource;
const TemplateResource = require('./template-resource').TemplateResource;
const CssResource = require('./css-resource').CssResource;

const glob = joi.object().keys({
    src: joi.array().items(joi.string()).single().required(),
    opts: joi.object()
});

const globOrString = joi.alternatives([
    joi.string(),
    glob
]);

const schema = {
    addRoutes: joi.boolean().default(true),
    bower: joi.string(),
    scripts: globOrString,
    styles: globOrString,
    templates: joi.object().keys({
        src: joi.string().required(),
        opts: joi.object(),
        module: joi.string().required()
    })
};

class Bundle {
    constructor(base, id, options) {
        this.base = base;
        this.id = id;
        this.options = options;
        this._resources = [];
    }

    resources(config) {
        this._resources = this._resources.concat(this.createResources(config));
        return this;
    }

    createResources(config) {
        let autoroute = config.addRoutes || this.options.minify;
        config = this.validate(config || {});
        return _(config)
            .map((v, k) => this[k](v))
            .flatten()
            .map(r => _.assign(r, { autoroute: autoroute }))
            .value();
    }

    bower(folder) {
        return folder ? [
            new BowerResource(this.base, `${this.id}-bower.min.js`).src(folder),
            new BowerResource(this.base, `${this.id}-bower.min.css`).src(folder)
        ] : [];
    }

    scripts(defn) {
        return new ScriptResource(this.base, `${this.id}-scripts.min.js`).src(defn.src, defn.opts);
    }

    templates(defn) {
        return new TemplateResource(this.base, `${this.id}-templates.min.js`, defn.module).src(defn.src, defn.opts);
    }

    styles(defn) {
        return new CssResource(this.base, `${this.id}-styles.min.css`).src(defn.src, defn.opts);
    }

    coerce(item) {
        return _.isString(item) ? { src: item } : item;
    }

    parse(directory) {
        return {
            scripts: { cwd: directory }
        };
    }

    validate(config) {
        config = joi.attempt(_.isString(config) ? this.parse(config) : config, schema);

        return _(config)
            .pick('bower')
            .assign(_.mapValues(_.pick(config, 'scripts', 'styles', 'templates'), v => this.coerce(v)))
            .value();
    }

    compile() {
        if (this._compile) return this._compile;

        return this._compile = es.streamToArray(
            es.readArray(this._resources)
                .pipe(es.map((r, d) => r.select(d)))
                .pipe(es.map((r, d) => this.options.minify ? r.minify(this.options, d) : d(null, r)))
        );
    }

    _deployResource(server, resource, routeOptions) {
        resource.paths.forEach(path => {
            server.log(['Asset Manager', 'server', 'debug', 'startup', this.id ], 'Adding route ' + path.url + ' -> ' + path.file);
            server.route({
                method: 'GET',
                path: path.url,
                config: _.defaults({ auth: false, handler: { file: path.file } }, routeOptions)
            });
        });
    }

    deployTo(server, routeOptions) {
        server.ext('onPreStart', (s, d) => this.deploy(s, routeOptions).nodeify(d));
        return this;
    }

    deploy(server, routeOptions) {
        return this.compile(this.options)
            .then(resources => {
                server.log(['Asset Manager', 'server', 'info', 'startup', this.id], 'Exporting resources');
                _.filter(resources, { autoroute: true }).forEach(resource => this._deployResource(server, resource, routeOptions));
            });
    }

    /**
     * @param {string} dir the directory to scan
     * @param {string =} subdir an optional subdirectory
     * @return {Bundle}
     */
    scan(dir, subdir) {
        dir = subdir ? path.resolve(dir, subdir) : dir;

        return this.resources({
            addRoutes: true,
            scripts: { src: '**/*.js', opts: { base: dir, cwd: dir }},
            templates: { src: '**/*.html', opts: { base: dir, cwd: dir }, module: this.options.module },
            styles: { src: '**/*.css', opts: { base: dir, cwd: dir }}
        });
    }
}

exports.Bundle = Bundle;