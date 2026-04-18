'use client'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">Canopy</div>
          <div className="flex gap-6">
            <a href="/products" className="text-gray-600 hover:text-gray-900">Products</a>
            <a href="/cart" className="text-gray-600 hover:text-gray-900">Cart</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-6xl font-bold mb-6 leading-tight">
            Enterprise IT Products,<br />
            <span className="text-blue-200">Instantly Available</span>
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Access products from Innovix, Ingram Micro, and PAX8 through one unified platform. 
            Enterprise-grade inventory, consumer-friendly pricing.
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/products" className="inline-block bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg text-lg font-semibold transition">
              Browse Products
            </a>
            <button className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-blue-700 transition text-lg font-semibold">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose Canopy?</h2>
          
          <div className="grid grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">10,000+ Products</h3>
              <p className="text-gray-600 leading-relaxed">
                Access to vast inventory from top suppliers. Everything you need in one place.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Real-time Sync</h3>
              <p className="text-gray-600 leading-relaxed">
                Prices and stock updated every 6 hours automatically. Always up-to-date.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Secure Checkout</h3>
              <p className="text-gray-600 leading-relaxed">
                Enterprise-grade security with Stripe. Your data is safe with us.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10K+</div>
              <p className="text-gray-600">Products</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
              <p className="text-gray-600">Available</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">3</div>
              <p className="text-gray-600">Suppliers</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
              <p className="text-gray-600">Secure</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of IT professionals using Canopy
          </p>
          <a href="/products" className="inline-block bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg text-lg font-semibold transition">
            Start Shopping Now
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4">Canopy</h4>
              <p className="text-sm">Enterprise IT products, instantly available.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Products</h4>
              <ul className="text-sm space-y-2">
                <li><a href="/products" className="hover:text-white">Browse All</a></li>
                <li><a href="/products" className="hover:text-white">By Supplier</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="text-sm space-y-2">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="text-sm space-y-2">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 Canopy Technology. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}