/**
 * Author: chenboxiang
 * Date: 14-4-22
 * Time: 下午6:02
 */
'use strict';

module.exports = {
    /**
     * 判断obj是否是builder对象
     */
    isBuilder: function(obj) {
        return !!(obj && typeof obj.toSql === 'function');
    },

    /**
     * 判断obj是否是Transaction对象
     */
    isTransaction: function(obj) {
        return !!(obj && typeof obj.commit === 'function' && typeof obj.rollback === 'function');
    },

    /**
     * 判断obj是否是Model构造器
     * @param obj
     */
    isModelConstructor: function(obj) {
        return !!(obj && obj.tableName && obj.columns);
    },

    throwError: function(code, message) {
        var error = new Error();
        if (!code) {
            code = '500';
        }
        // convert to string
        code = code + '';
        error.code = code;
        error.message = message;
        throw error;
    }
}