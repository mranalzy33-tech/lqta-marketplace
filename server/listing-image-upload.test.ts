import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), storagePut: vi.fn() }));

vi.mock("./supabase/client", () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import { uploadCategoryImage, uploadListingImage } from "./db";

const imageDataUrl = "data:image/jpeg;base64,/9j/";
const sellerId = "11111111-1111-1111-1111-111111111111";
const listingId = "22222222-2222-2222-2222-222222222222";

describe("uploadListingImage", () => {
  beforeEach(() => { mocks.from.mockReset(); mocks.storagePut.mockReset(); });

  it("rejects an image upload for a listing owned by another seller", async () => {
    const listingChain = { select: () => listingChain, eq: () => listingChain, maybeSingle: async () => ({ data: { id: listingId, seller_id: "another-seller" }, error: null }) };
    mocks.from.mockReturnValue(listingChain);
    await expect(uploadListingImage({ sellerId, listingId, dataUrl: imageDataUrl })).rejects.toThrow("لا تملك صلاحية");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("rejects uploads once the listing has reached six images", async () => {
    const listingChain = { select: () => listingChain, eq: () => listingChain, maybeSingle: async () => ({ data: { id: listingId, seller_id: sellerId }, error: null }) };
    const countChain = { select: () => countChain, eq: async () => ({ count: 6, error: null }) };
    mocks.from.mockImplementation((table: string) => table === "listings" ? listingChain : countChain);
    await expect(uploadListingImage({ sellerId, listingId, dataUrl: imageDataUrl })).rejects.toThrow("الحد الأقصى");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("propagates a storage failure without attempting to create an image row", async () => {
    const listingChain = { select: () => listingChain, eq: () => listingChain, maybeSingle: async () => ({ data: { id: listingId, seller_id: sellerId }, error: null }) };
    const countChain = { select: () => countChain, eq: async () => ({ count: 0, error: null }) };
    mocks.from.mockImplementation((table: string) => table === "listings" ? listingChain : countChain);
    mocks.storagePut.mockRejectedValue(new Error("Storage upload to S3 failed (500)"));
    await expect(uploadListingImage({ sellerId, listingId, dataUrl: imageDataUrl })).rejects.toThrow("Storage upload");
    expect(mocks.from).toHaveBeenCalledTimes(2);
  });

  it("stores an owned valid image and records the returned storage URL", async () => {
    const listingChain = { select: () => listingChain, eq: () => listingChain, maybeSingle: async () => ({ data: { id: listingId, seller_id: sellerId }, error: null }) };
    const countChain = { select: () => countChain, eq: async () => ({ count: 0, error: null }) };
    const orderChain = { select: () => orderChain, eq: () => orderChain, order: () => orderChain, limit: () => orderChain, maybeSingle: async () => ({ data: null, error: null }) };
    const insertChain = { insert: () => insertChain, select: () => insertChain, single: async () => ({ data: { id: "image-id", listing_id: listingId, image_url: "/storage/image.jpg", sort_order: 0 }, error: null }) };
    let imagesCall = 0;
    mocks.from.mockImplementation((table: string) => { if (table === "listings") return listingChain; imagesCall += 1; return imagesCall === 1 ? countChain : imagesCall === 2 ? orderChain : insertChain; });
    mocks.storagePut.mockResolvedValue({ key: "image.jpg", url: "/storage/image.jpg" });
    await expect(uploadListingImage({ sellerId, listingId, dataUrl: imageDataUrl })).resolves.toMatchObject({ image_url: "/storage/image.jpg", sort_order: 0 });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringContaining(`listing-images/${sellerId}/${listingId}`), expect.any(Buffer), "image/jpeg");
  });

  it("propagates a database-link failure after storage succeeds", async () => {
    const listingChain = { select: () => listingChain, eq: () => listingChain, maybeSingle: async () => ({ data: { id: listingId, seller_id: sellerId }, error: null }) };
    const countChain = { select: () => countChain, eq: async () => ({ count: 0, error: null }) };
    const orderChain = { select: () => orderChain, eq: () => orderChain, order: () => orderChain, limit: () => orderChain, maybeSingle: async () => ({ data: null, error: null }) };
    const insertChain = { insert: () => insertChain, select: () => insertChain, single: async () => ({ data: null, error: { message: "insert denied" } }) };
    let imagesCall = 0;
    mocks.from.mockImplementation((table: string) => { if (table === "listings") return listingChain; imagesCall += 1; return imagesCall === 1 ? countChain : imagesCall === 2 ? orderChain : insertChain; });
    mocks.storagePut.mockResolvedValue({ key: "image.jpg", url: "/storage/image.jpg" });
    await expect(uploadListingImage({ sellerId, listingId, dataUrl: imageDataUrl })).rejects.toThrow("تعذر ربط الصورة بالإعلان");
  });
});

describe("uploadCategoryImage", () => {
  beforeEach(() => { mocks.from.mockReset(); mocks.storagePut.mockReset(); });

  it("rejects an unsupported image before writing to storage", async () => {
    await expect(uploadCategoryImage({ dataUrl: "data:image/gif;base64,R0lGODlh" })).rejects.toThrow("صيغة الصورة غير مدعومة");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("stores a valid image using the shared storage and validation pipeline", async () => {
    mocks.storagePut.mockResolvedValue({ key: "category-images/image.jpg", url: "https://storage.example/category.jpg" });
    await expect(uploadCategoryImage({ dataUrl: imageDataUrl })).resolves.toEqual({ url: "https://storage.example/category.jpg" });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^category-images\/.+\/image\.jpg$/), expect.any(Buffer), "image/jpeg");
  });
});
