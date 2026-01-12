import { useState, useEffect } from 'react';
import { Plus, GripVertical, ChevronDown, ChevronRight, Trash2, Save, Check, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useResumeStore } from '@/stores/resumeStore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useDataSync } from '@/contexts/DataSyncContext';
import type { ResumeExperience, ResumeEducation, ResumeProject, ResumeBullet, LeadershipExperience } from '@/types/resume';

function generateId() {
  return crypto.randomUUID();
}

export default function MasterResume() {
  const { masterResume, updateMasterResume, hasUnsavedChanges, markAsSaved } = useResumeStore();
  const { isLoading } = useDataSync();
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<string[]>(['header', 'experience']);
  const [newSkill, setNewSkill] = useState<{ [key: string]: string }>({
    technical: '',
    tools: '',
    languages: '',
    certifications: '',
  });

  // Debug logging
  useEffect(() => {
    console.log('MasterResume state:', { isLoading, hasMasterResume: !!masterResume, hasHeader: !!masterResume?.header });
  }, [isLoading, masterResume]);

  // Safety check - show loading if data isn't ready
  if (!masterResume?.header || !Array.isArray(masterResume?.experience)) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <PageHeader 
          title="Master Resume" 
          description="Your complete resume that serves as the source for all generated applications"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading your resume...</span>
        </div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleSave = () => {
    markAsSaved();
    toast({
      title: 'Resume saved',
      description: 'Your master resume has been saved successfully.',
    });
  };

  const updateHeader = (field: string, value: string) => {
    updateMasterResume({
      header: { ...masterResume.header, [field]: value },
    });
  };

  const addExperience = () => {
    const newExp: ResumeExperience = {
      id: generateId(),
      company: '',
      title: '',
      location: '',
      startDate: '',
      endDate: '',
      bullets: [],
    };
    updateMasterResume({
      experience: [...masterResume.experience, newExp],
    });
  };

  const updateExperience = (id: string, updates: Partial<ResumeExperience>) => {
    updateMasterResume({
      experience: masterResume.experience.map(exp =>
        exp.id === id ? { ...exp, ...updates } : exp
      ),
    });
  };

  const deleteExperience = (id: string) => {
    updateMasterResume({
      experience: masterResume.experience.filter(exp => exp.id !== id),
    });
  };

  const addBulletToExperience = (expId: string) => {
    const newBullet: ResumeBullet = { id: generateId(), text: '', enabled: true };
    updateMasterResume({
      experience: masterResume.experience.map(exp =>
        exp.id === expId ? { ...exp, bullets: [...exp.bullets, newBullet] } : exp
      ),
    });
  };

  const updateBullet = (expId: string, bulletId: string, updates: Partial<ResumeBullet>) => {
    updateMasterResume({
      experience: masterResume.experience.map(exp =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.map(b =>
                b.id === bulletId ? { ...b, ...updates } : b
              ),
            }
          : exp
      ),
    });
  };

  const deleteBullet = (expId: string, bulletId: string) => {
    updateMasterResume({
      experience: masterResume.experience.map(exp =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.filter(b => b.id !== bulletId) }
          : exp
      ),
    });
  };

  // Leadership Experience functions
  const addLeadership = () => {
    const newLead: LeadershipExperience = {
      id: generateId(),
      title: '',
      organization: '',
      location: '',
      startDate: '',
      endDate: '',
      bullets: [],
    };
    updateMasterResume({
      leadership: [...masterResume.leadership, newLead],
    });
  };

  const updateLeadership = (id: string, updates: Partial<LeadershipExperience>) => {
    updateMasterResume({
      leadership: masterResume.leadership.map(lead =>
        lead.id === id ? { ...lead, ...updates } : lead
      ),
    });
  };

  const deleteLeadership = (id: string) => {
    updateMasterResume({
      leadership: masterResume.leadership.filter(lead => lead.id !== id),
    });
  };

  const addBulletToLeadership = (leadId: string) => {
    const newBullet: ResumeBullet = { id: generateId(), text: '', enabled: true };
    updateMasterResume({
      leadership: masterResume.leadership.map(lead =>
        lead.id === leadId ? { ...lead, bullets: [...lead.bullets, newBullet] } : lead
      ),
    });
  };

  const updateLeadershipBullet = (leadId: string, bulletId: string, updates: Partial<ResumeBullet>) => {
    updateMasterResume({
      leadership: masterResume.leadership.map(lead =>
        lead.id === leadId
          ? {
              ...lead,
              bullets: lead.bullets.map(b =>
                b.id === bulletId ? { ...b, ...updates } : b
              ),
            }
          : lead
      ),
    });
  };

  const deleteLeadershipBullet = (leadId: string, bulletId: string) => {
    updateMasterResume({
      leadership: masterResume.leadership.map(lead =>
        lead.id === leadId
          ? { ...lead, bullets: lead.bullets.filter(b => b.id !== bulletId) }
          : lead
      ),
    });
  };

  const addEducation = () => {
    const newEdu: ResumeEducation = {
      id: generateId(),
      school: '',
      degree: '',
      field: '',
      location: '',
      graduationDate: '',
      bullets: [],
    };
    updateMasterResume({
      education: [...masterResume.education, newEdu],
    });
  };

  const updateEducation = (id: string, updates: Partial<ResumeEducation>) => {
    updateMasterResume({
      education: masterResume.education.map(edu =>
        edu.id === id ? { ...edu, ...updates } : edu
      ),
    });
  };

  const deleteEducation = (id: string) => {
    updateMasterResume({
      education: masterResume.education.filter(edu => edu.id !== id),
    });
  };

  const addProject = () => {
    const newProject: ResumeProject = {
      id: generateId(),
      name: '',
      technologies: [],
      startDate: '',
      endDate: '',
      bullets: [],
    };
    updateMasterResume({
      projects: [...masterResume.projects, newProject],
    });
  };

  const addBulletToProject = (projId: string) => {
    const newBullet: ResumeBullet = { id: generateId(), text: '', enabled: true };
    updateMasterResume({
      projects: masterResume.projects.map(proj =>
        proj.id === projId ? { ...proj, bullets: [...proj.bullets, newBullet] } : proj
      ),
    });
  };

  const updateProjectBullet = (projId: string, bulletId: string, updates: Partial<ResumeBullet>) => {
    updateMasterResume({
      projects: masterResume.projects.map(proj =>
        proj.id === projId
          ? {
              ...proj,
              bullets: proj.bullets.map(b =>
                b.id === bulletId ? { ...b, ...updates } : b
              ),
            }
          : proj
      ),
    });
  };

  const deleteProjectBullet = (projId: string, bulletId: string) => {
    updateMasterResume({
      projects: masterResume.projects.map(proj =>
        proj.id === projId
          ? { ...proj, bullets: proj.bullets.filter(b => b.id !== bulletId) }
          : proj
      ),
    });
  };

  const updateProject = (id: string, updates: Partial<ResumeProject>) => {
    updateMasterResume({
      projects: masterResume.projects.map(proj =>
        proj.id === id ? { ...proj, ...updates } : proj
      ),
    });
  };

  const deleteProject = (id: string) => {
    updateMasterResume({
      projects: masterResume.projects.filter(proj => proj.id !== id),
    });
  };

  // Fixed skills functions - add one skill at a time
  const addSkill = (category: keyof typeof masterResume.skills) => {
    const skill = newSkill[category]?.trim();
    if (!skill) return;
    
    updateMasterResume({
      skills: {
        ...masterResume.skills,
        [category]: [...masterResume.skills[category], skill],
      },
    });
    setNewSkill(prev => ({ ...prev, [category]: '' }));
  };

  const removeSkill = (category: keyof typeof masterResume.skills, index: number) => {
    updateMasterResume({
      skills: {
        ...masterResume.skills,
        [category]: masterResume.skills[category].filter((_, i) => i !== index),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <PageHeader 
          title="Master Resume" 
          description="Your complete resume that serves as the source for all generated applications"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading your resume...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <PageHeader 
        title="Master Resume" 
        description="Your complete resume that serves as the source for all generated applications"
      >
        <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
          {hasUnsavedChanges ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved
            </>
          )}
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {/* Header Section */}
        <Collapsible open={expandedSections.includes('header')}>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <CollapsibleTrigger 
              onClick={() => toggleSection('header')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections.includes('header') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium text-card-foreground">Contact Information</span>
              </div>
              {masterResume.header.name && (
                <span className="text-sm text-muted-foreground">{masterResume.header.name}</span>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={masterResume.header.name}
                    onChange={(e) => updateHeader('name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={masterResume.header.email}
                    onChange={(e) => updateHeader('email', e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={masterResume.header.phone}
                    onChange={(e) => updateHeader('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={masterResume.header.location}
                    onChange={(e) => updateHeader('location', e.target.value)}
                    placeholder="San Francisco, CA"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={masterResume.header.linkedin}
                    onChange={(e) => updateHeader('linkedin', e.target.value)}
                    placeholder="linkedin.com/in/johndoe"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    value={masterResume.header.website || ''}
                    onChange={(e) => updateHeader('website', e.target.value)}
                    placeholder="johndoe.com"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Summary Section */}
        <Collapsible open={expandedSections.includes('summary')}>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <CollapsibleTrigger 
              onClick={() => toggleSection('summary')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections.includes('summary') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium text-card-foreground">Professional Summary</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {masterResume.summaries.length} version{masterResume.summaries.length !== 1 ? 's' : ''}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4">
                {masterResume.summaries.map((summary, index) => (
                  <div key={summary.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={summary.name}
                        onChange={(e) => {
                          const updated = [...masterResume.summaries];
                          updated[index] = { ...summary, name: e.target.value };
                          updateMasterResume({ summaries: updated });
                        }}
                        placeholder="Version name"
                        className="max-w-[200px]"
                      />
                      {summary.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>
                      )}
                    </div>
                    <Textarea
                      value={summary.text}
                      onChange={(e) => {
                        const updated = [...masterResume.summaries];
                        updated[index] = { ...summary, text: e.target.value };
                        updateMasterResume({ summaries: updated });
                      }}
                      placeholder="Write your professional summary..."
                      rows={3}
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateMasterResume({
                      summaries: [
                        ...masterResume.summaries,
                        { id: generateId(), name: `Version ${masterResume.summaries.length + 1}`, text: '', isDefault: false },
                      ],
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Version
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Experience Section */}
        <Collapsible open={expandedSections.includes('experience')}>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <CollapsibleTrigger 
              onClick={() => toggleSection('experience')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections.includes('experience') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium text-card-foreground">Experience</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {masterResume.experience.length} role{masterResume.experience.length !== 1 ? 's' : ''}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4">
                {masterResume.experience.map((exp) => (
                  <div key={exp.id} className="border border-border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                        <span className="font-medium text-sm">{exp.title || 'New Role'}</span>
                        {exp.company && <span className="text-muted-foreground text-sm">at {exp.company}</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteExperience(exp.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <Input
                        value={exp.title}
                        onChange={(e) => updateExperience(exp.id, { title: e.target.value })}
                        placeholder="Job Title"
                      />
                      <Input
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                        placeholder="Company"
                      />
                      <Input
                        value={exp.location}
                        onChange={(e) => updateExperience(exp.id, { location: e.target.value })}
                        placeholder="Location"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                          placeholder="Start Date"
                        />
                        <Input
                          value={exp.endDate}
                          onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                          placeholder="End Date"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Bullet Points</Label>
                      {exp.bullets.map((bullet) => (
                        <div key={bullet.id} className="flex items-start gap-2">
                          <Checkbox
                            checked={bullet.enabled}
                            onCheckedChange={(checked) =>
                              updateBullet(exp.id, bullet.id, { enabled: !!checked })
                            }
                            className="mt-2"
                          />
                          <Textarea
                            value={bullet.text}
                            onChange={(e) =>
                              updateBullet(exp.id, bullet.id, { text: e.target.value })
                            }
                            placeholder="Describe your achievement..."
                            rows={2}
                            className={!bullet.enabled ? 'opacity-50' : ''}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBullet(exp.id, bullet.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBulletToExperience(exp.id)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Bullet
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addExperience}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Experience
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Leadership Experience Section */}
        <Collapsible open={expandedSections.includes('leadership')}>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <CollapsibleTrigger 
              onClick={() => toggleSection('leadership')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections.includes('leadership') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium text-card-foreground">Leadership Experience</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {masterResume.leadership.length} role{masterResume.leadership.length !== 1 ? 's' : ''}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4">
                {masterResume.leadership.map((lead) => (
                  <div key={lead.id} className="border border-border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                        <span className="font-medium text-sm">{lead.title || 'New Leadership Role'}</span>
                        {lead.organization && <span className="text-muted-foreground text-sm">at {lead.organization}</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLeadership(lead.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <Input
                        value={lead.title}
                        onChange={(e) => updateLeadership(lead.id, { title: e.target.value })}
                        placeholder="Role/Title"
                      />
                      <Input
                        value={lead.organization}
                        onChange={(e) => updateLeadership(lead.id, { organization: e.target.value })}
                        placeholder="Organization"
                      />
                      <Input
                        value={lead.location}
                        onChange={(e) => updateLeadership(lead.id, { location: e.target.value })}
                        placeholder="Location"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={lead.startDate}
                          onChange={(e) => updateLeadership(lead.id, { startDate: e.target.value })}
                          placeholder="Start Date"
                        />
                        <Input
                          value={lead.endDate}
                          onChange={(e) => updateLeadership(lead.id, { endDate: e.target.value })}
                          placeholder="End Date"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Bullet Points</Label>
                      {lead.bullets.map((bullet) => (
                        <div key={bullet.id} className="flex items-start gap-2">
                          <Checkbox
                            checked={bullet.enabled}
                            onCheckedChange={(checked) =>
                              updateLeadershipBullet(lead.id, bullet.id, { enabled: !!checked })
                            }
                            className="mt-2"
                          />
                          <Textarea
                            value={bullet.text}
                            onChange={(e) =>
                              updateLeadershipBullet(lead.id, bullet.id, { text: e.target.value })
                            }
                            placeholder="Describe your achievement..."
                            rows={2}
                            className={!bullet.enabled ? 'opacity-50' : ''}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteLeadershipBullet(lead.id, bullet.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addBulletToLeadership(lead.id)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Bullet
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addLeadership}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Leadership Experience
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Education Section */}
        <Collapsible open={expandedSections.includes('education')}>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <CollapsibleTrigger 
              onClick={() => toggleSection('education')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections.includes('education') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium text-card-foreground">Education</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {masterResume.education.length} entr{masterResume.education.length !== 1 ? 'ies' : 'y'}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4">
                {masterResume.education.map((edu) => (
                  <div key={edu.id} className="border border-border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-4">
                      <span className="font-medium text-sm">{edu.school || 'New Education'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEducation(edu.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        value={edu.school}
                        onChange={(e) => updateEducation(edu.id, { school: e.target.value })}
                        placeholder="School/University"
                      />
                      <Input
                        value={edu.degree}
                        onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                        placeholder="Degree"
                      />
                      <Input
                        value={edu.field}
                        onChange={(e) => updateEducation(edu.id, { field: e.target.value })}
                        placeholder="Field of Study"
                      />
                      <Input
                        value={edu.location}
                        onChange={(e) => updateEducation(edu.id, { location: e.target.value })}
                        placeholder="Location"
                      />
                      <Input
                        value={edu.graduationDate}
                        onChange={(e) => updateEducation(edu.id, { graduationDate: e.target.value })}
                        placeholder="Graduation Date"
                      />
                      <Input
                        value={edu.gpa || ''}
                        onChange={(e) => updateEducation(edu.id, { gpa: e.target.value })}
                        placeholder="GPA (Optional)"
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addEducation}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Education
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Skills Section - Fixed to allow multiple skills */}
        <Collapsible open={expandedSections.includes('skills')}>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <CollapsibleTrigger 
              onClick={() => toggleSection('skills')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections.includes('skills') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium text-card-foreground">Skills</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-6">
                {/* Technical Skills */}
                <div>
                  <Label>Technical Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {masterResume.skills.technical.map((skill, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                        {skill}
                        <button
                          onClick={() => removeSkill('technical', index)}
                          className="hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill.technical}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, technical: e.target.value }))}
                      placeholder="Add a technical skill..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('technical'))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addSkill('technical')}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Tools & Platforms */}
                <div>
                  <Label>Tools & Platforms</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {masterResume.skills.tools.map((skill, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">
                        {skill}
                        <button
                          onClick={() => removeSkill('tools', index)}
                          className="hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill.tools}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, tools: e.target.value }))}
                      placeholder="Add a tool or platform..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('tools'))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addSkill('tools')}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <Label>Languages</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {masterResume.skills.languages.map((skill, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-accent text-accent-foreground px-2 py-1 rounded text-sm">
                        {skill}
                        <button
                          onClick={() => removeSkill('languages', index)}
                          className="hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill.languages}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, languages: e.target.value }))}
                      placeholder="Add a language..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('languages'))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addSkill('languages')}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <Label>Certifications</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {masterResume.skills.certifications.map((skill, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-muted text-muted-foreground px-2 py-1 rounded text-sm">
                        {skill}
                        <button
                          onClick={() => removeSkill('certifications', index)}
                          className="hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill.certifications}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, certifications: e.target.value }))}
                      placeholder="Add a certification..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('certifications'))}
                    />
                    <Button variant="outline" size="sm" onClick={() => addSkill('certifications')}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Projects Section */}
        <Collapsible open={expandedSections.includes('projects')}>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <CollapsibleTrigger 
              onClick={() => toggleSection('projects')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections.includes('projects') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium text-card-foreground">Academic Projects</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {masterResume.projects.length} project{masterResume.projects.length !== 1 ? 's' : ''}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4">
                {masterResume.projects.map((proj) => (
                  <div key={proj.id} className="border border-border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                        <span className="font-medium text-sm">{proj.name || 'New Project'}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject(proj.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <Input
                        value={proj.name}
                        onChange={(e) => updateProject(proj.id, { name: e.target.value })}
                        placeholder="Project Name"
                      />
                      <Input
                        value={proj.link || ''}
                        onChange={(e) => updateProject(proj.id, { link: e.target.value })}
                        placeholder="Project URL (optional)"
                      />
                      <Input
                        value={proj.startDate || ''}
                        onChange={(e) => updateProject(proj.id, { startDate: e.target.value })}
                        placeholder="Start Date (e.g., Jan 2024)"
                      />
                      <Input
                        value={proj.endDate || ''}
                        onChange={(e) => updateProject(proj.id, { endDate: e.target.value })}
                        placeholder="End Date (e.g., May 2024)"
                      />
                      <div className="md:col-span-2">
                        <Input
                          value={proj.technologies.join(', ')}
                          onChange={(e) => updateProject(proj.id, { 
                            technologies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                          })}
                          placeholder="Technologies used (comma separated)"
                        />
                      </div>
                    </div>

                    {/* Project Bullets */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Bullet Points</Label>
                      {proj.bullets.map((bullet) => (
                        <div key={bullet.id} className="flex items-start gap-2">
                          <Checkbox
                            checked={bullet.enabled}
                            onCheckedChange={(checked) =>
                              updateProjectBullet(proj.id, bullet.id, { enabled: checked as boolean })
                            }
                            className="mt-2"
                          />
                          <Input
                            value={bullet.text}
                            onChange={(e) =>
                              updateProjectBullet(proj.id, bullet.id, { text: e.target.value })
                            }
                            placeholder="Describe what you accomplished..."
                            className={!bullet.enabled ? 'opacity-50' : ''}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteProjectBullet(proj.id, bullet.id)}
                            className="text-destructive hover:text-destructive shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addBulletToProject(proj.id)}
                        className="text-muted-foreground"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Bullet
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addProject}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Project
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}
