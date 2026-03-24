import browser from "webextension-polyfill";

/**
 * 浏览器存储操作助手。
 *
 * 对 `browser.storage` 提供统一的读写、列表更新和对象更新能力，
 * 用于减少业务层重复的存储取值与结构修改逻辑。
 */
class StorageHelper {
    /**
     * @param {'local' | 'sync' | 'session' | 'managed'} [area='local'] - 使用的存储分区。
     */
    constructor(area = 'local') {
        this.storageArea = browser.storage[area];
    }

    /**
     * 读取存储中的指定键值。
     *
     * 当 `key` 为字符串时返回对应值；当 `key` 为 `null` 或对象/数组形式时，
     * 返回原始存储结果。
     *
     * @param {string | null | string[] | Object} key - 存储键、键数组、查询对象或 `null`。
     * @param {any} [defaultValue=null] - 单键读取失败或不存在时的默认值。
     * @returns {Promise<any>} 读取结果。
     */
    async get(key, defaultValue = null) {
        try {
            const result = await this.storageArea.get(key);
            if (key === null) {
                return result;
            }
            if (typeof key === 'string') {
                return result[key] !== undefined ? result[key] : defaultValue;
            }
            return result;
        } catch (error) {
            console.error(`[Storage] 读取 ${String(key)} 失败:`, error);
            return defaultValue;
        }
    }

    /**
     * 保存键值到当前存储分区。
     *
     * 支持直接传入对象批量保存；单键保存时会对值做深拷贝，避免引用污染。
     *
     * @param {string | Object} key - 存储键，或待保存的键值对象。
     * @param {any} value - 单键保存时对应的值。
     * @returns {Promise<void>}
     */
    async set(key, value) {
        try {
            const data = typeof key === 'object' && key !== null
                ? key
                : {[key]: structuredClone(value)};
            await this.storageArea.set(data);
        } catch (error) {
            console.error('[Storage] 保存失败:', error);
        }
    }

    /**
     * 删除一个或多个存储键。
     *
     * @param {string | string[]} key - 要删除的键或键列表。
     * @returns {Promise<void>}
     */
    async remove(key) {
        try {
            await this.storageArea.remove(key);
        } catch (error) {
            console.error(`[Storage] 删除 ${String(key)} 失败:`, error);
        }
    }

    /**
     * 在列表头部插入一项。
     *
     * @param {string} key - 列表所在的存储键。
     * @param {any} item - 待插入的列表项。
     * @returns {Promise<any[] | undefined>} 修改后的列表。
     */
    async listUnshift(key, item) {
        return this._modifyList(key, (list) => [item, ...list]);
    }

    /**
     * 在列表尾部追加一项。
     *
     * @param {string} key - 列表所在的存储键。
     * @param {any} item - 待追加的列表项。
     * @returns {Promise<any[] | undefined>} 修改后的列表。
     */
    async listPush(key, item) {
        return this._modifyList(key, (list) => [...list, item]);
    }

    /**
     * 按条件移除列表项。
     *
     * @param {string} key - 列表所在的存储键。
     * @param {(item: any) => boolean} predicate - 返回 `true` 时表示该项将被移除。
     * @returns {Promise<any[] | undefined>} 修改后的列表。
     */
    async listRemove(key, predicate) {
        return this._modifyList(key, (list) => list.filter(item => !predicate(item)));
    }

    /**
     * 按条件更新列表中的首个匹配项。
     *
     * @param {string} key - 列表所在的存储键。
     * @param {(item: any) => boolean} predicate - 用于定位目标项的匹配函数。
     * @param {Object} updateObj - 要合并到目标项上的字段。
     * @returns {Promise<any[] | undefined>} 修改后的列表。
     */
    async listUpdate(key, predicate, updateObj) {
        return this._modifyList(key, (list) => {
            const index = list.findIndex(predicate);
            if (index === -1) {
                return list;
            }

            const nextList = [...list];
            nextList[index] = {...nextList[index], ...updateObj};
            return nextList;
        });
    }

    /**
     * 按条件插入或更新列表项。
     *
     * 未匹配到数据时使用 `createItem` 创建新项；匹配到时使用 `update` 生成新值。
     *
     * @param {string} key - 列表所在的存储键。
     * @param {(item: any) => boolean} predicate - 用于判断目标项是否存在的匹配函数。
     * @param {any | (() => any)} createItem - 新增场景下的默认项或创建函数。
     * @param {Object | ((item: any) => any)} update - 更新场景下的补丁对象或更新函数。
     * @returns {Promise<any[] | undefined>} 修改后的列表。
     */
    async listUpsert(key, predicate, createItem, update) {
        return this._modifyList(key, (list) => {
            const index = list.findIndex(predicate);
            if (index === -1) {
                const item = typeof createItem === 'function' ? createItem() : createItem;
                return [...list, item];
            }

            const oldItem = list[index];
            const nextItem = typeof update === 'function'
                ? update(oldItem)
                : {...oldItem, ...update};
            const nextList = [...list];
            nextList[index] = nextItem;
            return nextList;
        });
    }

    /**
     * 设置对象中的单个字段。
     *
     * @param {string} key - 对象所在的存储键。
     * @param {string} field - 目标字段名。
     * @param {any} value - 字段值。
     * @returns {Promise<Object | undefined>} 修改后的对象。
     */
    async objectSet(key, field, value) {
        return this._modifyObject(key, (obj) => ({...obj, [field]: value}));
    }

    /**
     * 删除对象中的单个字段。
     *
     * @param {string} key - 对象所在的存储键。
     * @param {string} field - 目标字段名。
     * @returns {Promise<Object | undefined>} 修改后的对象。
     */
    async objectDelete(key, field) {
        return this._modifyObject(key, (obj) => {
            const nextObj = {...obj};
            delete nextObj[field];
            return nextObj;
        });
    }

    /**
     * 合并对象字段。
     *
     * @param {string} key - 对象所在的存储键。
     * @param {Object} patch - 待合并的对象补丁。
     * @returns {Promise<Object | undefined>} 修改后的对象。
     */
    async objectMerge(key, patch) {
        return this._modifyObject(key, (obj) => ({...obj, ...patch}));
    }

    /**
     * 对对象字段执行 upsert 操作。
     *
     * 当字段不存在时使用 `defaultValue` 初始化；存在时使用 `updateValue` 计算新值。
     *
     * @param {string} key - 对象所在的存储键。
     * @param {string} field - 目标字段名。
     * @param {any | (() => any)} defaultValue - 字段不存在时的默认值或工厂函数。
     * @param {any | ((value: any) => any)} updateValue - 字段存在时的新值或更新函数。
     * @returns {Promise<Object | undefined>} 修改后的对象。
     */
    async objectUpsert(key, field, defaultValue, updateValue) {
        return this._modifyObject(key, (obj) => ({
            ...obj,
            [field]: obj[field] === undefined
                ? (typeof defaultValue === 'function' ? defaultValue() : defaultValue)
                : (typeof updateValue === 'function' ? updateValue(obj[field]) : updateValue)
        }));
    }

    /**
     * 读取、校验并修改列表结构后写回存储。
     *
     * @private
     * @param {string} key - 列表所在的存储键。
     * @param {(list: any[]) => any[]} action - 列表转换函数。
     * @returns {Promise<any[] | undefined>} 修改后的列表。
     */
    async _modifyList(key, action) {
        try {
            const list = await this.get(key, []);
            if (!Array.isArray(list)) {
                console.warn(`[Storage] Key "${key}" 不是数组`);
                return undefined;
            }

            const nextList = action(list);
            await this.set(key, nextList);
            return nextList;
        } catch (error) {
            console.error(`[Storage] 修改列表 ${key} 失败:`, error);
            return undefined;
        }
    }

    /**
     * 读取、校验并修改对象结构后写回存储。
     *
     * @private
     * @param {string} key - 对象所在的存储键。
     * @param {(obj: Object) => Object} action - 对象转换函数。
     * @returns {Promise<Object | undefined>} 修改后的对象。
     */
    async _modifyObject(key, action) {
        try {
            const obj = await this.get(key, {});
            if (typeof obj !== 'object' || Array.isArray(obj) || obj === null) {
                console.warn(`[Storage] Key "${key}" 不是对象`);
                return undefined;
            }

            const nextObj = action(obj);
            await this.set(key, nextObj);
            return nextObj;
        } catch (error) {
            console.error(`[Storage] 修改对象 ${key} 失败:`, error);
            return undefined;
        }
    }
}

export const storage = new StorageHelper('local');
