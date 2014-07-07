/**
 * Author: chenboxiang
 * Date: 14-4-22
 * Time: 下午6:02
 */
'use strict';

var _ = require('lodash');
var defineModel = require('./model').defineModel;
var helpers = require('./helpers');
var buildDao = require('./dao').buildDao;
var query = require('./query');
var logger = require('./logger');

var db = {};

// add helpers
_.extend(db, helpers);

// add defineModel
db.defineModel = defineModel;

// dao
db.daos = {};
db.buildDao = function(config) {
    if (!config.name) {
        throw new Error('you must specify a name to the dao');
    }
    var dao = buildDao(config);
    db.daos[config.name] = dao;

    return dao;
}

// add query helpers
_.extend(db, query);

// set logger
db.setLogger = function(newLogger) {
    logger.setLogger(newLogger)
}

// expose
module.exports = db;
