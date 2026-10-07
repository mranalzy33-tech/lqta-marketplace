// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  home: vi.fn(),
  sponsoredAds: vi.fn(),
  recentlyViewed: vi.fn(),
  setLocation: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", mocks.setLocation],
}));

vi.mock("@/components/marketplace/MarketplaceShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/marketplace/ListingCard", () => ({
  default: ({ listing }: { listing: { title: string } }) => (
    <article>{listing.title}</article>
  ),
}));

vi.mock("@/components/marketplace/StatePanels", () => ({
  EmptyPanel: ({ title }: { title: string }) => <p>{title}</p>,
  ErrorPanel: () => <p data-testid="home-section-error">load error</p>,
  LoadingPanel: ({ label }: { label: string }) => <p>{label ?? "loading"}</p>,
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({
    language: "ar",
    direction: "rtl",
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    marketplace: {
      home: { useQuery: (...args: unknown[]) => mocks.home(...args) },
      sponsoredAds: {
        useQuery: (...args: unknown[]) => mocks.sponsoredAds(...args),
      },
    },
    recentlyViewed: {
      useQuery: (...args: unknown[]) => mocks.recentlyViewed(...args),
    },
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

import Home from "./Home";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  mocks.setLocation.mockReset();
  mocks.home.mockReturnValue({
    data: {
      categories: [
        {
          id: "category-electronics",
          name: "أجهزة إلكترونية",
          name_en: "Electronics",
          slug: "electronics",
          icon: null,
          imageUrl: null,
          listingCount: 3,
          subcategories: [
            {
              id: "subcategory-phones",
              name: "جوالات",
              name_en: "Phones",
              slug: "phones",
            },
          ],
        },
      ],
      latestListings: [],
      activeAuctions: [{ id: "auction-1", title: "مزاد قائم" }],
      featuredListings: [],
      sectionErrors: {
        categories: false,
        latestListings: true,
        activeAuctions: false,
        featuredListings: false,
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.sponsoredAds.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.recentlyViewed.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
  });
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

describe("Home marketplace sections", () => {
  it("renders home sections in the requested order and keeps other sections available on errors", () => {
    mocks.sponsoredAds.mockReturnValue({
      data: [
        {
          id: "sponsored-1",
          targetUrl: "https://example.com/offer",
          imageUrl: "/sponsored.webp",
          companyName: "Partner",
          title: "Sponsored offer",
          description: "A sponsored listing",
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const { container } = render(<Home />);
    const sections = Array.from(
      container.querySelectorAll<HTMLElement>("[data-home-section]")
    ).map(section => section.dataset.homeSection);

    expect(sections).toEqual([
      "hero",
      "sponsored",
      "categories",
      "latest",
      "auctions",
      "featured",
    ]);
    expect(screen.getByTestId("home-section-error")).toBeTruthy();
    expect(screen.getByText("جوالات")).toBeTruthy();
    expect(screen.getByText("مزاد قائم")).toBeTruthy();
  });

  it("opens the existing marketplace filter when a category card is selected", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /أجهزة إلكترونية/ }));
    expect(mocks.setLocation).toHaveBeenCalledWith(
      "/marketplace?category=electronics"
    );
  });
});
