import { GmailToSheetsWorkflow } from '@/components/templates/GmailToSheetsWorkflow';

/**
 * Demo page for Gmail to Google Sheets Lead Tracker workflow
 *
 * This page demonstrates how to use the GmailToSheetsWorkflow component
 * which is a pre-built React component for the popular Gmail to Sheets automation.
 *
 * Usage:
 * 1. Import the component: import { GmailToSheetsWorkflow } from '@/components/templates/GmailToSheetsWorkflow'
 * 2. Use it in your JSX: <GmailToSheetsWorkflow />
 * 3. The component is fully self-contained and includes all workflow logic
 *
 * Features:
 * - Visual workflow representation using React Flow
 * - Interactive node configuration
 * - Simulated workflow execution
 * - Real-time status updates
 * - Error handling and validation
 */
export function GmailToSheetsDemo() {
  return <GmailToSheetsWorkflow />;
}

export default GmailToSheetsDemo;
