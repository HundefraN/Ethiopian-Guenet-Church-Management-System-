import React from "react";
import { UseFormRegister } from "react-hook-form";
import { MemberFormValues } from "../../pages/AddMember";
import { Heart } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface SpiritualInfoProps {
  register: UseFormRegister<MemberFormValues>;
}

const SpiritualInfo: React.FC<SpiritualInfoProps> = ({ register }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
          <Heart size={24} />
        </div>
        {t('members.form.sections.spiritual')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">{t('members.form.salvationInfo')}</label>
          <input
            type="date"
            {...register("salvation_date")}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">{t('members.form.placeOfBirth')}</label>
          <input
            {...register("salvation_place")}
            className="form-input"
            placeholder="City/Church"
          />
        </div>

        <div className="md:col-span-2">
          <label className="form-label">{t('members.form.previousChurch')}</label>
          <input
            {...register("previous_church")}
            className="form-input"
            placeholder="Name of previous church"
          />
        </div>

        <div className="md:col-span-2">
          <label className="form-label">{t('members.form.reasonForComing')}</label>
          <input
            {...register("reason_for_coming")}
            className="form-input"
            placeholder="e.g. Transfer, New Believer"
          />
        </div>

        <div className="md:col-span-2">
          <label className="form-label">{t('members.form.faith')}</label>
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
