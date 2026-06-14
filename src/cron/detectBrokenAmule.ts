import { amuleGetCategories, restartAmule } from "amule/amule"
import { Mutex } from "async-mutex"

declare global {
    // eslint-disable-next-line no-var -- global augmentation requires var
    var detectBrokenAmuleMutex: Mutex
}

globalThis.detectBrokenAmuleMutex = new Mutex()

export async function detectBrokenAmule() {
    if (globalThis.detectBrokenAmuleMutex.isLocked()) {
        return
    }

    await globalThis.detectBrokenAmuleMutex.runExclusive(async () => {
        const categories = await amuleGetCategories()
        if (Object.keys(categories).length === 0) {
            await restartAmule()
        }
    })
}
