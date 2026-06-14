export const groupBy = <T, K extends string>(
    array: T[],
    predicate: (value: T, index: number, array: T[]) => K
) =>
    array.reduce(
        (acc, value, index, array) => {
             (acc[predicate(value, index, array)] ||= []).push(value)
            return acc
        },
        {} as Record<K, T[]>
    )

export const countBy = <T, K extends string>(
    array: T[],
    predicate: (value: T, index: number, array: T[]) => K
) =>
    array.reduce(
        (acc, value, index, array) => {
            acc[predicate(value, index, array)] ||= 0
            ++acc[predicate(value, index, array)]!
            return acc
        },
        {} as Record<K, number>
    )

export function toEntries<K extends string, V>(e: Record<K, V>) {
    return Object.entries(e) as [K, V][]
}

export function fromEntries<K extends string, V>(e: [K, V][]) {
    return Object.fromEntries(e) as Record<K, V>
}

export function skipFalsy<T>(v: T): v is NonNullable<T> {
    return !!v
}

export function splitIntoChunks<T>(array: T[], chunkSize: number) {
    return array.flatMap((_, i) =>
        i % chunkSize === 0 ? [array.slice(i, i + chunkSize)] : []
    );
}
