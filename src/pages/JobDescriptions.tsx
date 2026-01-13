import { useState, useRef } from 'react';
import { Plus, Briefcase, MapPin, DollarSign, Building, Trash2, Eye, Wand2, Upload, Loader2 } from 'lucide-react';
import { parseDate } from '@/lib/dateUtils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useResumeStore } from '@/stores/resumeStore';
import { useDataSync } from '@/contexts/DataSyncContext';
import type { JobDescription } from '@/types/resume';
import { supabase } from "@/integrations/supabase/client";


function generateId() {
  // Generate a proper UUID v4
  return crypto.randomUUID();
}

export default function JobDescriptions() {
  const { jobDescriptions, addJobDescription, deleteJobDescription } = useResumeStore();
  const { syncJobDescription } = useDataSync();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobDescription | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newJob, setNewJob] = useState<Partial<JobDescription>>({
    company: '',
    role: '',
    location: '',
    salary: '',
    jobType: 'full-time',
    industry: '',
    requiredSkills: [],
    keywords: [],
    rawText: '',
  });
  const [skillsInput, setSkillsInput] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');

  const handleParseWithAI = async () => {
  if (!newJob.rawText || newJob.rawText.trim().length < 50) {
    toast({
      title: "Not enough text",
      description: "Please paste a complete job description to parse.",
      variant: "destructive",
    });
    return;
  }

  setIsParsing(true);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("You must be logged in to parse a job description.");
    }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-job-description`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ jobText: newJob.rawText }),
      }
    );

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || "AI parsing failed");
    }

    const parsed = json.data;

    setNewJob((prev) => ({
      ...prev,
      company: parsed.company || prev.company,
      role: parsed.role || prev.role,
      location: parsed.location || prev.location,
      salary: parsed.salary || prev.salary,
      jobType: parsed.jobType || prev.jobType,
      industry: parsed.industry || prev.industry,
    }));

    setSkillsInput(parsed.requiredSkills?.join(", ") || "");
    setKeywordsInput(parsed.keywords?.join(", ") || "");

    toast({
      title: "Parsed successfully",
      description: "Job details have been extracted. Review and edit as needed.",
    });
  } catch (error) {
    console.error("Parse error:", error);
    toast({
      title: "Parsing failed",
      description:
        error instanceof Error ? error.message : "Failed to parse job description",
      variant: "destructive",
    });
  } finally {
    setIsParsing(false);
  }
};


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      toast({
        title: 'PDF detected',
        description: 'Please copy and paste the text from the PDF into the description field. Direct PDF parsing is coming soon.',
        variant: 'default',
      });
    } else if (file.type === 'text/plain') {
      const text = await file.text();
      setNewJob({ ...newJob, rawText: text });
      toast({
        title: 'File loaded',
        description: 'Text file contents have been added. Click "Parse with AI" to extract details.',
      });
    } else {
      toast({
        title: 'Unsupported file type',
        description: 'Please upload a .txt file or paste the job description directly.',
        variant: 'destructive',
      });
    }
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddJob = async () => {
    const tempJob: JobDescription = {
      id: '', // Will be set by database
      company: newJob.company || '',
      role: newJob.role || '',
      location: newJob.location || '',
      salary: newJob.salary,
      jobType: newJob.jobType || 'full-time',
      industry: newJob.industry || '',
      requiredSkills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
      keywords: keywordsInput.split(',').map(s => s.trim()).filter(Boolean),
      rawText: newJob.rawText || '',
      createdAt: new Date().toISOString(),
    };
    
    try {
      // Save to database first and get the generated UUID
      const dbId = await syncJobDescription(tempJob, 'add');
      if (dbId) {
        // Add to local store with the database-generated ID
        const job = { ...tempJob, id: dbId };
        addJobDescription(job);
        setIsAddDialogOpen(false);
        resetForm();
        toast({
          title: 'Job added',
          description: `${job.role} at ${job.company} has been saved.`,
        });
      }
    } catch (error) {
      // Error toast is shown by syncJobDescription
      console.error('Failed to add job:', error);
    }
  };

  const resetForm = () => {
    setNewJob({
      company: '',
      role: '',
      location: '',
      salary: '',
      jobType: 'full-time',
      industry: '',
      requiredSkills: [],
      keywords: [],
      rawText: '',
    });
    setSkillsInput('');
    setKeywordsInput('');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <PageHeader 
        title="Job Descriptions" 
        description="Save and manage job descriptions for application generation"
      >
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Job Description</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* AI Parse Section */}
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Paste Job Description</Label>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleParseWithAI}
                      disabled={isParsing || !newJob.rawText}
                    >
                      {isParsing ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3 mr-1" />
                      )}
                      {isParsing ? 'Parsing...' : 'Parse with AI'}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={newJob.rawText}
                  onChange={(e) => setNewJob({ ...newJob, rawText: e.target.value })}
                  placeholder="Paste the complete job description here, then click 'Parse with AI' to automatically extract details..."
                  rows={6}
                  className="bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Company *</Label>
                  <Input
                    value={newJob.company}
                    onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                    placeholder="Google"
                  />
                </div>
                <div>
                  <Label>Role *</Label>
                  <Input
                    value={newJob.role}
                    onChange={(e) => setNewJob({ ...newJob, role: e.target.value })}
                    placeholder="Senior Software Engineer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Location</Label>
                  <Input
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    placeholder="San Francisco, CA"
                  />
                </div>
                <div>
                  <Label>Salary (if listed)</Label>
                  <Input
                    value={newJob.salary}
                    onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                    placeholder="$150,000 - $200,000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Job Type</Label>
                  <Select 
                    value={newJob.jobType} 
                    onValueChange={(value: any) => setNewJob({ ...newJob, jobType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input
                    value={newJob.industry}
                    onChange={(e) => setNewJob({ ...newJob, industry: e.target.value })}
                    placeholder="Technology"
                  />
                </div>
              </div>
              <div>
                <Label>Required Skills</Label>
                <Input
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="React, TypeScript, Node.js (comma separated)"
                />
              </div>
              <div>
                <Label>Keywords</Label>
                <Input
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="agile, cross-functional, leadership (comma separated)"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddJob} disabled={!newJob.company || !newJob.role}>
                  Add Job
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {jobDescriptions.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job descriptions yet"
          description="Add your first job description to start generating tailored applications."
          action={{
            label: 'Add Job Description',
            onClick: () => setIsAddDialogOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobDescriptions.map((job) => (
            <div 
              key={job.id} 
              className="border border-border rounded-lg bg-card p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-card-foreground">{job.role}</h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedJob(job)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      deleteJobDescription(job.id);
                      await syncJobDescription(job, 'delete');
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {job.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {job.location}
                  </div>
                )}
                {job.salary && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-3 h-3" />
                    {job.salary}
                  </div>
                )}
                {job.industry && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="w-3 h-3" />
                    {job.industry}
                  </div>
                )}
              </div>

              {job.requiredSkills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {job.requiredSkills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {job.requiredSkills.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{job.requiredSkills.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-3">
                Added {parseDate(job.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* View Job Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedJob.role}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <p className="font-medium">{selectedJob.company}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium">{selectedJob.location || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Salary:</span>
                    <p className="font-medium">{selectedJob.salary || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium capitalize">{selectedJob.jobType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Industry:</span>
                    <p className="font-medium">{selectedJob.industry || 'Not specified'}</p>
                  </div>
                </div>

                {selectedJob.requiredSkills.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Required Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedJob.requiredSkills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedJob.keywords.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Keywords:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedJob.keywords.map((keyword) => (
                        <Badge key={keyword} variant="outline">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedJob.rawText && (
                  <div>
                    <span className="text-sm text-muted-foreground">Full Description:</span>
                    <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {selectedJob.rawText}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
