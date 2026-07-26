export type WhatsAppMessageInput = {
  officerName: string;
  taskTitle: string;
  taskDescription: string;
  dueDate: string;
  priority: string;
  status: string;
  assignedBy: string;
};

export function normalizeWhatsAppPhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function isValidWhatsAppPhone(phone: string | null | undefined) {
  return normalizeWhatsAppPhone(phone) !== null;
}

export function buildTaskWhatsAppMessage(input: WhatsAppMessageInput) {
  return [
    `Hello ${input.officerName},`,
    "",
    "You have been assigned the following task:",
    "",
    `Task: ${input.taskTitle}`,
    `Description: ${input.taskDescription}`,
    `Due Date: ${input.dueDate}`,
    `Priority: ${input.priority}`,
    `Status: ${input.status}`,
    "",
    "Please review the task and provide updates on the dashboard.",
    "",
    "Regards,",
    input.assignedBy,
    "Governance Review Dashboard",
  ].join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
