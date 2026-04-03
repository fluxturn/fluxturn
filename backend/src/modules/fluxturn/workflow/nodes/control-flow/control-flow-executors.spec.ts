import { Test, TestingModule } from '@nestjs/testing';
import { LoopExecutor } from './loop.executor';
import { WaitExecutor } from './wait.executor';
import { MergeExecutor } from './merge.executor';
import { SplitExecutor } from './split.executor';
import { IfExecutor } from './if.executor';
import { SwitchExecutor } from './switch.executor';
import { FilterExecutor } from './filter.executor';
import { ControlFlowService } from '../../services/control-flow.service';
import { NodeData, NodeInputItem, NodeExecutionContext } from '../base';

describe('Control Flow Executors', () => {
  let loopExecutor: LoopExecutor;
  let waitExecutor: WaitExecutor;
  let mergeExecutor: MergeExecutor;
  let splitExecutor: SplitExecutor;
  let ifExecutor: IfExecutor;
  let switchExecutor: SwitchExecutor;
  let filterExecutor: FilterExecutor;
  let controlFlowService: ControlFlowService;

  const createContext = (json: any = {}): NodeExecutionContext => ({
    $json: json,
    $node: {},
    $workflow: { id: 'test-workflow' },
    $env: {},
  });

  const createNode = (type: string, data: any = {}): NodeData => ({
    id: `${type.toLowerCase()}-1`,
    type,
    data,
  });

  const createInputItems = (items: any[]): NodeInputItem[] =>
    items.map(item => ({ json: item }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoopExecutor,
        WaitExecutor,
        MergeExecutor,
        SplitExecutor,
        IfExecutor,
        SwitchExecutor,
        FilterExecutor,
        ControlFlowService,
      ],
    }).compile();

    loopExecutor = module.get<LoopExecutor>(LoopExecutor);
    waitExecutor = module.get<WaitExecutor>(WaitExecutor);
    mergeExecutor = module.get<MergeExecutor>(MergeExecutor);
    splitExecutor = module.get<SplitExecutor>(SplitExecutor);
    ifExecutor = module.get<IfExecutor>(IfExecutor);
    switchExecutor = module.get<SwitchExecutor>(SwitchExecutor);
    filterExecutor = module.get<FilterExecutor>(FilterExecutor);
    controlFlowService = module.get<ControlFlowService>(ControlFlowService);
  });

  describe('LoopExecutor', () => {
    it('should be defined', () => {
      expect(loopExecutor).toBeDefined();
      expect(loopExecutor.supportedTypes).toContain('LOOP');
    });

    it('should iterate over array and output each item', async () => {
      const node = createNode('LOOP', {
        items: '{{$json.orders}}',
      });
      const inputData = createInputItems([
        {
          orders: [
            { id: 1, product: 'A' },
            { id: 2, product: 'B' },
            { id: 3, product: 'C' },
          ],
        },
      ]);
      const context = createContext(inputData[0].json);

      const result = await loopExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(3);
      expect(result[0].json).toEqual({ id: 1, product: 'A' });
      expect(result[1].json).toEqual({ id: 2, product: 'B' });
      expect(result[2].json).toEqual({ id: 3, product: 'C' });
    });

    it('should respect maxIterations limit', async () => {
      const node = createNode('LOOP', {
        items: '{{$json.items}}',
        maxIterations: 2,
      });
      const inputData = createInputItems([
        { items: [1, 2, 3, 4, 5] },
      ]);
      const context = createContext(inputData[0].json);

      const result = await loopExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(2);
      expect(result[0].json).toBe(1);
      expect(result[1].json).toBe(2);
    });

    it('should throw error if items expression is not configured', async () => {
      const node = createNode('LOOP', {});
      const inputData = createInputItems([{ data: 'test' }]);
      const context = createContext(inputData[0].json);

      await expect(loopExecutor.execute(node, inputData, context))
        .rejects.toThrow('items expression');
    });

    it('should throw error if items expression does not return array', async () => {
      const node = createNode('LOOP', {
        items: '{{$json.notAnArray}}',
      });
      const inputData = createInputItems([{ notAnArray: 'string value' }]);
      const context = createContext(inputData[0].json);

      await expect(loopExecutor.execute(node, inputData, context))
        .rejects.toThrow('did not return an array');
    });

    it('should handle empty arrays', async () => {
      const node = createNode('LOOP', {
        items: '{{$json.empty}}',
      });
      const inputData = createInputItems([{ empty: [] }]);
      const context = createContext(inputData[0].json);

      const result = await loopExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(0);
    });

    it('should handle multiple input items', async () => {
      const node = createNode('LOOP', {
        items: '{{$json.values}}',
      });
      const inputData = createInputItems([
        { values: ['a', 'b'] },
        { values: ['x', 'y', 'z'] },
      ]);
      const context = createContext({});

      const result = await loopExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(5); // 2 + 3
    });
  });

  describe('WaitExecutor', () => {
    it('should be defined', () => {
      expect(waitExecutor).toBeDefined();
      expect(waitExecutor.supportedTypes).toContain('WAIT');
    });

    it('should wait for specified time interval in seconds', async () => {
      const node = createNode('WAIT', {
        resume: 'timeInterval',
        amount: 0.1, // 100ms
        unit: 'seconds',
      });
      const inputData = createInputItems([{ test: 'data' }]);
      const context = createContext({});

      const start = Date.now();
      const result = await waitExecutor.execute(node, inputData, context);
      const elapsed = Date.now() - start;

      expect(result).toEqual(inputData);
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });

    it('should handle specificTime that has passed', async () => {
      const pastTime = new Date(Date.now() - 10000).toISOString();
      const node = createNode('WAIT', {
        resume: 'specificTime',
        dateTime: pastTime,
      });
      const inputData = createInputItems([{ test: 'data' }]);
      const context = createContext({});

      const result = await waitExecutor.execute(node, inputData, context);

      expect(result).toEqual(inputData);
    });

    it('should throw error for invalid specificTime', async () => {
      const node = createNode('WAIT', {
        resume: 'specificTime',
        dateTime: 'invalid-date',
      });
      const inputData = createInputItems([{ test: 'data' }]);
      const context = createContext({});

      await expect(waitExecutor.execute(node, inputData, context))
        .rejects.toThrow('Invalid date/time format');
    });

    it('should throw error if specificTime dateTime is missing', async () => {
      const node = createNode('WAIT', {
        resume: 'specificTime',
      });
      const inputData = createInputItems([{ test: 'data' }]);
      const context = createContext({});

      await expect(waitExecutor.execute(node, inputData, context))
        .rejects.toThrow('No date/time specified');
    });

    it('should handle webhook mode (placeholder)', async () => {
      const node = createNode('WAIT', {
        resume: 'webhook',
      });
      const inputData = createInputItems([{ test: 'data' }]);
      const context = createContext({});

      const result = await waitExecutor.execute(node, inputData, context);

      expect(result).toEqual(inputData);
    });

    it('should handle form mode (placeholder)', async () => {
      const node = createNode('WAIT', {
        resume: 'form',
      });
      const inputData = createInputItems([{ test: 'data' }]);
      const context = createContext({});

      const result = await waitExecutor.execute(node, inputData, context);

      expect(result).toEqual(inputData);
    });

    it('should throw error for unknown resume mode', async () => {
      const node = createNode('WAIT', {
        resume: 'unknownMode',
      });
      const inputData = createInputItems([{ test: 'data' }]);
      const context = createContext({});

      await expect(waitExecutor.execute(node, inputData, context))
        .rejects.toThrow('Unknown wait resume mode');
    });

    it('should throw error for invalid wait amount', async () => {
      const node = createNode('WAIT', {
        resume: 'timeInterval',
        amount: -5,
        unit: 'seconds',
      });
      const inputData = createInputItems([{ test: 'data' }]);
      const context = createContext({});

      await expect(waitExecutor.execute(node, inputData, context))
        .rejects.toThrow('Invalid wait amount');
    });
  });

  describe('MergeExecutor', () => {
    it('should be defined', () => {
      expect(mergeExecutor).toBeDefined();
      expect(mergeExecutor.supportedTypes).toContain('MERGE');
    });

    it('should append all items (default mode)', async () => {
      const node = createNode('MERGE', { mode: 'append' });
      const inputData = createInputItems([
        { a: 1 },
        { b: 2 },
        { c: 3 },
      ]);
      const context = createContext({});

      const result = await mergeExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(3);
      expect(result).toEqual(inputData);
    });

    it('should combine by position', async () => {
      const node = createNode('MERGE', {
        mode: 'combine',
        combineBy: 'combineByPosition',
        clashHandling: 'preferInput2',
      });
      // First half is input1, second half is input2
      const inputData = createInputItems([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { email: 'alice@test.com' },
        { email: 'bob@test.com' },
      ]);
      const context = createContext({});

      const result = await mergeExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(2);
      expect(result[0].json).toEqual({ name: 'Alice', age: 30, email: 'alice@test.com' });
      expect(result[1].json).toEqual({ name: 'Bob', age: 25, email: 'bob@test.com' });
    });

    it('should combine by fields (keepMatches)', async () => {
      const node = createNode('MERGE', {
        mode: 'combine',
        combineBy: 'combineByFields',
        fieldsToMatchString: 'id',
        joinMode: 'keepMatches',
        outputDataFrom: 'both',
        clashHandling: 'preferInput2',
      });
      const inputData = createInputItems([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 1, email: 'alice@test.com' },
        { id: 3, email: 'charlie@test.com' },
      ]);
      const context = createContext({});

      const result = await mergeExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual({ id: 1, name: 'Alice', email: 'alice@test.com' });
    });

    it('should combine all (cartesian product)', async () => {
      const node = createNode('MERGE', {
        mode: 'combine',
        combineBy: 'combineAll',
        clashHandling: 'preferInput2',
      });
      const inputData = createInputItems([
        { type: 'A' },
        { type: 'B' },
        { value: 1 },
        { value: 2 },
      ]);
      const context = createContext({});

      const result = await mergeExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(4); // 2 x 2 = 4
      expect(result.map(r => r.json)).toEqual([
        { type: 'A', value: 1 },
        { type: 'A', value: 2 },
        { type: 'B', value: 1 },
        { type: 'B', value: 2 },
      ]);
    });

    it('should choose branch (input1)', async () => {
      const node = createNode('MERGE', {
        mode: 'chooseBranch',
        output: 'specifiedInput',
        useDataOfInput: 1,
      });
      const inputData = createInputItems([
        { from: 'input1', id: 1 },
        { from: 'input1', id: 2 },
        { from: 'input2', id: 3 },
        { from: 'input2', id: 4 },
      ]);
      const context = createContext({});

      const result = await mergeExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(2);
      expect(result[0].json.from).toBe('input1');
      expect(result[1].json.from).toBe('input1');
    });

    it('should choose branch (input2)', async () => {
      const node = createNode('MERGE', {
        mode: 'chooseBranch',
        output: 'specifiedInput',
        useDataOfInput: 2,
      });
      const inputData = createInputItems([
        { from: 'input1', id: 1 },
        { from: 'input1', id: 2 },
        { from: 'input2', id: 3 },
        { from: 'input2', id: 4 },
      ]);
      const context = createContext({});

      const result = await mergeExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(2);
      expect(result[0].json.from).toBe('input2');
      expect(result[1].json.from).toBe('input2');
    });

    it('should return empty output when mode is chooseBranch with empty output', async () => {
      const node = createNode('MERGE', {
        mode: 'chooseBranch',
        output: 'empty',
      });
      const inputData = createInputItems([{ a: 1 }, { b: 2 }]);
      const context = createContext({});

      const result = await mergeExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual({});
    });

    it('should handle clash with addSuffix', async () => {
      const node = createNode('MERGE', {
        mode: 'combine',
        combineBy: 'combineByPosition',
        clashHandling: 'addSuffix',
      });
      const inputData = createInputItems([
        { name: 'Alice', value: 'from1' },
        { name: 'Bob', value: 'from2' },
      ]);
      const context = createContext({});

      const result = await mergeExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(1);
      expect(result[0].json).toHaveProperty('name_1', 'Alice');
      expect(result[0].json).toHaveProperty('name_2', 'Bob');
      expect(result[0].json).toHaveProperty('value_1', 'from1');
      expect(result[0].json).toHaveProperty('value_2', 'from2');
    });

    it('should handle empty input', async () => {
      const node = createNode('MERGE', { mode: 'append' });
      const inputData: NodeInputItem[] = [];
      const context = createContext({});

      const result = await mergeExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(0);
    });

    it('should throw error for unknown merge mode', async () => {
      const node = createNode('MERGE', { mode: 'unknownMode' });
      const inputData = createInputItems([{ a: 1 }]);
      const context = createContext({});

      await expect(mergeExecutor.execute(node, inputData, context))
        .rejects.toThrow('Unknown merge mode');
    });
  });

  describe('SplitExecutor', () => {
    it('should be defined', () => {
      expect(splitExecutor).toBeDefined();
      expect(splitExecutor.supportedTypes).toContain('SPLIT');
    });

    it('should duplicate items (default mode)', async () => {
      const node = createNode('SPLIT', {
        mode: 'duplicate',
        numberOfOutputs: 3,
      });
      const inputData = createInputItems([
        { id: 1 },
        { id: 2 },
      ]);
      const context = createContext({});

      const result = await splitExecutor.execute(node, inputData, context);

      // Duplicate returns all items, routing happens in workflow engine
      expect(result).toEqual(inputData);
    });

    it('should split evenly', async () => {
      const node = createNode('SPLIT', {
        mode: 'splitEvenly',
        numberOfOutputs: 2,
      });
      const inputData = createInputItems([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
      ]);
      const context = createContext({});

      const result = await splitExecutor.execute(node, inputData, context);

      expect(result).toEqual(inputData);
    });

    it('should split by field', async () => {
      const node = createNode('SPLIT', {
        mode: 'splitByField',
        fieldName: 'type',
        fieldValues: ['A', 'B'],
      });
      const inputData = createInputItems([
        { type: 'A', value: 1 },
        { type: 'B', value: 2 },
        { type: 'A', value: 3 },
      ]);
      const context = createContext({});

      const result = await splitExecutor.execute(node, inputData, context);

      expect(result).toEqual(inputData);
    });

    it('should throw error if splitByField has no fieldName', async () => {
      const node = createNode('SPLIT', {
        mode: 'splitByField',
      });
      const inputData = createInputItems([{ a: 1 }]);
      const context = createContext({});

      await expect(splitExecutor.execute(node, inputData, context))
        .rejects.toThrow('Field name is required');
    });

    it('should split by size', async () => {
      const node = createNode('SPLIT', {
        mode: 'splitBySize',
        chunkSize: 2,
      });
      const inputData = createInputItems([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 5 },
      ]);
      const context = createContext({});

      const result = await splitExecutor.execute(node, inputData, context);

      expect(result).toEqual(inputData);
    });

    it('should handle empty input', async () => {
      const node = createNode('SPLIT', { mode: 'duplicate' });
      const inputData: NodeInputItem[] = [];
      const context = createContext({});

      const result = await splitExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(0);
    });

    it('should throw error for unknown split mode', async () => {
      const node = createNode('SPLIT', { mode: 'unknownMode' });
      const inputData = createInputItems([{ a: 1 }]);
      const context = createContext({});

      await expect(splitExecutor.execute(node, inputData, context))
        .rejects.toThrow('Unknown split mode');
    });
  });

  describe('IfExecutor', () => {
    it('should be defined', () => {
      expect(ifExecutor).toBeDefined();
      expect(ifExecutor.supportedTypes).toContain('IF_CONDITION');
      expect(ifExecutor.supportedTypes).toContain('IF');
    });

    it('should return true items for standard execution', async () => {
      const node = createNode('IF_CONDITION', {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.status}}',
              operator: { type: 'string', operation: 'equals' },
              rightValue: 'active',
            },
          ],
        },
      });
      const inputData = createInputItems([
        { status: 'active', name: 'Item 1' },
        { status: 'inactive', name: 'Item 2' },
      ]);
      const context = createContext({});

      const result = await ifExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(1);
      expect(result[0].json.name).toBe('Item 1');
    });

    it('should return both branches with executeWithBranches', async () => {
      const node = createNode('IF_CONDITION', {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.value}}',
              operator: { type: 'number', operation: 'gt' },
              rightValue: '10',
            },
          ],
        },
      });
      const inputData = createInputItems([
        { value: 15 },
        { value: 5 },
        { value: 20 },
      ]);
      const context = createContext({});

      const result = await ifExecutor.executeWithBranches(node, inputData, context);

      expect(result.trueOutput).toHaveLength(2);
      expect(result.falseOutput).toHaveLength(1);
      expect(result.outputs[0]).toEqual(result.trueOutput);
      expect(result.outputs[1]).toEqual(result.falseOutput);
    });

    it('should route all to false if no conditions configured', async () => {
      const node = createNode('IF_CONDITION', {});
      const inputData = createInputItems([{ a: 1 }, { b: 2 }]);
      const context = createContext({});

      const result = await ifExecutor.executeWithBranches(node, inputData, context);

      expect(result.trueOutput).toHaveLength(0);
      expect(result.falseOutput).toHaveLength(2);
    });

    it('should validate conditions', () => {
      const nodeWithoutConditions = createNode('IF_CONDITION', {});
      const nodeWithEmptyConditions = createNode('IF_CONDITION', {
        conditions: { combinator: 'and', conditions: [] },
      });
      const validNode = createNode('IF_CONDITION', {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.field}}',
              operator: { type: 'string', operation: 'equals' },
              rightValue: 'test',
            },
          ],
        },
      });

      expect(ifExecutor.validate(nodeWithoutConditions)).toContain('Conditions are not configured');
      expect(ifExecutor.validate(nodeWithEmptyConditions)).toContain('At least one condition is required');
      expect(ifExecutor.validate(validNode)).toHaveLength(0);
    });
  });

  describe('SwitchExecutor', () => {
    it('should be defined', () => {
      expect(switchExecutor).toBeDefined();
      expect(switchExecutor.supportedTypes).toContain('SWITCH');
    });

    it('should route items based on rules', async () => {
      const node = createNode('SWITCH', {
        mode: 'rules',
        rules: {
          values: [
            {
              conditions: {
                combinator: 'and',
                conditions: [
                  {
                    leftValue: '{{$json.priority}}',
                    operator: { type: 'string', operation: 'equals' },
                    rightValue: 'high',
                  },
                ],
              },
              outputKey: 'high',
              renameOutput: true,
            },
            {
              conditions: {
                combinator: 'and',
                conditions: [
                  {
                    leftValue: '{{$json.priority}}',
                    operator: { type: 'string', operation: 'equals' },
                    rightValue: 'low',
                  },
                ],
              },
              outputKey: 'low',
              renameOutput: true,
            },
          ],
        },
        fallbackOutput: 'extra',
      });
      const inputData = createInputItems([
        { priority: 'high', id: 1 },
        { priority: 'low', id: 2 },
        { priority: 'medium', id: 3 },
      ]);
      const context = createContext({});

      const result = await switchExecutor.executeWithRouting(node, inputData, context);

      expect(result.outputs['high']).toHaveLength(1);
      expect(result.outputs['low']).toHaveLength(1);
      expect(result.outputs['fallback']).toHaveLength(1);
    });

    it('should pass through if no rules configured', async () => {
      const node = createNode('SWITCH', {});
      const inputData = createInputItems([{ a: 1 }, { b: 2 }]);
      const context = createContext({});

      const result = await switchExecutor.execute(node, inputData, context);

      expect(result).toEqual(inputData);
    });

    it('should validate rules mode', () => {
      const nodeWithoutRules = createNode('SWITCH', { mode: 'rules' });
      const validNode = createNode('SWITCH', {
        mode: 'rules',
        rules: {
          values: [
            {
              conditions: { combinator: 'and', conditions: [] },
            },
          ],
        },
      });

      expect(switchExecutor.validate(nodeWithoutRules)).toContain('At least one rule is required in rules mode');
      expect(switchExecutor.validate(validNode)).toHaveLength(0);
    });

    it('should validate expression mode', () => {
      const nodeWithoutExpression = createNode('SWITCH', { mode: 'expression' });
      const validNode = createNode('SWITCH', {
        mode: 'expression',
        expression: '{{$json.output}}',
      });

      expect(switchExecutor.validate(nodeWithoutExpression)).toContain('Expression is required in expression mode');
      expect(switchExecutor.validate(validNode)).toHaveLength(0);
    });
  });

  describe('FilterExecutor', () => {
    it('should be defined', () => {
      expect(filterExecutor).toBeDefined();
      expect(filterExecutor.supportedTypes).toContain('FILTER');
    });

    it('should return kept items for standard execution', async () => {
      const node = createNode('FILTER', {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.age}}',
              operator: { type: 'number', operation: 'gte' },
              rightValue: '18',
            },
          ],
        },
      });
      const inputData = createInputItems([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 16 },
        { name: 'Charlie', age: 30 },
      ]);
      const context = createContext({});

      const result = await filterExecutor.execute(node, inputData, context);

      expect(result).toHaveLength(2);
      expect(result[0].json.name).toBe('Alice');
      expect(result[1].json.name).toBe('Charlie');
    });

    it('should return both kept and discarded with executeWithDiscard', async () => {
      const node = createNode('FILTER', {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.active}}',
              operator: { type: 'boolean', operation: 'true' },
              rightValue: '',
            },
          ],
        },
      });
      const inputData = createInputItems([
        { id: 1, active: true },
        { id: 2, active: false },
        { id: 3, active: true },
      ]);
      const context = createContext({});

      const result = await filterExecutor.executeWithDiscard(node, inputData, context);

      expect(result.kept).toHaveLength(2);
      expect(result.discarded).toHaveLength(1);
      expect(result.keptCount).toBe(2);
      expect(result.discardedCount).toBe(1);
    });

    it('should pass through all items if no conditions configured', async () => {
      const node = createNode('FILTER', {});
      const inputData = createInputItems([{ a: 1 }, { b: 2 }]);
      const context = createContext({});

      const result = await filterExecutor.execute(node, inputData, context);

      expect(result).toEqual(inputData);
    });

    it('should validate conditions', () => {
      const nodeWithoutConditions = createNode('FILTER', {});
      const validNode = createNode('FILTER', {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '{{$json.field}}',
              operator: { type: 'string', operation: 'equals' },
              rightValue: 'test',
            },
          ],
        },
      });

      expect(filterExecutor.validate(nodeWithoutConditions)).toContain('Conditions are not configured');
      expect(filterExecutor.validate(validNode)).toHaveLength(0);
    });
  });
});
