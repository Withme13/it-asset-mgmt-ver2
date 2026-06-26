import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StockFormDialog } from "./StockFormDialog";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("StockFormDialog", () => {
  it("keeps full text when typing quickly into category, type, and user fields", () => {
    render(<StockFormDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />);

    const categoryInput = screen.getByLabelText("Category");
    const typeInput = screen.getByLabelText("Type");
    const userInput = screen.getByLabelText("User");

    act(() => {
      fireEvent.change(categoryInput, { target: { value: "L" } });
      fireEvent.change(categoryInput, { target: { value: "La" } });
      fireEvent.change(categoryInput, { target: { value: "Lap" } });

      fireEvent.change(typeInput, { target: { value: "D" } });
      fireEvent.change(typeInput, { target: { value: "De" } });
      fireEvent.change(typeInput, { target: { value: "Desk" } });

      fireEvent.change(userInput, { target: { value: "A" } });
      fireEvent.change(userInput, { target: { value: "An" } });
      fireEvent.change(userInput, { target: { value: "Andi" } });
    });

    expect(categoryInput).toHaveValue("Lap");
    expect(typeInput).toHaveValue("Desk");
    expect(userInput).toHaveValue("Andi");
  });
});
