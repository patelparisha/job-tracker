import { useState } from 'react';
import { format } from 'date-fns';
import { parseDate, parseDateTime } from '@/lib/dateUtils';
import { Plus, Calendar, Clock, Video, Phone, Building, Code, Users, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { InterviewSchedule } from '@/types/resume';

interface InterviewSchedulerProps {
  interviews: InterviewSchedule[];
  onAdd: (interview: InterviewSchedule) => void;
  onUpdate: (id: string, interview: Partial<InterviewSchedule>) => void;
  onDelete: (id: string) => void;
}

const INTERVIEW_TYPES: { value: InterviewSchedule['type']; label: string; icon: typeof Phone }[] = [
  { value: 'phone', label: 'Phone Screen', icon: Phone },
  { value: 'video', label: 'Video Call', icon: Video },
  { value: 'onsite', label: 'On-site', icon: Building },
  { value: 'technical', label: 'Technical', icon: Code },
  { value: 'behavioral', label: 'Behavioral', icon: Users },
];

export function InterviewScheduler({ interviews, onAdd, onUpdate, onDelete }: InterviewSchedulerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newInterview, setNewInterview] = useState<Partial<InterviewSchedule>>({
    date: '',
    time: '',
    type: 'phone',
    notes: '',
  });

  const handleAdd = () => {
    if (!newInterview.date || !newInterview.time) return;

    onAdd({
      id: crypto.randomUUID(),
      date: newInterview.date!,
      time: newInterview.time!,
      type: newInterview.type as InterviewSchedule['type'],
      notes: newInterview.notes,
      completed: false,
    });

    setNewInterview({ date: '', time: '', type: 'phone', notes: '' });
    setIsAdding(false);
  };

  const sortedInterviews = [...interviews].sort((a, b) => {
    const dateA = parseDateTime(a.date, a.time);
    const dateB = parseDateTime(b.date, b.time);
    return dateA.getTime() - dateB.getTime();
  });

  const getTypeIcon = (type: InterviewSchedule['type']) => {
    const typeInfo = INTERVIEW_TYPES.find((t) => t.value === type);
    return typeInfo?.icon || Phone;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Interview Schedule
        </Label>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Interview
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="p-3 border border-border rounded-lg space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={newInterview.date}
                onChange={(e) => setNewInterview({ ...newInterview, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <Input
                type="time"
                value={newInterview.time}
                onChange={(e) => setNewInterview({ ...newInterview, time: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Interview Type</Label>
            <Select
              value={newInterview.type}
              onValueChange={(value) => setNewInterview({ ...newInterview, type: value as InterviewSchedule['type'] })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <type.icon className="w-3 h-3" />
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={newInterview.notes}
              onChange={(e) => setNewInterview({ ...newInterview, notes: e.target.value })}
              placeholder="Add any interview details, contact info, or preparation notes..."
              className="mt-1"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {sortedInterviews.length > 0 ? (
        <div className="space-y-2">
          {sortedInterviews.map((interview) => {
            const Icon = getTypeIcon(interview.type);
            const isPast = parseDateTime(interview.date, interview.time) < new Date();

            return (
              <div
                key={interview.id}
                className={`p-3 border border-border rounded-lg flex items-start gap-3 ${
                  interview.completed ? 'bg-muted/30 opacity-70' : isPast ? 'bg-warning/10' : ''
                }`}
              >
                <Checkbox
                  checked={interview.completed}
                  onCheckedChange={(checked) => onUpdate(interview.id, { completed: !!checked })}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm capitalize">
                      {INTERVIEW_TYPES.find((t) => t.value === interview.type)?.label || interview.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(parseDate(interview.date), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {interview.time}
                    </span>
                  </div>
                  {interview.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{interview.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => onDelete(interview.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : !isAdding ? (
        <p className="text-xs text-muted-foreground text-center py-3">No interviews scheduled</p>
      ) : null}
    </div>
  );
}
