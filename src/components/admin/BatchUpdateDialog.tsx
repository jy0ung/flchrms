import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  X
} from 'lucide-react';
import { Profile, Department } from '@/types/hrms';
import { useBatchUpdateProfiles } from '@/hooks/useEmployees';

interface BatchUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: (Profile & { department: Department | null })[] | undefined;
  departments: Department[] | undefined;
}

interface ParsedEmployee {
  employee_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  job_title: string;
  department_name: string;
  status: string;
}

interface UpdateResult {
  success: number;
  failed: number;
  errors: string[];
}

export function BatchUpdateDialog({
  open,
  onOpenChange,
  employees,
  departments,
}: BatchUpdateDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const batchUpdate = useBatchUpdateProfiles();

  const generateTemplate = () => {
    const headers = [
      'employee_id',
      'first_name',
      'last_name',
      'phone',
      'job_title',
      'department_name',
      'status'
    ];
    
    // Add sample data with current employees
    const rows = employees?.slice(0, 5).map(emp => [
      emp.employee_id || '',
      emp.first_name,
      emp.last_name,
      emp.phone || '',
      emp.job_title || '',
      emp.department?.name || '',
      emp.status || 'active'
    ]) || [];

    // Add instruction row
    const instructions = [
      '# Instructions: employee_id is required to match records. Valid status: active, inactive, on_leave, terminated.',
      `# Valid departments: ${departments?.map(d => d.name).join(', ') || 'None configured'}`,
      ''
    ];

    const csvContent = [
      ...instructions,
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'employee_update_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const parseCSV = (text: string): ParsedEmployee[] => {
    const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const data: ParsedEmployee[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
      if (values.length === 0) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      if (row.employee_id) {
        data.push({
          employee_id: row.employee_id,
          first_name: row.first_name || '',
          last_name: row.last_name || '',
          phone: row.phone || '',
          job_title: row.job_title || '',
          department_name: row.department_name || '',
          status: row.status || '',
        });
      }
    }

    return data;
  };

  const validateData = (data: ParsedEmployee[]): string[] => {
    const errors: string[] = [];
    const validStatuses = ['active', 'inactive', 'on_leave', 'terminated'];
    const deptNames = departments?.map(d => d.name.toLowerCase()) || [];

    data.forEach((row, idx) => {
      const lineNum = idx + 2; // Account for header and 0-index
      
      // Check if employee exists
      const existingEmployee = employees?.find(e => e.employee_id === row.employee_id);
      if (!existingEmployee) {
        errors.push(`Row ${lineNum}: Employee ID "${row.employee_id}" not found in system`);
      }

      // Validate status
      if (row.status && !validStatuses.includes(row.status.toLowerCase())) {
        errors.push(`Row ${lineNum}: Invalid status "${row.status}". Valid: ${validStatuses.join(', ')}`);
      }

      // Validate department
      if (row.department_name && !deptNames.includes(row.department_name.toLowerCase())) {
        errors.push(`Row ${lineNum}: Department "${row.department_name}" not found`);
      }
    });

    return errors;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setValidationErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      setParsedData(data);
      
      const errors = validateData(data);
      setValidationErrors(errors);
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (parsedData.length === 0 || validationErrors.length > 0) return;

    setIsProcessing(true);
    setProgress(0);
    
    const updateResult: UpdateResult = { success: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      const employee = employees?.find(e => e.employee_id === row.employee_id);
      
      if (!employee) {
        updateResult.failed++;
        updateResult.errors.push(`Employee ${row.employee_id} not found`);
        continue;
      }

      // Build update object with only changed fields
      const updates: Partial<Profile> = {};
      
      if (row.first_name && row.first_name !== employee.first_name) {
        updates.first_name = row.first_name;
      }
      if (row.last_name && row.last_name !== employee.last_name) {
        updates.last_name = row.last_name;
      }
      if (row.phone !== undefined && row.phone !== employee.phone) {
        updates.phone = row.phone || null;
      }
      if (row.job_title !== undefined && row.job_title !== employee.job_title) {
        updates.job_title = row.job_title || null;
      }
      if (row.status && row.status !== employee.status) {
        updates.status = row.status as Profile['status'];
      }
      
      // Handle department lookup
      if (row.department_name) {
        const dept = departments?.find(d => d.name.toLowerCase() === row.department_name.toLowerCase());
        if (dept && dept.id !== employee.department_id) {
          updates.department_id = dept.id;
        }
      } else if (row.department_name === '' && employee.department_id) {
        updates.department_id = null;
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        try {
          await batchUpdate.mutateAsync({ id: employee.id, updates });
          updateResult.success++;
        } catch (error) {
          updateResult.failed++;
          updateResult.errors.push(`${row.employee_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        updateResult.success++; // No changes needed
      }

      setProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    setResult(updateResult);
    setIsProcessing(false);
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Batch Update Employees
          </DialogTitle>
          <DialogDescription>
            Download the template, update employee information, and upload to apply changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Download Template */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div>
              <p className="font-medium">Step 1: Download Template</p>
              <p className="text-sm text-muted-foreground">
                Get the CSV template with current employee data
              </p>
            </div>
            <Button variant="outline" onClick={generateTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          {/* Step 2: Upload File */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium">Step 2: Upload Updated File</p>
                <p className="text-sm text-muted-foreground">
                  Upload the modified CSV file
                </p>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {file ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <FileSpreadsheet className="w-5 h-5 text-accent" />
                <span className="flex-1 text-sm truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">{parsedData.length} records</span>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose CSV File
              </Button>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Validation errors found:</p>
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {validationErrors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                  {validationErrors.length > 5 && (
                    <li className="text-muted-foreground">...and {validationErrors.length - 5} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing updates...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Result */}
          {result && (
            <Alert className={result.failed > 0 ? 'border-amber-500' : 'border-green-500'}>
              <CheckCircle2 className={`w-4 h-4 ${result.failed > 0 ? 'text-amber-500' : 'text-green-500'}`} />
              <AlertDescription>
                <p className="font-medium">
                  Update complete: {result.success} succeeded, {result.failed} failed
                </p>
                {result.errors.length > 0 && (
                  <ul className="text-xs mt-2 space-y-1">
                    {result.errors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button 
              onClick={handleUpload}
              disabled={parsedData.length === 0 || validationErrors.length > 0 || isProcessing}
            >
              {isProcessing ? 'Processing...' : `Update ${parsedData.length} Records`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
