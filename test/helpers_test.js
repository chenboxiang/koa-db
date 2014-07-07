/**
 * Author: chenboxiang
 * Date: 14-4-29
 * Time: 下午6:40
 */
'use strict';

var should = require('should');
var helpers = require('../lib/helpers');
var buildDao = require('../lib/dao').buildDao;

describe('helpers', function() {
    describe('.isBuilder(obj)', function() {
        it('should return false when obj is not a builder', function() {
            ['', {}, []].forEach(function(obj) {
                helpers.isBuilder(obj).should.be.false;
            })
        })

        it('should return true when obj is a builder', function() {
            var dao = buildDao({
                client: 'sqlite3',
                connection: {
                    filename: ':memory:'
                }
            })
            helpers.isBuilder(dao.builder("user")).should.be.true;
        })
    })

    describe('.isTransaction(obj)', function() {
        it('should return false when obj is not a transaction', function() {
            ['', {}, []].forEach(function(obj) {
                helpers.isTransaction(obj).should.be.false;
            })
        })

        it('should return true when obj is a transaction', function() {
            var dao = buildDao({
                client: 'sqlite3',
                connection: {
                    filename: ':memory:'
                }
            })
            dao.trans(function *(t) {
                helpers.isTransaction(t).should.be.true;
            })
        })
    })

    describe('.isModelConstructor(obj)', function() {
        it('should return false when obj is not a model constructor', function() {

        })

        it('should return true when obj is a model constructor', function() {

        })
    })

    describe('.throwError(code, message)', function() {
        it('should throw a error with the special code and message', function() {

        })
    })
})