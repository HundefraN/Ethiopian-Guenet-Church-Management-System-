import React from "react";
import { UseFormRegister } from "react-hook-form";
import { MemberFormValues } from "../../pages/AddMember";
import { BookOpen } from "lucide-react";

interface ServiceHistoryProps {
  register: UseFormRegister<MemberFormValues>;
}

const ServiceHistory: React.FC<ServiceHistoryProps> = ({ register }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
          <BookOpen size={24} />
        </div>
        Service History
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Service Type</label>
          <input
            {...register("service_type")}
            className="form-input"
            placeholder="e.g. Choir, Usher"
          />
        </div>

        <div>
          <label className="form-label">Duration</label>
          <input
            {...register("service_duration")}
            className="form-input"
            placeholder="e.g. 2 years"
          />
        </div>

        <div>
          <label className="form-label">Responsibility</label>
          <input
            {...register("service_responsibility")}
            className="form-input"
            placeholder="Role/Position"
          />
        </div>

        <div>
          <label className="form-label">Current Service</label>
          <input
            {...register("current_service")}
            className="form-input"
            placeholder="Current ministry"
          />
        </div>

        <div className="md:col-span-2">
          <label className="form-label">Spiritual Gift</label>
          <input
            {...register("spiritual_gift")}
            className="form-input"
            placeholder="e.g. Teaching, Mercy"
          />
        </div>

        <div className="md:col-span-2">
          <label className="form-label">Desired Future Service</label>
          <textarea
            {...register("future_service")}
            className="form-textarea"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default ServiceHistory;
