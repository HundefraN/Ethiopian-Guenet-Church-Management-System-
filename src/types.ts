export type UserRole = "super_admin" | "pastor" | "servant";

export interface Profile {
  id: string;
  role: UserRole;
  church_id: string | null;
  department_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_blocked?: boolean;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  changes: any | null;
  created_at: string;
}

export interface GlobalSettings {
  id: number;
  is_maintenance_mode: boolean;
}

export interface Church {
  id: string;
  name: string;
  location: string | null;
  map_link?: string | null;
}

export interface Department {
  id: string;
  church_id: string;
  name: string;
}

export interface Member {
  id: string;
  church_id: string;
  department_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;

  // Personal Information
  photo?: string;
  dob?: string;
  place_of_birth?: string;
  mother_tongue?: string;

  // Spiritual Information
  salvation_date?: string;
  salvation_place?: string;
  previous_church?: string;
  reason_for_coming?: string;
  faith?: string;

  // Education & Work
  field_of_study?: string;
  educational_level?: string;
  employment_status?: string;
  workplace_address?: string;
  income_amount?: number;

  // Family Status
  marital_status?: string;
  spouse_name?: string;
  marriage_date?: string;
  marriage_place?: string;
  children?: any[]; // JSONB
  additional_family_info?: string;
  living_situation?: string;

  // Service History
  service_type?: string;
  service_duration?: string;
  service_responsibility?: string;
  current_service?: string;
  spiritual_gift?: string;
  future_service?: string;
  additional_service_info?: string;

  // Family Fellowship (Cell Group)
  fellowship_start_date?: string;
  fellowship_name?: string;
  fellowship_responsibility?: string;
  fellowship_mentor?: string;
  fellowship_leader?: string;
  additional_fellowship_info?: string;

  // Signatures & Meta
  member_signature?: string;
  form_filled_date?: string;
  fellowship_leader_signature?: string;
  zone_rep_signature?: string;
  middle_sector_rep_signature?: string;
  status?: string;
}
