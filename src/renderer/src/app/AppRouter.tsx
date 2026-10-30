import AppLayout from '@renderer/layouts/AppLayout'
import { HashRouter, Route } from '@solidjs/router'

export default function AppRouter() {
  return (
    <HashRouter>
      <Route path="/" component={AppLayout}>
        {/*<Route path="/" component={HomeView} />
        <Route path="/search" component={SearchView} />
        <Route path="/settings" component={SettingsView} />

        <Route path="/projects/:projectId" component={ProjectView}>
          <Route path="/sessions/:sessionId" component={SessionView} />
        </Route>*/}
      </Route>
    </HashRouter>
  )
}
