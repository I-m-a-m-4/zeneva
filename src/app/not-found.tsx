import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileSearch } from 'lucide-react'
import { AppConfig } from '@/lib/config';

// This page is a Server Component and has no client-side dependencies.
// This prevents the "useFirebase must be used within a FirebaseProvider" error during Vercel's build process.

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Self-contained header to avoid client-side hooks from the main MarketingHeader */}
      <header className="fixed top-0 z-50 w-full border-b border-orange-200/80 bg-orange-50/80 backdrop-blur-lg">
        <nav className="flex max-w-7xl mr-auto ml-auto py-3 sm:py-5 px-6 items-center justify-between">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center justify-center">
              <img src={AppConfig.logoUrl} alt="Zeneva Logo" className="h-10 w-auto" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
                <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
                <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-grow flex items-center justify-center bg-background text-center px-4 pt-20">
        <div>
          <FileSearch className="mx-auto h-24 w-24 text-muted-foreground/50 mb-4" />
          <h1 className="text-6xl font-bold tracking-tighter font-display text-primary">404</h1>
          <h2 className="text-3xl font-semibold tracking-tight mt-2">Page Not Found</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Sorry, we couldn’t find the page you’re looking for.
          </p>
          <Button asChild className="mt-8" size="lg">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </main>

      {/* Self-contained footer */}
       <footer className="bg-stone-950 w-full">
         <div className="max-w-7xl mx-auto py-6 px-6 text-center text-xs text-stone-400">
           © {new Date().getFullYear()} Zeneva. All rights reserved.
         </div>
       </footer>
    </div>
  )
}
