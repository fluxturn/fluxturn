# Troubleshooting: Workflow Not Showing on Canvas

## Issue
Backend generates workflow successfully (93% confidence), but it doesn't appear on the canvas in the frontend.

---

## ✅ What's Working

From your logs, the backend is working perfectly:
```
[OrchestratedGeneratorService] 🎉 Workflow generation complete! Overall confidence: 93%
[OrchestratedGeneratorService] ✅ Generated trigger: Email Received
[OrchestratedGeneratorService] ✅ Generated action: Moderate Job-Related Text
[OrchestratedGeneratorService] ✅ Generated action: Send Telegram Message
[OrchestratedGeneratorService] ✅ Generated action: Log Message
[OrchestratedGeneratorService] 🔗 Created 3 connections
[AIWorkflowGeneratorService] ✅ Multi-agent workflow generation complete! Confidence: 93%
```

**4 nodes + 3 connections generated successfully!**

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console

Open your browser's Developer Tools (F12) and look for these messages:

**Expected console output:**
```
🚀 Multi-Agent workflow generated: {nodes: 4, edges: 3, confidence: 93}
📝 Saving workflow to conversation: {conversationId: "...", workflowName: "...", nodeCount: 4, edgeCount: 3}
✅ Workflow saved to conversation successfully
```

**If you see errors:**
- ❌ API errors → Check network tab
- ❌ Transform errors → Check the workflow structure
- ❌ Save errors → Check the `updateConversationWorkflow` API call

### Step 2: Check Network Tab

1. Open Developer Tools → Network tab
2. Filter by "XHR" or "Fetch"
3. Look for the request to `/api/workflow/ai/generate-with-agents`

**Check the response:**
```json
{
  "success": true,
  "confidence": 93,
  "workflow": {
    "name": "...",
    "nodes": [...],  // Should have 4 nodes
    "connections": [...]  // Should have 3 connections
  },
  "analysis": {...}
}
```

**If the response is missing `workflow.nodes`:**
- The backend generated the workflow but didn't return it properly
- Check the backend transformation code

### Step 3: Check Workflow Structure

In the console, after you see the success message, run:
```javascript
// Get the conversation workflow
api.get(`/conversation/${conversationId}`).then(conv => {
  console.log('Conversation workflow:', conv.workflow);
});
```

**Expected output:**
```javascript
{
  name: "...",
  canvas: {
    nodes: [
      { id: "...", name: "Email Received", type: "CONNECTOR_TRIGGER", ... },
      { id: "...", name: "Moderate Job-Related Text", type: "CONNECTOR_ACTION", ... },
      { id: "...", name: "Send Telegram Message", type: "CONNECTOR_ACTION", ... },
      { id: "...", name: "Log Message", type: "CONNECTOR_ACTION", ... }
    ],
    edges: [
      { source: "...", target: "...", ... },
      { source: "...", target: "...", ... },
      { source: "...", target: "...", ... }
    ]
  }
}
```

---

## 🔧 Common Issues & Fixes

### Issue 1: Canvas Component Not Reloading

**Problem:** The workflow is saved to the conversation, but the canvas doesn't refresh.

**Solution 1: Refresh the page**
- After the workflow is generated, refresh the browser page
- The canvas should load the workflow from the conversation

**Solution 2: Add auto-refresh to parent component**

The parent component (probably `WorkflowBuilder` or similar) needs to listen for workflow updates. Add this to the parent component:

```typescript
// In your WorkflowBuilder or Canvas parent component
useEffect(() => {
  if (conversationId) {
    // Poll for workflow updates every 2 seconds
    const interval = setInterval(async () => {
      const conv = await api.getConversation(conversationId);
      if (conv.workflow && conv.workflow !== currentWorkflow) {
        setWorkflow(conv.workflow);
        loadWorkflowOnCanvas(conv.workflow);
      }
    }, 2000);

    return () => clearInterval(interval);
  }
}, [conversationId]);
```

### Issue 2: Workflow Structure Mismatch

**Problem:** The multi-agent system returns a different structure than the OLD system expects.

**Current transformation (in AIPromptPanel.tsx):**
```typescript
const transformedNodes = multiAgentResult.workflow?.nodes?.map((node: any) => ({
  ...node,
  position: node.position || { x: 0, y: 0 },
})) || [];

const transformedEdges = multiAgentResult.workflow?.connections?.map((conn: any) => ({
  id: `${conn.source}-${conn.target}`,
  source: conn.source,
  target: conn.target,
  sourceHandle: conn.sourcePort || 'main',
  targetHandle: conn.targetPort || 'main',
})) || [];
```

**Check if your canvas expects:**
- Different node structure?
- Different edge structure?
- Different field names?

### Issue 3: Missing Node Positions

**Problem:** Nodes are generated but don't have X/Y positions, so they appear at 0,0 (top-left corner).

**Fix:** The backend's `OrchestratedGeneratorService` should set positions:

```typescript
// In orchestrated-generator.service.ts, positionNodes method
private positionNodes(nodes: any[]): any[] {
  const spacing = 300;
  const baseY = 100;

  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: 100 + index * spacing,  // ✅ This should set proper X
      y: baseY,                   // ✅ This should set proper Y
    },
  }));
}
```

**Verify in console:**
```javascript
// After workflow generation
console.log('Node positions:', workflowResult.workflow.canvas.nodes.map(n => n.position));
// Should output: [{x: 100, y: 100}, {x: 400, y: 100}, {x: 700, y: 100}, {x: 1000, y: 100}]
```

### Issue 4: Canvas Not Using Conversation Workflow

**Problem:** The canvas component loads the workflow from the database/API, not from the conversation.

**Check:** How does your canvas component load the workflow?

**Option A: From workflow ID (wrong for AI-generated workflows)**
```typescript
// This won't work for AI-generated workflows without saving
useEffect(() => {
  if (workflowId) {
    api.getWorkflow(workflowId).then(setWorkflow);
  }
}, [workflowId]);
```

**Option B: From conversation (correct for AI-generated workflows)**
```typescript
// This will work!
useEffect(() => {
  if (conversationId) {
    api.getConversation(conversationId).then(conv => {
      if (conv.workflow) {
        setWorkflow(conv.workflow);
        loadOnCanvas(conv.workflow);
      }
    });
  }
}, [conversationId]);
```

---

## 🧪 Quick Test

### Test 1: Check if workflow is being returned

Add this temporarily to `AIPromptPanel.tsx` after line 221:

```typescript
const multiAgentResult = await api.generateWorkflowWithAgents({ prompt });

// 🧪 TEST: Log the full response
console.log('📦 FULL MULTI-AGENT RESPONSE:', JSON.stringify(multiAgentResult, null, 2));

updateProgress('validate', 'completed');
```

**Expected output:**
```json
{
  "success": true,
  "confidence": 93,
  "workflow": {
    "name": "Data Processing Workflow",
    "nodes": [
      {
        "id": "trigger_gmail",
        "name": "Email Received",
        "type": "CONNECTOR_TRIGGER",
        "connector": "gmail",
        "triggerId": "email_received",
        "position": {"x": 100, "y": 100}
      },
      // ... 3 more nodes
    ],
    "connections": [
      {"source": "trigger_gmail", "target": "action_openai", "sourcePort": "main", "targetPort": "main"},
      // ... 2 more connections
    ]
  }
}
```

### Test 2: Check if transformation is working

Add this after line 240:

```typescript
const transformedEdges = multiAgentResult.workflow?.connections?.map(...) || [];

// 🧪 TEST: Log transformed data
console.log('🔄 TRANSFORMED DATA:', {
  originalNodes: multiAgentResult.workflow?.nodes?.length,
  transformedNodes: transformedNodes.length,
  originalConnections: multiAgentResult.workflow?.connections?.length,
  transformedEdges: transformedEdges.length,
  sampleNode: transformedNodes[0],
  sampleEdge: transformedEdges[0],
});
```

### Test 3: Check if save is working

The code already has this, so check console for:
```
📝 Saving workflow to conversation: {conversationId: "...", workflowName: "...", nodeCount: 4, edgeCount: 3}
✅ Workflow saved to conversation successfully
```

If you see this, the workflow IS saved. The issue is just that the canvas isn't loading it.

---

## 🎯 Most Likely Issue: Canvas Not Auto-Refreshing

Based on your description, I believe the workflow IS being generated and saved correctly, but your canvas component isn't reloading it.

**Immediate Fix:**
1. Generate the workflow with multi-agent
2. You'll see the success message in the chat
3. **Manually refresh the page (F5)**
4. The canvas should now show the workflow

**Permanent Fix:**
Add a listener in your canvas parent component to auto-refresh when the conversation workflow is updated. See "Solution 2" above.

---

## 📝 What Should Happen

### Correct Flow:
```
1. User enters prompt in AI panel
2. Frontend calls: POST /api/workflow/ai/generate-with-agents
3. Backend generates workflow (4 nodes, 3 connections, 93% confidence)
4. Frontend receives: {success: true, workflow: {...}, confidence: 93}
5. Frontend transforms: nodes + connections → canvas format
6. Frontend saves: api.updateConversationWorkflow(...)
7. Canvas component reloads: Workflow appears on canvas ✅
```

### Current Flow (probably):
```
1. User enters prompt in AI panel
2. Frontend calls: POST /api/workflow/ai/generate-with-agents
3. Backend generates workflow ✅
4. Frontend receives: {success: true, workflow: {...}, confidence: 93} ✅
5. Frontend transforms: nodes + connections → canvas format ✅
6. Frontend saves: api.updateConversationWorkflow(...) ✅
7. Canvas component reloads: ❌ NOT HAPPENING
```

---

## 🚀 Next Steps

1. **Open browser console** and generate a workflow with multi-agent
2. **Check for the console logs** I added (🚀, 📝, ✅)
3. **Check the Network tab** for the API response
4. **Try refreshing the page** after generation
5. **If refresh works:** Add auto-refresh listener to canvas component
6. **If refresh doesn't work:** Check the workflow structure and canvas loading logic

Let me know what you see in the console!
