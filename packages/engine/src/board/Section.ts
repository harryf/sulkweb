import { Square } from './Square';

/**
 * Represents a section of the board, like a room or a corridor.
 */
export interface Section {
  /**
   * The unique identifier for the section.
   */
  id: number;

  /**
   * The list of squares that belong to this section.
   */
  squares: Square[];
}
