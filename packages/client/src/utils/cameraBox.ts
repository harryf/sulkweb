export interface CamRect { x: number; y: number; w: number; h: number }
export interface MiniRect { x: number; y: number; w: number; h: number }
export interface BoardSize { w: number; h: number }

export function projectCamToMini(
  cam: CamRect,          // in world px
  board: BoardSize, // world size px
  mini: MiniRect,         // mini-map bounds px
  lineWidth = 0
): MiniRect {
  const scaleX = mini.w / board.w;
  const scaleY = mini.h / board.h;

  let miniCamX = cam.x * scaleX;
  let miniCamY = cam.y * scaleY;

  const halfLineWidth = lineWidth / 2;

  // The camera can see more world than a narrow board contains, projecting a
  // box wider than the minimap itself — clamp SIZE before position, or the
  // excess spills past the right/bottom edge.
  const miniCamW = Math.min(cam.w * scaleX, Math.max(0, mini.w - lineWidth));
  const miniCamH = Math.min(cam.h * scaleY, Math.max(0, mini.h - lineWidth));

  // Clamp to minimap bounds, accounting for line width
  // The path should be inset by half the line width from the visual edge
  miniCamX = Math.max(
    mini.x + halfLineWidth,
    Math.min(miniCamX, mini.x + mini.w - miniCamW - halfLineWidth)
  );
  miniCamY = Math.max(
    mini.y + halfLineWidth,
    Math.min(miniCamY, mini.y + mini.h - miniCamH - halfLineWidth)
  );

  return {
    x: miniCamX,
    y: miniCamY,
    w: miniCamW,
    h: miniCamH,
  };
}
