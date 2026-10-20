import React, { useEffect, useState } from "react";
import api from "../../api";
import Category from "./Category";
import Hero from "./Hero";
import Banner from "./Banner";
import Silver from "./Silver";
import Diamond from "./Diamond";
import Gold from "./Gold";
import Platinum from "./Platinum";
import ReviewsSection from "./ReviewsSection";
import TodayGoldRate from "./TodayGoldRate";
import MetalsShowcase from "./MetalsShowcase";

const HOME_SECTION_COMPONENTS = {
  gold: Gold,
  silver: Silver,
  diamond: Diamond,
  platinum: Platinum,
};

const Home = () => {
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api
      .get("/home-sections", { signal: controller.signal })
      .then(({ data }) => {
        if (!Array.isArray(data?.sections)) {
          throw new TypeError(
            "The home sections response must contain a sections array"
          );
        }

        setSections(data.sections);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        console.error("Failed to load home section settings:", error);
        setSectionsError("Home product sections could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSectionsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const visibleSections = sections
    .filter(
      (section) =>
        section.visible && HOME_SECTION_COMPONENTS[section.key]
    )
    .sort((first, second) => first.order - second.order);

  return (
    <div>
      <Hero />
      <Category />
      <TodayGoldRate />
      {sectionsLoading ? (
        <p
          className="py-8 text-center text-sm text-[#777066]"
          role="status"
        >
          Loading home collections...
        </p>
      ) : sectionsError ? (
        <p
          className="py-8 text-center text-sm text-[#777066]"
          role="alert"
        >
          {sectionsError}
        </p>
      ) : (
        <>
          {visibleSections.map((section, index) => {
            const Section = HOME_SECTION_COMPONENTS[section.key];

            return (
              <React.Fragment key={section.key}>
                {/* Show metal banner after the second product section */}
                {index === 2 && <MetalsShowcase />}

                <Section />
              </React.Fragment>
            );
          })}

          {/* Handle fewer than three visible product sections */}
          {visibleSections.length < 3 && <MetalsShowcase />}
        </>
      )}
      <Banner />

      <ReviewsSection />
    </div>
  );
};

export default Home;
