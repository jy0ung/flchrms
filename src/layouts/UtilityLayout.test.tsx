import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UtilityLayout } from "./UtilityLayout";

describe("UtilityLayout", () => {
  it("renders the standard utility route anatomy", () => {
    render(
      <UtilityLayout
        archetype="inbox"
        eyebrow="Workspace"
        title="Documents"
        description="Manage documents"
        metaSlot={<div>Viewer role: Employee</div>}
        leadSlot={<div>lead</div>}
        summarySlot={<div>summary</div>}
        controlsSlot={<div>controls</div>}
        supportingSlot={<div>supporting</div>}
      >
        <div>content</div>
      </UtilityLayout>,
    );

    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByText("Manage documents")).toBeInTheDocument();
    expect(screen.getByText("Viewer role: Employee")).toBeInTheDocument();
    expect(screen.getByText("lead")).toBeInTheDocument();
    expect(screen.getByText("summary")).toBeInTheDocument();
    expect(screen.getByText("controls")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByText("supporting")).toBeInTheDocument();
  });
});
