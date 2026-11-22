/**
 * Account Dock's demo: sample workspaces and accounts, with the choices kept in state so the
 * dock answers taps. Marks are initials on colours, so the demo ships no photos of people.
 */
import {
  type AccountDockAccount,
  AccountDock as AccountDockDesign,
  type AccountDockWorkspace,
  type AccountStatus,
} from '@registry/account-dock/account-dock';
import { useState } from 'react';

import { themed } from '@/panel-theme';

const AccountDock = themed('account-dock', AccountDockDesign);

const workspaces: AccountDockWorkspace[] = [
  { id: 'north', name: 'Northwind Studio', detail: '342 members', color: '#1f2937' },
  { id: 'field', name: 'Field Notes', detail: '1,212 members', color: '#0f766e' },
  { id: 'paper', name: 'Paper Kite', detail: '58 members', color: '#c2410c' },
];

const accounts: AccountDockAccount[] = [
  { id: 'sam', name: 'Sam Rivera', color: '#6d5bd0' },
  { id: 'sam-work', name: 'Sam at Northwind', initials: 'SR', color: '#2563eb' },
  { id: 'alex', name: 'Alex Moreau', color: '#db2777' },
];

export function AccountDockDemoBar() {
  const [workspaceId, setWorkspaceId] = useState('north');
  const [accountId, setAccountId] = useState('sam');
  const [status, setStatus] = useState<AccountStatus>('online');
  return (
    <AccountDock
      workspaces={workspaces}
      workspaceId={workspaceId}
      onWorkspaceChange={setWorkspaceId}
      accounts={accounts}
      accountId={accountId}
      onAccountChange={setAccountId}
      status={status}
      onStatusChange={setStatus}
      onAddWorkspace={() => {}}
    />
  );
}
