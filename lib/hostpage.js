'use strict';

const _ = require('lodash');
const es = require('event-stream');
const P = require('bluebird');
const Bundle = require('./bundle').Bundle;

class Hostpage {
    constructor(options) {
        this.options = options;
        this.assets = [];
    }

    inject(assets) {
        this.assets = this.assets.concat(assets);
        return this;
    }

    compile() {
        if (this._compile) return this._compile;

        let bundles = this.assets.filter(res => res instanceof Bundle);

        return this._compile = P.map(bundles, bundle => bundle.compile())
            .then(resources => _.flatten(resources))
            .then(resources => _(resources).sortBy('priority').reverse().groupBy('extension').value());
    }
}

exports.Hostpage = Hostpage;