import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UtilityLayout } from "./UtilityLayout";

describe("UtilityLayout", () => {
  it("renders the standard utility route anatomy", () => {
    render(
      <UtilityLayout
        eyebrow="Workspace"
        title="Documents"
        description="Manage documents"
        metaSlot={<div>Viewer role: Employee</div>}
        summarySlot={<div>summary</div>}
        controlsSlot={<div>controls</div>}
      >
        <div>content</div>
      </UtilityLayout>,
    );

    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByText("Manage documents")).toBeInTheDocument();
    expect(screen.getByText("Viewer role: Employee")).toBeInTheDocument();
    expect(screen.getByText("summary")).toBeInTheDocument();
    expect(screen.getByText("controls")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
