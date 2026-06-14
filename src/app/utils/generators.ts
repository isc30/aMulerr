/* eslint-disable @typescript-eslint/no-explicit-any */
export type AsyncGeneratorReturnType<T extends (...args: any) => any> = ReturnType<T> extends AsyncGenerator<any, infer R, any> ? R : never

export async function yieldAll<Y, R>(it: AsyncGenerator<Y, R, any>, callback?: (yielded: Y) => void) {
    let r
    while (!(r = await it.next()).done) {
        callback?.(r.value)
    }

    return r.value
}