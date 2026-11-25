import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  approveTeacherByUid,
  getOrCreateUser,
  getUserBundle,
  insertAiInteraction,
  insertFactCheck,
  insertSelfTest,
  insertStudyTask,
  insertSurvey,
  insertThinkEntry,
  listPendingTeachers,
  removeStudyTask,
  updateStudyTaskDone,
  updateUserProfileRecord,
} from './src/db/repository.ts';
import {
  validateFactCheckInput,
  validateSelfTestInput,
  validateStudyTaskInput,
  validateSurveyAnswers,
  validateThinkEntryInput,
} from './src/utils/edusmart.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_EMAIL = 'hainguyenbtm.070589@gmail.com';
const PORT = Number(process.env.PORT) || 3000;

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Server-side Gemini AI Coach endpoint with ThinkingLevel.HIGH (no maxOutputTokens)
  app.post('/api/ai/coach', async (req, res) => {
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim().slice(0, 100) : 'Tổng hợp';
    const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 2000) : '';
    const thinkContext = typeof req.body?.thinkContext === 'string' ? req.body.thinkContext.trim().slice(0, 3000) : '';

    if (!question) {
      return res.status(400).json({ error: 'Vui lòng nhập câu hỏi hoặc nội dung cần AI Coach gợi mở.' });
    }

    const ai = createGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng thiết lập khóa trong Settings > Secrets.',
      });
    }

    const modelUsed = 'gemini-4-hydrogen';
    const systemInstruction = [
      'Bạn là AI Coach của hệ sinh thái học tập thông minh EDU SMART tại Trường PTDTNT THPT Quảng Nam.',
      'Nguyên tắc sư phạm bắt buộc:',
      '1. KHÔNG đưa ngay đáp án hoàn chỉnh hoặc bài làm chép sẵn.',
      '2. Phải phản hồi bằng tiếng Việt mạch lạc, khích lệ tinh thần tự học.',
      '3. Nếu học sinh đã trình bày suy nghĩ ban đầu (Think First), hãy ghi nhận điểm hợp lý và chỉ ra điểm cần đào sâu.',
      '4. Cấu trúc câu trả lời rõ ràng gồm 3 phần: (a) Gợi mở tư duy từng bước, (b) 2-3 câu hỏi dẫn dắt để học sinh tự giải, (c) Gợi ý cách đối chiếu lại với Sách giáo khoa (Fact Check).',
      '5. Trình bày súc tích, khoảng 180-320 từ.',
    ].join('\n');

    const promptParts = [
      `Môn học: ${subject}`,
      thinkContext
        ? `Suy nghĩ ban đầu của học sinh (Think First):\n${thinkContext}`
        : 'Học sinh chưa ghi suy nghĩ ban đầu cho câu hỏi này — hãy nhắc nhẹ em tự suy nghĩ song song.',
      `Nội dung học sinh đang gặp khó khăn:\n${question}`,
    ];

    try {
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: promptParts.join('\n\n'),
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      const guidance = response.text?.trim();
      if (!guidance) {
        return res.status(502).json({ error: 'AI Coach không trả về nội dung. Vui lòng thử lại.' });
      }

      // Optionally record in Cloud SQL if Firebase ID token is supplied
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split('Bearer ')[1];
          const decoded = await adminAuth.verifyIdToken(token);
          const dbUser = await getOrCreateUser(decoded.uid, decoded.email || '', decoded.name);
          await insertAiInteraction(dbUser.id, {
            subject,
            question,
            thinkContext,
            guidance,
            modelUsed,
          });
        } catch (dbErr) {
          console.warn('Skipped Cloud SQL AI log persistence:', dbErr);
        }
      }

      return res.json({ guidance, modelUsed });
    } catch (error: any) {
      console.error('Gemini AI Coach error:', error);
      const status = typeof error?.status === 'number' ? error.status : 500;
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: error?.message || 'Không thể kết nối AI Coach lúc này. Vui lòng thử lại sau.',
      });
    }
  });

  // Protected Cloud SQL endpoints
  app.get('/api/edu/bundle', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || '';
      const name = typeof req.user!.name === 'string' ? req.user!.name : undefined;
      await getOrCreateUser(uid, email, name);
      const bundle = await getUserBundle(uid);
      return res.json(bundle);
    } catch (error: any) {
      console.error('GET /api/edu/bundle error:', error);
      return res.status(503).json({ error: error.message || 'Database unavailable' });
    }
  });

  app.put('/api/edu/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || '';
      await getOrCreateUser(uid, email);

      const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
      if (!fullName) {
        return res.status(400).json({ error: 'Vui lòng nhập họ và tên.' });
      }

      const role = req.body?.role === 'teacher' ? 'teacher' : 'student';
      const updated = await updateUserProfileRecord(uid, {
        fullName,
        role,
        birthDate: typeof req.body?.birthDate === 'string' ? req.body.birthDate.trim() : '',
        className: typeof req.body?.className === 'string' ? req.body.className.trim() : '',
        homeroom: typeof req.body?.homeroom === 'string' ? req.body.homeroom.trim() : '',
        subjectTeacher: typeof req.body?.subjectTeacher === 'string' ? req.body.subjectTeacher.trim() : '',
        phone: typeof req.body?.phone === 'string' ? req.body.phone.trim() : '',
      });
      return res.json({ profile: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  });

  app.post('/api/edu/tasks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validateStudyTaskInput({
        name: String(req.body?.name ?? ''),
        subject: String(req.body?.subject ?? ''),
        goal: String(req.body?.goal ?? ''),
        dueDate: String(req.body?.dueDate ?? ''),
        studySlot: String(req.body?.studySlot ?? ''),
      });
      if (!validated.valid) {
        return res.status(400).json({ error: validated.error });
      }
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      const created = await insertStudyTask(user.id, {
        ...validated.data,
        googleTaskId: typeof req.body?.googleTaskId === 'string' ? req.body.googleTaskId : null,
      });
      return res.status(201).json({ task: created });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to create task' });
    }
  });

  app.patch('/api/edu/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const taskId = Number(req.params.id);
      if (!Number.isInteger(taskId) || taskId <= 0) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      const done = Boolean(req.body?.done);
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      const updated = await updateStudyTaskDone(user.id, taskId, done);
      if (!updated) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.json({ task: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to update task' });
    }
  });

  app.delete('/api/edu/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const taskId = Number(req.params.id);
      if (!Number.isInteger(taskId) || taskId <= 0) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      const deleted = await removeStudyTask(user.id, taskId);
      if (!deleted) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.json({ deleted: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to delete task' });
    }
  });

  app.post('/api/edu/think', requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validateThinkEntryInput({
        subject: String(req.body?.subject ?? ''),
        question: String(req.body?.question ?? ''),
        answer: String(req.body?.answer ?? ''),
        confidence: String(req.body?.confidence ?? ''),
      });
      if (!validated.valid) {
        return res.status(400).json({ error: validated.error });
      }
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      const created = await insertThinkEntry(user.id, validated.data);
      return res.status(201).json({ think: created });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to save think entry' });
    }
  });

  app.post('/api/edu/fact-check', requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validateFactCheckInput({
        content: String(req.body?.content ?? ''),
        source: String(req.body?.source ?? ''),
        conclusion: String(req.body?.conclusion ?? ''),
      });
      if (!validated.valid) {
        return res.status(400).json({ error: validated.error });
      }
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      const created = await insertFactCheck(user.id, validated.data);
      return res.status(201).json({ factCheck: created });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to save fact check' });
    }
  });

  app.post('/api/edu/self-test', requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = validateSelfTestInput({
        subject: String(req.body?.subject ?? ''),
        lesson: String(req.body?.lesson ?? ''),
        explain: String(req.body?.explain ?? ''),
        apply: String(req.body?.apply ?? ''),
        level: String(req.body?.level ?? ''),
      });
      if (!validated.valid) {
        return res.status(400).json({ error: validated.error });
      }
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      const created = await insertSelfTest(user.id, validated.data);
      return res.status(201).json({ selfTest: created });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to save self test' });
    }
  });

  app.post('/api/edu/survey', requireAuth, async (req: AuthRequest, res) => {
    try {
      const surveyType = req.body?.surveyType === 'after' ? 'after' : 'before';
      const answers = Array.isArray(req.body?.answers) ? req.body.answers.map(Number) : [];
      const validated = validateSurveyAnswers(answers);
      if (!validated.valid) {
        return res.status(400).json({ error: validated.error });
      }
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      const created = await insertSurvey(user.id, {
        surveyType,
        answers,
        average: validated.average,
      });
      return res.status(201).json({ survey: created });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to save survey' });
    }
  });

  app.get('/api/edu/admin/teachers', requireAuth, async (req: AuthRequest, res) => {
    try {
      if ((req.user?.email || '').toLowerCase() !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Chỉ quản trị viên nhà trường mới có quyền xem danh sách phê duyệt.' });
      }
      const teachers = await listPendingTeachers();
      return res.json({ teachers });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to list teachers' });
    }
  });

  app.post('/api/edu/admin/teachers/:uid/approve', requireAuth, async (req: AuthRequest, res) => {
    try {
      if ((req.user?.email || '').toLowerCase() !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Chỉ quản trị viên nhà trường mới có quyền phê duyệt giáo viên.' });
      }
      const targetUid = String(req.params.uid || '').trim();
      const approved = Boolean(req.body?.approved);
      const updated = await approveTeacherByUid(targetUid, approved);
      if (!updated) {
        return res.status(404).json({ error: 'Không tìm thấy giáo viên.' });
      }
      return res.json({ teacher: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to approve teacher' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EDU SMART server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
