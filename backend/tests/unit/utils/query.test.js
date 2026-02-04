const queryUtil = require('../../../src/utils/query');

describe('Query Utility', () => {
  describe('parsePagination', () => {
    it('should use default limit when not provided', () => {
      const result = queryUtil.parsePagination({});
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
    });

    it('should parse valid limit and skip', () => {
      const result = queryUtil.parsePagination({ limit: '10', skip: '5' });
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(5);
    });

    it('should enforce maximum limit of 100', () => {
      const result = queryUtil.parsePagination({ limit: '150' });
      expect(result.limit).toBe(100);
    });

    it('should enforce minimum limit of 1', () => {
      const result = queryUtil.parsePagination({ limit: '0' });
      expect(result.limit).toBe(20); // Falls back to default
    });

    it('should handle invalid limit values', () => {
      const result = queryUtil.parsePagination({ limit: 'invalid' });
      expect(result.limit).toBe(20);
    });

    it('should handle negative skip values', () => {
      const result = queryUtil.parsePagination({ skip: '-5' });
      expect(result.skip).toBe(0);
    });

    it('should handle invalid skip values', () => {
      const result = queryUtil.parsePagination({ skip: 'invalid' });
      expect(result.skip).toBe(0);
    });
  });

  describe('parseSort', () => {
    it('should use default sort when not provided', () => {
      const result = queryUtil.parseSort({});
      expect(result).toEqual({ createdAt: -1 });
    });

    it('should parse ascending sort', () => {
      const result = queryUtil.parseSort({ sort: 'name' });
      expect(result).toEqual({ name: 1 });
    });

    it('should parse descending sort with minus prefix', () => {
      const result = queryUtil.parseSort({ sort: '-price' });
      expect(result).toEqual({ price: -1 });
    });

    it('should parse multiple sort fields', () => {
      const result = queryUtil.parseSort({ sort: 'name,-price' });
      expect(result).toEqual({ name: 1, price: -1 });
    });

    it('should ignore invalid sort fields', () => {
      const result = queryUtil.parseSort({ sort: 'invalidField' });
      expect(result).toEqual({});
    });

    it('should filter out invalid fields from multiple sorts', () => {
      const result = queryUtil.parseSort({ sort: 'name,invalidField,-price' });
      expect(result).toEqual({ name: 1, price: -1 });
    });
  });

  describe('parseFilters', () => {
    it('should return empty object when no filters match', () => {
      const result = queryUtil.parseFilters({ random: 'value' }, ['name', 'price']);
      expect(result).toEqual({});
    });

    it('should extract allowed filter fields', () => {
      const query = { name: 'Pizza', price: '10', extra: 'ignore' };
      const result = queryUtil.parseFilters(query, ['name', 'price']);
      expect(result).toEqual({ name: 'Pizza', price: '10' });
    });

    it('should handle empty allowed fields array', () => {
      const result = queryUtil.parseFilters({ name: 'test' }, []);
      expect(result).toEqual({});
    });

    it('should include undefined values if they exist in query', () => {
      const query = { name: 'test', price: undefined };
      const result = queryUtil.parseFilters(query, ['name', 'price']);
      expect(result).toEqual({ name: 'test', price: undefined });
    });
  });

  describe('parseQuery', () => {
    it('should combine all parsing functions', () => {
      const query = {
        limit: '10',
        skip: '5',
        sort: '-createdAt',
        name: 'Pizza'
      };
      const result = queryUtil.parseQuery(query, ['name']);
      
      expect(result.pagination).toEqual({ limit: 10, skip: 5 });
      expect(result.sort).toEqual({ createdAt: -1 });
      expect(result.filters).toEqual({ name: 'Pizza' });
    });

    it('should work with empty query', () => {
      const result = queryUtil.parseQuery({}, []);
      
      expect(result.pagination).toEqual({ limit: 20, skip: 0 });
      expect(result.sort).toEqual({ createdAt: -1 });
      expect(result.filters).toEqual({});
    });

    it('should filter only allowed fields', () => {
      const query = {
        name: 'Pizza',
        price: '10',
        unauthorized: 'value'
      };
      const result = queryUtil.parseQuery(query, ['name']);
      
      expect(result.filters).toEqual({ name: 'Pizza' });
      expect(result.filters.unauthorized).toBeUndefined();
    });
  });
});
