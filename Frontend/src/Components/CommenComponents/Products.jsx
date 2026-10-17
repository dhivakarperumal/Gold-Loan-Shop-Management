
import React from 'react';
import { Heart, ShoppingBag, ArrowRight, Plus } from 'lucide-react';

const products = [
  {
    name: 'Traditional Temple Necklace',
    category: '22K Gold',
    weight: '45.6 g',
    price: '48,500',
    image: '/images/products/necklace.png',
  },
  {
    name: 'Antique Gold Jhumkas',
    category: '22K Gold',
    weight: '12.3 g',
    price: '18,750',
    image: '/images/products/earrings.png',
  },
  {
    name: 'Classic Gold Bangles',
    category: '22K Gold',
    weight: '32.8 g',
    price: '32,400',
    image: '/images/products/bangles.png',
  },
  {
    name: 'Diamond Gold Ring',
    category: '18K Gold',
    weight: '4.5 g',
    price: '26,900',
    image: '/images/products/ring.png',
  },
];

const Products = () => {
  return (
    <section className="bg-[#fffdf8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3.3fr)_minmax(280px,0.9fr)]">

        {/* Featured products */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-xl font-bold text-[#201b14] sm:text-2xl">
                Featured Collection
              </h2>
              <div className="hidden h-px w-20 bg-[#d8ad5a] sm:block" />
              <Plus size={17} className="text-[#c99535]" />
            </div>

            <button className="group flex items-center gap-2 text-sm font-semibold text-[#34291b] hover:text-[#b17c25]">
              View All
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {products.map((product) => (
              <article
                key={product.name}
                className="group min-w-0 overflow-hidden rounded-lg border border-[#efe4d2] bg-white p-2.5 transition-all duration-300 hover:-translate-y-1 hover:border-[#d8b46c] hover:shadow-lg sm:p-3"
              >
                {/* Product image */}
                <div className="relative aspect-[1.55/1] overflow-hidden rounded-md bg-[#f5eee2]">
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  <button
                    type="button"
                    aria-label={`Add ${product.name} to wishlist`}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border border-[#f0e1cb] bg-white/95 text-[#8d6740] transition-colors hover:bg-[#fff0df] hover:text-red-600"
                  >
                    <Heart size={17} />
                  </button>
                </div>

                {/* Product details */}
                <div className="px-0.5 pt-2">
                  <h3 className="truncate font-serif text-sm font-semibold text-[#292117] sm:text-base">
                    {product.name}
                  </h3>

                  <p className="mt-1 text-xs text-[#77716a] sm:text-sm">
                    {product.category} <span className="px-1">•</span>{' '}
                    {product.weight}
                  </p>

                  <p className="mt-1.5 font-serif text-lg font-bold text-[#85421e]">
                    ₹ {product.price}
                  </p>

                  <button
                    type="button"
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-[#dba43b] bg-gradient-to-r from-[#edb64e] to-[#f3c04e] px-2 py-2 text-xs font-bold text-[#38280f] transition-all hover:from-[#dca13a] hover:to-[#e9ae35] sm:text-sm"
                  >
                    <ShoppingBag size={17} />
                    Add to Bag
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* New arrivals banner */}
        <aside className="relative min-h-[280px] overflow-hidden rounded-xl border border-[#d7bd83] bg-[#052b20] xl:min-h-0">
          <img
            src="/images/products/new-arrivals.png"
            alt="New gold jewellery arrivals"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#03291f]/95 via-[#03291f]/80 to-transparent" />

          {/* Gold corner decoration */}
          <div className="pointer-events-none absolute left-3 top-3 h-12 w-12 rounded-tl-lg border-l border-t border-[#c7a354]/70" />

          <div className="relative z-10 flex h-full min-h-[280px] max-w-[65%] flex-col items-start justify-center p-5 sm:p-7 xl:max-w-[75%]">
            <span className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#e9c979]">
              The Latest Edit
            </span>

            <h2 className="font-serif text-3xl font-semibold leading-tight text-[#f8e4a5] sm:text-4xl">
              New
              <br />
              Arrivals
            </h2>

            <p className="mt-3 max-w-[180px] font-serif text-sm leading-relaxed text-[#f8f0dd] sm:text-base">
              Modern designs
              <br />
              for every occasion
            </p>

            <button
              type="button"
              className="mt-5 inline-flex items-center gap-3 rounded-md border border-[#e8b748] bg-gradient-to-r from-[#efb83e] to-[#f8cc61] px-5 py-3 text-sm font-bold text-[#33240c] shadow-md transition-transform hover:scale-105"
            >
              Shop Now
              <ArrowRight size={18} />
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default Products;
