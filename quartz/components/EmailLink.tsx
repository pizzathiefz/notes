import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
// @ts-ignore
import styles from "./styles/sidebaricons.scss"

const EmailLink: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <a
      href="mailto:pizzathief0@gmail.com"
      class={classNames(displayClass, "sidebar-icon-btn")}
      aria-label="Email"
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
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    </a>
  )
}

EmailLink.css = styles

export default (() => EmailLink) satisfies QuartzComponentConstructor
