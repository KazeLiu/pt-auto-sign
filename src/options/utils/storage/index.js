import browser from "webextension-polyfill";

/**
 * 🧰 StorageHelper - KazeLiu - AI 生成
 * 包含：基础读写 + 数组快捷操作 (增删改)
 */
class StorageHelper {

    constructor(area = 'local') {
        this.area = area;
    }

    // ================= 基础方法 =================

    /**
     * 📥 获取数据
     */
    async get(key, defaultValue = null) {
        try {
            const result = await browser.storage[this.area].get(key);
            if (key === null) return result;
            if (typeof key === 'string') {
                return result[key] !== undefined ? result[key] : defaultValue;
            }
            return result;
        } catch (error) {
            console.error(`😭 [Storage] 读取 ${key} 失败:`, error);
            return defaultValue;
        }
    }

    /**
     * 📤 保存数据 (覆盖更新)
     */
    async set(key, value) {
        try {
            let data = {};
            if (typeof key === 'object' && key !== null) {
                data = key;
            } else {
                data = {[key]: JSON.parse(JSON.stringify(value))};
            }
            await browser.storage[this.area].set(data);
        } catch (error) {
            console.error('😡 [Storage] 保存失败:', error);
        }
    }

    /**
     * 🗑️ 删除某个 key
     */
    async remove(key) {
        await browser.storage[this.area].remove(key);
    }

    // ================= ✨ 数组专属操作 (Array Ops) =================

    /**
     * ➕ 添加到数组开头 (用于日志，最新的在最前面)
     * @param {string} key - 存储的键名
     * @param {any} item - 要添加的元素
     */
    async listUnshift(key, item) {
        return await this._modifyList(key, (list) => {
            list.unshift(item);
            return list;
        });
    }

    /**
     * ➕ 添加到数组末尾 (普通列表)
     */
    async listPush(key, item) {
        return await this._modifyList(key, (list) => {
            list.push(item);
            return list;
        });
    }

    /**
     * ❌ 删除数组中的元素
     * @param {string} key - 存储的键名
     * @param {Function} predicate - 查找条件，比如 item => item.id === 1
     */
    async listRemove(key, predicate) {
        return await this._modifyList(key, (list) => {
            // 过滤掉符合条件的元素（即删除）
            return list.filter(item => !predicate(item));
        });
    }

    /**
     * ✏️ 修改数组中的元素
     * @param {string} key - 存储的键名
     * @param {Function} predicate - 找到要修改的那个元素
     * @param {Object} updateObj - 要合并的新数据
     */
    async listUpdate(key, predicate, updateObj) {
        return await this._modifyList(key, (list) => {
            const index = list.findIndex(predicate);
            if (index !== -1) {
                // 浅合并：保留旧属性，覆盖新属性
                list[index] = {...list[index], ...updateObj};
            }
            return list;
        });
    }

    /**
     * 🔁 Upsert：存在则更新，不存在则新增
     * @param {string} key - 存储的键名
     * @param {Function} predicate - 查找条件
     * @param {Object|Function} createItem - 新增的数据 或 ( ) => item
     * @param {Object|Function} update - 更新的数据 或 (oldItem) => newItem
     */
    async listUpsert(key, predicate, createItem, update) {
        return await this._modifyList(key, (list) => {
            const index = list.findIndex(predicate);

            if (index !== -1) {
                // ✅ 命中：更新
                const oldItem = list[index];
                const newItem = typeof update === 'function'
                    ? update(oldItem)
                    : {...oldItem, ...update};

                list[index] = newItem;
            } else {
                // ➕ 未命中：新增
                const item = typeof createItem === 'function'
                    ? createItem()
                    : createItem;

                list.push(item);
            }

            return list;
        });
    }


    // ========= 内部私有方法 (Don't touch me!) =========

    /**
     * 🔒 内部通用的列表修改器，防止重复代码
     */
    async _modifyList(key, action) {
        try {
            // 1. 先读取（如果没有，初始化为空数组）
            const list = await this.get(key, []);

            // 🛡️ 安全检查：如果存的不是数组，就不改了，防止报错
            if (!Array.isArray(list)) {
                console.warn(`⚠️ [Storage] Key "${key}" 不是一个数组哟！`);
                return;
            }

            // 2. 执行修改逻辑
            const newList = action(list);

            // 3. 存回去
            await this.set(key, newList);

            return newList;
        } catch (error) {
            console.error(`😭 [Storage] 修改列表 ${key} 失败:`, error);
        }
    }
}

export const storage = new StorageHelper('local');