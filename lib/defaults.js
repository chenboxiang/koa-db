/**
 * Author: chenboxiang
 * Date: 14-1-30
 * Time: 下午2:18
 */
'use strict';

var _ = require('lodash');

var validatorMessages = {
    'notNull': _.template('This parameter "<%- name %>" can not be null'),
    'notEmpty': _.template('This parameter "<%- name %>" can not be empty'),
    'email': _.template('This parameter "<%- name %>:<%- value %>" is a invalid email'),
    'URL': _.template('This parameter "<%- name %>:<%- value %>" is a invalid URL'),
    'IP': _.template('This parameter "<%- name %>:<%- value %>" is a invalid IP'),
    'alpha': _.template('This parameter "<%- name %>:<%- value %>" is a invalid alpha')
}

validatorMessages.isEmail = validatorMessages.email;
validatorMessages.isURL = validatorMessages.URL;
validatorMessages.isIP = validatorMessages.IP;
validatorMessages.isAlpha = validatorMessages.alpha;

module.exports = {
    columns: {
        creationTime: {},
        actionTime: {},
        action: {}
    },

    // 验证错误后的提示信息
    validatorMessages: validatorMessages
}