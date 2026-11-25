import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Users linked to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull().default(''),
  role: text('role').notNull().default('student'), // 'student' | 'teacher' | 'admin'
  teacherApproved: boolean('teacher_approved').notNull().default(false),
  birthDate: text('birth_date').notNull().default(''),
  className: text('class_name').notNull().default(''),
  homeroom: text('homeroom').notNull().default(''),
  subjectTeacher: text('subject_teacher').notNull().default(''),
  phone: text('phone').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 01. STUDY PLAN tasks
export const studyTasks = pgTable('study_tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  goal: text('goal').notNull(),
  dueDate: text('due_date').notNull(),
  studySlot: text('study_slot').notNull(),
  done: boolean('done').notNull().default(false),
  googleTaskId: text('google_task_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 02. THINK FIRST entries
export const thinkEntries = pgTable('think_entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subject: text('subject').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  confidence: text('confidence').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 03. AI COACH interactions
export const aiInteractions = pgTable('ai_interactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subject: text('subject').notNull(),
  question: text('question').notNull(),
  thinkContext: text('think_context').notNull().default(''),
  guidance: text('guidance').notNull(),
  modelUsed: text('model_used').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 04. FACT CHECK records
export const factChecks = pgTable('fact_checks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  source: text('source').notNull(),
  conclusion: text('conclusion').notNull(),
  verifiedStatus: text('verified_status').notNull().default('checked'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 05. SELF TEST reflections
export const selfTests = pgTable('self_tests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subject: text('subject').notNull(),
  lesson: text('lesson').notNull(),
  explain: text('explain').notNull(),
  apply: text('apply').notNull(),
  level: text('level').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Pre/Post Surveys
export const surveys = pgTable('surveys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  surveyType: text('survey_type').notNull(), // 'before' | 'after'
  answers: jsonb('answers').$type<number[]>().notNull(),
  averageScore: text('average_score').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  studyTasks: many(studyTasks),
  thinkEntries: many(thinkEntries),
  aiInteractions: many(aiInteractions),
  factChecks: many(factChecks),
  selfTests: many(selfTests),
  surveys: many(surveys),
}));

export const studyTasksRelations = relations(studyTasks, ({ one }) => ({
  author: one(users, { fields: [studyTasks.userId], references: [users.id] }),
}));

export const thinkEntriesRelations = relations(thinkEntries, ({ one }) => ({
  author: one(users, { fields: [thinkEntries.userId], references: [users.id] }),
}));

export const aiInteractionsRelations = relations(aiInteractions, ({ one }) => ({
  author: one(users, { fields: [aiInteractions.userId], references: [users.id] }),
}));

export const factChecksRelations = relations(factChecks, ({ one }) => ({
  author: one(users, { fields: [factChecks.userId], references: [users.id] }),
}));

export const selfTestsRelations = relations(selfTests, ({ one }) => ({
  author: one(users, { fields: [selfTests.userId], references: [users.id] }),
}));

export const surveysRelations = relations(surveys, ({ one }) => ({
  author: one(users, { fields: [surveys.userId], references: [users.id] }),
}));
