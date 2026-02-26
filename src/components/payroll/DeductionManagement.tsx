import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeductionTypes, useCreateDeductionType } from '@/hooks/usePayroll';
import { Plus, Settings, Percent, DollarSign } from 'lucide-react';
import { CreateDeductionTypeDialog } from './CreateDeductionTypeDialog';
import { DataTableShell } from '@/components/system';

interface DeductionManagementProps {
  showCreateButton?: boolean;
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
}

export function DeductionManagement({
  showCreateButton = true,
  createDialogOpen,
  onCreateDialogOpenChange,
}: DeductionManagementProps = {}) {
  const { data: deductions, isLoading } = useDeductionTypes();
  const [internalShowCreateDialog, setInternalShowCreateDialog] = useState(false);
  const isCreateDialogOpen = createDialogOpen ?? internalShowCreateDialog;
  const setCreateDialogOpen = onCreateDialogOpenChange ?? setInternalShowCreateDialog;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DataTableShell
        title="Deduction Types"
        description="Configure statutory and company deductions"
        hasData={(deductions?.length || 0) > 0}
        headerActions={
          showCreateButton ? (
            <Button className="h-9 w-full rounded-full sm:w-auto" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deduction Type
            </Button>
          ) : null
        }
        emptyState={
          <div className="text-center py-12 text-muted-foreground">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No deduction types configured</p>
          </div>
        }
        content={
          deductions?.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deductions.map((deduction) => (
                <Card key={deduction.id} className="relative overflow-hidden border-border/60 shadow-sm">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {deduction.deduction_type === 'percentage' ? (
                          <Percent className="w-4 h-4 text-primary" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-primary" />
                        )}
                        <h4 className="font-medium">{deduction.name}</h4>
                      </div>
                      {deduction.is_mandatory && (
                        <Badge variant="secondary" className="text-xs">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                    {deduction.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {deduction.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Default:</span>
                      <span className="font-medium">
                        {deduction.deduction_type === 'percentage'
                          ? `${deduction.default_value}%`
                          : `RM ${deduction.default_value}`}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="capitalize">
                        {deduction.deduction_type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : undefined
        }
      />

      <CreateDeductionTypeDialog
        open={isCreateDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
