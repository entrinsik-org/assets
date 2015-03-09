'use strict';

var es = require('event-stream');
var path = require('path');
var crypto = require('crypto');

function lastMod(callback) {
    var result = 0;
    return es.through(function data(file) {
        var modTime = file.stat.mtime.getTime();
        result = Math.max(result, modTime);
        this.emit('data', file);
    }, function end() {
        callback(null, result);
        this.emit('end');
    });
}


function paths(base, checksums, callback) {
    var result = [];
    return es.through(function data(file) {
        var resourcePath = file.relative;
        if(checksums) {
            var checksum = crypto.createHash('md5').update(file.contents, 'utf8').digest('hex').slice(0, 8);
            resourcePath = file.relative.replace(/\.[0-9a-z]+$/i, '-' + checksum + '$&');
        }
        var p = { url: path.join(base, resourcePath), file: file.path };
        result.push(p);
        this.emit('data', file);
    }, function end() {
        callback(null, result);
        this.emit('end');
    });
}

module.exports = {
    lastMod: lastMod,
    paths: paths
};