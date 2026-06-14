/* eslint-disable @typescript-eslint/no-explicit-any */
import ExpiryMap from "expiry-map"
import memoize from "memoize"
import pMemoize, { AnyAsyncFunction } from "p-memoize"
import { deepCopy } from "deep-copy-ts"
import stringify from "json-stable-stringify"
import { Mutex } from "async-mutex"
import { deepFreeze, DeepReadonly } from "./state"
export const deterministicStringify = stringify

class CustomExpiryMap<K = any, V = any> extends ExpiryMap<K, V> {
  constructor(
    maxAge: number,
    private shouldCache: undefined | ((value: V) => boolean)
  ) {
    super(maxAge)
  }
  set(key: K, value: V): this {
    if (this.shouldCache && !this.shouldCache(value)) return this
    return super.set(key, value)
  }
}

type CacheStorageContent<ValueType> = {
  data: ValueType
  maxAge: number
}

export function memoizeSync<T extends (...args: any[]) => any>(
  fn: T,
  timeout: number = 500,
  shouldCache?: (value: CacheStorageContent<ReturnType<T>>) => boolean
): T {
  const memoized = memoize(fn, {
    cacheKey: deterministicStringify,
    maxAge: timeout,
    cache: new CustomExpiryMap(timeout, shouldCache),
  })

  return ((...args) => deepCopy(memoized(...args))) as T
}

export function memoizeAsync<T extends AnyAsyncFunction>(
  fn: T,
  timeout: number = 500,
  shouldCache?: (value: Awaited<ReturnType<T>>) => boolean
): T {
  const memoized = pMemoize(fn, {
    cacheKey: deterministicStringify,
    cache: new CustomExpiryMap(timeout, shouldCache),
  })

  return ((...args) => memoized(...args).then(deepCopy)) as T
}

export function staleWhileRevalidate<A extends any[], R>(
  fn: (...args: A) => Promise<R>,
  options: {
    shouldCache?: (value: R) => boolean
    stalled?: number
    expired?: number,
    debug?: boolean
  } = {}
): (...args: A) => Promise<DeepReadonly<R>> {
  const { shouldCache, stalled = 500, expired = stalled * 20 } = options

  const cache = new Map<
    string,
    {
      addedOn: number
      value: R
    }
  >()

  // automatic cleanup
  setInterval(() => {
    const now = Date.now()
    cache.forEach((value, key) => {
      if (now - value.addedOn >= expired) {
        cache.delete(key)
      }
    })
  }, 30000)

  const allMutex = new Map<string, Mutex>()
  const updateCache = async (key: string, args: A): Promise<R> => {
    if (!allMutex.has(key)) {
      allMutex.set(key, new Mutex())
    }

    const mutex = allMutex.get(key)!
    return await mutex.runExclusive(async () => {
      const now = Date.now()
      const cached = cache.get(key)

      if (cached && (now - cached.addedOn) < stalled) {
        return cached.value
      }

      const value = deepFreeze(await fn(...args))

      if (!shouldCache || shouldCache(value)) {
        // logger.debug(id, "[staleWhileRevalidate] SET")
        cache.set(key, { addedOn: Date.now(), value })
      }

      return value
    })
  }

  return async (...args: A) => {
    const key = deterministicStringify(args)
    const now = Date.now()
    const cached = cache.get(key)

    if (options.debug) {
      console.log({ key, cached })
    }

    if (!cached || now - cached.addedOn >= expired) {
      // logger.debug(id, "[staleWhileRevalidate] MISS")
      return await updateCache(key, args)
    }

    if (now - cached.addedOn >= stalled) {
      // logger.debug(id, "[staleWhileRevalidate] STALLED")
      void updateCache(key, args)
      return cached.value
    }

    // logger.debug(id, "[staleWhileRevalidate] HIT")
    return cached.value
  }
}

// export function memoizeAsyncGenerator<
//   T extends (...args: readonly any[]) => AsyncGenerator<any, any, any>,
//   R,
// >(
//   fn: T,
//   timeout: number = 500,
//   shouldCache?: (value: AsyncGeneratorReturnType<T>) => boolean
// ): T {
//   const cache = new CustomExpiryMap(timeout, shouldCache)
//   const cacheKey = deterministicStringify

//   return async function* (...args: Parameters<T>) {
//     const key = cacheKey(args)
//     const currentCache = cache.get(cacheKey(args))

//     if (currentCache) {
//       return currentCache
//     }

//     const res = await (yield* fn(...arguments))
//     cache.set(key, res)
//     return res
//   } as T
// }