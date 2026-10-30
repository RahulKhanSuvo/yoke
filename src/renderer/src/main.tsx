import AppRouter from './app/AppRouter'
import './assets/main.css'

import { render } from 'solid-js/web'

render(() => <AppRouter />, document.getElementById('root') as HTMLElement)
