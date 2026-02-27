import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { MemberFormValues } from "../../pages/AddMember";
import { User, Upload, Plus } from "lucide-react";

interface PersonalInfoProps {
  register: UseFormRegister<MemberFormValues>;
  errors: FieldErrors<MemberFormValues>;
  photoPreview: string | null;
  handleFileSelect: (file: File) => void;
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({
  register,
  errors,
  photoPreview,
  handleFileSelect,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <User size={24} />
        </div>
        Personal Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 flex justify-center mb-6">
          <div className="relative group">
            <div
              className={`w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg ${
                !photoPreview &&
                "bg-gray-100 flex items-center justify-center"
              }`}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Upload size={32} className="text-gray-500 dark:text-gray-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-guenet-green text-white p-2 rounded-full cursor-pointer hover:bg-guenet-green/90 shadow-md transition-transform hover:scale-110">
              <Plus size={16} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && handleFileSelect(e.target.files[0])
                }
              />
            </label>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="form-label">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register("full_name")}
            className="form-input"
            placeholder="e.g. Abebe Kebede"
          />
          {errors.full_name && (
            <p className="form-error">{errors.full_name.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Date of Birth</label>
          <input type="date" {...register("dob")} className="form-input" />
        </div>

        <div>
          <label className="form-label">Place of Birth</label>
          <input
            {...register("place_of_birth")}
            className="form-input"
            placeholder="City, Region"
          />
        </div>

        <div>
          <label className="form-label">Mother Tongue</label>
          <input
            {...register("mother_tongue")}
            className="form-input"
            placeholder="e.g. Amharic"
          />
        </div>

        <div>
          <label className="form-label">Phone Number</label>
          <input
            {...register("phone")}
            className="form-input"
            placeholder="+251..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            {...register("email")}
            className="form-input"
            placeholder="member@example.com"
          />
          {errors.email && (
            <p className="form-error">{errors.email.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalInfo;
