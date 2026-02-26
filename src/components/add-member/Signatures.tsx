import React from "react";
import { UseFormRegister } from "react-hook-form";
import { MemberFormValues } from "../../pages/AddMember";
import { FileText } from "lucide-react";

interface SignaturesProps {
  register: UseFormRegister<MemberFormValues>;
}

const Signatures: React.FC<SignaturesProps> = ({ register }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
          <FileText size={24} />
        </div>
        Signatures & Review
      </h2>

      <div className="bg-blue-50 p-4 rounded-xl mb-6 text-blue-700 text-sm">
        Please review all information before signing. By signing below, you
        confirm that all details provided are accurate.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Member Signature</label>
          <input
            {...register("member_signature")}
            className="form-input font-handwriting text-xl"
            placeholder="Type full name to sign"
          />
          <p className="text-xs text-gray-400 mt-1">
            This acts as your digital signature
          </p>
        </div>

        <div>
          <label className="form-label">Date</label>
          <input
            type="date"
            {...register("form_filled_date")}
            className="form-input"
          />
        </div>
      </div>
    </div>
  );
};

export default Signatures;
