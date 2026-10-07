// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/contexts/LocaleContext";

const mocks = vi.hoisted(() => ({
  createListingMutate: vi.fn(),
  convertToAuctionMutate: vi.fn(),
  workspaceQuery: vi.fn(() => ({
    isLoading: false,
    isError: false,
    data: {
      walletBalance: 0,
      listings: [] as Array<{
        id: string;
        title: string;
        type: "fixed" | "auction";
        status: string;
        source: string;
        fixed_price: number | null;
        current_price: number | null;
        starting_price: number | null;
        created_at: string;
        canConvertToAuction: boolean;
      }>,
      transactions: [] as Array<{
        id: string;
        amount: number;
        type: string;
        status: string;
        created_at: string;
      }>,
      soldItems: [] as Array<{
        id: string;
        listingTitle: string;
        created_at: string;
        buyerName: string;
        delivery_status: string;
        final_price: number;
        imageUrl: string | null;
      }>,
    },
    refetch: vi.fn(),
  })),
  createListing: { mutate: vi.fn(), isPending: false },
  uploadImage: { mutateAsync: vi.fn(), isPending: false },
  invalidate: vi.fn(),
  becomeSellerMutate: vi.fn(),
  overviewQuery: vi.fn((..._args: unknown[]) => ({
    isLoading: false,
    isError: false,
    data: { listingsCount: 0, activeAuctionsCount: 0 },
    refetch: vi.fn(),
  })),
  isSeller: true,
}));

vi.mock("@/components/MarketplaceDashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

vi.mock("@/components/marketplace/StatePanels", () => ({
  ErrorPanel: () => <div>تعذر التحميل</div>,
  LoadingPanel: () => <div>جارٍ التحميل</div>,
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { isSeller: mocks.isSeller, role: "user" },
    loading: false,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    seller: {
      overview: {
        useQuery: (input: unknown, options: unknown) =>
          mocks.overviewQuery(input, options),
      },
      workspace: {
        useQuery: () => mocks.workspaceQuery(),
      },
      uploadImage: { useMutation: () => mocks.uploadImage },
      createListing: {
        useMutation: () => ({
          ...mocks.createListing,
          mutate: mocks.createListingMutate,
        }),
      },
      convertToAuction: {
        useMutation: () => ({
          mutate: mocks.convertToAuctionMutate,
          isPending: false,
        }),
      },
    },
    marketplace: {
      categories: {
        useQuery: () => ({
          isLoading: false,
          data: [{ id: "category-1", name: "أجهزة إلكترونية" }],
        }),
      },
      sellerOffers: {
        useQuery: () => ({
          isLoading: false,
          isError: false,
          data: [],
          refetch: vi.fn(),
        }),
      },
      respondToOffer: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
    account: {
      becomeSeller: {
        useMutation: () => ({
          mutate: mocks.becomeSellerMutate,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      seller: {
        overview: { invalidate: mocks.invalidate },
        workspace: { invalidate: mocks.invalidate },
      },
      auth: { me: { invalidate: mocks.invalidate } },
      marketplace: {
        home: { invalidate: mocks.invalidate },
        browse: { invalidate: mocks.invalidate },
        details: { invalidate: mocks.invalidate },
      },
    }),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import SellerDashboard from "./SellerDashboard";

afterEach(cleanup);

describe("SellerDashboard publication form", () => {
  beforeEach(() => {
    mocks.createListingMutate.mockReset();
    mocks.invalidate.mockReset();
    mocks.overviewQuery.mockClear();
    mocks.isSeller = true;
  });

  it("chooses the first category and reports a clear Arabic validation error before calling the create mutation", async () => {
    render(
      <LocaleProvider>
        <SellerDashboard />
      </LocaleProvider>
    );

    const category = screen.getByLabelText("التصنيف") as HTMLSelectElement;
    await waitFor(() => expect(category.value).toBe("category-1"));

    const submitButton = screen.getByRole("button", { name: "إرسال للمراجعة" });
    fireEvent.click(submitButton);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "اكتب عنوانًا لا يقل عن 3 أحرف."
    );
    expect(mocks.createListingMutate).not.toHaveBeenCalled();
  });
});

describe("SellerDashboard onboarding gate", () => {
  beforeEach(() => {
    mocks.overviewQuery.mockClear();
    mocks.becomeSellerMutate.mockReset();
  });

  it("shows a become-a-seller prompt instead of the publication form for a non-seller account, without enabling any seller-only query", async () => {
    mocks.isSeller = false;
    render(
      <LocaleProvider>
        <SellerDashboard />
      </LocaleProvider>
    );

    expect(await screen.findByText("كن بائعًا في لقطة")).toBeTruthy();
    expect(screen.queryByLabelText("التصنيف")).toBeNull();
    // The gate must skip the network call entirely for a non-seller, not just hide its result.
    expect(mocks.overviewQuery).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ enabled: false })
    );

    fireEvent.click(
      screen.getByRole("button", { name: "تفعيل صلاحية البائع" })
    );
    expect(mocks.becomeSellerMutate).toHaveBeenCalled();
  });
});

describe("SellerDashboard auction conversion", () => {
  beforeEach(() => {
    mocks.convertToAuctionMutate.mockReset();
    mocks.isSeller = true;
    mocks.workspaceQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        walletBalance: 0,
        transactions: [],
        listings: [
          {
            id: "listing-1",
            title: "هاتف مستخدم",
            type: "fixed",
            status: "active",
            source: "internal",
            fixed_price: 300,
            current_price: null,
            starting_price: null,
            created_at: "2026-09-28T12:00:00.000Z",
            canConvertToAuction: true,
          },
        ],
        soldItems: [],
      },
      refetch: vi.fn(),
    });
  });

  it("confirms the change and submits starting price, minimum increment, and a future end time", async () => {
    render(
      <LocaleProvider>
        <SellerDashboard />
      </LocaleProvider>
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "تحويل إلى مزاد" })
    );
    expect(await screen.findByText("تأكيد تحويل الإعلان")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "متابعة إعداد المزاد" })
    );

    const dialog = screen.getByRole("dialog");
    expect(
      (within(dialog).getByLabelText("سعر البداية") as HTMLInputElement).value
    ).toBe("300");
    expect(
      (within(dialog).getByLabelText("أقل زيادة للمزايدة") as HTMLInputElement)
        .value
    ).toBe("10");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "تحويل إلى مزاد" })
    );

    await waitFor(() =>
      expect(mocks.convertToAuctionMutate).toHaveBeenCalledTimes(1)
    );
    const payload = mocks.convertToAuctionMutate.mock.calls[0][0];
    expect(payload).toMatchObject({
      listingId: "listing-1",
      startingPrice: 300,
      minimumBidIncrement: 10,
    });
    expect(Date.parse(payload.auctionEndTime)).toBeGreaterThan(Date.now());
  });
});
