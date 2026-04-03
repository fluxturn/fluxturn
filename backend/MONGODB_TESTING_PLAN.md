# MongoDB Connector Testing Plan

## Analysis Summary

After analyzing:
- `/Users/user/Desktop/fluxturn/backend/.claude/CONNECTOR_TESTING_GUIDE.md` ✅
- `/Users/user/Desktop/fluxturn/backend/src/modules/fluxturn/connectors/marketing/brevo/__tests__/` ✅
- `/Users/user/Desktop/fluxturn/N8N_TESTING_APPROACH.md` ✅

**Answer: YES, you can test MongoDB using the same automated testing approach as Brevo!**

---

## Testing Approach Overview

### Fluxturn's Testing Strategy (Similar to n8n)

1. **Automated HTTP Mocking with Nock**
   - No real API calls during tests
   - Mock HTTP responses for all connector actions
   - Test both success and error cases

2. **Co-located Tests**
   - Tests live inside each connector's `__tests__/` folder
   - Fixtures stored in `__tests__/fixtures/` as JSON files
   - Easy to maintain alongside connector code

3. **Test Infrastructure**
   - Shared test helpers in `/test/helpers/`
   - Mock credentials for all connectors
   - Standardized assertion utilities

---

## Current Issue

### Jest Configuration Problem

When running tests, getting error:
```
SyntaxError: Missing semicolon. (15:15)
> 15 |   let connector: BrevoConnector;
```

### Root Cause
- Jest is not properly configured for TypeScript
- Missing or incomplete `jest.config.js` or `jest` section in `package.json`
- TypeScript files need `ts-jest` transformer

### Solution Needed
Create proper Jest configuration file to handle TypeScript.

---

## MongoDB Testing Plan

### Step 1: Fix Jest Configuration

Create `/Users/user/Desktop/fluxturn/backend/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: './coverage',
  moduleNameMapper: {
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
```

### Step 2: Add Mock Credentials

Add to `/Users/user/Desktop/fluxturn/backend/test/helpers/mock-credentials.ts`:

```typescript
export const MOCK_CREDENTIALS: Record<string, any> = {
  // ... existing credentials

  mongodb: {
    connectionString: 'mongodb://localhost:27017',
    database: 'test_database',
  },
};
```

### Step 3: Create MongoDB Test Structure

```
backend/src/modules/fluxturn/connectors/storage/mongodb/
├── mongodb.connector.ts
├── mongodb.definition.ts
├── __tests__/
│   ├── mongodb.connector.spec.ts         ← Create this
│   └── fixtures/
│       ├── insert_document.json          ← Create this
│       ├── find_documents.json           ← Create this
│       ├── update_document.json          ← Create this
│       └── delete_document.json          ← Create this
└── index.ts
```

### Step 4: Create Test File

`__tests__/mongodb.connector.spec.ts`:

```typescript
/**
 * MongoDB Connector Tests
 *
 * Tests for the MongoDB connector actions using mocked responses.
 */
import nock from 'nock';
import { MongoDBConnector } from '../mongodb.connector';
import { ConnectorTestHelper, TestFixture } from '@test/helpers/connector-test.helper';
import { MongoClient } from 'mongodb';

// Import fixtures
import insertDocumentFixture from './fixtures/insert_document.json';
import findDocumentsFixture from './fixtures/find_documents.json';

describe('MongoDBConnector', () => {
  let connector: MongoDBConnector;
  let mockClient: any;
  let mockDb: any;
  let mockCollection: any;

  beforeEach(async () => {
    nock.cleanAll();

    // Mock MongoDB client
    mockCollection = {
      insertOne: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      findOne: jest.fn(),
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
      databaseName: 'test_database',
    };

    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue(mockDb),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Mock MongoClient constructor
    jest.spyOn(MongoClient.prototype, 'connect').mockResolvedValue(undefined as any);
    jest.spyOn(MongoClient.prototype, 'db').mockReturnValue(mockDb as any);
    jest.spyOn(MongoClient.prototype, 'close').mockResolvedValue(undefined);

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(
      MongoDBConnector,
      'mongodb'
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when connection succeeds', async () => {
      const mockAdminDb = {
        command: jest.fn().mockResolvedValue({ ok: 1 }),
      };
      jest.spyOn(mockClient, 'db').mockReturnValue(mockAdminDb as any);

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when connection fails', async () => {
      jest.spyOn(MongoClient.prototype, 'connect').mockRejectedValue(
        new Error('Connection timeout')
      );

      // Create new connector to trigger connection error
      try {
        await ConnectorTestHelper.createConnector(MongoDBConnector, 'mongodb');
      } catch (error) {
        // Expected to fail
      }

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Insert Document Tests
  // ===========================================
  describe('insert_document', () => {
    it('should insert document successfully', async () => {
      const mockResult = {
        insertedId: '507f1f77bcf86cd799439011',
        acknowledged: true,
      };

      mockCollection.insertOne.mockResolvedValue(mockResult);

      const result = await connector.executeAction('insert_document', {
        collection: 'users',
        document: { name: 'John Doe', email: 'john@example.com' },
      });

      expect(result.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        { name: 'John Doe', email: 'john@example.com' },
        undefined
      );

      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.insertedId).toBe('507f1f77bcf86cd799439011');
    });

    it('should parse JSON string document', async () => {
      const mockResult = {
        insertedId: '507f1f77bcf86cd799439012',
        acknowledged: true,
      };

      mockCollection.insertOne.mockResolvedValue(mockResult);

      const result = await connector.executeAction('insert_document', {
        collection: 'users',
        document: '{"name":"Jane Doe","age":25}',
      });

      expect(result.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        { name: 'Jane Doe', age: 25 },
        undefined
      );
    });

    it('should handle invalid JSON', async () => {
      const result = await connector.executeAction('insert_document', {
        collection: 'users',
        document: '{name:"invalid"}',  // Invalid JSON
      });

      // Check inner success for error cases
      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);

      if (result.data?.error) {
        expect(result.data.error.code).toBe('INVALID_JSON');
      }
    });

    it('should handle duplicate key error', async () => {
      mockCollection.insertOne.mockRejectedValue({
        code: 11000,
        message: 'E11000 duplicate key error',
      });

      const result = await connector.executeAction('insert_document', {
        collection: 'users',
        document: { email: 'duplicate@example.com' },
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Find Documents Tests
  // ===========================================
  describe('find_documents', () => {
    it('should find documents successfully', async () => {
      const mockDocuments = [
        { _id: '1', name: 'John' },
        { _id: '2', name: 'Jane' },
      ];

      mockCollection.find.mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockDocuments),
      });

      const result = await connector.executeAction('find_documents', {
        collection: 'users',
        filter: { name: 'John' },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.documents).toHaveLength(2);
    });

    it('should handle empty result', async () => {
      mockCollection.find.mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      });

      const result = await connector.executeAction('find_documents', {
        collection: 'users',
        filter: { name: 'NonExistent' },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.documents).toHaveLength(0);
    });
  });

  // ===========================================
  // Update Document Tests
  // ===========================================
  describe('update_document', () => {
    it('should update document successfully', async () => {
      const mockResult = {
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
      };

      mockCollection.updateOne.mockResolvedValue(mockResult);

      const result = await connector.executeAction('update_document', {
        collection: 'users',
        filter: { email: 'john@example.com' },
        update: { $set: { age: 30 } },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.modifiedCount).toBe(1);
    });

    it('should handle document not found', async () => {
      const mockResult = {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
      };

      mockCollection.updateOne.mockResolvedValue(mockResult);

      const result = await connector.executeAction('update_document', {
        collection: 'users',
        filter: { email: 'nonexistent@example.com' },
        update: { $set: { age: 30 } },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.matchedCount).toBe(0);
    });
  });

  // ===========================================
  // Delete Document Tests
  // ===========================================
  describe('delete_document', () => {
    it('should delete document successfully', async () => {
      const mockResult = {
        deletedCount: 1,
        acknowledged: true,
      };

      mockCollection.deleteOne.mockResolvedValue(mockResult);

      const result = await connector.executeAction('delete_document', {
        collection: 'users',
        filter: { email: 'delete@example.com' },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.deletedCount).toBe(1);
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});

      expect(result.success).toBe(false);
    });
  });
});
```

### Step 5: Create Test Fixtures

`__tests__/fixtures/insert_document.json`:

```json
{
  "action": "insert_document",
  "testCases": [
    {
      "name": "inserts document successfully",
      "input": {
        "collection": "users",
        "document": {
          "name": "Test User",
          "email": "test@example.com",
          "age": 25
        }
      },
      "expected": {
        "success": true,
        "data": {
          "insertedId": "507f1f77bcf86cd799439011"
        }
      }
    },
    {
      "name": "handles invalid JSON string",
      "input": {
        "collection": "users",
        "document": "{name:\"invalid\"}"
      },
      "expected": {
        "success": false
      }
    },
    {
      "name": "parses valid JSON string",
      "input": {
        "collection": "users",
        "document": "{\"name\":\"Valid\",\"age\":30}"
      },
      "expected": {
        "success": true
      }
    }
  ]
}
```

---

## How MongoDB Testing Differs from HTTP-based Connectors

### Brevo (HTTP API):
```typescript
// Mock HTTP requests with nock
nock(BASE_URL)
  .post('/contacts')
  .reply(201, { id: 12345 });
```

### MongoDB (Database Driver):
```typescript
// Mock MongoDB driver methods with jest
mockCollection.insertOne = jest.fn().mockResolvedValue({
  insertedId: '507f1f77bcf86cd799439011',
  acknowledged: true,
});
```

### Key Differences:

| Aspect | HTTP Connectors (Brevo) | Database Connectors (MongoDB) |
|--------|-------------------------|-------------------------------|
| **Mocking Tool** | nock (HTTP interceptor) | jest.fn() (function mocking) |
| **What to Mock** | HTTP endpoints | MongoDB driver methods |
| **Setup** | `nock(baseUrl).get('/path')` | `jest.spyOn(MongoClient.prototype, 'connect')` |
| **Assertions** | HTTP status, response body | Method calls, return values |

---

## Comparison with n8n's Approach

### Similarities ✅
1. **No Real External Calls**: Both use mocking
2. **Test Location**: Co-located with connector code
3. **Fixtures**: JSON files for test data
4. **Test Coverage**: Success, error, edge cases

### Differences ⚠️
1. **n8n** uses `testConnection()` functions extensively
2. **Fluxturn** has more structured test helpers
3. **n8n** tests are per-node basis
4. **Fluxturn** tests are per-connector with multiple actions

---

## Running MongoDB Tests

Once Jest is configured:

```bash
# Run all MongoDB tests
npm test -- --testPathPattern=mongodb

# Run with verbose output
npm test -- --testPathPattern=mongodb --verbose

# Run with coverage
npm test -- --testPathPattern=mongodb --coverage

# Watch mode for development
npm test -- --testPathPattern=mongodb --watch
```

---

## Testing Checklist for MongoDB

- [ ] Fix Jest configuration
- [ ] Add MongoDB mock credentials to `test/helpers/mock-credentials.ts`
- [ ] Create `__tests__/` folder
- [ ] Create `__tests__/fixtures/` folder
- [ ] Create fixture files for each action
- [ ] Create `mongodb.connector.spec.ts`
- [ ] Add connection tests
- [ ] Add insert_document tests
- [ ] Add find_documents tests
- [ ] Add update_document tests
- [ ] Add delete_document tests
- [ ] Add aggregation tests
- [ ] Add unknown action test
- [ ] Run tests and verify all pass
- [ ] Mark connector as verified ✅ (Already done!)

---

## Benefits of Automated Testing

1. **Fast Feedback**: Tests run in milliseconds
2. **No External Dependencies**: No real MongoDB needed
3. **Comprehensive Coverage**: Test error cases easily
4. **Regression Prevention**: Catch bugs before deployment
5. **Documentation**: Tests serve as usage examples
6. **Confidence**: Safe refactoring with test coverage

---

## Next Steps

1. **Immediate**: Fix Jest configuration
2. **Short-term**: Create MongoDB test files
3. **Medium-term**: Run and verify tests pass
4. **Long-term**: Add tests for all 26 connectors

---

## Conclusion

**YES - You can test MongoDB the same way as Brevo!**

The testing approach is well-established in your codebase. The main difference is that MongoDB requires mocking the MongoDB driver methods instead of HTTP endpoints, but the overall structure and approach remain the same.

Once Jest configuration is fixed, the MongoDB tests will run automatically and provide the same level of confidence as the Brevo tests.
