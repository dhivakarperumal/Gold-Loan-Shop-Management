const PageHeader = ({ title, background }) => {
  const subtitles = {
    "About Us": "OUR STORY  •  OUR VALUES  •  YOUR TRUST",
    "Contact Us": "HERE TO HELP  •  HERE TO LISTEN",
    Explore: "TIMELESS DESIGNS  •  EVERYDAY ELEGANCE",
    "My Profile": "YOUR ACCOUNT  •  YOUR COLLECTIONS  •  YOUR LOANS",
    "Terms & Conditions": "A PROMISE OF TRANSPARENCY AND TRUST",
  };
  const words = title.trim().split(/\s+/);
  const accentWord = words.pop();
  const bgImage = background || "/images/banner/pageheader.png";

  return (
    <div
      className="relative flex h-[210px] w-full items-center overflow-hidden sm:h-[250px] lg:h-[290px]"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="relative mx-auto w-full max-w-[1500px] px-6 sm:px-10 lg:px-14">
        <div className="w-full max-w-[760px] text-center sm:w-[58%] sm:text-center">
          <div className="mx-auto mb-3 flex max-w-[250px] items-center justify-center gap-3 text-[#c58a22] sm:mb-4">
            <span className="h-px flex-1 bg-[#c58a22]/70" />
            <span className="h-2.5 w-2.5 rotate-45 border border-[#c58a22]" aria-hidden="true" />
            <span className="h-px flex-1 bg-[#c58a22]/70" />
          </div>
          <h1 className="font-serif text-4xl font-bold uppercase leading-none tracking-[0.04em] text-[#073b2e] sm:text-5xl md:text-6xl lg:text-7xl">
            {words.length > 0 && <>{words.join(" ")} </>}
            <span className="text-[#bd801c]">{accentWord}</span>
          </h1>
          <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#35483f] sm:mt-4 sm:text-xs md:text-sm md:tracking-[0.28em]">
            {subtitles[title] || "SRI GOLDS  •  TIMELESS ELEGANCE"}
          </p>
          <div className="mx-auto mt-3 flex max-w-[250px] items-center justify-center gap-3 text-[#c58a22] sm:mt-4">
            <span className="h-px flex-1 bg-[#c58a22]/70" />
            <span className="h-2.5 w-2.5 rotate-45 border border-[#c58a22]" aria-hidden="true" />
            <span className="h-px flex-1 bg-[#c58a22]/70" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;