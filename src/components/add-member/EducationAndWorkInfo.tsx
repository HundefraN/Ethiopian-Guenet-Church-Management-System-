import React from "react";
import { UseFormRegister } from "react-hook-form";
import { MemberFormValues } from "../../pages/AddMember";
import { Briefcase } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface EducationAndWorkInfoProps {
  register: UseFormRegister<MemberFormValues>;
}

const EducationAndWorkInfo: React.FC<EducationAndWorkInfoProps> = ({
  register,
}) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
          <Briefcase size={24} />
        </div>
        {t('members.form.sections.education')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">{t('members.form.fieldOfStudy')}</label>
          <input
            {...register("field_of_study")}
            className="form-input"
            placeholder="e.g. Engineering"
          />
        </div>

        <div>
          <label className="form-label">{t('members.form.educationalLevel')}</label>
          <select {...register("educational_level")} className="form-select">
            <option value="">{t('members.form.selectLevel')}</option>
            <option value="High School">{t('members.form.highSchool')}</option>
            <option value="Diploma">{t('members.form.diploma')}</option>
            <option value="Bachelor's">{t('members.form.bachelors')}</option>
            <option value="Master's">{t('members.form.masters')}</option>
            <option value="PhD">{t('members.form.phd')}</option>
          </select>
        </div>

        <div>
          <label className="form-label">{t('members.form.employmentStatus')}</label>
          <select {...register("employment_status")} className="form-select">
            <option value="">{t('members.form.selectStatus')}</option>
            <option value="Employed">{t('members.form.employed')}</option>
            <option value="Self-Employed">{t('members.form.selfEmployed')}</option>
            <option value="Unemployed">{t('members.form.unemployed')}</option>
            <option value="Student">{t('members.form.student')}</option>
            <option value="Retired">{t('members.form.retired')}</option>
          </select>
        </div>

        <div>
          <label className="form-label">{t('members.form.workplaceAddress')}</label>
          <input
            {...register("workplace_address")}
            className="form-input"
            placeholder="Company/Organization"
          />
        </div>

        <div>
          <label className="form-label">{t('members.form.monthlyIncome')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">
              {t('members.form.currency')}
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
