export function applyTheme(theme: 'bloomberg' | 'dark' | 'light') {
  if (theme === 'bloomberg') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}
