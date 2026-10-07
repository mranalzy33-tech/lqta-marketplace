// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  categoriesQuery: vi.fn(),
  browseQuery: vi.fn(),
}));

vi.mock("@/components/marketplace/MarketplaceShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/marketplace/ListingCard", () => ({
  default: ({ listing }: { listing: { title: string } }) => (
    <div>{listing.title}</div>
  ),
}));

vi.mock("@/components/marketplace/StatePanels", () => ({
  EmptyPanel: ({
    title,
    action,
  }: {
    title: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div>
      <p>{title}</p>
      {action ? <button onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
  ErrorPanel: () => <div>load error</div>,
  LoadingPanel: () => <div>loading</div>,
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ language: "ar", t: (key: string) => key }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    marketplace: {
      categories: {
        useQuery: (...args: unknown[]) => mocks.categoriesQuery(...args),
      },
      browse: { useQuery: (...args: unknown[]) => mocks.browseQuery(...args) },
    },
  },
}));

import MarketplaceBrowse from "./MarketplaceBrowse";

const categories = [
  {
    id: "category-electronics",
    name: "إلكترونيات وأجهزة",
    name_en: "Electronics",
    slug: "electronics",
    icon: null,
    imageUrl: null,
    listingCount: 2,
    subcategories: [
      {
        id: "subcategory-phones",
        category_id: "category-electronics",
        name: "جوالات",
        name_en: "Phones",
        slug: "phones",
      },
      {
        id: "subcategory-laptops",
        category_id: "category-electronics",
        name: "لابتوبات",
        name_en: "Laptops",
        slug: "laptops",
      },
    ],
  },
  {
    id: "category-vehicles",
    name: "سيارات ومركبات",
    name_en: "Vehicles",
    slug: "vehicles",
    icon: null,
    imageUrl: null,
    listingCount: 1,
    subcategories: [
      {
        id: "subcategory-cars",
        category_id: "category-vehicles",
        name: "سيارات",
        name_en: "Cars",
        slug: "cars",
      },
    ],
  },
];

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

beforeEach(() => {
  window.history.replaceState(null, "", "/marketplace");
  mocks.categoriesQuery.mockReset();
  mocks.browseQuery.mockReset();
  mocks.categoriesQuery.mockReturnValue({
    data: categories,
    isSuccess: true,
    isLoading: false,
    isError: false,
  });
  mocks.browseQuery.mockReturnValue({
    data: { items: [], hasMore: false },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe("MarketplaceBrowse category flow", () => {
  it("opens a shared category URL as selected and filters only its own subcategories", async () => {
    window.history.replaceState(
      null,
      "",
      "/marketplace?category=electronics&q=watch&type=auction"
    );
    render(<MarketplaceBrowse />);

    expect(
      screen.getByRole("heading", { name: "إلكترونيات وأجهزة" })
    ).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "browse.searchPlaceholder" })
    ).toHaveProperty("value", "watch");
    expect(screen.getByRole("button", { name: "جوالات" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "لابتوبات" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "سيارات" })).toBeNull();
    expect(
      screen
        .getAllByRole("button", { name: "browse.all" })[0]
        .getAttribute("aria-pressed")
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "جوالات" }));

    await waitFor(() =>
      expect(mocks.browseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categorySlug: "electronics",
          subcategorySlug: "phones",
          query: "watch",
          type: "auction",
        })
      )
    );
    const params = new URLSearchParams(window.location.search);
    expect(params.get("category")).toBe("electronics");
    expect(params.get("subcategory")).toBe("phones");
    expect(params.get("q")).toBe("watch");
    expect(params.get("type")).toBe("auction");

    fireEvent.click(screen.getByRole("button", { name: "لابتوبات" }));
    await waitFor(() =>
      expect(mocks.browseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categorySlug: "electronics",
          subcategorySlug: "laptops",
          query: "watch",
          type: "auction",
        })
      )
    );
    expect(new URLSearchParams(window.location.search).get("subcategory")).toBe(
      "laptops"
    );

    fireEvent.click(screen.getAllByRole("button", { name: "browse.all" })[0]);
    await waitFor(() =>
      expect(mocks.browseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categorySlug: "electronics",
          subcategorySlug: "",
        })
      )
    );
    expect(
      new URLSearchParams(window.location.search).get("subcategory")
    ).toBeNull();
    expect(
      screen
        .getAllByRole("button", { name: "browse.all" })[0]
        .getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("clears the old subcategory when switching the main category", async () => {
    window.history.replaceState(
      null,
      "",
      "/marketplace?category=electronics&subcategory=phones&q=watch&page=2"
    );
    render(<MarketplaceBrowse />);

    fireEvent.click(
      screen.getByRole("button", { name: "browse.changeCategory" })
    );
    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).get("category")).toBe(
        null
      )
    );
    expect(new URLSearchParams(window.location.search).get("q")).toBe("watch");
    fireEvent.change(
      screen.getByRole("combobox", { name: "browse.allCategories" }),
      { target: { value: "vehicles" } }
    );

    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).get("category")).toBe(
        "vehicles"
      )
    );
    const params = new URLSearchParams(window.location.search);
    expect(params.get("subcategory")).toBeNull();
    expect(params.get("page")).toBeNull();
    expect(params.get("q")).toBe("watch");
    expect(screen.getByRole("button", { name: "سيارات" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "جوالات" })).toBeNull();
  });

  it("restores category and subcategory filters through browser Back and Forward", async () => {
    window.history.replaceState(null, "", "/marketplace?category=electronics");
    render(<MarketplaceBrowse />);

    fireEvent.click(screen.getByRole("button", { name: "جوالات" }));
    await waitFor(() =>
      expect(
        new URLSearchParams(window.location.search).get("subcategory")
      ).toBe("phones")
    );

    await act(async () => {
      window.history.back();
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    await waitFor(() =>
      expect(
        new URLSearchParams(window.location.search).get("subcategory")
      ).toBe(null)
    );
    expect(
      screen
        .getAllByRole("button", { name: "browse.all" })[0]
        .getAttribute("aria-pressed")
    ).toBe("true");

    await act(async () => {
      window.history.forward();
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    await waitFor(() =>
      expect(
        new URLSearchParams(window.location.search).get("subcategory")
      ).toBe("phones")
    );
    expect(
      screen
        .getByRole("button", { name: "جوالات" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("recovers safely from an unknown category or subcategory deep link", async () => {
    window.history.replaceState(
      null,
      "",
      "/marketplace?category=unknown&subcategory=missing"
    );
    render(<MarketplaceBrowse />);

    await waitFor(() => expect(window.location.search).toBe(""));
    expect(
      screen.getByRole("combobox", { name: "browse.allCategories" })
    ).toBeTruthy();
  });

  it("does not render an empty subcategory shelf when a category has no branches", () => {
    mocks.categoriesQuery.mockReturnValue({
      data: [{ ...categories[0], subcategories: [] }],
      isSuccess: true,
      isLoading: false,
      isError: false,
    });
    window.history.replaceState(null, "", "/marketplace?category=electronics");
    render(<MarketplaceBrowse />);

    expect(
      screen.getByRole("heading", { name: "إلكترونيات وأجهزة" })
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "browse.all" })).toHaveLength(
      1
    );
  });
});
