export type ExportField = {
  key: string;
  label: string;
  defaultSelected?: boolean;
};

export const STUDENT_EXPORT_FIELDS: ExportField[] = [
  { key: "firstname", label: "First name", defaultSelected: true },
  { key: "lastname", label: "Last name", defaultSelected: true },
  { key: "email", label: "Email", defaultSelected: true },
  { key: "phone", label: "Phone", defaultSelected: true },
  { key: "parentName", label: "Parent name" },
  { key: "parentPhone", label: "Parent phone" },
  { key: "category", label: "Category", defaultSelected: true },
  { key: "standard", label: "Standard", defaultSelected: true },
  { key: "exam", label: "Competitive exam", defaultSelected: true },
  { key: "school", label: "School / college" },
  { key: "coaching", label: "Coaching" },
  { key: "institute", label: "Institute", defaultSelected: true },
  { key: "subscription", label: "Subscription", defaultSelected: true },
  { key: "planId", label: "Plan ID" },
  { key: "freeTrial", label: "Free trial" },
  { key: "level", label: "Level" },
  { key: "points", label: "Points" },
  { key: "streak", label: "Streak" },
  { key: "gender", label: "Gender" },
  { key: "createdAt", label: "Created at", defaultSelected: true },
  { key: "lastActivity", label: "Last activity", defaultSelected: true },
  { key: "disabled", label: "Disabled" },
];

export const TEACHER_EXPORT_FIELDS: ExportField[] = [
  { key: "firstname", label: "First name", defaultSelected: true },
  { key: "lastname", label: "Last name", defaultSelected: true },
  { key: "email", label: "Email", defaultSelected: true },
  { key: "phone", label: "Phone", defaultSelected: true },
  { key: "role", label: "Role", defaultSelected: true },
  { key: "status", label: "Status", defaultSelected: true },
  { key: "teacherCode", label: "Teacher code" },
  { key: "subjects", label: "Subjects" },
  { key: "studentCount", label: "Students", defaultSelected: true },
  { key: "instituteCount", label: "Institutes" },
  { key: "createdAt", label: "Created at", defaultSelected: true },
];

export const INSTITUTE_EXPORT_FIELDS: ExportField[] = [
  { key: "name", label: "Name", defaultSelected: true },
  { key: "instituteCode", label: "Code", defaultSelected: true },
  { key: "email", label: "Email", defaultSelected: true },
  { key: "contactNumber", label: "Contact", defaultSelected: true },
  { key: "city", label: "City", defaultSelected: true },
  { key: "state", label: "State", defaultSelected: true },
  { key: "students", label: "Students", defaultSelected: true },
  { key: "teachers", label: "Teachers", defaultSelected: true },
  { key: "batches", label: "Batches", defaultSelected: true },
  { key: "createdAt", label: "Created at", defaultSelected: true },
];

export const BLOCKED_EXPORT_KEYS = new Set([
  "password",
  "salt",
  "resetPasswordToken",
  "resetTokenExpiry",
  "gmeet",
]);
