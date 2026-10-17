
import React from 'react';

const categories = [
  {
    name: 'Necklaces',
    image: '/images/categories/necklacecat.png',
  },
  {
    name: 'Earrings',
    image: '/images/categories/earrings.png',
  },
  {
    name: 'Bangles',
    image: '/images/categories/bangles.png',
  },
  {
    name: 'Rings',
    image: '/images/categories/rings.png',
  },
  {
    name: 'Chains',
    image: '/images/categories/choker.png',
  },
  {
    name: 'Mangalsutra',
    image: '/images/categories/mangalsutra.png',
  },
  {
    name: 'Temple Jewellery',
    image: '/images/categories/templejewel.png',
  },
  {
    name: 'Coins & Bars',
    image: '/images/categories/goldcoinsandbars.png',
  },
  {
    name: 'Silver Articles',
    image: '/images/categories/silverarticle.png',
  },
];

const Category = () => {
  return (
    <section className="relative overflow-hidden border-y border-[#ead8b6] bg-[#fffdf8] px-3 py-5 sm:px-6 lg:px-8">
      {/* Decorative ornaments */}
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-4xl text-[#e9c77e]/80 sm:left-7 sm:text-6xl">
        ❀
      </span>

      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-4xl text-[#e9c77e]/80 sm:right-7 sm:text-6xl">
        ❀
      </span>

      <div className="mx-auto grid max-w-[1700px] grid-cols-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-9">
        {categories.map((category, index) => (
          <button
            key={category.name}
            type="button"
            className={`group relative flex min-w-0 flex-col items-center px-2 text-center transition-transform duration-300 hover:-translate-y-1 ${
              index % 3 !== 2
                ? 'sm:border-r sm:border-[#ead9bd]/70 lg:border-r'
                : ''
            }`}
          >
            {/* Circular image */}
            <div className="relative aspect-square w-full max-w-[105px] rounded-full border-2 border-[#e9ce98] bg-white p-[3px] shadow-[0_0_0_2px_rgba(225,188,116,0.12)] transition-all duration-300 group-hover:border-[#bd8732] group-hover:shadow-[0_0_0_4px_rgba(225,188,116,0.18)] sm:max-w-[125px] lg:max-w-[145px]">
              <div className="h-full w-full overflow-hidden rounded-full border border-[#f2e4c8]">
                <img
                  src={category.image}
                  alt={category.name}
                  loading="lazy"
                  className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </div>

            {/* Category name */}
            <span className="mt-2 whitespace-nowrap text-xs font-semibold text-[#29231c] transition-colors group-hover:text-[#a77525] sm:mt-3 sm:text-sm lg:text-base">
              {category.name}
            </span>

            {/* Gold underline */}
            <div className="relative mt-2 h-[2px] w-12 bg-gradient-to-r from-transparent via-[#d5a64e] to-transparent sm:w-16">
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] leading-none text-[#c79a43]">
                ✦
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default Category;
