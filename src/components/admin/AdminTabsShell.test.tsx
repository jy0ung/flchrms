import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TabsContent } from '@/components/ui/tabs';
import { AdminTabsShell } from '@/components/admin/AdminTabsShell';

describe('AdminTabsShell', () => {
  it('renders all admin tab triggers and nested content', () => {
    render(
      <AdminTabsShell defaultValue="roles">
        <TabsContent value="employees">Employees content</TabsContent>
        <TabsContent value="departments">Departments content</TabsContent>
        <TabsContent value="roles">Roles content</TabsContent>
        <TabsContent value="leave-policies">Leave content</TabsContent>
      </AdminTabsShell>,
    );

    expect(screen.getByRole('tab', { name: /Employee Profiles/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Departments/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Role Management/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Leave Policies/i })).toBeInTheDocument();

    expect(screen.getByText('Roles content')).toBeInTheDocument();
  });
});
