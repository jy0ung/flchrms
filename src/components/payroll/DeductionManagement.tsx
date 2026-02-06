import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeductionTypes, useCreateDeductionType } from '@/hooks/usePayroll';
import { Plus, Settings, Percent, DollarSign } from 'lucide-react';
import { CreateDeductionTypeDialog } from './CreateDeductionTypeDialog';

export function DeductionManagement() {
  const { data: deductions, isLoading } = useDeductionTypes();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Deduction Type
        </Button>
      </div>

      {/* Deduction Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Deduction Types
          </CardTitle>
          <CardDescription>Configure statutory and company deductions</CardDescription>
        </CardHeader>
        <CardContent>
          {!deductions?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No deduction types configured</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deductions.map(deduction => (
                <Card key={deduction.id} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
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
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="capitalize">
                        {deduction.deduction_type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateDeductionTypeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
