import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// GitHub Pages serves this as a project site under /<repo-name>/, not domain
// root — the router needs that same prefix (Vite already bakes it into
// import.meta.env.BASE_URL from vite.config.ts's `base`) or it can't match
// any route against the real pathname and falls back to its Not Found state.
export const router = createRouter({ routeTree, basepath: import.meta.env.BASE_URL })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
