import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreatePayrollPeriod } from '@/hooks/usePayroll';
import { Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';

interface CreatePayrollPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePayrollPeriodDialog({ open, onOpenChange }: CreatePayrollPeriodDialogProps) {
  const createPeriod = useCreatePayrollPeriod();
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  
  const [name, setName] = useState(`Payroll - ${format(today, 'MMMM yyyy')}`);
  const [startDate, setStartDate] = useState(format(monthStart, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(monthEnd, 'yyyy-MM-dd'));
  const [paymentDate, setPaymentDate] = useState(format(addDays(monthEnd, 5), 'yyyy-MM-dd'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createPeriod.mutateAsync({
      name,
      start_date: startDate,
      end_date: endDate,
      payment_date: paymentDate || null,
      status: 'draft',
      created_by: null,
    });
    
    onOpenChange(false);
    // Reset form
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    setName(`Payroll - ${format(nextMonth, 'MMMM yyyy')}`);
    setStartDate(format(startOfMonth(nextMonth), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(nextMonth), 'yyyy-MM-dd'));
    setPaymentDate(format(addDays(endOfMonth(nextMonth), 5), 'yyyy-MM-dd'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create Payroll Period
          </DialogTitle>
          <DialogDescription>
            Set up a new payroll period for processing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Period Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Payroll - January 2024"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              min={endDate}
            />
            <p className="text-xs text-muted-foreground">
              The date employees will receive their salary
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPeriod.isPending}>
              {createPeriod.isPending ? 'Creating...' : 'Create Period'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
