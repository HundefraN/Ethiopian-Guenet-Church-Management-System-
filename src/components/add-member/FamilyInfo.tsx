import React from "react";
import {
  UseFormRegister,
  Control,
  UseFieldArrayReturn,
} from "react-hook-form";
import { MemberFormValues } from "../../pages/AddMember";
import { Users, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";

interface FamilyInfoProps {
  register: UseFormRegister<MemberFormValues>;
  control: Control<MemberFormValues>;
  fields: UseFieldArrayReturn<MemberFormValues, "children", "id">["fields"];
  append: UseFieldArrayReturn<MemberFormValues, "children", "id">["append"];
  remove: UseFieldArrayReturn<MemberFormValues, "children", "id">["remove"];
  watch: (name: keyof MemberFormValues) => any;
}

const FamilyInfo: React.FC<FamilyInfoProps> = ({
  register,
  watch,
  fields,
  append,
  remove,
}) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600">
          <Users size={24} />
        </div>
        {t('members.form.sections.family')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">{t('members.form.maritalStatus.status')}</label>
          <select {...register("marital_status")} className="form-select">
            <option value="Single">{t('members.form.maritalStatus.single')}</option>
            <option value="Married">{t('members.form.maritalStatus.married')}</option>
            <option value="Divorced">{t('members.form.maritalStatus.divorced')}</option>
            <option value="Widowed">{t('members.form.maritalStatus.widowed')}</option>
          </select>
        </div>

        {watch("marital_status") === "Married" && (
          <>
            <div>
              <label className="form-label">{t('members.form.spouseName')}</label>
              <input {...register("spouse_name")} className="form-input" />
            </div>
            <div>
              <label className="form-label">{t('members.form.dob')}</label>
              <input
                type="date"
                {...register("marriage_date")}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">{t('members.form.placeOfBirth')}</label>
              <input {...register("marriage_place")} className="form-input" />
            </div>
          </>
        )}

        <div className="md:col-span-2 mt-4">
          <div className="flex justify-between items-center mb-4">
            <label className="text-lg font-semibold text-gray-900">
              {t('members.form.childrenInfo')}
            </label>
            <button
              type="button"
              onClick={() =>
                append({ name: "", gender: "", age: "", education: "", faith: "" })
              }
              className="text-sm bg-guenet-green/10 text-guenet-green px-3 py-1.5 rounded-lg hover:bg-guenet-green/20 font-medium flex items-center gap-1 transition-colors"
            >
              <Plus size={16} /> {t('members.addChild')}
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-50 p-4 rounded-xl relative border border-gray-100"
                >
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="absolute -top-2 -right-2 bg-white text-red-500 p-1 rounded-full shadow-sm hover:bg-red-50 border border-gray-200"
                  >
                    <X size={14} />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    <input
                      {...register(`children.${index}.name`)}
                      className="form-input"
                      placeholder="Name"
                    />
                    <select
                      {...register(`children.${index}.gender`)}
                      className="form-select"
                    >
                      <option value="">{t('common.gender.label')}</option>
                      <option value="Male">{t('common.gender.male')}</option>
                      <option value="Female">{t('common.gender.female')}</option>
                    </select>
                    <input
                      {...register(`children.${index}.age`)}
                      className="form-input"
                      placeholder="Age"
                    />
                    <input
                      {...register(`children.${index}.education`)}
                      className="form-input"
                      placeholder="Education"
                    />
                    <input
                      {...register(`children.${index}.faith`)}
                      className="form-input"
                      placeholder="Faith Status"
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {fields.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500">{t('members.noMembers')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyInfo;
