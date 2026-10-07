// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LocaleProvider } from "@/contexts/LocaleContext";
import BrandLogo from "./BrandLogo";

afterEach(cleanup);

describe("BrandLogo", () => {
  it("fits the official full logo inside its frame without cropping", () => {
    render(
      <LocaleProvider>
        <BrandLogo
          variant="full"
          alt="Official logo"
          className="h-full w-full"
        />
      </LocaleProvider>
    );

    const logo = screen.getByRole("img", { name: "Official logo" });
    expect(logo.getAttribute("src")).toBe("/images/lqta-logo-full-trim.png");
    expect(logo.getAttribute("width")).toBe("415");
    expect(logo.getAttribute("height")).toBe("538");
    expect((logo as HTMLImageElement).style.width).toBe("100%");
    expect((logo as HTMLImageElement).style.height).toBe("100%");
    expect((logo as HTMLImageElement).style.objectFit).toBe("contain");
  });
});
