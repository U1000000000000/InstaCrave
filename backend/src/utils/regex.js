// HACK: escapeRegex is copied from StackOverflow, works but probably missing edge cases
// Haven't found a case where it breaks yet though
function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchText(input, { maxLength = 100 } = {}) {
  if (input === undefined || input === null) return '';
  const normalized = String(input).trim();
  if (normalized.length > maxLength) return normalized.slice(0, maxLength);
  return normalized;
}

module.exports = {
  escapeRegex,
  normalizeSearchText,
};
