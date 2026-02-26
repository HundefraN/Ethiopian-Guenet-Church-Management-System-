import React from "react";
import { UseFormRegister } from "react-hook-form";
import { MemberFormValues } from "../../pages/AddMember";
import { Heart } from "lucide-react";

interface SpiritualInfoProps {
  register: UseFormRegister<MemberFormValues>;
}

const SpiritualInfo: React.FC<SpiritualInfoProps> = ({ register }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
          <Heart size={24} />
        </div>
        Spiritual Life
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Date of Salvation</label>
          <input
            type="date"
            {...register("salvation_date")}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Place of Salvation</label>
          <input
            {...register("salvation_place")}
            className="form-input"
            placeholder="City/Church"
          />
        </div>

        <div className="md:col-span-2">
          <label className="form-label">Previous Church</label>
          <input
            {...register("previous_church")}
            className="form-input"
            placeholder="Name of previous church"
          />
        </div>

        <div className="md:col-span-2">
          <label className="form-label">Reason for Coming</label>
          <input
            {...register("reason_for_coming")}
            className="form-input"
            placeholder="e.g. Transfer, New Believer"
          />
        </div>

        <div className="md:col-span-2">
          <label className="form-label">Faith Declaration</label>
          <textarea
            {...register("faith")}
            className="form-textarea"
            rows={4}
            placeholder="Brief statement of faith..."
          />
        </div>
      </div>
    </div>
  );
};

export default SpiritualInfo;
