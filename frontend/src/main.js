import './styles/theme.css'
import { initPwaInstall } from './stores/pwaInstall.js'
import App from './App.svelte'

initPwaInstall()

const app = new App({ target: document.getElementById('app') })

export default app
