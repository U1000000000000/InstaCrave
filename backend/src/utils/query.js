// Query utility for pagination, filtering, and sorting

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const DEFAULT_SKIP = 0;
const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'price']; // Extend per model

function parsePagination(query) {
  let limit = parseInt(query.limit, 10);
  let skip = parseInt(query.skip, 10);
  if (isNaN(limit) || limit < MIN_LIMIT) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  if (isNaN(skip) || skip < 0) skip = DEFAULT_SKIP;
  return { limit, skip };
}

function parseSort(query) {
  let sort = {};
  if (query.sort) {
    const fields = query.sort.split(',');
    fields.forEach(field => {
      let dir = 1;
      let name = field;
      if (field.startsWith('-')) {
        dir = -1;
        name = field.substring(1);
      }
      if (ALLOWED_SORT_FIELDS.includes(name)) {
        sort[name] = dir;
      }
    });
  } else {
    sort['createdAt'] = -1; // Default sort
  }
  return sort;
}

function parseFilters(query, allowedFields) {
  const filters = {};
  
  // Handle regular fields
  allowedFields.forEach(field => {
    if (query[field] !== undefined) {
      filters[field] = query[field];
    }
  });
  
  // Handle range operators: price[gte], price[lte], price[gt], price[lt]
  const rangeOperators = ['gte', 'lte', 'gt', 'lt'];
  allowedFields.forEach(field => {
    rangeOperators.forEach(op => {
      const rangeKey = `${field}[${op}]`;
      if (query[rangeKey] !== undefined) {
        if (!filters[field]) {
          filters[field] = {};
        }
        // Convert to MongoDB operator format
        filters[field][`$${op}`] = parseFloat(query[rangeKey]) || query[rangeKey];
      }
    });
  });
  
  return filters;
}

function parseQuery(query, allowedFilterFields) {
  const pagination = parsePagination(query);
  const sort = parseSort(query);
  const filters = parseFilters(query, allowedFilterFields);
  return { pagination, sort, filters };
}

module.exports = {
  parsePagination,
  parseSort,
  parseFilters,
  parseQuery,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
};
