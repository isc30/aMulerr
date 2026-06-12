import { LoaderFunction, ActionFunction, json } from "@remix-run/node"

const handler = () => json({ rid: 0, full_update: false })

export const loader = handler satisfies LoaderFunction
export const action = handler satisfies ActionFunction
