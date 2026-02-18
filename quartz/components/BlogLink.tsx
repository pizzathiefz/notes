import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
// @ts-ignore
import styles from "./styles/sidebaricons.scss"

const BlogLink: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <a
      href="https://sliceofdata.app/"
      class={classNames(displayClass, "sidebar-icon-btn")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Blog"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    </a>
  )
}

BlogLink.css = styles

export default (() => BlogLink) satisfies QuartzComponentConstructor
