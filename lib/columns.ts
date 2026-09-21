export type TableColumn = {
  key: string;
  label: string;
  locked?: boolean;
  defaultVisible?: boolean;
};

export const STUDENT_TABLE_COLUMNS: TableColumn[] = [
  { key: "student", label: "Student", locked: true, defaultVisible: true },
  { key: "category", label: "Plan", defaultVisible: true },
  { key: "examClass", label: "Exam / class", defaultVisible: true },
  { key: "institute", label: "Institute", defaultVisible: true },
  { key: "subscription", label: "Subscription", defaultVisible: true },
  { key: "onboard", label: "DNA report", defaultVisible: true },
  { key: "lastActivity", label: "Last activity", defaultVisible: true },
  { key: "createdAt", label: "Created", defaultVisible: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "parentName", label: "Parent name" },
  { key: "parentPhone", label: "Parent phone" },
  { key: "school", label: "School / college" },
  { key: "coaching", label: "Coaching" },
  { key: "planId", label: "Plan ID" },
  { key: "freeTrial", label: "Free trial" },
  { key: "level", label: "Level" },
  { key: "points", label: "Points" },
  { key: "streak", label: "Streak" },
  { key: "gender", label: "Gender" },
  { key: "disabled", label: "Disabled" },
];

export const TEACHER_TABLE_COLUMNS: TableColumn[] = [
  { key: "name", label: "Name", locked: true, defaultVisible: true },
  { key: "role", label: "Role", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "subjects", label: "Subjects", defaultVisible: true },
  { key: "studentCount", label: "Students", defaultVisible: true },
  { key: "instituteCount", label: "Institutes", defaultVisible: true },
  { key: "createdAt", label: "Created", defaultVisible: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "teacherCode", label: "Teacher code" },
];

export const INSTITUTE_TABLE_COLUMNS: TableColumn[] = [
  { key: "name", label: "Institute", locked: true, defaultVisible: true },
  { key: "instituteCode", label: "Code", defaultVisible: true },
  { key: "location", label: "Location", defaultVisible: true },
  { key: "contactNumber", label: "Contact", defaultVisible: true },
  { key: "students", label: "Students", defaultVisible: true },
  { key: "teachers", label: "Teachers", defaultVisible: true },
  { key: "batches", label: "Batches", defaultVisible: true },
  { key: "createdAt", label: "Created", defaultVisible: true },
  { key: "email", label: "Email" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "website", label: "Website" },
];

export type ColumnPrefs = {
  order: string[];
  visible: string[];
};

export function defaultColumnPrefs(catalog: TableColumn[]): ColumnPrefs {
  return {
    order: catalog.map((column) => column.key),
    visible: catalog
      .filter((column) => column.defaultVisible || column.locked)
      .map((column) => column.key),
  };
}

export function normalizeColumnPrefs(
  catalog: TableColumn[],
  stored?: Partial<ColumnPrefs> | null,
): ColumnPrefs {
  const defaults = defaultColumnPrefs(catalog);
  const known = new Set(catalog.map((column) => column.key));
  const locked = catalog.filter((column) => column.locked).map((column) => column.key);
  const order = [
    ...(stored?.order || []).filter((key) => known.has(key)),
    ...defaults.order.filter((key) => !(stored?.order || []).includes(key)),
  ];
  const previousOrder = stored?.order || [];
  const visibleSet = new Set(
    (stored?.visible || defaults.visible).filter((key) => known.has(key)),
  );
  for (const key of locked) visibleSet.add(key);
  for (const column of catalog) {
    if (
      (column.defaultVisible || column.locked) &&
      !previousOrder.includes(column.key)
    ) {
      visibleSet.add(column.key);
    }
  }
  if (visibleSet.size === 0 && order[0]) visibleSet.add(order[0]);
  return { order, visible: order.filter((key) => visibleSet.has(key)) };
}
