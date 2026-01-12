import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { parseDate } from '@/lib/dateUtils';
import { Plus, Bell, Check, Trash2, Mail, MessageSquare, Clock } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import type { FollowUpReminder } from '@/types/resume';

interface FollowUpRemindersProps {
  reminders: FollowUpReminder[];
  onAdd: (reminder: FollowUpReminder) => void;
  onUpdate: (id: string, reminder: Partial<FollowUpReminder>) => void;
  onDelete: (id: string) => void;
}

const REMINDER_TYPES: { value: FollowUpReminder['type']; label: string; icon: typeof Mail }[] = [
  { value: 'thank-you', label: 'Thank You Email', icon: Mail },
  { value: 'follow-up', label: 'Follow Up', icon: MessageSquare },
  { value: 'check-status', label: 'Check Status', icon: Clock },
  { value: 'custom', label: 'Custom Reminder', icon: Bell },
];

export function FollowUpReminders({ reminders, onAdd, onUpdate, onDelete }: FollowUpRemindersProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newReminder, setNewReminder] = useState<Partial<FollowUpReminder>>({
    date: '',
    type: 'follow-up',
    message: '',
  });

  const handleAdd = () => {
    if (!newReminder.date) return;

    onAdd({
      id: crypto.randomUUID(),
      date: newReminder.date!,
      type: newReminder.type as FollowUpReminder['type'],
      message: newReminder.message,
      completed: false,
    });

    setNewReminder({ date: '', type: 'follow-up', message: '' });
    setIsAdding(false);
  };

  const sortedReminders = [...reminders].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  const getTypeIcon = (type: FollowUpReminder['type']) => {
    const typeInfo = REMINDER_TYPES.find((t) => t.value === type);
    return typeInfo?.icon || Bell;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Follow-up Reminders
        </Label>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Reminder
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
                value={newReminder.date}
                onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={newReminder.type}
                onValueChange={(value) => setNewReminder({ ...newReminder, type: value as FollowUpReminder['type'] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_TYPES.map((type) => (
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
          </div>
          <div>
            <Label className="text-xs">Message (optional)</Label>
            <Textarea
              value={newReminder.message}
              onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
              placeholder="Add a note about what to do..."
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

      {sortedReminders.length > 0 ? (
        <div className="space-y-2">
          {sortedReminders.map((reminder) => {
            const Icon = getTypeIcon(reminder.type);
            const reminderDate = parseDate(reminder.date);
            const isOverdue = isPast(reminderDate) && !isToday(reminderDate) && !reminder.completed;
            const isDueToday = isToday(reminderDate) && !reminder.completed;

            return (
              <div
                key={reminder.id}
                className={`p-3 border border-border rounded-lg flex items-start gap-3 ${
                  reminder.completed 
                    ? 'bg-muted/30 opacity-70' 
                    : isOverdue 
                    ? 'bg-destructive/10 border-destructive/30' 
                    : isDueToday 
                    ? 'bg-warning/10 border-warning/30'
                    : ''
                }`}
              >
                <Checkbox
                  checked={reminder.completed}
                  onCheckedChange={(checked) => onUpdate(reminder.id, { completed: !!checked })}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {REMINDER_TYPES.find((t) => t.value === reminder.type)?.label || reminder.type}
                    </span>
                    {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                    {isDueToday && <Badge className="text-xs bg-warning text-warning-foreground">Today</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(reminderDate, 'MMM d, yyyy')}
                  </p>
                  {reminder.message && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{reminder.message}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => onDelete(reminder.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : !isAdding ? (
        <p className="text-xs text-muted-foreground text-center py-3">No reminders set</p>
      ) : null}
    </div>
  );
}
