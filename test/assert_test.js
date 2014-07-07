/**
 * Author: chenboxiang
 * Date: 14-4-29
 * Time: 下午6:00
 */
'use strict';

var assert = require('../lib/assert');
var should = require('should');

describe('assert', function() {
    describe('.equal(obj1, obj2, message)', function() {
        it('should throw err when obj1 is not strict equal to obj2', function() {
            (function() {
                assert.equal(1, 2, 'msg')
            }).should.throw();
        })

        it('should not throw err when obj1 is strict equal to obj2', function() {
            assert.equal(1, 1, 'msg');
        })
    })

    describe('.isTrue(obj, message)', function() {
        it('should throw err when obj is not strict equal to true', function() {
            (function() {
                assert.isTrue(false, 'msg')
            }).should.throw();
        })

        it('should not throw err when obj is strict equal to true', function() {
            assert.isTrue(true, 'msg');
        })
    })

    describe('.notEmpty(obj, message)', function() {
        it('should throw err when obj is empty', function() {
            (function() {
                assert.notEmpty('', 'msg')
            }).should.throw();
            (function() {
                assert.notEmpty(null, 'msg')
            }).should.throw();
            (function() {
                assert.notEmpty([], 'msg')
            }).should.throw();
            (function() {
                assert.notEmpty({}, 'msg')
            }).should.throw();
        })

        it('should not throw err when obj is not empty', function() {
            assert.notEmpty('1', 'msg');
        })
    })

    describe('.notNull(obj, message)', function() {
        it('should throw err when obj is null or undefined', function() {
            (function() {
                assert.notNull(null, 'msg')
            }).should.throw();
            (function() {
                assert.notNull(void 0, 'msg')
            }).should.throw();
        })

        it('should not throw err when obj is not empty', function() {
            assert.notNull('1', 'msg');
        })
    })
})