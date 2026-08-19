import type { ErrorCode } from "@/lib/errors";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorCode; message: string };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function actionError<T>(
  error: ErrorCode,
  message: string,
): ActionResult<T> {
  return { success: false, error, message };
}
