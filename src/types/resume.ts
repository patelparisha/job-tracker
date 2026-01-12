export interface ResumeHeader {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  website?: string;
}

export interface ResumeBullet {
  id: string;
  text: string;
  enabled: boolean;
}

export interface ResumeExperience {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: ResumeBullet[];
}

export interface ResumeEducation {
  id: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  graduationDate: string;
  gpa?: string;
  bullets: ResumeBullet[];
}

export interface ResumeProject {
  id: string;
  name: string;
  description?: string;
  technologies: string[];
  startDate: string;
  endDate: string;
  link?: string;
  bullets: ResumeBullet[];
}

export interface ResumeSkills {
  technical: string[];
  languages: string[];
  tools: string[];
  certifications: string[];
}

export interface ResumeSummary {
  id: string;
  name: string;
  text: string;
  isDefault: boolean;
}

export interface LeadershipExperience {
  id: string;
  title: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: ResumeBullet[];
}

export interface MasterResume {
  header: ResumeHeader;
  summaries: ResumeSummary[];
  education: ResumeEducation[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  skills: ResumeSkills;
  leadership: LeadershipExperience[];
}

export interface JobDescription {
  id: string;
  company: string;
  role: string;
  location: string;
  salary?: string;
  jobType: 'full-time' | 'part-time' | 'internship' | 'contract';
  industry: string;
  requiredSkills: string[];
  keywords: string[];
  rawText: string;
  createdAt: string;
}

export interface ConnectionInfo {
  hasConnection: boolean;
  name?: string;
  contactInfo?: string;
  email?: string;
}

export interface InterviewSchedule {
  id: string;
  date: string;
  time: string;
  type: 'phone' | 'video' | 'onsite' | 'technical' | 'behavioral';
  notes?: string;
  completed: boolean;
}

export interface FollowUpReminder {
  id: string;
  date: string;
  type: 'thank-you' | 'follow-up' | 'check-status' | 'custom';
  message?: string;
  completed: boolean;
}

export interface Application {
  id: string;
  jobDescriptionId: string;
  company: string;
  role: string;
  location: string;
  salary?: string;
  jobType: string;
  industry: string;
  applicationDate: string;
  deadline?: string;
  resumeVersion: string;
  status: 'draft' | 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  notes: string;
  connections: string[];
  connectionInfo?: ConnectionInfo;
  applicationLink?: string;
  savedResume?: string;
  savedCoverLetter?: string;
  interviews?: InterviewSchedule[];
  reminders?: FollowUpReminder[];
  responseDate?: string;
  createdAt: string;
  updatedAt: string;
}
