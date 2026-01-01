# Coverage Gap Analysis - Path to 80% Coverage

**Date:** January 1, 2026  
**Current Coverage:** 70.27% lines, 67.69% statements  
**Target:** 80% across all metrics  
**Gap:** 9.73% lines, 12.31% statements

---

## 📊 Executive Summary

### Current Status by Category

| Category | Statements | Branches | Functions | Lines | Priority |
|----------|-----------|----------|-----------|-------|----------|
| **Controllers** | 50.74% | 31.30% | 32.18% | 53.96% | 🔴 CRITICAL |
| **Middlewares** | 81.60% | 62.03% | 67.85% | 82.20% | 🟡 MEDIUM |
| **Services** | 85.71% | 54.54% | 85.71% | 85.71% | 🟡 MEDIUM |
| **Utils** | 100% | 96.87% | 100% | 100% | ✅ COMPLETE |
| **Routes** | 100% | 100% | 100% | 100% | ✅ COMPLETE |
| **Validation** | 100% | 100% | 100% | 100% | ✅ COMPLETE |
| **Models** | 97.22% | 75% | 100% | 97.14% | ✅ EXCELLENT |

### Critical Insight
**Controllers** are the primary bottleneck, accounting for the largest coverage gap. Improving controller coverage from 53.96% to 80% would provide approximately **8-10% overall coverage gain**.

---

## 🔴 CRITICAL PRIORITY - Controllers (53.96% → 80%)

### 1. food-partner.controller.js - **20.58% coverage** 🚨
**Impact:** HIGH (largest single file gap)  
**Uncovered Lines:** 13-33, 44-63, 73-110, 117-166  
**Estimated Gain:** +3-4% overall coverage

#### Missing Coverage:
- `getFoodPartnerById` (lines 13-33) - Get partner with food items and follow status
- `getFoodPartner` (lines 44-63) - Get current partner profile
- `editFoodPartner` (lines 73-110) - Update partner profile with file upload
- `followFoodPartner` (lines 117-166) - Follow/unfollow toggle logic

#### Recommended Tests (15-18 tests):
```
Integration Tests for Food Partner:
✓ GET /api/v1/food-partner/:id
  - Get partner by ID with auth
  - Include food items in response
  - Include follow status (isFollowing)
  - Handle non-existent partner (404)
  
✓ GET /api/v1/food-partner
  - Get current partner profile
  - Require partner authentication
  - Reject user role access
  
✓ PATCH /api/v1/food-partner/edit
  - Update business name
  - Update multiple fields
  - Upload profile photo
  - Sanitize inputs
  - Require authentication
  
✓ POST /api/v1/food-partner/follow
  - Follow partner
  - Unfollow partner
  - Toggle follow status
  - Prevent self-follow
  - Require user authentication
```

---

### 2. food.v2.controller.js - **14.20% coverage** 🚨
**Impact:** HIGH (complex business logic)  
**Uncovered Lines:** 17-58, 68-111, 121-133, 140-158, 165-183, 190-237, 244-253, 260-268, 275-289, 297-326, 333-342, 349-357  
**Estimated Gain:** +2-3% overall coverage

#### Missing Coverage:
- Recommendation algorithms
- Trending food calculations
- Advanced filtering and sorting
- Personalized content delivery

#### Recommended Tests (12-15 tests):
```
Integration Tests for Food v2:
✓ GET /api/v1/food/v2/recommendations
  - Get personalized recommendations
  - Handle new users (no history)
  - Filter by cuisine preferences
  - Pagination support
  
✓ GET /api/v1/food/v2/trending
  - Get trending foods
  - Time-based trending (last 24h, 7d, 30d)
  - Location-based trending
  
✓ GET /api/v1/food/v2/explore
  - Advanced search with filters
  - Multi-field sorting
  - Category-based discovery
```

---

### 3. user.controller.js - **27.86% coverage** ⚠️
**Impact:** MEDIUM  
**Uncovered Lines:** 17-48, 62-70, 77-83, 89-99, 106-122  
**Estimated Gain:** +1.5-2% overall coverage

#### Missing Coverage:
- User profile operations
- Following/follower management
- Saved items management
- User preferences

#### Recommended Tests (10-12 tests):
```
Integration Tests for User:
✓ GET /api/v1/user/profile
  - Get current user profile
  - Include statistics (followers, following, saved)
  
✓ PATCH /api/v1/user/profile
  - Update profile fields
  - Upload profile photo
  - Sanitize inputs
  
✓ GET /api/v1/user/saved
  - Get saved food items
  - Pagination and filtering
  
✓ GET /api/v1/user/following
  - Get followed partners
  - Include partner details
```

---

### 4. search.controller.js - **33.33% coverage** ⚠️
**Impact:** MEDIUM  
**Uncovered Lines:** 10-27, 34-74  
**Estimated Gain:** +1-1.5% overall coverage

#### Missing Coverage:
- Global search functionality
- Multi-entity search (foods, partners, users)
- Search ranking and relevance

#### Recommended Tests (8-10 tests):
```
Integration Tests for Search:
✓ GET /api/v1/search
  - Search across all entities
  - Fuzzy matching
  - Relevance sorting
  - Empty query handling
  
✓ GET /api/v1/search/foods
  - Search foods only
  - Filter by cuisine, price, rating
  
✓ GET /api/v1/search/partners
  - Search partners only
  - Location-based search
```

---

### 5. food.controller.js - **65.68% coverage** 🟢
**Impact:** LOW (already good coverage)  
**Uncovered Lines:** 15-28, 60, 78-122, 179-226, 294-298, 305  
**Estimated Gain:** +0.5-1% overall coverage

#### Missing Coverage:
- Edge cases in comment deletion
- Advanced food filtering
- Bulk operations

#### Recommended Tests (5-7 tests):
```
Additional Food Tests:
✓ DELETE /api/v1/food/:id/delete-comment
  - Edge cases for comment deletion
  
✓ GET /api/v1/food with advanced filters
  - Multiple filter combinations
  - Edge case inputs
```

---

### 6. order.controller.js - **97.82% coverage** ✅
**Impact:** MINIMAL (excellent coverage)  
**Uncovered Lines:** 17-49  
**Note:** Only error handling paths uncovered. Already exceeds target.

---

### 7. auth.controller.js - **81.28% coverage** ✅
**Impact:** LOW (already meets target)  
**Uncovered Lines:** 131-139, 160-164, 273-297, 330, 373-377, 394-398  
**Note:** Mostly edge cases and error paths. Consider low priority.

---

## 🟡 MEDIUM PRIORITY - Services (85.71% → 80% branches)

### Current Status:
- ✅ **Statements:** 85.71% (exceeds target)
- ⚠️ **Branches:** 54.54% (needs improvement)
- ✅ **Functions:** 85.71% (exceeds target)

### 1. storage.service.js - **60% coverage**
**Uncovered Lines:** 10-15  
**Impact:** LOW (small file)

#### Recommended Tests (3-5 tests):
```
Unit Tests for Storage Service:
✓ File upload success
✓ File upload failure handling
✓ File deletion
✓ Invalid file type rejection
✓ File size limit enforcement
```

---

### 2. audit.service.js - **71.42% coverage**
**Uncovered Lines:** 24-25  
**Impact:** LOW (logging utility)

#### Recommended Tests (2-3 tests):
```
Unit Tests for Audit Service:
✓ Log user actions
✓ Log partner actions
✓ Error logging paths
```

---

### 3. token.service.js - **100% statements, 50% branches**
**Uncovered Lines:** 29-31  
**Impact:** LOW (branch coverage only)

#### Recommended Tests (2-3 tests):
```
Unit Tests for Token Service:
✓ Token expiration edge cases
✓ Refresh token rotation
✓ Invalid token format handling
```

---

## 🟡 LOWER PRIORITY - Middlewares (82.20% → 85%)

### Already Near Target:
Most middlewares already exceed 80% line coverage. Focus on branch coverage improvements.

### 1. rateLimiter.middleware.js - **55.55% coverage**
**Uncovered Lines:** 10-16, 31-37, 45-46, 62-68, 75-76, 89-101, 108-109, 123, 132-139, 146-147  
**Impact:** MEDIUM

#### Recommended Tests (5-8 tests):
```
Additional Rate Limiter Tests:
✓ Exceed rate limit scenarios
✓ IP-based limiting
✓ User-based limiting
✓ Different time windows
✓ Limit reset behavior
```

---

### 2. fileUpload.middleware.js - **82.35% coverage**
**Uncovered Lines:** 13, 27-29  
**Impact:** LOW (already good)

#### Recommended Tests (2-3 tests):
```
Additional File Upload Tests:
✓ File signature validation failures
✓ Unsupported file types
✓ File size edge cases
```

---

## 📋 Prioritized Test Implementation Plan

### Phase 1: Critical Controllers (Est. +8-10% coverage)
**Target:** Reach 75% overall coverage  
**Effort:** 45-55 tests, 2-3 sessions

1. **Food Partner Controller** (15-18 tests) → +3-4% coverage
   - Priority: HIGHEST
   - Files: `tests/integration/food-partner-extended.test.js`
   
2. **Food v2 Controller** (12-15 tests) → +2-3% coverage
   - Priority: HIGH
   - Files: `tests/integration/food-v2.test.js`
   
3. **User Controller** (10-12 tests) → +1.5-2% coverage
   - Priority: MEDIUM-HIGH
   - Files: `tests/integration/user.test.js`
   
4. **Search Controller** (8-10 tests) → +1-1.5% coverage
   - Priority: MEDIUM
   - Files: `tests/integration/search.test.js`

### Phase 2: Service Branch Coverage (Est. +1-2% coverage)
**Target:** Reach 77% overall coverage  
**Effort:** 10-15 tests, 1 session

1. **Storage Service** (3-5 tests)
2. **Audit Service** (2-3 tests)
3. **Token Service** (2-3 tests)
4. **Rate Limiter** (5-8 tests)

### Phase 3: Final Push to 80% (Est. +3-5% coverage)
**Target:** Reach 80%+ overall coverage  
**Effort:** 10-15 tests, 1 session

1. **Food Controller Edge Cases** (5-7 tests)
2. **Auth Controller Error Paths** (3-5 tests)
3. **File Upload Edge Cases** (2-3 tests)

---

## 📊 Projected Outcomes

### After Phase 1 (Controllers):
- **Lines:** 70.27% → **~78-80%** (+8-10%)
- **Statements:** 67.69% → **~76-78%** (+8-10%)
- **Tests:** 305 → **~350-360** (+45-55 tests)

### After Phase 2 (Services):
- **Lines:** ~78-80% → **~79-82%** (+1-2%)
- **Branches:** 47.04% → **~55-60%** (+8-13%)
- **Tests:** ~350-360 → **~360-375** (+10-15 tests)

### After Phase 3 (Final Push):
- **Lines:** ~79-82% → **~82-87%** (+3-5%)
- **All Metrics:** **80%+ achieved** ✅
- **Tests:** ~360-375 → **~370-390** (+10-15 tests)

---

## 🎯 Success Criteria

### Target Metrics (80% minimum):
- ✅ **Lines:** 80%+ (currently 70.27%, need +9.73%)
- ✅ **Statements:** 80%+ (currently 67.69%, need +12.31%)
- ⚠️ **Branches:** 80%+ (currently 47.04%, need +32.96%)
- ⚠️ **Functions:** 80%+ (currently 49.31%, need +30.69%)

### Quality Criteria:
- ✅ 100% test pass rate maintained
- ✅ No flaky tests
- ✅ Execution time < 30 seconds
- ✅ All critical paths covered

---

## 💡 Implementation Notes

### Testing Strategy:
1. **Integration tests preferred** for controllers (end-to-end validation)
2. **Unit tests** for services (isolated logic testing)
3. **Focus on branches** to improve branch coverage metric
4. **Real scenarios** over mocked edge cases

### Coverage Optimization:
- One integration test can cover multiple controller methods
- Reuse test helpers to reduce boilerplate
- Group related tests in describe blocks
- Use parameterized tests for similar scenarios

### Time Estimates:
- **Controller integration test:** 15-20 min/test
- **Service unit test:** 5-10 min/test
- **Total Phase 1:** 12-18 hours
- **Total Phase 2:** 2-4 hours
- **Total Phase 3:** 2-4 hours
- **Grand Total:** 16-26 hours of development

---

## ✅ Conclusion

Reaching 80% coverage is achievable with focused effort on **controllers** (primary bottleneck). The three-phase plan provides a clear roadmap:

1. **Phase 1:** Controllers → +8-10% coverage
2. **Phase 2:** Services → +1-2% coverage
3. **Phase 3:** Final push → +3-5% coverage

**Total Estimated Gain:** +12-17% coverage  
**Projected Final Coverage:** 82-87% (exceeds 80% target)

The analysis shows that approximately **65-85 additional tests** across 16-26 hours of development will achieve the 80% coverage goal while maintaining high code quality and test reliability.
