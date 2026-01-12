import { useState } from 'react';
import { Sparkles, FileText, Mail, MessageSquare, Download, Loader2, Link as LinkIcon, User, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useResumeStore } from '@/stores/resumeStore';
import { useDataSync } from '@/contexts/DataSyncContext';
import { generateApplication } from '@/lib/api';
import { exportToPDF, exportToDocx, exportToText } from '@/lib/export';
import { useNavigate } from 'react-router-dom';
import type { ConnectionInfo, Application } from '@/types/resume';

export default function GenerateApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { masterResume, jobDescriptions, addApplication } = useResumeStore();
  const { syncApplication } = useDataSync();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    resume: string;
    coverLetter: string;
    whyRole: string;
    whyCompany: string;
  } | null>(null);

  // Save to tracker dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [hasConnection, setHasConnection] = useState<'yes' | 'no'>('no');
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    hasConnection: false,
    name: '',
    contactInfo: '',
    email: '',
  });
  const [applicationLink, setApplicationLink] = useState('');

  // Generation settings
  const [settings, setSettings] = useState({
    resumeLength: 1,
    emphasis: 'balanced',
    atsLevel: 'high',
    includeCoverLetter: true,
    coverLetterTone: 'professional',
    generateWhyQuestions: true,
  });

  const selectedJob = jobDescriptions.find(j => j.id === selectedJobId);
  const isResumeComplete = masterResume.header.name && masterResume.experience.length > 0;

  const handleGenerate = async () => {
    if (!selectedJob || !isResumeComplete) return;

    setIsGenerating(true);
    
    try {
      const content = await generateApplication(masterResume, selectedJob, settings);
      setGeneratedContent(content);
      toast({
        title: 'Application generated',
        description: 'Your tailored resume and cover letter are ready for review.',
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate application',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'txt', type: 'resume' | 'coverLetter' | 'both') => {
    if (!selectedJob) return;

    try {
      // Use master resume for structured export
      const content = {
        resume: generatedContent?.resume || '',
        coverLetter: generatedContent?.coverLetter || '',
        companyName: selectedJob.company,
        roleName: selectedJob.role,
        masterResume: masterResume, // Pass master resume for structured PDF
      };

      if (format === 'pdf') {
        await exportToPDF(content, type);
      } else if (format === 'docx') {
        await exportToDocx(content, type);
      } else {
        exportToText(content, type);
      }

      toast({
        title: 'Export complete',
        description: `Your ${type === 'both' ? 'application' : type} has been downloaded.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export document.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenSaveDialog = () => {
    setShowSaveDialog(true);
  };

  const handleConfirmSave = async () => {
    if (!selectedJob || !generatedContent) return;

    const finalConnectionInfo: ConnectionInfo = {
      hasConnection: hasConnection === 'yes',
      name: hasConnection === 'yes' ? connectionInfo.name : undefined,
      contactInfo: hasConnection === 'yes' ? connectionInfo.contactInfo : undefined,
      email: hasConnection === 'yes' ? connectionInfo.email : undefined,
    };

    const newApplication: Application = {
      id: crypto.randomUUID(),
      jobDescriptionId: selectedJob.id,
      company: selectedJob.company,
      role: selectedJob.role,
      location: selectedJob.location,
      salary: selectedJob.salary,
      jobType: selectedJob.jobType,
      industry: selectedJob.industry,
      applicationDate: new Date().toISOString(),
      resumeVersion: 'Generated v1',
      status: 'draft',
      notes: '',
      connections: finalConnectionInfo.hasConnection && finalConnectionInfo.name 
        ? [finalConnectionInfo.name] 
        : [],
      connectionInfo: finalConnectionInfo,
      applicationLink: applicationLink || undefined,
      savedResume: generatedContent.resume,
      savedCoverLetter: settings.includeCoverLetter ? generatedContent.coverLetter : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addApplication(newApplication);
    await syncApplication(newApplication, 'add');

    // Reset dialog state
    setShowSaveDialog(false);
    setHasConnection('no');
    setConnectionInfo({ hasConnection: false, name: '', contactInfo: '', email: '' });
    setApplicationLink('');

    toast({
      title: 'Saved to tracker',
      description: 'Application has been added to your tracker with resume and cover letter copies.',
    });
    navigate('/tracker');
  };

  if (!isResumeComplete) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <PageHeader 
          title="Generate Application" 
          description="Create tailored resumes and cover letters with AI"
        />
        <EmptyState
          icon={FileText}
          title="Complete your resume first"
          description="Add your contact information and at least one experience entry to start generating applications."
          action={{
            label: 'Edit Master Resume',
            onClick: () => navigate('/resume'),
          }}
        />
      </div>
    );
  }

  if (jobDescriptions.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <PageHeader 
          title="Generate Application" 
          description="Create tailored resumes and cover letters with AI"
        />
        <EmptyState
          icon={Sparkles}
          title="Add a job description first"
          description="Save a job description to generate a tailored application."
          action={{
            label: 'Add Job Description',
            onClick: () => navigate('/jobs'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <PageHeader 
        title="Generate Application" 
        description="Create tailored resumes and cover letters with AI"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border border-border rounded-lg bg-card p-4">
            <h3 className="font-medium text-card-foreground mb-4">Generation Settings</h3>
            
            <div className="space-y-6">
              <div>
                <Label>Target Job</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobDescriptions.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.role} at {job.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Resume Length: {settings.resumeLength} page{settings.resumeLength > 1 ? 's' : ''}</Label>
                <Slider
                  value={[settings.resumeLength]}
                  onValueChange={([v]) => setSettings({ ...settings, resumeLength: v })}
                  min={1}
                  max={2}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Emphasis</Label>
                <Select 
                  value={settings.emphasis} 
                  onValueChange={(v) => setSettings({ ...settings, emphasis: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>ATS Optimization</Label>
                <Select 
                  value={settings.atsLevel} 
                  onValueChange={(v) => setSettings({ ...settings, atsLevel: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High - Maximum keyword matching</SelectItem>
                    <SelectItem value="medium">Medium - Balanced approach</SelectItem>
                    <SelectItem value="low">Low - More creative formatting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Include Cover Letter</Label>
                <Switch
                  checked={settings.includeCoverLetter}
                  onCheckedChange={(v) => setSettings({ ...settings, includeCoverLetter: v })}
                />
              </div>

              {settings.includeCoverLetter && (
                <div>
                  <Label>Cover Letter Tone</Label>
                  <Select 
                    value={settings.coverLetterTone} 
                    onValueChange={(v) => setSettings({ ...settings, coverLetterTone: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Generate "Why" Answers</Label>
                <Switch
                  checked={settings.generateWhyQuestions}
                  onCheckedChange={(v) => setSettings({ ...settings, generateWhyQuestions: v })}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleGenerate}
                disabled={!selectedJobId || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Application'}
              </Button>
            </div>
          </div>

          <div className="border border-border rounded-lg bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Generated content uses only your master resume data (including Leadership Experience). The job description is used for tailoring emphasis and keywords.
            </p>
          </div>
        </div>

        {/* Generated Content */}
        <div className="lg:col-span-2">
          {!generatedContent ? (
            <div className="border border-border rounded-lg bg-card h-full flex items-center justify-center p-8">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-card-foreground mb-2">Ready to Generate</h3>
                <p className="text-sm text-muted-foreground">
                  Select a job and click generate to create your tailored application materials.
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="border-b border-border p-4 flex items-center justify-between">
                <h3 className="font-medium text-card-foreground">
                  Generated for: {selectedJob?.role} at {selectedJob?.company}
                </h3>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport('pdf', 'resume')}>
                        Resume as PDF (ATS-friendly)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('docx', 'resume')}>
                        Resume as DOCX
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('txt', 'resume')}>
                        Resume as Text
                      </DropdownMenuItem>
                      {settings.includeCoverLetter && (
                        <>
                          <DropdownMenuItem onClick={() => handleExport('pdf', 'coverLetter')}>
                            Cover Letter as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport('docx', 'coverLetter')}>
                            Cover Letter as DOCX
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleExport('pdf', 'both')}>
                        Full Application as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" onClick={handleOpenSaveDialog}>
                    Save to Tracker
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="resume" className="w-full">
                <TabsList className="w-full justify-start border-b border-border rounded-none h-auto p-0 bg-transparent">
                  <TabsTrigger 
                    value="resume" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Resume
                  </TabsTrigger>
                  {settings.includeCoverLetter && (
                    <TabsTrigger 
                      value="cover" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Cover Letter
                    </TabsTrigger>
                  )}
                  {settings.generateWhyQuestions && (
                    <TabsTrigger 
                      value="why" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Why Answers
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="resume" className="p-4 m-0">
                  <Textarea
                    value={generatedContent.resume}
                    onChange={(e) => setGeneratedContent({ ...generatedContent, resume: e.target.value })}
                    className="min-h-[500px] font-mono text-sm"
                  />
                </TabsContent>

                <TabsContent value="cover" className="p-4 m-0">
                  <Textarea
                    value={generatedContent.coverLetter}
                    onChange={(e) => setGeneratedContent({ ...generatedContent, coverLetter: e.target.value })}
                    className="min-h-[400px]"
                  />
                </TabsContent>

                <TabsContent value="why" className="p-4 m-0 space-y-4">
                  <div>
                    <Label>Why this role?</Label>
                    <Textarea
                      value={generatedContent.whyRole}
                      onChange={(e) => setGeneratedContent({ ...generatedContent, whyRole: e.target.value })}
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Why this company?</Label>
                    <Textarea
                      value={generatedContent.whyCompany}
                      onChange={(e) => setGeneratedContent({ ...generatedContent, whyCompany: e.target.value })}
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Save to Tracker Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save to Application Tracker</DialogTitle>
            <DialogDescription>
              Confirm details before saving this application. Your resume and cover letter will be saved with this application.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Application Link */}
            <div>
              <Label className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Application Link
              </Label>
              <Input
                value={applicationLink}
                onChange={(e) => setApplicationLink(e.target.value)}
                placeholder="https://company.com/careers/job-id"
                className="mt-1"
              />
            </div>

            {/* Connection Question */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" />
                Do you have a connection at this company?
              </Label>
              <RadioGroup 
                value={hasConnection} 
                onValueChange={(v) => setHasConnection(v as 'yes' | 'no')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes" className="font-normal">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no" className="font-normal">No</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Connection Details (if yes) */}
            {hasConnection === 'yes' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Connection Name (optional)
                  </Label>
                  <Input
                    value={connectionInfo.name || ''}
                    onChange={(e) => setConnectionInfo({ ...connectionInfo, name: e.target.value })}
                    placeholder="John Smith"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Contact Information (optional)</Label>
                  <Input
                    value={connectionInfo.contactInfo || ''}
                    onChange={(e) => setConnectionInfo({ ...connectionInfo, contactInfo: e.target.value })}
                    placeholder="Phone, LinkedIn, etc."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email Address (optional)</Label>
                  <Input
                    type="email"
                    value={connectionInfo.email || ''}
                    onChange={(e) => setConnectionInfo({ ...connectionInfo, email: e.target.value })}
                    placeholder="john.smith@company.com"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave}>
              Save Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
