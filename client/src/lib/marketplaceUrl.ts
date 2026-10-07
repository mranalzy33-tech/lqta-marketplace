export function buildMarketplaceLocation(
  location: string,
  updates: Record<string, string | undefined>
) {
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  for (const [key, value] of Object.entries(updates)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const search = params.toString();
  return `/marketplace${search ? `?${search}` : ""}`;
}
