import React from "react";
import { UseFormRegister } from "react-hook-form";
import { MemberFormValues } from "../../pages/AddMember";
import { FileText } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface SignaturesProps {
  register: UseFormRegister<MemberFormValues>;
}

const Signatures: React.FC<SignaturesProps> = ({ register }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
          <FileText size={24} />
        </div>
        {t('members.form.sections.signatures')}
      </h2>

      <div className="bg-blue-50 p-4 rounded-xl mb-6 text-blue-700 text-sm">
        {t('members.form.reviewMsg')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">{t('members.form.memberSignature')}</label>
          <input
            {...register("member_signature")}
            className="form-input font-handwriting text-xl"
            placeholder={t('members.form.memberSignature')}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('members.form.digitalSignatureTip')}
          </p>
        </div>

        <div>
          <label className="form-label">{t('dashboard.stats.total')}</label>
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
