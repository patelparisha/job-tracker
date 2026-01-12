import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResumeStore } from '@/stores/resumeStore';
import type { MasterResume, JobDescription, Application } from '@/types/resume';
import { toast } from 'sonner';

interface DataSyncContextType {
  loadData: () => Promise<void>;
  syncJobDescription: (job: JobDescription, action: 'add' | 'update' | 'delete') => Promise<string | undefined>;
  syncApplication: (app: Application, action: 'add' | 'update' | 'delete') => Promise<void>;
  isLoading: boolean;
  hasLoaded: boolean;
}

const DataSyncContext = createContext<DataSyncContextType | undefined>(undefined);

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { 
    masterResume, 
    setMasterResume,
    setJobDescriptions,
    setApplications,
    hasUnsavedChanges,
    markAsSaved,
    resetStore,
  } = useResumeStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const isInitialLoadRef = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Load data from database on login
  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    // Prevent duplicate loads
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      // Load master resume
      const { data: resumeData, error: resumeError } = await supabase
        .from('master_resumes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (resumeError) throw resumeError;

      // Always set master resume with safe defaults
      const resume: MasterResume = {
        header: (resumeData?.header as any) || { name: '', email: '', phone: '', linkedin: '', location: '', website: '' },
        summaries: Array.isArray(resumeData?.summaries) ? (resumeData.summaries as any) : [{ id: '1', name: 'Default', text: '', isDefault: true }],
        education: Array.isArray(resumeData?.education) ? (resumeData.education as any) : [],
        experience: Array.isArray(resumeData?.experience) ? (resumeData.experience as any) : [],
        projects: Array.isArray(resumeData?.projects) ? (resumeData.projects as any) : [],
        skills: (resumeData?.skills as any) || { technical: [], languages: [], tools: [], certifications: [] },
        leadership: Array.isArray(resumeData?.leadership) ? (resumeData.leadership as any) : [],
      };
      
      // Ensure skills sub-arrays exist
      if (!Array.isArray(resume.skills.technical)) resume.skills.technical = [];
      if (!Array.isArray(resume.skills.languages)) resume.skills.languages = [];
      if (!Array.isArray(resume.skills.tools)) resume.skills.tools = [];
      if (!Array.isArray(resume.skills.certifications)) resume.skills.certifications = [];
      
      setMasterResume(resume);

      // Load job descriptions
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_descriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      if (jobsData) {
        const jobs: JobDescription[] = jobsData.map((job) => ({
          id: job.id,
          company: job.company,
          role: job.role,
          location: job.location || '',
          salary: job.salary || undefined,
          jobType: (job.job_type as JobDescription['jobType']) || 'full-time',
          industry: job.industry || '',
          rawText: job.raw_text,
          requiredSkills: (job.required_skills as string[]) || [],
          keywords: (job.keywords as string[]) || [],
          createdAt: job.created_at,
        }));
        setJobDescriptions(jobs);
      }

      // Load applications
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      if (appsData) {
        const apps: Application[] = appsData.map((app) => ({
          id: app.id,
          jobDescriptionId: app.job_description_id || '',
          company: app.company,
          role: app.role,
          location: '',
          salary: undefined,
          jobType: '',
          industry: '',
          applicationDate: app.applied_date,
          resumeVersion: '',
          status: app.status as Application['status'],
          notes: app.notes || '',
          connections: [],
          applicationLink: (app as any).application_link || undefined,
          savedResume: (app.generated_resume as any)?.fullText || undefined,
          savedCoverLetter: app.cover_letter || undefined,
          interviews: (app.interviews as any) || [],
          reminders: (app.reminders as any) || [],
          createdAt: app.created_at,
          updatedAt: app.updated_at,
        }));
        setApplications(apps);
      }

      markAsSaved();
      isInitialLoadRef.current = false;
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load your data');
      setHasLoaded(true); // Still mark as loaded to prevent infinite loading state
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [user, setMasterResume, setJobDescriptions, setApplications, markAsSaved]);

  // Save master resume to database
  const saveMasterResume = useCallback(async () => {
    if (!user || isInitialLoadRef.current) return;

    try {
      const { error } = await supabase
        .from('master_resumes')
        .update({
          header: masterResume.header as any,
          summaries: masterResume.summaries as any,
          education: masterResume.education as any,
          experience: masterResume.experience as any,
          projects: masterResume.projects as any,
          skills: masterResume.skills as any,
          leadership: masterResume.leadership as any,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      markAsSaved();
    } catch (error) {
      console.error('Error saving resume:', error);
      toast.error('Failed to save resume');
    }
  }, [user, masterResume, markAsSaved]);

  // Auto-save with debounce when master resume changes
  useEffect(() => {
    if (!user || isInitialLoadRef.current || !hasUnsavedChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveMasterResume();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [masterResume, user, hasUnsavedChanges, saveMasterResume]);

  // Load data on user login, reset on logout
  useEffect(() => {
    if (user) {
      isInitialLoadRef.current = true;
      isLoadingRef.current = false; // Reset so loadData can run
      setHasLoaded(false);
      loadData();
    } else {
      // User logged out - reset state
      isLoadingRef.current = false;
      isInitialLoadRef.current = true;
      setHasLoaded(false);
      setIsLoading(false);
      resetStore();
    }
  }, [user, loadData, resetStore]);

  // Sync job description to database
  const syncJobDescription = useCallback(async (job: JobDescription, action: 'add' | 'update' | 'delete'): Promise<string | undefined> => {
    if (!user) return;

    try {
      if (action === 'add') {
        // Let database generate UUID - don't pass the client-side id
        const { data, error } = await supabase.from('job_descriptions').insert({
          user_id: user.id,
          company: job.company,
          role: job.role,
          location: job.location,
          salary: job.salary,
          job_type: job.jobType,
          industry: job.industry,
          raw_text: job.rawText,
          required_skills: job.requiredSkills as any,
          keywords: job.keywords as any,
        }).select('id').single();
        if (error) throw error;
        return data?.id; // Return the database-generated UUID
      } else if (action === 'update') {
        const { error } = await supabase
          .from('job_descriptions')
          .update({
            company: job.company,
            role: job.role,
            location: job.location,
            salary: job.salary,
            job_type: job.jobType,
            industry: job.industry,
            raw_text: job.rawText,
            required_skills: job.requiredSkills as any,
            keywords: job.keywords as any,
          })
          .eq('id', job.id);
        if (error) throw error;
      } else if (action === 'delete') {
        const { error } = await supabase
          .from('job_descriptions')
          .delete()
          .eq('id', job.id);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error syncing job description:', error);
      toast.error('Failed to save job description');
      throw error; // Re-throw so caller knows it failed
    }
  }, [user]);

  // Sync application to database
  const syncApplication = useCallback(async (app: Application, action: 'add' | 'update' | 'delete') => {
    if (!user) return;

    try {
      if (action === 'add') {
        const { error } = await supabase.from('applications').insert({
          id: app.id,
          user_id: user.id,
          job_description_id: app.jobDescriptionId || null,
          company: app.company,
          role: app.role,
          status: app.status,
          applied_date: app.applicationDate,
          notes: app.notes,
          application_link: app.applicationLink || null,
          generated_resume: app.savedResume ? { fullText: app.savedResume } : null,
          cover_letter: app.savedCoverLetter,
          interviews: app.interviews as any,
          reminders: app.reminders as any,
        });
        if (error) throw error;
      } else if (action === 'update') {
        const { error } = await supabase
          .from('applications')
          .update({
            company: app.company,
            role: app.role,
            status: app.status,
            applied_date: app.applicationDate,
            notes: app.notes,
            application_link: app.applicationLink || null,
            generated_resume: app.savedResume ? { fullText: app.savedResume } : null,
            cover_letter: app.savedCoverLetter,
            interviews: app.interviews as any,
            reminders: app.reminders as any,
          })
          .eq('id', app.id);
        if (error) throw error;
      } else if (action === 'delete') {
        const { error } = await supabase
          .from('applications')
          .delete()
          .eq('id', app.id);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error syncing application:', error);
      toast.error('Failed to save application');
    }
  }, [user]);

  return (
    <DataSyncContext.Provider value={{ 
      loadData, 
      syncJobDescription, 
      syncApplication,
      isLoading,
      hasLoaded
    }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export function useDataSync() {
  const context = useContext(DataSyncContext);
  if (context === undefined) {
    console.error('useDataSync called outside of DataSyncProvider');
    // Return a fallback instead of throwing to prevent blank pages
    return {
      loadData: async () => {},
      syncJobDescription: async () => {},
      syncApplication: async () => {},
      isLoading: false,
      hasLoaded: true,
    };
  }
  return context;
}
