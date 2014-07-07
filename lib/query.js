/**
 * 负责转换request.query 为dao查询使用的条件
 * Author: chenboxiang
 * Date: 14-2-4
 * Time: 下午2:46
 */
'use strict';

var _ = require('lodash');
var _s = require('underscore.string');
var constants = require('./constants');

var operators = {
    'eq': '=',
    'lt': '<',
    'lte': '<=',
    'gt': '>',
    'gte': '>=',
    'ne': '!=',
    'l': 'like',
    'nl': 'not like',
    'b': 'between'
};

var defaults = {
    where: function(value, key) {
        return _s.startsWith(key, 's_');
    },

    /**
     * 页面上传递过来的参数名解析出数据库查询条件和数据库的字段名
     *
     * @param name 页面上传递过来的参数名
     * @returns {{operator: *, column: *}}
     */
    parseCnd: function(name) {
        name = name.substring(2);
        var operator;
        // column name
        var column;
        var pos = name.indexOf('_');
        if (pos > 0) {
            operator = operators[name.substring(0, pos)];
            if (operator) {
                column = name.substring(pos + 1);

            } else {
                operator = '=';
                column = name;
            }

        } else {
            operator = '=';
            column = name;
        }

        return {
            operator: operator,
            column: column
        };
    }
};

/**
 * @param {String} order 格式为 column1,direction1;column2,direction2 ...
 * @returns [{column: '', direction: ''}]
 */
function parseOrder(order) {
    // 默认按创建时间倒序排列
    if (!order) {
        return [{
            column: 'creationTime',
            direction: 'desc'
        }]
    }

    // 如果直接传的就是对象则不再作解析
    if (!_.isString(order)) {
        if (!_.isArray(order)) {
            if (!_.isPlainObject(order)) {
                throw new Error('The order param can not be parsed correct!');
            }
            order = [order];
        }
        return order;
    }

    var ret = [];
    var orders = order.split(';');
    orders.forEach(function(o) {
        var arr = o.split(',');
        var column = arr[0];
        var direction = arr[1] || 'asc';
        ret.push({
            column: column,
            direction: direction
        })
    });

    return ret;
}

/**
 * 给builder追加上order by 子句
 * @param builder
 * @param order 格式为: column1,direction1;column2,direction2 ...
 */
function appendOrderBy(builder, order) {
    if (!order) {
        return builder;
    }
    var orders = parseOrder(order);
    orders.forEach(function(o) {
        builder.orderBy(o.column, o.direction);
    });

    return builder;
}

/**
 * 给builder追加上limit子句用来分页
 * @param builder
 * @param pageNumber 页码从1开始
 * @param pageCount
 */
function appendLimit(builder, pageNumber, pageCount) {
    pageNumber = pageNumber || 1;
    if (pageNumber < 1 ||
        !pageCount || pageCount < 1) {
        return builder;
    }
    var offset = (pageNumber - 1) * pageCount;
    builder.limit(pageCount).offset(offset);

    return builder;
}

/**
 * 给builder追加上order by子句和limit子句
 * @param builder
 * @param query
 */
function appendOrderByAndLimit(builder, query) {
    appendOrderBy(builder, query[constants.QUERY_ORDER_BY]);
    var pageNumber = query[constants.QUERY_PAGE_NUMBER] || 1;
    var pageCount = query[constants.QUERY_PAGE_COUNT];
    if (pageNumber < 1 ||
        !pageCount || pageCount < 1) {
        return builder;
    }
    appendLimit(builder, pageNumber, pageCount);

    return builder;
}

/**
 * 将req.query 转为数据库查询的
 * @param {Object} query
 * @param {Object} config
 * @returns {Array}
 */
function toConditions(query, config) {
    var ret = [];
    config = _.extend({}, defaults, config);

    // where conditions
    var where = _.pick(query, config.where);
    for (var key in where) {
        var value = where[key];
        var cnd = config.parseCnd(key);
        ret.push([cnd.column, cnd.operator, value]);
    }

    return ret;
}

/**
 * @param builder
 * @param query
 * @param config
 */
function toSqlBuilder(builder, query, config) {
    // where 条件
    var wheres = toConditions(query, config);
    wheres.forEach(function(where) {
        builder.where.apply(builder, where);
    });
    // 翻页和排序
    appendOrderByAndLimit(builder, query);

    return builder;
}

exports.toSqlBuilder = toSqlBuilder;
exports.toConditions = toConditions;
exports.appendOrderBy = appendOrderBy;
exports.appendLimit = appendLimit;
exports.appendOrderByAndLimit = appendOrderByAndLimit;