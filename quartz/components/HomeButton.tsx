import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"
import { classNames } from "../util/lang"
// @ts-ignore
import styles from "./styles/sidebaricons.scss"

const HomeButton: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <a href={baseDir} class={classNames(displayClass, "sidebar-icon-btn")} aria-label="Home">
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
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </a>
  )
}

HomeButton.css = styles

export default (() => HomeButton) satisfies QuartzComponentConstructor
