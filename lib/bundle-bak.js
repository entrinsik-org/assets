'use strict';

const _ = require('lodash');
const path = require('path');
const es = require('ent-streams');
const cluster = require('cluster');

const AssetBuilder = require('./asset-builder').AssetBuilder;

function sanitizeOpts(opts, assetdir, name, src) {
    opts = opts || {};

    if (_.isString(opts)) opts = { cwd: opts };

    if (assetdir) opts.cwd = path.resolve(opts.cwd, assetdir);

    return _.defaults(opts, { name: name, src: src });
}

function configure(r, opts) {
    r.src(opts.src, { cwd: opts.cwd, base: opts.base });
    r.autoroute = true;
    r.priority = opts.priority;
}

class Bundle {
    constructor(id, options) {
        this._module = new AssetBuilder(id, []);
        this.options = options || {};
    }

    scripts(dir, opts) {
        opts = sanitizeOpts(opts, dir, `${this._module.module}-scripts.min.js`, '**/*.js');
        configure(this._module.script(opts.name), opts);
        return this;
    }

    templates(dir, opts) {
        opts = sanitizeOpts(opts, dir, `${this._module.module}-templates.min.js`, '**/*.html');
        configure(this._module.template('informer', opts.name), opts);
        return this;
    }

    css(dir, opts) {
        opts = sanitizeOpts(opts, dir, `${this._module.module}-css.min.js`, '**/*.css');
        configure(this._module.css(opts.name), opts);
        return this;
    }

    bower(dir, opts) {
        configure()
    }

    scan(dir, opts) {
        if (!dir) return this;

        return this.scripts(dir, opts)
            .templates(dir, opts)
            .css(dir, opts);
    }

    compile() {
        if (this._compile) return this._compile;

        return this._compile = es.streamToArray(
            es.readArray(this._module.resources)
                .pipe(es.map((r, d) => r.select(d)))
                .pipe(es.map((r, d) => this.options.minify && cluster.isMaster ? r.minify(this.options, d) : d(null, r)))
        );
    }

    _deployResource(server, resource) {
        resource.paths.forEach(path => {
            server.log(['Asset Manager', 'server', 'debug', 'startup'], 'Adding route ' + path.url + ' -> ' + path.file);
            server.route({
                method: 'GET',
                path: path.url,
                config: { auth: false, handler: { file: path.file } }
            });
        });
    }

    deployTo(server) {
        server.ext('onPreStart', (s, d) => this.deploy(s).nodeify(d));
        return this;
    }

    deploy(server) {
        return this.compile()
            .then(resources => {
                server.log(['Asset Manager', 'server', 'info', 'startup'], 'Exporting resources');
                resources.forEach(resource => this._deployResource(server, resource));
            });
    }
}

exports.Bundle = Bundle;