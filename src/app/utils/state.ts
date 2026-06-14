export type DeepReadonly<T> = {
    readonly [K in keyof T]: DeepReadonly<T[K]>;
}

export function deepFreeze<T>(obj: T): T {
    if (obj == null) {
        return obj
    }

    if (obj instanceof Map && !Object.isFrozen(obj)) {
        obj.clear =
            obj.delete =
            obj.set =
            function () {
                throw new Error('map is read-only');
            };
    }

    if (obj instanceof Set && !Object.isFrozen(obj)) {
        obj.add =
            obj.clear =
            obj.delete =
            function () {
                throw new Error('set is read-only');
            };
    }

    try {
        // Freeze self
        Object.freeze(obj);
    } catch {
        // Some objects cannot be frozen in every runtime.
    }

    Object.getOwnPropertyNames(obj).forEach((name) => {
        const prop = (obj as Record<string, unknown>)[name];
        const type = typeof prop;

        // Freeze prop if it is an object or function and also not already frozen
        if ((type === 'object' || type === 'function') && !Object.isFrozen(prop)) {
            deepFreeze(prop);
        }
    });

    return obj;
}