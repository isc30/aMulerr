/* eslint-disable @typescript-eslint/no-explicit-any */
import { writeFile, chown, mkdir, rename, rm } from "node:fs/promises"
import { readFileSync, existsSync } from "node:fs"
import { dirname } from "path"
import { Mutex } from "async-mutex"

export type DbType<T> = T extends ReturnType<typeof createJsonDb<infer U>> ? U : never

export function createJsonDb<Schema>(
  fileName: string,
  initialState: Schema,
  initializer?: (s: Schema) => Schema
) {
  const state = {
    data: initialState
  }

  try {
    if (existsSync(fileName)) {
      state.data = JSON.parse(readFileSync(fileName).toString("utf8"), reviver) as Schema
    } else if (existsSync(`${fileName}.new`)) {
      state.data = JSON.parse(readFileSync(`${fileName}.new`).toString("utf8"), reviver) as Schema
    }

    // convert old objects to Map/Set
    if (state.data && initialState instanceof Map && !(state.data instanceof Map)) {
      state.data = new Map(Object.entries(state.data)) as Schema
    } else if (state.data && initialState instanceof Set && Array.isArray(state.data)) {
      state.data = new Set(state.data) as Schema
    }
  } catch {
    // Ignore unreadable metadata files and fall back to defaults.
  }

  state.data = initializer ? initializer(state.data) : state.data

  const writeMutex = new Mutex()
  let prevContent: string | undefined = undefined
  setInterval(async () => {
    if (writeMutex.isLocked()) {
      return
    }

    return await writeMutex.runExclusive(async () => {
      const content = JSON.stringify(state.data, replacer)
      if (prevContent === content) {
        return
      }

      prevContent = content
      await mkdir(dirname(fileName), { recursive: true }).catch(() => { })
      await writeFile(`${fileName}.new`, content, { encoding: "utf8" })
      await rm(fileName).catch(() => { })
      await rename(`${fileName}.new`, fileName)
      await chown(
        fileName,
        parseInt(process.env.PUID),
        parseInt(process.env.PGID)
      )
    })
  }, 5000)

  return state
}

// export function createJsonDb<Schema>(
//   fileName: string,
//   initialState: Schema,
//   initializer?: (s: Partial<Schema>) => Schema
// ) {
//   let initialized = false
//   let lastValue = initialState

//   const initializerMutex = new Mutex()
//   const get = async () => {
//     await initializerMutex.waitForUnlock()
//     if (!initialized) {
//       await initializerMutex.runExclusive(async () => {
//         initialized = true

//         try {
//           lastValue = await readFile(fileName).then(
//             (d) => JSON.parse(d.toString("utf8"), reviver) as Schema
//           )

//           // convert old objects to Map/Set
//           if (lastValue && initialState instanceof Map && !(lastValue instanceof Map)) {
//             lastValue = new Map(Object.entries(lastValue)) as Schema
//           } else if (lastValue && initialState instanceof Set && Array.isArray(lastValue)) {
//             lastValue = new Set(lastValue) as Schema
//           }
//         } catch (ex) {
//           logger.debug("[jsonDb] defaulting to initialState:", fileName)
//           lastValue = initialState
//         }

//         if (initializer) {
//           lastValue = initializer(lastValue)
//         }
//       })
//     }

//     return lastValue
//   }

//   const setterMutex = new Mutex()
//   const set = async (
//     setter: (data: Schema) => Schema | void
//   ): Promise<void> => {
//     await setterMutex.runExclusive(async () => {
//       const previous = await get()
//       const updated = setter(previous) ?? previous

//       // populate cache
//       lastValue = updated
//       void write()
//     })
//   }

//   const writterMutex = new Mutex()
//   const write = throttle(async () => {
//     // TODO: when detecting container shutdown, stop writing to avoid corrupting the JSONs

//     return await writterMutex.runExclusive(async () => {
//       const content = deterministicStringify(lastValue, { replacer })
//       await mkdir(dirname(fileName), { recursive: true }).catch(() => { })
//       await writeFile(fileName, content, { encoding: "utf8" })
//       await chown(
//         fileName,
//         parseInt(process.env.PUID),
//         parseInt(process.env.PGID)
//       )
//     })
//   }, 5000)

//   return {
//     get,
//     set,
//   } as const
// }

function replacer(key: string, value: any) {
  if (!key && value === undefined) {
    return null
  }

  if (value instanceof Map) {
    return {
      dataType: "Map",
      value: Array.from(value.entries()),
    }
  }

  if (value instanceof Set) {
    return {
      dataType: "Set",
      value: Array.from(value.keys()),
    }
  }

  return value
}

function reviver(key: string, value: any) {
  if (!key && value === null) {
    return undefined
  }

  if (typeof value === "object" && value !== null) {
    if (value.dataType === "Map") {
      return new Map(value.value)
    }

    if (value.dataType === "Set") {
      return new Set(value.value)
    }
  }

  return value
}