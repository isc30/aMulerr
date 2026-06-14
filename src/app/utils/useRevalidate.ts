import { useFetcher } from "@remix-run/react"
import { useCallback, useEffect } from "react"

export function useRevalidate(enabled: boolean, time: number) {
  const fetcher = useFetcher()

  const revalidate = useCallback(function revalidate() {
    if (fetcher.state !== 'idle') return
    const form = window.document.createElement("form")
    form.action = "/revalidate"
    form.method = "POST"
    fetcher.submit(form)
  }, [fetcher])

  useEffect(() => {
    if (enabled) {
      const i = setInterval(revalidate, time)
      return () => clearInterval(i)
    }
  }, [revalidate, enabled, time])
}
