import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  aiInteractions,
  factChecks,
  selfTests,
  studyTasks,
  surveys,
  thinkEntries,
  users,
} from './schema.ts';

const ADMIN_EMAIL = 'hainguyenbtm.070589@gmail.com';

export async function getOrCreateUser(uid: string, email: string, fullName?: string) {
  try {
    const isBootstrapAdmin = email.toLowerCase() === ADMIN_EMAIL;
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName: fullName?.trim() || email.split('@')[0] || 'Học sinh EDU SMART',
        role: isBootstrapAdmin ? 'admin' : 'student',
        teacherApproved: isBootstrapAdmin,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Không thể đồng bộ tài khoản người dùng.', { cause: error });
  }
}

export async function getUserBundle(uid: string) {
  try {
    const [userRow] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userRow) return null;

    const [tasks, thinks, aiLogs, facts, tests, surveyRows] = await Promise.all([
      db.select().from(studyTasks).where(eq(studyTasks.userId, userRow.id)).orderBy(desc(studyTasks.createdAt)),
      db.select().from(thinkEntries).where(eq(thinkEntries.userId, userRow.id)).orderBy(desc(thinkEntries.createdAt)),
      db.select().from(aiInteractions).where(eq(aiInteractions.userId, userRow.id)).orderBy(desc(aiInteractions.createdAt)),
      db.select().from(factChecks).where(eq(factChecks.userId, userRow.id)).orderBy(desc(factChecks.createdAt)),
      db.select().from(selfTests).where(eq(selfTests.userId, userRow.id)).orderBy(desc(selfTests.createdAt)),
      db.select().from(surveys).where(eq(surveys.userId, userRow.id)).orderBy(desc(surveys.createdAt)),
    ]);

    return {
      profile: userRow,
      tasks,
      thinks,
      aiLogs,
      facts,
      tests,
      surveys: surveyRows,
    };
  } catch (error) {
    console.error('Database query failed in getUserBundle:', error);
    throw new Error('Không thể tải dữ liệu học tập từ cơ sở dữ liệu.', { cause: error });
  }
}

export async function updateUserProfileRecord(
  uid: string,
  payload: {
    fullName: string;
    role: 'student' | 'teacher';
    birthDate: string;
    className: string;
    homeroom: string;
    subjectTeacher: string;
    phone: string;
  }
) {
  try {
    const [existing] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!existing) throw new Error('Không tìm thấy tài khoản.');

    const safeRole =
      existing.role === 'admin'
        ? 'admin'
        : payload.role === 'teacher'
          ? 'teacher'
          : 'student';

    const [updated] = await db
      .update(users)
      .set({
        fullName: payload.fullName.slice(0, 120),
        role: safeRole,
        birthDate: payload.birthDate.slice(0, 20),
        className: payload.className.slice(0, 40),
        homeroom: payload.homeroom.slice(0, 40),
        subjectTeacher: payload.subjectTeacher.slice(0, 80),
        phone: payload.phone.slice(0, 30),
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return updated;
  } catch (error) {
    console.error('Database query failed in updateUserProfileRecord:', error);
    throw new Error('Không thể cập nhật hồ sơ cá nhân.', { cause: error });
  }
}

export async function insertStudyTask(
  userId: number,
  input: {
    name: string;
    subject: string;
    goal: string;
    dueDate: string;
    studySlot: string;
    googleTaskId?: string | null;
  }
) {
  try {
    const [created] = await db
      .insert(studyTasks)
      .values({
        userId,
        name: input.name.slice(0, 200),
        subject: input.subject.slice(0, 100),
        goal: input.goal.slice(0, 300),
        dueDate: input.dueDate.slice(0, 20),
        studySlot: input.studySlot.slice(0, 100),
        done: false,
        googleTaskId: input.googleTaskId ?? null,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in insertStudyTask:', error);
    throw new Error('Không thể lưu nhiệm vụ học tập.', { cause: error });
  }
}

export async function updateStudyTaskDone(userId: number, taskId: number, done: boolean) {
  try {
    const [updated] = await db
      .update(studyTasks)
      .set({ done })
      .where(and(eq(studyTasks.id, taskId), eq(studyTasks.userId, userId)))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database query failed in updateStudyTaskDone:', error);
    throw new Error('Không thể cập nhật trạng thái nhiệm vụ.', { cause: error });
  }
}

export async function removeStudyTask(userId: number, taskId: number) {
  try {
    const [deleted] = await db
      .delete(studyTasks)
      .where(and(eq(studyTasks.id, taskId), eq(studyTasks.userId, userId)))
      .returning();
    return deleted;
  } catch (error) {
    console.error('Database query failed in removeStudyTask:', error);
    throw new Error('Không thể xóa nhiệm vụ.', { cause: error });
  }
}

export async function insertThinkEntry(
  userId: number,
  input: { subject: string; question: string; answer: string; confidence: string }
) {
  try {
    const [created] = await db
      .insert(thinkEntries)
      .values({
        userId,
        subject: input.subject.slice(0, 100),
        question: input.question.slice(0, 500),
        answer: input.answer.slice(0, 3000),
        confidence: input.confidence.slice(0, 80),
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in insertThinkEntry:', error);
    throw new Error('Không thể lưu suy nghĩ ban đầu.', { cause: error });
  }
}

export async function insertAiInteraction(
  userId: number,
  input: { subject: string; question: string; thinkContext: string; guidance: string; modelUsed: string }
) {
  try {
    const [created] = await db
      .insert(aiInteractions)
      .values({
        userId,
        subject: input.subject.slice(0, 100),
        question: input.question.slice(0, 2000),
        thinkContext: input.thinkContext.slice(0, 3000),
        guidance: input.guidance.slice(0, 8000),
        modelUsed: input.modelUsed.slice(0, 80),
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in insertAiInteraction:', error);
    throw new Error('Không thể lưu lịch sử AI Coach.', { cause: error });
  }
}

export async function insertFactCheck(
  userId: number,
  input: { content: string; source: string; conclusion: string }
) {
  try {
    const [created] = await db
      .insert(factChecks)
      .values({
        userId,
        content: input.content.slice(0, 3000),
        source: input.source.slice(0, 1000),
        conclusion: input.conclusion.slice(0, 2000),
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in insertFactCheck:', error);
    throw new Error('Không thể lưu phiếu kiểm chứng.', { cause: error });
  }
}

export async function insertSelfTest(
  userId: number,
  input: { subject: string; lesson: string; explain: string; apply: string; level: string }
) {
  try {
    const [created] = await db
      .insert(selfTests)
      .values({
        userId,
        subject: input.subject.slice(0, 100),
        lesson: input.lesson.slice(0, 200),
        explain: input.explain.slice(0, 3000),
        apply: input.apply.slice(0, 3000),
        level: input.level.slice(0, 80),
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in insertSelfTest:', error);
    throw new Error('Không thể lưu bài tự kiểm tra.', { cause: error });
  }
}

export async function insertSurvey(
  userId: number,
  input: { surveyType: 'before' | 'after'; answers: number[]; average: number }
) {
  try {
    const [created] = await db
      .insert(surveys)
      .values({
        userId,
        surveyType: input.surveyType,
        answers: input.answers,
        averageScore: input.average.toFixed(2),
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in insertSurvey:', error);
    throw new Error('Không thể lưu khảo sát.', { cause: error });
  }
}

export async function listPendingTeachers() {
  try {
    return await db
      .select({
        id: users.id,
        uid: users.uid,
        fullName: users.fullName,
        email: users.email,
        homeroom: users.homeroom,
        subjectTeacher: users.subjectTeacher,
        teacherApproved: users.teacherApproved,
      })
      .from(users)
      .where(eq(users.role, 'teacher'));
  } catch (error) {
    console.error('Database query failed in listPendingTeachers:', error);
    throw new Error('Không thể tải danh sách giáo viên.', { cause: error });
  }
}

export async function approveTeacherByUid(targetUid: string, approved: boolean) {
  try {
    const [updated] = await db
      .update(users)
      .set({ teacherApproved: approved, updatedAt: new Date() })
      .where(eq(users.uid, targetUid))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database query failed in approveTeacherByUid:', error);
    throw new Error('Không thể phê duyệt tài khoản giáo viên.', { cause: error });
  }
}
