import { AppProps } from "$fresh/server.ts";
import TopProgressBarIsland from "../islands/TopProgressBarIsland.tsx";

export default function App({ Component }: AppProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Medusa Storefront</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <TopProgressBarIsland />
        <div class="min-h-screen bg-gray-50 flex flex-col">
          {/* Header placeholder */}
          <header class="bg-white shadow-sm py-4">
            <div class="max-w-7xl mx-auto px-4 flex justify-between items-center">
              <a href="/" class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600" f-client-nav>
                Repair Shop
              </a>
              <nav class="flex gap-4">
                <a href="/repairs/track" class="text-gray-600 hover:text-blue-600 transition-colors" f-client-nav>Track Repair</a>
              </nav>
            </div>
          </header>

          <main class="flex-grow">
            <Component />
          </main>

          {/* Footer placeholder */}
          <footer class="bg-gray-800 text-white py-8 mt-auto">
            <div class="max-w-7xl mx-auto px-4 text-center">
              <p>&copy; {new Date().getFullYear()} Repair Shop. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
