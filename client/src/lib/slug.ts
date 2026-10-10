/** URL-safe slug for a role title, e.g. "QA / Test Automation Engineer" -> "qa-test-automation-engineer". */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
