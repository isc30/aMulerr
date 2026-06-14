import { ActionFunction, LoaderFunction } from "@remix-run/node"
import {
  NavLink,
  NavLinkProps,
  json,
  useFetcher,
  useLoaderData,
  useNavigate,
  useOutlet,
} from "@remix-run/react"
import { PropsWithChildren, useState } from "react"
import { restartAmule, amuleGetStats } from "amule/amule"
import { useRevalidate } from "~/utils/useRevalidate"
import { readableSize } from "~/utils/math"
import { twMerge } from "tailwind-merge"
import { DownloadIcon } from "~/icons/downloadIcon"
import { SearchIcon } from "~/icons/searchIcon"
import { UpIcon } from "~/icons/upIcon"
import { DownIcon } from "~/icons/downIcon"
import { AddIcon } from "~/icons/addIcon"
import { getCategories } from "~/data/categories"
import { getDownloadClientFiles } from "~/data/downloadClient"

export const action = (async () => {
  void restartAmule().catch(() => {})
  return null
}) satisfies ActionFunction

export const loader = (async () => {
  const stats = await amuleGetStats()
  const downloads = await getDownloadClientFiles()
  const ed2kPort = process.env.ED2K_PORT
  const version = process.env.IMG_VER

  return json({
    version,
    stats,
    speed_up: stats.speed_up ?? 0,
    speed_down: stats.speed_down ?? 0,
    ed2kPort,
    downloads,
    time: new Date(),
    categories: await getCategories(),
  })
}) satisfies LoaderFunction

export default function Layout() {
  const fetcher = useFetcher<typeof loader>()
  const data = useLoaderData<typeof loader>()
  const outlet = useOutlet()
  const navigate = useNavigate()
  const [menuHidden, setMenuHidden] = useState(true)

  useRevalidate(true, 1000)

  return (
    <>
      <header className="fixed top-0 z-40 flex h-[60px] w-full shrink-0 items-center gap-3 whitespace-nowrap border-b border-neutral-700 bg-neutral-800 p-3 text-white">
        <NavLink to="/" className="hidden items-center sm:flex">
          <img alt="logo" src="/logo.png" className="h-7" />
          <div className="ml-3 hidden sm:block">eMulerr</div>
        </NavLink>
        <button
          className="block p-2 text-xl sm:hidden"
          onClick={() => setMenuHidden((o) => !o)}
        >
          <MenuIcon />
        </button>
        <div className="grow"></div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end gap-x-2 sm:flex-row">
            <span
              className="text-upload text-sm"
              title="Upload Speed - Small activity indicates P2P handshakes"
            >
              <UpIcon />
              {readableSize(data.speed_up)}/s
            </span>
            <span
              className="text-download text-sm"
              title="Download Speed - Small activity indicates P2P handshakes"
            >
              <DownIcon />
              {readableSize(data.speed_down)}/s
            </span>
          </div>
          {/* <span
            className={`${data.bufferCount > 0 ? "text-buffer" : "text-error"} flex items-center gap-px text-sm`}
            title="Buffer"
          >
            <BufferIcon />
            {data.bufferCount}
          </span> */}
        </div>
        <div className="flex items-center gap-1">
          <StatusPill
            state={
              !data.stats.id
                ? "error"
                : data.stats.id < 16777216
                  ? "warn"
                  : data.stats.id != 0xffffffff
                    ? "ok"
                    : "info"
            }
            title={{
              info: "Connecting...",
              ok: `Connected - P2P - ${data.stats.serv_name}`,
              warn:
                "Connected - Low ID\nYour download speed will be impacted\nNeed to open the TCP+UDP port " +
                data.ed2kPort,
              error: "Disconnected",
            }}
          >
            eD2k
          </StatusPill>
          <StatusPill
            state={
              !data.stats.kad_connected
                ? "error"
                : data.stats.kad_firewalled
                  ? "warn"
                  : "ok"
            }
            title={{
              info: "Connecting...",
              ok: "Connected - P2P",
              warn:
                "Connected - Firewalled\nYour download speed will be impacted\nNeed to open the TCP+UDP port " +
                data.ed2kPort,
              error: "Disconnected",
            }}
          >
            KAD
          </StatusPill>
          <fetcher.Form
            action="/"
            method="POST"
            onSubmit={(ev) => {
              const confirmation = confirm(
                `Are you sure you want to reconnect?`
              )
              if (!confirmation) ev.preventDefault()
            }}
          >
            <button
              type="submit"
              className="p-2 text-xl text-gray-100"
              title="(!) Restart and Reconnect"
            >
              <RestartIcon />
            </button>
          </fetcher.Form>
        </div>
      </header>
      <div
        data-hidden={menuHidden}
        className="fixed left-0 top-0 z-30 hidden h-full w-full backdrop-blur-sm data-[hidden=false]:block sm:data-[hidden=false]:hidden"
        role="button"
        tabIndex={0}
        onClick={() => setMenuHidden(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            setMenuHidden(true)
          }
        }}
      ></div>
      <nav
        className="fixed top-[60px] z-40 flex h-[calc(100%-60px)] w-[250px] flex-col bg-neutral-800 max-sm:transition-transform max-sm:data-[hidden=true]:-translate-x-full"
        data-hidden={menuHidden}
      >
        <StyledNavLink to="/?index" onClick={() => setMenuHidden(true)}>
          Home
        </StyledNavLink>
        <StyledNavLink
          to="/download-client"
          onClick={() => setMenuHidden(true)}
        >
          <span className="text-download">
            <DownloadIcon />
          </span>
          <span>Downloads</span>
          <span className="grow text-right">({data.downloads.length})</span>
        </StyledNavLink>
        <StyledNavLink to="/search" onClick={() => setMenuHidden(true)}>
          <SearchIcon /> Search
        </StyledNavLink>
        <div className="grow"></div>
        <button
          className="m-4 flex items-center justify-center gap-2 rounded-md border-2 border-neutral-600 bg-neutral-300 p-4 font-medium leading-none text-neutral-900 lg:gap-4"
          onClick={() => {
            const urls = prompt(
              "Enter eD2k links (multiple links separated by semicolon)"
            )
              ?.trim()
              .split(";")
              .map((u) => u.trim())
              .filter((u) => !!u)

            if (!urls?.length) return

            let category: string | null =
              data.categories.length === 1 ? data.categories[0]! : null
            while (!category) {
              category = prompt(
                `Select a download category:\n${data.categories.map((c) => "  - " + c).join("\n")}`
              )
              if (!category) return
            }

            const formData = new FormData()
            formData.append("category", category)
            urls.forEach((url) => formData.append("urls", url))

            fetcher.submit(formData, {
              method: "POST",
              action: "/api/v2/ed2k/add",
            })

            alert("Download started!")
            navigate("/download-client")
          }}
        >
          <span className="text-xl">
            <AddIcon />
          </span>
          <span>Add eD2k link</span>
        </button>
        <span className="mb-4 select-text text-center text-sm text-neutral-500">
          {data.version}
        </span>
      </nav>
      <main className="relative mt-[60px] sm:ml-[250px]">{outlet}</main>
    </>
  )
}

function StyledNavLink({ ...props }: Omit<NavLinkProps, "className">) {
  return (
    <NavLink
      className={twMerge(
        "flex items-center gap-4 px-6 py-4 font-medium text-white aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-[current=page]:bg-neutral-700"
      )}
      {...props}
    />
  )
}

function StatusPill({
  state,
  title,
  children,
  ...props
}: PropsWithChildren<{
  state: "info" | "ok" | "warn" | "error"
  title: Record<typeof state, string>
}>) {
  const styles: Record<typeof state, string> = {
    info: "bg-slate-700 border-slate-500",
    ok: "bg-green-700 border-green-500",
    warn: "bg-yellow-700 border-yellow-500",
    error: "bg-red-600 border-red-400",
  }

  return (
    <span
      className={`rounded-full border px-1 py-1 text-xs font-medium sm:px-2 sm:text-sm ${styles[state]}`}
      title={title[state]}
      {...props}
    >
      {children}
    </span>
  )
}

function RestartIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      style={{ height: "1em" }}
    >
      <path
        fill="currentColor"
        d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V256c0 17.7 14.3 32 32 32s32-14.3 32-32V32zM143.5 120.6c13.6-11.3 15.4-31.5 4.1-45.1s-31.5-15.4-45.1-4.1C49.7 115.4 16 181.8 16 256c0 132.5 107.5 240 240 240s240-107.5 240-240c0-74.2-33.8-140.6-86.6-184.6c-13.6-11.3-33.8-9.4-45.1 4.1s-9.4 33.8 4.1 45.1c38.9 32.3 63.5 81 63.5 135.4c0 97.2-78.8 176-176 176s-176-78.8-176-176c0-54.4 24.7-103.1 63.5-135.4z"
      ></path>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 448 512"
      style={{ height: "1em" }}
    >
      <path
        fill="currentColor"
        d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"
      ></path>
    </svg>
  )
}
