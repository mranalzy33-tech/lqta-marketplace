// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  setFeatured: vi.fn(),
  deleteListing: vi.fn(),
  updateStatus: vi.fn(),
  invalidate: vi.fn(),
  listingsData: {
    items: [
      {
        id: "listing-1",
        seller_id: "seller-1",
        category_id: "category-1",
        title: "Test listing",
        description: "A listing used to test the admin controls.",
        type: "fixed",
        status: "pending",
        is_featured: false,
        fixed_price: 10,
        starting_price: null,
        current_price: null,
        auction_end_time: null,
        rejection_reason: null,
        created_at: "2026-09-28T00:00:00.000Z",
        images: [],
        sellerName: "Seller",
        sellerEmail: "seller@example.com",
        sellerPhone: null,
        categoryName: "Cars",
      },
    ],
    page: 1,
    hasMore: false,
  },
}));

vi.mock("@/components/MarketplaceDashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/marketplace/StatePanels", () => ({
  EmptyPanel: ({ title }: { title: string }) => <div>{title}</div>,
  ErrorPanel: () => <div>error</div>,
  LoadingPanel: () => <div>loading</div>,
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1", role: "super_admin", adminPermissions: [] },
    loading: false,
  }),
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ t: (key: string) => key, language: "ar" }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      listings: {
        useQuery: () => ({
          data: mocks.listingsData,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
      updateListingStatus: {
        useMutation: () => ({ mutate: mocks.updateStatus, isPending: false }),
      },
      setListingFeatured: {
        useMutation: () => ({ mutate: mocks.setFeatured, isPending: false }),
      },
      deleteListing: {
        useMutation: () => ({ mutate: mocks.deleteListing, isPending: false }),
      },
    },
    useUtils: () => ({
      admin: {
        listings: { invalidate: mocks.invalidate },
        pendingListings: { invalidate: mocks.invalidate },
        overview: { invalidate: mocks.invalidate },
      },
      marketplace: { home: { invalidate: mocks.invalidate } },
    }),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import AdminListings from "./AdminListings";

describe("AdminListings controls", () => {
  beforeEach(() => {
    mocks.setFeatured.mockReset();
    mocks.deleteListing.mockReset();
    mocks.updateStatus.mockReset();
    mocks.invalidate.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lets an authorized listing manager mark a pending listing as featured", () => {
    render(<AdminListings />);
    fireEvent.click(
      screen.getByRole("button", { name: "adminListings.feature" })
    );
    expect(mocks.setFeatured).toHaveBeenCalledWith({
      listingId: "listing-1",
      isFeatured: true,
    });
  });

  it("requires confirmation before deleting a listing", () => {
    render(<AdminListings />);
    fireEvent.click(
      screen.getByRole("button", { name: "adminListings.deleteListing" })
    );
    expect(window.confirm).toHaveBeenCalledWith("adminListings.deleteConfirm");
    expect(mocks.deleteListing).toHaveBeenCalledWith({
      listingId: "listing-1",
    });
  });

  it("does not delete a listing when the administrator cancels confirmation", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminListings />);
    fireEvent.click(
      screen.getByRole("button", { name: "adminListings.deleteListing" })
    );
    expect(mocks.deleteListing).not.toHaveBeenCalled();
  });
});
