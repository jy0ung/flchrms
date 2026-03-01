import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeductionTypes } from '@/hooks/usePayroll';
import { Plus, Settings } from 'lucide-react';
import { CreateDeductionTypeDialog } from './CreateDeductionTypeDialog';
import { CardHeaderStandard, DataTableShell } from '@/components/system';

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
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
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
                <Card key={deduction.id} className="relative overflow-hidden border-border shadow-sm">
                  <CardHeaderStandard
                    title={deduction.name}
                    description={deduction.description || 'Deduction configuration.'}
                    className="p-4 pb-3"
                    titleClassName="text-base font-semibold"
                    descriptionClassName="text-sm line-clamp-2"
                    actions={(
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {deduction.deduction_type}
                        </Badge>
                        {deduction.is_mandatory ? (
                          <Badge variant="secondary" className="text-xs">
                            Mandatory
                          </Badge>
                        ) : null}
                      </div>
                    )}
                  />
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Default:</span>
                      <span className="font-medium">
                        {deduction.deduction_type === 'percentage'
                          ? `${deduction.default_value}%`
                          : `RM ${deduction.default_value}`}
                      </span>
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
