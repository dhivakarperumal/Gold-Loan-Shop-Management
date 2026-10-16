import React from "react";

const Loader = () => (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8F7F2] px-6 text-[#173D35]">
    <section className="relative flex w-full max-w-sm flex-col items-center px-8 py-12 text-center">
      <div className="relative mb-7 flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-[#E9E2D2]" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#C69A32] border-r-[#C69A32]" />
        <div className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-[#FBF8EF] p-2">
          <img src="/images/logo.png" alt="Sri Golds" className="h-full w-full object-contain" />
        </div>
      </div>

      <p className="font-serif text-2xl font-semibold tracking-wide text-[#173D35]">Sri Golds</p>
      <p className="mt-2 text-sm text-[#69766F]">A little sparkle is on its way.</p>

      <div className="mt-8 flex items-center gap-2" role="status" aria-label="Loading">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C69A32]"
            style={{ animationDelay: `${dot * 0.16}s` }}
          />
        ))}
      </div>
    </section>
  </main>
);

export default Loader;
