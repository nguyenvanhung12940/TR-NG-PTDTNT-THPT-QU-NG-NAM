import React, { useState } from 'react';
import { BookOpen, BrainCircuit, CalendarCheck, CheckCircle2, FileSearch, LineChart, Sparkles } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: 'study' | 'survey' | 'progress' | 'workspace') => void;
}

const MODULES = [
  {
    code: '01. STUDY PLAN',
    desc: 'Lập nhiệm vụ, xác định mục tiêu và điều chỉnh kế hoạch học tập phù hợp lịch nội trú.',
    icon: CalendarCheck,
  },
  {
    code: '02. THINK FIRST',
    desc: 'Trình bày suy nghĩ, lập luận và mức độ tự tin trước khi sử dụng AI.',
    icon: BrainCircuit,
  },
  {
    code: '03. AI COACH',
    desc: 'Trợ lý AI gợi mở, đặt câu hỏi và hướng dẫn học sinh từng bước.',
    icon: Sparkles,
  },
  {
    code: '04. FACT CHECK',
    desc: 'Kiểm tra nguồn, đối chiếu sách giáo khoa và đánh giá câu trả lời AI.',
    icon: FileSearch,
  },
  {
    code: '05. SELF TEST',
    desc: 'Tự kiểm tra kiến thức, giải thích bằng ngôn ngữ bản thân và vận dụng.',
    icon: CheckCircle2,
  },
  {
    code: 'THEO DÕI TIẾN ĐỘ',
    desc: 'Ghi nhận hoạt động học tập và theo dõi sự tiến bộ theo thời gian.',
    icon: LineChart,
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-[#e5f4ff] to-[#e4fbf4] border border-[#d6e9f8] p-6 sm:p-10 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs font-extrabold tracking-widest uppercase text-[#13a887] mb-3">
              Hệ sinh thái học tập thông minh
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#125d9e] leading-[1.15] tracking-tight text-balance mb-4">
              Học tập chủ động.
              <br />
              Tư duy độc lập.
            </h1>
            <p className="text-base text-[#3b5772] max-w-xl leading-relaxed mb-7">
              EDU SMART đồng hành cùng học sinh Trường PTDTNT THPT Quảng Nam trong việc xây dựng thói quen tự học, rèn luyện tư duy phản biện và sử dụng trí tuệ nhân tạo một cách có trách nhiệm.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('study')}
                className="px-5 py-3 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] transition-colors whitespace-nowrap shrink-0"
              >
                Bắt đầu học tập
              </button>
              <button
                type="button"
                onClick={() => onNavigate('survey')}
                className="px-5 py-3 rounded-xl bg-white border border-[#cfe2f3] text-[#1677d2] text-sm font-bold hover:bg-[#eaf6ff] transition-colors whitespace-nowrap shrink-0"
              >
                Thực hiện khảo sát
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex">
            <div className="w-full bg-white rounded-2xl border border-[#dce6f0] overflow-hidden flex flex-col">
              <div className="relative w-full aspect-[4/3] bg-[#eaf6ff] overflow-hidden">
                {!imgError ? (
                  <img
                    src="/src/assets/images/hero_edusmart_learning_1795598387741.jpg"
                    alt="Học sinh Trường PTDTNT THPT Quảng Nam thảo luận học tập chủ động"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#eaf6ff] to-[#e6faf4]">
                    <BookOpen className="w-12 h-12 text-[#1677d2] mb-2" />
                    <span className="text-sm font-bold text-[#123e68]">
                      Chủ động mỗi ngày
                    </span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold text-[#123e68]">Chủ động mỗi ngày</h2>
                <p className="text-sm text-[#52677e] mt-1">
                  Học có kế hoạch · Nghĩ trước · Kiểm chứng · Tự đánh giá
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="text-2xl font-bold text-[#174b78] mb-5">
          05 phân hệ học tập
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <article
                key={mod.code}
                className="bg-white border border-[#dce6f0] rounded-2xl p-6 transition-colors hover:border-[#b7d3ec]"
              >
                <Icon className="w-7 h-7 text-[#1677d2] mb-3" aria-hidden="true" />
                <h3 className="text-base font-bold text-[#205c8d] mb-2">{mod.code}</h3>
                <p className="text-sm text-[#52677e] leading-relaxed">{mod.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="workflow-heading">
        <h2 id="workflow-heading" className="text-2xl font-bold text-[#174b78] mb-4">
          Quy trình học tập thông minh
        </h2>
        <div className="bg-white border border-[#dce6f0] rounded-2xl p-6">
          <ol className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-sm">
            {[
              { step: '01', title: 'Lập kế hoạch', sub: 'Study Plan' },
              { step: '02', title: 'Tự suy nghĩ', sub: 'Think First' },
              { step: '03', title: 'Nhận gợi mở', sub: 'AI Coach' },
              { step: '04', title: 'Kiểm chứng', sub: 'Fact Check' },
              { step: '05', title: 'Tự kiểm tra', sub: 'Self Test' },
            ].map((item) => (
              <li
                key={item.step}
                className="p-4 rounded-xl bg-[#f5faff] border border-[#e2ecf6]"
              >
                <span className="font-mono-tabular text-xs font-bold text-[#13a887]">
                  Bước {item.step}
                </span>
                <div className="font-bold text-[#123e68] mt-1">{item.title}</div>
                <div className="text-xs text-[#52677e] mt-0.5">{item.sub}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
};
