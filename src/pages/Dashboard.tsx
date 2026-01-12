import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Briefcase, 
  ClipboardList, 
  Sparkles,
  ArrowRight,
  Calendar,
  Bell
} from 'lucide-react';
import { format, isToday, isPast, isFuture } from 'date-fns';
import { parseDate, parseDateTime } from '@/lib/dateUtils';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/stores/resumeStore';
import { ApplicationStats } from '@/components/dashboard/ApplicationStats';

export default function Dashboard() {
  const navigate = useNavigate();
  const { masterResume, jobDescriptions, applications } = useResumeStore();

  const stats = {
    totalApplications: applications.length,
    activeApplications: applications.filter(a => ['applied', 'interview'].includes(a.status)).length,
    jobDescriptions: jobDescriptions.length,
    resumeComplete: masterResume.experience.length > 0 && masterResume.header.name,
  };

  const recentApplications = applications
    .sort((a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime())
    .slice(0, 5);

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get upcoming interviews and reminders
  const upcomingItems = applications.flatMap((app) => {
    const items: { type: 'interview' | 'reminder'; date: Date; app: typeof app; details: string }[] = [];
    
    app.interviews?.forEach((interview) => {
      const interviewDate = parseDateTime(interview.date, interview.time);
      if (!interview.completed && (isToday(interviewDate) || isFuture(interviewDate))) {
        items.push({
          type: 'interview',
          date: interviewDate,
          app,
          details: `${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} interview at ${interview.time}`,
        });
      }
    });

    app.reminders?.forEach((reminder) => {
      const reminderDate = parseDate(reminder.date);
      if (!reminder.completed && (isToday(reminderDate) || isFuture(reminderDate) || isPast(reminderDate))) {
        items.push({
          type: 'reminder',
          date: reminderDate,
          app,
          details: reminder.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        });
      }
    });

    return items;
  }).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <PageHeader 
        title="Dashboard" 
        description="Your job application command center"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Applications"
          value={stats.totalApplications}
          icon={ClipboardList}
          description="All time"
        />
        <StatCard
          title="Active Applications"
          value={stats.activeApplications}
          icon={Sparkles}
          description="In progress"
        />
        <StatCard
          title="Job Descriptions"
          value={stats.jobDescriptions}
          icon={Briefcase}
          description="Saved"
        />
        <StatCard
          title="Resume Status"
          value={stats.resumeComplete ? 'Complete' : 'Incomplete'}
          icon={FileText}
          description={stats.resumeComplete ? 'Ready to generate' : 'Needs setup'}
        />
      </div>

      {/* Application Statistics */}
      {applications.length > 0 && (
        <div className="mb-8">
          <h2 className="font-medium text-foreground mb-4">Application Analytics</h2>
          <ApplicationStats applications={applications} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions + Status Overview */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border border-border rounded-lg bg-card p-4">
            <h2 className="font-medium text-card-foreground mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/resume')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Edit Master Resume
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/jobs')}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Add Job Description
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
              <Button 
                variant="default" 
                className="w-full justify-start"
                onClick={() => navigate('/generate')}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Application
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          </div>

          {/* Status Overview */}
          {applications.length > 0 && (
            <div className="border border-border rounded-lg bg-card p-4">
              <h2 className="font-medium text-card-foreground mb-4">Status Overview</h2>
              <div className="space-y-2">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <StatusBadge status={status as any}>{status}</StatusBadge>
                    <span className="text-sm text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Interviews & Reminders */}
          {upcomingItems.length > 0 && (
            <div className="border border-border rounded-lg bg-card p-4">
              <h2 className="font-medium text-card-foreground mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Upcoming
              </h2>
              <div className="space-y-3">
                {upcomingItems.map((item, index) => {
                  const isOverdue = isPast(item.date) && !isToday(item.date);
                  const isDueToday = isToday(item.date);
                  
                  return (
                    <div key={index} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={item.type === 'interview' ? 'default' : 'secondary'}
                          className={`text-xs ${isOverdue ? 'bg-destructive' : isDueToday ? 'bg-warning' : ''}`}
                        >
                          {item.type === 'interview' ? 'Interview' : 'Reminder'}
                        </Badge>
                        <span className="text-muted-foreground">
                          {isOverdue ? 'Overdue' : isDueToday ? 'Today' : format(item.date, 'MMM d')}
                        </span>
                      </div>
                      <p className="font-medium mt-1">{item.app.company} - {item.app.role}</p>
                      <p className="text-xs text-muted-foreground">{item.details}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div className="lg:col-span-2">
          <div className="border border-border rounded-lg bg-card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-medium text-card-foreground">Recent Applications</h2>
              {applications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/tracker')}
                >
                  View all
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
            
            {recentApplications.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No applications yet"
                description="Start by adding your master resume and a job description, then generate your first application."
                action={{
                  label: 'Get Started',
                  onClick: () => navigate('/resume'),
                }}
              />
            ) : (
              <div className="divide-y divide-border">
                {recentApplications.map((app) => (
                  <div key={app.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-card-foreground">{app.role}</h3>
                        <p className="text-sm text-muted-foreground">{app.company}</p>
                      </div>
                      <StatusBadge status={app.status as any}>{app.status}</StatusBadge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {parseDate(app.applicationDate).toLocaleDateString()}
                      </span>
                      {app.location && <span>{app.location}</span>}
                      {app.interviews && app.interviews.length > 0 && (
                        <span className="text-primary">
                          {app.interviews.filter(i => !i.completed).length} upcoming interview(s)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
