import React, { useState } from 'react';
import { SURVEY_CHOICES, SURVEY_ITEMS, SurveyItem, validateSurveyAnswers } from '../utils/edusmart';

interface SurveyPageProps {
  surveys: SurveyItem[];
  onSubmitSurvey: (surveyType: 'before' | 'after', answers: number[]) => Promise<void>;
}

export const SurveyPage: React.FC<SurveyPageProps> = ({ surveys, onSubmitSurvey }) => {
  const [surveyType, setSurveyType] = useState<'before' | 'after'>('before');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [statusMsg, setStatusMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = (qIdx: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: value }));
    if (statusMsg?.kind === 'error') setStatusMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = SURVEY_ITEMS.map((_, idx) => answers[idx] ?? 0);
    const check = validateSurveyAnswers(list);
    if (!check.valid) {
      setStatusMsg({ kind: 'error', text: check.error || 'Vui lòng trả lời đủ 7 câu hỏi khảo sát.' });
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitSurvey(surveyType, list);
      setStatusMsg({
        kind: 'success',
        text: `Đã ghi nhận bài khảo sát (${surveyType === 'before' ? 'Trước' : 'Sau'} khi sử dụng EDU SMART) · Điểm trung bình: ${check.average.toFixed(2)}/5.`,
      });
    } catch (err: any) {
      setStatusMsg({ kind: 'error', text: err?.message || 'Không thể lưu khảo sát.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 sm:p-8">
        <p className="text-xs font-extrabold tracking-widest uppercase text-[#13a887] mb-2">
          Đánh giá năng lực tự học
        </p>
        <h2 className="text-2xl font-bold text-[#174b78] mb-2">
          Khảo sát trước và sau khi sử dụng EDU SMART
        </h2>
        <p className="text-sm text-[#52677e] mb-6">
          Hãy chọn mức độ phù hợp với bản thân. Không có câu trả lời đúng hoặc sai.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="surveyType" className="block text-sm font-bold text-[#19324d] mb-2">
              Đợt khảo sát
            </label>
            <select
              id="surveyType"
              value={surveyType}
              onChange={(e) => setSurveyType(e.target.value === 'after' ? 'after' : 'before')}
              className="w-full max-w-md border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1677d2]"
            >
              <option value="before">Trước khi sử dụng EDU SMART</option>
              <option value="after">Sau khi sử dụng EDU SMART</option>
            </select>
          </div>

          <div className="space-y-4">
            {SURVEY_ITEMS.map((question, qIdx) => (
              <fieldset
                key={question}
                className="border border-[#dce6f0] rounded-xl p-4 sm:p-5 bg-[#fafcff]"
              >
                <legend className="text-sm font-bold text-[#19324d] px-1">
                  {qIdx + 1}. {question}
                </legend>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  {SURVEY_CHOICES.map((choice) => {
                    const checked = answers[qIdx] === choice.value;
                    return (
                      <label
                        key={choice.value}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'bg-[#eaf6ff] border-[#1677d2] text-[#105ca8] font-semibold'
                            : 'bg-white border-[#dce6f0] text-[#52677e] hover:border-[#b7d3ec]'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`survey-${qIdx}`}
                          value={choice.value}
                          checked={checked}
                          onChange={() => handleSelect(qIdx, choice.value)}
                          className="accent-[#1677d2]"
                        />
                        <span>{choice.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          {statusMsg && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                statusMsg.kind === 'success'
                  ? 'bg-[#e6faf4] text-[#08775e] border border-[#b2ebdc]'
                  : 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {submitting ? 'Đang lưu khảo sát...' : 'Gửi khảo sát'}
          </button>
        </form>
      </div>

      {surveys.length > 0 && (
        <div className="bg-white border border-[#dce6f0] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#174b78] mb-3">
            Lịch sử khảo sát đã ghi nhận ({surveys.length})
          </h3>
          <div className="divide-y divide-[#e8eff6]">
            {surveys.map((item) => (
              <div key={item.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-[#19324d]">
                  {item.surveyType === 'before'
                    ? 'Trước khi sử dụng EDU SMART'
                    : 'Sau khi sử dụng EDU SMART'}
                </span>
                <span className="font-mono-tabular text-[#1677d2] font-bold">
                  {Number(item.average).toFixed(2)}/5.00
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
