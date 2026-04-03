/**
 * Elasticsearch Connector Tests
 */
import nock from 'nock';
import { ElasticsearchConnector } from '../elasticsearch.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('ElasticsearchConnector', () => {
  let connector: ElasticsearchConnector;
  const BASE_URL = 'http://localhost:9200';

  beforeEach(async () => {
    nock.cleanAll();
    connector = await ConnectorTestHelper.createConnector(ElasticsearchConnector, 'elasticsearch');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('testConnection', () => {
    it('should return success when Elasticsearch responds', async () => {
      nock(BASE_URL)
        .get('/')
        .reply(200, {
          name: 'mock-node',
          cluster_name: 'mock-cluster',
          version: { number: '8.0.0' }
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when Elasticsearch is unreachable', async () => {
      nock(BASE_URL)
        .get('/')
        .replyWithError('Connection refused');

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  describe('document_create', () => {
    it('should create document without ID (auto-generate)', async () => {
      const mockResponse = {
        _index: 'test-index',
        _id: 'auto-generated-id',
        _version: 1,
        result: 'created'
      };

      nock(BASE_URL)
        .post('/test-index/_doc')
        .reply(201, mockResponse);

      const result = await connector.executeAction('document_create', {
        indexId: 'test-index',
        data: {
          title: 'Test Document',
          content: 'Test content'
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.result).toBe('created');
    });

    it('should create document with specific ID', async () => {
      const mockResponse = {
        _index: 'test-index',
        _id: 'doc-123',
        _version: 1,
        result: 'created'
      };

      nock(BASE_URL)
        .put('/test-index/_doc/doc-123')
        .reply(201, mockResponse);

      const result = await connector.executeAction('document_create', {
        indexId: 'test-index',
        documentId: 'doc-123',
        data: {
          title: 'Specific Document',
          content: 'Content with specific ID'
        }
      });

      expect(result.success).toBe(true);
      expect(result.data._id).toBe('doc-123');
    });

    it('should create document with fields defined below', async () => {
      const mockResponse = {
        _index: 'test-index',
        _id: 'doc-456',
        _version: 1,
        result: 'created'
      };

      nock(BASE_URL)
        .put('/test-index/_doc/doc-456')
        .reply(201, mockResponse);

      const result = await connector.executeAction('document_create', {
        indexId: 'test-index',
        documentId: 'doc-456',
        dataToSend: 'defineBelow',
        fieldsToSend: JSON.stringify({
          name: 'Custom Field',
          value: 123
        })
      });

      expect(result.success).toBe(true);
    });
  });

  describe('document_get', () => {
    it('should get document by ID', async () => {
      const mockResponse = {
        _index: 'test-index',
        _id: 'doc-123',
        _version: 1,
        found: true,
        _source: {
          title: 'Test Document',
          content: 'Test content'
        }
      };

      nock(BASE_URL)
        .get('/test-index/_doc/doc-123')
        .reply(200, mockResponse);

      const result = await connector.executeAction('document_get', {
        indexId: 'test-index',
        documentId: 'doc-123',
        simple: false
      });

      expect(result.success).toBe(true);
      expect(result.data._id).toBe('doc-123');
      expect(result.data._source.title).toBe('Test Document');
    });

    it('should get document in simple format', async () => {
      const mockResponse = {
        _index: 'test-index',
        _id: 'doc-123',
        _version: 1,
        found: true,
        _source: {
          title: 'Simple Document',
          content: 'Simple content'
        }
      };

      nock(BASE_URL)
        .get('/test-index/_doc/doc-123')
        .reply(200, mockResponse);

      const result = await connector.executeAction('document_get', {
        indexId: 'test-index',
        documentId: 'doc-123',
        simple: true
      });

      expect(result.success).toBe(true);
      expect(result.data._id).toBe('doc-123');
      expect(result.data.title).toBe('Simple Document');
    });

    it('should handle document not found', async () => {
      nock(BASE_URL)
        .get('/test-index/_doc/nonexistent')
        .reply(404, {
          _index: 'test-index',
          _id: 'nonexistent',
          found: false
        });

      const result = await connector.executeAction('document_get', {
        indexId: 'test-index',
        documentId: 'nonexistent',
        simple: false
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('document_get_all', () => {
    it('should search documents with limit', async () => {
      const mockResponse = {
        hits: {
          total: { value: 100 },
          hits: [
            { _id: '1', _source: { title: 'Doc 1' } },
            { _id: '2', _source: { title: 'Doc 2' } }
          ]
        }
      };

      nock(BASE_URL)
        .post('/test-index/_search?size=2')
        .reply(200, mockResponse);

      const result = await connector.executeAction('document_get_all', {
        indexId: 'test-index',
        returnAll: false,
        limit: 2,
        simple: false
      });

      expect(result.success).toBe(true);
      expect(result.data.hits).toHaveLength(2);
    });

    it('should search documents with query', async () => {
      const mockResponse = {
        hits: {
          total: { value: 1 },
          hits: [
            { _id: '1', _source: { title: 'Matched Doc' } }
          ]
        }
      };

      nock(BASE_URL)
        .post('/test-index/_search?size=10')
        .reply(200, mockResponse);

      const result = await connector.executeAction('document_get_all', {
        indexId: 'test-index',
        returnAll: false,
        limit: 10,
        query: JSON.stringify({
          query: {
            match: { title: 'Matched' }
          }
        }),
        simple: false
      });

      expect(result.success).toBe(true);
      expect(result.data.hits[0]._source.title).toBe('Matched Doc');
    });

    it('should search documents in simple format', async () => {
      const mockResponse = {
        hits: {
          total: { value: 2 },
          hits: [
            { _id: '1', _source: { name: 'Item 1' } },
            { _id: '2', _source: { name: 'Item 2' } }
          ]
        }
      };

      nock(BASE_URL)
        .post('/test-index/_search?size=10')
        .reply(200, mockResponse);

      const result = await connector.executeAction('document_get_all', {
        indexId: 'test-index',
        returnAll: false,
        limit: 10,
        simple: true
      });

      expect(result.success).toBe(true);
      expect(result.data.hits[0]._id).toBe('1');
      expect(result.data.hits[0].name).toBe('Item 1');
    });
  });

  describe('document_update', () => {
    it('should update document', async () => {
      const mockResponse = {
        _index: 'test-index',
        _id: 'doc-123',
        _version: 2,
        result: 'updated'
      };

      nock(BASE_URL)
        .post('/test-index/_update/doc-123')
        .reply(200, mockResponse);

      const result = await connector.executeAction('document_update', {
        indexId: 'test-index',
        documentId: 'doc-123',
        data: {
          title: 'Updated Title'
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.result).toBe('updated');
    });
  });

  describe('document_delete', () => {
    it('should delete document', async () => {
      const mockResponse = {
        _index: 'test-index',
        _id: 'doc-123',
        _version: 3,
        result: 'deleted'
      };

      nock(BASE_URL)
        .delete('/test-index/_doc/doc-123')
        .reply(200, mockResponse);

      const result = await connector.executeAction('document_delete', {
        indexId: 'test-index',
        documentId: 'doc-123'
      });

      expect(result.success).toBe(true);
      expect(result.data.result).toBe('deleted');
    });
  });

  describe('index_create', () => {
    it('should create index', async () => {
      const mockResponse = {
        acknowledged: true,
        shards_acknowledged: true,
        index: 'new-index'
      };

      nock(BASE_URL)
        .put('/new-index')
        .reply(200, mockResponse);

      const result = await connector.executeAction('index_create', {
        indexId: 'new-index'
      });

      expect(result.success).toBe(true);
      expect(result.data.acknowledged).toBe(true);
    });

    it('should create index with mappings', async () => {
      const mockResponse = {
        acknowledged: true,
        shards_acknowledged: true,
        index: 'mapped-index'
      };

      nock(BASE_URL)
        .put('/mapped-index')
        .reply(200, mockResponse);

      const result = await connector.executeAction('index_create', {
        indexId: 'mapped-index',
        mappings: JSON.stringify({
          properties: {
            title: { type: 'text' },
            count: { type: 'integer' }
          }
        })
      });

      expect(result.success).toBe(true);
    });
  });

  describe('index_get', () => {
    it('should get index information', async () => {
      const mockResponse = {
        'test-index': {
          aliases: {},
          mappings: {},
          settings: {}
        }
      };

      nock(BASE_URL)
        .get('/test-index')
        .reply(200, mockResponse);

      const result = await connector.executeAction('index_get', {
        indexId: 'test-index'
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('test-index');
    });
  });

  describe('index_get_all', () => {
    it('should list all indices', async () => {
      const mockResponse = {
        'index-1': { aliases: {} },
        'index-2': { aliases: {} },
        'index-3': { aliases: {} }
      };

      nock(BASE_URL)
        .get('/_aliases')
        .reply(200, mockResponse);

      const result = await connector.executeAction('index_get_all', {
        returnAll: false,
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data.indices).toHaveLength(3);
    });

    it('should limit indices returned', async () => {
      const mockResponse = {
        'index-1': { aliases: {} },
        'index-2': { aliases: {} },
        'index-3': { aliases: {} }
      };

      nock(BASE_URL)
        .get('/_aliases')
        .reply(200, mockResponse);

      const result = await connector.executeAction('index_get_all', {
        returnAll: false,
        limit: 2
      });

      expect(result.success).toBe(true);
      expect(result.data.indices).toHaveLength(2);
    });
  });

  describe('index_delete', () => {
    it('should delete index', async () => {
      const mockResponse = {
        acknowledged: true
      };

      nock(BASE_URL)
        .delete('/test-index')
        .reply(200, mockResponse);

      const result = await connector.executeAction('index_delete', {
        indexId: 'test-index'
      });

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
    });
  });

  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});
      expect(result.success).toBe(false);
    });
  });
});
