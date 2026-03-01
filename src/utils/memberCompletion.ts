import { Member } from "../types";

export const calculateProfileCompletion = (member: Member): number => {
  const fields = [
    // Personal
    member.photo,
    member.dob,
    member.place_of_birth,
    member.mother_tongue,
    member.phone,
    member.email,
    
    // Spiritual
    member.salvation_date,
    member.salvation_place,
    member.previous_church,
    member.reason_for_coming,
    member.faith,
    
    // Education & Work
    member.field_of_study,
    member.educational_level,
    member.employment_status,
    member.workplace_address,
    member.income_amount,
    
    // Family
    member.marital_status,
    // Conditional checks could be added (e.g. spouse name only if married), 
    // but for simple "entire form" average, raw field count is usually sufficient or we just check key fields.
    member.living_situation,
    
    // Service
    member.service_type,
    member.service_duration,
    member.service_responsibility,
    member.current_service,
    member.spiritual_gift,
    member.future_service,
    
    // Fellowship
    member.fellowship_start_date,
    member.fellowship_name,
    member.fellowship_responsibility,
    member.fellowship_mentor,
    member.fellowship_leader,
  ];

  const filledFields = fields.filter(field => field !== null && field !== undefined && field !== "").length;
  const totalFields = fields.length;

  return Math.round((filledFields / totalFields) * 100);
};

export const calculateAverageCompletion = (members: Member[]): number => {
  if (members.length === 0) return 0;
  const totalCompletion = members.reduce((sum, member) => sum + calculateProfileCompletion(member), 0);
  return Math.round(totalCompletion / members.length);
};
