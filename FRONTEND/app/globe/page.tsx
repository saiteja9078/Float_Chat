import InteractiveGlobe from "@/components/interactive-globe"
import { Globe, Waves } from "lucide-react"

export default function GlobePage() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      <header className="bg-card border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">argo data</p>
              <h1 className="text-2xl font-semibold leading-tight">Global Float Explorer</h1>
              <p className="text-sm text-muted-foreground">
                Real-time ocean intelligence with the same clean layout as Float Chat.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col gap-6">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-xl shadow-primary/5 min-h-[65vh] lg:min-h-[70vh]">
              <InteractiveGlobe />
            </div>

            <aside className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Waves className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">status overview</p>
                    <p className="text-lg font-semibold">Network Snapshot</p>
                  </div>
                </div>
                <dl className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <dt>Floats streaming</dt>
                    <dd className="text-foreground font-semibold">324</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>New deployments (24h)</dt>
                    <dd className="text-foreground font-semibold">+12</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>BGC sensors online</dt>
                    <dd className="text-foreground font-semibold">78</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Use the filters in the upper-left corner of the globe to match the chat experience, then hover
                  or tap floats for quick summaries. Export-ready data is still available from the download action.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  )
}
