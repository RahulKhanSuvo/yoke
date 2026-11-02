import HomeView from '@renderer/features/home/HomeView'
import SessionView from '@renderer/features/session/SessionView'
import SettingsView from '@renderer/features/settings/SettingsView'
import AppLayout from '@renderer/layouts/AppLayout'
import { HashRouter, Route } from '@solidjs/router'

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
