import rawContent from '../../../nextrole.json';

/**
 * Single source of truth for every piece of copy, title, skill and role
 * shown in the app: the `nextrole.json` file at the project root.
 */
export const content = rawContent;

export type Content = typeof content;
