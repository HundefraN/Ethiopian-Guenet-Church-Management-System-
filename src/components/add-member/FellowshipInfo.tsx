import React from "react";
import { UseFormRegister } from "react-hook-form";
import { MemberFormValues } from "../../pages/AddMember";
import { Users } from "lucide-react";

interface FellowshipInfoProps {
  register: UseFormRegister<MemberFormValues>;
}

const FellowshipInfo: React.FC<FellowshipInfoProps> = ({ register }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Users size={24} />
        </div>
        Family Fellowship
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Start Date</label>
          <input
            type="date"
            {...register("fellowship_start_date")}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Fellowship Name</label>
          <input {...register("fellowship_name")} className="form-input" />
        </div>

        <div>
          <label className="form-label">Responsibility</label>
          <input
            {...register("fellowship_responsibility")}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Leader</label>
          <input {...register("fellowship_leader")} className="form-input" />
        </div>
      </div>
    </div>
  );
};

export default FellowshipInfo;
