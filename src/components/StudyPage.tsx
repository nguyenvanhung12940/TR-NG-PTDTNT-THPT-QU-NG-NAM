import React, { useState } from 'react';
import {
  AiCoachLogItem,
  CONFIDENCE_LEVELS,
  FactCheckItem,
  HIGH_SCHOOL_SUBJECTS,
  SELF_TEST_LEVELS,
  SelfTestItem,
  STUDY_TIME_SLOTS,
  StudyTaskItem,
  THINK_QUESTIONS,
  ThinkEntryItem,
  validateFactCheckInput,
  validateSelfTestInput,
  validateStudyTaskInput,
  validateThinkEntryInput,
} from '../utils/edusmart';
import { PendingConfirmation } from './ConfirmActionModal';

interface StudyPageProps {
  tasks: StudyTaskItem[];
  thinks: ThinkEntryItem[];
  aiLogs: AiCoachLogItem[];
  factChecks: FactCheckItem[];
  selfTests: SelfTestItem[];
  hasWorkspaceToken: boolean;
  onAddTask: (input: {
    name: string;
    subject: string;
    goal: string;
    dueDate: string;
    studySlot: string;
  }) => Promise<void>;
  onToggleTask: (taskId: string, done: boolean) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAddThink: (input: {
    subject: string;
    question: string;
    answer: string;
    confidence: string;
  }) => Promise<void>;
  onAskAiCoach: (input: {
    subject: string;
    question: string;
    thinkContext: string;
  }) => Promise<{ guidance: string; modelUsed: string }>;
  onAddFactCheck: (input: {
    content: string;
    source: string;
    conclusion: string;
  }) => Promise<void>;
  onAddSelfTest: (input: {
    subject: string;
    lesson: string;
    explain: string;
    apply: string;
    level: string;
  }) => Promise<void>;
  onSyncTaskToGoogleTasks: (task: StudyTaskItem) => Promise<void>;
  onSaveGuidanceToGoogleDocs: (title: string, content: string) => Promise<string>;
  onRequestConfirm: (pending: PendingConfirmation) => void;
  onRequireSignIn: () => void;
}

export const StudyPage: React.FC<StudyPageProps> = ({
  tasks,
  thinks,
  aiLogs,
  factChecks,
  selfTests,
  hasWorkspaceToken,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onAddThink,
  onAskAiCoach,
  onAddFactCheck,
  onAddSelfTest,
  onSyncTaskToGoogleTasks,
  onSaveGuidanceToGoogleDocs,
  onRequestConfirm,
  onRequireSignIn,
}) => {
  const [activeModule, setActiveModule] = useState<'all' | 'plan' | 'think' | 'coach' | 'fact' | 'test'>('all');

  // 01. STUDY PLAN
  const [taskName, setTaskName] = useState('');
  const [taskSubject, setTaskSubject] = useState<string>(HIGH_SCHOOL_SUBJECTS[0]);
  const [taskGoal, setTaskGoal] = useState('');
  const [taskDate, setTaskDate] = useState('2026-12-01');
  const [taskTime, setTaskTime] = useState<string>(STUDY_TIME_SLOTS[0]);
  const [taskFeedback, setTaskFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // 02. THINK FIRST
  const [thinkSubject, setThinkSubject] = useState<string>(HIGH_SCHOOL_SUBJECTS[0]);
  const [thinkQuestion, setThinkQuestion] = useState<string>(THINK_QUESTIONS[0]);
  const [thinkAnswer, setThinkAnswer] = useState('');
  const [thinkConfidence, setThinkConfidence] = useState<string>(CONFIDENCE_LEVELS[0]);
  const [thinkFeedback, setThinkFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // 03. AI COACH
  const [aiSubject, setAiSubject] = useState<string>(HIGH_SCHOOL_SUBJECTS[0]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ kind: 'success' | 'error'; text: string; docUrl?: string } | null>(null);
  const [latestGuidance, setLatestGuidance] = useState<{ guidance: string; modelUsed: string } | null>(null);

  // 04. FACT CHECK
  const [factContent, setFactContent] = useState('');
  const [factSource, setFactSource] = useState('');
  const [factConclusion, setFactConclusion] = useState('');
  const [factFeedback, setFactFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // 05. SELF TEST
  const [testSubject, setTestSubject] = useState<string>(HIGH_SCHOOL_SUBJECTS[0]);
  const [testLesson, setTestLesson] = useState('');
  const [testExplain, setTestExplain] = useState('');
  const [testApply, setTestApply] = useState('');
  const [testLevel, setTestLevel] = useState<string>(SELF_TEST_LEVELS[0]);
  const [testFeedback, setTestFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateStudyTaskInput({
      name: taskName,
      subject: taskSubject,
      goal: taskGoal,
      dueDate: taskDate,
      studySlot: taskTime,
    });
    if (!check.valid) {
      setTaskFeedback({ kind: 'error', text: check.error });
      return;
    }
    try {
      await onAddTask(check.data);
      setTaskName('');
      setTaskGoal('');
      setTaskFeedback({ kind: 'success', text: 'Đã thêm nhiệm vụ học tập mới.' });
    } catch (err: any) {
      setTaskFeedback({ kind: 'error', text: err?.message || 'Không thể lưu nhiệm vụ.' });
    }
  };

  const handleThinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateThinkEntryInput({
      subject: thinkSubject,
      question: thinkQuestion,
      answer: thinkAnswer,
      confidence: thinkConfidence,
    });
    if (!check.valid) {
      setThinkFeedback({ kind: 'error', text: check.error });
      return;
    }
    try {
      await onAddThink(check.data);
      setThinkAnswer('');
      setThinkFeedback({
        kind: 'success',
        text: 'Đã ghi nhận suy nghĩ ban đầu. Hệ thống chú trọng quá trình lập luận, không chỉ kết quả đúng hoặc sai.',
      });
    } catch (err: any) {
      setThinkFeedback({ kind: 'error', text: err?.message || 'Không thể lưu suy nghĩ ban đầu.' });
    }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = aiQuestion.trim();
    if (!q) {
      setAiFeedback({ kind: 'error', text: 'Vui lòng nhập câu hỏi hoặc nội dung em đang gặp khó khăn.' });
      return;
    }
    setAiLoading(true);
    setAiFeedback(null);
    const latestThink = thinks[0]?.answer || '';
    try {
      const result = await onAskAiCoach({
        subject: aiSubject,
        question: q,
        thinkContext: latestThink,
      });
      setLatestGuidance(result);
    } catch (err: any) {
      setAiFeedback({ kind: 'error', text: err?.message || 'Không thể nhận gợi mở từ AI Coach.' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleFactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateFactCheckInput({
      content: factContent,
      source: factSource,
      conclusion: factConclusion,
    });
    if (!check.valid) {
      setFactFeedback({ kind: 'error', text: check.error });
      return;
    }
    try {
      await onAddFactCheck(check.data);
      setFactContent('');
      setFactSource('');
      setFactConclusion('');
      setFactFeedback({ kind: 'success', text: 'Đã ghi nhận phiếu kiểm chứng thông tin.' });
    } catch (err: any) {
      setFactFeedback({ kind: 'error', text: err?.message || 'Không thể lưu phiếu kiểm chứng.' });
    }
  };

  const handleSelfTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateSelfTestInput({
      subject: testSubject,
      lesson: testLesson,
      explain: testExplain,
      apply: testApply,
      level: testLevel,
    });
    if (!check.valid) {
      setTestFeedback({ kind: 'error', text: check.error });
      return;
    }
    try {
      await onAddSelfTest(check.data);
      setTestLesson('');
      setTestExplain('');
      setTestApply('');
      setTestFeedback({ kind: 'success', text: 'Đã ghi nhận bài tự kiểm tra.' });
    } catch (err: any) {
      setTestFeedback({ kind: 'error', text: err?.message || 'Không thể lưu bài tự kiểm tra.' });
    }
  };

  const promptGoogleTasksSync = (task: StudyTaskItem) => {
    if (!hasWorkspaceToken) {
      onRequireSignIn();
      return;
    }
    onRequestConfirm({
      title: 'Đồng bộ nhiệm vụ lên Google Tasks?',
      description: `Ứng dụng sẽ tạo một công việc mới trên Google Tasks với tiêu đề "[${task.subject}] ${task.name}" và hạn ${task.dueDate}.`,
      confirmLabel: 'Tạo trên Google Tasks',
      onConfirm: async () => {
        await onSyncTaskToGoogleTasks(task);
        setTaskFeedback({ kind: 'success', text: `Đã đồng bộ "${task.name}" sang Google Tasks.` });
      },
    });
  };

  const promptSaveToDocs = () => {
    if (!latestGuidance) return;
    if (!hasWorkspaceToken) {
      onRequireSignIn();
      return;
    }
    const title = `EDU SMART · Gợi mở ${aiSubject}`;
    const body = `Môn học: ${aiSubject}\nCâu hỏi: ${aiQuestion}\n\nGợi mở từ AI Coach:\n${latestGuidance.guidance}\n`;
    onRequestConfirm({
      title: 'Lưu ghi chú gợi mở sang Google Docs?',
      description: `Ứng dụng sẽ tạo tài liệu mới trên Google Docs có tên "${title}" trong tài khoản của bạn.`,
      confirmLabel: 'Tạo Google Doc',
      onConfirm: async () => {
        const docUrl = await onSaveGuidanceToGoogleDocs(title, body);
        setAiFeedback({
          kind: 'success',
          text: 'Đã tạo tài liệu ghi chú học tập trên Google Docs.',
          docUrl,
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[#174b78]">Không gian học tập</h2>
        <div
          className="flex flex-wrap items-center gap-1 p-1 bg-[#eaf2fa] rounded-xl"
          role="tablist"
          aria-label="Chọn phân hệ học tập"
        >
          {(
            [
              ['all', 'Tất cả'],
              ['plan', '01. Study Plan'],
              ['think', '02. Think First'],
              ['coach', '03. AI Coach'],
              ['fact', '04. Fact Check'],
              ['test', '05. Self Test'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeModule === id}
              onClick={() => setActiveModule(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                activeModule === id
                  ? 'bg-white text-[#1677d2] shadow-sm'
                  : 'text-[#52677e] hover:text-[#19324d]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 01. STUDY PLAN */}
      {(activeModule === 'all' || activeModule === 'plan') && (
      <section className="bg-white border border-[#dce6f0] rounded-2xl p-6 sm:p-7" aria-labelledby="study-plan-heading">
        <h3 id="study-plan-heading" className="text-lg font-bold text-[#174b78] mb-4">
          01. STUDY PLAN – Lập kế hoạch học tập
        </h3>
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="taskName" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Nhiệm vụ học tập
              </label>
              <input
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Ví dụ: Ôn tập bài 5 Lịch sử"
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
              />
            </div>
            <div>
              <label htmlFor="taskSubject" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Môn học
              </label>
              <select
                id="taskSubject"
                value={taskSubject}
                onChange={(e) => setTaskSubject(e.target.value)}
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1677d2]"
              >
                {HIGH_SCHOOL_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="taskGoal" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Mục tiêu
              </label>
              <input
                id="taskGoal"
                value={taskGoal}
                onChange={(e) => setTaskGoal(e.target.value)}
                placeholder="Ví dụ: Nắm vững kiến thức trọng tâm"
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
              />
            </div>
            <div>
              <label htmlFor="taskDate" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Hạn hoàn thành
              </label>
              <input
                id="taskDate"
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="taskTime" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Thời gian dự kiến trong giờ tự học
            </label>
            <select
              id="taskTime"
              value={taskTime}
              onChange={(e) => setTaskTime(e.target.value)}
              className="w-full md:max-w-md border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1677d2]"
            >
              {STUDY_TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          {taskFeedback && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-xl px-4 py-2.5 text-sm ${
                taskFeedback.kind === 'success'
                  ? 'bg-[#e6faf4] text-[#08775e]'
                  : 'bg-[#fef2f2] text-[#b91c1c]'
              }`}
            >
              {taskFeedback.text}
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] transition-colors whitespace-nowrap"
          >
            Thêm nhiệm vụ
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#e8eff6]">
          <h4 className="text-sm font-bold text-[#19324d] mb-3">
            Danh sách nhiệm vụ ({tasks.length})
          </h4>
          {tasks.length === 0 ? (
            <p className="text-sm text-[#52677e]">
              Chưa có nhiệm vụ nào. Hãy lập nhiệm vụ đầu tiên cho giờ tự học hôm nay.
            </p>
          ) : (
            <ul className="space-y-3" data-testid="study-task-list">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="border border-[#dce6f0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafcff]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <input
                        id={`task-done-${task.id}`}
                        type="checkbox"
                        checked={task.done}
                        onChange={(e) => onToggleTask(task.id, e.target.checked)}
                        className="w-4 h-4 accent-[#13a887]"
                      />
                      <label
                        htmlFor={`task-done-${task.id}`}
                        className={`text-sm font-bold cursor-pointer ${
                          task.done ? 'line-through text-[#64748b]' : 'text-[#123e68]'
                        }`}
                      >
                        {task.name}
                      </label>
                    </div>
                    <p className="text-xs text-[#52677e] pl-6">
                      {task.subject} · Hạn: <span className="font-mono-tabular">{task.dueDate}</span> · {task.studySlot}
                    </p>
                    <p className="text-xs text-[#3b5772] pl-6">Mục tiêu: {task.goal}</p>
                  </div>

                  <div className="flex items-center gap-2 pl-6 sm:pl-0 shrink-0">
                    <button
                      type="button"
                      onClick={() => promptGoogleTasksSync(task)}
                      className="px-3 py-1.5 rounded-lg border border-[#cfe2f3] bg-white text-xs font-semibold text-[#1677d2] hover:bg-[#eaf6ff] transition-colors whitespace-nowrap"
                    >
                      Đồng bộ Google Tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      aria-label={`Xóa nhiệm vụ ${task.name}`}
                      className="px-3 py-1.5 rounded-lg border border-[#e5d5d5] bg-white text-xs font-semibold text-[#b91c1c] hover:bg-[#fef2f2] transition-colors whitespace-nowrap"
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      )}

      {/* 02. THINK FIRST */}
      {(activeModule === 'all' || activeModule === 'think') && (
      <section className="bg-white border border-[#dce6f0] rounded-2xl p-6 sm:p-7" aria-labelledby="think-first-heading">
        <h3 id="think-first-heading" className="text-lg font-bold text-[#174b78] mb-4">
          02. THINK FIRST – Tư duy trước khi sử dụng AI
        </h3>
        <form onSubmit={handleThinkSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="thinkSubject" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Chọn môn học
              </label>
              <select
                id="thinkSubject"
                value={thinkSubject}
                onChange={(e) => setThinkSubject(e.target.value)}
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1677d2]"
              >
                {HIGH_SCHOOL_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="thinkConfidence" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Mức độ tự tin
              </label>
              <select
                id="thinkConfidence"
                value={thinkConfidence}
                onChange={(e) => setThinkConfidence(e.target.value)}
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1677d2]"
              >
                {CONFIDENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="thinkQuestion" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Câu hỏi gợi ý
            </label>
            <select
              id="thinkQuestion"
              value={thinkQuestion}
              onChange={(e) => setThinkQuestion(e.target.value)}
              className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1677d2]"
            >
              {THINK_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="thinkAnswer" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Suy nghĩ và lập luận ban đầu của em
            </label>
            <textarea
              id="thinkAnswer"
              rows={4}
              value={thinkAnswer}
              onChange={(e) => setThinkAnswer(e.target.value)}
              placeholder="Hãy trình bày suy nghĩ của em trước khi hỏi AI..."
              className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
            />
          </div>

          {thinkFeedback && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-xl px-4 py-2.5 text-sm ${
                thinkFeedback.kind === 'success'
                  ? 'bg-[#e6faf4] text-[#08775e]'
                  : 'bg-[#fef2f2] text-[#b91c1c]'
              }`}
            >
              {thinkFeedback.text}
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] transition-colors whitespace-nowrap"
          >
            Lưu suy nghĩ ban đầu
          </button>
        </form>
      </section>
      )}

      {/* 03. AI COACH */}
      {(activeModule === 'all' || activeModule === 'coach') && (
      <section className="bg-white border border-[#dce6f0] rounded-2xl p-6 sm:p-7" aria-labelledby="ai-coach-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 id="ai-coach-heading" className="text-lg font-bold text-[#174b78]">
            03. AI COACH – Trợ lý AI gợi mở
          </h3>
          <span className="text-xs font-medium text-[#52677e]">
            Chế độ tư duy sâu · Gợi ý từng bước, không giải thay
          </span>
        </div>

        <form onSubmit={handleAskAI} className="space-y-4">
          <div>
            <label htmlFor="aiSubject" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Môn học cần hỗ trợ
            </label>
            <select
              id="aiSubject"
              value={aiSubject}
              onChange={(e) => setAiSubject(e.target.value)}
              className="w-full md:max-w-md border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1677d2]"
            >
              {HIGH_SCHOOL_SUBJECTS.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="aiQuestion" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Nội dung em cần hỗ trợ
            </label>
            <textarea
              id="aiQuestion"
              rows={4}
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Nhập câu hỏi hoặc nội dung em đang gặp khó khăn..."
              className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={aiLoading}
              className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {aiLoading ? 'AI Coach đang phân tích...' : 'Yêu cầu gợi mở'}
            </button>

            {latestGuidance && (
              <button
                type="button"
                onClick={promptSaveToDocs}
                className="px-4 py-2.5 rounded-xl border border-[#cfe2f3] bg-[#f5faff] text-[#1677d2] text-sm font-semibold hover:bg-[#eaf6ff] transition-colors whitespace-nowrap"
              >
                Lưu ghi chú sang Google Docs
              </button>
            )}
          </div>
        </form>

        {aiFeedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              aiFeedback.kind === 'success'
                ? 'bg-[#e6faf4] text-[#08775e]'
                : 'bg-[#fff8e8] text-[#795b1d] border border-[#f4dfae]'
            }`}
          >
            <span>{aiFeedback.text}</span>
            {aiFeedback.docUrl && (
              <>
                {' '}
                <a
                  href={aiFeedback.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold"
                >
                  Mở Google Docs
                </a>
              </>
            )}
          </div>
        )}

        {latestGuidance && (
          <div className="mt-5 rounded-xl bg-[#f5faff] border border-[#cfe2f3] p-5 space-y-2">
            <div className="text-xs font-bold text-[#13a887]">
              Gợi mở từ AI Coach ({latestGuidance.modelUsed})
            </div>
            <div className="text-sm text-[#19324d] whitespace-pre-wrap leading-relaxed">
              {latestGuidance.guidance}
            </div>
          </div>
        )}

        {aiLogs.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#e8eff6]">
            <h4 className="text-sm font-bold text-[#19324d] mb-2">
              Lượt gợi mở gần đây ({aiLogs.length})
            </h4>
            <ul className="space-y-2 text-xs text-[#52677e]">
              {aiLogs.slice(0, 3).map((log) => (
                <li key={log.id} className="p-3 rounded-lg bg-[#fafcff] border border-[#e2ecf6]">
                  <span className="font-bold text-[#123e68]">{log.subject}</span> · {log.question}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      )}

      {/* 04. FACT CHECK */}
      {(activeModule === 'all' || activeModule === 'fact') && (
      <section className="bg-white border border-[#dce6f0] rounded-2xl p-6 sm:p-7" aria-labelledby="fact-check-heading">
        <h3 id="fact-check-heading" className="text-lg font-bold text-[#174b78] mb-4">
          04. FACT CHECK – Kiểm chứng thông tin
        </h3>
        <form onSubmit={handleFactSubmit} className="space-y-4">
          <div>
            <label htmlFor="factContent" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Thông tin hoặc câu trả lời AI cần kiểm chứng
            </label>
            <textarea
              id="factContent"
              rows={3}
              value={factContent}
              onChange={(e) => setFactContent(e.target.value)}
              placeholder="Dán nội dung cần kiểm chứng..."
              className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
            />
          </div>
          <div>
            <label htmlFor="factSource" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Nguồn đối chiếu (SGK, tài liệu, đường dẫn)
            </label>
            <textarea
              id="factSource"
              rows={2}
              value={factSource}
              onChange={(e) => setFactSource(e.target.value)}
              placeholder="Ghi tên sách, bài học, trang hoặc đường dẫn nguồn..."
              className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
            />
          </div>
          <div>
            <label htmlFor="factConclusion" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Nhận xét và kết luận của em
            </label>
            <textarea
              id="factConclusion"
              rows={3}
              value={factConclusion}
              onChange={(e) => setFactConclusion(e.target.value)}
              placeholder="Nội dung nào chính xác? Nội dung nào cần kiểm tra thêm? Vì sao?"
              className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
            />
          </div>

          {factFeedback && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-xl px-4 py-2.5 text-sm ${
                factFeedback.kind === 'success'
                  ? 'bg-[#e6faf4] text-[#08775e]'
                  : 'bg-[#fef2f2] text-[#b91c1c]'
              }`}
            >
              {factFeedback.text}
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] transition-colors whitespace-nowrap"
          >
            Lưu phiếu kiểm chứng
          </button>
        </form>

        {factChecks.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#e8eff6] text-xs text-[#52677e]">
            Đã lưu <span className="font-mono-tabular font-bold text-[#123e68]">{factChecks.length}</span> phiếu kiểm chứng.
          </div>
        )}
      </section>
      )}

      {/* 05. SELF TEST */}
      {(activeModule === 'all' || activeModule === 'test') && (
      <section className="bg-white border border-[#dce6f0] rounded-2xl p-6 sm:p-7" aria-labelledby="self-test-heading">
        <h3 id="self-test-heading" className="text-lg font-bold text-[#174b78] mb-4">
          05. SELF TEST – Tự kiểm tra kiến thức
        </h3>
        <form onSubmit={handleSelfTestSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="testSubject" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Môn học
              </label>
              <select
                id="testSubject"
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1677d2]"
              >
                {HIGH_SCHOOL_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="testLesson" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Nội dung bài học
              </label>
              <input
                id="testLesson"
                value={testLesson}
                onChange={(e) => setTestLesson(e.target.value)}
                placeholder="Nhập tên bài học"
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="testExplain" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Em hãy giải thích kiến thức bằng ngôn ngữ của mình
            </label>
            <textarea
              id="testExplain"
              rows={3}
              value={testExplain}
              onChange={(e) => setTestExplain(e.target.value)}
              placeholder="Trình bày cách hiểu của em..."
              className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
            />
          </div>

          <div>
            <label htmlFor="testApply" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Em có thể vận dụng kiến thức vào tình huống mới nào?
            </label>
            <textarea
              id="testApply"
              rows={3}
              value={testApply}
              onChange={(e) => setTestApply(e.target.value)}
              placeholder="Nêu ví dụ hoặc tình huống vận dụng..."
              className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
            />
          </div>

          <div>
            <label htmlFor="testLevel" className="block text-sm font-bold text-[#19324d] mb-1.5">
              Tự đánh giá mức độ hiểu bài
            </label>
            <select
              id="testLevel"
              value={testLevel}
              onChange={(e) => setTestLevel(e.target.value)}
              className="w-full md:max-w-md border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1677d2]"
            >
              {SELF_TEST_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {testFeedback && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-xl px-4 py-2.5 text-sm ${
                testFeedback.kind === 'success'
                  ? 'bg-[#e6faf4] text-[#08775e]'
                  : 'bg-[#fef2f2] text-[#b91c1c]'
              }`}
            >
              {testFeedback.text}
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] transition-colors whitespace-nowrap"
          >
            Hoàn thành tự kiểm tra
          </button>
        </form>

        {selfTests.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#e8eff6] text-xs text-[#52677e]">
            Đã hoàn thành <span className="font-mono-tabular font-bold text-[#123e68]">{selfTests.length}</span> bài tự kiểm tra.
          </div>
        )}
      </section>
      )}
    </div>
  );
};
