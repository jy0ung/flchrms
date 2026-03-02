import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from 'vitest';

import { EditableCanvas } from '@/components/system/EditableCanvas';

const pointerCapturePolyfill = () => {
  if (!(globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent) {
    (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent = MouseEvent;
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      value: () => undefined,
      configurable: true,
    });
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      value: () => undefined,
      configurable: true,
    });
  }
  if (!HTMLElement.prototype.hasPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      value: () => true,
      configurable: true,
    });
  }
};

describe('EditableCanvas enterprise variant', () => {
  const getRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');

  beforeAll(() => {
    pointerCapturePolyfill();
  });

  beforeEach(() => {
    getRectSpy.mockReturnValue({
      width: 1200,
      height: 500,
      x: 0,
      y: 0,
      top: 0,
      right: 1200,
      bottom: 500,
      left: 0,
      toJSON: () => undefined,
    });
  });

  afterAll(() => {
    getRectSpy.mockRestore();
  });

  it('commits resize on pointer up only', () => {
    const onLayoutStateChange = vi.fn();
    render(
      <EditableCanvas
        mode="customize"
        variant="enterprise"
        items={[
          {
            id: 'criticalInsights',
            title: 'Critical Insights',
            description: 'risk signals',
            view: <div>Critical Content</div>,
          },
        ]}
        layoutState={{
          version: 1,
          items: [{ id: 'criticalInsights', x: 0, y: 0, w: 4, h: 4 }],
        }}
        onLayoutStateChange={onLayoutStateChange}
        resizeRulesById={{
          criticalInsights: { minW: 3, maxW: 12, step: 1 },
        }}
      />,
    );

    const resizeButton = screen.getByRole('button', { name: /Resize Critical Insights widget/i });
    fireEvent.pointerDown(resizeButton, { pointerId: 1, clientX: 200 });
    fireEvent.pointerMove(resizeButton, { pointerId: 1, clientX: 420 });
    expect(onLayoutStateChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(resizeButton, { pointerId: 1, clientX: 420 });
    expect(onLayoutStateChange).toHaveBeenCalledTimes(1);
    const nextState = onLayoutStateChange.mock.calls[0][0];
    expect(nextState.items[0].w).toBeGreaterThan(4);
  });

  it('blocks cross-scope reorder attempts', () => {
    const onLayoutStateChange = vi.fn();
    const onInvalidDropScope = vi.fn();

    render(
      <EditableCanvas
        mode="customize"
        variant="enterprise"
        items={[
          { id: 'a', title: 'Widget A', view: <div>A</div> },
          { id: 'b', title: 'Widget B', view: <div>B</div> },
        ]}
        layoutState={{
          version: 1,
          items: [
            { id: 'a', x: 0, y: 0, w: 4, h: 4 },
            { id: 'b', x: 4, y: 0, w: 4, h: 4 },
          ],
        }}
        onLayoutStateChange={onLayoutStateChange}
        reorderScopeById={{ a: 'primary', b: 'secondary' }}
        onInvalidDropScope={onInvalidDropScope}
      />,
    );

    const reorderA = screen.getByRole('button', { name: /Reorder Widget A widget/i });
    const widgetBCard = document.querySelector('[data-layout-item-id="b"]');
    expect(widgetBCard).toBeTruthy();

    fireEvent.dragStart(reorderA, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });
    fireEvent.dragOver(widgetBCard!);
    fireEvent.drop(widgetBCard!, { dataTransfer: { getData: () => 'a' } });

    expect(onLayoutStateChange).not.toHaveBeenCalled();
    expect(onInvalidDropScope).toHaveBeenCalledWith('a', 'b');
  });
});
