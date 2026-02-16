function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => deepCopy(item));
    }

    // Handle Map
    if (obj instanceof Map) {
        const copiedMap = new Map();
        for (const [key, value] of obj) {
            copiedMap.set(deepCopy(key), deepCopy(value));
        }
        return copiedMap;
    }

    // Handle Set
    if (obj instanceof Set) {
        const copiedSet = new Set();
        for (const value of obj) {
            copiedSet.add(deepCopy(value));
        }
        return copiedSet;
    }

    // Handle Date
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    // Handle RegExp
    if (obj instanceof RegExp) {
        return new RegExp(obj);
    }

    // Handle objects
    const copiedObj = {};
    for (const [key, value] of Object.entries(obj)) {
        copiedObj[key] = deepCopy(value);
    }

    return copiedObj;
}

module.exports = deepCopy
