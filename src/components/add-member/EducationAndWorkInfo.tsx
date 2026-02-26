import React from "react";
import { UseFormRegister } from "react-hook-form";
import { MemberFormValues } from "../../pages/AddMember";
import { Briefcase } from "lucide-react";

interface EducationAndWorkInfoProps {
  register: UseFormRegister<MemberFormValues>;
}

const EducationAndWorkInfo: React.FC<EducationAndWorkInfoProps> = ({
  register,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
          <Briefcase size={24} />
        </div>
        Education & Work
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Field of Study</label>
          <input
            {...register("field_of_study")}
            className="form-input"
            placeholder="e.g. Engineering"
          />
        </div>

        <div>
          <label className="form-label">Educational Level</label>
          <select {...register("educational_level")} className="form-select">
            <option value="">Select Level</option>
            <option value="High School">High School</option>
            <option value="Diploma">Diploma</option>
            <option value="Bachelor's">Bachelor's Degree</option>
            <option value="Master's">Master's Degree</option>
            <option value="PhD">PhD</option>
          </select>
        </div>

        <div>
          <label className="form-label">Employment Status</label>
          <select {...register("employment_status")} className="form-select">
            <option value="">Select Status</option>
            <option value="Employed">Employed</option>
            <option value="Self-Employed">Self-Employed</option>
            <option value="Unemployed">Unemployed</option>
            <option value="Student">Student</option>
            <option value="Retired">Retired</option>
          </select>
        </div>

        <div>
          <label className="form-label">Workplace Address</label>
          <input
            {...register("workplace_address")}
            className="form-input"
            placeholder="Company/Organization"
          />
        </div>

        <div>
          <label className="form-label">Monthly Income</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
              ETB
            </span>
            <input
              type="number"
              {...register("income_amount")}
              className="form-input !pl-12"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationAndWorkInfo;
