import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const title = fileData.frontmatter?.title
  if (!title) return null

  const isBook = fileData.slug?.startsWith("book/")

  if (isBook) {
    const fm = fileData.frontmatter as Record<string, string | undefined>
    const author = fm["author"]
    const publisher = fm["publisher"]
    const year = fm["year of publication"]
    const originalTitle = fm["original title"]

    const metaParts: string[] = []
    if (author) metaParts.push(author)
    if (publisher) metaParts.push(publisher)
    if (year) metaParts.push(String(year))
    if (originalTitle && originalTitle !== title) metaParts.push(originalTitle)

    return (
      <>
        <h1 class={classNames(displayClass, "article-title")}>{title}</h1>
        {metaParts.length > 0 && (
          <p class="book-meta">{metaParts.join(" | ")}</p>
        )}
      </>
    )
  }

  return <h1 class={classNames(displayClass, "article-title")}>{title}</h1>
}

ArticleTitle.css = `
.article-title {
  margin: 2rem 0 0 0;
}
.book-meta {
  margin: 0.25rem 0 0 0;
  font-size: 0.85em;
  color: var(--gray);
}
`

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
