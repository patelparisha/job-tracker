import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MasterResume, JobDescription, Application } from '@/types/resume';

interface ResumeStore {
  masterResume: MasterResume;
  jobDescriptions: JobDescription[];
  applications: Application[];
  hasUnsavedChanges: boolean;
  updateMasterResume: (resume: Partial<MasterResume>) => void;
  setMasterResume: (resume: MasterResume) => void;
  markAsSaved: () => void;
  addJobDescription: (job: JobDescription) => void;
  updateJobDescription: (id: string, job: Partial<JobDescription>) => void;
  deleteJobDescription: (id: string) => void;
  setJobDescriptions: (jobs: JobDescription[]) => void;
  addApplication: (application: Application) => void;
  updateApplication: (id: string, application: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  setApplications: (applications: Application[]) => void;
  resetStore: () => void;
}

const defaultResume: MasterResume = {
  header: {
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    location: '',
    website: '',
  },
  summaries: [
    {
      id: '1',
      name: 'Default',
      text: '',
      isDefault: true,
    },
  ],
  education: [],
  experience: [],
  projects: [],
  skills: {
    technical: [],
    languages: [],
    tools: [],
    certifications: [],
  },
  leadership: [],
};

const initialState = {
  masterResume: defaultResume,
  jobDescriptions: [] as JobDescription[],
  applications: [] as Application[],
  hasUnsavedChanges: false,
};

export const useResumeStore = create<ResumeStore>()(
  persist(
    (set) => ({
      ...initialState,
      updateMasterResume: (resume) =>
        set((state) => ({
          masterResume: { ...state.masterResume, ...resume },
          hasUnsavedChanges: true,
        })),
      setMasterResume: (resume) =>
        set(() => ({
          masterResume: resume,
          hasUnsavedChanges: false,
        })),
      markAsSaved: () =>
        set(() => ({
          hasUnsavedChanges: false,
        })),
      addJobDescription: (job) =>
        set((state) => ({
          jobDescriptions: [...state.jobDescriptions, job],
        })),
      updateJobDescription: (id, job) =>
        set((state) => ({
          jobDescriptions: state.jobDescriptions.map((j) =>
            j.id === id ? { ...j, ...job } : j
          ),
        })),
      deleteJobDescription: (id) =>
        set((state) => ({
          jobDescriptions: state.jobDescriptions.filter((j) => j.id !== id),
        })),
      setJobDescriptions: (jobs) =>
        set(() => ({
          jobDescriptions: jobs,
        })),
      addApplication: (application) =>
        set((state) => ({
          applications: [...state.applications, application],
        })),
      updateApplication: (id, application) =>
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id ? { ...a, ...application, updatedAt: new Date().toISOString() } : a
          ),
        })),
      deleteApplication: (id) =>
        set((state) => ({
          applications: state.applications.filter((a) => a.id !== id),
        })),
      setApplications: (applications) =>
        set(() => ({
          applications,
        })),
      resetStore: () =>
        set(() => ({
          ...initialState,
        })),
    }),
    {
      name: 'job-app-storage',
    }
  )
);
