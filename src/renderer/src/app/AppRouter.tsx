import HomeView from '@renderer/features/home/HomeView'
import SessionView from '@renderer/features/session/SessionView'
import SettingsView from '@renderer/features/settings/SettingsView'
import AppLayout from '@renderer/layouts/AppLayout'
import { getAppState } from '@renderer/lib/app-state'
import { HashRouter, Route } from '@solidjs/router'

// Reopen where the user left off: the router reads the URL at mount, so restore
// the persisted route first. Unknown routes (e.g. a deleted session) fall back
// in their own views.
const lastRoute = getAppState('yoke.route')

if (lastRoute && /^\/(sessions\/[^/]+|settings)?$/.test(lastRoute)) {
  window.location.hash = lastRoute
}

export default function AppRouter() {
  return (
    <HashRouter>
      <Route path="/" component={AppLayout}>
        <Route path="/" component={HomeView} />
        <Route path="/sessions/:sessionId" component={SessionView} />
        <Route path="/settings" component={SettingsView} />
        {/*<Route path="/search" component={SearchView} />

        <Route path="/projects/:projectId" component={ProjectView} />*/}
      </Route>
    </HashRouter>
  )
}
