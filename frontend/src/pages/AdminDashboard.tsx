import React, { useState, useEffect } from 'react';
import { Users, Shield, Lock, Clock, RefreshCw, FileText } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uList, aLogs] = await Promise.all([
        api.admin.users(),
        api.admin.auditLogs(),
      ]);
      setUsers(uList);
      setAuditLogs(aLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await api.admin.changeRole(userId, newRole);
      alert('User role updated successfully.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      
      {/* Header */}
      <div className="border-b border-ivory-300 dark:border-forest-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-forest-100 text-forest-800 dark:bg-forest-900 dark:text-sage-300 border border-forest-200 dark:border-forest-700">
            System Administration & Immutable Audit Trail
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-forest-950 dark:text-ivory-50 mt-1">
            {t('navAdmin', 'Access Control (RBAC) & Audit Integrity')}
          </h1>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-ivory-100 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-800 border border-ivory-300 dark:border-forest-700 rounded-lg text-xs font-semibold text-forest-900 dark:text-sage-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </button>
      </div>

      {/* User Management Table */}
      <div className="bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded-xl overflow-hidden shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-forest-700 dark:text-sage-300" />
          <h2 className="font-bold text-sm text-forest-950 dark:text-ivory-50 uppercase tracking-wider">
            User Accounts & Role Permissions ({users.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-100 dark:bg-forest-950 border-b border-ivory-200 dark:border-forest-800 text-forest-700 dark:text-sage-300 font-mono uppercase text-[11px]">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Organization</th>
                <th className="p-3">Active Role</th>
                <th className="p-3 text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200 dark:divide-forest-800 text-forest-900 dark:text-sage-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-ivory-50 dark:hover:bg-forest-800/40 transition-colors">
                  <td className="p-3 font-bold text-forest-950 dark:text-ivory-50">
                    {u.full_name}
                  </td>
                  <td className="p-3 font-mono">
                    {u.email}
                  </td>
                  <td className="p-3 text-forest-600 dark:text-sage-400">
                    {u.organization || 'General Public'}
                  </td>
                  <td className="p-3">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-ivory-200 dark:bg-forest-950 border border-ivory-300 dark:border-forest-700 text-forest-800 dark:text-sage-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      className="bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-700 rounded-md px-2.5 py-1 text-forest-900 dark:text-sage-200 text-xs focus:outline-none focus:ring-1 focus:ring-forest-600 font-medium"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="DISPATCHER">DISPATCHER</option>
                      <option value="ANALYST">ANALYST</option>
                      <option value="RESPONDER">RESPONDER</option>
                      <option value="CITIZEN">CITIZEN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Logs Table */}
      <div className="bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded-xl overflow-hidden shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-forest-700 dark:text-sage-300" />
            <h2 className="font-bold text-sm text-forest-950 dark:text-ivory-50 uppercase tracking-wider">
              Immutable System Audit Logs ({auditLogs.length} Events)
            </h2>
          </div>
          <span className="text-[10px] text-forest-600 dark:text-sage-400 font-mono">
            Cryptographically timestamped & immutable
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-100 dark:bg-forest-950 border-b border-ivory-200 dark:border-forest-800 text-forest-700 dark:text-sage-300 font-mono uppercase sticky top-0 text-[11px]">
              <tr>
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">Action</th>
                <th className="p-3">Actor Email</th>
                <th className="p-3">Actor Role</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200 dark:divide-forest-800 text-forest-900 dark:text-sage-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-ivory-50 dark:hover:bg-forest-800/40 transition-colors">
                  <td className="p-3 font-mono text-[11px] text-forest-600 dark:text-sage-400 whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp).toISOString() : '-'}
                  </td>
                  <td className="p-3 font-mono font-bold text-forest-900 dark:text-sage-200">
                    {log.action}
                  </td>
                  <td className="p-3 font-mono">
                    {log.user_email}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-forest-600 dark:text-sage-400">
                    {log.user_role}
                  </td>
                  <td className="p-3 font-mono text-forest-600 dark:text-sage-400">
                    {log.entity_type}
                  </td>
                  <td className="p-3 font-mono text-[10px] text-forest-600 dark:text-sage-400 max-w-xs truncate">
                    {log.new_state ? JSON.stringify(log.new_state) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
