/**
 * Author: chenboxiang
 * Date: 14-1-28
 * Time: 下午6:38
 */
'use strict';

var validator = require('./validator');
var _ = require('lodash');
var _s = require('underscore.string');
var defaults = require('./defaults');
var helpers = require('./helpers');

var defaultValidationMessage = _.template('This parameter "<%- name %>:<%- value %>" is invalid');

var defaultOptions = {
    includeDefaultColumns: true,
    includeIdColumn: true
}

/**
 * @param tableName
 * @param columns 格式: {columnName: column}
 *          column 格式: {type: '', validation: []}
 *            validation中单个元素 格式:
 *              {
 *                  constraint: '',  // 字段约束, 可为字符串或正则对象或验证函数，
 *                                   // 为字符串时会去查看看是否validator有对应的同名方法，会尝试找字符串原始值，
 *                                   // 以及is + _s.capitalize()之后的值，例如如果为email，则会尝试查找validator['email']和validator['isEmail']
 *                                   // 为正则对象时，则直接调用test方法验证
 *                  message: '' // 验证不过时的提示信息，可以为string或ejs模板编译后的function
 *              }
 *              简化的格式:
 *                  'email'  等同于  {constraint: 'email'}
 * @param options
 * @returns {Model}
 * @constructor
 */
var defineModel = function(tableName, columns, options) {
    options = _.extend({}, defaultOptions, options);
    if (!tableName) {
        throw new Error('The table name must be specified');
    }
    if (!columns) {
        throw new Error('The columns must be specified');
    }
    columns = normalizeColumns(columns, options);

    var Model = function(attrs) {
        this.attrs = attrs;
    }

    // -- static methods and properties ---------------
    var primaryKey = [];
    for (var name in columns) {
        var column = columns[name];
        if (column.primaryKey) {
            primaryKey.push(name);
        }
    }
    if (primaryKey.length === 0) {
        throw new Error('The primary key must be specified');
    }

    Object.defineProperties(Model, {
        'tableName': {
            writable: false,
            configurable: false,
            value: tableName
        },
        'primaryKey': {
            writable: false,
            configurable: false,
            value: primaryKey
        },
        'columns': {
            configurable: false,
            get: function() {
                return columns;
            }
        }
    })

    _.extend(Model, {
        validate: function(attrs, attrNames) {
            var errorMessages = [];
            if (_.isEmpty(attrs)) {
                errorMessages.push('parameters is empty');

            } else {
                if (attrNames && !_.isArray(attrNames)) {
                    attrNames = [attrNames];
                }
                var validationColumns;
                if (attrNames) {
                    validationColumns = _.pick(columns, attrNames);

                } else {
                    validationColumns = columns;
                }
                _.each(validationColumns, function(column, colName) {
                    var validation = column.validation;
                    if (_.isArray(validation) && validation.length > 0) {
                        _.each(validation, function(v) {
                            if (v.constraint) {
                                if (!v.constraint(attrs[colName])) {
                                    var message;
                                    if (_.isFunction(v.message)) {
                                        message = v.message({
                                            name: colName,
                                            value: attrs[colName]
                                        });

                                    } else {
                                        message = v.message;
                                    }
                                    errorMessages.push(message);
                                }
                            }
                        });
                    }
                });
            }

            if (errorMessages.length > 0) {
                helpers.throwError('400', errorMessages);
            }
        },

        /**
         * @param {String|Object|Builder} builder
         *      String: 当作primary key处理
         *      Object: 传给where函数构建出builder
         * @param transaction
         */
        del: function(builder, transaction) {
            if (helpers.isTransaction(builder)) {
                transaction = builder;
                builder = null;
            }
            builder = Model._normalizeBuilder(builder);
            return dao.del(builder, transaction);
        },

        /**
         * @param {String|Object|Builder} builder
         *      String: 当作primary key处理
         *      Object: 传给where函数构建出builder
         * @param transaction
         */
        select: function(builder, transaction) {
            if (helpers.isTransaction(builder)) {
                transaction = builder;
                builder = null;
            }
            builder = Model._normalizeBuilder(builder);
            return dao.select(builder, transaction);
        },

        /**
         * @param {String|Object|Builder} builder
         *      String: 当作primary key处理
         *      Object: 传给where函数构建出builder
         * @param transaction
         */
        selectOne: function(builder, transaction) {
            if (helpers.isTransaction(builder)) {
                transaction = builder;
                builder = null;
            }
            builder = Model._normalizeBuilder(builder);
            return dao.selectOne(builder, transaction);
        }
    })

    var methods = 'count min max sum avg'.split(' ');
    methods.forEach(function(method) {
        Model[method] = function(builder, column, transaction) {
            if (arguments.length === 2) {
                // pass column and transaction
                if (_.isString(builder)) {
                    transaction = column;
                    column = builder;
                    builder = null;
                }
            }
            else if (arguments.length === 1) {
                // only pass column
                if (_.isString(builder)) {
                    column = builder;
                    builder = null;
                }
            }

            if (null == column) {
                column = '*';
            }

            builder = Model._normalizeBuilder(builder);

            return dao[method](builder, column, transaction);
        }
    })

    // -- instance methods and properties --------------
    /**
     * @param attrNames 指定要验证的属性，不传则验证所有
     * @returns {*}
     */
    Model.prototype.validate = function(attrNames) {
        Model.validate(this.attrs, attrNames);
    }

    /**
     * 删除单个model
     */
    Model.prototype.del = function(transaction) {
        // primaryKey必须都合法，才能删除
        this.validate(this.primaryKey);
        Model.del(_.pick(this.attrs, this.primaryKey), transaction);
    }

    return Model;
}

var normalizeColumns = function(columns, options) {
    columns = _.cloneDeep(columns);
    if (options.includeIdColumn) {
        _.extend(columns, {
            id: {
                primaryKey: true,
                auto: true
            }
        })
    }
    if (options.includeDefaultColumns) {
        _.extend(columns, defaults.columns);
    }

    fixValidate(columns);

    return columns;
}

/**
 * 将columns中的validate统一处理下，加快后续验证的处理速度
 * @param columns
 */
var fixValidate = function(columns) {
    _.each(columns, function(column) {
        var validation = column.validation;
        if (!_.isEmpty(validation)) {
            if (!_.isArray(validation)) {
                validation = [validation];
            }
            var fixedValidation = [];
            _.each(validation, function(v) {
                if (!_.isPlainObject(v)) {
                    v = {constraint: v};
                }

                fixConstraintAndMessage(v);
                fixedValidation.push(v);
            })
            column.validation = fixedValidation;

        } else {
            delete column.validation;
        }
    });
}

/**
 * 将验证的字符串转换为function
 * @param constraint
 */
var fixConstraintAndMessage = function(validation) {
    var constraint = validation.constraint;
    if (!_.isFunction(constraint)) {
        if (_.isRegExp(constraint)) {
            validation.constraint = function(v) {
                return constraint.test(v);
            }

        } else {
            var fnName = constraint;
            var fn = validator[fnName];
            if (_.isFunction(fn)) {
                validation.constraint = fn;

            } else {
                fnName = 'is' + _s.capitalize(constraint);
                fn = validator[fnName];
                if (_.isFunction(fn)) {
                    validation.constraint = fn;

                } else {
                    throw new Error('This constraint string "' + constraint + '" can not convert to validator function');
                }
            }

            if (!validation.message) {
                validation.message = defaults.validatorMessages[fnName];
            }
        }
    }

    if (!validation.message) {
        validation.message = defaultValidationMessage;
    }
}

// expose
exports.defineModel = defineModel;