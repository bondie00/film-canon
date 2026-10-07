import PageShell from './PageShell'

/**
 * The text pages (About, Methodology): a title, a lede, then sections of prose
 * set to a readable measure inside the narrow column. Top-level pages, so no
 * crumb — they have no parent overview to go back to.
 */
export default function ProsePage({ title, lede, children }) {
  return (
    <PageShell width="narrow">
      <article className="max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tight leading-none mb-4">
          {title}
        </h1>
        {lede && <p className="text-lg leading-relaxed text-gray-700 mb-10">{lede}</p>}
        {children}
      </article>
    </PageShell>
  )
}

export function ProseSection({ id, title, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="mb-3 border-b-2 border-black pb-1 text-xl font-black uppercase tracking-tight">
        {title}
      </h2>
      <div className="space-y-4 text-base leading-relaxed text-gray-800">{children}</div>
    </section>
  )
}

/**
 * A section still to be written: what it should cover, in a dashed box so an
 * unfinished page can't be mistaken for a finished one. Delete as each fills in.
 */
export function Draft({ children }) {
  return (
    <div className="border-2 border-dashed border-gray-400 p-4 text-sm text-gray-500">
      <span className="font-bold uppercase tracking-wide text-gray-600">To write: </span>
      {children}
    </div>
  )
}
