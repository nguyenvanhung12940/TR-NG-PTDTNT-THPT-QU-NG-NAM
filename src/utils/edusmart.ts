export const HIGH_SCHOOL_SUBJECTS = [
  'Toán học',
  'Ngữ văn',
  'Tiếng Anh',
  'Lịch sử',
  'Địa lí',
  'Vật lí',
  'Hóa học',
  'Sinh học',
  'Tin học',
  'Công nghệ',
  'Giáo dục kinh tế và pháp luật',
  'Giáo dục quốc phòng và an ninh',
  'Giáo dục thể chất',
  'Hoạt động trải nghiệm, hướng nghiệp',
  'Chuyên đề học tập',
] as const;

export const STUDY_TIME_SLOTS = [
  'Giờ tự học buổi tối',
  'Giờ tự học buổi chiều',
  'Thời gian cá nhân phù hợp',
] as const;

export const THINK_QUESTIONS = [
  'Vì sao cần xây dựng kế hoạch tự học phù hợp với mục tiêu?',
  'Theo em, làm thế nào để kiểm chứng một thông tin do AI cung cấp?',
  'Khi gặp một vấn đề khó, em thường lựa chọn cách giải quyết nào?',
  'Em hãy trình bày một kiến thức đã học bằng cách hiểu của mình.',
] as const;

export const CONFIDENCE_LEVELS = [
  'Rất tự tin',
  'Tương đối tự tin',
  'Chưa chắc chắn',
  'Cần được gợi ý thêm',
] as const;

export const SELF_TEST_LEVELS = [
  'Đã hiểu rõ',
  'Hiểu phần lớn nội dung',
  'Còn một số nội dung chưa hiểu',
  'Cần ôn tập lại',
] as const;

export const SURVEY_ITEMS = [
  'Em có thường tự đặt mục tiêu học tập trước khi bắt đầu học không?',
  'Em có lập kế hoạch và sắp xếp thời gian tự học phù hợp không?',
  'Khi gặp bài khó, em có tự suy nghĩ trước khi tìm lời giải không?',
  'Em có thể giải thích kiến thức bằng ngôn ngữ của bản thân không?',
  'Em có thường sử dụng AI để hỗ trợ học tập không?',
  'Em có kiểm tra nguồn và đối chiếu câu trả lời AI với sách giáo khoa không?',
  'Em có thể vận dụng kiến thức đã học vào tình huống mới không?',
] as const;

export const SURVEY_CHOICES = [
  { value: 1, label: '1 – Chưa bao giờ' },
  { value: 2, label: '2 – Hiếm khi' },
  { value: 3, label: '3 – Thỉnh thoảng' },
  { value: 4, label: '4 – Thường xuyên' },
  { value: 5, label: '5 – Luôn luôn' },
] as const;

export interface StudyTaskItem {
  id: string;
  name: string;
  subject: string;
  goal: string;
  dueDate: string;
  studySlot: string;
  done: boolean;
  googleTaskId?: string | null;
  createdAt?: string;
}

export interface ThinkEntryItem {
  id: string;
  subject: string;
  question: string;
  answer: string;
  confidence: string;
  createdAt?: string;
}

export interface AiCoachLogItem {
  id: string;
  subject: string;
  question: string;
  thinkContext: string;
  guidance: string;
  modelUsed: string;
  createdAt?: string;
}

export interface FactCheckItem {
  id: string;
  content: string;
  source: string;
  conclusion: string;
  createdAt?: string;
}

export interface SelfTestItem {
  id: string;
  subject: string;
  lesson: string;
  explain: string;
  apply: string;
  level: string;
  createdAt?: string;
}

export interface SurveyItem {
  id: string;
  surveyType: 'before' | 'after';
  answers: number[];
  average: number;
  createdAt?: string;
}

export interface UserProfileData {
  uid?: string;
  email: string;
  fullName: string;
  role: 'student' | 'teacher';
  teacherApproved: boolean;
  birthDate: string;
  className: string;
  homeroom: string;
  subjectTeacher: string;
  phone: string;
}

export function calculateTaskStats(tasks: Pick<StudyTaskItem, 'done'>[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, percent };
}

export function computeSurveyComparison(surveys: Pick<SurveyItem, 'surveyType' | 'average'>[]) {
  const before = surveys.filter((s) => s.surveyType === 'before');
  const after = surveys.filter((s) => s.surveyType === 'after');

  const avg = (items: Pick<SurveyItem, 'average'>[]) =>
    items.reduce((sum, item) => sum + Number(item.average), 0) / items.length;

  const beforeAvg = before.length > 0 ? Number(avg(before).toFixed(2)) : null;
  const afterAvg = after.length > 0 ? Number(avg(after).toFixed(2)) : null;
  const delta =
    beforeAvg !== null && afterAvg !== null
      ? Number((afterAvg - beforeAvg).toFixed(2))
      : null;

  return {
    beforeCount: before.length,
    afterCount: after.length,
    beforeAvg,
    afterAvg,
    delta,
  };
}

export function validateSurveyAnswers(answers: number[]): { valid: boolean; average: number; error?: string } {
  if (!Array.isArray(answers) || answers.length !== SURVEY_ITEMS.length) {
    return { valid: false, average: 0, error: 'Vui lòng trả lời đủ 7 câu hỏi khảo sát.' };
  }
  for (const val of answers) {
    if (!Number.isInteger(val) || val < 1 || val > 5) {
      return { valid: false, average: 0, error: 'Giá trị khảo sát phải từ 1 đến 5.' };
    }
  }
  const sum = answers.reduce((a, b) => a + b, 0);
  return {
    valid: true,
    average: Number((sum / answers.length).toFixed(2)),
  };
}

export function validateStudyTaskInput(input: {
  name: string;
  subject: string;
  goal: string;
  dueDate: string;
  studySlot: string;
}) {
  const name = input.name.trim().slice(0, 200);
  const subject = input.subject.trim().slice(0, 100);
  const goal = input.goal.trim().slice(0, 300);
  const dueDate = input.dueDate.trim().slice(0, 20);
  const studySlot = input.studySlot.trim().slice(0, 100);

  if (!name || !goal || !dueDate) {
    return { valid: false as const, error: 'Vui lòng nhập đầy đủ nhiệm vụ, mục tiêu và hạn hoàn thành.' };
  }
  return {
    valid: true as const,
    data: { name, subject: subject || HIGH_SCHOOL_SUBJECTS[0], goal, dueDate, studySlot: studySlot || STUDY_TIME_SLOTS[0] },
  };
}

export function validateThinkEntryInput(input: {
  subject: string;
  question: string;
  answer: string;
  confidence: string;
}) {
  const subject = input.subject.trim().slice(0, 100);
  const question = input.question.trim().slice(0, 500);
  const answer = input.answer.trim().slice(0, 3000);
  const confidence = input.confidence.trim().slice(0, 80);

  if (!answer) {
    return { valid: false as const, error: 'Em hãy nhập suy nghĩ ban đầu trước khi lưu.' };
  }
  return {
    valid: true as const,
    data: {
      subject: subject || HIGH_SCHOOL_SUBJECTS[0],
      question: question || THINK_QUESTIONS[0],
      answer,
      confidence: confidence || CONFIDENCE_LEVELS[0],
    },
  };
}

export function validateFactCheckInput(input: {
  content: string;
  source: string;
  conclusion: string;
}) {
  const content = input.content.trim().slice(0, 3000);
  const source = input.source.trim().slice(0, 1000);
  const conclusion = input.conclusion.trim().slice(0, 2000);

  if (!content || !source || !conclusion) {
    return { valid: false as const, error: 'Vui lòng điền đầy đủ nội dung, nguồn đối chiếu và kết luận.' };
  }
  return { valid: true as const, data: { content, source, conclusion } };
}

export function validateSelfTestInput(input: {
  subject: string;
  lesson: string;
  explain: string;
  apply: string;
  level: string;
}) {
  const subject = input.subject.trim().slice(0, 100);
  const lesson = input.lesson.trim().slice(0, 200);
  const explain = input.explain.trim().slice(0, 3000);
  const apply = input.apply.trim().slice(0, 3000);
  const level = input.level.trim().slice(0, 80);

  if (!lesson || !explain || !apply) {
    return { valid: false as const, error: 'Vui lòng nhập tên bài học, giải thích kiến thức và tình huống vận dụng.' };
  }
  return {
    valid: true as const,
    data: {
      subject: subject || HIGH_SCHOOL_SUBJECTS[0],
      lesson,
      explain,
      apply,
      level: level || SELF_TEST_LEVELS[0],
    },
  };
}

export function sanitizeWorkspaceId(rawId: string): string {
  return encodeURIComponent(rawId.trim().replace(/[^a-zA-Z0-9_\-]/g, ''));
}
