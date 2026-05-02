import type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
} from "@quartz-community/types";
import { classNames } from "../util/lang";

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const title = (fileData.frontmatter as { title?: string } | undefined)?.title;
  if (!title) return null;

  const isBook = fileData.slug?.startsWith("book/");

  if (isBook) {
    const fm = fileData.frontmatter as Record<string, string | string[] | undefined>;
    const authorRaw = fm["author"];
    const publisher = fm["publisher"];
    const year = fm["year of publication"];
    const originalTitle = fm["original title"];

    const author = Array.isArray(authorRaw)
      ? authorRaw.map((a) => a.trim()).join(" · ")
      : authorRaw?.split(",").map((a) => a.trim()).join(" · ");

    const metaParts: (string | any)[] = [];
    if (author) metaParts.push(author);
    if (publisher) metaParts.push(publisher);
    if (year) metaParts.push(String(year));
    if (originalTitle && originalTitle !== title) metaParts.push(<em>{originalTitle}</em>);

    const sep = "  |  ";
    const metaNodes = metaParts.flatMap((part, i) =>
      i < metaParts.length - 1 ? [part, sep] : [part],
    );

    return (
      <>
        <h1 class={classNames(displayClass, "article-title")}>{title}</h1>
        {metaParts.length > 0 && <p class="book-meta">{metaNodes}</p>}
      </>
    );
  }

  return <h1 class={classNames(displayClass, "article-title")}>{title}</h1>;
};

ArticleTitle.css = `
.article-title {
  margin: 2rem 0 0 0;
}
.book-meta {
  margin: 0.5rem 0 0 0;
  padding: 0.4rem 0.75rem;
  font-size: 0.95em;
  color: var(--gray);
  text-align: right;
  letter-spacing: 0.04em;
  border-top: 1px solid var(--lightgray);
  background-color: var(--light);
  border-radius: 0 0 4px 4px;
}
`;

export default (() => ArticleTitle) satisfies QuartzComponentConstructor;
