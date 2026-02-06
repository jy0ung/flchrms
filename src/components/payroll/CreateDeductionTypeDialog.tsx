import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateDeductionType } from '@/hooks/usePayroll';
import { Settings } from 'lucide-react';

interface CreateDeductionTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDeductionTypeDialog({ open, onOpenChange }: CreateDeductionTypeDialogProps) {
  const createDeduction = useCreateDeductionType();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deductionType, setDeductionType] = useState<'fixed' | 'percentage'>('fixed');
  const [defaultValue, setDefaultValue] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setDeductionType('fixed');
    setDefaultValue('');
    setIsMandatory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createDeduction.mutateAsync({
      name,
      description: description || null,
      deduction_type: deductionType,
      default_value: Number(defaultValue) || 0,
      is_mandatory: isMandatory,
      is_active: true,
    });

    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Add Deduction Type
          </DialogTitle>
          <DialogDescription>
            Configure a new deduction type for payroll
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Deduction Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., EPF, SOCSO, Insurance"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the deduction"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={deductionType} 
                onValueChange={(v) => setDeductionType(v as 'fixed' | 'percentage')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultValue">
                Default Value {deductionType === 'percentage' ? '(%)' : '(RM)'}
              </Label>
              <Input
                id="defaultValue"
                type="number"
                step="0.01"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label htmlFor="mandatory" className="text-sm font-medium">
                Mandatory Deduction
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically apply to all employees
              </p>
            </div>
            <Switch
              id="mandatory"
              checked={isMandatory}
              onCheckedChange={setIsMandatory}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDeduction.isPending}>
              {createDeduction.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
