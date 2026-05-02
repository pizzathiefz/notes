// node_modules/@quartz-community/utils/dist/lang.js
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}
var l;
function S(n2) {
  return n2.children;
}
l = { __e: function(n2, l2, u3, t2) {
  for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
    if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
  } catch (l3) {
    n2 = l3;
  }
  throw n2;
} }, "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, Math.random().toString(8);

// node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var f2 = 0;
function u2(e2, t2, n2, o2, i2, u3) {
  t2 || (t2 = {});
  var a2, c2, p2 = t2;
  if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
  var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
  if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
  return l.vnode && l.vnode(l2), l2;
}

// src/components/ArticleTitle.tsx
var ArticleTitle = ({ fileData, displayClass }) => {
  const title = fileData.frontmatter?.title;
  if (!title) return null;
  const isBook = fileData.slug?.startsWith("book/");
  if (isBook) {
    const fm = fileData.frontmatter;
    const authorRaw = fm["author"];
    const publisher = fm["publisher"];
    const year = fm["year of publication"];
    const originalTitle = fm["original title"];
    const author = Array.isArray(authorRaw) ? authorRaw.map((a2) => a2.trim()).join(" \xB7 ") : authorRaw?.split(",").map((a2) => a2.trim()).join(" \xB7 ");
    const metaParts = [];
    if (author) metaParts.push(author);
    if (publisher) metaParts.push(publisher);
    if (year) metaParts.push(String(year));
    if (originalTitle && originalTitle !== title) metaParts.push(/* @__PURE__ */ u2("em", { children: originalTitle }));
    const sep = "  |  ";
    const metaNodes = metaParts.flatMap(
      (part, i2) => i2 < metaParts.length - 1 ? [part, sep] : [part]
    );
    return /* @__PURE__ */ u2(S, { children: [
      /* @__PURE__ */ u2("h1", { class: classNames(displayClass, "article-title"), children: title }),
      metaParts.length > 0 && /* @__PURE__ */ u2("p", { class: "book-meta", children: metaNodes })
    ] });
  }
  return /* @__PURE__ */ u2("h1", { class: classNames(displayClass, "article-title"), children: title });
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
var ArticleTitle_default = (() => ArticleTitle);

export { ArticleTitle_default as ArticleTitle };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map