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
  const miniCamW = cam.w * scaleX;
  const miniCamH = cam.h * scaleY;

  const halfLineWidth = lineWidth / 2;

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
