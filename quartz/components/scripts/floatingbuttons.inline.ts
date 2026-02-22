function setupFloatingButtons() {
  const scrollBtn = document.getElementById("scroll-to-top-btn")
  if (!scrollBtn) return

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      scrollBtn.classList.add("visible")
    } else {
      scrollBtn.classList.remove("visible")
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  window.addEventListener("scroll", toggleVisibility)
  window.addCleanup(() => window.removeEventListener("scroll", toggleVisibility))

  scrollBtn.addEventListener("click", scrollToTop)
  window.addCleanup(() => scrollBtn.removeEventListener("click", scrollToTop))

  toggleVisibility()
}

document.addEventListener("nav", setupFloatingButtons)
