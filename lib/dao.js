/**
 * relational database client
 * Author: chenboxiang
 * Date: 14-1-28
 * Time: 下午4:56
 */
'use strict';

var Knex = require('knex');
var _ = require('lodash');
var co = require('co');
var constants = require('./constants');
var assert = require('./assert');
var helpers = require('./helpers');
var logger = require('./logger');

// 全局自增的transactionId
var transactionId = 1;
// transactionId的最大值，到此值后重新初始化为1
var maxTransactionId = 1000000;

var defaultConfig = {};

var normalizeAttrs = function(attrs, action) {
    var now = new Date().getTime();
    attrs.action = action;
    if (action === constants.ACTION_INSERT) {
        attrs.creationTime = now;
        attrs.actionTime = now;
    }
    else {
        attrs.actionTime = now;
    }
}

var buildDao = function(config) {
    config = _.extend({}, defaultConfig, config);

    var knex = Knex.initialize(config);
    var dao = function(tableName) {
        return knex(tableName);
    }
    dao.logger = config.logger || logger;
    _.extend(dao, knex);

    /**
     * @param Model
     * @param {String|Object|Builder|Array} builder
     *      String: 当作primary key处理
     *      Object: 传给where函数构建出builder
     *      Array: 每个元素为1个数组，几个元素按顺序分别为column,operator,value.其中operator可以省略，默认为=
     * @returns {Builder}
     */
    var normalizeBuilder = function(Model, builder) {
        if (null == builder) {
            return dao(Model.tableName);

        } else if (helpers.isBuilder(builder)) {
            return builder.from(Model.tableName);

        } else if (_.isString(builder) || _.isNumber(builder)) {
            // primary key只能为1个
            assert.isTrue(Model.primaryKey.length === 1, 'Number of primary key is more than one');

            return dao(Model.tableName).where(Model.primaryKey[0], builder);

        } else if (_.isPlainObject(builder)) {
            return dao(Model.tableName).where(builder);

        } else if (_.isArray(builder)) {
            var wheres = builder;
            builder = dao(Model.tableName);
            wheres.forEach(function(where) {
                builder.where.apply(builder, where);
            });

            return builder;
        }
        return builder;
    }

    /**
     * @param {Model} model
     * @param transaction
     */
    dao.insert = function(model, transaction) {
        var attrs = model.attrs;
        assert.notEmpty(attrs);
        var Model = model.constructor;
        // set default attr
        if ('action' in Model.columns) {
            if (!_.isArray(attrs)) {
                normalizeAttrs(attrs, constants.ACTION_INSERT);

            } else {
                attrs.forEach(function(as) {
                    normalizeAttrs(as, constants.ACTION_INSERT);
                })
            }
        }
        var builder = dao(Model.tableName);
        if (transaction) {
            builder.transacting(transaction);
        }

        return builder.insert(attrs).then(function(result) {
            if (_.isArray(result) && result.length === 1) {
                // result id convert
                result = result[0];
                // set to attrs
                if (Model.primaryKey.length === 1) {
                    attrs[Model.primaryKey[0]] = result;
                }
            }
            return result;
        });
    }

    /**
     * 更新所有字段，不存在的字段将都为null
     * @param {Model} model
     * @param {String|Object|Builder} builder
     *      String: 当作primary key处理
     *      Object: 传给where函数构建出builder
     * @param transaction
     */
    dao.update = function(model, builder, transaction) {
        var attrs = model.attrs;
        assert.notEmpty(attrs);
        var Model = model.constructor;
        // set default attr
        if ('action' in Model.columns) {
            if (!_.isArray(attrs)) {
                normalizeAttrs(attrs, constants.ACTION_UPDATE);

            } else {
                attrs.forEach(function(as) {
                    normalizeAttrs(as, constants.ACTION_UPDATE);
                })
            }
        }
        // pass model
        if (arguments.length === 1) {
            // validate primaryKey attrs
            model.validate(Model.primaryKey);
            builder = _.pick(model.attrs, Model.primaryKey);
        }
        else if (arguments.length === 2) {
            // pass model and transaction
            if (helpers.isTransaction(builder)) {
                transaction = builder;
                // validate primaryKey attrs
                model.validate(Model.primaryKey);
                builder = _.pick(model.attrs, Model.primaryKey);
            }
            // pass model and builder
            else {
                // 需先判断model本身是否包含合法的primary key，若包含则抛异常，
                // 因为这样无法知道调用方到底是要直接更新model还是要按builder所指定的条件跟新属性而忽略model的primary key的属性
                var pkValid = false;
                try {
                    model.validate(Model.primaryKey);
                    pkValid = true;
                } catch (e) {

                }
                if (pkValid) {
                    throw new Error("model中包含合法的primary key，如果要更新单个model，请不要传builder参数");
                }
            }
        }

        builder = normalizeBuilder(Model, builder);

        if (transaction) {
            builder.transacting(transaction);
        }

        return builder.update(attrs);
    }

    /**
     * @param Model
     * @param {String|Object|Builder} builder
     *      String: 当作primary key处理
     *      Object: 传给where函数构建出builder
     * @param transaction
     */
    dao.del = function(Model, builder, transaction) {
        // 第1个参数是Model构造出来的实例
        if (!helpers.isModelConstructor(Model)) {
            var model = Model;
            Model = model.constructor;
            transaction = builder;
            model.validate(Model.primaryKey);
            builder = _.pick(model.attrs, Model.primaryKey);
        }

        builder = normalizeBuilder(Model, builder);
        if (transaction) {
            builder.transacting(transaction);
        }

        return builder.del();
    }
    dao["delete"] = dao.del;

    /**
     * @param Model
     * @param {String|Object|Builder} builder
     *      String: 当作primary key处理
     *      Object: 传给where函数构建出builder
     * @param pageOptions
     *      {
     *          // page number 页码，从1开始
     *          pn: 1,
     *          // page count 每页的条数
     *          pc: 20
     *      }
     * @param transaction
     */
    dao.select = function(Model, builder, pageOptions, transaction) {
        var oriBuilder = builder;
        builder = normalizeBuilder(Model, builder);
        if (helpers.isTransaction(pageOptions)) {
            transaction = pageOptions;
            pageOptions = null;
        }

        if (transaction) {
            builder.transacting(transaction);
        }

        if (pageOptions) {
            var pn = pageOptions[constants.QUERY_PAGE_NUMBER] || 1;
            var pc = pageOptions[constants.QUERY_PAGE_COUNT];
            if (pn < 1) {
                throw new Error("page number must greater than 0");
            }
            if (pc) {
                builder.limit(pc).offset((pn - 1) * pc);
            }
        }

        if (_.isString(oriBuilder) || _.isNumber(oriBuilder)) {
            return builder.select().then(function(result) {
                if (_.isArray(result) && result.length === 1) {
                    result = result[0];
                }
                return result;
            });
        }

        return builder.select();
    }

    /**
     * @param Model
     * @param {String|Object|Builder} builder
     *      String: 当作primary key处理
     *      Object: 传给where函数构建出builder
     * @param transaction
     */
    dao.selectOne = function(Model, builder, transaction) {
        builder = normalizeBuilder(Model, builder);
        if (transaction) {
            builder.transacting(transaction);
        }
        return builder.limit(1).select().then(function(result) {
            if (_.isArray(result) && result.length === 1) {
                result = result[0];
            }
            return result;
        });
    }

    var methods = 'count min max sum avg'.split(' ');
    methods.forEach(function(method) {
        dao[method] = function(Model, builder, column, transaction) {
            if (arguments.length === 3) {
                if (_.isTransaction(column)) {
                    // pass Model, column, transaction
                    if (_.isString(builder)) {
                        transaction = column;
                        column = builder;
                        builder = null;
                    }
                    // pass Model, builder, transaction
                    else {
                        transaction = column;
                        column = null;
                    }
                }
            }
            else if (arguments.length === 2) {
                // pass Model and builder
                if (_.isString(builder)) {
                    column = builder;
                    builder = null;
                }
                // pass Model and transaction
                else if (helpers.isTransaction(builder)) {
                    transaction = builder;
                    builder = null;
                }
            }

            if (column == null) {
                column = '*';
            }

            builder = normalizeBuilder(Model, builder);
            if (transaction) {
                builder.transacting(transaction);
            }

            return builder[method](column + ' as ret').then(function(result) {
                if (result) {
                    result = result[0].ret;
                }
                return result;
            });
        }
    })

    // transaction
    var transaction = dao.transaction;
    dao.transaction = function(fn) {
        return transaction(function(t) {
            t._id = transactionId++;
            if (transactionId > maxTransactionId) {
                transactionId = 1;
            }
            if (dao.client.isDebugging) {
                dao.logger.info('transaction [%s] begin, cid: [%s]', t._id, t.connection.__cid);
            }
            co(fn)(t, function(err) {
                if (null == err) {
                    t.commit();
                    if (dao.client.isDebugging) {
                        dao.logger.info('transaction [%s] commit, cid: [%s]', t._id, t.connection.__cid);
                    }
                }
                else {
                    t.rollback(err);
                    if (dao.client.isDebugging) {
                        dao.logger.error('transaction [%s] rollback, cid: [%s]', t._id, t.connection.__cid);
                    }
                }
            })
        })
    }
    // alias
    dao.trans = dao.transaction;

    // 覆盖原有的debug函数
    dao.client.debug = function (sql, bindings, connection, builder) {
        dao.logger.info('[%s] %s', connection.__cid, builder.toString());
    }

    // 需定期检查pool中connection是否可用，主要是解决mysql server超过超时时间（默认为8小时）断开连接时，不通知客户端的问题
    // 1小时发送1次sql，保证mysql server不断开连接
    setInterval(function() {
        dao.client.pool.poolInstance.availableObjects.forEach(function(objWithTimeout) {
            var connection = objWithTimeout.obj;
            connection.query('SELECT 1 + 1', function(err) {
                if (err) {
                    dao.client.pool.poolInstance.destroy(connection);
                }
            })
        })
    }, 60 * 60 * 1000);

    return dao;
}

// expose
module.exports = {
    buildDao: buildDao
};