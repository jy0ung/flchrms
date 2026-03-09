import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { SectionToolbar } from "@/components/system/SectionToolbar";

const mockUseIsMobile = vi.fn(() => false);

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

describe("SectionToolbar", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

  it("renders inline variant without surface wrapper styles", () => {
    render(
      <SectionToolbar
        variant="inline"
        ariaLabel="Inline toolbar"
        search={{
          value: "",
          onChange: vi.fn(),
          placeholder: "Search records...",
          ariaLabel: "Search records",
        }}
      />,
    );

    const region = screen.getByRole("region", { name: /inline toolbar/i });
    expect(region).not.toHaveClass("rounded-lg");
    expect(region).not.toHaveClass("border");
    expect(region).toHaveClass("w-full");
  });

  it("preserves search and action behavior in inline variant", () => {
    const onChange = vi.fn();
    const onAction = vi.fn();

    render(
      <SectionToolbar
        variant="inline"
        ariaLabel="Header controls"
        search={{
          value: "",
          onChange,
          placeholder: "Search departments...",
          ariaLabel: "Search departments",
        }}
        actions={
          <Button type="button" onClick={onAction}>
            Create
          </Button>
        }
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /search departments/i }), {
      target: { value: "Ops" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(onChange).toHaveBeenCalledWith("Ops");
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("preserves aria labeling for toolbar region", () => {
    render(
      <SectionToolbar
        variant="inline"
        ariaLabel="Leave request controls"
        filters={[
          {
            id: "status-filter",
            label: "Status",
            control: <select aria-label="Status filter"><option>All</option></select>,
          },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: /leave request controls/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/status filter/i)).toBeInTheDocument();
  });

  it("collapses filters into a mobile filter sheet trigger on small screens", () => {
    mockUseIsMobile.mockReturnValue(true);

    render(
      <SectionToolbar
        variant="inline"
        ariaLabel="Employee filters"
        filters={[
          {
            id: "department-filter",
            label: "Department",
            control: <select aria-label="Department filter"><option>Operations</option></select>,
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /filters/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/department filter/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /filters/i }));

    expect(screen.getByRole("heading", { name: /filters/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/department filter/i)).toBeInTheDocument();
  });
});
