import { Test, TestingModule } from '@nestjs/testing';
import { ControlFlowService } from './control-flow.service';
import {
  ConditionsConfigDto,
  IfNodeConfigDto,
  FilterNodeConfigDto,
  SwitchNodeConfigDto,
  LoopNodeConfigDto,
  OperatorType,
} from '../dto/control-flow.dto';

describe('ControlFlowService', () => {
  let service: ControlFlowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ControlFlowService],
    }).compile();

    service = module.get<ControlFlowService>(ControlFlowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('IF Node Execution', () => {
    it('should route items to true output when condition passes', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.status}}',
              operator: { type: OperatorType.STRING, operation: 'equals' },
              rightValue: 'active',
            },
          ],
        },
        ignoreCase: true,
      };

      const inputData = [
        { status: 'active', name: 'User 1' },
        { status: 'inactive', name: 'User 2' },
        { status: 'active', name: 'User 3' },
      ];

      const result = await service.executeIfNode(config, inputData);

      expect(result.trueOutput).toHaveLength(2);
      expect(result.falseOutput).toHaveLength(1);
      expect(result.trueCount).toBe(2);
      expect(result.falseCount).toBe(1);
      expect(result.trueOutput[0].name).toBe('User 1');
      expect(result.falseOutput[0].name).toBe('User 2');
    });

    it('should handle multiple conditions with AND combinator', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.status}}',
              operator: { type: OperatorType.STRING, operation: 'equals' },
              rightValue: 'active',
            },
            {
              leftValue: '{{$json.age}}',
              operator: { type: OperatorType.NUMBER, operation: 'gte' },
              rightValue: '18',
            },
          ],
        },
        ignoreCase: true,
      };

      const inputData = [
        { status: 'active', age: 25, name: 'Adult Active' },
        { status: 'active', age: 15, name: 'Minor Active' },
        { status: 'inactive', age: 25, name: 'Adult Inactive' },
      ];

      const result = await service.executeIfNode(config, inputData);

      expect(result.trueOutput).toHaveLength(1);
      expect(result.trueOutput[0].name).toBe('Adult Active');
      expect(result.falseOutput).toHaveLength(2);
    });

    it('should handle multiple conditions with OR combinator', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'or',
          conditions: [
            {
              leftValue: '{{$json.priority}}',
              operator: { type: OperatorType.STRING, operation: 'equals' },
              rightValue: 'urgent',
            },
            {
              leftValue: '{{$json.amount}}',
              operator: { type: OperatorType.NUMBER, operation: 'gt' },
              rightValue: '10000',
            },
          ],
        },
        ignoreCase: true,
      };

      const inputData = [
        { priority: 'urgent', amount: 5000, name: 'Urgent Low Amount' },
        { priority: 'normal', amount: 15000, name: 'Normal High Amount' },
        { priority: 'normal', amount: 5000, name: 'Normal Low Amount' },
      ];

      const result = await service.executeIfNode(config, inputData);

      expect(result.trueOutput).toHaveLength(2);
      expect(result.falseOutput).toHaveLength(1);
    });

    it('should handle case-insensitive string comparison', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.status}}',
              operator: { type: OperatorType.STRING, operation: 'equals' },
              rightValue: 'ACTIVE',
            },
          ],
        },
        ignoreCase: true,
      };

      const inputData = [{ status: 'active' }, { status: 'Active' }, { status: 'ACTIVE' }];

      const result = await service.executeIfNode(config, inputData);

      expect(result.trueOutput).toHaveLength(3);
      expect(result.falseOutput).toHaveLength(0);
    });

    it('should handle nested object paths', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.user.address.city}}',
              operator: { type: OperatorType.STRING, operation: 'equals' },
              rightValue: 'New York',
            },
          ],
        },
        ignoreCase: false,
      };

      const inputData = [
        { user: { address: { city: 'New York' } } },
        { user: { address: { city: 'Los Angeles' } } },
      ];

      const result = await service.executeIfNode(config, inputData);

      expect(result.trueOutput).toHaveLength(1);
      expect(result.falseOutput).toHaveLength(1);
    });
  });

  describe('FILTER Node Execution', () => {
    it('should filter items based on conditions', async () => {
      const config: FilterNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.age}}',
              operator: { type: OperatorType.NUMBER, operation: 'gte' },
              rightValue: '18',
            },
          ],
        },
        ignoreCase: true,
      };

      const inputData = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 17 },
        { name: 'Charlie', age: 30 },
        { name: 'David', age: 15 },
      ];

      const result = await service.executeFilterNode(config, inputData);

      expect(result.kept).toHaveLength(2);
      expect(result.discarded).toHaveLength(2);
      expect(result.keptCount).toBe(2);
      expect(result.discardedCount).toBe(2);
      expect(result.kept[0].name).toBe('Alice');
      expect(result.kept[1].name).toBe('Charlie');
    });

    it('should handle complex filter conditions', async () => {
      const config: FilterNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.email}}',
              operator: { type: OperatorType.STRING, operation: 'isNotEmpty' },
              rightValue: '',
            },
            {
              leftValue: '{{$json.email}}',
              operator: { type: OperatorType.STRING, operation: 'contains' },
              rightValue: '@',
            },
          ],
        },
        ignoreCase: true,
      };

      const inputData = [
        { name: 'User1', email: 'user1@example.com' },
        { name: 'User2', email: '' },
        { name: 'User3', email: 'invalid-email' },
        { name: 'User4', email: 'user4@test.com' },
      ];

      const result = await service.executeFilterNode(config, inputData);

      expect(result.kept).toHaveLength(2);
      expect(result.kept[0].name).toBe('User1');
      expect(result.kept[1].name).toBe('User4');
    });
  });

  describe('SWITCH Node Execution', () => {
    it('should route items based on rules', async () => {
      const config: SwitchNodeConfigDto = {
        mode: 'rules',
        rules: {
          values: [
            {
              conditions: {
                combinator: 'and',
                conditions: [
                  {
                    leftValue: '{{$json.priority}}',
                    operator: { type: OperatorType.STRING, operation: 'equals' },
                    rightValue: 'high',
                  },
                ],
              },
              outputKey: 'high_priority',
              renameOutput: true,
            },
            {
              conditions: {
                combinator: 'and',
                conditions: [
                  {
                    leftValue: '{{$json.priority}}',
                    operator: { type: OperatorType.STRING, operation: 'equals' },
                    rightValue: 'medium',
                  },
                ],
              },
              outputKey: 'medium_priority',
              renameOutput: true,
            },
          ],
        },
        fallbackOutput: 'extra',
        ignoreCase: true,
      };

      const inputData = [
        { id: 1, priority: 'high' },
        { id: 2, priority: 'medium' },
        { id: 3, priority: 'low' },
        { id: 4, priority: 'high' },
      ];

      const result = await service.executeSwitchNode(config, inputData);

      expect(result.outputs['high_priority']).toHaveLength(2);
      expect(result.outputs['medium_priority']).toHaveLength(1);
      expect(result.outputs['fallback']).toHaveLength(1);
      expect(result.routingStats['high_priority']).toBe(2);
      expect(result.routingStats['medium_priority']).toBe(1);
      expect(result.unmatchedCount).toBe(0);
    });

    it('should handle expression mode', async () => {
      const config: SwitchNodeConfigDto = {
        mode: 'expression',
        expression: '{{$json.category}}',
        numberOutputs: 3,
        fallbackOutput: 'none',
        ignoreCase: true,
      };

      const inputData = [
        { name: 'Item1', category: '0' },
        { name: 'Item2', category: '1' },
        { name: 'Item3', category: '2' },
        { name: 'Item4', category: '0' },
      ];

      const result = await service.executeSwitchNode(config, inputData);

      expect(result.outputs['0']).toHaveLength(2);
      expect(result.outputs['1']).toHaveLength(1);
      expect(result.outputs['2']).toHaveLength(1);
    });

    it('should handle unmatched items with fallback', async () => {
      const config: SwitchNodeConfigDto = {
        mode: 'rules',
        rules: {
          values: [
            {
              conditions: {
                combinator: 'and',
                conditions: [
                  {
                    leftValue: '{{$json.type}}',
                    operator: { type: OperatorType.STRING, operation: 'equals' },
                    rightValue: 'premium',
                  },
                ],
              },
              outputKey: '0',
            },
          ],
        },
        fallbackOutput: 'none',
        ignoreCase: true,
      };

      const inputData = [
        { id: 1, type: 'premium' },
        { id: 2, type: 'basic' },
        { id: 3, type: 'free' },
      ];

      const result = await service.executeSwitchNode(config, inputData);

      expect(result.outputs['0']).toHaveLength(1);
      expect(result.unmatchedCount).toBe(2);
    });
  });

  describe('LOOP Node Execution', () => {
    it('should iterate over array items', async () => {
      const config: LoopNodeConfigDto = {
        items: '{{$json.orders}}',
        batchSize: undefined,
        maxIterations: undefined,
      };

      const inputData = {
        orders: [
          { id: 1, product: 'A' },
          { id: 2, product: 'B' },
          { id: 3, product: 'C' },
        ],
      };

      let callCount = 0;
      const iterationCallback = async (item: any, index: number) => {
        callCount++;
        return { processed: true, item, index };
      };

      const result = await service.executeLoopNode(config, inputData, iterationCallback);

      expect(result.totalIterations).toBe(3);
      expect(result.successfulIterations).toBe(3);
      expect(result.failedIterations).toBe(0);
      expect(callCount).toBe(3);
      expect(result.iterationResults[0].success).toBe(true);
    });

    it('should respect maxIterations limit', async () => {
      const config: LoopNodeConfigDto = {
        items: '{{$json.items}}',
        maxIterations: 2,
      };

      const inputData = {
        items: [1, 2, 3, 4, 5],
      };

      let callCount = 0;
      const iterationCallback = async (item: any) => {
        callCount++;
        return item;
      };

      const result = await service.executeLoopNode(config, inputData, iterationCallback);

      expect(result.totalIterations).toBe(2);
      expect(callCount).toBe(2);
    });

    it('should handle batch processing', async () => {
      const config: LoopNodeConfigDto = {
        items: '{{$json.items}}',
        batchSize: 2,
      };

      const inputData = {
        items: [1, 2, 3, 4, 5],
      };

      const processedItems: number[] = [];
      const iterationCallback = async (item: any) => {
        processedItems.push(item);
        return item;
      };

      const result = await service.executeLoopNode(config, inputData, iterationCallback);

      expect(result.totalIterations).toBe(5);
      expect(processedItems).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle iteration errors', async () => {
      const config: LoopNodeConfigDto = {
        items: '{{$json.items}}',
      };

      const inputData = {
        items: [1, 2, 3, 4],
      };

      const iterationCallback = async (item: any) => {
        if (item === 2 || item === 3) {
          throw new Error('Processing failed');
        }
        return item;
      };

      const result = await service.executeLoopNode(config, inputData, iterationCallback);

      expect(result.totalIterations).toBe(4);
      expect(result.successfulIterations).toBe(2);
      expect(result.failedIterations).toBe(2);
    });
  });

  describe('String Operations', () => {
    it('should handle contains operation', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.text}}',
              operator: { type: OperatorType.STRING, operation: 'contains' },
              rightValue: 'hello',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { text: 'hello world' },
        { text: 'goodbye' },
      ]);

      expect(result.trueOutput).toHaveLength(1);
    });

    it('should handle regex operation', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.email}}',
              operator: { type: OperatorType.STRING, operation: 'regex' },
              rightValue: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { email: 'valid@example.com' },
        { email: 'invalid-email' },
      ]);

      expect(result.trueOutput).toHaveLength(1);
    });

    it('should handle startsWith and endsWith operations', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'or',
          conditions: [
            {
              leftValue: '{{$json.filename}}',
              operator: { type: OperatorType.STRING, operation: 'startsWith' },
              rightValue: 'test_',
            },
            {
              leftValue: '{{$json.filename}}',
              operator: { type: OperatorType.STRING, operation: 'endsWith' },
              rightValue: '.pdf',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { filename: 'test_file.txt' },
        { filename: 'document.pdf' },
        { filename: 'image.jpg' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });
  });

  describe('Number Operations', () => {
    it('should handle all comparison operators', async () => {
      const testCases = [
        { operation: 'gt', value: 10, data: [{ n: 15 }, { n: 5 }], expectedTrue: 1 },
        { operation: 'gte', value: 10, data: [{ n: 10 }, { n: 5 }], expectedTrue: 1 },
        { operation: 'lt', value: 10, data: [{ n: 5 }, { n: 15 }], expectedTrue: 1 },
        { operation: 'lte', value: 10, data: [{ n: 10 }, { n: 15 }], expectedTrue: 1 },
      ];

      for (const testCase of testCases) {
        const config: IfNodeConfigDto = {
          conditions: {
            combinator: 'and',
            conditions: [
              {
                leftValue: '{{$json.n}}',
                operator: { type: OperatorType.NUMBER, operation: testCase.operation },
                rightValue: testCase.value.toString(),
              },
            ],
          },
        };

        const result = await service.executeIfNode(config, testCase.data);
        expect(result.trueOutput).toHaveLength(testCase.expectedTrue);
      }
    });
  });

  describe('Boolean Operations', () => {
    it('should handle boolean true/false checks', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.isActive}}',
              operator: { type: OperatorType.BOOLEAN, operation: 'true' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { isActive: true },
        { isActive: false },
        { isActive: 1 },
      ]);

      expect(result.trueOutput).toHaveLength(2); // true and 1 (truthy)
    });
  });

  describe('Array Operations', () => {
    it('should handle array contains operation', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.tags}}',
              operator: { type: OperatorType.ARRAY, operation: 'contains' },
              rightValue: 'important',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { tags: ['important', 'urgent'] },
        { tags: ['normal'] },
      ]);

      expect(result.trueOutput).toHaveLength(1);
    });

    it('should handle array length checks', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.items}}',
              operator: { type: OperatorType.ARRAY, operation: 'lengthEquals' },
              rightValue: '3',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { items: [1, 2, 3] },
        { items: [1, 2] },
      ]);

      expect(result.trueOutput).toHaveLength(1);
    });
  });

  describe('Comprehensive String Operator Tests', () => {
    it('equals - should match exact strings', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.text}}',
              operator: { type: OperatorType.STRING, operation: 'equals' },
              rightValue: 'hello',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { text: 'hello' },
        { text: 'world' },
        { text: 'hello world' },
      ]);

      expect(result.trueOutput).toHaveLength(1);
      expect(result.trueOutput[0].text).toBe('hello');
    });

    it('notEquals - should match non-equal strings', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.status}}',
              operator: { type: OperatorType.STRING, operation: 'notEquals' },
              rightValue: 'inactive',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { status: 'active' },
        { status: 'inactive' },
        { status: 'pending' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('contains - should match substring', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.text}}',
              operator: { type: OperatorType.STRING, operation: 'contains' },
              rightValue: 'world',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { text: 'hello world' },
        { text: 'world peace' },
        { text: 'hello' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('notContains - should match strings without substring', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.text}}',
              operator: { type: OperatorType.STRING, operation: 'notContains' },
              rightValue: 'error',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { text: 'success' },
        { text: 'error occurred' },
        { text: 'completed' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('startsWith - should match string prefix', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.filename}}',
              operator: { type: OperatorType.STRING, operation: 'startsWith' },
              rightValue: 'test_',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { filename: 'test_file.txt' },
        { filename: 'test_data.json' },
        { filename: 'prod_file.txt' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('endsWith - should match string suffix', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.filename}}',
              operator: { type: OperatorType.STRING, operation: 'endsWith' },
              rightValue: '.pdf',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { filename: 'document.pdf' },
        { filename: 'image.jpg' },
        { filename: 'report.pdf' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('isEmpty - should match empty strings', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.value}}',
              operator: { type: OperatorType.STRING, operation: 'isEmpty' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { value: '' },
        { value: 'something' },
        { value: null }, // null converts to empty string
      ]);

      expect(result.trueOutput).toHaveLength(2); // '' and null both resolve to empty
    });

    it('isNotEmpty - should match non-empty strings', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.value}}',
              operator: { type: OperatorType.STRING, operation: 'isNotEmpty' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { value: 'text' },
        { value: '' },
        { value: '0' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('regex - should match pattern', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.email}}',
              operator: { type: OperatorType.STRING, operation: 'regex' },
              rightValue: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { email: 'valid@example.com' },
        { email: 'also.valid@test.org' },
        { email: 'invalid-email' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('string gt - operators route to number comparison for numeric values', async () => {
      // Note: gt/gte/lt/lte in string type are routed to number comparison
      // for UI convenience (users don't need to switch to number type)
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.value}}',
              operator: { type: OperatorType.STRING, operation: 'gt' },
              rightValue: '10',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { value: 15 },
        { value: 5 },
        { value: 20 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('string lt - operators route to number comparison for numeric values', async () => {
      // Note: gt/gte/lt/lte in string type are routed to number comparison
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.count}}',
              operator: { type: OperatorType.STRING, operation: 'lt' },
              rightValue: '100',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { count: 50 },
        { count: 100 },
        { count: 75 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });
  });

  describe('Comprehensive Number Operator Tests', () => {
    it('number equals - should match exact numbers', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.count}}',
              operator: { type: OperatorType.NUMBER, operation: 'equals' },
              rightValue: '10',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { count: 10 },
        { count: 5 },
        { count: 10.0 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('number notEquals - should match different numbers', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.value}}',
              operator: { type: OperatorType.NUMBER, operation: 'notEquals' },
              rightValue: '0',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { value: 0 },
        { value: 1 },
        { value: -1 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('gt - should match greater than', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.score}}',
              operator: { type: OperatorType.NUMBER, operation: 'gt' },
              rightValue: '50',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { score: 75 },
        { score: 50 },
        { score: 25 },
        { score: 100 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('gte - should match greater than or equal', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.age}}',
              operator: { type: OperatorType.NUMBER, operation: 'gte' },
              rightValue: '18',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { age: 18 },
        { age: 17 },
        { age: 25 },
        { age: 16 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('lt - should match less than', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.price}}',
              operator: { type: OperatorType.NUMBER, operation: 'lt' },
              rightValue: '100',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { price: 50 },
        { price: 100 },
        { price: 150 },
        { price: 75 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('lte - should match less than or equal', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.quantity}}',
              operator: { type: OperatorType.NUMBER, operation: 'lte' },
              rightValue: '5',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { quantity: 5 },
        { quantity: 3 },
        { quantity: 10 },
        { quantity: 1 },
      ]);

      expect(result.trueOutput).toHaveLength(3);
    });

    it('number isEmpty - should match null/undefined/empty', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.value}}',
              operator: { type: OperatorType.NUMBER, operation: 'isEmpty' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { value: null },
        { value: undefined },
        { value: 0 },
        { value: '' },
      ]);

      expect(result.trueOutput).toHaveLength(3); // null, undefined, ''
    });

    it('number isNotEmpty - should match non-empty values', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.value}}',
              operator: { type: OperatorType.NUMBER, operation: 'isNotEmpty' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { value: 10 },
        { value: null },
        { value: 0 },
      ]);

      expect(result.trueOutput).toHaveLength(2); // 10 and 0
    });
  });

  describe('Comprehensive Boolean Operator Tests', () => {
    it('boolean true - should match truthy values', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.isActive}}',
              operator: { type: OperatorType.BOOLEAN, operation: 'true' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { isActive: true },
        { isActive: false },
        { isActive: 1 },
        { isActive: 0 },
      ]);

      expect(result.trueOutput).toHaveLength(2); // true and 1
    });

    it('boolean false - should match falsy values', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.disabled}}',
              operator: { type: OperatorType.BOOLEAN, operation: 'false' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { disabled: false },
        { disabled: true },
        { disabled: 0 },
        { disabled: null },
      ]);

      expect(result.trueOutput).toHaveLength(3); // false, 0, null
    });

    it('boolean equals - should compare boolean values', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.flag}}',
              operator: { type: OperatorType.BOOLEAN, operation: 'equals' },
              rightValue: 'true',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { flag: true },
        { flag: false },
        { flag: 'true' },
      ]);

      expect(result.trueOutput).toHaveLength(2); // true and 'true' (both truthy)
    });
  });

  describe('Comprehensive Date Operator Tests', () => {
    it('date equals - should match same dates', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.date}}',
              operator: { type: OperatorType.DATE, operation: 'equals' },
              rightValue: '2024-01-15',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { date: '2024-01-15' },
        { date: '2024-01-16' },
        { date: '2024-01-15T00:00:00.000Z' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('date notEquals - should match different dates', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.date}}',
              operator: { type: OperatorType.DATE, operation: 'notEquals' },
              rightValue: '2024-01-15',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { date: '2024-01-14' },
        { date: '2024-01-15' },
        { date: '2024-01-16' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('date after - should match dates after reference', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.date}}',
              operator: { type: OperatorType.DATE, operation: 'after' },
              rightValue: '2024-06-01',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { date: '2024-07-15' },
        { date: '2024-05-15' },
        { date: '2024-12-31' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('date before - should match dates before reference', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.date}}',
              operator: { type: OperatorType.DATE, operation: 'before' },
              rightValue: '2024-06-01',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { date: '2024-01-15' },
        { date: '2024-07-15' },
        { date: '2024-03-01' },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });
  });

  describe('Comprehensive Array Operator Tests', () => {
    it('array contains - should match arrays containing value', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.roles}}',
              operator: { type: OperatorType.ARRAY, operation: 'contains' },
              rightValue: 'admin',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { roles: ['admin', 'user'] },
        { roles: ['user'] },
        { roles: ['admin'] },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('array notContains - should match arrays not containing value', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.tags}}',
              operator: { type: OperatorType.ARRAY, operation: 'notContains' },
              rightValue: 'spam',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { tags: ['important', 'work'] },
        { tags: ['spam', 'junk'] },
        { tags: ['urgent'] },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('array isEmpty - should match empty arrays', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.items}}',
              operator: { type: OperatorType.ARRAY, operation: 'isEmpty' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { items: [] },
        { items: [1, 2, 3] },
        { items: ['a'] },
      ]);

      expect(result.trueOutput).toHaveLength(1);
    });

    it('array isNotEmpty - should match non-empty arrays', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.list}}',
              operator: { type: OperatorType.ARRAY, operation: 'isNotEmpty' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { list: [1] },
        { list: [] },
        { list: ['a', 'b', 'c'] },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('array lengthEquals - should match arrays of specific length', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.items}}',
              operator: { type: OperatorType.ARRAY, operation: 'lengthEquals' },
              rightValue: '3',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { items: [1, 2, 3] },
        { items: [1, 2] },
        { items: ['a', 'b', 'c'] },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });
  });

  describe('String type with numeric operators (UI convenience)', () => {
    it('should handle gt operator in string type for numeric comparison', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.value}}',
              operator: { type: OperatorType.STRING, operation: 'gt' },
              rightValue: '10',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { value: 15 },
        { value: 5 },
        { value: 20 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('should handle gte operator in string type for numeric comparison', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.count}}',
              operator: { type: OperatorType.STRING, operation: 'gte' },
              rightValue: '100',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { count: 100 },
        { count: 99 },
        { count: 200 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('should handle lt operator in string type for numeric comparison', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.price}}',
              operator: { type: OperatorType.STRING, operation: 'lt' },
              rightValue: '50',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { price: 25 },
        { price: 50 },
        { price: 10 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('should handle lte operator in string type for numeric comparison', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.quantity}}',
              operator: { type: OperatorType.STRING, operation: 'lte' },
              rightValue: '10',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { quantity: 10 },
        { quantity: 11 },
        { quantity: 5 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });
  });

  describe('Node Reference Format (FieldPicker action mode)', () => {
    it('should handle $node["NodeName"].json.field format', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$node["Run Code"].json.status}}',
              operator: { type: OperatorType.STRING, operation: 'equals' },
              rightValue: 'active',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { status: 'active', name: 'Item 1' },
        { status: 'inactive', name: 'Item 2' },
      ]);

      expect(result.trueOutput).toHaveLength(1);
      expect(result.trueOutput[0].name).toBe('Item 1');
    });

    it('should handle $node["NodeName"].json.nested.field format', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$node["Previous Node"].json.user.email}}',
              operator: { type: OperatorType.STRING, operation: 'contains' },
              rightValue: '@example.com',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { user: { email: 'test@example.com' } },
        { user: { email: 'test@other.com' } },
      ]);

      expect(result.trueOutput).toHaveLength(1);
    });

    it('should handle node reference with numeric comparison', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$node["Data Source"].json.count}}',
              operator: { type: OperatorType.NUMBER, operation: 'gt' },
              rightValue: '10',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { count: 15 },
        { count: 5 },
        { count: 20 },
      ]);

      expect(result.trueOutput).toHaveLength(2);
    });

    it('should handle array index patterns like 0[0].json.field', async () => {
      // This pattern can appear in nested output structures
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{0[0].json.telegramEvent}}',
              operator: { type: OperatorType.STRING, operation: 'isNotEmpty' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { telegramEvent: 'message_received' },
        { telegramEvent: '' },
      ]);

      expect(result.trueOutput).toHaveLength(1);
    });

    it('should handle mixed formats in multiple conditions', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$node["API Call"].json.success}}',
              operator: { type: OperatorType.BOOLEAN, operation: 'true' },
              rightValue: '',
            },
            {
              leftValue: '{{$json.count}}',
              operator: { type: OperatorType.NUMBER, operation: 'gte' },
              rightValue: '1',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { success: true, count: 5 },
        { success: false, count: 10 },
        { success: true, count: 0 },
      ]);

      expect(result.trueOutput).toHaveLength(1);
      expect(result.trueOutput[0].count).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input data', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.status}}',
              operator: { type: OperatorType.STRING, operation: 'equals' },
              rightValue: 'active',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, []);

      expect(result.trueOutput).toHaveLength(0);
      expect(result.falseOutput).toHaveLength(0);
    });

    it('should handle null/undefined values gracefully', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.value}}',
              operator: { type: OperatorType.STRING, operation: 'isNotEmpty' },
              rightValue: '',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [
        { value: 'something' },
        { value: null },
        { value: undefined },
        { value: '' },
      ]);

      expect(result.trueOutput).toHaveLength(1);
      expect(result.falseOutput).toHaveLength(3);
    });

    it('should handle invalid regex gracefully', async () => {
      const config: IfNodeConfigDto = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.text}}',
              operator: { type: OperatorType.STRING, operation: 'regex' },
              rightValue: '[invalid(regex',
            },
          ],
        },
      };

      const result = await service.executeIfNode(config, [{ text: 'test' }]);

      // Should not throw, but return false for invalid regex
      expect(result.falseOutput).toHaveLength(1);
    });
  });
});
