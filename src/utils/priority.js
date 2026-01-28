/**
 * Priority Calculation Utility
 * Determines priority scores for token allocation based on source type
 */

const PRIORITY_LEVELS = {
  emergency: 100,
  paid_priority: 80,
  follow_up: 60,
  online: 40,
  walk_in: 20,
};

/**
 * Calculate priority score based on source type
 * @param {string} source - Token source (emergency, paid_priority, follow_up, online, walk_in)
 * @returns {number} Priority score (higher = more priority)
 */
const calculatePriorityScore = (source) => {
  return PRIORITY_LEVELS[source] || 0;
};

/**
 * Compare two priorities
 * @param {number} priorityA - First priority score
 * @param {number} priorityB - Second priority score
 * @returns {number} Positive if A > B, negative if A < B, 0 if equal
 */
const comparePriorities = (priorityA, priorityB) => {
  return priorityB - priorityA; // descending order (higher priority first)
};

/**
 * Get source type from priority score
 * @param {number} priorityScore - Priority score
 * @returns {string} Source type
 */
const getSourceFromPriority = (priorityScore) => {
  for (const [source, score] of Object.entries(PRIORITY_LEVELS)) {
    if (score === priorityScore) {
      return source;
    }
  }
  return 'walk_in'; // default
};

/**
 * Sort tokens by priority score (descending)
 * @param {Array} tokens - Array of tokens
 * @returns {Array} Sorted tokens
 */
const sortByPriority = (tokens) => {
  return tokens.sort((a, b) => b.priorityScore - a.priorityScore);
};

module.exports = {
  PRIORITY_LEVELS,
  calculatePriorityScore,
  comparePriorities,
  getSourceFromPriority,
  sortByPriority,
};
