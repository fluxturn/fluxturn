import React, { useState } from 'react';
import { Database, Play, Check, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowAPI } from '@/lib/fluxturn';
import type { ManualConnection } from './types';

interface ManualConnectionFormProps {
  onConnect: (connection: ManualConnection) => void;
  onBack: () => void;
}

export function ManualConnectionForm({ onConnect, onBack }: ManualConnectionFormProps) {
  const [formData, setFormData] = useState<ManualConnection>({
    host: 'localhost',
    port: 5432,
    database: '',
    user: '',
    password: '',
    database_type: 'postgresql',
    ssl_enabled: false
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTypeChange = (type: 'postgresql' | 'mysql') => {
    setFormData(prev => ({
      ...prev,
      database_type: type,
      port: type === 'postgresql' ? 5432 : 3306
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await WorkflowAPI.testDatabaseConnection({
        database_type: formData.database_type,
        config: {
          host: formData.host,
          port: formData.port,
          database: formData.database,
          ssl_enabled: formData.ssl_enabled
        },
        credentials: {
          user: formData.user,
          password: formData.password
        }
      });
      setTestResult({
        success: result.success,
        message: result.success ? `Connected! Latency: ${result.latency_ms}ms` : result.message || 'Connection failed'
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = () => {
    onConnect(formData);
  };

  const isFormValid = formData.host && formData.database && formData.user && formData.password;

  return (
    <div className="p-4 space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to node connection
      </button>

      {/* Database Type Selector */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-300">Database Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange('postgresql')}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg border transition-all flex items-center justify-center gap-2 text-sm",
              formData.database_type === 'postgresql'
                ? "bg-cyan-400/20 border-cyan-400/50 text-cyan-400"
                : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
            )}
          >
            <Database className="w-4 h-4" />
            PostgreSQL
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('mysql')}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg border transition-all flex items-center justify-center gap-2 text-sm",
              formData.database_type === 'mysql'
                ? "bg-cyan-400/20 border-cyan-400/50 text-cyan-400"
                : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
            )}
          >
            <Database className="w-4 h-4" />
            MySQL
          </button>
        </div>
      </div>

      {/* Connection Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-gray-400">Host</label>
          <input
            type="text"
            value={formData.host}
            onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
            placeholder="localhost"
            className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-gray-400">Port</label>
          <input
            type="number"
            value={formData.port}
            onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1.5 text-gray-400">Database Name</label>
          <input
            type="text"
            value={formData.database}
            onChange={(e) => setFormData(prev => ({ ...prev, database: e.target.value }))}
            placeholder="my_database"
            className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-gray-400">Username</label>
          <input
            type="text"
            value={formData.user}
            onChange={(e) => setFormData(prev => ({ ...prev, user: e.target.value }))}
            placeholder="postgres"
            className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-gray-400">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          />
        </div>
      </div>

      {/* SSL Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.ssl_enabled}
          onChange={(e) => setFormData(prev => ({ ...prev, ssl_enabled: e.target.checked }))}
          className="rounded border-white/10 bg-white/5 text-cyan-400 focus:ring-cyan-400/50"
        />
        <span className="text-sm text-gray-300">Enable SSL/TLS</span>
      </label>

      {/* Test Result */}
      {testResult && (
        <div className={cn(
          "p-3 rounded-lg border text-sm flex items-center gap-2",
          testResult.success
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {testResult.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleTestConnection}
          disabled={testing || !isFormValid}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={handleConnect}
          disabled={!testResult?.success}
          className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          Connect & Browse
        </button>
      </div>
    </div>
  );
}
