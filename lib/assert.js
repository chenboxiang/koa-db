/**
 * Author: chenboxiang
 * Date: 14-2-1
 * Time: 上午10:10
 */
"use strict";

var _ = require("lodash");
var helpers = require("./helpers");
var nodeUtil = require("util");

var ASSERT_CODE = "400";

var assert = {

    /**
     * assert the obj1 is equal to obj2
     * @param obj1
     * @param obj2
     * @param message
     */
    equal: function(obj1, obj2, message) {
        if (obj1 !== obj2) {
            message = message || nodeUtil.format("[Assert failed], the obj1 '%s' is not equal to the obj2 '%s']", obj1, obj2);
            helpers.throwError(ASSERT_CODE, message);
        }
    },

    /**
     * assert the obj is true
     * @param obj
     * @param message
     */
    isTrue: function(obj, message) {
        if (obj !== true) {
            message = message || "[Assert failed], the obj is not true";
            utils.throwError(ASSERT_CODE, message);
        }
    },

    /**
     * call _.isEmpty to validate the obj
     * @param obj
     * @param message
     */
    notEmpty: function(obj, message) {
        if (_.isEmpty(obj)) {
            message = message || "[Assert failed], the obj is empty";
            helpers.throwError(ASSERT_CODE, message);
        }
    },

    /**
     * assert the obj is not null or undefined
     * @param obj
     * @param message
     */
    notNull: function(obj, message) {
        if (null == obj) {
            message = message || "[Assert failed], the obj is null or undefined";
            helpers.throwError(ASSERT_CODE, message);
        }
    }
}

module.exports = assert;