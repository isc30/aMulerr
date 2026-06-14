import { LoaderFunction, MetaFunction } from "@remix-run/node"
import {
  Form,
  json,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "@remix-run/react"
import { readableSize } from "~/utils/math"
import { UserIcon } from "~/icons/userIcon"
import { DownloadIcon } from "~/icons/downloadIcon"
import { ActionOrLoaderReturnType } from "~/utils/types"
import { getCategories } from "~/data/categories"
import { getDownloadClientFiles } from "~/data/downloadClient"
import { searchAndWaitForResults } from "~/data/search"
import { staleWhileRevalidate } from "~/utils/memoize"

export const meta: MetaFunction = () => [{ title: "eMulerr - Search" }]

const cachedSearch = staleWhileRevalidate(searchAndWaitForResults, {
  stalled: 1000 * 30,
})

export const loader = (async ({ request }) => {
  const qsp = new URL(request.url).searchParams
  const q = qsp.get("q")?.toString()?.trim()

  return json({
    q,
    results: await cachedSearch(q),
    currentFiles: await getDownloadClientFiles(),
    categories: await getCategories(),
  })
}) satisfies LoaderFunction

export default function Search() {
  const { q, results } = useLoaderData<typeof loader>()
  const { state } = useNavigation()

  return (
    <>
      <div className="sticky top-[60px] z-10 border-b border-l border-neutral-700 bg-neutral-800 px-2 py-1 text-sm">
        <Form method="GET" className="flex gap-2">
          <input
            key={q}
            type="text"
            name="q"
            placeholder="Search"
            className="min-w-48 grow"
            defaultValue={q}
            disabled={state !== "idle"}
            required
            // eslint-disable-next-line jsx-a11y/no-autofocus -- search page primary input
            autoFocus
          />
          <button
            type="submit"
            className="border bg-slate-600 px-4 py-1 text-white disabled:opacity-50"
            disabled={state !== "idle"}
          >
            {state !== "idle" ? "Searching..." : "Search"}
          </button>
        </Form>
        {state === "idle" && results && (
          <>
            <hr className="-mx-2 my-1 border-neutral-700" />
            <div className="">Count: {results.length}</div>
          </>
        )}
      </div>
      <div>
        {state === "idle" && results && (
          <div className="m-2 flex flex-col flex-wrap gap-2 lg:flex-nowrap">
            {results
              .sort((a, b) => {
                return b.sources - a.sources
              })
              .map((r, i) => (
                <DownloadResult key={i} result={r} />
              ))}
          </div>
        )}
      </div>
    </>
  )
}

function DownloadResult({
  result: r,
}: {
  result: NonNullable<ActionOrLoaderReturnType<typeof loader>["results"]>[0]
}) {
  const fetcher = useFetcher()
  const { currentFiles, categories } = useLoaderData<typeof loader>()
  const names = [
    ...new Set(
      currentFiles.filter((d) => d.hash === r.hash).map((d) => d.name)
    ),
  ]
  const present = r.present || names.length > 0

  return (
    <fetcher.Form
      method="POST"
      action="/api/v2/torrents/add"
      className={`flex flex-col items-center gap-2 p-2 text-sm lg:flex-row ${present ? "bg-green-950" : "bg-neutral-800"}`}
    >
      <input type="hidden" name="_action" value="download" />
      <input type="hidden" name="urls" value={r.magnetLink} />
      <div className="flex grow">
        <button
          type="button"
          className="-ml-2 -mt-2 shrink-0 px-2 pt-2 text-neutral-400"
          onClick={() => {
            prompt(undefined, r.ed2kLink)
          }}
        >
          #
        </button>
        <p className="flex grow select-text flex-col gap-1 text-sm">{r.name}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-transfer">
          <DownloadIcon /> {readableSize(r.size)}
        </span>
        <span>
          <UserIcon /> {r.sources}
        </span>
        {!present ? (
          <select
            className="w-40 border px-2 py-1"
            defaultValue="pick"
            onChange={(ev) => {
              if (ev.target.value === "$$new$$") {
                const cat = prompt("Enter the name of the new category")
                if (!cat) {
                  ev.target.value = "pick"
                  return
                }
                ev.target.options[ev.target.options.length] = new Option(
                  cat,
                  cat
                )
                ev.target.value = cat
              }

              fetcher.submit(ev.target.form)
            }}
            name="category"
            disabled={fetcher.state !== "idle"}
          >
            <option value="pick" disabled>
              -- Download --
            </option>
            <hr />
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <hr />
            <option value="$$new$$">Create new category...</option>
          </select>
        ) : (
          <button
            className="text-right sm:w-40"
            title={`Grabbed as:${names.map((n) => `\n\t- ${n}`).join("")}`}
            onClick={() =>
              alert(`Grabbed as:${names.map((n) => `\n\t- ${n}`).join("")}`)
            }
          >
            Already in Downloads ℹ️
          </button>
        )}
      </div>
    </fetcher.Form>
  )
}
