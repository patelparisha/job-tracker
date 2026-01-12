import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseDate } from '@/lib/dateUtils';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Trash2,
  Calendar,
  Building,
  MapPin,
  FileText,
  Mail,
  User,
  Link as LinkIcon,
  Bell
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/stores/resumeStore';
import { useDataSync } from '@/contexts/DataSyncContext';
import { InterviewScheduler } from '@/components/tracker/InterviewScheduler';
import { FollowUpReminders } from '@/components/tracker/FollowUpReminders';
import type { Application, InterviewSchedule, FollowUpReminder } from '@/types/resume';

const statuses = ['draft', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'] as const;

export default function ApplicationsTracker() {
  const navigate = useNavigate();
  const { applications, updateApplication, deleteApplication } = useResumeStore();
  const { syncApplication } = useDataSync();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedApplications = [...filteredApplications].sort(
    (a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime()
  );

  // Helper to update application both locally and in database
  const handleUpdateApplication = async (id: string, updates: Partial<Application>) => {
    updateApplication(id, updates);
    const app = applications.find(a => a.id === id);
    if (app) {
      const updatedApp = { ...app, ...updates };
      await syncApplication(updatedApp, 'update');
    }
  };

  const handleAddInterview = async (interview: InterviewSchedule) => {
    if (!selectedApplication) return;
    const interviews = [...(selectedApplication.interviews || []), interview];
    await handleUpdateApplication(selectedApplication.id, { interviews });
    setSelectedApplication({ ...selectedApplication, interviews });
  };

  const handleUpdateInterview = async (interviewId: string, update: Partial<InterviewSchedule>) => {
    if (!selectedApplication) return;
    const interviews = (selectedApplication.interviews || []).map(i =>
      i.id === interviewId ? { ...i, ...update } : i
    );
    await handleUpdateApplication(selectedApplication.id, { interviews });
    setSelectedApplication({ ...selectedApplication, interviews });
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!selectedApplication) return;
    const interviews = (selectedApplication.interviews || []).filter(i => i.id !== interviewId);
    await handleUpdateApplication(selectedApplication.id, { interviews });
    setSelectedApplication({ ...selectedApplication, interviews });
  };

  const handleAddReminder = async (reminder: FollowUpReminder) => {
    if (!selectedApplication) return;
    const reminders = [...(selectedApplication.reminders || []), reminder];
    await handleUpdateApplication(selectedApplication.id, { reminders });
    setSelectedApplication({ ...selectedApplication, reminders });
  };

  const handleUpdateReminder = async (reminderId: string, update: Partial<FollowUpReminder>) => {
    if (!selectedApplication) return;
    const reminders = (selectedApplication.reminders || []).map(r =>
      r.id === reminderId ? { ...r, ...update } : r
    );
    await handleUpdateApplication(selectedApplication.id, { reminders });
    setSelectedApplication({ ...selectedApplication, reminders });
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!selectedApplication) return;
    const reminders = (selectedApplication.reminders || []).filter(r => r.id !== reminderId);
    await handleUpdateApplication(selectedApplication.id, { reminders });
    setSelectedApplication({ ...selectedApplication, reminders });
  };

  const getUpcomingCount = (app: Application) => {
    const upcomingInterviews = (app.interviews || []).filter(i => !i.completed).length;
    const pendingReminders = (app.reminders || []).filter(r => !r.completed).length;
    return upcomingInterviews + pendingReminders;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader 
        title="Applications Tracker" 
        description="Track and manage all your job applications"
      >
        <Button onClick={() => navigate('/generate')}>
          <Plus className="w-4 h-4 mr-2" />
          New Application
        </Button>
      </PageHeader>

      {applications.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No applications tracked yet"
          description="Generate an application to automatically add it to your tracker."
          action={{
            label: 'Generate Application',
            onClick: () => navigate('/generate'),
          }}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search companies or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Upcoming</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedApplications.map((app) => {
                  const upcomingCount = getUpcomingCount(app);
                  return (
                    <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell 
                        className="font-medium"
                        onClick={() => setSelectedApplication(app)}
                      >
                        {app.company}
                      </TableCell>
                      <TableCell onClick={() => setSelectedApplication(app)}>
                        {app.role}
                      </TableCell>
                      <TableCell onClick={() => setSelectedApplication(app)}>
                        {app.location || '—'}
                      </TableCell>
                      <TableCell onClick={() => setSelectedApplication(app)}>
                        <StatusBadge status={app.status as any}>{app.status}</StatusBadge>
                      </TableCell>
                      <TableCell onClick={() => setSelectedApplication(app)}>
                        {upcomingCount > 0 ? (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Bell className="w-3 h-3" />
                            {upcomingCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={() => setSelectedApplication(app)}>
                        {parseDate(app.applicationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedApplication(app)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {statuses.map(status => (
                              <DropdownMenuItem 
                                key={status}
                                onClick={() => updateApplication(app.id, { status })}
                                className="capitalize"
                              >
                                Mark as {status}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => deleteApplication(app.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredApplications.length === 0 && applications.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No applications match your search criteria.
            </div>
          )}
        </>
      )}

      {/* Application Detail Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApplication && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedApplication.role}
                  <StatusBadge status={selectedApplication.status as any}>
                    {selectedApplication.status}
                  </StatusBadge>
                </DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  {selectedApplication.savedResume && <TabsTrigger value="resume">Resume</TabsTrigger>}
                  {selectedApplication.savedCoverLetter && <TabsTrigger value="cover">Cover Letter</TabsTrigger>}
                </TabsList>

                <TabsContent value="details" className="space-y-6 py-4">
                  {/* Company Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{selectedApplication.company}</span>
                    </div>
                    {selectedApplication.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedApplication.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Applied: {parseDate(selectedApplication.applicationDate).toLocaleDateString()}</span>
                    </div>
                    {selectedApplication.salary && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Salary:</span> {selectedApplication.salary}
                      </div>
                    )}
                  </div>

                  {/* Application Link */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Application Link
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="url"
                        placeholder="https://company.com/careers/job-id"
                        value={selectedApplication.applicationLink || ''}
                        onChange={(e) => {
                          const link = e.target.value;
                          setSelectedApplication({ ...selectedApplication, applicationLink: link });
                        }}
                        onBlur={(e) => {
                          handleUpdateApplication(selectedApplication.id, { applicationLink: e.target.value });
                        }}
                        className="flex-1"
                      />
                      {selectedApplication.applicationLink && (
                        <Button
                          variant="outline"
                          size="icon"
                          asChild
                        >
                          <a 
                            href={selectedApplication.applicationLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Connection Info */}
                  {selectedApplication.connectionInfo?.hasConnection && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <Label className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" />
                        Connection at Company
                      </Label>
                      <div className="space-y-1 text-sm">
                        {selectedApplication.connectionInfo.name && (
                          <p><span className="text-muted-foreground">Name:</span> {selectedApplication.connectionInfo.name}</p>
                        )}
                        {selectedApplication.connectionInfo.email && (
                          <p><span className="text-muted-foreground">Email:</span> {selectedApplication.connectionInfo.email}</p>
                        )}
                        {selectedApplication.connectionInfo.contactInfo && (
                          <p><span className="text-muted-foreground">Contact:</span> {selectedApplication.connectionInfo.contactInfo}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Update */}
                  <div>
                    <Label>Status</Label>
                    <Select 
                      value={selectedApplication.status}
                      onValueChange={(status) => {
                        handleUpdateApplication(selectedApplication.id, { status: status as any });
                        setSelectedApplication({ ...selectedApplication, status: status as any });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status} className="capitalize">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={selectedApplication.notes}
                      onChange={(e) => {
                        setSelectedApplication({ ...selectedApplication, notes: e.target.value });
                      }}
                      onBlur={(e) => {
                        handleUpdateApplication(selectedApplication.id, { notes: e.target.value });
                      }}
                      placeholder="Add notes about this application..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-6 py-4">
                  <InterviewScheduler
                    interviews={selectedApplication.interviews || []}
                    onAdd={handleAddInterview}
                    onUpdate={handleUpdateInterview}
                    onDelete={handleDeleteInterview}
                  />
                  
                  <div className="border-t border-border pt-4">
                    <FollowUpReminders
                      reminders={selectedApplication.reminders || []}
                      onAdd={handleAddReminder}
                      onUpdate={handleUpdateReminder}
                      onDelete={handleDeleteReminder}
                    />
                  </div>
                </TabsContent>

                {selectedApplication.savedResume && (
                  <TabsContent value="resume" className="py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <Label>Saved Resume</Label>
                    </div>
                    <Textarea
                      value={selectedApplication.savedResume}
                      readOnly
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </TabsContent>
                )}

                {selectedApplication.savedCoverLetter && (
                  <TabsContent value="cover" className="py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <Label>Saved Cover Letter</Label>
                    </div>
                    <Textarea
                      value={selectedApplication.savedCoverLetter}
                      readOnly
                      className="min-h-[300px]"
                    />
                  </TabsContent>
                )}
              </Tabs>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => deleteApplication(selectedApplication.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Application
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setSelectedApplication(null)}
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
