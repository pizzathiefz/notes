import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"
// @ts-ignore
import styles from "./styles/floatingbuttons.scss"
// @ts-ignore
import script from "./scripts/floatingbuttons.inline"

const FloatingButtons: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <div class="floating-buttons">
      <a href={baseDir} class="floating-btn" aria-label="Home">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </a>
      <button id="scroll-to-top-btn" class="floating-btn" aria-label="Scroll to top">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  )
}

FloatingButtons.css = styles
FloatingButtons.afterDOMLoaded = script

export default (() => FloatingButtons) satisfies QuartzComponentConstructor
