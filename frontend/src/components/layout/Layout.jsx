import { Outlet } from 'react-router-dom'
import ChatWidget from '../chat/ChatWidget'
import Footer from './Footer'
import Header from './Header'
import NavBar from './NavBar'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <header className="sticky top-0 z-30 bg-white/95 shadow-[0_1px_0_rgb(0_0_0/0.04)] backdrop-blur">
        <Header />
        <NavBar />
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
