import Link from 'next/link'
import { Book, BarChart } from 'lucide-react'

const NavBar = () => {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Book className="h-6 w-6" />
            <span className="font-bold text-xl">Gutenberg Explorer</span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-gray-600 hover:text-black">
              Home
            </Link>
            <Link href="/books" className="text-gray-600 hover:text-black">
              My Books
            </Link>
            <Link href="/analysis" className="text-gray-600 hover:text-black flex items-center">
              <BarChart className="mr-1 h-4 w-4" />
              Analysis
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}

export default NavBar